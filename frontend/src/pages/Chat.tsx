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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Загрузка профиля и инициализация сокета
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
    } catch (e) {
      navigate('/login');
    }
  }, [navigate]);

  // 2. Логика сокетов (с защитой от дублей)
  useEffect(() => {
    if (!socket || !user) return;

    socket.off('new_message'); // Чистим старые, чтобы не было дублей как на скрине
    socket.off('typing');
    socket.off('stop_typing');

    socket.on('typing', (chatId: string) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(true);
    });
    socket.on('stop_typing', (chatId: string) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(false);
    });

    socket.on('new_message', (message: any) => {
      if (activeChat?.id === message.chatId) {
        setMessages(prev => {
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

    return () => {
      socket.off('new_message');
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, activeChat, user]);

  const fetchChats = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setChats(await res.json());
    } catch (e) { console.error(e); }
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
    } catch (e) { console.error(e); }
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content, type: 'TEXT' })
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => [...prev, saved]);
        socket.emit('new_message', saved);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const getPartner = (chat: any) => chat?.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user;
  const getAvatarUrl = (avatar: string | null) => avatar ? (avatar.startsWith('http') ? avatar : `${API_BASE_URL}${avatar}`) : null;

  if (!user) return <div className="h-screen bg-[#0f0c1d] flex items-center justify-center text-white">🌌 Lumina загружается...</div>;

  return (
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Lumina</h1>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-gray-500 hover:text-white"><LogOut size={20}/></button>
        </div>

        <div className="px-6 pb-4">
          <input 
            type="text" 
            placeholder="Поиск..." 
            className="w-full bg-[#1f1d33] rounded-2xl py-3 px-4 text-sm outline-none" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3">
          {chats.map(chat => {
            const partner = getPartner(chat);
            return (
              <div key={chat.id} onClick={() => setActiveChat(chat)} className={`flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer mb-1 ${activeChat?.id === chat.id ? 'bg-purple-600/20 border border-white/5' : 'hover:bg-white/5'}`}>
                <div className="w-12 h-12 rounded-2xl bg-purple-900/50 flex items-center justify-center border border-white/10">
                  {getAvatarUrl(partner?.avatar) ? <img src={getAvatarUrl(partner.avatar)!} className="w-full h-full object-cover rounded-2xl" /> : <User size={20}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{partner?.username || 'Чат'}</p>
                  <p className="text-xs text-gray-500 truncate">{chat.latestMessage?.content || 'Нет сообщений'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CHAT WINDOW */}
      <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#161426]/50">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-purple-400">←</button>
                <div>
                  <h2 className="font-bold">{getPartner(activeChat)?.username}</h2>
                  <span className="text-[10px] text-green-500 uppercase font-black tracking-widest">в сети</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-[20px] ${msg.senderId === user?.id ? 'bg-purple-600' : 'bg-[#1f1d33]'}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendTextMessage} className="p-6 flex gap-3">
              <input 
                type="text" 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                className="flex-1 bg-[#1f1d33] border border-white/10 rounded-2xl px-4 outline-none" 
                placeholder="Сообщение..." 
              />
              <button className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center"><Send size={18}/></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">Выберите чат, чтобы начать общение</div>
        )}
      </div>
    </div>
  );
};

export default Chat;