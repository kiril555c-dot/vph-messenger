import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // Мы заменили localhost на твой реальный адрес бэкенда на Render
  const API_URL = 'https://vph-messenger.onrender.com/api/auth/login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/chat');
      } else {
        alert(data.message || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Ошибка: Не удалось связаться с сервером. Убедитесь, что бэкенд на Render запущен.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-flick-dark">
      <div className="glass-panel p-6 md:p-8 rounded-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-flick-orange to-flick-blue"></div>
        
        <h2 className="text-2xl md:text-3xl font-pixel text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-flick-orange to-flick-blue">
          ВХОД В VPh
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-blue">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pixel-input w-full rounded-lg"
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
              className="pixel-input w-full rounded-lg"
              placeholder="ВВЕДИТЕ ПАРОЛЬ..."
              required
            />
          </div>

          <button type="submit" className="pixel-btn w-full rounded-lg text-sm py-3 mt-4">
            НАЧАТЬ ОБЩЕНИЕ
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-pixel text-white/50">
          НОВЫЙ ИГРОК? <Link to="/register" className="text-flick-blue hover:text-flick-orange transition-colors">СОЗДАТЬ АККАУНТ</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;