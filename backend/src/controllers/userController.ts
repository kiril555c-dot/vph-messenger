import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.search || req.query.query || req.query.q || req.query.username) as string;
    const userId = req.user?.userId;

    console.log(`[SEARCH] Запрос: "${query}" от ID: ${userId}`);

    if (!query || query.trim() === '') {
      return res.json([]); 
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query.trim(),
          mode: 'insensitive', 
        },
        NOT: {
          id: userId
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
      take: 20
    });

    return res.json(users);
  } catch (error) {
    console.error('SEARCH ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
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
    return res.json(user);
  } catch (error) {
    console.error('GET PROFILE ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username, avatar, bio, relationshipStatus, notificationsEnabled } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updateData: any = {};
    if (username) updateData.username = username.trim();
    if (bio !== undefined) updateData.bio = bio;
    if (relationshipStatus !== undefined) updateData.relationshipStatus = relationshipStatus;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    if (avatar) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
    
    // Отправляем событие через WebSocket для обновления профиля у всех пользователей
    const app = (req as any).app;
    if (app) {
      const io = app.get('io');
      if (io) {
        io.emit('profile_updated', { userId: user.id, user });
      }
    }
    
    console.log(`[UPDATE] Профиль ${user.username} обновлен успешно`);
    return res.json({ user });
  } catch (error) {
    console.error('UPDATE ERROR:', error);
    if ((error as any).code === 'P2025') {
       return res.status(404).json({ message: 'User not found' });
    }
    return res.status(500).json({ message: 'Server error' });
  }
};