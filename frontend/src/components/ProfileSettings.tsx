import React, { useState, useRef } from 'react';
import { X, Save, Upload, User, Globe, Camera } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ProfileSettingsProps {
  user: any;
  onClose: () => void;
  onUpdate: (user: any) => void;
  isPage?: boolean;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onClose, onUpdate, isPage = false }) => {
  const { t, language, setLanguage } = useLanguage();
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [relationshipStatus, setRelationshipStatus] = useState(user?.relationshipStatus || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = 'https://vph-messenger.onrender.com';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      // Показываем превью сразу (оптимистично)
      const localPreview = URL.createObjectURL(file);
      setAvatar(localPreview);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      if (data.url) {
        setAvatar(data.url);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Ошибка при загрузке аватара');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          username, 
          avatar, 
          bio, 
          relationshipStatus, 
          notificationsEnabled 
        }),
      });

      if (!response.ok) throw new Error('Update failed');

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUpdate(updatedUser);
      
      if (!isPage) onClose();
      else alert(t('profile_updated') || 'Профиль обновлен!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Ошибка при сохранении профиля');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') setNotificationsEnabled(true);
  };

  const formatAvatar = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('blob:') || url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  };

  const content = (
    <div className={`glass-panel p-8 rounded-[2.5rem] w-full max-w-md relative ${!isPage ? 'max-h-[90vh] overflow-y-auto' : ''} mx-4 md:mx-0 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-white/10 bg-[#121212]/90 backdrop-blur-2xl animate-in zoom-in-95 duration-300`}>
        {!isPage && (
          <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-flick-orange hover:bg-white/5 transition-all p-2 rounded-full">
            <X size={24} />
          </button>
        )}
        
        <h2 className="text-2xl font-pixel text-white mb-8 text-center tracking-[0.2em] drop-shadow-lg">
          {t('profile_settings')}
        </h2>
        
        <div className="flex flex-col items-center mb-10">
            <div className="relative group" onClick={() => fileInputRef.current?.click()}>
              <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-flick-blue via-flick-orange to-flick-blue p-[3px] shadow-2xl shadow-flick-blue/20 transition-transform duration-500 group-hover:rotate-12 cursor-pointer">
                <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden relative border-4 border-[#121212]">
                  {avatar ? (
                    <img
                      src={formatAvatar(avatar)!}
                      alt="avatar"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <User size={50} className="text-white/10" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                    <Camera size={32} className="text-white animate-bounce" />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-flick-blue p-2 rounded-full border-4 border-[#121212] shadow-xl">
                <Upload size={16} className="text-white" />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <p className="text-[10px] font-pixel text-flick-blue/60 mt-6 uppercase tracking-[0.2em]">{t('upload_avatar')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 group">
            <label className="block font-pixel text-[10px] text-white/30 group-focus-within:text-flick-blue uppercase tracking-widest ml-1 transition-colors">
              {t('username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pixel-input w-full bg-white/5 text-white text-sm py-4 px-5 rounded-2xl border-white/5 focus:border-flick-blue/50 focus:bg-white/10 transition-all shadow-inner"
              placeholder="Your name..."
              required
            />
          </div>
          
          <div className="space-y-2 group">
            <label className="block font-pixel text-[10px] text-white/30 group-focus-within:text-flick-blue uppercase tracking-widest ml-1 transition-colors">
              {t('bio')}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="pixel-input w-full h-24 resize-none bg-white/5 text-white text-sm py-4 px-5 rounded-2xl border-white/5 focus:border-flick-blue/50 focus:bg-white/10 transition-all shadow-inner"
              placeholder={t('bio_placeholder') || "Write something about yourself..."}
            />
          </div>

          <div className="space-y-2 group">
            <label className="block font-pixel text-[10px] text-flick-orange/70 uppercase tracking-widest ml-1">
              {t('relationship_status')}
            </label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              className="pixel-input w-full text-sm py-4 px-5 rounded-2xl bg-white/5 border-white/5 text-white cursor-pointer appearance-none hover:bg-white/10 transition-all shadow-inner"
            >
              <option value="" className="bg-[#1a1a1a]">{t('not_specified')}</option>
              <option value="single" className="bg-[#1a1a1a]">{t('single')}</option>
              <option value="dating" className="bg-[#1a1a1a]">{t('dating')}</option>
              <option value="married" className="bg-[#1a1a1a]">{t('married')}</option>
              <option value="complicated" className="bg-[#1a1a1a]">{t('complicated')}</option>
              <option value="searching" className="bg-[#1a1a1a]">{t('searching')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
              <span className="font-pixel text-[10px] uppercase text-white/40 group-hover:text-white/70 transition-colors">
                {t('notifications')}
              </span>
              <button
                type="button"
                onClick={() => notificationsEnabled ? setNotificationsEnabled(false) : requestNotificationPermission()}
                className={`w-12 h-6 rounded-full relative transition-all duration-500 ${notificationsEnabled ? 'bg-flick-orange shadow-[0_0_20px_rgba(255,107,0,0.3)]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-md ${notificationsEnabled ? 'left-7 scale-110' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
              <span className="font-pixel text-[10px] uppercase text-white/40 group-hover:text-white/70 transition-colors">Language / Язык</span>
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
                className="flex items-center gap-2 text-flick-blue hover:text-white transition-all bg-flick-blue/10 hover:bg-flick-blue/20 px-4 py-2 rounded-xl border border-flick-blue/20 shadow-sm"
              >
                <Globe size={14} className="animate-pulse" />
                <span className="font-pixel text-[10px] mt-0.5">{language.toUpperCase()}</span>
              </button>
            </div>
          </div>

          <button type="submit" className="w-full bg-gradient-to-tr from-flick-orange to-orange-400 hover:from-orange-500 hover:to-orange-300 text-white font-pixel text-xs py-5 mt-4 flex items-center justify-center gap-3 rounded-[1.5rem] shadow-xl shadow-flick-orange/20 hover:shadow-flick-orange/40 transition-all active:scale-[0.98] uppercase tracking-[0.2em]">
            <Save size={18} />
            {t('save')}
          </button>
        </form>
    </div>
  );

  if (isPage) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-flick-blue/20 via-transparent to-transparent">{content}</div>;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[110] p-4 animate-in fade-in duration-500">
      {content}
    </div>
  );
};

export default ProfileSettings;