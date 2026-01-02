import { Router } from 'express';
import { searchUsers, getProfile, updateProfile } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Защищаем все роуты ниже этим middleware
router.use(authenticateToken);

// ИСПРАВЛЕНО: Фронтенд на скриншотах ломится именно по пути /users-list
// Мы меняем /search на /users-list, чтобы убрать ошибку 404
router.get('/users-list', searchUsers);

// Остальные роуты
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;