import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // ВАЖНО: GitHub (HTTPS) блокирует запросы к localhost (HTTP).
  // Когда задеплоишь бэкенд, замени этот URL на адрес от Render/Railway
  const API_URL = 'http://localhost:3000/api/auth/register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Благодаря basename="/vph-messenger" в App.tsx, navigate сам добавит нужный путь
        navigate('/chat'); 
      } else {
        alert(data.message || 'Ошибка регистрации');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Не удалось связаться с сервером. Если бэкенд запущен на localhost, он не будет работать с GitHub Pages без специальной настройки (ngrok).');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-flick-dark">
      <div className="glass-panel p-6 md:p-8 rounded-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-flick-blue to-flick-orange"></div>
        
        <h2 className="text-2xl md:text-3xl font-pixel text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-flick-blue to-flick-orange">
          РЕГИСТРАЦИЯ
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-orange">ИМЯ ПОЛЬЗОВАТЕЛЯ</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="pixel-input w-full rounded-lg bg-white/10 p-2 text-white outline-none"
              placeholder="ВЫБЕРИТЕ ИМЯ..."
              required
            />
          </div>

          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-blue">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pixel-input w-full rounded-lg bg-white/10 p-2 text-white outline-none"
              placeholder="ВВЕДИТЕ EMAIL..."
              required
            />
          </div>

          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-orange">ПАРОЛЬ</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pixel-input w-full rounded-lg bg-white/10 p-2 text-white outline-none"
              placeholder="СОЗДАЙТЕ ПАРОЛЬ..."
              required
            />
          </div>

          <button type="submit" className="pixel-btn w-full rounded-lg text-sm py-3 mt-4 bg-flick-blue text-white font-pixel hover:opacity-80 transition-opacity">
            СОЗДАТЬ АККАУНТ
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-pixel text-white/50">
          УЖЕ ЕСТЬ АККАУНТ? <Link to="/login" className="text-flick-orange hover:text-flick-blue transition-colors">ВОЙТИ</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;