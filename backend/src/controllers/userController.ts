import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    // ВАЖНО: Берем именно 'query', так как фронтенд шлет ?query=...
    const searchTerm = (req.query.query || req.query.search || req.query.q) as string;
    const userId = req.user?.userId;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.json([]); 
    }

    const cleanQuery = searchTerm.trim();
    console.log(`[SEARCH] Ищем: "${cleanQuery}" для юзера: ${userId}`);

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: cleanQuery,
          mode: 'insensitive', 
        },
        // Не показываем самого себя в поиске
        NOT: {
          id: userId ? String(userId) : undefined
        }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        relationshipStatus: true,
        isOnline: true
      },
      take: 15 // Ограничиваем, чтобы не перегружать бесплатный Render
    });

    return res.json(users);
  } catch (error: any) {
    // Теперь сервер не упадет, а просто запишет ошибку в логи
    console.error('CRITICAL SEARCH ERROR:', error.message);
    return res.status(500).json({ message: 'Ошибка поиска', error: error.message });
  }
};

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
        relationshipStatus: true,
        notificationsEnabled: true
      }
    });
    return res.json(user);
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { username, bio, relationshipStatus } = req.body;
    
    const user = await prisma.user.update({
      where: { id: String(userId) },
      data: {
        username: username?.trim(),
        bio,
        relationshipStatus
      }
    });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Update error' });
  }
};