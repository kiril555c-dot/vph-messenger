import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// Используем секрет из переменных окружения Render
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-if-env-is-missing';

// 1. Регистрация
export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Этот email уже занят" });
    }

    // Хешируем пароль перед сохранением
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    // Генерируем токен
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // ВАЖНО: Возвращаем токен и объект user, чтобы фронтенд не падал!
    res.status(201).json({
      message: "Пользователь создан",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error("Register Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 2. Вход в систему
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Неверный пароль" });
    }

    // Генерируем токен
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    // Возвращаем данные для localStorage фронтенда
    res.json({
      message: "Успешный вход",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error("Login Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// 3. Обновление профиля
export const updateProfile = async (req: any, res: Response) => {
  try {
    const rawId = req.user?.id || req.user?.userId || req.body.userId;
    if (!rawId) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const userId = String(rawId);
    const { username, bio, relationshipStatus, notificationsEnabled } = req.body;

    const updateData: any = {};
    if (username) updateData.username = username.trim();
    if (bio !== undefined) updateData.bio = bio;
    if (relationshipStatus !== undefined) updateData.relationshipStatus = relationshipStatus;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;

    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('profile_updated', { userId: updatedUser.id, user: updatedUser });
    }

    res.json({ message: 'Профиль обновлен', user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};