import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// 1. Создание чата (личное или группа)
export const createChat = async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, isGroup, name } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (isGroup) {
      const chat = await prisma.chat.create({
        data: {
          isGroup: true,
          name: name || 'New Group',
          chatMembers: {
            create: [{ userId: userId, role: 'ADMIN' }]
          }
        }
      });
      res.status(201).json(chat);
    } else {
      // Ищем, нет ли уже такого чата между двумя юзерами
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

// 2. Получение списка всех чатов пользователя
export const getChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
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

    const chatsWithUnread = await Promise.all(chats.map(async (chat: any) => {
      const unreadCount = await prisma.message.count({
        where: {
          chatId: chat.id,
          senderId: { not: userId },
          statuses: {
            none: { userId: userId, status: 'READ' }
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

// 3. Отправка сообщения
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

    // Обновляем время чата, чтобы он поднялся в списке вверх
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    // Прокидываем сообщение в сокеты (если io привязан к req)
    const io = (req as any).io;
    if (io) {
      io.to(chatId).emit('new_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// 4. Загрузка сообщений конкретного чата
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};