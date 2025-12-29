import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    // ИСПРАВЛЕНО: берем 'search' (как на фронте), либо 'query' для страховки
    const query = (req.query.search || req.query.query) as string;
    const userId = req.user?.userId;

    if (!query) {
      return res.json([]); // Если пусто, просто возвращаем пустой массив без ошибки
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive', // ИСПРАВЛЕНО: теперь ищет без учета регистра (А=а)
        },
        NOT: {
          id: userId // Не показываем самих себя
        }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        relationshipStatus: true,
        isOnline: true,
        lastSeen: true
      },
      take: 10
    });

    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        relationshipStatus: true,
        isOnline: true,
        lastSeen: true,
        notificationsEnabled: true,
        createdAt: true
      }
    });
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username, avatar, bio, relationshipStatus, notificationsEnabled } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // ИСПРАВЛЕНО: добавляем проверку существования перед обновлением, чтобы не было краша
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        avatar,
        bio,
        relationshipStatus,
        notificationsEnabled
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        relationshipStatus: true,
        isOnline: true,
        lastSeen: true,
        notificationsEnabled: true
      }
    });
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    // Если Prisma не нашла запись
    if ((error as any).code === 'P2025') {
       return res.status(404).json({ message: 'User not found in database' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};