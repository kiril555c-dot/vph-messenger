import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// ... (функции register и login оставляй без изменений)

export const updateProfile = async (req: any, res: Response) => {
  try {
    // 1. Получаем ID и выводим его в логи Render для проверки
    const rawId = req.user?.id || req.user?.userId || req.body.userId;
    console.log("DEBUG: Попытка обновления профиля для ID:", rawId);

    if (!rawId) {
      return res.status(401).json({ message: 'Пользователь не авторизован или ID не передан' });
    }

    // Принудительно приводим к строке (важно для MongoDB)
    const userId = String(rawId);

    const { username, bio } = req.body;

    // 2. Сначала ищем пользователя (findUnique), чтобы не падать с ошибкой P2025
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      console.warn(`WARN: Пользователь с ID ${userId} не найден в базе данных`);
      return res.status(404).json({ message: 'Пользователь не найден. Перезайдите в аккаунт!' });
    }

    // 3. Собираем данные для обновления
    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;

    // 4. Если multer загрузил файл (кот в наушниках), сохраняем путь
    if (req.file) {
      // Это путь, который будет лежать в MongoDB Compass
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    // 5. Обновление через Prisma
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 6. Успешный ответ
    res.json({
      message: 'Профиль успешно обновлен',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar, 
        bio: updatedUser.bio || ''
      }
    });

  } catch (error: any) {
    // Если всё же выскочит P2025 или другая ошибка
    console.error('CRITICAL: Ошибка при обновлении профиля:', error.message);
    res.status(500).json({ 
      message: 'Ошибка сервера при сохранении данных',
      error: error.message 
    });
  }
};

// Экспорт всех функций
export { register, login }; // Если они объявлены выше как стрелочные, либо добавь updateProfile сюда