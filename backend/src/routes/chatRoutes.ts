import { Router } from 'express';
// Импортируем ВСЕ функции из одного контроллера чата
import { createChat, getChats, sendMessage, getMessages } from '../controllers/chatController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Защищаем все роуты токеном
router.use(authenticateToken);

// Создать новый чат или найти существующий
router.post('/', createChat);

// Получить список всех моих чатов
router.get('/', getChats);

// Отправить сообщение в чат
router.post('/message', sendMessage);

// Получить историю сообщений конкретного чата
router.get('/:chatId/messages', getMessages);

export default router;