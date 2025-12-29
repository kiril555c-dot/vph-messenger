import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, LogOut, User, Search, Plus, Settings, Smile, Sticker, Phone, Video, Check, CheckCheck, Image as ImageIcon, Paperclip } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from '../components/VoiceRecorder';
import CustomEmojiPicker from '../components/EmojiPicker';
import StickerPicker from '../components/StickerPicker';
import AudioPlayer from '../components/AudioPlayer';
import CallModal from '../components/CallModal';
import ProfileSettings from '../components/ProfileSettings';
import UserProfileModal from '../components/UserProfileModal';
import Peer from 'simple-peer';
import type { EmojiClickData } from 'emoji-picker-react';
import { useLanguage } from '../context/LanguageContext';

interface Message {
  id: string;
  content: string;
  type: string;
  fileUrl?: string;
  senderId: string;
  chatId: string;
  createdAt: string;
  sender: { username: string; avatar: string | null };
  statuses: { userId: string; status: string }[];
}

interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  chatMembers: { user: { id: string; username: string; avatar: string | null; isOnline: boolean; lastSeen: string | null } }[];
  messages: Message[];
  unreadCount: number;
}

const Chat: React.FC = () => {
  const { t } = useLanguage();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Call State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState<any>();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState('');
  const [showCallModal, setShowCallModal] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

      const newSocket = io('https://vph-messenger.onrender.com', {
        transports: ['websocket'],
        reconnection: true,
      });
      setSocket(newSocket);
      
      newSocket.on('connect', () => {
        console.log('Connected to socket');
        newSocket.emit('setup', parsedUser.id);
      });

      fetchChats(token);

      return () => {
        newSocket.disconnect();
      };
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (socket && activeChat) {
      socket.emit('join_chat', activeChat.id);
      fetchMessages(activeChat.id);

      socket.on('new_message', (message: Message) => {
        if (activeChat && message.chatId === activeChat.id) {
             setMessages((prev) => [...prev, message]);
             scrollToBottom();
             // Mark as read immediately if chat is active
             markMessagesAsRead(activeChat.id);
        } else {
            // Show notification
            if (Notification.permission === 'granted') {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser.notificationsEnabled !== false) {
                         new Notification(`${t('new_message_from')} ${message.sender.username}`, {
                            body: message.content || (message.type === 'VOICE' ? t('voice_message') : t('sticker')),
                            icon: '/logo.png'
                        });
                        
                        // Play notification sound
                        const audio = new Audio('/blink.mp3');
                        audio.volume = 0.5;
                        audio.load();
                        audio.play().catch(e => console.error("Audio play failed", e));
                    }
                }
            }
        }
        // Update chat list to show latest message or move chat to top
        fetchChats(localStorage.getItem('token') || '');
      });

      socket.on('messages_read', ({ chatId }) => {
          // Refresh chats to update unread counts
          fetchChats(localStorage.getItem('token') || '');
      });

      socket.on('user_online', (userId: string) => {
        setChats(prev => prev.map(chat => ({
          ...chat,
          chatMembers: chat.chatMembers.map(member =>
            member.user.id === userId ? { ...member, user: { ...member.user, isOnline: true } } : member
          )
        })));
      });

      socket.on('user_offline', (userId: string) => {
        setChats(prev => prev.map(chat => ({
          ...chat,
          chatMembers: chat.chatMembers.map(member =>
            member.user.id === userId ? { ...member, user: { ...member.user, isOnline: false, lastSeen: new Date().toISOString() } } : member
          )
        })));
      });

      socket.on('messages_read', ({ chatId, userId }) => {
        if (activeChat && activeChat.id === chatId) {
            setMessages(prev => prev.map(msg => {
                if (msg.senderId === user.id) {
                    // Update status locally
                    const existingStatus = msg.statuses.find(s => s.userId === userId);
                    if (existingStatus) {
                        return {
                            ...msg,
                            statuses: msg.statuses.map(s => s.userId === userId ? { ...s, status: 'READ' } : s)
                        };
                    } else {
                        return {
                            ...msg,
                            statuses: [...msg.statuses, { userId, status: 'READ' }]
                        };
                    }
                }
                return msg;
            }));
        }
      });

      socket.on('call_user', (data) => {
          setReceivingCall(true);
          setCaller(data.from); // This should be the socket ID or user ID depending on backend logic
          setName(data.name);
          setCallerSignal(data.signal);
          setShowCallModal(true);
          // Determine if video call based on some data or default
          // For now, assume video if not specified, or pass it in signal
      });

      socket.on('call_ended', () => {
          setCallEnded(true);
          setShowCallModal(false);
          connectionRef.current?.destroy();
          window.location.reload(); // Simple way to reset call state
      });

      return () => {
        socket.off('new_message');
        socket.off('user_online');
        socket.off('user_offline');
        socket.off('messages_read');
        socket.off('call_user');
        socket.off('call_ended');
      };
    }
  }, [socket, activeChat, user]);

  const fetchChats = async (token: string) => {
    try {
      const response = await fetch('http://https://vph-messenger.onrender.com/api/chats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setChats(data);
      } else {
        console.error('Failed to fetch chats:', data);
        setChats([]);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://https://vph-messenger.onrender.com/api/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setMessages(data);
        scrollToBottom();
        markMessagesAsRead(chatId);
      } else {
        console.error('Failed to fetch messages:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (chatId: string) => {
    try {
        const token = localStorage.getItem('token');
        await fetch(`http://https://vph-messenger.onrender.com/api/chats/${chatId}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        // Update local unread count
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    await sendTextMessage(newMessage);
    setNewMessage('');
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const onStickerClick = async (stickerUrl: string) => {
    if (!activeChat) return;
    try {
      const token = localStorage.getItem('token');
      await fetch('http://https://vph-messenger.onrender.com/api/chats/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: activeChat.id,
          content: 'Sticker',
          type: 'STICKER',
          fileUrl: stickerUrl,
        }),
      });
      setShowStickerPicker(false);
    } catch (error) {
      console.error('Error sending sticker:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('http://https://vph-messenger.onrender.com/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const { url } = await uploadResponse.json();

      const type = file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'DOCUMENT';

      await fetch('http://https://vph-messenger.onrender.com/api/chats/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: activeChat.id,
          content: file.name,
          type,
          fileUrl: url,
        }),
      });
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const sendTextMessage = async (content: string) => {
    if (!activeChat) return;
    try {
      const token = localStorage.getItem('token');
      await fetch('http://https://vph-messenger.onrender.com/api/chats/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: activeChat.id,
          content,
          type: 'TEXT',
        }),
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!activeChat) return;
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');

      const uploadResponse = await fetch('http://https://vph-messenger.onrender.com/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const { url } = await uploadResponse.json();

      await fetch('http://https://vph-messenger.onrender.com/api/chats/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: activeChat.id,
          content: 'Voice Message',
          type: 'VOICE',
          fileUrl: url,
        }),
      });
    } catch (error) {
      console.error('Error sending voice message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleUpdateProfile = (updatedUser: any) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const getChatName = (chat: Chat) => {
    if (chat.isGroup) return chat.name || t('group_chat');
    const partner = chat.chatMembers?.find((m) => m.user.id !== user?.id);
    return partner?.user.username || t('unknown_user');
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.isGroup) return null;
    const partner = chat.chatMembers?.find((m) => m.user.id !== user?.id);
    return partner?.user.avatar;
  };

  const getChatStatus = (chat: Chat) => {
    if (chat.isGroup) return null;
    const partner = chat.chatMembers?.find((m) => m.user.id !== user?.id);
    if (!partner) return null;
    if (partner.user.isOnline) return t('online');
    if (partner.user.lastSeen) {
        const date = new Date(partner.user.lastSeen);
        return `${t('was_online')} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    return t('offline');
  };

  const getMessageStatusIcon = (msg: Message) => {
    if (msg.senderId !== user?.id) return null;
    
    // Check if read by anyone (for private chat, this is enough)
    // For group chat, logic might be more complex
    const isRead = msg.statuses?.some(s => s.status === 'READ' && s.userId !== user.id);
    
    if (isRead) return <CheckCheck size={14} className="text-flick-blue" />;
    
    // Check if delivered (user is online) - simplified logic
    // Ideally we should track delivery status separately
    const chat = chats.find(c => c.id === msg.chatId);
    const partner = chat?.chatMembers.find(m => m.user.id !== user.id);
    const isDelivered = partner?.user.isOnline;

    if (isDelivered) return <CheckCheck size={14} className="text-white/30" />;
    
    return <Check size={14} className="text-white/30" />;
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://https://vph-messenger.onrender.com/api/users/search?query=${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setSearchResults(data);
        } else {
          console.error('Failed to search users:', data);
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error searching users:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const startChat = async (partnerId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://https://vph-messenger.onrender.com/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerId, isGroup: false }),
      });
      const chat = await response.json();
      setChats((prev) => {
        if (prev.find((c) => c.id === chat.id)) return prev;
        return [chat, ...prev];
      });
      setActiveChat(chat);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const callUser = (isVideo: boolean) => {
    setIsVideoCall(isVideo);
    setShowCallModal(true);
    
    navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
      });

      peer.on('signal', (data) => {
        if (activeChat && socket) {
          const partner = activeChat.chatMembers.find((m) => m.user.id !== user?.id);
          if (partner) {
            socket.emit('call_user', {
              userToCall: partner.user.id,
              signalData: data,
              from: user.id,
              name: user.username,
            });
          }
        }
      });

      peer.on('stream', (currentStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      });

      socket?.on('call_accepted', (signal) => {
        setCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
    });
  };

  const answerCall = () => {
    setCallAccepted(true);
    navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
      });

      peer.on('signal', (data) => {
        socket?.emit('answer_call', { signal: data, to: caller });
      });

      peer.on('stream', (currentStream) => {
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }
      });

      peer.signal(callerSignal);
      connectionRef.current = peer;
    });
  };

  const leaveCall = () => {
    setCallEnded(true);
    setShowCallModal(false);
    connectionRef.current?.destroy();
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    // Notify other user
    if (activeChat && socket) {
       const partner = activeChat.chatMembers.find((m) => m.user.id !== user?.id);
       if (partner) {
         socket.emit('end_call', { to: partner.user.id });
       }
    }
  };

  return (
    <div className="flex h-screen bg-flick-dark overflow-hidden">
      {selectedUserProfile && (
        <UserProfileModal
            user={selectedUserProfile}
            onClose={() => setSelectedUserProfile(null)}
        />
      )}
      {showProfileSettings && (
        <ProfileSettings
            user={user}
            onClose={() => setShowProfileSettings(false)}
            onUpdate={handleUpdateProfile}
        />
      )}
      {showCallModal && (
        <CallModal
          stream={stream}
          callAccepted={callAccepted}
          callEnded={callEnded}
          userVideo={userVideo as React.RefObject<HTMLVideoElement>}
          myVideo={myVideo as React.RefObject<HTMLVideoElement>}
          name={name || (activeChat ? getChatName(activeChat) : 'Unknown')}
          callUser={() => callUser(isVideoCall)}
          leaveCall={leaveCall}
          answerCall={answerCall}
          receivingCall={receivingCall}
          isVideo={isVideoCall}
        />
      )}
      {/* Sidebar */}
      <div className={`w-full md:w-80 glass-panel border-r border-white/10 flex flex-col flex-shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowProfileSettings(true)}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-flick-orange to-flick-blue p-[2px]">
              <div className="w-full h-full rounded-full bg-flick-dark flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar.startsWith('http') ? user.avatar : `http://https://vph-messenger.onrender.com${user.avatar}`}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-white" />
                )}
              </div>
            </div>
            <span className="font-pixel text-xs text-white">{user?.username}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowProfileSettings(true)} className="text-white/50 hover:text-flick-blue transition-colors">
              <Settings size={20} />
            </button>
            <button onClick={handleLogout} className="text-white/50 hover:text-flick-orange transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('search')}
              className="pixel-input w-full pl-10 rounded-lg text-xs"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 glass-panel rounded-lg overflow-hidden">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => startChat(result.id)}
                  className="p-3 hover:bg-white/10 cursor-pointer flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="font-pixel text-[10px] text-white">
                      {result.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-pixel text-xs text-white">{result.username}</span>
                  <Plus size={14} className="ml-auto text-flick-blue" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => {
            const avatar = getChatAvatar(chat);
            return (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 ${
                  activeChat?.id === chat.id ? 'bg-white/10 border-l-4 border-l-flick-orange' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                        {avatar ? (
                        <img
                            src={avatar.startsWith('http') ? avatar : `http://https://vph-messenger.onrender.com${avatar}`}
                            alt={getChatName(chat) || ''}
                            className="w-full h-full object-cover"
                        />
                        ) : (
                        <span className="font-pixel text-xs text-flick-blue">
                            {(getChatName(chat) || '?').charAt(0).toUpperCase()}
                        </span>
                        )}
                    </div>
                    {!chat.isGroup && (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-flick-dark ${
                            chat.chatMembers.find(m => m.user.id !== user?.id)?.user.isOnline
                            ? 'bg-green-500'
                            : 'bg-gray-500'
                        }`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <h3 className="font-pixel text-xs text-white truncate">{getChatName(chat)}</h3>
                        {chat.messages?.[0] && (
                            <span className="text-[10px] text-white/30">
                                {new Date(chat.messages[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-white/50 truncate w-32">
                        {chat.messages?.[0] ? (
                            <span className={chat.unreadCount > 0 ? 'text-white font-bold' : ''}>
                                {chat.messages[0].senderId === user?.id && <span className="text-flick-blue">Вы: </span>}
                                {chat.messages[0].type === 'VOICE' ? t('voice_message') :
                                chat.messages[0].type === 'STICKER' ? t('sticker') :
                                chat.messages[0].content}
                            </span>
                        ) : (
                            chat.chatMembers.find(m => m.user.id !== user?.id)?.user.isOnline ? (
                                <span className="text-flick-blue">{t('online')}</span>
                            ) : (
                                <span className="text-white/30">{t('offline')}</span>
                            )
                        )}
                        </p>
                        {chat.unreadCount > 0 && (
                            <div className="w-5 h-5 rounded-full bg-flick-blue flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">{chat.unreadCount}</span>
                            </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col relative ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="h-16 glass-panel border-b border-white/10 flex items-center px-4 md:px-6 justify-between z-10">
              <div className="flex items-center gap-3">
                <button
                    onClick={() => setActiveChat(null)}
                    className="md:hidden text-white/50 hover:text-white mr-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                        const partner = activeChat.chatMembers.find((m) => m.user.id !== user?.id);
                        if (partner) {
                            // Fetch full user details including bio
                            fetch(`http://https://vph-messenger.onrender.com/api/users/search?query=${partner.user.username}`, {
                                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            })
                            .then(res => res.json())
                            .then(data => {
                                const fullUser = data.find((u: any) => u.id === partner.user.id);
                                if (fullUser) setSelectedUserProfile(fullUser);
                            });
                        }
                    }}
                >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-flick-blue to-flick-orange p-[2px]">
                    <div className="w-full h-full rounded-full bg-flick-dark flex items-center justify-center overflow-hidden">
                        {getChatAvatar(activeChat) ? (
                        <img
                            src={getChatAvatar(activeChat)!.startsWith('http') ? getChatAvatar(activeChat)! : `http://https://vph-messenger.onrender.com${getChatAvatar(activeChat)}`}
                            alt={getChatName(activeChat) || ''}
                            className="w-full h-full object-cover"
                        />
                        ) : (
                        <span className="font-pixel text-xs text-white">
                            {(getChatName(activeChat) || '?').charAt(0).toUpperCase()}
                        </span>
                        )}
                    </div>
                    </div>
                    <div>
                    <h2 className="font-pixel text-sm text-white">{getChatName(activeChat)}</h2>
                    <span className="text-xs text-flick-blue">{getChatStatus(activeChat)}</span>
                    </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => callUser(false)}
                  className="text-white/50 hover:text-flick-orange transition-colors"
                >
                  <Phone size={20} />
                </button>
                <button
                  onClick={() => callUser(true)}
                  className="text-white/50 hover:text-flick-blue transition-colors"
                >
                  <Video size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] p-3 rounded-lg backdrop-blur-sm ${
                        isMe
                          ? 'bg-flick-blue/20 border border-flick-blue/50 rounded-tr-none'
                          : 'bg-white/10 border border-white/20 rounded-tl-none'
                      }`}
                    >
                      {!isMe && (
                        <p className="text-[10px] text-flick-orange font-pixel mb-1">
                          {msg.sender.username}
                        </p>
                      )}
                      {msg.type === 'VOICE' ? (
                        <AudioPlayer src={msg.fileUrl || ''} />
                      ) : msg.type === 'STICKER' ? (
                        <img src={msg.fileUrl} alt="Sticker" className="w-32 h-32 object-contain" />
                      ) : msg.type === 'IMAGE' ? (
                        <img src={msg.fileUrl} alt="Image" className="max-w-full rounded-lg" />
                      ) : msg.type === 'VIDEO' ? (
                        <video src={msg.fileUrl} controls className="max-w-full rounded-lg" />
                      ) : (
                        <p className="text-sm text-white">{msg.content}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <p className="text-[10px] text-white/30">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {getMessageStatusIcon(msg)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 glass-panel border-t border-white/10 relative">
              {showEmojiPicker && <CustomEmojiPicker onEmojiClick={onEmojiClick} />}
              {showStickerPicker && <StickerPicker onStickerClick={onStickerClick} />}
              <div className="flex gap-2 md:gap-4 items-center">
                <VoiceRecorder onSend={sendVoiceMessage} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white/50 hover:text-flick-blue transition-colors"
                >
                  <Paperclip size={20} />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,video/*"
                />
                <button
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowStickerPicker(false);
                  }}
                  className="text-white/50 hover:text-flick-orange transition-colors hidden md:block"
                >
                  <Smile size={20} />
                </button>
                <button
                  onClick={() => {
                    setShowStickerPicker(!showStickerPicker);
                    setShowEmojiPicker(false);
                  }}
                  className="text-white/50 hover:text-flick-blue transition-colors hidden md:block"
                >
                  <Sticker size={20} />
                </button>
                <form onSubmit={sendMessage} className="flex-1 flex gap-2 md:gap-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder=""
                    className="pixel-input flex-1 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="bg-flick-orange hover:bg-flick-blue text-white p-3 rounded-lg transition-colors shadow-pixel active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/30">
            <div className="w-32 h-32 mb-6 animate-pulse">
              <img src="/logo.png" alt="Flick" className="w-full h-full object-contain opacity-50" />
            </div>
            <p className="font-pixel text-sm mb-2">{t('welcome')}</p>
            <p className="font-pixel text-xs text-white/20">{t('select_chat')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;