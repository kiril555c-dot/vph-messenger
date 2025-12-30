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

// Настраиваем адреса, чтобы друзья могли подключиться с любого устройства
const allowedOrigins = [
  "https://kiril555c-dot.github.io", // Твой старый адрес на GitHub
  "http://localhost:5173",           // Для твоих тестов на компьютере
  "https://vph-messenger.onrender.com", // Твой адрес бэкенда
  /\.vercel\.app$/,                  // Разрешает все сайты на Vercel (если друзья там)
  /\.netlify\.app$/                  // Разрешает все сайты на Netlify
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Настройка CORS для обычных HTTP запросов (регистрация, вход)
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Flick Messenger API is running and connected to MongoDB Atlas');
});

// Socket.io connection handler
const onlineUsers = new Map<string, string>(); // socketId -> userId

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // 1. Установка пользователя (Online статус)
  socket.on('setup', async (userId: string) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers.set(socket.id, userId);
    try {
      // Это сработает, так как мы сделали npx prisma db push
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true }
      });
      socket.broadcast.emit('user_online', userId);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  });

  // 2. Вход в конкретный чат
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat ${chatId}`);
  });

  // 3. Мгновенная пересылка сообщений
  socket.on('new_message', (newMessageReceived) => {
    if (!newMessageReceived) return;
    
    const chat = newMessageReceived.chat || newMessageReceived.chatId;

    if (newMessageReceived.chat && newMessageReceived.chat.users) {
      newMessageReceived.chat.users.forEach((user: any) => {
        if (user.id === newMessageReceived.senderId) return;
        socket.in(user.id).emit("new_message", newMessageReceived);
      });
    } else {
      socket.to(newMessageReceived.chatId).emit("new_message", newMessageReceived);
    }
  });

  // 4. WebRTC Signaling (Звонки для друзей)
  socket.on('call_user', ({ userToCall, signalData, from, name }) => {
    const userSocketId = [...onlineUsers.entries()].find(([key, val]) => val === userToCall)?.[0];
    if (userSocketId) {
        io.to(userSocketId).emit('call_user', { signal: signalData, from, name, callerSocketId: socket.id });
    }
  });

  socket.on('answer_call', (data) => {
    io.to(data.to).emit('call_accepted', data.signal);
  });

  socket.on('end_call', ({ to }) => {
    const userSocketId = [...onlineUsers.entries()].find(([key, val]) => val === to)?.[0];
    if (userSocketId) {
        io.to(userSocketId).emit('call_ended');
    }
  });

  // 5. Отключение (Offline статус)
  socket.on('disconnect', async () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: new Date() }
        });
        socket.broadcast.emit('user_offline', userId);
        onlineUsers.delete(socket.id);
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

export { httpServer, io };