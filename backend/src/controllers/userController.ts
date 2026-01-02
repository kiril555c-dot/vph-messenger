import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// 1. ПОИСК ПОЛЬЗОВАТЕЛЕЙ
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = String(req.query.query || "").trim();
    const userId = req.user?.userId;

    if (!query) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        username: { contains: query, mode: 'insensitive' },
        NOT: userId ? { id: String(userId) } : undefined
      },
      select: { id: true, username: true, avatar: true, isOnline: true },
      take: 10
    });

    return res.json(users);
  } catch (error: any) {
    console.error('SEARCH ERROR:', error.message);
    return res.json([]); 
  }
};

// 2. ПОЛУЧЕНИЕ ПРОФИЛЯ (ЭТОГО НЕ ХВАТАЛО!)
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        relationshipStatus: true
      }
    });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// 3. ОБНОВЛЕНИЕ ПРОФИЛЯ (ЭТОГО ТОЖЕ НЕ ХВАТАЛО!)
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username, bio, relationshipStatus } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.update({
      where: { id: String(userId) },
      data: { username, bio, relationshipStatus }
    });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Update error' });
  }
};