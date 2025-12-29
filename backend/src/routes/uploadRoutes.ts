import { Router } from 'express';
import { upload } from '../middleware/uploadMiddleware';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No file uploaded' });
    return;
  }
  const fileUrl = `https://vph-messenger.onrender.com/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

export default router;