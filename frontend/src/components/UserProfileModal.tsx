import React from 'react';
import { X, User, Heart, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface UserProfileModalProps {
  user: {
    username: string;
    avatar: string | null;
    bio?: string | null;
    relationshipStatus?: string | null;
    isOnline?: boolean;
    lastSeen?: string | null;
  };
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
  const { t } = useLanguage();

  const getRelationshipStatusText = (status: string | null | undefined) => {
    switch (status) {
      case 'single': return t('single');
      case 'dating': return t('dating');
      case 'married': return t('married');
      case 'complicated': return t('complicated');
      case 'searching': return t('searching');
      default: return t('not_specified');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel p-6 rounded-2xl w-full max-w-md relative mx-4 md:mx-0">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2">
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-flick-orange to-flick-blue p-[3px] mb-4">
            <div className="w-full h-full rounded-full bg-flick-dark flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:3000${user.avatar}`}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={40} className="text-white" />
              )}
            </div>
          </div>
          <h2 className="text-xl font-pixel text-white mb-1">{user.username}</h2>
          <p className="text-xs text-white/50">
            {user.isOnline ? (
                <span className="text-flick-blue">{t('online')}</span>
            ) : (
                <span>
                    {user.lastSeen
                        ? `${t('was_online')} ${new Date(user.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                        : t('offline')}
                </span>
            )}
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-flick-blue">
                <Info size={16} />
                <span className="font-pixel text-xs">{t('about_me')}</span>
            </div>
            <p className="text-sm text-white/80 whitespace-pre-wrap">
                {user.bio || t('not_specified')}
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-flick-orange">
                <Heart size={16} />
                <span className="font-pixel text-xs">{t('relationship_status')}</span>
            </div>
            <p className="text-sm text-white/80">
                {getRelationshipStatusText(user.relationshipStatus)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;