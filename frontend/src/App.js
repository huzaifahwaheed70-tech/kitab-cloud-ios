import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import './App.css';
import { Capacitor } from '@capacitor/core';
import { initStore } from './purchase';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LibraryPage from './pages/LibraryPage';
import BookDetailPage from './pages/BookDetailPage';
import BookshelfPage from './pages/BookshelfPage';
import FavoritesPage from './pages/FavoritesPage';
import PricingPage from './pages/PricingPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import AdminDashboard from './pages/AdminDashboard';
import SettingsPage from './pages/SettingsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://kitab-cloud.emergent.host";
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  const checkAuth = useCallback(async () => {
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    try {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setUser(response.data);
        setToken(storedToken);
      } else {
        const response = await axios.get(`${API}/auth/me`, { withCredentials: true });
        setUser(response.data);
      }
    } catch (error) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const loginWithGoogle = () => {
    const redirectUrl = 'https://kitab-cloud.emergent.host/library';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const storedToken = localStorage.getItem('auth_token');
      const response = await axios.get(`${API}/auth/me`, {
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await axios.get(`${API}/auth/session`, {
            params: { session_id: sessionId },
            withCredentials: true
          });
          if (response.data.user) {
            if (response.data.token) {
              localStorage.setItem('auth_token', response.data.token);
            }
            await refreshUser();
            navigate('/library', { replace: true, state: { user: response.data.user } });
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          navigate('/login', { replace: true });
        }
      } else {
        navigate('/library', { replace: true });
      }
    };

    processAuth();
  }, [location, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-secondary">Authenticating...</p>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/library" replace />;
  }

  return children;
};

const IOSCheckoutBlock = () => (
  <div className="min-h-screen bg-dark flex items-center justify-center">
    <div className="text-center p-8">
      <h2 className="font-serif text-2xl font-bold text-[#FDFBF7] mb-4">Subscribe on iOS</h2>
      <p className="text-[#B0C4BF]">Please use the in-app subscription on the pricing page.</p>
    </div>
  </div>
);

const AppRouter = () => {
  const location = useLocation();
  const isIOS = Capacitor.getPlatform() === 'ios';

  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment-success" element={isIOS ? <IOSCheckoutBlock /> : <PaymentSuccessPage />} />
      <Route path="/checkout" element={isIOS ? <IOSCheckoutBlock /> : <Navigate to="/pricing" replace />} />

      <Route path="/library" element={
        <ProtectedRoute><LibraryPage /></ProtectedRoute>
      } />
      <Route path="/book/:bookId" element={
        <ProtectedRoute><BookDetailPage /></ProtectedRoute>
      } />
      <Route path="/bookshelf" element={
        <ProtectedRoute><BookshelfPage /></ProtectedRoute>
      } />
      <Route path="/favorites" element={
        <ProtectedRoute><FavoritesPage /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      initStore();
      
      const handleLinkClick = (e) => {
        const link = e.target.closest('a');
        if (link && link.href.includes('kitab-cloud.emergent.host') && !link.target) {
          e.preventDefault();
          window.location.href = link.href;
        }
      };

      document.addEventListener('click', handleLinkClick);
      return () => document.removeEventListener('click', handleLinkClick);
    }
  }, []);

  return (
    <HashRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
export { API, BACKEND_URL };