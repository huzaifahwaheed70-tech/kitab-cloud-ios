import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { API } from '../App';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSubmitted(true);
      toast.success('Reset link sent! Check your email.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#082E26] flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-gold" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#FDFBF7] mb-4">Check Your Email</h1>
          <p className="text-[#B0C4BF] mb-8">
            If an account exists with <span className="text-gold">{email}</span>, we've sent a password reset link.
          </p>
          <p className="text-[#B0C4BF] text-sm mb-8">
            The link will expire in 1 hour. Don't forget to check your spam folder.
          </p>
          <Link to="/login">
            <Button
              variant="outline"
              className="border-[rgba(212,175,55,0.3)] bg-surface hover:bg-surface-elevated text-[#FDFBF7]"
              data-testid="back-to-login-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Logo className="mb-12" testId="forgot-password-logo" />

        <h1 className="font-serif text-4xl font-bold text-[#FDFBF7] mb-2">Reset Password</h1>
        <p className="text-[#B0C4BF] mb-8">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-[#FDFBF7] mb-2 block">Email Address</Label>
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
                data-testid="forgot-email-input"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-6"
            disabled={loading}
            data-testid="forgot-submit-btn"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link 
            to="/login" 
            className="text-gold hover:text-[#E9C85C] inline-flex items-center gap-2"
            data-testid="back-to-login-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
