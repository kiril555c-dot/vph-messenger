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

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// === ПОПРАВКА ПУТИ ДЛЯ СТАТИКИ ===
// Если app.ts лежит в src/, а uploads в корне, нужно выходить на 2 уровня вверх в dist
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Роуты
app.use('/api/users', authRoutes); // Тот самый роут для обновления профиля
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users-list', userRoutes); // Переименовал, чтобы не было конфликта с authRoutes

app.get('/', (req, res) => {
  res.send('Flick Messenger API is running');
});

const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('setup', async (userId: string) => {
    if (!userId || userId === "undefined" || userId === "null") return;
    
    socket.join(userId);
    onlineUsers.set(socket.id, userId);

    try {
      // ПРОВЕРКА: существует ли юзер, прежде чем менять статус (лечит P2025)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true }
        });
        socket.broadcast.emit('user_online', userId);
      }
    } catch (error) {
      console.error('Socket setup error:', error);
    }
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
  });

  socket.on('new_message', (newMessageReceived) => {
    if (!newMessageReceived?.chatId) return;
    socket.to(newMessageReceived.chatId).emit('new_message', newMessageReceived);
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
        console.error('Disconnect error:', error);
      }
      onlineUsers.delete(socket.id);
    }
  });
});

export { httpServer, io };