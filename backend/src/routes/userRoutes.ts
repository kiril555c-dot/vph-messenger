import { Router } from 'express';
import { searchUsers, getProfile, updateProfile } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Применяем защиту ко всем маршрутам
router.use(authenticateToken);

// Этот роут теперь точно ловит запросы /api/users-list?query=...
router.get('/users-list', searchUsers);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;