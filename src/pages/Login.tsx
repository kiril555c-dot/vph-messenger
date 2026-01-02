import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

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
      alert('Ошибка: Не удалось связаться с сервером.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0c1d] relative overflow-hidden">
      {/* Декоративные фоновые элементы (свечение) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>

      <div className="relative w-full max-w-md">
        {/* Основная карточка */}
        <div className="bg-[#161426]/80 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 shadow-2xl">
          
          {/* Логотип и Заголовок */}
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-purple-500/10 border border-purple-500/20">
              <span className="text-purple-400 text-[10px] font-black uppercase tracking-[0.2em]">Next-Gen Messenger</span>
            </div>
            
            {/* ГРАДИЕНТ ДОБАВЛЕН ТУТ */}
            <h2 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Lumina
            </h2>
            
            <p className="text-gray-400 text-sm mt-2">Добро пожаловать обратно</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-gray-500 uppercase ml-1 tracking-wider">Email Адрес</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1f1d33] border border-white/5 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-gray-600"
                placeholder="name@example.com"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-gray-500 uppercase ml-1 tracking-wider">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1f1d33] border border-white/5 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-gray-600"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Кнопка входа */}
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-[0.98] mt-4"
            >
              Войти в систему
            </button>
          </form>

          {/* Ссылка на регистрацию */}
          <div className="mt-8 text-center text-sm">
            <span className="text-gray-500">Нет аккаунта? </span>
            <Link 
              to="/register" 
              className="text-white font-bold hover:text-purple-400 transition-colors underline underline-offset-4 decoration-purple-500/30"
            >
              Создать профиль
            </Link>
          </div>
        </div>

        {/* Подпись внизу */}
        <p className="text-center mt-8 text-[10px] text-gray-600 uppercase tracking-widest font-medium">
          &copy; 2024 Lumina Ecosystem. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;