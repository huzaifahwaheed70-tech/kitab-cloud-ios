import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
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
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await register(email, password, name);
      toast.success('Account created successfully!');
      navigate('/pricing');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
          <Logo className="mb-12" testId="register-logo" />

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
              {loading ? 'Creating Account...' : 'Create Account'}
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
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
