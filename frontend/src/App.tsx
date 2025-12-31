import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import SplashScreen from './components/SplashScreen';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  const [splashComplete, setSplashComplete] = useState(() => {
    return sessionStorage.getItem('splashShown') === 'true';
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        if (token.length < 10) throw new Error("Invalid token");
      } catch (e) {
        localStorage.clear();
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
    /* Возвращаем BrowserRouter с basename для GitHub Pages */
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

        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
}

export default App;