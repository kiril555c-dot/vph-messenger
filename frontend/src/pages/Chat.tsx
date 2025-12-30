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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

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

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

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

    const timer = setTimeout(searchGlobal, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // Обработка сокетов — ДОБАВЛЕНО: надёжная обработка new_chat
  useEffect(() => {
    if (!socket) return;

    socket.on('typing', (chatId: string) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(true);
    });

    socket.on('stop_typing', (chatId: string) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(false);
    });

    const handleNewMessage = (message: any) => {
      if (activeChat?.id === message.chatId) {
        setMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
        setTimeout(scrollToBottom, 100);
      }
      fetchChats(localStorage.getItem('token') || '');
    };

    // НОВОЕ: обработка создания чата — появляется у обоих
    const handleNewChat = (chat: any) => {
      setChats(prev => {
        // Если чат уже есть — не дублируем
        if (prev.some(c => c.id === chat.id)) return prev;

        // Добавляем только если мы в нём участвуем
        const isMyChat = chat.chatMembers?.some((m: any) => m.user.id === user?.id);
        if (!isMyChat) return prev;

        return [chat, ...prev]; // В начало списка
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
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (e) {
      console.error("Ошибка загрузки чатов:", e);
    }
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
    } catch (e) {
      console.error("Ошибка загрузки сообщений:", e);
    }
  };

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
    if (!newMessage.trim() || !activeChat) return;

    const content = newMessage.trim();
    setNewMessage('');
    socket?.emit('stop_typing', activeChat.id);

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
        socket?.emit('new_message', savedMessage);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) {
      console.error("Ошибка отправки:", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPartner = (chat: any) => 
    chat.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user;

  const getAvatarUrl = (avatar: string | null) =>
    avatar ? (avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`) : null;

  const filteredChats = chats.filter(chat => {
    const partnerName = getPartner(chat)?.username?.toLowerCase() || '';
    return partnerName.includes(searchQuery.toLowerCase());
  });

  const handleSaveProfile = () => {
    const updated = { ...user, username: editedName, bio: editedBio };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
    setIsEditing(false);
  };

  return (
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden relative">
      {/* Твой красивый JSX остаётся без изменений — всё как было */}
      {/* Модалка профиля, sidebar, окно чата — полностью твой оригинальный код */}

      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { setSelectedUser(null); setIsEditing(false); }}></div>
          <div className="relative w-full max-w-[380px] bg-[#161426] rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
            <div className="h-28 bg-gradient-to-tr from-purple-600 to-blue-900 relative">
              <button onClick={() => { setSelectedUser(null); setIsEditing(false); }} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 pb-8 text-center -mt-12 relative">
              <div className="inline-block p-1.5 bg-[#161426] rounded-[30px] mb-4">
                <div className="w-24 h-24 rounded-[24px] bg-purple-900/50 border-2 border-white/5 overflow-hidden flex items-center justify-center">
                  {getAvatarUrl(selectedUser.avatar) ? <img src={getAvatarUrl(selectedUser.avatar)!} className="w-full h-full object-cover" alt="" /> : <User size={40} className="text-purple-400" />}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <input className="w-full bg-[#1f1d33] border border-white/10 rounded-xl p-2 text-center outline-none focus:border-purple-500" value={editedName} onChange={e => setEditedName(e.target.value)} />
                  <textarea className="w-full bg-[#1f1d33] border border-white/10 rounded-xl p-2 text-sm h-20 resize-none outline-none focus:border-purple-500" value={editedBio} onChange={e => setEditedBio(e.target.value)} />
                  <button onClick={handleSaveProfile} className="w-full py-3 bg-purple-600 rounded-2xl font-bold flex items-center justify-center gap-2"><Check size={18} /> Сохранить</button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold">{selectedUser.username}</h3>
                  <p className="text-purple-400 text-xs mb-6 uppercase tracking-widest">@{selectedUser.username.toLowerCase()}</p>
                  
                  {selectedUser.id !== user?.id && (
                    <button onClick={() => startChat(selectedUser)} className="w-full mb-4 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
                      Написать сообщение
                    </button>
                  )}

                  <div className="text-left space-y-4 border-t border-white/5 pt-4">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">О себе</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedUser.bio || "Пользователь Lumina 🌌"}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Остальной JSX (sidebar, чат) — полностью твой, без изменений */}
      {/* Я не копирую его весь, чтобы не делать сообщение огромным — он у тебя уже есть и работает */}

      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        {/* ... твой sidebar ... */}
      </div>

      <div className={`flex-1 flex flex-col bg-[#0f0c1d] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {/* ... твоё окно чата ... */}
      </div>
    </div>
  );
};

export default Chat;