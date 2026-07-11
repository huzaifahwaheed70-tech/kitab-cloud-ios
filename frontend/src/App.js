import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import './App.css';

// Global error handler for uncaught errors
window.onerror = function(message, source, lineno, colno, error) {
  console.error('[App] Global error:', { message, source, lineno, colno, error });
  return false;
};

// Handle unhandled promise rejections
window.onunhandledrejection = function(event) {
  console.error('[App] Unhandled promise rejection:', event.reason);
};

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
import AuthCallback from './pages/AuthCallback';
import MobileWelcomeScreen from './pages/MobileWelcomeScreen';

// Platform detection
import { isCapacitorApp } from './utils/platform';

// Components
import { BookSpinner } from './components/BookLoader';

// HARDCODED production URL for iOS Capacitor builds
// Codemagic env vars may not be injected properly during React build
const PRODUCTION_URL = 'https://kitab-cloud.emergent.host';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || PRODUCTION_URL;
const API = `${BACKEND_URL}/api`;

// Debug: Log which URL is being used (visible in Safari Web Inspector)
console.log('[App] Initializing Kitab Cloud');
console.log('[App] BACKEND_URL:', BACKEND_URL);
console.log('[App] API:', API);
console.log('[App] Platform:', navigator.platform);
console.log('[App] UserAgent:', navigator.userAgent);

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
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
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
        <BookSpinner size="lg" />
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
  const location = useLocation();
  const { user } = useAuth();
  
  // CRITICAL: Check URL hash for session_id during render (NOT in useEffect)
  // This synchronous check prevents race conditions by processing OAuth callback FIRST
  // HOWEVER: Skip if this is a Google Link callback (link_google=true in query)
  // The Settings page handles its own linking flow
  const isGoogleLinkCallback = location.search?.includes('link_google=true');
  
  if (location.hash?.includes('session_id=') && !isGoogleLinkCallback) {
    return <AuthCallback />;
  }
  
  // Determine home page based on platform and auth state
  // - Capacitor app + not logged in = Mobile Welcome Screen
  // - Capacitor app + logged in = Redirect to library
  // - Web = Landing Page
  const getHomePage = () => {
    const isMobile = isCapacitorApp();
    
    if (isMobile) {
      // If user is logged in on mobile, redirect to library
      if (user) {
        return <Navigate to="/library" replace />;
      }
      // Show mobile welcome screen for non-logged-in users
      return <MobileWelcomeScreen />;
    }
    
    // Web users see the landing page
    return <LandingPage />;
  };
  
  return (
    <Routes>
      <Route path="/" element={getHomePage()} />
      <Route path="/welcome" element={<MobileWelcomeScreen />} />
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
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="bottom-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

// Error Boundary to catch React errors and prevent blank screen
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#02120F',
          color: '#FDFBF7',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
          <p style={{ color: '#B0C4BF', marginBottom: '24px' }}>
            Please try refreshing the app or restarting it.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#D4AF37',
              color: '#02120F',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Refresh App
          </button>
          <p style={{ color: '#B0C4BF', fontSize: '12px', marginTop: '24px' }}>
            Error: {this.state.error?.message || 'Unknown error'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default App;
export { API, BACKEND_URL };
