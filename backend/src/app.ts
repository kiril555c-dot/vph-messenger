import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import userRoutes from './routes/userRoutes';
import uploadRoutes from './routes/uploadRoutes';
import path from 'path';
import prisma from './utils/prisma';

const app = express();
const httpServer = createServer(app);

// Список разрешенных доменов (CORS)
const allowedOrigins = [
  "https://kiril555c-dot.github.io",
  "http://localhost:5173",
  "https://vph-messenger.onrender.com",
  /\.vercel\.app$/,
  /\.netlify\.app$/
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});

app.set('io', io);

// Настройка CORS
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// === ИСПРАВЛЕНИЕ СТАТИКИ ===
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Подключаем роуты
app.use('/api/users', authRoutes);      // Регистрация, логин, профиль
app.use('/api/chats', chatRoutes);      // Чаты и сообщения
app.use('/api/upload', uploadRoutes);   // Загрузка файлов

// === ФИКС ПУТЕЙ: ТЕПЕРЬ ОБА ВАРИАНТА РАБОТАЮТ ===
app.use('/api/users-list', userRoutes); 
app.use('/api/search', userRoutes);     

app.get('/', (req, res) => {
  res.send('Lumina Messenger API is running');
});

// === ОБРАБОТКА НЕПРАВИЛЬНЫХ ПУТЕЙ ===
app.use((req, res) => {
  console.log(`[404] Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route ${req.url} not found on this server` });
});

const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('setup', async (userId: string) => {
    // Валидация ID
    if (!userId || userId === "undefined" || userId === "null" || typeof userId !== 'string') return;
    
    socket.join(userId);
    onlineUsers.set(socket.id, userId);

    try {
      // ИСПРАВЛЕНИЕ: Сначала проверяем, есть ли такой юзер в MongoDB
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      // Обновляем только если юзер реально существует в базе
      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true }
        });
        socket.broadcast.emit('user_online', userId);
      } else {
        console.log(`[Socket] Setup: User ${userId} not found in DB. Registration needed.`);
      }
    } catch (error) {
      // Это предотвратит падение сервера с ошибкой P2025
      console.error('Socket setup error (suppressed):', error);
    }
  });

  socket.on('join_chat', (chatId) => {
    if (chatId) socket.join(chatId);
  });

  socket.on('new_message', (newMessageReceived) => {
    if (!newMessageReceived?.chatId) return;
    socket.to(newMessageReceived.chatId).emit('message received', newMessageReceived);
  });

  socket.on('disconnect', async () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() }
          });
          socket.broadcast.emit('user_offline', userId);
        }
      } catch (error) {
        console.error('Disconnect error (suppressed):', error);
      }
      onlineUsers.delete(socket.id);
    }
  });
});

export { httpServer, io };