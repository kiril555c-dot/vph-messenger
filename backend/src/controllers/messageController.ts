import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { io } from '../app';

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, content, type } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: userId,
        content,
        type: type || 'TEXT',
        statuses: {
            create: {
                userId: userId,
                status: 'SENT'
            }
        }
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true }
        },
        statuses: true
      }
    });

    // Update chat updatedAt
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    });

    // Emit socket event
    io.to(chatId).emit('new_message', message);

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Verify user is member of chat
    const isMember = await prisma.chatMember.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId
        }
      }
    });

    if (!isMember) {
      res.status(403).json({ message: 'Not a member of this chat' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true }
        },
        statuses: true
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markMessagesAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find messages in this chat that are not sent by the current user
    // and don't have a READ status for the current user
    const messagesToUpdate = await prisma.message.findMany({
      where: {
        chatId,
        senderId: { not: userId },
        statuses: {
          none: {
            userId: userId,
            status: 'READ'
          }
        }
      }
    });

    await Promise.all(messagesToUpdate.map(async (msg: any) => {
        // Check if status exists
        const existingStatus = await prisma.messageStatus.findUnique({
            where: {
                messageId_userId: {
                    messageId: msg.id,
                    userId: userId
                }
            }
        });

        if (existingStatus) {
            await prisma.messageStatus.update({
                where: { id: existingStatus.id },
                data: { status: 'READ' }
            });
        } else {
            await prisma.messageStatus.create({
                data: {
                    messageId: msg.id,
                    userId: userId,
                    status: 'READ'
                }
            });
        }
    }));
    
    // Emit socket event to notify sender that messages are read
    io.to(chatId).emit('messages_read', { chatId, userId });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};