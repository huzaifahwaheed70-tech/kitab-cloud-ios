import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { API } from '../App';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to reset password';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (error && !token) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#FDFBF7] mb-4">Invalid Link</h1>
          <p className="text-[#B0C4BF] mb-8">{error}</p>
          <Link to="/forgot-password">
            <Button
              className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold"
              data-testid="request-new-reset-btn"
            >
              Request New Reset Link
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#082E26] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#FDFBF7] mb-4">Password Reset!</h1>
          <p className="text-[#B0C4BF] mb-8">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold"
            data-testid="go-to-login-btn"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-3 mb-12" data-testid="reset-password-logo">
          <div className="w-10 h-10 rounded-sm bg-gold flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#02120F]" />
          </div>
          <span className="font-serif text-xl font-semibold text-[#FDFBF7]">Kitab Cloud</span>
        </Link>

        <h1 className="font-serif text-4xl font-bold text-[#FDFBF7] mb-2">New Password</h1>
        <p className="text-[#B0C4BF] mb-8">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="password" className="text-[#FDFBF7] mb-2 block">New Password</Label>
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
                data-testid="new-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0C4BF] hover:text-[#FDFBF7]"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-[#FDFBF7] mb-2 block">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold focus:border-gold"
                placeholder="••••••••"
                required
                data-testid="confirm-password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0C4BF] hover:text-[#FDFBF7]"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm" data-testid="reset-error">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-6"
            disabled={loading}
            data-testid="reset-submit-btn"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
