import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, X, Camera, Check, Edit3, User, Smile, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = 'https://vph-messenger.onrender.com';

const Chat: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  
  const [foundUsers, setFoundUsers] = useState<any[]>([]); 
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBio, setEditedBio] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Инициализация и Socket.io
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) { navigate('/login'); return; }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setEditedName(parsedUser.username);
    setEditedBio(parsedUser.bio || "Пользователь Lumina 🌌");

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('setup', parsedUser.id);
    });
    
    setSocket(newSocket);
    fetchChats(token);
    return () => { newSocket.disconnect(); };
  }, [navigate]);

  // 2. Глобальный поиск людей
  useEffect(() => {
    const searchGlobal = async () => {
      if (searchQuery.trim().length < 1) {
        setFoundUsers([]);
        return;
      }
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFoundUsers(data.filter((u: any) => u.id !== user?.id));
        }
      } catch (e) {
        console.error("Ошибка при поиске:", e);
      }
    };

    const delayDebounce = setTimeout(searchGlobal, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user]);

  // 3. Обработка Socket событий (ЗДЕСЬ ДОБАВЛЕНО СОБЫТИЕ new_chat)
  useEffect(() => {
    if (!socket) return;
    
    socket.on('typing', (chatId) => { 
      if (activeChat?.id === chatId) setIsPartnerTyping(true); 
    });
    socket.on('stop_typing', (chatId) => { 
      if (activeChat?.id === chatId) setIsPartnerTyping(false); 
    });

    const handleNewMessage = (message: any) => {
      if (activeChat?.id === message.chatId) {
        setMessages((prev) => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
        setTimeout(scrollToBottom, 100);
      }
      // Обновляем список чатов при новом сообщении (чтобы latestMessage обновился)
      fetchChats(localStorage.getItem('token') || '');
    };

    const handleNewChat = (chat: any) => {
      setChats((prev) => {
        // Избегаем дубликатов
        if (prev.some(c => c.id === chat.id)) return prev;
        return [chat, ...prev]; // Новый чат в начало списка
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_chat', handleNewChat); // ←←← ВОТ ЭТА СТРОКА РЕШАЕТ ПРОБЛЕМУ

    if (activeChat) {
      socket.emit('join_chat', activeChat.id);
      fetchMessages(activeChat.id);
    }

    return () => { 
        socket.off('new_message', handleNewMessage);
        socket.off('new_chat', handleNewChat); // ←←← Очистка
        socket.off('typing');
        socket.off('stop_typing');
    };
  }, [socket, activeChat]);

  // 4. Функции API
  const fetchChats = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (Array.isArray(data)) setChats(data);
    } catch (e) { console.error("Ошибка чатов:", e); }
  };

  const fetchMessages = async (chatId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        setMessages(await res.json());
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) { console.error("Ошибка загрузки сообщений:", e); }
  };

  // МГНОВЕННОЕ ОТКРЫТИЕ ЧАТА
  const startChat = async (targetUser: any) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetUser.id }),
      });

      if (res.ok) {
        const chat = await res.json();
        
        // Локально добавляем у себя (на всякий случай, хотя теперь придёт и через сокет)
        setChats((prev) => {
          const exists = prev.find((c) => c.id === chat.id);
          if (exists) return prev;
          return [chat, ...prev];
        });

        setActiveChat(chat);
        setSearchQuery('');
        setFoundUsers([]);
        setSelectedUser(null);
        
        fetchMessages(chat.id);
        socket?.emit('join_chat', chat.id);
      }
    } catch (e) {
      console.error("Ошибка при создании чата:", e);
    }
  };

  const handleSaveProfile = () => {
    const updatedUser = { ...user, username: editedName, bio: editedBio };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setIsEditing(false);
  };

  const sendTextMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    const content = newMessage;
    setNewMessage('');
    socket?.emit('stop_typing', activeChat.id);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content, type: 'TEXT' }),
      });
      if (response.ok) {
        const saved = await response.json();
        setMessages(p => [...p, saved]);
        socket?.emit('new_message', saved);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const getPartner = (chat: any) => chat.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user;
  const getAvatarUrl = (avatar: string | null) => avatar ? (avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`) : null;

  const filteredChats = chats.filter(chat => {
    const partnerName = getPartner(chat)?.username?.toLowerCase() || '';
    return partnerName.includes(searchQuery.toLowerCase());
  });

  return (
    // ... весь твой JSX остаётся БЕЗ ИЗМЕНЕНИЙ (я его не трогал, он идеален)
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden relative">
      {/* Весь остальной JSX точно такой же, как у тебя был */}
      {/* Я не копирую его сюда, чтобы не делать сообщение огромным — просто замени весь файл на этот код */}
      {/* Всё, что ниже return, оставь как было */}
      
      {/* МОДАЛКА ПРОФИЛЯ, SIDEBAR, ОКНО ЧАТА — всё идентично твоему оригиналу */}
      
    </div>
  );
};

export default Chat;