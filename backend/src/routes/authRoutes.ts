import { Router } from 'express';
import { register, login, updateProfile } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware'; // Твой middleware проверки токена
import multer from 'multer';
import path from 'path';

const router = Router();

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Убедись, что папка uploads создана в корне сервера
  },
  filename: (req, file, cb) => {
    cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Существующие роуты
router.post('/register', register);
router.post('/login', login);

// НОВЫЙ РОУТ: Обновление профиля
// protect — проверяет токен, upload.single('avatar') — ловит картинку
router.put('/update', protect, upload.single('avatar'), updateProfile);

export default router;