import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createChat = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, isGroup, name } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isGroup) {
      // Create group chat logic here (simplified for now)
      const chat = await prisma.chat.create({
        data: {
          isGroup: true,
          name: name || 'New Group',
          chatMembers: {
            create: [
              { userId: userId, role: 'ADMIN' },
              // Add other members if provided
            ]
          }
        }
      });
      res.status(201).json(chat);
    } else {
      // Private chat
      // Check if chat already exists
      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { chatMembers: { some: { userId: userId } } },
            { chatMembers: { some: { userId: partnerId } } }
          ]
        },
        include: {
          chatMembers: {
            include: {
              user: {
                select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true }
              }
            }
          }
        }
      });

      if (existingChat) {
        res.json(existingChat);
        return;
      }

      const chat = await prisma.chat.create({
        data: {
          isGroup: false,
          chatMembers: {
            create: [
              { userId: userId },
              { userId: partnerId }
            ]
          }
        },
        include: {
          chatMembers: {
            include: {
              user: {
                select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true }
              }
            }
          }
        }
      });
      res.status(201).json(chat);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const chats = await prisma.chat.findMany({
      where: {
        chatMembers: {
          some: { userId }
        }
      },
      include: {
        chatMembers: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Calculate unread messages for each chat
    const chatsWithUnread = await Promise.all(chats.map(async (chat: any) => {
      const unreadCount = await prisma.message.count({
        where: {
          chatId: chat.id,
          senderId: { not: userId },
          statuses: {
            none: {
              userId: userId,
              status: 'READ'
            }
          }
        }
      });
      return { ...chat, unreadCount };
    }));

    res.json(chatsWithUnread);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};