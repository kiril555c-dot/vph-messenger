import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.query;
    const userId = req.user?.userId;

    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: query
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
      take: 10
    });

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
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
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { username, avatar, bio, relationshipStatus, notificationsEnabled } = req.body;

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
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};