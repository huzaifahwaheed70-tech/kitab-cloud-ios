import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../App';

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH

const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processGoogleAuth = async () => {
      try {
        // Extract session_id from URL hash (fragment)
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const sessionId = params.get('session_id');

        if (!sessionId) {
          console.error('[AuthCallback] No session_id found in URL');
          toast.error('Authentication failed - no session ID');
          navigate('/login');
          return;
        }

        console.log('[AuthCallback] Processing Google auth session...');

        // Exchange session_id for JWT token via backend
        const response = await axios.post(`${API}/auth/google/session`, {
          session_id: sessionId
        });

        const { token, user } = response.data;

        // Store token in localStorage (same as email/password auth)
        localStorage.setItem('auth_token', token);

        console.log('[AuthCallback] Google auth successful:', user.email);
        toast.success(`Welcome${user.name ? `, ${user.name.split(' ')[0]}` : ''}!`);

        // Clear the URL hash and redirect to library
        window.history.replaceState(null, '', '/library');
        
        // Force page reload to refresh AuthProvider state
        window.location.href = '/library';
      } catch (error) {
        console.error('[AuthCallback] Google auth error:', error);
        const errorMessage = error.response?.data?.detail || 'Authentication failed';
        toast.error(errorMessage);
        navigate('/login');
      }
    };

    processGoogleAuth();
  }, [navigate]);

  // Show minimal loading while processing
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <div className="spinner-gap spinner-gap-lg mx-auto mb-4"></div>
        <p className="text-[#B0C4BF]">Signing you in with Google...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
