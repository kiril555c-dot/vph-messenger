import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import SplashScreen from './components/SplashScreen';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const [splashComplete, setSplashComplete] = useState(() => {
    return sessionStorage.getItem('splashShown') === 'true';
  });

  const handleSplashComplete = () => {
    setSplashComplete(true);
    sessionStorage.setItem('splashShown', 'true');
  };

  if (!splashComplete) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
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
        <Route path="/" element={<Navigate to="/chat" />} />
      </Routes>
    </Router>
  );
}

export default App;