import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import './App.css';

// Pages
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
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';

// HARDCODED production URL for iOS Capacitor builds
// Codemagic env vars may not be injected properly during React build
const PRODUCTION_URL = 'https://kitab-cloud.emergent.host';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || PRODUCTION_URL;
const API = `${BACKEND_URL}/api`;

// Debug: Log which URL is being used (visible in Safari Web Inspector)
console.log('[App] BACKEND_URL:', BACKEND_URL);
console.log('[App] API:', API);
console.log('[App] process.env.REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  const checkAuth = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setUser(response.data);
        setToken(storedToken);
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

  const guestLogin = async () => {
    const response = await axios.post(`${API}/auth/guest`);
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {});
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
      if (storedToken) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setUser(response.data);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, guestLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route Component
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

// App Router Component
const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      
      <Route path="/library" element={
        <ProtectedRoute>
          <LibraryPage />
        </ProtectedRoute>
      } />
      
      <Route path="/book/:bookId" element={
        <ProtectedRoute>
          <BookDetailPage />
        </ProtectedRoute>
      } />
      
      <Route path="/bookshelf" element={
        <ProtectedRoute>
          <BookshelfPage />
        </ProtectedRoute>
      } />
      
      <Route path="/favorites" element={
        <ProtectedRoute>
          <FavoritesPage />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
export { API, BACKEND_URL };
