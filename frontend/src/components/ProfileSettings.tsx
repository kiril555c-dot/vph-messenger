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
  const [username, setUsername] = useState(user.username);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [bio, setBio] = useState(user.bio || '');
  const [relationshipStatus, setRelationshipStatus] = useState(user.relationshipStatus || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user.notificationsEnabled ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://vph-messenger.onrender.com', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      setAvatar(data.url);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://vph-messenger.onrender.com', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, avatar, bio, relationshipStatus, notificationsEnabled }),
      });
      const updatedUser = await response.json();
      onUpdate(updatedUser);
      if (!isPage) onClose();
      else alert(t('profile_updated'));
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert(t('browser_not_supported'));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
    }
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
                <div className="w-full h-full rounded-full bg-flick-dark flex items-center justify-center overflow-hidden relative">
                  {avatar ? (
                    <img
                      src={avatar.startsWith('http') ? avatar : `https://vph-messenger.onrender.com${avatar}`}
                      alt={username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-white" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={24} className="text-white" />
                  </div>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="text-xs font-pixel text-white/50 mt-2">{t('upload_avatar')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-blue">{t('username')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pixel-input w-full rounded-lg"
            />
          </div>
          
          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-blue">{t('bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="pixel-input w-full rounded-lg h-24 resize-none"
              placeholder={t('bio')}
            />
          </div>

          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-orange">{t('relationship_status')}</label>
            <select
              value={relationshipStatus}
              onChange={(e) => setRelationshipStatus(e.target.value)}
              className="pixel-input w-full rounded-lg"
            >
              <option value="">{t('not_specified')}</option>
              <option value="single">{t('single')}</option>
              <option value="dating">{t('dating')}</option>
              <option value="married">{t('married')}</option>
              <option value="complicated">{t('complicated')}</option>
              <option value="searching">{t('searching')}</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
            <span className="font-pixel text-xs text-white">{t('notifications')}</span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        if (!notificationsEnabled) requestNotificationPermission();
                        else setNotificationsEnabled(false);
                    }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-flick-orange' : 'bg-white/20'}`}
                >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notificationsEnabled ? 'left-6' : 'left-1'}`} />
                </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
            <span className="font-pixel text-xs text-white">LANGUAGE / ЯЗЫК</span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                    <Globe size={16} />
                    <span className="font-pixel text-xs">{language.toUpperCase()}</span>
                </button>
            </div>
          </div>

          <button type="submit" className="pixel-btn w-full rounded-lg text-sm py-3 mt-4 flex items-center justify-center gap-2">
            <Save size={16} />
            {t('save')}
          </button>
        </form>
    </div>
  );

  if (isPage) return content;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      {content}
    </div>
  );
};

export default ProfileSettings;