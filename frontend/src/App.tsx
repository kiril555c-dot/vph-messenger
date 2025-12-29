import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import SplashScreen from './components/SplashScreen';

// Защищенный маршрут: проверяет наличие токена
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  // Если токена нет — отправляем на вход
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  const [splashComplete, setSplashComplete] = useState(() => {
    return sessionStorage.getItem('splashShown') === 'true';
  });

  // Проверка на "протухший" токен при запуске
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Базовая проверка: не пустой ли он
        if (token.length < 10) throw new Error("Invalid token");
      } catch (e) {
        localStorage.clear(); // Очищаем мусор
      }
    }
  }, []);

  const handleSplashComplete = () => {
    setSplashComplete(true);
    sessionStorage.setItem('splashShown', 'true');
  };

  if (!splashComplete) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    // basename="/vph-messenger" нужен для корректной работы на GitHub Pages
    <Router basename="/vph-messenger">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Редирект с главной на чат */}
        <Route path="/" element={<Navigate to="/chat" replace />} />
        
        {/* Если ввели несуществующий путь — на чат */}
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
}

export default App;