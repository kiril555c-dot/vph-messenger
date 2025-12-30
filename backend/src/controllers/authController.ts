import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

// ... (функции register и login оставляй как есть)

export const updateProfile = async (req: any, res: Response) => {
  try {
    // 1. Получаем ID. Важно: Prisma в MongoDB использует строковые ID
    const userId = req.user?.id || req.user?.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    const { username, bio } = req.body;

    // 2. ПРОВЕРКА: Существует ли пользователь? (Защита от ошибки P2025 в логах)
    // Мы сначала ищем юзера, и если его нет — выходим с 404, не ломая сервер
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!userExists) {
      return res.status(404).json({ message: 'Пользователь не найден в MongoDB' });
    }

    // 3. Собираем данные для обновления
    const updateData: any = {};
    if (username) updateData.username = username;
    
    // bio может быть пустой строкой, поэтому проверяем на undefined
    if (bio !== undefined) updateData.bio = bio;

    // 4. Если multer загрузил файл, сохраняем путь.
    // Именно этот путь `/uploads/avatar-...` ты увидишь в MongoDB Compass.
    if (req.file) {
      updateData.avatar = `/uploads/${req.file.filename}`;
    }

    // 5. Обновление в базе
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // 6. Ответ фронтенду (убираем лишние данные, оставляем только нужное)
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
    // Выводим детальную ошибку в логи Render, чтобы знать, если что-то пойдет не так
    console.error('CRITICAL Update profile error:', error.message);
    res.status(500).json({ 
      message: 'Ошибка при обновлении профиля',
      error: error.message 
    });
  }
};

// Не забывай про этот экспорт в самом конце файла!
export { register, login, updateProfile };