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
  
  const [foundUsers, setFoundUsers] = useState<any[]>([]); 

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Инициализация пользователя и сокета
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
        console.error("Ошибка поиска:", e);
      }
    };

    const delayDebounce = setTimeout(searchGlobal, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, user]);

  // 3. МГНОВЕННЫЕ СООБЩЕНИЯ (Исправлено)
  useEffect(() => {
    if (!socket) return;

    // Слушаем входящие сообщения
    socket.off('new_message'); 
    socket.on('new_message', (message: any) => {
      console.log("Получено сообщение через сокет:", message);
      
      // Если это сообщение для текущего открытого чата — добавляем в список
      if (activeChat && activeChat.id === message.chatId) {
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 100);
      }
      
      // Обновляем список чатов слева (чтобы видеть последнее сообщение)
      fetchChats(localStorage.getItem('token') || '');
    });

    // При выборе чата — входим в его комнату
    if (activeChat) {
      socket.emit('join_chat', activeChat.id);
      fetchMessages(activeChat.id);
    }

    return () => {
      socket.off('new_message');
    };
  }, [socket, activeChat]); // Переподключаемся при смене чата

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
        // Добавляем себе в список сразу
        setMessages(p => [...p, saved]);
        // Отправляем через сокет другим
        socket.emit('new_message', saved);
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

  if (!user) return <div className="h-screen bg-[#0f0c1d] flex items-center justify-center text-white font-bold">Lumina Messenger...</div>;

  return (
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent italic">Lumina</h1>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-gray-500 hover:text-white transition-colors"><LogOut size={20}/></button>
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
                <div key={u.id} onClick={() => startChat(u)} className="flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer bg-purple-600/10 border border-purple-500/20 mb-2 hover:bg-purple-600/20 transition-all">
                  <div className="w-11 h-11 rounded-2xl bg-purple-900/40 flex items-center justify-center border border-white/10">
                    {getAvatarUrl(u.avatar) ? <img src={getAvatarUrl(u.avatar)!} className="w-full h-full object-cover rounded-2xl" /> : <User size={18}/>}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-bold text-sm truncate">{u.username}</p>
                    <p className="text-[10px] text-gray-500">Начать беседу</p>
                  </div>
                </div>
              ))}
              <div className="border-b border-white/5 mx-4 my-4 opacity-10"></div>
            </div>
          )}

          {/* МОИ ЧАТЫ */}
          <p className="text-[10px] text-gray-500 uppercase font-black px-4 mb-2 tracking-widest">Сообщения</p>
          {filteredChats.map(chat => {
            const partner = getPartner(chat);
            const isActive = activeChat?.id === chat.id;
            return (
              <div key={chat.id} onClick={() => setActiveChat(chat)} className={`flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer mb-1 transition-all ${isActive ? 'bg-purple-600/20 border border-white/5 shadow-lg' : 'hover:bg-white/5'}`}>
                <div className="w-12 h-12 rounded-2xl bg-purple-900/50 flex items-center justify-center border border-white/10">
                  {getAvatarUrl(partner?.avatar) ? <img src={getAvatarUrl(partner.avatar)!} className="w-full h-full object-cover rounded-2xl" /> : <User size={20} className="text-purple-400"/>}
                </div>
                <div className="flex-1 min-w-0 text-left">
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
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-white/10">
                   {getAvatarUrl(getPartner(activeChat)?.avatar) ? <img src={getAvatarUrl(getPartner(activeChat).avatar)!} className="w-full h-full object-cover rounded-xl" /> : <User size={18}/>}
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white">{getPartner(activeChat)?.username}</h2>
                  <span className="text-[10px] text-green-500 font-black tracking-widest uppercase animate-pulse">в сети</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
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