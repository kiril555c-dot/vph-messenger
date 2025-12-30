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
    // Делаем уникальное имя, чтобы не было дублей
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// СТРОГИЙ ФИЛЬТР: только изображения
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
    cb(null, true);
  } else {
    // Если это .webm или что-то другое — блокируем
    cb(new Error('Можно загружать только JPG или PNG!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5МБ максимум
});

// Роуты
router.post('/register', register);
router.post('/login', login);

// Обновление профиля
// ВАЖНО: именно этот роут ждет фронтенд по адресу /api/users/update
router.put('/update', protect, upload.single('avatar'), updateProfile);

export default router;