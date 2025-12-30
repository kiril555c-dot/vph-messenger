import dotenv from 'dotenv';
import { httpServer, app } from './app'; // ← Убедись, что app экспортируется из app.ts
import { Server } from 'socket.io';

dotenv.config();

const PORT = process.env.PORT || 3000;

// === ИНИЦИАЛИЗАЦИЯ SOCKET.IO ===
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Или укажи точный URL фронта, например "https://vph-messenger.onrender.com"
    methods: ["GET", "POST"],
    credentials: true
  }
});

// КРИТИЧЕСКИ ВАЖНАЯ СТРОКА — без неё io в контроллерах undefined
app.set('io', io);

// === ОБРАБОТКА СОКЕТОВ ===
io.on('connection', (socket) => {
  console.log(`Пользователь подключился: ${socket.id}`);

  // Клиент отправляет свой userId при подключении
  socket.on('setup', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`Пользователь ${userId} в комнате user_${userId}`);
    }
  });

  // Присоединение к комнате чата
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`Socket ${socket.id} присоединился к чату ${chatId}`);
  });

  // Typing индикаторы
  socket.on('typing', (chatId) => {
    socket.to(`chat_${chatId}`).emit('typing', chatId);
  });

  socket.on('stop_typing', (chatId) => {
    socket.to(`chat_${chatId}`).emit('stop_typing', chatId);
  });

  // Новое сообщение — отправляем всем в комнате чата
  socket.on('new_message', (message) => {
    io.to(`chat_${message.chatId}`).emit('new_message', message);
  });

  socket.on('disconnect', () => {
    console.log(`Пользователь отключился: ${socket.id}`);
  });
});

// Запуск сервера
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});