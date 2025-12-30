import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { Server } from 'socket.io'; // ← Добавь этот импорт

// Добавляем io как параметр (в роуте ты передашь его через app.set('io', io) или в NestJS через @Inject)
export const createChat = async (
  req: AuthRequest,
  res: Response,
  io?: Server // ← Socket.IO сервер (опционально, но будет передан)
) => {
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

      // Для групп можно тоже уведомлять, но пока не обязательно
      return res.status(201).json(chat);
    } else {
      if (!targetPartnerId) {
        return res.status(400).json({ message: 'Target User ID (partnerId) is required' });
      }

      // Проверяем существующий чат
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
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      // === ВАЖНАЯ ЧАСТЬ: Уведомляем обоих пользователей о новом чате ===
      if (io) {
        // Формируем объект как в getChats (с unreadCount и latestMessage)
        const chatForClients = {
          ...chat,
          unreadCount: 0, // Новый чат — непрочитанных нет
          latestMessage: chat.messages.length > 0 ? chat.messages[0] : null
        };

        // Отправляем событие обоим участникам
        // Предполагаем, что пользователи подключены к комнате по своему userId
        io.to(`user_${currentUserId}`).emit('new_chat', chatForClients);
        io.to(`user_${targetPartnerId}`).emit('new_chat', chatForClients);

        // Альтернатива: если у тебя комнаты называются иначе — подправь под свой код
        // Например: io.to(currentUserId).emit(...) или io.in(`user:${currentUserId}`)
      }

      return res.status(201).json(chat);
    }
  } catch (error) {
    console.error("CREATE CHAT ERROR:", error);
    return res.status(500).json({ message: 'Server error during chat creation' });
  }
};

// Остальные функции оставляем почти без изменений
// Но добавим небольшое улучшение в sendMessage — обновление списка чатов уже есть на фронте через new_message

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

export const sendMessage = async (req: AuthRequest, res: Response, io?: Server) => {
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

    // Уведомляем всех в чате о новом сообщении (если io передан)
    if (io) {
      io.to(`chat_${chatId}`).emit('new_message', message);
      // Также можно обновить latestMessage в списке чатов, но фронт уже делает fetchChats при new_message
    }

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
      orderBy: { createdAt: 'asc' }
    });

    return res.json(messages);
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);
    return res.status(500).json({ message: 'Server error while fetching messages' });
  }
};