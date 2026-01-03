import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/chat');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
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
              className="pixel-input w-full rounded-lg"
              placeholder="ВЫБЕРИТЕ ИМЯ..."
            />
          </div>

          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-blue">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pixel-input w-full rounded-lg"
              placeholder="ВВЕДИТЕ EMAIL..."
            />
          </div>

          <div>
            <label className="block font-pixel text-xs mb-2 text-flick-orange">ПАРОЛЬ</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pixel-input w-full rounded-lg"
              placeholder="СОЗДАЙТЕ ПАРОЛЬ..."
            />
          </div>

          <button type="submit" className="pixel-btn w-full rounded-lg text-sm py-3 mt-4 bg-flick-blue">
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