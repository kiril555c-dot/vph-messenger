import React, { useState, useEffect, useRef } from 'react';
import { Search, LogOut, User as UserIcon, Send, Phone, Video, MoreVertical, Paperclip, Smile } from 'lucide-react';
import ProfileSettings from '../components/ProfileSettings'; 
import { io } from 'socket.io-client';

// Подключаемся к бэкенду
const socket = io('https://vph-messenger.onrender.com');

const Chat = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Подключение к сокетам
  useEffect(() => {
    if (user?.id) {
      socket.emit('setup', user.id);
      fetchChats();
    }
  }, [user.id]);

  // 2. Слушатель новых сообщений (Синхронизировано с твоим app.ts)
  useEffect(() => {
    const messageHandler = (message: any) => {
      const currentChatId = activeChat?.id;
      // Проверяем, что сообщение для текущего чата
      if (currentChatId && (message.chatId === currentChatId || message.chat?.id === currentChatId)) {
        setMessages(prev => [...prev, message]);
      }
      fetchChats(); // Обновляем список чатов
    };

    // Слушаем оба варианта события для надежности
    socket.on('message received', messageHandler);
    socket.on('new_message', messageHandler);

    return () => {
      socket.off('message received');
      socket.off('new_message');
    };
  }, [activeChat]);

  // Автопрокрутка вниз
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async () => {
    try {
      const res = await fetch('https://vph-messenger.onrender.com/api/chats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setChats(data);
    } catch (err) { console.error("Ошибка чатов:", err); }
  };

  /// 3. Поиск (Синхронизировано с твоим app.use('/api/users-list', userRoutes))
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 1) {
      try {
        const res = await fetch(`https://vph-messenger.onrender.com/api/users-list/search?query=${query}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!res.ok) throw new Error('Search failed');
        
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) { 
        console.error("Ошибка поиска:", err); 
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    try {
      const res = await fetch('https://vph-messenger.onrender.com/api/chats/message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ chatId: activeChat.id, content: newMessage })
      });
      const data = await res.json();
      
      // Отправляем в сокет, чтобы другой юзер сразу увидел
      socket.emit('new_message', data);
      
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (err) { console.error("Ошибка отправки:", err); }
  };

  return (
    <div className="flex h-screen bg-[#0f0f13] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-96 bg-[#18181d] border-r border-white/5 flex flex-col shadow-2xl z-10">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent italic">
            Lumina
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setIsProfileOpen(true)} className="p-1 hover:scale-105 transition-transform">
              <img 
                src={user.avatar?.startsWith('/') ? `https://vph-messenger.onrender.com${user.avatar}` : user.avatar || 'https://ui-avatars.com/api/?name=' + user.username} 
                className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30" 
                alt="Avatar"
              />
            </button>
            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
              className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-red-400 transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 text-gray-500" size={18} />
            <input 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Поиск людей..."
              className="w-full bg-[#23232a] border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          {searchResults.length > 0 && (
            <div className="mb-6">
              <p className="px-3 text-[10px] font-black text-purple-500 uppercase tracking-[2px] mb-3">Найдено</p>
              {searchResults.map((u: any) => (
                <div key={u.id} className="p-3 hover:bg-white/5 rounded-2xl cursor-pointer flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center font-bold text-purple-400">
                    {u.username ? u.username[0].toUpperCase() : '?'}
                  </div>
                  <span className="font-medium">{u.username}</span>
                </div>
              ))}
            </div>
          )}

          <p className="px-3 text-[10px] font-black text-gray-500 uppercase tracking-[2px] mb-3">Сообщения</p>
          {chats.map((chat: any) => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChat(chat)}
              className={`p-4 rounded-2xl mb-2 cursor-pointer transition-all ${activeChat?.id === chat.id ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/5 border-l-4 border-purple-500 shadow-lg' : 'hover:bg-white/5 border-l-4 border-transparent'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-800 border border-white/5 flex items-center justify-center font-bold text-gray-400">
                  {chat.name ? chat.name[0] : 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold truncate">{chat.name || 'Диалог'}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">Открыть переписку</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0f0f13]">
        {activeChat ? (
          <>
            <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#18181d]/50 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-400">
                  {activeChat.name ? activeChat.name[0] : 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{activeChat.name || 'Чат'}</h3>
                  <span className="text-[10px] text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> онлайн
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-gray-400">
                <Phone size={20} className="hover:text-purple-400 cursor-pointer transition-colors" />
                <Video size={20} className="hover:text-purple-400 cursor-pointer transition-colors" />
                <MoreVertical size={20} className="hover:text-purple-400 cursor-pointer transition-colors" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
              {messages.map((m, idx) => (
                <div key={m.id || idx} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-4 rounded-2xl ${m.senderId === user.id ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-[#18181d] text-gray-200 rounded-tl-none border border-white/5'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>

            <div className="p-6">
              <div className="bg-[#18181d] rounded-2xl p-2 flex items-center gap-2 border border-white/5 focus-within:border-purple-500/50 transition-all">
                <button className="p-3 text-gray-500 hover:text-purple-400"><Paperclip size={20} /></button>
                <input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Напишите сообщение..."
                  className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-white"
                />
                <button onClick={sendMessage} className="bg-purple-600 p-3 rounded-xl hover:bg-purple-500 transition-colors shadow-lg">
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
            <Send size={60} className="text-purple-500 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Lumina Messenger</h2>
            <p className="max-w-xs text-sm">Выберите чат для начала общения</p>
          </div>
        )}
      </div>

      {isProfileOpen && (
        <ProfileSettings 
          user={user} 
          onClose={() => setIsProfileOpen(false)} 
          onUpdate={(updated: any) => { 
            setUser(updated); 
            localStorage.setItem('user', JSON.stringify(updated)); 
          }}
        />
      )}
    </div>
  );
};

export default Chat;