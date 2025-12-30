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

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      newSocket.emit('setup', parsedUser.id);
    });
    
    setSocket(newSocket);
    fetchChats(token);

    return () => { newSocket.disconnect(); };
  }, [navigate]);

  // Глобальный поиск пользователей
  useEffect(() => {
    const searchGlobal = async () => {
      if (searchQuery.trim().length < 2) {
        setFoundUsers([]);
        return;
      }
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE_URL}/api/user-list/search?query=${encodeURIComponent(searchQuery)}`, { // Предполагаю роут /api/user-list/search или аналог
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

    const timer = setTimeout(searchGlobal, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  useEffect(() => {
    if (!socket || !activeChat) return;

    socket.off('new_message');
    socket.on('new_message', (message: any) => {
      if (activeChat.id === message.chatId) {
        setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message]);
        scrollToBottom();
      }
      fetchChats(localStorage.getItem('token') || '');
    });

    socket.emit('join_chat', activeChat.id);
    fetchMessages(activeChat.id);

    return () => socket.off('new_message');
  }, [socket, activeChat]);

  const fetchChats = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setChats(await res.json() || []);
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (chatId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setMessages(await res.json());
        scrollToBottom();
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
    setNewMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content, type: 'TEXT' }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        socket.emit('new_message', msg);
        scrollToBottom();
      }
    } catch (e) { console.error(e); }
  };

  const openProfile = (targetUser: any) => {
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
    if (editAvatarFile) formData.append('avatar', editAvatarFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/update`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const updated = await res.json();
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
        setViewingUser(updated);
        setIsEditingProfile(false);
        // fetchChats(token!) чтобы обновить аватарки в чатах
        fetchChats(token!);
      }
    } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const getPartner = (chat: any) => chat.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user || {};
  const getAvatarUrl = (avatar: string | null) => avatar ? (avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`) : null;

  const filteredChats = chats.filter(chat => 
    getPartner(chat).username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return <div className="h-screen bg-[#09090d] flex items-center justify-center text-white text-2xl">Loading...</div>;

  return (
    <div className="flex h-screen bg-[#09090d] text-white overflow-hidden">
      {/* Профиль модалка */}
      {showProfileModal && viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-[#111113] rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24}/></button>
            
            <div className="flex flex-col items-center">
              <div className="relative mb-6 group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#111113] shadow-2xl">
                  {isEditingProfile && previewAvatar ? <img src={previewAvatar} className="w-full h-full object-cover"/> :
                   getAvatarUrl(viewingUser.avatar) ? <img src={getAvatarUrl(viewingUser.avatar)!} className="w-full h-full object-cover"/> :
                   <div className="bg-[#1e1e24] flex items-center justify-center h-full"><User size={64} className="text-gray-600"/></div>}
                </div>
                {isEditingProfile && (
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer rounded-full opacity-0 group-hover:opacity-100 transition">
                    <Camera size={32}/>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
                  </label>
                )}
              </div>

              {!isEditingProfile ? (
                <>
                  <h2 className="text-2xl font-bold mb-1">{viewingUser.username}</h2>
                  <p className="text-sm text-gray-500 mb-6">{viewingUser.email}</p>
                  <div className="w-full bg-[#1e1e24] rounded-2xl p-4 mb-6">
                    <p className="text-xs text-gray-500 mb-2">О себе</p>
                    <p className="text-sm">{viewingUser.bio || 'Нет описания'}</p>
                  </div>
                  {user.id === viewingUser.id && (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-2xl transition">
                      <Edit2 size={18}/> Редактировать
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full space-y-4">
                  <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="w-full bg-[#1e1e24] rounded-xl px-4 py-3 outline-none focus:ring-2 ring-purple-600" placeholder="Имя"/>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} className="w-full bg-[#1e1e24] rounded-xl px-4 py-3 h-32 resize-none outline-none focus:ring-2 ring-purple-600" placeholder="О себе"/>
                  <div className="flex gap-3">
                    <button onClick={saveProfile} className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/> Сохранить</button>
                    <button onClick={() => setIsEditingProfile(false)} className="px-6 bg-[#1e1e24] rounded-xl">Отмена</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Левая панель (как в Telegram) */}
      <div className={`w-full md:w-96 bg-[#111113] flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-[#1e1e24]/50 backdrop-blur p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div onClick={() => openProfile(user)} className="w-10 h-10 rounded-full overflow-hidden cursor-pointer">
              {getAvatarUrl(user.avatar) ? <img src={getAvatarUrl(user.avatar)!} className="w-full h-full object-cover"/> : <User className="text-gray-500"/>}
            </div>
            <h1 className="text-xl font-bold">Lumina</h1>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }}><LogOut size={22}/></button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20}/>
            <input 
              type="text" 
              placeholder="Поиск" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e24] rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 ring-purple-600/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Результаты глобального поиска */}
          {searchQuery && foundUsers.length > 0 && (
            <div className="pb-4">
              {foundUsers.map(u => (
                <div key={u.id} onClick={() => startChat(u)} className="flex items-center gap-4 p-3 hover:bg-[#1e1e24] cursor-pointer rounded-xl mx-2">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a2a32] flex items-center justify-center">
                    {getAvatarUrl(u.avatar) ? <img src={getAvatarUrl(u.avatar)!} className="w-full h-full object-cover"/> : <User size={28}/>}
                  </div>
                  <div>
                    <p className="font-semibold">{u.username}</p>
                    <p className="text-xs text-gray-500">Нажмите, чтобы начать чат</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Чаты */}
          {filteredChats.map(chat => {
            const partner = getPartner(chat);
            const lastMsg = chat.latestMessage;
            return (
              <div key={chat.id} onClick={() => setActiveChat(chat)} className={`flex items-center gap-4 p-3 hover:bg-[#1e1e24] cursor-pointer rounded-xl mx-2 ${activeChat?.id === chat.id ? 'bg-[#1e1e24]' : ''}`}>
                <div onClick={e => {e.stopPropagation(); openProfile(partner)}} className="w-14 h-14 rounded-full overflow-hidden relative">
                  {getAvatarUrl(partner.avatar) ? <img src={getAvatarUrl(partner.avatar)!} className="w-full h-full object-cover"/> :
                   <div className="bg-[#2a2a32] flex items-center justify-center h-full"><User size={32}/></div>}
                  {/* Онлайн индикатор */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-[#111113]"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{partner.username || 'Чат'}</p>
                  <p className="text-sm text-gray-500 truncate">{lastMsg?.content || 'Нет сообщений'}</p>
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
      <div className="flex-1 flex flex-col bg-[#09090d]">
        {activeChat ? (
          <>
            <div className="bg-[#111113]/80 backdrop-blur p-4 flex items-center gap-4 border-b border-white/10">
              <button onClick={() => setActiveChat(null)} className="md:hidden"><X size={24}/></button>
              <div onClick={() => openProfile(getPartner(activeChat))} className="w-10 h-10 rounded-full overflow-hidden cursor-pointer">
                {getAvatarUrl(getPartner(activeChat).avatar) ? <img src={getAvatarUrl(getPartner(activeChat).avatar)!} className="w-full h-full object-cover"/> : <User/>}
              </div>
              <div>
                <h2 className="font-bold">{getPartner(activeChat).username}</h2>
                <p className="text-xs text-green-400">в сети</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md px-5 py-3 rounded-3xl ${msg.senderId === user.id ? 'bg-purple-600 rounded-tr-none' : 'bg-[#1e1e24] rounded-tl-none'}`}>
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-60 text-right mt-1">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}/>
            </div>

            <form onSubmit={sendTextMessage} className="p-4 bg-[#111113]/50 backdrop-blur">
              <div className="flex items-center gap-3">
                <button type="button" className="text-gray-400 hover:text-white"><Smile size={24}/></button>
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Сообщение..."
                  className="flex-1 bg-[#1e1e24] rounded-full px-6 py-4 outline-none"
                />
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 w-12 h-12 rounded-full flex items-center justify-center transition"><Send size={20}/></button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-32 h-32 bg-purple-900/20 rounded-full flex items-center justify-center mb-8">
              <Smile size={64} className="text-purple-600"/>
            </div>
            <h2 className="text-2xl font-bold mb-2">Выберите чат или начните новый</h2>
            <p className="text-center max-w-sm">Найдите пользователя в поиске или выберите существующий диалог</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;