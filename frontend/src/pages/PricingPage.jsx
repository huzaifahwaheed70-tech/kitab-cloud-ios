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
      return;
    }

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
  };

  const userTier = user?.subscription_tier || 0;

  return (
    <div className="min-h-screen bg-dark">
      <nav className="glass sticky top-0 z-50 border-b border-[