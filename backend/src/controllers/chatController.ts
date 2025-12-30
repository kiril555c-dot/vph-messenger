import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createChat = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, userId: incomingUserId, isGroup, name } = req.body;
    const currentUserId = req.user?.userId;

    const targetPartnerId = partnerId || incomingUserId;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (isGroup) {
      const chat = await prisma.chat.create({
        data: {
          isGroup: true,
          name: name || 'New Group',
          chatMembers: {
            create: [{ userId: currentUserId, role: 'ADMIN' }]
          }
        }
      });
      return res.status(201).json(chat);
    } else {
      if (!targetPartnerId) {
        return res.status(400).json({ message: 'Target User ID (partnerId) is required' });
      }

      const existingChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { chatMembers: { some: { userId: currentUserId } } },
            { chatMembers: { some: { userId: targetPartnerId } } }
          ]
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
        }
      });

      if (existingChat) {
        return res.json(existingChat);
      }

      const chat = await prisma.chat.create({
        data: {
          isGroup: false,
          chatMembers: {
            create: [
              { userId: currentUserId },
              { userId: targetPartnerId }
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
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // === ДОБАВЛЕНО: Realtime-уведомление о новом чате ===
      const io = req.app.get('io');
      if (io) {
        const chatForClient = {
          ...chat,
          unreadCount: 0,                    // Новый чат — непрочитанных нет
          latestMessage: chat.messages.length > 0 ? chat.messages[0] : null
        };

        // Отправляем событие обоим участникам
        io.to(`user_${currentUserId}`).emit('new_chat', chatForClient);
        io.to(`user_${targetPartnerId}`).emit('new_chat', chatForClient);
      }
      // ================================================

      return res.status(201).json(chat);
    }
  } catch (error) {
    console.error("CREATE CHAT ERROR:", error);
    return res.status(500).json({ message: 'Server error during chat creation' });
  }
};

export const getChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const chats = await prisma.chat.findMany({
      where: {
        chatMembers: { some: { userId } }
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

    const chatsWithExtras = await Promise.all(chats.map(async (chat: any) => {
      const unreadCount = await prisma.message.count({
        where: {
          chatId: chat.id,
          senderId: { not: userId },
          statuses: {
            none: { userId: userId, status: 'READ' }
          }
        }
      });
      
      const latestMessage = chat.messages.length > 0 ? chat.messages[0] : null;
      
      return { ...chat, unreadCount, latestMessage };
    }));

    return res.json(chatsWithExtras);
  } catch (error) {
    console.error("GET CHATS ERROR:", error);
    return res.status(500).json({ message: 'Server error while fetching chats' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, content, type, fileUrl } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content: content || '',
        type: type || 'TEXT',
        fileUrl: fileUrl || null,
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);
    return res.status(500).json({ message: 'Server error while sending message' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const membership = await prisma.chatMember.findFirst({
        where: { chatId, userId }
    });

    if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this chat' });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'asc'