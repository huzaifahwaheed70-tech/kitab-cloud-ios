import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from 'sonner';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { User, LogIn, BookOpen } from 'lucide-react';

/**
 * Mobile Welcome Screen - shown only in Capacitor native apps
 * Clean, minimal design optimized for mobile first impressions
 */
const MobileWelcomeScreen = () => {
  const navigate = useNavigate();
  const { guestLogin } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGuestMode = async () => {
    setGuestLoading(true);
    try {
      await guestLogin();
      toast.success('Browsing as Guest');
      navigate('/library');
    } catch (error) {
      toast.error('Failed to start guest mode');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-dark flex flex-col"
      style={{ 
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
        paddingLeft: 'var(--safe-area-inset-left, 0px)',
        paddingRight: 'var(--safe-area-inset-right, 0px)'
      }}
    >
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <Logo className="scale-125" showTagline={false} />
        </div>
        
        {/* Tagline */}
        <h1 className="font-serif text-3xl text-[#FDFBF7] mb-3">
          Your Digital Islamic Library
        </h1>
        <p className="text-[#B0C4BF] text-lg max-w-xs leading-relaxed">
          Access authentic Islamic literature anytime, anywhere
        </p>
        
        {/* Decorative Icon */}
        <div className="my-10 w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-gold" />
        </div>
        
        {/* Features Preview */}
        <div className="flex gap-6 text-center mb-8">
          <div>
            <p className="text-gold font-bold text-xl">PDF</p>
            <p className="text-[#B0C4BF] text-xs">Reading</p>
          </div>
          <div className="w-px bg-gold/20" />
          <div>
            <p className="text-gold font-bold text-xl">Offline</p>
            <p className="text-[#B0C4BF] text-xs">Access</p>
          </div>
          <div className="w-px bg-gold/20" />
          <div>
            <p className="text-gold font-bold text-xl">Sync</p>
            <p className="text-[#B0C4BF] text-xs">Progress</p>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="px-6 pb-8 space-y-3">
        <Button
          onClick={handleGetStarted}
          className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-6 text-lg"
          data-testid="welcome-get-started-btn"
        >
          Get Started
        </Button>
        
        <Button
          onClick={handleLogin}
          variant="outline"
          className="w-full border-gold/30 text-[#FDFBF7] hover:bg-gold/10 py-6 text-lg"
          data-testid="welcome-login-btn"
        >
          <LogIn className="w-5 h-5 mr-2" />
          I Have an Account
        </Button>
        
        <button
          onClick={handleGuestMode}
          disabled={guestLoading}
          className="w-full text-[#B0C4BF] hover:text-gold py-3 text-sm flex items-center justify-center gap-2 transition-colors"
          data-testid="welcome-guest-btn"
        >
          <User className="w-4 h-4" />
          {guestLoading ? 'Loading...' : 'Browse as Guest'}
        </button>
      </div>
    </div>
  );
};

export default MobileWelcomeScreen;
