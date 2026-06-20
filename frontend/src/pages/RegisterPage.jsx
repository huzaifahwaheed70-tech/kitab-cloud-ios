import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const codeInputRefs = useRef([]);
  const { guestLogin } = useAuth();
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      // Send verification code to email
      await axios.post(`${API}/auth/send-verification`, {
        email,
        name,
        password
      });
      
      toast.success('Verification code sent! Check your inbox (and spam folder)');
      setStep('verify');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setVerificationCode(newCode);
      // Focus the last filled input or the next empty one
      const lastIndex = Math.min(pastedData.length, 5);
      codeInputRefs.current[lastIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }
    
    setVerifyLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/verify-and-register`, {
        email,
        code,
        name,
        password
      });
      
      // Store token and user data
      const { token, user } = response.data;
      localStorage.setItem('auth_token', token);
      
      toast.success('Account created successfully!');
      
      // Reload to refresh auth state
      window.location.href = '/pricing';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid verification code');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    
    try {
      await axios.post(`${API}/auth/send-verification`, {
        email,
        name,
        password
      });
      
      toast.success('New verification code sent!');
      setVerificationCode(['', '', '', '', '', '']);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  // Verification code entry screen
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => setStep('form')}
            className="flex items-center gap-2 text-[#B0C4BF] hover:text-gold mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gold" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#FDFBF7] mb-2">Check Your Email</h1>
            <p className="text-[#B0C4BF]">
              We sent a 6-digit code to<br />
              <span className="text-gold font-medium">{email}</span>
            </p>
            <p className="text-[#B0C4BF]/70 text-sm mt-3 bg-surface/50 rounded-md px-3 py-2 inline-block">
              💡 Don't see it? Check your <span className="text-gold">spam/junk folder</span>
            </p>
          </div>
          
          <div className="mb-6">
            <Label className="text-[#FDFBF7] mb-3 block text-center">Enter verification code</Label>
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {verificationCode.map((digit, index) => (
                <Input
                  key={index}
                  ref={el => codeInputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-surface border-[rgba(212,175,55,0.3)] text-[#FDFBF7] focus:ring-2 focus:ring-gold focus:border-gold"
                  data-testid={`code-input-${index}`}
                />
              ))}
            </div>
          </div>
          
          <Button
            onClick={handleVerify}
            className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-6 mb-4"
            disabled={verifyLoading || verificationCode.join('').length !== 6}
            data-testid="verify-btn"
          >
            {verifyLoading ? 'Verifying...' : 'Verify & Create Account'}
          </Button>
          
          <p className="text-center text-[#B0C4BF] text-sm">
            Didn't receive the code?{' '}
            <button
              onClick={handleResendCode}
              disabled={resendLoading}
              className="text-gold hover:text-[#E9C85C] font-medium"
            >
              {resendLoading ? 'Sending...' : 'Resend'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1505664063603-28e48ca204eb?crop=entropy&cs=srgb&fm=jpg&q=85)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#004D40]/60 to-[#02120F]" />
        </div>
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="text-[#FDFBF7]">
            <p className="font-serif text-2xl italic mb-4">
              "Read! In the name of your Lord who created."
            </p>
            <cite className="text-gold text-sm">— Surah Al-'Alaq, 96:1</cite>
          </blockquote>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Logo className="mb-12" showTagline={true} testId="register-logo" />

          <h1 className="font-serif text-4xl font-bold text-[#FDFBF7] mb-2">Create Account</h1>
          <p className="text-[#B0C4BF] mb-8">Join our community of learners</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-[#FDFBF7] mb-2 block">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold focus:border-gold"
                  placeholder="Your full name"
                  required
                  data-testid="name-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-[#FDFBF7] mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold focus:border-gold"
                  placeholder="you@example.com"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-[#FDFBF7] mb-2 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold focus:border-gold"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0C4BF] hover:text-[#FDFBF7]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-[#B0C4BF] mt-1">Minimum 6 characters</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-6"
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? 'Sending Code...' : 'Continue'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(212,175,55,0.2)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-dark text-[#B0C4BF]">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGuestMode}
              className="w-full border-[rgba(212,175,55,0.3)] text-[#FDFBF7] hover:bg-[#082E26] py-6"
              disabled={guestLoading}
              data-testid="guest-mode-btn"
            >
              <User className="w-5 h-5 mr-2" />
              {guestLoading ? 'Starting...' : 'Continue as Guest'}
            </Button>
          </form>

          <p className="mt-8 text-center text-[#B0C4BF]">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:text-[#E9C85C] font-medium" data-testid="login-link">
              Sign in
            </Link>
          </p>
          
          <p className="mt-2 text-center">
            <Link to="/forgot-password" className="text-sm text-[#B0C4BF] hover:text-gold" data-testid="forgot-password-link">
              Forgot your password?
            </Link>
          </p>
          
          <p className="mt-4 text-center text-xs text-[#B0C4BF]">
            By creating an account, you agree to our{' '}
            <Link to="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
