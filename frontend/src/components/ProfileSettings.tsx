import React, { useState, useRef } from 'react';
import { X, Save, Upload, User, Globe } from 'lucide-react';
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
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  };

  const content = (
    <div className={`glass-panel p-8 rounded-2xl w-full max-w-md relative ${!isPage ? 'max-h-[90vh] overflow-y-auto' : ''} mx-4 md:mx-0 shadow-2xl border border-white/10`}>
        {!isPage && (
          <button onClick={onClose} className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors p-2 bg-white/5 rounded-lg">
            <X size={24} />
          </button>
        )}
        
        <h2 className="text-2xl font-pixel text-white mb-8 text-center tracking-wider">{t('profile_settings')}</h2>
        
        <div className="flex flex-col items-center mb-8">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-flick-orange to-flick-blue p-[4px] shadow-lg shadow-flick-blue/20">
                <div className="w-full h-full rounded-full bg-flick-dark flex items-center justify-center overflow-hidden relative border-2 border-white/5">
                  {avatar ? (
                    <img
                      src={formatAvatar(avatar)!}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={48} className="text-white/20" />
                  )}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Upload size={32} className="text-white" />
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <p className="text-xs font-pixel text-white/50 mt-4 uppercase tracking-tighter bg-white/5 px-3 py-1 rounded-full">{t('upload_avatar')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block font-pixel text-xs text-flick-blue uppercase tracking-widest ml-1">{t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pixel-input w-full text-base py-3 px-4 rounded-xl border-white/10 focus:border-flick-blue/50 transition-all"
              placeholder="Username"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="block font-pixel text-xs text-flick-blue uppercase tracking-widest ml-1">{t('bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="pixel-input w-full h-28 resize-none text-sm py-3 px-4 rounded-xl border-white/10 focus:border-flick-blue/50 transition-all"
              placeholder={t('bio_placeholder') || "Write something about yourself..."}
            />
          </div>

          <div className="space-y-2">
            <label className="block font-pixel text-xs text-flick-orange uppercase tracking-widest ml-1">{t('relationship_status')}</label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              className="pixel-input w-full text-sm py-3 px-4 rounded-xl bg-flick-dark/50 border-white/10"
            >
              <option value="">{t('not_specified')}</option>
              <option value="single">{t('single')}</option>
              <option value="dating">{t('dating')}</option>
              <option value="married">{t('married')}</option>
              <option value="complicated">{t('complicated')}</option>
              <option value="searching">{t('searching')}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
              <span className="font-pixel text-xs uppercase text-white/80">{t('notifications')}</span>
              <button
                type="button"
                onClick={() => notificationsEnabled ? setNotificationsEnabled(false) : requestNotificationPermission()}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${notificationsEnabled ? 'bg-flick-orange shadow-[0_0_10px_rgba(255,107,0,0.4)]' : 'bg-white/20'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
              <span className="font-pixel text-xs uppercase text-white/80">Language / Язык</span>
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
                className="flex items-center gap-3 text-flick-blue hover:text-white transition-all bg-flick-blue/10 px-4 py-2 rounded-lg border border-flick-blue/20"
              >
                <Globe size={18} />
                <span className="font-pixel text-xs">{language.toUpperCase()}</span>
              </button>
            </div>
          </div>

          <button type="submit" className="pixel-btn w-full text-base py-4 mt-6 flex items-center justify-center gap-3 rounded-xl shadow-lg shadow-flick-orange/20 active:scale-95 transition-transform">
            <Save size={20} />
            {t('save')}
          </button>
        </form>
    </div>
  );

  if (isPage) return <div className="min-h-screen bg-flick-dark flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-flick-blue/10 via-transparent to-transparent">{content}</div>;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      {content}
    </div>
  );
};

export default ProfileSettings;