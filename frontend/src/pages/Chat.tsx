import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, X, Check, User, Smile, MoreVertical, Camera, Edit2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = 'https://vph-messenger.onrender.com';

const Chat: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null); // Я (текущий юзер)
  
  // Поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]); 

  // Профиль
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null); // Юзер, которого смотрим
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Форма редактирования
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Инициализация
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) { navigate('/login'); return; }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log("Сокет подключен:", newSocket.id);
      newSocket.emit('setup', parsedUser.id);
    });
    
    setSocket(newSocket);
    fetchChats(token);

    return () => { newSocket.disconnect(); };
  }, [navigate]);

  // 2. Глобальный поиск
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
        console.error("Ошибка поиска:", e);
      }
    };

    const delayDebounce = setTimeout(searchGlobal, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user]);

  // 3. Сообщения
  useEffect(() => {
    if (!socket) return;
    socket.off('new_message'); 
    socket.on('new_message', (message: any) => {
      if (activeChat && activeChat.id === message.chatId) {
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
      fetchChats(localStorage.getItem('token') || '');
    });

    if (activeChat) {
      socket.emit('join_chat', activeChat.id);
      fetchMessages(activeChat.id);
    }

    return () => { socket.off('new_message'); };
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
        setMessages(await res.json());
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

  const sendTextMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeChat || !socket) return;
    const content = newMessage.trim();
    setNewMessage('');
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
        socket.emit('new_message', saved);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) { console.error(e); }
  };

  // --- ЛОГИКА ПРОФИЛЯ ---

  const openProfile = (targetUser: any) => {
    setViewingUser(targetUser);
    setShowProfileModal(true);
    setIsEditingProfile(false);
    // Сброс формы
    setEditUsername(targetUser.username || '');
    setEditBio(targetUser.bio || ''); // Предполагаем, что поле bio есть в базе
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
      // ВАЖНО: Убедись, что на бэкенде есть роут PUT /api/users/update для FormData
      const res = await fetch(`${API_BASE_URL}/api/users/update`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData, // Не ставим Content-Type, браузер сам поставит boundary
      });

      if (res.ok) {
        const updatedUser = await res.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setViewingUser(updatedUser);
        setIsEditingProfile(false);
        alert('Профиль обновлен!');
      } else {
        alert('Ошибка обновления профиля');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка соединения');
    }
  };

  // --- UTILS ---
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const getPartner = (chat: any) => chat.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user;
  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return null;
    return avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`;
  };

  const filteredChats = chats.filter(chat => {
    const partnerName = getPartner(chat)?.username?.toLowerCase() || '';
    return partnerName.includes(searchQuery.toLowerCase());
  });

  if (!user) return <div className="h-screen bg-[#0f0c1d] flex items-center justify-center text-white font-bold">Lumina Loading...</div>;

  return (
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden relative">
      
      {/* --- МОДАЛКА ПРОФИЛЯ --- */}
      {showProfileModal && viewingUser && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161426]/90 border border-white/10 rounded-[32px] w-full max-w-md p-6 relative shadow-2xl overflow-hidden">
            {/* Фон декоративный */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-purple-600 to-pink-600 opacity-20"></div>
            
            <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 p-2 bg-black/20 rounded-full">
              <X size={20} />
            </button>

            <div className="relative mt-8 mb-4 flex flex-col items-center">
              {/* Аватарка */}
              <div className="relative group">
                <div className="w-28 h-28 rounded-full border-4 border-[#161426] shadow-lg overflow-hidden bg-[#2a2640] flex items-center justify-center">
                  {isEditingProfile && previewAvatar ? (
                    <img src={previewAvatar} className="w-full h-full object-cover" />
                  ) : (
                    getAvatarUrl(viewingUser.avatar) ? 
                      <img src={getAvatarUrl(viewingUser.avatar)!} className="w-full h-full object-cover" /> : 
                      <User size={40} className="text-gray-400"/>
                  )}
                </div>
                
                {/* Кнопка загрузки фото (только при редактировании) */}
                {isEditingProfile && (
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                )}
              </div>

              {/* Имя и статус */}
              {!isEditingProfile ? (
                <>
                  <h2 className="text-2xl font-black mt-4 text-white">{viewingUser.username}</h2>
                  <p className="text-purple-400 text-sm font-medium">{viewingUser.email}</p>
                  
                  {/* Описание */}
                  <div className="mt-6 w-full bg-white/5 rounded-2xl p-4 min-h-[80px]">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">О себе</p>
                    <p className="text-sm text-gray-300 italic">
                      {viewingUser.bio || "Описание отсутствует..."}
                    </p>
                  </div>

                  {/* Кнопка редактирования (только для своего профиля) */}
                  {user.id === viewingUser.id && (
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="mt-6 flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-bold"
                    >
                      <Edit2 size={16} /> Редактировать профиль
                    </button>
                  )}
                </>
              ) : (
                /* ФОРМА РЕДАКТИРОВАНИЯ */
                <div className="w-full mt-4 space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-bold ml-2">Имя пользователя</label>
                    <input 
                      type="text" 
                      value={editUsername} 
                      onChange={e => setEditUsername(e.target.value)}
                      className="w-full bg-[#1f1d33] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold ml-2">О себе</label>
                    <textarea 
                      value={editBio} 
                      onChange={e => setEditBio(e.target.value)}
                      className="w-full bg-[#1f1d33] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-purple-500 mt-1 h-24 resize-none"
                      placeholder="Расскажите о себе..."
                    />
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <button onClick={saveProfile} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      <Save size={18} /> Сохранить
                    </button>
                    <button onClick={() => setIsEditingProfile(false)} className="px-4 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400">
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent italic cursor-default">Lumina</h1>
          
          <div className="flex items-center gap-3">
             {/* Моя аватарка (кнопка) */}
            <div onClick={() => openProfile(user)} className="w-9 h-9 rounded-full bg-purple-900/50 cursor-pointer overflow-hidden border border-white/20 hover:border-purple-500 transition-all">
               {getAvatarUrl(user.avatar) ? <img src={getAvatarUrl(user.avatar)!} className="w-full h-full object-cover"/> : <User className="p-1 text-white"/>}
            </div>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-gray-500 hover:text-white transition-colors"><LogOut size={20}/></button>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Поиск людей..." 
              className="w-full bg-[#1f1d33] rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-purple-500/50 transition-all" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          {/* РЕЗУЛЬТАТЫ ПОИСКА */}
          {searchQuery && foundUsers.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-purple-400 uppercase font-black px-4 mb-2 tracking-widest">Глобальный поиск</p>
              {foundUsers.map(u => (
                <div key={u.id} className="flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer bg-purple-600/10 border border-purple-500/20 mb-2 hover:bg-purple-600/20 transition-all group">
                  <div onClick={(e) => {e.stopPropagation(); openProfile(u);}} className="w-11 h-11 rounded-2xl bg-purple-900/40 flex items-center justify-center border border-white/10 hover:border-purple-400 overflow-hidden transition-all">
                    {getAvatarUrl(u.avatar) ? <img src={getAvatarUrl(u.avatar)!} className="w-full h-full object-cover" /> : <User size={18}/>}
                  </div>
                  <div className="flex-1 min-w-0 text-left" onClick={() => startChat(u)}>
                    <p className="font-bold text-sm truncate">{u.username}</p>
                    <p className="text-[10px] text-gray-500">Нажми, чтобы написать</p>
                  </div>
                </div>
              ))}
              <div className="border-b border-white/5 mx-4 my-4 opacity-10"></div>
            </div>
          )}

          {/* СПИСОК ЧАТОВ */}
          <p className="text-[10px] text-gray-500 uppercase font-black px-4 mb-2 tracking-widest">Сообщения</p>
          {filteredChats.map(chat => {
            const partner = getPartner(chat);
            const isActive = activeChat?.id === chat.id;
            return (
              <div key={chat.id} className={`flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer mb-1 transition-all ${isActive ? 'bg-purple-600/20 border border-white/5 shadow-lg' : 'hover:bg-white/5'}`}>
                {/* Аватарка в списке чатов - кликабельна для профиля */}
                <div onClick={(e) => { e.stopPropagation(); if(partner) openProfile(partner); }} className="w-12 h-12 min-w-[3rem] rounded-2xl bg-purple-900/50 flex items-center justify-center border border-white/10 overflow-hidden hover:scale-105 transition-transform z-10">
                  {getAvatarUrl(partner?.avatar) ? <img src={getAvatarUrl(partner.avatar)!} className="w-full h-full object-cover" /> : <User size={20} className="text-purple-400"/>}
                </div>
                {/* Остальная часть строки открывает чат */}
                <div className="flex-1 min-w-0 text-left" onClick={() => setActiveChat(chat)}>
                  <p className="font-bold text-sm truncate text-gray-200">{partner?.username || 'Чат'}</p>
                  <p className="text-xs text-gray-500 truncate opacity-80">{chat.latestMessage?.content || 'Сообщений пока нет'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ОКНО ЧАТА */}
      <div className={`flex-1 flex flex-col bg-[#0f0c1d] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#161426]/30 backdrop-blur-md z-10">
              <div className="flex items-center gap-4 text-left">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-purple-400 mr-2">←</button>
                {/* Аватарка в заголовке чата - кликабельна */}
                <div onClick={() => openProfile(getPartner(activeChat))} className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-white/10 cursor-pointer hover:border-purple-400 overflow-hidden transition-all">
                   {getAvatarUrl(getPartner(activeChat)?.avatar) ? <img src={getAvatarUrl(getPartner(activeChat).avatar)!} className="w-full h-full object-cover" /> : <User size={18}/>}
                </div>
                <div onClick={() => openProfile(getPartner(activeChat))} className="cursor-pointer hover:opacity-80">
                  <h2 className="font-bold text-sm text-white">{getPartner(activeChat)?.username}</h2>
                  <span className="text-[10px] text-green-500 font-black tracking-widest uppercase animate-pulse">в сети</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  {/* Аватарка собеседника рядом с сообщением (опционально можно добавить, но пока просто текст) */}
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-[22px] shadow-xl ${msg.senderId === user?.id ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-[#1f1d33] border border-white/5 text-gray-200 rounded-tl-none'}`}>
                    <p className="text-[13.5px] leading-relaxed text-left">{msg.content}</p>
                    <span className="text-[9px] opacity-30 mt-1 block text-right italic">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6">
              <form onSubmit={sendTextMessage} className="max-w-4xl mx-auto flex items-center gap-3">
                <div className="flex-1 flex items-center bg-[#1f1d33] border border-white/5 rounded-[22px] px-2 focus-within:border-purple-500/30 transition-all shadow-inner">
                  <button type="button" className="text-gray-500 p-3 hover:text-purple-400"><Smile size={20}/></button>
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)} 
                    className="flex-1 bg-transparent border-none py-4 text-sm outline-none" 
                    placeholder="Напишите сообщение..." 
                  />
                </div>
                <button type="submit" className="w-12 h-12 flex items-center justify-center bg-purple-600 rounded-2xl hover:bg-purple-500 transition-all shadow-lg active:scale-90"><Send size={18} className="text-white" /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 p-10">
             <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 text-5xl">🌌</div>
             <h2 className="text-2xl font-black italic tracking-tighter">Lumina Messenger</h2>
             <p className="text-sm max-w-[200px] mt-2 font-medium">Выберите чат, чтобы мгновенно начать общение</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;