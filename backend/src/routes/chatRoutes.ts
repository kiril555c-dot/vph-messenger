import { Router } from 'express';
import { createChat, getChats } from '../controllers/chatController';
import { sendMessage, getMessages, markMessagesAsRead } from '../controllers/messageController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createChat);
router.get('/', getChats);
router.post('/message', sendMessage);
router.get('/:chatId/messages', getMessages);
router.post('/:chatId/read', markMessagesAsRead);

export default router;