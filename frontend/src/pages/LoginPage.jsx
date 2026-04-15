import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { BookOpen, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/library');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-12" data-testid="login-logo">
            <div className="w-10 h-10 rounded-sm bg-gold flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#02120F]" />
            </div>
            <span className="font-serif text-xl font-semibold text-[#FDFBF7]">Kitab Cloud</span>
          </Link>

          <h1 className="font-serif text-4xl font-bold text-[#FDFBF7] mb-2">Welcome Back</h1>
          <p className="text-[#B0C4BF] mb-8">Sign in to continue to your digital library</p>

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-6 border-[rgba(212,175,55,0.3)] bg-surface hover:bg-surface-elevated text-[#FDFBF7] py-6"
            onClick={loginWithGoogle}
            data-testid="google-login-btn"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(212,175,55,0.2)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark text-[#B0C4BF]">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-gold hover:text-[#E9C85C]" data-testid="forgot-password-link">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-6"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-8 text-center text-[#B0C4BF]">
            Don't have an account?{' '}
            <Link to="/register" className="text-gold hover:text-[#E9C85C] font-medium" data-testid="register-link">
              Create one
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.pexels.com/photos/8391472/pexels-photo-8391472.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#004D40]/60 to-[#02120F]" />
        </div>
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="text-[#FDFBF7]">
            <p className="font-serif text-2xl italic mb-4">
              "The seeking of knowledge is obligatory for every Muslim."
            </p>
            <cite className="text-gold text-sm">— Prophet Muhammad ﷺ</cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
