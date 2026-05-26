import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Check, ArrowRight, ArrowLeft, Crown, ExternalLink, X, Tag, Loader2, Ticket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import Logo from '../components/Logo';
import { openPaymentUrl } from '../utils/browser';
import { shouldDisablePurchases, getWebsiteUrl } from '../utils/platform';
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
  const [tiers, setTiers] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [isIOSApp, setIsIOSApp] = useState(false);
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [visibleDiscounts, setVisibleDiscounts] = useState([]);
  const [selectedTierForDiscount, setSelectedTierForDiscount] = useState(null);
  
  // Discount popup state
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [pendingTier, setPendingTier] = useState(null);
  const [popupDiscountCode, setPopupDiscountCode] = useState('');
  const [popupDiscountInfo, setPopupDiscountInfo] = useState(null);
  const [popupLoading, setPopupLoading] = useState(false);

  // Check if iOS app (disable purchases)
  useEffect(() => {
    setIsIOSApp(shouldDisablePurchases());
  }, []);

  // Default features for each tier
  const tierFeatures = {
    0: ["Buy individual PDFs", "Own books forever", "No monthly commitment", "Access anytime", "Email support"],
    1: ["books per month", "Standard library access", "Bookmarks & progress tracking", "Favorites list", "Email support"],
    2: ["books per month", "Standard library access", "Bookmarks & progress tracking", "Favorites list", "Email support"],
    3: ["books per month", "Volume books included", "In-book text search", "Bookmarks & progress tracking", "Email support"],
    4: ["Unlimited books", "All books including advanced", "Volume books included", "In-book text search", "Email support"]
  };

  useEffect(() => {
    fetchTiers();
    // Only fetch discounts if not iOS (no purchases on iOS)
    if (!shouldDisablePurchases()) {
      fetchVisibleDiscounts();
    }
  }, []);

  const fetchVisibleDiscounts = async () => {
    try {
      const response = await axios.get(`${API}/discount/visible`);
      setVisibleDiscounts(response.data.discounts || []);
    } catch (error) {
      console.error('Error fetching visible discounts:', error);
    }
  };

  const applyDiscountCode = async (tierNum) => {
    if (!discountCode.trim()) {
      toast.error('Please enter a discount code');
      return;
    }
    
    if (!token) {
      toast.error('Please login to apply discount code');
      return;
    }
    
    setDiscountLoading(true);
    setSelectedTierForDiscount(tierNum);
    
    try {
      const response = await axios.post(
        `${API}/discount/validate`,
        { code: discountCode.trim(), tier: tierNum },
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );
      
      setDiscountInfo(response.data);
      toast.success(`Discount applied: ${response.data.description}`);
    } catch (error) {
      console.error('Error validating discount:', error);
      toast.error(error.response?.data?.detail || 'Invalid discount code');
      setDiscountInfo(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  const clearDiscount = () => {
    setDiscountCode('');
    setDiscountInfo(null);
    setSelectedTierForDiscount(null);
  };

  const fetchTiers = async () => {
    try {
      const response = await axios.get(`${API}/tiers`);
      const tiersData = response.data;
      
      // Convert to array format with features
      const tiersArray = Object.entries(tiersData).map(([tierNum, tierInfo]) => {
        const tier = parseInt(tierNum);
        const bookLimit = tierInfo.book_limit;
        let features = [...(tierFeatures[tier] || tierFeatures[1])];
        
        // Update book limit in features
        if (tier > 0 && tier < 4 && bookLimit) {
          features[0] = `${bookLimit} books per month`;
        }
        
        return {
          tier,
          name: tierInfo.name,
          price: tierInfo.price,
          bookLimit: tierInfo.book_limit,
          features,
          color: `tier-${tier}`,
          perBook: tier === 0,
          featured: tier === 4
        };
      }).sort((a, b) => a.tier - b.tier);
      
      setTiers(tiersArray);
    } catch (error) {
      console.error('Error fetching tiers:', error);
      // Fallback to defaults
      setTiers([
        { tier: 0, name: "Pay Per Book", price: 0, features: tierFeatures[0], color: "tier-0", perBook: true },
        { tier: 1, name: "Basic", price: 20, features: ["10 books per month", ...tierFeatures[1].slice(1)], color: "tier-1" },
        { tier: 2, name: "Standard", price: 40, features: ["20 books per month", ...tierFeatures[2].slice(1)], color: "tier-2" },
        { tier: 3, name: "Advanced", price: 60, features: ["30 books per month", ...tierFeatures[3].slice(1)], color: "tier-3" },
        { tier: 4, name: "Premium", price: 80, features: tierFeatures[4], color: "tier-4", featured: true }
      ]);
    } finally {
      setTiersLoading(false);
    }
  };

  const handleSubscribe = async (tier) => {
    if (tier === 0) {
      // Tier 0 is pay-per-book, redirect to library
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

    setLoading(tier);
    
    try {
      // Use Stripe for all platforms
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Include discount code if applied and matches this tier
      const requestData = {
        tier,
        origin_url: window.location.origin
      };
      
      if (discountInfo && selectedTierForDiscount === tier) {
        requestData.discount_code = discountCode;
      }
      
      const response = await axios.post(`${API}/payments/create-checkout`, requestData, { headers, withCredentials: true });

      // Open payment URL
      const result = await openPaymentUrl(response.data.url);
      
      // On iOS, show modal with tappable link
      if (result.showModal) {
        setPaymentModal({ show: true, url: result.url });
        setLoading(null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to process payment');
      setLoading(null);
    }
  };

  const userTier = user?.subscription_tier || 0;

  return (
    <div className="min-h-screen bg-dark">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo testId="pricing-logo" />
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/library">
                <Button variant="ghost" className="text-[#B0C4BF] hover:text-[#FDFBF7] hover:bg-[#082E26]" data-testid="back-library-btn">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Library
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-[#B0C4BF] hover:text-[#FDFBF7] hover:bg-[#082E26]" data-testid="login-btn">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-medium" data-testid="register-btn">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Promotional Banner for Visible Discounts - Hide on iOS */}
      {!isIOSApp && visibleDiscounts.length > 0 && (
        <div className="bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border-b border-gold/30">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {visibleDiscounts.map((discount) => (
                <div key={discount.discount_id} className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gold" />
                  <span className="text-gold font-medium">
                    {discount.banner_text || `Use code ${discount.code} for ${discount.discount_type === 'percentage' ? `${discount.value}% off` : discount.discount_type === 'free_trial' ? `${discount.value} day free trial` : 'a discount'}!`}
                  </span>
                  <button
                    onClick={() => { setDiscountCode(discount.code); toast.success(`Code "${discount.code}" added! Select a plan to apply.`); }}
                    className="text-xs bg-gold/20 hover:bg-gold/30 text-gold px-2 py-1 rounded transition-colors"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gold uppercase tracking-[0.2em] text-sm font-medium mb-4">Membership Plans</p>
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-[#FDFBF7] tracking-tight mb-6">
            {isIOSApp ? 'View Our Plans' : 'Choose Your Access Level'}
          </h1>
          <p className="text-xl text-[#B0C4BF] max-w-2xl mx-auto">
            {isIOSApp 
              ? 'To subscribe or purchase books, please visit our website. Then log in here to access your content.'
              : 'Subscribe monthly to read books, or buy individual PDFs without a subscription.'
            }
          </p>
          
          {/* iOS App - Website Link (tappable) */}
          {isIOSApp && (
            <div className="mt-8">
              <a 
                href={`${getWebsiteUrl()}/pricing`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Visit Website to Subscribe
              </a>
              <p className="text-sm text-[#B0C4BF] mt-4">
                Already have a subscription? <Link to="/login" className="text-gold hover:underline">Log in</Link> to access your books.
              </p>
            </div>
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

      {/* Discount Code Section - Hide on iOS */}
      {!isIOSApp && (
      <section className="pb-8">
        <div className="max-w-md mx-auto px-6">
          <div className="glass-card p-4 rounded-lg border border-gold/30">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-5 h-5 text-gold" />
              <span className="text-[#FDFBF7] font-medium">Have a discount code?</span>
            </div>
            
            {discountInfo ? (
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gold font-mono font-bold">{discountInfo.code}</span>
                  <button onClick={clearDiscount} className="text-[#B0C4BF] hover:text-red-400 text-sm">
                    Remove
                  </button>
                </div>
                <p className="text-sm text-[#FDFBF7]">{discountInfo.name}</p>
                <p className="text-xs text-[#B0C4BF] mt-1">{discountInfo.description}</p>
                {discountInfo.savings > 0 && (
                  <p className="text-sm text-green-400 mt-2">
                    You save ${discountInfo.savings.toFixed(2)} on your first month!
                  </p>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  className="bg-surface border-gold/30 text-[#FDFBF7] uppercase"
                  data-testid="discount-code-input"
                />
                <Button
                  onClick={() => {
                    if (!user) {
                      toast.error('Please login to apply discount code');
                      return;
                    }
                    // Apply to recommended tier (tier 4) by default
                    applyDiscountCode(4);
                  }}
                  disabled={discountLoading || !discountCode.trim()}
                  className="bg-gold text-[#02120F] hover:bg-[#E9C85C] whitespace-nowrap"
                  data-testid="apply-discount-btn"
                >
                  {discountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Pricing Cards - Show features only on iOS, full cards on web */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {tiersLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : isIOSApp ? (
            /* iOS App - Feature comparison only, no purchase buttons */
            <div className="space-y-8">
              <p className="text-center text-[#B0C4BF] mb-8">
                Browse our subscription tiers below. Visit our website to subscribe.
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {tiers.filter(t => t.tier > 0).map((tier) => (
                  <div 
                    key={tier.tier}
                    className={`rounded-lg border p-6 ${
                      tier.featured 
                        ? 'bg-gradient-to-b from-gold/20 to-gold/5 border-gold' 
                        : 'bg-surface border-[rgba(212,175,55,0.2)]'
                    } ${userTier === tier.tier ? 'ring-2 ring-gold' : ''}`}
                  >
                    <div className={`tier-badge ${tier.color} inline-block mb-3`}>
                      Tier {tier.tier}
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[#FDFBF7] mb-4">
                      {tier.name}
                    </h3>
                    <ul className="space-y-2">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-[#B0C4BF]">
                          <Check className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {userTier === tier.tier && (
                      <div className="mt-4 text-center text-gold text-sm font-medium">
                        ✓ Your Current Plan
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <a 
                  href={`${getWebsiteUrl()}/pricing`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
                >
                  <ExternalLink className="w-5 h-5" />
                  Subscribe on Website
                </a>
              </div>
            </div>
          ) : (
          /* Web/Android - Full pricing cards with purchase buttons */
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {tiers.map((tier) => (
              <div 
                key={tier.tier}
                className={`relative rounded-sm border ${
                  tier.featured 
                    ? 'bg-gradient-to-b from-gold/20 to-gold/5 border-gold scale-105 lg:scale-110 shadow-lg shadow-gold/20' 
                    : 'bg-surface border-[rgba(212,175,55,0.2)]'
                } ${userTier === tier.tier ? 'ring-2 ring-gold' : ''}`}
                data-testid={`pricing-tier-${tier.tier}`}
              >
                <div className="p-6">
                  {tier.featured && (
                    <div className="text-xs font-mono text-gold uppercase tracking-wider mb-2 text-center">
                      Popular Choice
                    </div>
                  )}
                  
                  {/* Discount Badge */}
                  {tier.tier > 0 && visibleDiscounts.some(d => !d.applicable_tiers || d.applicable_tiers.includes(tier.tier)) && (
                    <div className="absolute -top-3 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {visibleDiscounts.find(d => !d.applicable_tiers || d.applicable_tiers.includes(tier.tier))?.badge_text || 'DEAL'}
                    </div>
                  )}
                  
                  <div className={`tier-badge ${tier.color} inline-block mb-3`}>
                    {tier.tier === 0 ? 'No Sub' : `Tier ${tier.tier}`}
                  </div>
                  
                  <h3 className="font-serif text-2xl font-semibold text-[#FDFBF7] mb-2">
                    {tier.name}
                  </h3>
                  
                  <div className="flex items-baseline gap-1 mb-6">
                    {tier.perBook ? (
                      <span className="text-lg text-gold">Pay per book</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gold">${tier.price}</span>
                        <span className="text-[#B0C4BF]">/mo</span>
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[#B0C4BF]">
                        <Check className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handleSubscribe(tier.tier)}
                    disabled={loading === tier.tier || (tier.tier !== 0 && userTier >= tier.tier)}
                    className={`w-full ${
                      tier.featured || tier.tier === 0 || userTier < tier.tier
                        ? 'bg-gold text-[#02120F] hover:bg-[#E9C85C]' 
                        : 'bg-surface text-[#B0C4BF]'
                    } font-semibold`}
                    data-testid={`subscribe-tier-${tier.tier}`}
                  >
                    {loading === tier.tier ? (
                      'Processing...'
                    ) : tier.tier === 0 ? (
                      'Browse Books'
                    ) : userTier === tier.tier ? (
                      'Current Plan'
                    ) : userTier > tier.tier ? (
                      'Included'
                    ) : (
                      <>
                        Subscribe <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-serif text-3xl text-[#FDFBF7] text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="glass-card rounded-sm p-6">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">How does the monthly book limit work?</h3>
              <p className="text-[#B0C4BF]">
                Each month you can add books to your reading list up to your tier's limit. At the start of the next 
                billing cycle, you can select new books. Your reading progress and bookmarks are always saved.
              </p>
            </div>
            
            <div className="glass-card rounded-sm p-6">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">Can I buy PDFs without subscribing?</h3>
              <p className="text-[#B0C4BF]">
                Yes! With Tier 0 (Pay Per Book), you can purchase individual PDFs and own them forever without 
                any monthly subscription.
              </p>
            </div>
            
            <div className="glass-card rounded-sm p-6">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">What are Volume and Advanced books?</h3>
              <p className="text-[#B0C4BF]">
                Volume books are multi-volume collections available for Tier 3 and above. Advanced books are 
                specialized scholarly works available to Tier 4 (Premium) members.
              </p>
            </div>
            
            <div className="glass-card rounded-sm p-6">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">How do I cancel my subscription?</h3>
              <p className="text-[#B0C4BF]">
                Contact us at sales@dar-us-salam.com to cancel. Your access continues until the end of your 
                billing period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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

      {/* iOS Payment Modal - Shows tappable link to open in external browser */}
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
              
              {/* This is an actual anchor tag - iOS allows user taps on real links to open externally */}
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
