import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, Search, Sticker, Image as ImageIcon, Paperclip, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from '../components/VoiceRecorder';
import StickerPicker from '../components/StickerPicker';
import AudioPlayer from '../components/AudioPlayer';
import ProfileSettings from '../components/ProfileSettings';
import { useLanguage } from '../context/LanguageContext';

// Константа API — меняем только здесь
const API_BASE_URL = 'https://vph-messenger.onrender.com';

const Chat: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // States
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
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Инициализация и Socket.io
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

  // 2. Слушатель новых сообщений
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

  // 3. API функции
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
    setNewMessage(''); // Очищаем сразу для скорости

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content, type: 'TEXT' }),
      });
    } catch (e) { console.error(e); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const { url } = await uploadRes.json();
      
      const type = file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';
      await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content: file.name, type, fileUrl: url }),
      });
    } catch (e) { console.error(e); }
  };

  const sendVoiceMessage = async (blob: Blob) => {
    if (!activeChat) return;
    const formData = new FormData();
    formData.append('file', blob, 'voice.webm');

    try {
      const token = localStorage.getItem('token');
      const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const { url } = await uploadRes.json();

      await fetch(`${API_BASE_URL}/api/chats/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chatId: activeChat.id, content: 'Voice message', type: 'VOICE', fileUrl: url }),
      });
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) return setSearchResults([]);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/search?query=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSearchResults(data);
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
      fetchChats(token);
    } catch (e) { console.error(e); }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Вспомогательные функции для UI
  const getPartner = (chat: any) => chat.chatMembers?.find((m: any) => m.user.id !== user?.id)?.user;
  const formatAvatar = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  };

  return (
    <div className="flex h-screen bg-flick-dark overflow-hidden font-pixel text-white">
      {showProfileSettings && <ProfileSettings user={user} onClose={() => setShowProfileSettings(false)} onUpdate={(u) => setUser(u)} />}

      {/* Sidebar */}
      <div className={`w-full md:w-80 glass-panel border-r border-white/10 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfileSettings(true)}>
            <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
              {user?.avatar && <img src={formatAvatar(user.avatar)!} className="w-full h-full object-cover" alt="me" />}
            </div>
            <span className="text-[10px]">{user?.username}</span>
          </div>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }} className="text-white/50"><LogOut size={16}/></button>
        </div>

        <div className="p-4 space-y-2">
          <input 
            type="text" 
            placeholder={t('search')} 
            className="pixel-input w-full text-[10px]" 
            value={searchQuery} 
            onChange={(e) => handleSearch(e.target.value)} 
          />
          {searchResults.map(u => (
            <div key={u.id} onClick={() => startChat(u.id)} className="p-2 hover:bg-white/10 cursor-pointer text-[10px] border border-white/5 bg-white/5">{u.username}</div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => {
            const partner = getPartner(chat);
            return (
              <div key={chat.id} onClick={() => setActiveChat(chat)} className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 ${activeChat?.id === chat.id ? 'bg-white/10' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-flick-blue/20 overflow-hidden border border-white/10">
                    {partner?.avatar && <img src={formatAvatar(partner.avatar)!} className="w-full h-full object-cover" alt="avatar" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] truncate">{partner?.username || chat.name}</div>
                    <div className="text-[8px] text-white/50 truncate">{chat.messages?.[0]?.content}</div>
                  </div>
                  {chat.unreadCount > 0 && <div className="w-4 h-4 bg-flick-blue rounded-full text-[8px] flex items-center justify-center">{chat.unreadCount}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="h-16 glass-panel border-b border-white/10 flex items-center px-4 justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChat(null)} className="md:hidden">←</button>
                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                    {getPartner(activeChat)?.avatar && <img src={formatAvatar(getPartner(activeChat).avatar)!} className="w-full h-full object-cover" />}
                </div>
                <span className="text-xs">{getPartner(activeChat)?.username || activeChat.name}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-lg max-w-[70%] text-[11px] shadow-xl ${msg.senderId === user?.id ? 'bg-flick-blue text-white' : 'bg-white/10 text-white border border-white/10'}`}>
                    {msg.type === 'STICKER' && <img src={msg.fileUrl} className="w-24 h-24 object-contain" />}
                    {msg.type === 'IMAGE' && <img src={msg.fileUrl} className="max-w-full rounded mb-1" />}
                    {msg.type === 'VOICE' && <AudioPlayer url={msg.fileUrl} isOwn={msg.senderId === user?.id} />}
                    {msg.type === 'TEXT' && <div>{msg.content}</div>}
                    {msg.type === 'DOCUMENT' && <a href={msg.fileUrl} target="_blank" className="underline flex items-center gap-2"><Paperclip size={12}/> {msg.content}</a>}
                    <div className="text-[8px] opacity-50 mt-1 text-right">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white/5 border-t border-white/10">
              <form onSubmit={sendTextMessage} className="flex items-center gap-2">
                <button type="button" onClick={() => setShowStickerPicker(!showStickerPicker)} className="text-white/40 hover:text-white"><Sticker size={18}/></button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-white/40 hover:text-white"><Paperclip size={18}/></button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                
                <input 
                  type="text" 
                  className="flex-1 pixel-input text-xs h-10" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  placeholder="Напишите что-нибудь..."
                />

                <div className="flex items-center">
                   <VoiceRecorder onRecordingComplete={sendVoiceMessage} />
                </div>
                
                <button type="submit" className="p-2 bg-flick-blue hover:bg-flick-blue/80 rounded-lg shadow-lg"><Send size={18}/></button>
              </form>
              {showStickerPicker && <div className="absolute bottom-20 left-4 z-50"><StickerPicker onStickerClick={(url) => { onStickerClick(url); setShowStickerPicker(false); }} /></div>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <div className="text-[40px] mb-4">💬</div>
            <div className="text-[10px]">Выберите чат для начала общения</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;