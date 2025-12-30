import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, Paperclip, Smile, MoreVertical, X, UserPlus, MessageCircle } from 'lucide-react';
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
  
  // Состояние для модалки профиля
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

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

    newSocket.on('connect', () => newSocket.emit('setup', parsedUser.id));
    
    newSocket.on('typing', (chatId) => { if (activeChat?.id === chatId) setIsPartnerTyping(true); });
    newSocket.on('stop_typing', (chatId) => { if (activeChat?.id === chatId) setIsPartnerTyping(false); });

    setSocket(newSocket);
    fetchChats(token);
    return () => { newSocket.disconnect(); };
  }, [navigate, activeChat?.id]);

  useEffect(() => {
    if (!socket) return;
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
    return () => { socket.off('new_message', handleNewMessage); };
  }, [socket, activeChat]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!socket || !activeChat) return;
    socket.emit('typing', activeChat.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('stop_typing', activeChat.id), 2000);
  };

  const fetchChats = async (token: string) => {
    const res = await fetch(`${API_BASE_URL}/api/chats`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) setChats(data);
  };

  const fetchMessages = async (chatId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
    setMessages(await res.json());
    setTimeout(scrollToBottom, 100);
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

  return (
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden relative">
      
      {/* --- МОДАЛЬНОЕ ОКНО ПРОФИЛЯ --- */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}></div>
          <div className="relative w-full max-w-[400px] bg-[#161426] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
            {/* Обложка (Cover) */}
            <div className="h-32 bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 relative">
               <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white">
                  <X size={20} />
               </button>
            </div>
            
            {/* Контент профиля */}
            <div className="px-6 pb-8 text-center -mt-12 relative">
              <div className="inline-block p-1 bg-[#161426] rounded-full mb-4">
                <div className="w-24 h-24 rounded-full bg-purple-500/20 border-4 border-[#161426] overflow-hidden">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar.startsWith('http') ? selectedUser.avatar : `${API_BASE_URL}${selectedUser.avatar}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-purple-600">
                      {selectedUser.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-1">{selectedUser.username}</h3>
              <p className="text-purple-400 text-sm mb-4">@{selectedUser.username.toLowerCase()}</p>
              
              <div className="flex gap-3 mb-6">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-semibold transition-all">
                  <UserPlus size={18} /> Добавить
                </button>
                <button onClick={() => setSelectedUser(null)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold transition-all">
                  <MessageCircle size={18} /> Сообщение
                </button>
              </div>
              
              <div className="text-left space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">О себе</p>
                  <p className="text-sm text-gray-300">Нет информации о себе</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Участник с</p>
                  <p className="text-sm text-gray-300">15 декабря 2025 г.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">Lumina</h1>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <LogOut size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Поиск..." 
              className="w-full bg-[#1f1d33] border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar">
          {chats.map(chat => {
            const partner = getPartner(chat);
            const isActive = activeChat?.id === chat.id;
            return (
              <div 
                key={chat.id} 
                className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all ${isActive ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/10 border border-white/10 shadow-lg' : 'hover:bg-white/5'}`}
              >
                <div className="relative group/avatar" onClick={() => setSelectedUser(partner)}>
                  <div className="w-14 h-14 rounded-2xl bg-purple-900/50 overflow-hidden border border-white/10 transition-transform group-hover/avatar:scale-105">
                    {partner?.avatar && <img src={partner.avatar.startsWith('http') ? partner.avatar : `${API_BASE_URL}${partner.avatar}`} className="w-full h-full object-cover" />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-[#161426] rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0" onClick={() => setActiveChat(chat)}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold truncate">{partner?.username || 'Чат'}</span>
                    <span className="text-[10px] text-gray-500">12:34</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{chat.latestMessage?.content || "Нет сообщений"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#0f0c1d] relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#0f0c1d]/50 backdrop-blur-xl z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-purple-400 mr-2 text-2xl">←</button>
                <div 
                  className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-white/10 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedUser(getPartner(activeChat))}
                >
                   {getPartner(activeChat)?.avatar && <img src={getPartner(activeChat).avatar.startsWith('http') ? getPartner(activeChat).avatar : `${API_BASE_URL}${getPartner(activeChat).avatar}`} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight cursor-pointer" onClick={() => setSelectedUser(getPartner(activeChat))}>
                    {getPartner(activeChat)?.username}
                  </h2>
                  <span className={`text-xs font-medium ${isPartnerTyping ? 'text-pink-400 animate-pulse' : 'text-green-500'}`}>
                    {isPartnerTyping ? 'печатает...' : 'онлайн'}
                  </span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white"><MoreVertical size={20}/></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              {messages.map((msg) => {
                const isOwn = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`group relative max-w-[70%] px-5 py-3 rounded-[24px] shadow-2xl transition-transform hover:scale-[1.02] ${
                      isOwn 
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-tr-none shadow-purple-500/10' 
                      : 'bg-[#1f1d33] border border-white/5 text-gray-100 rounded-tl-none'
                    }`}>
                      <p className="text-[15px] leading-relaxed">{msg.content}</p>
                      <span className="text-[10px] opacity-40 mt-1 block text-right">
                         {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-transparent">
              <form onSubmit={sendTextMessage} className="max-w-4xl mx-auto relative flex items-center gap-3">
                <div className="flex-1 relative flex items-center bg-[#1f1d33] border border-white/10 rounded-3xl px-4 shadow-2xl focus-within:border-purple-500/50 transition-all">
                  <button type="button" className="text-gray-400 hover:text-purple-400 p-2"><Smile size={22}/></button>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Сообщение..." 
                    className="flex-1 bg-transparent border-none py-4 text-sm outline-none placeholder:text-gray-500"
                  />
                  <button type="button" className="text-gray-400 hover:text-purple-400 p-2"><Paperclip size={20}/></button>
                </div>
                <button type="submit" className="w-14 h-14 flex items-center justify-center bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all">
                  <Send size={22} className="text-white" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
             <div className="w-32 h-32 bg-purple-500/10 rounded-[40px] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                <div className="text-5xl">🌌</div>
             </div>
             <p className="text-gray-500 font-medium tracking-widest uppercase text-xs">Выберите чат для начала</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;