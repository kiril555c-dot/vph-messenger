import dotenv from 'dotenv';
import { httpServer, app } from './app'; // ← Добавляем app из app.ts
import { Server } from 'socket.io';

dotenv.config();

const PORT = process.env.PORT || 3000;

// === ДОБАВЛЯЕМ SOCKET.IO ===
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Разрешаем все источники (можно уточнить твой фронт, например "https://vph-messenger.onrender.com")
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Сохраняем io в app, чтобы использовать в контроллерах
app.set('io', io);

// === ОБРАБОТКА СОКЕТОВ ===
io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

  // Когда клиент отправляет setup с userId — присоединяем его к личной комнате
  socket.on('setup', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Пользователь ${userId} присоединился к комнате user_${userId}`);
  });

  // Присоединение к комнате чата
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`Пользователь присоединился к чату ${chatId}`);
  });

  // Typing индикаторы
  socket.on('typing', (chatId) => {
    socket.in(`chat_${chatId}`).emit('typing', chatId);
  });

  socket.on('stop_typing', (chatId) => {
    socket.in(`chat_${chatId}`).emit('stop_typing', chatId);
  });

  // Новое сообщение (можно расширить позже)
  socket.on('new_message', (message) => {
    io.in(`chat_${message.chatId}`).emit('new_message', message);
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

// Запуск сервера
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});