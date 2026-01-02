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

// === ИСПРАВЛЕНИЕ CORS ДЛЯ ФРОНТЕНДА ===
// Разрешаем origin: true, чтобы принимать запросы с GitHub Pages и локалки без ошибок
const corsOptions = {
  origin: true, 
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

const io = new Server(httpServer, {
  cors: corsOptions
});

app.set('io', io);

// Применяем CORS ко всем запросам
app.use(cors(corsOptions));
app.use(express.json());

// === СТАТИКА ===
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Роуты
app.use('/api/users', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);

// Оба пути теперь рабочие
app.use('/api/users-list', userRoutes); 
app.use('/api/search', userRoutes); 

app.get('/', (req, res) => {
  res.send('Lumina Messenger API is running');
});

// Обработка 404
app.use((req, res) => {
  console.log(`[404] Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route ${req.url} not found` });
});

const onlineUsers = new Map<string, string>();

io.on('connection', (socket) => {
  socket.on('setup', async (userId: string) => {
    if (!userId || userId === "undefined" || userId === "null" || typeof userId !== 'string') return;
    
    socket.join(userId);
    onlineUsers.set(socket.id, userId);

    try {
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
        console.error('Disconnect error:', error);
      }
      onlineUsers.delete(socket.id);
    }
  });
});

export { httpServer, io };