import { Router } from 'express';
import { register, login, updateProfile } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

const router = Router();

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    // Добавляем случайное число, чтобы избежать конфликтов имен
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Фильтр файлов (пропускаем только изображения)
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Лимит 5МБ
});

// Роуты
router.post('/register', register);
router.post('/login', login);

// Обновление профиля
// Используем PUT /api/users/update (как просит фронтенд)
router.put('/update', protect, upload.single('avatar'), updateProfile);

export default router;