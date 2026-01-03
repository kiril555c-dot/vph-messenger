import { Router } from 'express';
import { searchUsers, getProfile, updateProfile } from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/search', searchUsers);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

export default router;