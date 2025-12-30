import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// ... (функции register и login)

export const updateProfile = async (req: any, res: Response) => {
  try {
    // 1. Получаем ID пользователя из middleware или body
    const userId = req.user?.id || req.user?.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const { username, bio } = req.body;

    // 2. Сначала проверяем, есть ли такой пользователь в MongoDB (защита от P2025)
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ message: 'Пользователь не найден в базе данных' });
    }

    // 3. Собираем данные для обновления
    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;

    // 4. Если multer загрузил файл, сохраняем путь к нему
    if (req.file) {
      // Это тот самый путь, который ты увидишь в MongoDB Compass
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    // 5. Обновляем запись в базе через Prisma
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 6. Отправляем ответ фронтенду
    res.json({
      message: 'Профиль успешно обновлен',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar, // Путь к картинке (коту)
        bio: updatedUser.bio || ''
      }
    });

  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: 'Ошибка при обновлении профиля',
      error: error.message 
    });
  }
};

// ОБЯЗАТЕЛЬНО: добавь updateProfile в список экспорта
export { register, login, updateProfile };