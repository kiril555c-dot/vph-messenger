import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, Paperclip, Smile, MoreVertical, X, UserPlus, MessageCircle, Camera, Check, Edit3 } from 'lucide-react';
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
  
  // Состояния для профиля и редактирования
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [bio, setBio] = useState('Сплю или работаю 🚀'); // Дефолтное био

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) { navigate('/login'); return; }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setEditedName(parsedUser.username);

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

  const handleSaveProfile = () => {
    // Здесь будет запрос к API для сохранения
    setUser({ ...user, username: editedName });
    setIsEditing(false);
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const getPartner = (chat: any) => chat.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user;

  return (
    <div className="flex h-screen bg-[#0f0c1d] text-gray-100 font-sans overflow-hidden relative">
      
      {/* --- МОДАЛЬНОЕ ОКНО ПРОФИЛЯ --- */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setSelectedUser(null); setIsEditing(false); }}></div>
          <div className="relative w-full max-w-[380px] bg-[#161426] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 animate-in zoom-in-95 duration-200">
            
            {/* Обложка */}
            <div className="h-28 bg-gradient-to-tr from-purple-900 via-violet-950 to-indigo-900 relative">
               <button onClick={() => { setSelectedUser(null); setIsEditing(false); }} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white z-10">
                  <X size={18} />
               </button>
            </div>
            
            <div className="px-6 pb-8 text-center -mt-12 relative">
              {/* Аватарка */}
              <div className="inline-block p-1.5 bg-[#161426] rounded-[30px] mb-4 relative group">
                <div className="w-24 h-24 rounded-[24px] bg-purple-500/20 border-2 border-white/5 overflow-hidden">
                  <img 
                    src={selectedUser.avatar?.startsWith('http') ? selectedUser.avatar : `${API_BASE_URL}${selectedUser.avatar}`} 
                    className="w-full h-full object-cover" 
                    alt="avatar"
                  />
                </div>
                {selectedUser.id === user?.id && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-1.5 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-[24px] transition-all duration-200 cursor-pointer"
                  >
                    <Camera size={24} className="text-white" />
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
                  </button>
                )}
              </div>
              
              {/* Инфо (Просмотр / Редактирование) */}
              {isEditing ? (
                <div className="space-y-3 animate-in slide-in-from-bottom-2">
                  <input 
                    className="w-full bg-[#1f1d33] border border-purple-500/30 rounded-2xl py-2 px-4 text-center outline-none focus:ring-2 focus:ring-purple-500/40 text-white font-bold"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Ваше имя"
                  />
                  <textarea 
                    className="w-full bg-[#1f1d33] border border-purple-500/30 rounded-2xl py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500/40 text-gray-300 h-20 resize-none"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="О себе..."
                  />
                  <button 
                    onClick={handleSaveProfile}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                  >
                    <Check size={18} /> Сохранить
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-white mb-0.5">{selectedUser.id === user?.id ? user.username : selectedUser.username}</h3>
                  <p className="text-purple-400 text-xs font-medium mb-6 uppercase tracking-wider">@{selectedUser.username.toLowerCase()}</p>
                  
                  <div className="flex gap-2 mb-6">
                    {selectedUser.id === user?.id ? (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all"
                      >
                        <Edit3 size={18} /> Редактировать
                      </button>
                    ) : (
                      <>
                        <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-semibold transition-all shadow-lg shadow-purple-900/20">
                          <UserPlus size={18} /> В друзья
                        </button>
                        <button onClick={() => setSelectedUser(null)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold transition-all">
                          <MessageCircle size={18} /> Чат
                        </button>
                      </>
                    )}
                  </div>
                  
                  <div className="text-left space-y-4 border-t border-white/5 pt-4">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-[1.5px] font-bold mb-1">О себе</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{selectedUser.id === user?.id ? bio : "Пользователь Lumina 🌌"}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`w-full md:w-[380px] bg-[#161426] border-r border-white/5 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent tracking-tight">Lumina</h1>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg bg-purple-500/20 border border-white/10 cursor-pointer overflow-hidden"
              onClick={() => setSelectedUser(user)}
            >
               {user?.avatar && <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar}`} className="w-full h-full object-cover" />}
            </div>
            <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Поиск чатов..." 
              className="w-full bg-[#1f1d33] border-none rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all shadow-inner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {chats.map(chat => {
            const partner = getPartner(chat);
            const isActive = activeChat?.id === chat.id;
            return (
              <div 
                key={chat.id} 
                className={`flex items-center gap-4 p-3.5 rounded-[24px] cursor-pointer transition-all ${isActive ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/10 border border-white/5 shadow-lg' : 'hover:bg-white/5'}`}
              >
                <div className="relative" onClick={(e) => { e.stopPropagation(); setSelectedUser(partner); }}>
                  <div className="w-12 h-12 rounded-2xl bg-purple-900/50 overflow-hidden border border-white/10">
                    {partner?.avatar && <img src={partner.avatar.startsWith('http') ? partner.avatar : `${API_BASE_URL}${partner.avatar}`} className="w-full h-full object-cover" />}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#161426] rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0" onClick={() => setActiveChat(chat)}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-sm truncate">{partner?.username || 'Чат'}</span>
                    <span className="text-[10px] text-gray-500">21:40</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate opacity-70">{chat.latestMessage?.content || "Нет сообщений"}</p>
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
            <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#0f0c1d]/50 backdrop-blur-xl z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-purple-400 mr-2 text-2xl">←</button>
                <div 
                  className="w-10 h-10 rounded-xl bg-purple-500/20 border border-white/10 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedUser(getPartner(activeChat))}
                >
                   {getPartner(activeChat)?.avatar && <img src={getPartner(activeChat).avatar.startsWith('http') ? getPartner(activeChat).avatar : `${API_BASE_URL}${getPartner(activeChat).avatar}`} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight cursor-pointer" onClick={() => setSelectedUser(getPartner(activeChat))}>
                    {getPartner(activeChat)?.username}
                  </h2>
                  <span className={`text-[11px] font-bold ${isPartnerTyping ? 'text-pink-400 animate-pulse' : 'text-green-500'}`}>
                    {isPartnerTyping ? 'печатает...' : 'в сети'}
                  </span>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white p-2 bg-white/5 rounded-xl"><MoreVertical size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((msg) => {
                const isOwn = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`group relative max-w-[75%] px-4 py-2.5 rounded-[20px] shadow-xl transition-all ${
                      isOwn 
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-tr-none' 
                      : 'bg-[#1f1d33] border border-white/5 text-gray-100 rounded-tl-none'
                    }`}>
                      <p className="text-[14px] leading-relaxed">{msg.content}</p>
                      <span className="text-[9px] opacity-40 mt-1 block text-right">
                         {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6">
              <form onSubmit={sendTextMessage} className="max-w-4xl mx-auto relative flex items-center gap-3">
                <div className="flex-1 relative flex items-center bg-[#1f1d33] border border-white/10 rounded-2xl px-3 shadow-2xl focus-within:border-purple-500/40 transition-all">
                  <button type="button" className="text-gray-400 hover:text-purple-400 p-2"><Smile size={20}/></button>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Ваше сообщение..." 
                    className="flex-1 bg-transparent border-none py-3.5 text-sm outline-none placeholder:text-gray-500"
                  />
                  <button type="button" className="text-gray-400 hover:text-purple-400 p-2"><Paperclip size={18}/></button>
                </div>
                <button type="submit" className="w-12 h-12 flex items-center justify-center bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all">
                  <Send size={18} className="text-white" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 bg-gradient-to-b from-purple-500/20 to-transparent rounded-full flex items-center justify-center mb-6 border border-white/5">
                <div className="text-4xl animate-bounce">🌌</div>
             </div>
             <h2 className="text-xl font-bold text-white/80 mb-1">Добро пожаловать в Lumina</h2>
             <p className="text-gray-500 text-sm max-w-xs">Выберите собеседника из списка слева, чтобы начать общение</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;