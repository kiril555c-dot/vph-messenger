import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, X, User, Smile, Camera, Edit2, Save } from 'lucide-react';
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
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Инициализация сокета
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) { navigate('/login'); return; }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log("✅ Сокет подключен:", newSocket.id);
      newSocket.emit('setup', parsedUser.id);
    });

    newSocket.on('disconnect', () => {
      console.log("❌ Сокет отключен");
    });

    // Слушаем обновления профиля
    newSocket.on('profile_updated', (data: any) => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (data.userId === currentUser.id || data.userId === parsedUser.id) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      }
      fetchChats(token);
    });
    
    setSocket(newSocket);
    fetchChats(token);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  // 2. Глобальный поиск пользователей
  useEffect(() => {
    const searchGlobal = async () => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length < 1) {
        setFoundUsers([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setIsSearching(false);
        return;
      }
      
      try {
        // Пробуем основной роут
        let url = `${API_BASE_URL}/api/users-list/search?query=${encodeURIComponent(trimmedQuery)}`;
        let res = await fetch(url, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Если 404, пробуем альтернативный роут
        if (res.status === 404) {
          url = `${API_BASE_URL}/api/user-list/search?query=${encodeURIComponent(trimmedQuery)}`;
          res = await fetch(url, {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
        
        if (res.ok) {
          const data = await res.json();
          setFoundUsers(Array.isArray(data) ? data.filter((u: any) => u.id !== user?.id) : []);
        } else {
          console.error("Ошибка поиска:", res.status);
          setFoundUsers([]);
        }
      } catch (e) {
        console.error("Ошибка поиска:", e);
        setFoundUsers([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchGlobal, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // 3. Обработка сообщений через сокет
  useEffect(() => {
    if (!socket || !activeChat) return undefined;

    socket.off('new_message');
    socket.on('new_message', (message: any) => {
      if (activeChat.id === message.chatId) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
      fetchChats(localStorage.getItem('token') || '');
    });

    socket.emit('join_chat', activeChat.id);
    fetchMessages(activeChat.id);

    return () => {
      socket.off('new_message');
    };
  }, [socket, activeChat]);

  // --- API ФУНКЦИИ ---

  const fetchChats = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setChats(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (chatId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) { console.error(e); }
  };

  const startChat = async (targetUser: any) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUser.id }),
      });
      if (res.ok) {
        const chat = await res.json();
        setChats(prev => prev.find(c => c.id === chat.id) ? prev : [chat, ...prev]);
        setActiveChat(chat);
        setSearchQuery('');
        setFoundUsers([]);
      }
    } catch (e) { console.error(e); }
  };

  const sendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || !socket) return;
    
    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Оптимистичное обновление - показываем сообщение сразу
    const optimisticMessage = {
      id: tempId,
      content,
      senderId: user.id,
      chatId: activeChat.id,
      createdAt: new Date().toISOString(),
      type: 'TEXT'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setTimeout(scrollToBottom, 50);
    
    // Фокус на input после отправки
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content, type: 'TEXT' }),
      });

      if (response.ok) {
        const saved = await response.json();
        // Заменяем временное сообщение на реальное
        setMessages(prev => prev.map(m => m.id === tempId ? saved : m));
        // Отправляем через сокет для других пользователей
        socket.emit('new_message', saved);
        setTimeout(scrollToBottom, 100);
      } else {
        // Если ошибка, удаляем оптимистичное сообщение
        setMessages(prev => prev.filter(m => m.id !== tempId));
        alert('Ошибка отправки сообщения');
      }
    } catch (e) {
      console.error(e);
      // Удаляем оптимистичное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.id !== tempId));
      alert('Ошибка соединения');
    }
  };

  // --- ЛОГИКА ПРОФИЛЯ ---

  const openProfile = (targetUser: any) => {
    if (!targetUser) return;
    setViewingUser(targetUser);
    setShowProfileModal(true);
    setIsEditingProfile(false);
    setEditUsername(targetUser.username || '');
    setEditBio(targetUser.bio || '');
    setPreviewAvatar(null);
    setEditAvatarFile(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditAvatarFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const saveProfile = async () => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('username', editUsername);
    formData.append('bio', editBio);
    if (editAvatarFile) {
      formData.append('avatar', editAvatarFile);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/update`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        const updatedUser = result.user || result;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setViewingUser(updatedUser);
        setIsEditingProfile(false);
        fetchChats(token!);
      } else {
        alert('Ошибка обновления профиля');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
    }
  };

  // --- UTILS ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getPartner = (chat: any) => {
    if (!chat?.chatMembers) return null;
    return chat.chatMembers.find((m: any) => m.user?.id !== user?.id)?.user || null;
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

  if (!user) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0f0c1d] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-bold">Lumina</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0f0c1d] text-white overflow-hidden relative">
      {/* Анимированный фон */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Модалка профиля */}
      {showProfileModal && viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-[#161426] to-[#1a1a2e] rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowProfileModal(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            >
              <X size={24}/>
            </button>
            
            <div className="flex flex-col items-center">
              <div className="relative mb-6 group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500/30 shadow-2xl shadow-purple-500/20 ring-4 ring-purple-500/10 transition-all group-hover:scale-105">
                  {isEditingProfile && previewAvatar ? (
                    <img src={previewAvatar} className="w-full h-full object-cover"/>
                  ) : getAvatarUrl(viewingUser.avatar) ? (
                    <img src={getAvatarUrl(viewingUser.avatar)!} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="bg-gradient-to-br from-[#1e1e24] to-[#2a2a32] flex items-center justify-center h-full">
                      <User size={64} className="text-gray-500"/>
                    </div>
                  )}
                </div>
                {isEditingProfile && (
                  <label className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center cursor-pointer rounded-full opacity-0 group-hover:opacity-100 transition-all">
                    <Camera size={32} className="text-white drop-shadow-lg"/>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
                  </label>
                )}
              </div>

              {!isEditingProfile ? (
                <>
                  <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {viewingUser.username}
                  </h2>
                  <p className="text-sm text-gray-400 mb-6">{viewingUser.email}</p>
                  <div className="w-full bg-gradient-to-br from-[#1e1e24] to-[#2a2a32] rounded-2xl p-4 mb-6 border border-white/5">
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">О себе</p>
                    <p className="text-sm text-gray-300">{viewingUser.bio || 'Нет описания'}</p>
                  </div>
                  {user.id === viewingUser.id && (
                    <button 
                      onClick={() => setIsEditingProfile(true)} 
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 rounded-2xl transition-all border border-purple-500/20 hover:border-purple-500/40"
                    >
                      <Edit2 size={18}/> Редактировать
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full space-y-4">
                  <input 
                    type="text" 
                    value={editUsername} 
                    onChange={e => setEditUsername(e.target.value)} 
                    className="w-full bg-[#1e1e24] rounded-xl px-4 py-3 outline-none focus:ring-2 ring-purple-600 border border-white/5 focus:border-purple-500/50 transition-all text-white" 
                    placeholder="Имя"
                  />
                  <textarea 
                    value={editBio} 
                    onChange={e => setEditBio(e.target.value)} 
                    className="w-full bg-[#1e1e24] rounded-xl px-4 py-3 h-32 resize-none outline-none focus:ring-2 ring-purple-600 border border-white/5 focus:border-purple-500/50 transition-all text-white" 
                    placeholder="О себе"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={saveProfile} 
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
                    >
                      <Save size={18}/> Сохранить
                    </button>
                    <button 
                      onClick={() => setIsEditingProfile(false)} 
                      className="px-6 bg-[#1e1e24] hover:bg-[#2a2a32] rounded-xl border border-white/5 transition-all"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Левая панель */}
      <div className={`w-full md:w-96 bg-gradient-to-b from-[#161426]/90 to-[#0f0c1d]/90 backdrop-blur-xl flex flex-col border-r border-white/5 relative z-10 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-gradient-to-r from-[#1e1e24]/80 to-[#2a2a32]/80 backdrop-blur-xl p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => openProfile(user)} 
              className="w-10 h-10 rounded-full overflow-hidden cursor-pointer ring-2 ring-purple-500/30 hover:ring-purple-500/50 transition-all hover:scale-110"
            >
              {getAvatarUrl(user.avatar) ? (
                <img src={getAvatarUrl(user.avatar)!} className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <User size={20} className="text-white"/>
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Lumina
            </h1>
          </div>
          <button 
            onClick={() => { localStorage.clear(); navigate('/login'); }} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <LogOut size={22}/>
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
            <input 
              type="text" 
              placeholder="Поиск..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e24] rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 ring-purple-600/50 border border-white/5 focus:border-purple-500/50 transition-all placeholder-gray-500 text-white"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Результаты поиска */}
          {searchQuery && foundUsers.length > 0 && (
            <div className="pb-4">
              <p className="px-4 py-2 text-xs text-purple-400 uppercase tracking-wider font-bold">Результаты поиска</p>
              {foundUsers.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => startChat(u)} 
                  className="flex items-center gap-4 p-3 hover:bg-gradient-to-r hover:from-[#1e1e24] hover:to-[#2a2a32] cursor-pointer rounded-xl mx-2 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#2a2a32] to-[#1e1e24] flex items-center justify-center ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all">
                    {getAvatarUrl(u.avatar) ? (
                      <img src={getAvatarUrl(u.avatar)!} className="w-full h-full object-cover"/>
                    ) : (
                      <User size={28} className="text-gray-500"/>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{u.username}</p>
                    <p className="text-xs text-gray-400">Нажмите, чтобы начать чат</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Список чатов */}
          {filteredChats.length === 0 && !searchQuery && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full flex items-center justify-center mb-4">
                <Smile size={48} className="text-purple-500"/>
              </div>
              <p className="text-center">У вас пока нет чатов</p>
              <p className="text-xs text-gray-600 mt-2 text-center">Найдите пользователя в поиске</p>
            </div>
          )}
          {filteredChats.map(chat => {
            const partner = getPartner(chat);
            const lastMsg = chat.latestMessage;
            const isActive = activeChat?.id === chat.id;
            return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)} 
                className={`flex items-center gap-4 p-3 hover:bg-gradient-to-r hover:from-[#1e1e24] hover:to-[#2a2a32] cursor-pointer rounded-xl mx-2 transition-all group ${
                  isActive ? 'bg-gradient-to-r from-[#1e1e24] to-[#2a2a32] border-l-4 border-purple-500' : ''
                }`}
              >
                <div 
                  onClick={e => {e.stopPropagation(); if(partner) openProfile(partner);}} 
                  className="w-14 h-14 rounded-full overflow-hidden relative ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all"
                >
                  {getAvatarUrl(partner?.avatar) ? (
                    <img src={getAvatarUrl(partner.avatar)!} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="bg-gradient-to-br from-[#2a2a32] to-[#1e1e24] flex items-center justify-center h-full">
                      <User size={32} className="text-gray-500"/>
                    </div>
                  )}
                  {partner?.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-[#161426] shadow-lg shadow-green-500/50 animate-pulse"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-white">{partner?.username || 'Чат'}</p>
                  <p className="text-sm text-gray-400 truncate">{lastMsg?.content || 'Нет сообщений'}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {lastMsg && new Date(lastMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Правое окно чата */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a0f] to-[#0f0c1d] relative z-0">
        {activeChat ? (
          <>
            <div className="bg-gradient-to-r from-[#161426]/90 to-[#1a1a2e]/90 backdrop-blur-xl p-4 flex items-center gap-4 border-b border-white/10 shadow-lg">
              <button 
                onClick={() => setActiveChat(null)} 
                className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-400"/>
              </button>
              <div 
                onClick={() => openProfile(getPartner(activeChat))} 
                className="w-10 h-10 rounded-full overflow-hidden cursor-pointer ring-2 ring-purple-500/30 hover:ring-purple-500/50 transition-all hover:scale-110"
              >
                {getAvatarUrl(getPartner(activeChat)?.avatar) ? (
                  <img src={getAvatarUrl(getPartner(activeChat).avatar)!} className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <User size={20} className="text-white"/>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-white">{getPartner(activeChat)?.username}</h2>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  {getPartner(activeChat)?.isOnline ? 'в сети' : 'не в сети'}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-md px-5 py-3 rounded-3xl shadow-lg ${
                    msg.senderId === user.id 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 rounded-tr-none' 
                      : 'bg-gradient-to-br from-[#1e1e24] to-[#2a2a32] rounded-tl-none border border-white/5'
                  }`}>
                    <p className="text-white">{msg.content}</p>
                    <p className={`text-xs opacity-70 mt-1 ${msg.senderId === user.id ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}/>
            </div>

            <form onSubmit={sendTextMessage} className="p-4 bg-gradient-to-r from-[#161426]/80 to-[#1a1a2e]/80 backdrop-blur-xl border-t border-white/10">
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  className="text-gray-400 hover:text-purple-400 transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <Smile size={24}/>
                </button>
                <input 
                  ref={inputRef}
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Сообщение..."
                  className="flex-1 bg-[#1e1e24] rounded-full px-6 py-4 outline-none border border-white/5 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder-gray-500 text-white"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendTextMessage(e as any);
                    }
                  }}
                />
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg shadow-purple-500/30 hover:scale-110 active:scale-95"
                >
                  <Send size={20} className="text-white"/>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative z-10">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full flex items-center justify-center mb-8 ring-4 ring-purple-500/10 animate-pulse">
              <Smile size={64} className="text-purple-500"/>
            </div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Выберите чат или начните новый
            </h2>
            <p className="text-center max-w-sm text-gray-400">
              Найдите пользователя в поиске или выберите существующий диалог
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
