import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // ПРОВЕРЬ: Этот URL должен совпадать с твоим бэкендом на Render
  const API_URL = 'https://vph-messenger.onrender.com/api/auth/register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Отправка запроса на регистрацию...");

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      // Сначала читаем как текст, чтобы избежать ошибки "undefined is not valid JSON"
      const text = await response.text();
      let data;
      
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Сервер прислал не JSON ответ:", text);
        alert("Ошибка сервера: бэкенд прислал некорректный ответ.");
        return;
      }

      console.log("Ответ от сервера:", data);

      if (response.ok) {
        // Если всё успешно, сохраняем данные и токен
        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log("Регистрация успешна, переходим в чат...");
          navigate('/chat'); 
        } else {
          alert("Аккаунт создан, но сервер не прислал данные для входа. Попробуйте войти вручную.");
        }
      } else {
        // Если сервер вернул ошибку (например, юзер уже есть)
        alert(data.message || 'Ошибка регистрации. Возможно, такой email уже занят.');
      }
    } catch (error) {
      console.error('Критическая ошибка при регистрации:', error);
      alert('Не удалось связаться с сервером. Проверьте, что бэкенд на Render запущен (зеленая галочка).');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0c1d] relative overflow-hidden">
      {/* Фоновые эффекты свечения */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-[#161426]/80 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 shadow-2xl">
          
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-pink-500/10 border border-pink-500/20">
              <span className="text-pink-400 text-[10px] font-black uppercase tracking-[0.2em]">Join the Galaxy</span>
            </div>
            
            <h2 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Lumina
            </h2>
            <p className="text-gray-400 text-sm mt-2 font-medium">Создайте свой путь во вселенной</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-gray-500 uppercase ml-1 tracking-wider">Имя пользователя</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1f1d33] border border-white/5 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/50 transition-all placeholder:text-gray-600"
                placeholder="Как вас называть?"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-gray-500 uppercase ml-1 tracking-wider">Email Адрес</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1f1d33] border border-white/5 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-gray-500 uppercase ml-1 tracking-wider">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1f1d33] border border-white/5 rounded-2xl py-4 px-5 text-sm text-white outline-none focus:ring-2 focus:ring-pink-500/50 transition-all placeholder:text-gray-600"
                placeholder="Минимум 6 символов"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all active:scale-[0.98] mt-6"
            >
              Создать аккаунт
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-gray-500">Уже есть аккаунт? </span>
            <Link 
              to="/login" 
              className="text-white font-bold hover:text-pink-400 transition-colors underline underline-offset-4 decoration-pink-500/30"
            >
              Войти в Lumina
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;