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
      
      // Обновляем данные в localStorage, чтобы после перезагрузки они не слетели
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
    <div className={`glass-panel p-6 rounded-2xl w-full max-w-md relative ${!isPage ? 'max-h-[90vh] overflow-y-auto' : ''} mx-4 md:mx-0`}>
        {!isPage && (
          <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2">
            <X size={20} />
          </button>
        )}
        
        <h2 className="text-xl font-pixel text-white mb-6 text-center">{t('profile_settings')}</h2>
        
        <div className="flex flex-col items-center mb-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-flick-orange to-flick-blue p-[3px]">
                <div className="w-full h-full rounded-full bg-flick-dark flex items-center justify-center overflow-hidden relative border-2 border-white/10">
                  {avatar ? (
                    <img
                      src={formatAvatar(avatar)!}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-white/20" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={24} className="text-white" />
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <p className="text-[10px] font-pixel text-white/50 mt-2 uppercase">{t('upload_avatar')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-pixel text-[10px] mb-1 text-flick-blue uppercase">{t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pixel-input w-full text-xs"
              required
            />
          </div>
          
          <div>
            <label className="block font-pixel text-[10px] mb-1 text-flick-blue uppercase">{t('bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="pixel-input w-full h-20 resize-none text-xs"
              placeholder="..."
            />
          </div>

          <div>
            <label className="block font-pixel text-[10px] mb-1 text-flick-orange uppercase">{t('relationship_status')}</label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              className="pixel-input w-full text-xs bg-flick-dark"
            >
              <option value="">{t('not_specified')}</option>
              <option value="single">{t('single')}</option>
              <option value="dating">{t('dating')}</option>
              <option value="married">{t('married')}</option>
              <option value="complicated">{t('complicated')}</option>
              <option value="searching">{t('searching')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
            <span className="font-pixel text-[10px] uppercase text-white/70">{t('notifications')}</span>
            <button
              type="button"
              onClick={() => notificationsEnabled ? setNotificationsEnabled(false) : requestNotificationPermission()}
              className={`w-10 h-5 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-flick-orange' : 'bg-white/20'}`}
            >
              <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notificationsEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
            <span className="font-pixel text-[10px] uppercase text-white/70">Language / Язык</span>
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
              className="flex items-center gap-2 text-flick-blue hover:text-white transition-colors"
            >
              <Globe size={14} />
              <span className="font-pixel text-[10px]">{language.toUpperCase()}</span>
            </button>
          </div>

          <button type="submit" className="pixel-btn w-full text-xs py-3 mt-4 flex items-center justify-center gap-2">
            <Save size={16} />
            {t('save')}
          </button>
        </form>
    </div>
  );

  if (isPage) return <div className="min-h-screen bg-flick-dark flex items-center justify-center p-4">{content}</div>;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      {content}
    </div>
  );
};

export default ProfileSettings;