import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Достаём io из app (стандартный способ в Express + Socket.io)
const getIo = (req: AuthRequest) => {
  return req.app.get('io');
};

export const createChat = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, userId: incomingUserId, isGroup, name } = req.body;
    const currentUserId = req.user?.userId;
    const io = getIo(req); // ← Вот так безопасно берём io

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
        },
        include: {
          chatMembers: {
            include: {
              user: {
                select: { id: true, username: true, avatar: true, isOnline: true, lastSeen: true }
              }
            }
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      });
      return res.status(201).json(chat);
    }

    if (!targetPartnerId) {
      return res.status(400).json({ message: 'Target User ID required' });
    }

    // Ищем существующий чат
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
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // Создаём новый чат
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
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    // === РАБОЧИЙ REALTIME: уведомляем обоих ===
    if (io) {
      const chatForClient = {
        ...chat,
        unreadCount: 0,
        latestMessage: chat.messages.length > 0 ? chat.messages[0] : null
      };

      io.to(`user_${currentUserId}`).emit('new_chat', chatForClient);
      io.to(`user_${targetPartnerId}`).emit('new_chat', chatForClient);
    }

    return res.status(201).json(chat);
  } catch (error) {
    console.error("CREATE CHAT ERROR:", error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Остальные функции — без изменений (или с мелкими улучшениями)
export const getChats = async (req: AuthRequest, res: Response) => {
  // ... твой оригинальный код getChats полностью (он был нормальный)
  // (вставь сюда свой оригинальный getChats из предыдущего сообщения)
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  const io = getIo(req);
  // ... твой оригинальный код sendMessage
  // В конце, после создания сообщения:
  if (io) {
    io.to(`chat_${req.body.chatId}`).emit('new_message', message);
  }
  // ...
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  // ... твой оригинальный код без изменений
};