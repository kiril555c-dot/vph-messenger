import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// ... твои функции register и login ...

export const updateProfile = async (req: any, res: Response) => {
  try {
    // ВАЖНО: В твоем login ты используешь userId. 
    // Убедись, что middleware protect записывает данные именно в req.user
    const userId = req.user?.userId || req.user?.id; 

    if (!userId) {
      return res.status(401).json({ message: 'Не авторизован' });
    }

    const { username, bio } = req.body;

    // Подготавливаем данные для обновления
    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;

    // Если multer сохранил файл, добавляем путь к аватарке
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    // Обновляем в Prisma
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

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
    console.error('Update profile error:', error);
    // Если Prisma не нашла юзера или данные невалидны
    res.status(500).json({ message: 'Ошибка при обновлении профиля в базе' });
  }
};

// Не забудь добавить updateProfile в экспорт!
export { register, login };