import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    // Вытаскиваем query правильно
    const query = String(req.query.query || "").trim();
    const userId = req.user?.userId;

    if (!query) return res.json([]);

    console.log(`[SEARCH] Запрос: ${query}`);

    const users = await prisma.user.findMany({
      where: {
        username: { contains: query, mode: 'insensitive' },
        NOT: userId ? { id: String(userId) } : undefined
      },
      select: { id: true, username: true, avatar: true, isOnline: true },
      take: 10 // Жесткий лимит, чтобы не вешать сервер
    });

    return res.json(users);
  } catch (error: any) {
    console.error('DATABASE ERROR:', error.message);
    // Вместо падения сервера просто возвращаем пустой список
    return res.status(200).json([]); 
  }
};

// Остальные функции (getProfile, updateProfile) оставь как были