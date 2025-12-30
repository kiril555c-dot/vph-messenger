import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// ... (register и login остаются такими же, добавляем новую функцию вниз)

export const updateProfile = async (req: any, res: Response) => {
  try {
    // ID пользователя берется из middleware protect (req.user.id)
    const userId = req.user.id;
    const { username, bio } = req.body;

    // Подготавливаем данные для обновления
    const updateData: any = {};
    if (username) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;

    // Если multer сохранил файл, добавляем путь к аватарке
    if (req.file) {
      // Сохраняем путь, который будет доступен через express.static
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    // Обновляем пользователя в базе данных через Prisma
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
        bio: updatedUser.bio
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении профиля' });
  }
};

// Не забудь добавить экспорт существующих функций
export { register, login };