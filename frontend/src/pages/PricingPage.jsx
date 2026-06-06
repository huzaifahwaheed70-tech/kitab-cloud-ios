import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App.js';
import axios from 'axios';
import { BookOpen, Check, ArrowRight, ArrowLeft, Crown, ExternalLink, X, Tag, Loader2, Ticket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { buySubscription } from '../purchase';
import Logo from '../components/Logo';
import { openPaymentUrl } from '../utils/browser';
import { shouldDisablePurchases, shouldHidePrices, getWebsiteUrl } from '../utils/platform';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const PricingPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [paymentModal, setPaymentModal] = useState({ show: false, url: null });
  const [tiersLoading, setTiersLoading] = useState(false);
  
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [visibleDiscounts, setVisibleDiscounts] = useState([]);
  const [selectedTierForDiscount, setSelectedTierForDiscount] = useState(null);
  
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [pendingTier, setPendingTier] = useState(null);
  const [popupDiscountCode, setPopupDiscountCode] = useState('');
  const [popupDiscountInfo, setPopupDiscountInfo] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);

  const platform = Capacitor.getPlatform();
  const isIOS = platform === 'ios';
  const isIOSApp = isIOS;

  const tiers = [
    {
      tier: 0,
      name: "Pay Per Book",
      price: 0,
      features: ["Buy individual PDFs", "Own books forever", "No monthly commitment", "Access anytime", "Email support"],
      color: "tier-0",
      perBook: true
    },
    {
      tier: 1,
      name: "Basic",
      price: 20,
      features: ["10 books per month", "Standard library access", "Bookmarks & progress tracking", "Favorites list", "Email support"],
      color: "tier-1"
    },
    {
      tier: 2,
      name: "Standard",
      price: 40,
      features: ["20 books per month", "Standard library access", "Bookmarks & progress tracking", "Favorites list", "Email support"],
      color: "tier-2"
    },
    {
      tier: 3,
      name: "Advanced",
      price: 60,
      features: ["30 books per month", "Volume books included", "In-book text search", "Bookmarks & progress tracking", "Email support"],
      color: "tier-3"
    },
    {
      tier: 4,
      name: "Premium",
      price: 80,
      features: ["Unlimited books", "All books including advanced", "Volume books included", "In-book text search", "Email support"],
      color: "tier-4",
      featured: true
    }
  ];

  const initiateSubscribe = (tier) => {
    if (tier === 0) {
      navigate(user ? '/library' : '/register');
      return;
    }

    if (!user) {
      navigate('/register');
      return;
    }

    if (user.is_guest) {
      toast.error('Please create an account to subscribe');
      navigate('/register');
      return;
    }

    if (user.subscription_tier >= tier) {
      toast.info(`You already have Tier ${user.subscription_tier} or higher`);
      return;
    }

    if (isIOS) {
      handleNativeApplePurchase(tier);
      return;
    }

    setPendingTier(tier);
    setPopupDiscountCode(discountCode || '');
    setPopupDiscountInfo(discountInfo);
    setShowDiscountPopup(true);
  };

  const handleNativeApplePurchase = async (tier) => {
    setLoading(tier);
    try {
      await buySubscription(tier);
      setLoading(null);
    } catch (error) {
      toast.error('Failed to initiate Apple purchase');
      setLoading(null);
    }
  };

  const validatePopupDiscount = async () => {
    if (!popupDiscountCode.trim()) {
      toast.error('Please enter a discount code');
      return;
    }
    
    setPopupLoading(true);
    
    try {
      const response = await axios.post(
        `${API}/discount/validate`,
        { code: popupDiscountCode.trim(), tier: pendingTier },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      
      setPopupDiscountInfo(response.data);
      toast.success(`Discount applied: ${response.data.description}`);
    } catch (error) {
      console.error('Error validating discount:', error);
      toast.error(error.response?.data?.detail || 'Invalid discount code');
      setPopupDiscountInfo(null);
    } finally {
      setPopupLoading(false);
    }
  };

  const proceedToCheckout = async (withDiscount = false) => {
    if (!pendingTier) return;
    
    setShowDiscountPopup(false);
    setLoading(pendingTier);
    
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const requestData = {
        tier: pendingTier,
        origin_url: 'https://kitab-cloud.emergent.host'
      };
      
      if (withDiscount && popupDiscountInfo) {
        requestData.discount_code = popupDiscountCode;
      }
      
      const response = await axios.post(`${API}/payments/create-checkout`, requestData, { headers, withCredentials: true });
      const checkoutUrl = response.data.url;

      if (Capacitor.getPlatform() !== 'web') {
        window.open(checkoutUrl, '_system');
      } else {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start checkout');
    } finally {
      setLoading(null);
      setPendingTier(null);
      setPopupDiscountCode('');
      setPopupDiscountInfo(null);
    }
  };

  const handleSubscribe = (tier) => {
    initiateSubscribe(tier);
  };

  const userTier = user?.subscription_tier || 0;

  return (
    <div className="min-h-screen bg-dark">
      <nav className="glass sticky top-0 z-50 border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-gold flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#02120F]" />
            </div>
            <span className="font-serif text-xl font-semibold text-[#FDFBF7]">Kitab Cloud</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/library">
                <Button variant="ghost" className="text-[#B0C4BF]">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Library
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-[#B0C4BF]">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gold text-[#02120F]">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="py-16 md:py-24 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-gold uppercase tracking-[0.2em] text-sm font-medium mb-4">Membership Plans</p>
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-[#FDFBF7] tracking-tight mb-6">
            {isIOSApp ? 'Access Your Books' : 'Choose Your Access Level'}
          </h1>
          <p className="text-xl text-[#B0C4BF] max-w-2xl mx-auto">
            {isIOSApp 
              ? 'Log in to access books from your subscription. To subscribe, visit kitab-cloud.emergent.host'
              : 'Subscribe monthly to read books, or buy individual PDFs without a subscription.'
            }
          </p>
          
          {isIOS && (
            <p className="text-sm text-gold mt-4">Subscriptions are processed securely through Apple.</p>
          )}
          
          {userTier > 0 && (
            <div className="mt-8 inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-2">
              <Crown className="w-4 h-4 text-gold" />
              <span className="text-gold text-sm">
                You're currently on <span className="font-bold">Tier {userTier}</span>
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {tiersLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
              {tiers.map((tier) => (
                <div 
                  key={tier.tier}
                  className={`relative rounded-sm border p-6 flex flex-col justify-between ${
                    tier.featured 
                      ? 'bg-gradient-to-b from-gold/20 to-gold/5 border-gold scale-105 lg:scale-110 shadow-lg shadow-gold/20' 
                      : 'bg-surface border-[rgba(212,175,55,0.2)]'
                  } ${userTier === tier.tier ? 'ring-2 ring-gold' : ''}`}
                  data-testid={`pricing-tier-${tier.tier}`}
                >
                  <div>
                    <div className={`tier-badge ${tier.color} inline-block mb-3`}>
                      {tier.tier === 0 ? 'No Sub' : `Tier ${tier.tier}`}
                    </div>
                    <h3 className="font-serif text-2xl font-semibold text-[#FDFBF7] mb-2">{tier.name}</h3>
                    <div className="text-4xl font-bold text-gold mb-6">
                      ${tier.price}<span className="text-base text-[#B0C4BF]">/mo</span>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#B0C4BF]">
                          <Check className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" /> <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Button
                    onClick={() => handleSubscribe(tier.tier)}
                    disabled={loading === tier.tier || (tier.tier !== 0 && userTier >= tier.tier)}
                    className="w-full bg-gold text-[#02120F] mt-auto flex items-center justify-center gap-1"
                  >
                    {loading === tier.tier ? 'Processing...' : (
                      <>
                        {isIOS ? 'Subscribe with Apple' : 'Subscribe'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-serif text-3xl text-[#FDFBF7] text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="glass-card rounded-sm p-6 bg-surface border border-gold/10">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">How does the monthly book limit work?</h3>
              <p className="text-[#B0C4BF]">
                Each month you can add books to your reading list up to your tier's limit. At the start of the next 
                billing cycle, you can select new books. Your reading progress and bookmarks are always saved.
              </p>
            </div>
            
            <div className="glass-card rounded-sm p-6 bg-surface border border-gold/10">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">Can I buy PDFs without subscribing?</h3>
              <p className="text-[#B0C4BF]">
                Yes! With Tier 0 (Pay Per Book), you can purchase individual PDFs and own them forever without 
                any monthly subscription.
              </p>
            </div>
            
            <div className="glass-card rounded-sm p-6 bg-surface border border-gold/10">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">What are Volume and Advanced books?</h3>
              <p className="text-[#B0C4BF]">
                Volume books are multi-volume collections available for Tier 3 and above. Advanced books are 
                specialized scholarly works available to Tier 4 (Premium) members.
              </p>
            </div>
            
            <div className="glass-card rounded-sm p-6 bg-surface border border-gold/10">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">How do I cancel my subscription?</h3>
              <p className="text-[#B0C4BF]">
                Contact us at sales@dar-us-salam.com to cancel. Your access continues until the end of your 
                billing period.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-surface border-t border-[rgba(212,175,55,0.2)] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Kitab Cloud" className="w-8 h-8 rounded-sm object-cover" />
              <span className="font-serif text-lg text-[#FDFBF7]">Dar-Us-Salam Kitab Cloud</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-[#B0C4BF] hover:text-gold text-sm transition-colors">
                Privacy Policy
              </Link>
              <p className="text-[#B0C4BF] text-sm">
                © {new Date().getFullYear()} Dar-Us-Salam Publications
              </p>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={showDiscountPopup} onOpenChange={(open) => {
        if (!open) {
          setShowDiscountPopup(false);
          setPendingTier(null);
          setPopupDiscountCode('');
          setPopupDiscountInfo(null);
        }
      }}>
        <DialogContent className="bg-surface border-gold/30 text-[#FDFBF7] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Ticket className="w-5 h-5 text-gold" />
              Before You Subscribe
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="text-[#B0C4BF] text-sm">
              Have a discount code? Enter it below before proceeding to checkout.
            </p>
            
            {popupDiscountInfo ? (
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gold font-mono font-bold">{popupDiscountInfo.code}</span>
                  <button 
                    onClick={() => setPopupDiscountInfo(null)} 
                    className="text-[#B0C4BF] hover:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-sm text-[#FDFBF7]">{popupDiscountInfo.name}</p>
                <p className="text-xs text-[#B0C4BF] mt-1">{popupDiscountInfo.description}</p>
                {popupDiscountInfo.savings > 0 && (
                  <p className="text-sm text-green-400 mt-2">
                    You save ${popupDiscountInfo.savings.toFixed(2)} on your first month!
                  </p>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter discount code"
                  value={popupDiscountCode}
                  onChange={(e) => setPopupDiscountCode(e.target.value.toUpperCase())}
                  className="bg-[#082E26] border-gold/30 text-[#FDFBF7] uppercase"
                  data-testid="popup-discount-input"
                  onKeyDown={(e) => e.key === 'Enter' && validatePopupDiscount()}
                />
                <Button
                  onClick={validatePopupDiscount}
                  disabled={popupLoading || !popupDiscountCode.trim()}
                  className="bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30"
                  data-testid="popup-apply-discount-btn"
                >
                  {popupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            )}
            
            {visibleDiscounts.length > 0 && !popupDiscountInfo && (
              <div className="text-xs text-[#B0C4BF] bg-[#082E26] rounded p-2">
                <span className="text-gold">Tip:</span> Try code{' '}
                <button 
                  onClick={() => setPopupDiscountCode(visibleDiscounts[0].code)}
                  className="text-gold hover:underline font-mono"
                >
                  {visibleDiscounts[0].code}
                </button>
                {' '}for a special discount!
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => proceedToCheckout(false)}
                variant="outline"
                className="flex-1 border-gold/30 text-[#B0C4BF] hover:text-[#FDFBF7]"
                data-testid="popup-skip-btn"
              >
                Skip & Checkout
              </Button>
              <Button
                onClick={() => proceedToCheckout(true)}
                disabled={!popupDiscountInfo}
                className="flex-1 bg-gold text-[#02120F] hover:bg-[#E9C85C] disabled:opacity-50"
                data-testid="popup-checkout-btn"
              >
                {popupDiscountInfo ? 'Checkout with Discount' : 'Apply Code First'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {paymentModal.show && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-gold/30 rounded-lg max-w-md w-full p-6 relative">
            <button 
              onClick={() => setPaymentModal({ show: false, url: null })}
              className="absolute top-4 right-4 text-[#B0C4BF] hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-serif text-xl text-[#FDFBF7] mb-2">Complete Payment</h3>
              <p className="text-[#B0C4BF] mb-6">
                Tap the button below to open secure checkout in your browser.
              </p>
              
              <a 
                href={paymentModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-4 px-8 rounded-md w-full transition-colors"
                onClick={() => setPaymentModal({ show: false, url: null })}
                data-testid="external-payment-link"
              >
                <ExternalLink className="w-5 h-5" />
                Open Secure Checkout
              </a>
              
              <p className="text-xs text-[#B0C4BF] mt-4">
                You'll be redirected to Stripe's secure payment page
              </p>
              <Link to="/privacy" className="text-xs text-gold hover:underline mt-2 inline-block">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;