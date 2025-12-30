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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      console.log("Socket подключен:", newSocket.id);
      newSocket.emit('setup', parsedUser.id);
    });
    
    setSocket(newSocket);
    fetchChats(token);
    return () => { newSocket.disconnect(); };
  }, [navigate]);

  // 2. ИСПРАВЛЕННЫЙ Глобальный поиск людей
  useEffect(() => {
    const searchGlobal = async () => {
      // Ищем, если введено хотя бы 1 символ
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
          // Исключаем себя из поиска
          setFoundUsers(data.filter((u: any) => u.id !== user?.id));
        } else {
          console.error("Сервер вернул ошибку поиска:", res.status);
        }
      } catch (e) {
        console.error("Ошибка сети при поиске:", e);
      }
    };

    const delayDebounce = setTimeout(searchGlobal, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user]);

  // 3. Обработка Socket событий
  useEffect(() => {
    if (!socket) return;
    
    socket.on('typing', (chatId) => { if (activeChat?.id === chatId) setIsPartnerTyping(true); });
    socket.on('stop_typing', (chatId) => { if (activeChat?.id === chatId) setIsPartnerTyping(false); });

    const handleNewMessage = (message: any) => {
      if (activeChat?.id === message.chatId) {
        setMessages((prev) => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
        setTimeout(scrollToBottom, 100);
      }
      fetchChats(localStorage.getItem('token') || '');
    };

    socket.on('new_message', handleNewMessage);
    if (activeChat) {
      socket.emit('join_chat', activeChat.id);
      fetchMessages(activeChat.id);
    }
    return () => { 
        socket.off('new_message', handleNewMessage);
        socket.off('typing');
        socket.off('stop_typing');
    };
  }, [socket, activeChat]);

  // 4. Функции API
  const fetchChats = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setChats(data);
    } catch (e) { console.error("Ошибка чатов:", e); }
  };

  const fetchMessages = async (chatId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setMessages(await res.json());
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) { console.error("Ошибка загрузки сообщений:", e); }
  };

  const startChat = async (targetUser: any) => {
    console.log(">>> НАЖАТИЕ: Создание чата с:", targetUser.username);
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
        setChats((prev) => {
          const exists = prev.find((c) => c.id === chat.id);
          return exists ? prev : [chat, ...prev];
        });
        setActiveChat(chat);
        setSearchQuery('');
        setFoundUsers([]);
        setSelectedUser(null);
      } else {
        const errText = await res.text();
        alert(`Ошибка сервера: ${res.status}`);
      }
    } catch (e) {
      alert("Ошибка сети. Проверьте соединение.");
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
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden relative">
      
      {/* МОДАЛКА ПРОФИЛЯ */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { setSelectedUser(null); setIsEditing(false); }}></div>
          <div className="relative w-full max-w-[380px] bg-[#161426] rounded-[32px] overflow-hidden shadow-2xl border border-white/10">
            <div className="h-28 bg-gradient-to-tr from-purple-600 to-blue-900 relative">
               <button onClick={() => { setSelectedUser(null); setIsEditing(false); }} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 pb-8 text-center -mt-12 relative">
              <div className="inline-block p-1.5 bg-[#161426] rounded-[30px] mb-4 relative group">
                <div className="w-24 h-24 rounded-[24px] bg-purple-900/50 border-2 border-white/5 overflow-hidden flex items-center justify-center">
                  {getAvatarUrl(selectedUser.avatar) ? <img src={getAvatarUrl(selectedUser.avatar)!} className="w-full h-full object-cover" /> : <User size={40} className="text-purple-400" />}
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
                     <button onClick={() => startChat(selectedUser)} className="w-full mb-4 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-bold transition-all shadow-lg active:scale-95">Написать сообщение</button>
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

      {/* SIDEBAR */}
      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Lumina</h1>
          <div className="flex items-center gap-3">
             <div onClick={() => setSelectedUser(user)} className="w-9 h-9 rounded-xl bg-purple-500/20 border border-white/10 overflow-hidden cursor-pointer flex items-center justify-center hover:scale-105 transition-transform">
                {getAvatarUrl(user?.avatar) ? <img src={getAvatarUrl(user.avatar)!} className="w-full h-full object-cover" /> : <User size={18}/>}
             </div>
             <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-gray-500 hover:text-white transition-colors"><LogOut size={20}/></button>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors" size={16} />
            <input type="text" placeholder="Поиск людей..." className="w-full bg-[#1f1d33] rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-1 focus:ring-purple-500/50 transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {foundUsers.length > 0 && (
            <div className="mb-4 relative z-10">
              <p className="text-[10px] text-gray-500 uppercase font-bold px-4 mb-2 tracking-widest">Глобальный поиск</p>
              {foundUsers.map(u => (
                <div key={u.id} 
                     onClick={(e) => { e.stopPropagation(); startChat(u); }} 
                     className="flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer hover:bg-purple-600/20 transition-all border border-transparent hover:border-white/10 bg-purple-600/5 mb-1 active:scale-95">
                  <div className="w-12 h-12 rounded-2xl bg-purple-900/30 overflow-hidden border border-white/5 flex items-center justify-center text-purple-400 font-bold pointer-events-none">
                    {getAvatarUrl(u.avatar) ? <img src={getAvatarUrl(u.avatar)!} className="w-full h-full object-cover" /> : u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 pointer-events-none">
                    <span className="font-bold text-sm block">{u.username}</span>
                    <span className="text-[10px] text-purple-400 font-medium">Нажми, чтобы начать чат</span>
                  </div>
                </div>
              ))}
              <div className="border-b border-white/5 mx-4 my-2"></div>
            </div>
          )}

          <p className="text-[10px] text-gray-500 uppercase font-bold px-4 mb-2 tracking-widest">Мои чаты</p>
          {filteredChats.length > 0 ? filteredChats.map(chat => {
            const partner = getPartner(chat);
            const isActive = activeChat?.id === chat.id;
            return (
              <div key={chat.id} 
                   onClick={() => setActiveChat(chat)}
                   className={`flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer transition-all ${isActive ? 'bg-purple-600/10 border border-white/5 shadow-lg' : 'hover:bg-white/5'}`}>
                <div onClick={(e) => { e.stopPropagation(); setSelectedUser(partner); }} className="w-12 h-12 rounded-2xl bg-purple-900/50 overflow-hidden border border-white/10 flex items-center justify-center">
                   {getAvatarUrl(partner?.avatar) ? <img src={getAvatarUrl(partner.avatar)!} className="w-full h-full object-cover" /> : <User size={20} className="text-purple-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-sm truncate">{partner?.username || 'Чат'}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate opacity-70">{chat.latestMessage?.content || "Нет сообщений"}</p>
                </div>
              </div>
            );
          }) : <p className="text-center text-gray-500 text-[11px] mt-10">Пока нет чатов</p>}
        </div>
      </div>

      {/* ОКНО ЧАТА */}
      <div className={`flex-1 flex flex-col bg-[#0f0c1d] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#0f0c1d]/50 backdrop-blur-xl z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-purple-400 text-2xl mr-2">←</button>
                <div onClick={() => setSelectedUser(getPartner(activeChat))} className="w-10 h-10 rounded-xl bg-purple-500/20 border border-white/10 overflow-hidden cursor-pointer flex items-center justify-center hover:scale-105 transition-transform">
                    {getAvatarUrl(getPartner(activeChat)?.avatar) ? <img src={getAvatarUrl(getPartner(activeChat).avatar)!} className="w-full h-full object-cover" /> : <User size={18}/>}
                </div>
                <div>
                  <h2 className="font-bold text-base">{getPartner(activeChat)?.username}</h2>
                  <span className={`text-[11px] font-bold ${isPartnerTyping ? 'text-pink-400 animate-pulse' : 'text-green-500'}`}>{isPartnerTyping ? 'печатает...' : 'в сети'}</span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-xl"><MoreVertical size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-[20px] shadow-lg ${msg.senderId === user?.id ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-[#1f1d33] border border-white/5 text-gray-100 rounded-tl-none'}`}>
                    <p className="text-[14px] leading-relaxed">{msg.content}</p>
                    <span className="text-[9px] opacity-40 mt-1 block text-right">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6">
              <form onSubmit={sendTextMessage} className="max-w-4xl mx-auto flex items-center gap-3">
                <div className="flex-1 flex items-center bg-[#1f1d33] border border-white/10 rounded-2xl px-3 shadow-2xl focus-within:border-purple-500/40 transition-all">
                  <button type="button" className="text-gray-400 p-2 hover:text-purple-400"><Smile size={20}/></button>
                  <input type="text" value={newMessage} onChange={e => { setNewMessage(e.target.value); if (socket) socket.emit('typing', activeChat.id); }} placeholder="Ваше сообщение..." className="flex-1 bg-transparent border-none py-4 text-sm outline-none" />
                </div>
                <button type="submit" className="w-12 h-12 flex items-center justify-center bg-purple-600 rounded-xl hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/40"><Send size={18} className="text-white" /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
             <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse"><div className="text-4xl">🌌</div></div>
             <h2 className="text-xl font-bold text-white/80">Lumina Messenger</h2>
             <p className="text-gray-500 text-sm max-w-xs mt-2">Выберите чат или воспользуйтесь поиском, чтобы найти новых людей</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;