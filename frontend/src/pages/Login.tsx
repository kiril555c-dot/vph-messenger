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
      alert('Ошибка: Не удалось связаться с сервером. Убедитесь, что бэкенд на Render запущен.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Фоновые светящиеся элементы */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Карточка входа с глубоким glassmorphism */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10 overflow-hidden relative">
          {/* Градиентная полоса сверху */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"></div>

          {/* Логотип и название */}
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-bold tracking-wider mb-3">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
                Lumina
              </span>
            </h1>
            <p className="text-white/60 text-sm font-light tracking-widest">ВОЙДИТЕ В СВОЙ МИР</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div>
              <label className="block text-white/80 text-xs font-medium tracking-wider mb-2">
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-white/80 text-xs font-medium tracking-wider mb-2">
                ПАРОЛЬ
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-6 rounded-xl font-semibold text-white text-lg tracking-wider bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg hover:shadow-purple-500/30 transform hover:-translate-y-1 transition-all duration-300"
            >
              ВОЙТИ В LUMINA
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-white/50 text-sm">
              Ещё нет аккаунта?{' '}
              <Link
                to="/register"
                className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-4"
              >
                Создать аккаунт
              </Link>
            </p>
          </div>

          {/* Декоративные уголки */}
          <div className="absolute top-4 left-4 w-20 h-20 border-l-4 border-t-4 border-purple-400/50 rounded-tl-3xl"></div>
          <div className="absolute bottom-4 right-4 w-20 h-20 border-r-4 border-b-4 border-cyan-400/50 rounded-br-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;