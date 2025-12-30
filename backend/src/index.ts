import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';

// Импорт роутов
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import userRoutes from './routes/userRoutes';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// 1. Создаем папку uploads (для аватарок)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Настройка CORS
const allowedOrigins = [
  "https://kiril555c-dot.github.io",
  "http://localhost:5173",
  "https://vph-messenger.onrender.com"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// 3. ИНИЦИАЛИЗАЦИЯ SOCKET.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Передаем io в app, чтобы использовать в контроллерах
app.set('io', io);

// 4. МАРШРУТЫ (Исправляем 404 для профиля)
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/users', authRoutes); // Теперь запрос /api/users/update попадет в authRoutes
app.use('/api/user-list', userRoutes); // Для поиска пользователей

// Раздача статики (чтобы аватарки открывались по ссылке)
app.use('/uploads', express.static(uploadDir));

app.get('/', (req, res) => {
  res.send('Lumina Server is running...');
});

// 5. ОБРАБОТКА СОКЕТОВ
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('setup', async (userId) => {
    if (userId) {
      socket.join(userId);
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true }
      });
      socket.broadcast.emit('user_online', userId);
    }
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
  });

  socket.on('new_message', (message) => {
    if (!message || !message.chatId) return;
    socket.to(message.chatId).emit('new_message', message);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// 6. ЗАПУСК
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server ready on port ${PORT}`);
});