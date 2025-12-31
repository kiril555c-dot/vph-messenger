import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// 1. Функция регистрации (Добавь экспорт!)
export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;
    // Твоя логика регистрации здесь...
    res.status(201).json({ message: "Пользователь создан" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Функция входа (Добавь экспорт!)
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Твоя логика входа здесь...
    res.json({ message: "Успешный вход" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Обновление профиля (Исправлено)
export const updateProfile = async (req: any, res: Response) => {
  try {
    const rawId = req.user?.id || req.user?.userId || req.body.userId;
    console.log("DEBUG: Попытка обновления профиля для ID:", rawId);

    if (!rawId) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const userId = String(rawId);
    const { username, bio, relationshipStatus, notificationsEnabled } = req.body;

    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

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

    const app = (req as any).app;
    if (app) {
      const io = app.get('io');
      if (io) {
        io.emit('profile_updated', { userId: updatedUser.id, user: updatedUser });
      }
    }

    res.json({ message: 'Профиль обновлен', user: updatedUser });

  } catch (error: any) {
    console.error('CRITICAL ERROR:', error.message);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};