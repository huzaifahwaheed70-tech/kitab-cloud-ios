import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import Logo from '../components/Logo';
import { Link } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
          <Logo className="mb-12" testId="login-logo" />

          <h1 className="font-serif text-4xl font-bold text-[#FDFBF7] mb-2">Welcome Back</h1>
          <p className="text-[#B0C4BF] mb-8">Sign in to continue to your digital library</p>

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
