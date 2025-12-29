import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, Sticker, Image as ImageIcon, Paperclip, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from '../components/VoiceRecorder';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    });

    newSocket.on('connect', () => {
      newSocket.emit('setup', parsedUser.id);
    });

    setSocket(newSocket);
    fetchChats(token);

    return () => { newSocket.disconnect(); };
  }, [navigate]);

  useEffect(() => {
    if (socket && activeChat) {
      socket.emit('join_chat', activeChat.id);
      fetchMessages(activeChat.id);

      socket.on('new_message', (message: any) => {
        if (message.chatId === activeChat.id) {
          setMessages((prev) => [...prev, message]);
          setTimeout(scrollToBottom, 100);
        }
        fetchChats(localStorage.getItem('token') || '');
      });

      return () => { socket.off('new_message'); };
    }
  }, [socket, activeChat]);

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

    const content = newMessage;
    setNewMessage('');

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content, type: 'TEXT' }),
      });
    } catch (e) { console.error(e); }
  };

  // ИСПРАВЛЕННЫЙ ПОИСК (search вместо query)
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) return setSearchResults([]);
    try {
      const token = localStorage.getItem('token');
      // ВАЖНО: используем ?search= как ожидает бэкенд
      const res = await fetch(`${API_BASE_URL}/api/users/search?search=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
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
      setSearchQuery('');
      setSearchResults([]);
      fetchChats(token);
    } catch (e) { console.error(e); }
  };

  const onStickerClick = async (url: string) => {
    if (!activeChat) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content: 'Sticker', type: 'STICKER', fileUrl: url }),
      });
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

      {/* Sidebar - Увеличил шрифты */}
      <div className={`w-full md:w-80 glass-panel border-r border-white/10 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowProfileSettings(true)}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-flick-blue to-flick-orange p-[2px]">
              <div className="w-full h-full rounded-full bg-flick-dark overflow-hidden">
                {user?.avatar && <img src={formatAvatar(user.avatar)!} className="w-full h-full object-cover" alt="me" />}
              </div>
            </div>
            <span className="text-sm tracking-tighter">{user?.username}</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-white/40 hover:text-flick-orange transition-colors"><LogOut size={20}/></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder={t('search') || "Search users..."} 
              className="pixel-input w-full text-sm pl-10 py-3" 
              value={searchQuery} 
              onChange={(e) => handleSearch(e.target.value)} 
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto bg-black/40 p-2 rounded-lg border border-white/10">
              {searchResults.map(u => (
                <div key={u.id} onClick={() => startChat(u.id)} className="p-3 hover:bg-flick-blue/20 cursor-pointer text-xs border border-white/5 bg-white/5 rounded-md transition-colors flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden">
                      {u.avatar && <img src={formatAvatar(u.avatar)!} className="w-full h-full object-cover" />}
                   </div>
                   {u.username}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {chats.map(chat => {
            const partner = getPartner(chat);
            return (
              <div key={chat.id} onClick={() => setActiveChat(chat)} className={`p-4 border-b border-white/5 cursor-pointer transition-all ${activeChat?.id === chat.id ? 'bg-flick-blue/20 border-l-4 border-l-flick-blue' : 'hover:bg-white/5'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-flick-blue/20 overflow-hidden border border-white/10 shadow-inner">
                    {partner?.avatar && <img src={formatAvatar(partner.avatar)!} className="w-full h-full object-cover" alt="avatar" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate mb-1">{partner?.username || chat.name}</div>
                    <div className="text-[10px] text-white/40 truncate italic">{chat.latestMessage?.content || "No messages yet"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area - Шрифты сообщений 14px */}
      <div className={`flex-1 flex flex-col relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="h-20 glass-panel border-b border-white/10 flex items-center px-6 justify-between bg-black/20">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden text-flick-blue text-xl mr-2">←</button>
                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-flick-blue/30 shadow-lg shadow-flick-blue/10">
                    {getPartner(activeChat)?.avatar && <img src={formatAvatar(getPartner(activeChat).avatar)!} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <div className="text-sm font-pixel tracking-widest">{getPartner(activeChat)?.username || activeChat.name}</div>
                  <div className="text-[10px] text-flick-blue/60 uppercase">online</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-2xl max-w-[75%] text-sm shadow-2xl relative transition-transform hover:scale-[1.02] ${msg.senderId === user?.id ? 'bg-flick-blue text-white rounded-tr-none' : 'bg-white/10 text-white border border-white/10 rounded-tl-none backdrop-blur-md'}`}>
                    {msg.type === 'STICKER' && <img src={msg.fileUrl} className="w-32 h-32 object-contain" />}
                    {msg.type === 'IMAGE' && <img src={msg.fileUrl} className="max-w-full rounded-lg mb-2 border border-white/10" />}
                    {msg.type === 'VOICE' && <AudioPlayer url={msg.fileUrl} isOwn={msg.senderId === user?.id} />}
                    {msg.type === 'TEXT' && <div className="leading-relaxed">{msg.content}</div>}
                    <div className="text-[9px] opacity-40 mt-2 text-right font-sans">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-5 bg-flick-dark/80 backdrop-blur-xl border-t border-white/10">
              <form onSubmit={sendTextMessage} className="flex items-center gap-3">
                <button type="button" onClick={() => setShowStickerPicker(!showStickerPicker)} className="text-white/40 hover:text-flick-orange transition-colors"><Sticker size={22}/></button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-white/40 hover:text-flick-blue transition-colors"><Paperclip size={22}/></button>
                <input type="file" ref={fileInputRef} className="hidden" />
                
                <input 
                  type="text" 
                  className="flex-1 pixel-input text-sm h-12 px-5 bg-white/5 border-white/10 focus:border-flick-blue/50" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  placeholder="Type a message..."
                />

                <button type="submit" className="h-12 w-12 flex items-center justify-center bg-flick-blue hover:bg-flick-blue/80 rounded-xl shadow-lg shadow-flick-blue/20 transition-all active:scale-90">
                  <Send size={20}/>
                </button>
              </form>
              {showStickerPicker && (
                <div className="absolute bottom-24 left-6 z-[60] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <StickerPicker onStickerClick={(url) => { onStickerClick(url); setShowStickerPicker(false); }} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-black/10">
            <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
               <div className="text-6xl">💬</div>
            </div>
            <div className="text-sm font-pixel text-white/20 uppercase tracking-[0.2em]">Select a chat to start</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;