import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    // Берем query или search. Приводим к строке жестко.
    const query = String(req.query.query || req.query.search || "").trim();
    const userId = req.user?.userId;

    console.log(`[DEBUG] Поиск: "${query}" от юзера: ${userId}`);

    if (!query) return res.json([]);

    // Упрощенный запрос к Prisma
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive'
        },
        // Исключаем себя только если ID валидный
        NOT: userId ? { id: String(userId) } : undefined
      },
      select: {
        id: true,
        username: true,
        avatar: true
      },
      take: 10
    });

    return res.json(users);
  } catch (error: any) {
    console.error('SEARCH FAIL:', error.message);
    // Важно: возвращаем пустой массив вместо падения сервера
    return res.json([]); 
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'No ID' });
    const user = await prisma.user.findUnique({ where: { id: String(userId) } });
    return res.json(user);
  } catch (e) { return res.status(500).json({ message: 'Error' }); }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username } = req.body;
    const user = await prisma.user.update({
      where: { id: String(userId) },
      data: { username }
    });
    return res.json({ user });
  } catch (e) { return res.status(500).json({ message: 'Error' }); }
};