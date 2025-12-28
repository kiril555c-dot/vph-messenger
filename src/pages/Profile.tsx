import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProfileSettings from '../components/ProfileSettings';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleUpdate = (updatedUser: any) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-flick-dark flex flex-col items-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/chat')}
          className="flex items-center gap-2 text-white/50 hover:text-flick-orange transition-colors mb-6 font-pixel text-xs"
        >
          <ArrowLeft size={16} />
          НАЗАД В ЧАТ
        </button>

        <ProfileSettings
            user={user}
            onClose={() => navigate('/chat')}
            onUpdate={handleUpdate}
            isPage={true}
        />
      </div>
    </div>
  );
};

export default Profile;