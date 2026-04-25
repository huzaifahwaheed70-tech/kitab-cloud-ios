import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, ArrowRight, Library } from 'lucide-react';
import { Button } from '../components/ui/button';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, failed
  const [paymentInfo, setPaymentInfo] = useState(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      setStatus('failed');
    }
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('failed');
      return;
    }

    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/payments/status/${sessionId}`, {
        headers,
        withCredentials: true
      });

      const data = response.data;

      if (data.payment_status === 'paid') {
        setStatus('success');
        setPaymentInfo(data);
        await refreshUser();
        return;
      } else if (data.status === 'expired') {
        setStatus('failed');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    }
  };

  const tierNames = ['Free', 'Basic', 'Standard', 'Advanced', 'Premium', 'Unlimited'];

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {status === 'checking' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-gold mx-auto mb-6 animate-spin" />
            <h1 className="font-serif text-3xl text-[#FDFBF7] mb-4">Processing Payment</h1>
            <p className="text-[#B0C4BF]">Please wait while we confirm your payment...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="font-serif text-3xl text-[#FDFBF7] mb-4">Payment Successful!</h1>
            <p className="text-[#B0C4BF] mb-8">
              Welcome to {tierNames[parseInt(paymentInfo?.metadata?.tier) || user?.subscription_tier || 1]}! 
              Your subscription has been activated.
            </p>

            <div className="glass-card rounded-sm p-6 mb-8 text-left">
              <h3 className="text-[#FDFBF7] font-medium mb-4">What's Next?</h3>
              <ul className="space-y-3 text-[#B0C4BF]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2"></span>
                  Browse your expanded library collection
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2"></span>
                  Add books to your personal bookshelf
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2"></span>
                  Request new books to be digitized
                </li>
                {(parseInt(paymentInfo?.metadata?.tier) === 5 || user?.subscription_tier === 5) && (
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2"></span>
                    Access your exclusive Ship-to-Scan portal
                  </li>
                )}
              </ul>
            </div>

            <Link to="/library">
              <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold w-full" data-testid="go-to-library-btn">
                <Library className="w-5 h-5 mr-2" />
                Go to Library
              </Button>
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="font-serif text-3xl text-[#FDFBF7] mb-4">Payment Failed</h1>
            <p className="text-[#B0C4BF] mb-8">
              Something went wrong with your payment. Please try again or contact support.
            </p>

            <div className="flex flex-col gap-4">
              <Link to="/pricing">
                <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold w-full" data-testid="try-again-btn">
                  Try Again
                </Button>
              </Link>
              <Link to="/library">
                <Button size="lg" variant="outline" className="border-[rgba(212,175,55,0.3)] text-[#FDFBF7] w-full" data-testid="back-to-library-btn">
                  Back to Library
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
