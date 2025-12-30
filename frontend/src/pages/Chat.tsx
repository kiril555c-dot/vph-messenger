import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, X, Check, User, Smile, MoreVertical } from 'lucide-react';
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

  // === ЗАЩИТА ОТ КРАША: если user ещё не загружен ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setEditedName(parsedUser.username || '');
      setEditedBio(parsedUser.bio || "Пользователь Lumina 🌌");

      const newSocket = io(API_BASE_URL, {
        transports: ['websocket'],
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('setup', parsedUser.id);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Socket connect error:', err);
      });

      setSocket(newSocket);
      fetchChats(token);

      return () => {
        newSocket.disconnect();
      };
    } catch (e) {
      console.error("Ошибка парсинга user из localStorage:", e);
      navigate('/login');
    }
  }, [navigate]);

  // Поиск
  useEffect(() => {
    if (!user) return;

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
          setFoundUsers(data.filter((u: any) => u.id !== user.id));
        }
      } catch (e) {
        console.error("Ошибка поиска:", e);
      }
    };

    const timer = setTimeout(searchGlobal, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // Сокеты с защитой от null
  useEffect(() => {
    if (!socket || !user) return;

    socket.on('typing', (chatId: string) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(true);
    });

    socket.on('stop_typing', (chatId: string) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(false);
    });

    const handleNewMessage = (message: any) => {
      if (activeChat?.id === message.chatId) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
      fetchChats(localStorage.getItem('token') || '');
    };

    const handleNewChat = (chat: any) => {
      setChats(prev => {
        if (prev.some(c => c.id === chat.id)) return prev;
        return [chat, ...prev];
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('new_chat', handleNewChat);

    if (activeChat) {
      socket.emit('join_chat', activeChat.id);
      fetchMessages(activeChat.id);
    }

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('new_chat', handleNewChat);
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, activeChat, user]);

  const fetchChats = async (token: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data || []);
      }
    } catch (e) {
      console.error("Ошибка загрузки чатов:", e);
    }
  };

  const fetchMessages = async (chatId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(await res.json());
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) {
      console.error("Ошибка загрузки сообщений:", e);
    }
  };

  const startChat = async (targetUser: any) => {
    const token = localStorage.getItem('token');
    if (!token) return;
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

        setChats(prev => {
          if (prev.some(c => c.id === chat.id)) return prev;
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
      console.error("Ошибка создания чата:", e);
    }
  };

  const sendTextMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeChat || !socket) return;

    const content = newMessage.trim();
    setNewMessage('');
    socket.emit('stop_typing', activeChat.id);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: activeChat.id,
          content,
          type: 'TEXT'
        })
      });

      if (res.ok) {
        const savedMessage = await res.json();
        setMessages(prev => [...prev, savedMessage]);
        socket.emit('new_message', savedMessage);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) {
      console.error("Ошибка отправки:", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPartner = (chat: any) => {
    if (!chat || !chat.chatMembers) return null;
    return chat.chatMembers.find((m: any) => m.user.id !== user?.id)?.user;
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return null;
    return avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`;
  };

  const filteredChats = chats.filter(chat => {
    const partner = getPartner(chat);
    const partnerName = partner?.username?.toLowerCase() || '';
    return partnerName.includes(searchQuery.toLowerCase());
  });

  // === ЗАЩИТА ОТ КРАША: если user ещё не готов ===
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0c1d] text-white text-xl">
        Загрузка профиля...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden relative">
      {/* ТВОЙ ПОЛНЫЙ JSX — ВСТАВЬ СВОЙ ОРИГИНАЛЬНЫЙ КОД СЮДА */}
      {/* (модалка, sidebar, окно чата — всё как у тебя было) */}

      {/* Я не копирую весь JSX, чтобы не делать сообщение огромным — вставь свой оригинальный JSX сюда */}
      {/* Он у тебя уже есть — просто скопируй из предыдущей версии */}

      {/* Пример начала sidebar */}
      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Lumina</h1>
          {/* ... остальное твоё */}
        </div>
        {/* ... */}
      </div>

      {/* Окно чата */}
      <div className={`flex-1 flex flex-col bg-[#0f0c1d] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {/* ... твоё окно чата ... */}
      </div>
    </div>
  );
};

export default Chat;