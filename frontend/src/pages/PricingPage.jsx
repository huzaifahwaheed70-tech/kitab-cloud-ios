import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App.js';
import axios from 'axios';
import { BookOpen, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { buySubscription } from '../purchase';

const PricingPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const platform = Capacitor.getPlatform();
  const isIOS = platform === 'ios';

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

  const handleSubscribe = async (tier) => {
    if (tier === 0) {
      navigate(user ? '/library' : '/register');
      return;
    }

    if (!user) {
      navigate('/register');
      return;
    }

    if (user.subscription_tier >= tier) {
      toast.info(`You already have Tier ${user.subscription_tier} or higher`);
      return;
    }

    setLoading(tier);

    if (isIOS) {
      try {
        await buySubscription(tier);
        setLoading(null);
      } catch (error) {
        toast.error('Failed to initiate Apple purchase');
        setLoading(null);
      }
    } else {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.post(`${API}/payments/create-checkout`, {
          tier,
          origin_url: 'https://kitab-cloud.emergent.host'
        }, { headers, withCredentials: true });

        window.location.href = response.data.url;
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to start checkout');
        setLoading(null);
      }
    }
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
          <h1 className="font-serif text-4xl md:text-6xl font-bold text-[#FDFBF7] mb-6">Choose Your Access Level</h1>
          <p className="text-xl text-[#B0C4BF] max-w-2xl mx-auto">Subscribe monthly to read books, or buy individual PDFs.</p>
          {isIOS && (
            <p className="text-sm text-gold mt-4">Subscriptions are processed securely through Apple.</p>
          )}
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 lg:grid-cols-5 gap-6">
          {tiers.map((tier) => (
            <div key={tier.tier} className={`rounded-sm border p-6 ${tier.featured ? 'bg-gold/10 border-gold' : 'bg-surface border-gold/20'}`}>
              <div className={`tier-badge ${tier.color} mb-3`}>{tier.tier === 0 ? 'No Sub' : `Tier ${tier.tier}`}</div>
              <h3 className="font-serif text-2xl font-semibold text-[#FDFBF7] mb-2">{tier.name}</h3>
              <div className="text-4xl font-bold text-gold mb-6">${tier.price}<span className="text-base text-[#B0C4BF]">/mo</span></div>
              <ul className="space-y-3 mb-6">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#B0C4BF]">
                    <Check className="w-4 h-4 text-gold" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(tier.tier)}
                disabled={loading === tier.tier || (tier.tier !== 0 && userTier >= tier.tier)}
                className="w-full bg-gold text-[#02120F]"
              >
                {loading === tier.tier ? 'Processing...' : (
                  <>
                    {isIOS ? 'Subscribe with Apple' : 'Subscribe'}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
