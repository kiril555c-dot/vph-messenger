import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, Sticker, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StickerPicker from '../components/StickerPicker';
import AudioPlayer from '../components/AudioPlayer';
import ProfileSettings from '../components/ProfileSettings';
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!token || !storedUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('setup', parsedUser.id);
    });

    // Слушаем когда кто-то печатает
    newSocket.on('typing', (chatId) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(true);
    });

    newSocket.on('stop_typing', (chatId) => {
      if (activeChat?.id === chatId) setIsPartnerTyping(false);
    });

    setSocket(newSocket);
    fetchChats(token);

    return () => { newSocket.disconnect(); };
  }, [navigate, activeChat?.id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: any) => {
      if (activeChat && message.chatId === activeChat.id) {
        setMessages((prev) => {
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
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
    };
  }, [socket, activeChat]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socket || !activeChat) return;

    socket.emit('typing', activeChat.id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', activeChat.id);
    }, 2000);
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/search?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Search error:", e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchChats = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) setChats(data);
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    } catch (e) { console.error(e); }
  };

  const sendTextMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    socket?.emit('stop_typing', activeChat.id);
    const content = newMessage;
    setNewMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content, type: 'TEXT' }),
      });

      if (response.ok) {
        const savedMessage = await response.json();
        setMessages((prev) => [...prev, savedMessage]);
        socket?.emit('new_message', savedMessage);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) { console.error(e); }
  };

  const startChat = async (partnerId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ partnerId, isGroup: false }),
      });
      const chat = await res.json();
      setActiveChat(chat);
      if (socket) socket.emit('join_chat', chat.id);
      setSearchQuery('');
      setSearchResults([]);
      fetchChats(token);
    } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const getPartner = (chat: any) => chat.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user;
  const formatAvatar = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  };

  return (
    <div className="flex h-screen bg-flick-dark overflow-hidden font-pixel text-white">
      {showProfileSettings && <ProfileSettings user={user} onClose={() => setShowProfileSettings(false)} onUpdate={(u) => setUser(u)} />}

      <div className={`w-full md:w-80 glass-panel border-r border-white/10 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowProfileSettings(true)}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-flick-blue to-flick-orange p-[2px] shadow-lg shadow-flick-blue/20">
              <div className="w-full h-full rounded-full bg-flick-dark overflow-hidden">
                {user?.avatar && <img src={formatAvatar(user.avatar)!} className="w-full h-full object-cover" alt="me" />}
              </div>
            </div>
            <span className="text-sm font-bold tracking-tight">{user?.username}</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-white/40 hover:text-flick-orange transition-colors">
            <LogOut size={20}/>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isSearching ? 'text-flick-blue animate-pulse' : 'text-white/30'}`} size={16} />
            <input 
              type="text" 
              placeholder={t('search') || "Search users..."} 
              className="pixel-input w-full text-sm pl-10 py-3 bg-white/5" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto bg-black/60 p-2 rounded-xl border border-white/10 backdrop-blur-md">
              {searchResults.map(u => (
                <div key={u.id} onClick={() => startChat(u.id)} className="p-3 hover:bg-flick-blue/30 cursor-pointer text-xs border border-white/5 bg-white/5 rounded-lg transition-all flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10">
                      {u.avatar && <img src={formatAvatar(u.avatar)!} className="w-full h-full object-cover" />}
                   </div>
                   <span className="font-bold">{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {chats.map(chat => {
            const partner = getPartner(chat);
            return (
              <div key={chat.id} onClick={() => setActiveChat(chat)} className={`p-4 border-b border-white/5 cursor-pointer transition-all ${activeChat?.id === chat.id ? 'bg-flick-blue/20 border-l-4 border-l-flick-blue shadow-inner' : 'hover:bg-white/5'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-flick-blue/10 overflow-hidden border border-white/10 shadow-md">
                    {partner?.avatar && <img src={formatAvatar(partner.avatar)!} className="w-full h-full object-cover" alt="avatar" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate mb-1 text-white/90">{partner?.username || chat.name}</div>
                    <div className="text-[11px] text-white/40 truncate italic">{chat.latestMessage?.content || "No messages yet"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="h-20 glass-panel border-b border-white/10 flex items-center px-6 justify-between bg-black/30 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-flick-blue text-xl mr-2">←</button>
                <div className="w-11 h-11 rounded-full bg-white/10 overflow-hidden border-2 border-flick-blue/40 shadow-lg shadow-flick-blue/10">
                    {getPartner(activeChat)?.avatar && <img src={formatAvatar(getPartner(activeChat).avatar)!} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <div className="text-[15px] font-pixel tracking-widest text-white">{getPartner(activeChat)?.username || activeChat.name}</div>
                  <div className="flex items-center gap-1.5">
                    {isPartnerTyping ? (
                      <span className="text-[10px] text-flick-orange animate-pulse font-bold uppercase">typing...</span>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] text-flick-blue/80 uppercase font-bold">online</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-flick-dark/30">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[75%] shadow-xl relative transition-all hover:scale-[1.01] ${
                    msg.senderId === user?.id 
                      ? 'bg-gradient-to-br from-flick-blue to-[#1e40af] text-white rounded-tr-none' 
                      : 'bg-white/10 text-white border border-white/20 rounded-tl-none backdrop-blur-lg'
                  }`}>
                    {msg.type === 'TEXT' && <div className="text-[15px] leading-relaxed font-sans font-medium">{msg.content}</div>}
                    <div className="text-[9px] opacity-40 mt-2 text-right font-mono tracking-tighter">
                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-5 bg-black/40 backdrop-blur-2xl border-t border-white/10">
              <form onSubmit={sendTextMessage} className="flex items-center gap-4 max-w-6xl mx-auto">
                <input 
                  type="text" 
                  className="flex-1 pixel-input text-sm h-12 px-6 bg-white/5 border-white/10 focus:border-flick-blue/50 rounded-2xl transition-all" 
                  value={newMessage} 
                  onChange={handleTyping} 
                  placeholder="Type your message here..."
                />
                <button type="submit" className="h-12 w-12 flex items-center justify-center bg-gradient-to-tr from-flick-blue to-blue-400 rounded-2xl">
                  <Send size={22} className="text-white"/>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-flick-dark/50">
            <div className="text-sm font-pixel text-white/30 uppercase tracking-[0.3em]">Select a chat to begin</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;