import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Library, Shield, Sparkles, ArrowRight, ShoppingCart, Lock, ExternalLink, Tag, BookOpen, Star, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { shouldHideExternalPurchases, shouldHideDiscounts } from '../utils/platform';

// Custom hook for scroll animations
const useScrollAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
};

// Animated section component with slide directions
const AnimatedSection = ({ children, className = '', delay = 0, direction = 'up' }) => {
  const [ref, isVisible] = useScrollAnimation();
  
  const getTransform = () => {
    if (isVisible) return 'translate(0, 0)';
    switch (direction) {
      case 'left': return 'translateX(-50px)';
      case 'right': return 'translateX(50px)';
      case 'down': return 'translateY(-30px)';
      default: return 'translateY(30px)';
    }
  };
  
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
};

// Sliding text animation component
const SlidingText = ({ texts, className = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % texts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [texts.length]);
  
  return (
    <div className={`relative h-8 overflow-hidden ${className}`}>
      {texts.map((text, i) => (
        <div
          key={i}
          className="absolute w-full transition-all duration-500 ease-in-out"
          style={{
            transform: `translateY(${(i - currentIndex) * 100}%)`,
            opacity: i === currentIndex ? 1 : 0
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
};

const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [visibleDiscounts, setVisibleDiscounts] = useState([]);
  const [isIOSApp, setIsIOSApp] = useState(false);
  const [headerBlur, setHeaderBlur] = useState(false);

  // Header blur on scroll
  useEffect(() => {
    const handleScroll = () => {
      setHeaderBlur(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if iOS app (for hiding external purchases)
  useEffect(() => {
    setIsIOSApp(shouldHideExternalPurchases());
  }, []);

  // Auto-redirect to library if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/library', { replace: true });
    }
  }, [user, loading, navigate]);

  // Fetch books for preview
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await axios.get(`${API}/books/all`);
        setBooks(response.data.slice(0, 8)); // Show first 8 books
      } catch (error) {
        console.error('Error fetching books:', error);
      } finally {
        setLoadingBooks(false);
      }
    };
    fetchBooks();
  }, []);

  // Fetch visible discounts - only on web, not iOS (Apple has their own discounts)
  useEffect(() => {
    if (!shouldHideDiscounts()) {
      const fetchDiscounts = async () => {
        try {
          const response = await axios.get(`${API}/discount/visible`);
          setVisibleDiscounts(response.data.discounts || []);
        } catch (error) {
          console.error('Error fetching discounts:', error);
        }
      };
      fetchDiscounts();
    }
  }, []);

  const features = [
    {
      icon: <Library className="w-7 h-7" />,
      title: "Digital Book Collection",
      description: "Access Islamic texts from the Dar-Us-Salam collection in digital format."
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: "Monthly Reading Plans",
      description: "Choose from 4 subscription tiers. Select your books each month based on your plan."
    },
    {
      icon: <ShoppingCart className="w-7 h-7" />,
      title: "Buy Individual PDFs",
      description: "Don't want a subscription? Purchase individual book PDFs to own forever."
    },
    {
      icon: <Sparkles className="w-7 h-7" />,
      title: "Advanced Search (Tier 3+)",
      description: "Search within books to find exact text passages. Available for Advanced and Premium members."
    }
  ];

  const tiers = [
    { tier: 0, name: "Pay Per Book", price: 0, features: ["Buy individual PDFs", "Own forever", "No monthly fee"], perBook: true },
    { tier: 1, name: "Basic", price: 8.95, features: ["10 books/month", "Standard library", "Email support"] },
    { tier: 2, name: "Standard", price: 14.95, features: ["20 books/month", "Standard library", "Email support"] },
    { tier: 3, name: "Advanced", price: 29.95, features: ["30 books/month", "Volume books access", "In-book search"] },
    { tier: 4, name: "Premium", price: 44.95, features: ["Unlimited books", "All books including advanced", "In-book search"], featured: true },
  ];

  const getTierBadgeClass = (tier) => {
    const classes = {
      1: 'bg-blue-500/20 text-blue-400',
      2: 'bg-purple-500/20 text-purple-400',
      3: 'bg-gold/20 text-gold',
      4: 'bg-gradient-to-r from-gold/30 to-amber-500/30 text-gold'
    };
    return classes[tier] || 'bg-gray-500/20 text-gray-400';
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark relative noise-overlay">
      {/* Navigation with blur on scroll */}
      <nav className={`sticky top-0 z-50 border-b border-[rgba(212,175,55,0.2)] transition-all duration-300 ${
        headerBlur 
          ? 'bg-[#02120F]/80 backdrop-blur-xl shadow-lg shadow-black/20' 
          : 'bg-[#02120F]/95 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3 min-h-[44px] group" data-testid="nav-logo">
            <img 
              src="/logo.png" 
              alt="Kitab Cloud" 
              className="w-9 h-9 md:w-10 md:h-10 rounded-lg object-cover transition-transform duration-300 group-hover:scale-105" 
            />
            <div className="flex flex-col">
              <span className="font-serif text-lg md:text-xl font-semibold text-[#FDFBF7] leading-tight">Kitab Cloud</span>
              <span className="text-[10px] md:text-xs text-[#B0C4BF] leading-tight">By Dar-Us-Salam.com</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/login">
              <Button 
                variant="ghost" 
                className="text-[#FDFBF7] hover:bg-[#082E26] min-h-[44px] px-3 md:px-4 rounded-xl transition-all duration-200 hover:scale-105" 
                data-testid="login-btn"
              >
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button 
                className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-medium min-h-[44px] px-4 md:px-6 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-gold/20" 
                data-testid="register-btn"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Promotional Banner for Visible Discounts - Hide on iOS */}
      {!isIOSApp && visibleDiscounts.length > 0 && (
        <div className="bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border-b border-gold/30">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-gold" />
              <span className="text-gold font-medium text-sm md:text-base">
                {visibleDiscounts[0].banner_text || `Use code ${visibleDiscounts[0].code} for a special discount!`}
              </span>
              <Link to="/pricing">
                <Button size="sm" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] text-xs ml-2">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 px-4 md:px-6 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }}></div>
          {/* Floating book decorations */}
          <div className="absolute top-20 left-10 w-8 h-10 bg-gold/10 rounded transform rotate-12 animate-bounce" style={{ animationDuration: '3s' }}></div>
          <div className="absolute top-40 right-20 w-6 h-8 bg-emerald-500/10 rounded transform -rotate-12 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
          <div className="absolute bottom-40 left-20 w-10 h-12 bg-gold/5 rounded transform rotate-6 animate-bounce" style={{ animationDuration: '5s', animationDelay: '0.5s' }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <AnimatedSection direction="down">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-full px-4 py-2 mb-8">
              <BookOpen className="w-4 h-4 text-gold animate-pulse" />
              <span className="text-sm text-gold font-medium">Your Digital Islamic Library</span>
            </div>
          </AnimatedSection>
          
          <AnimatedSection delay={100}>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl font-bold text-[#FDFBF7] mb-6 leading-tight">
              Knowledge at Your
              <span className="text-gold block mt-2">Fingertips</span>
            </h1>
          </AnimatedSection>
          
          <AnimatedSection delay={200}>
            <p className="text-lg md:text-xl text-[#B0C4BF] max-w-2xl mx-auto mb-4 px-2 leading-relaxed">
              Explore a curated selection of authentic Islamic books from Dar-Us-Salam Publications.
            </p>
            <SlidingText 
              texts={[
                <span key="1" className="text-gold">Read anytime, anywhere</span>,
                <span key="2" className="text-emerald-400">Download for offline access</span>,
                <span key="3" className="text-gold">New books added regularly</span>,
                <span key="4" className="text-emerald-400">Track your reading progress</span>
              ]}
              className="text-lg md:text-xl mb-6"
            />
          </AnimatedSection>
          
          <AnimatedSection delay={300} direction="up">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4 mt-6">
              {isIOSApp ? (
                <>
                  <Link to="/login">
                    <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold px-8 min-h-[52px] w-full sm:w-auto rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-gold/30" data-testid="hero-cta">
                      Log In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/library">
                    <Button size="lg" variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 px-8 min-h-[52px] w-full sm:w-auto rounded-xl transition-all duration-200 hover:scale-105">
                      Browse Library
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold px-8 min-h-[52px] w-full sm:w-auto rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-gold/30" data-testid="hero-cta">
                      Start Reading
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <a href="#browse-books">
                    <Button size="lg" variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 px-8 min-h-[52px] w-full sm:w-auto rounded-xl transition-all duration-200 hover:scale-105">
                      Browse Books
                    </Button>
                  </a>
                </>
              )}
            </div>
          </AnimatedSection>
          
          {/* Stats */}
          <AnimatedSection delay={400}>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-16 pt-8 border-t border-gold/10">
              <AnimatedSection delay={450} direction="left" className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold mb-1">4</div>
                <div className="text-sm text-[#B0C4BF]">Subscription Tiers</div>
              </AnimatedSection>
              <AnimatedSection delay={500} direction="up" className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold mb-1">24/7</div>
                <div className="text-sm text-[#B0C4BF]">Access Anywhere</div>
              </AnimatedSection>
              <AnimatedSection delay={550} direction="right" className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gold mb-1">PDF</div>
                <div className="text-sm text-[#B0C4BF]">Own Forever</div>
              </AnimatedSection>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Browse Books Section */}
      <section id="browse-books" className="py-20 px-4 md:px-6 bg-gradient-to-b from-[#082E26]/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection direction="left">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#FDFBF7] mb-4">Browse Our Collection</h2>
              <p className="text-[#B0C4BF] text-lg">Preview our library. Sign up to start reading!</p>
            </div>
          </AnimatedSection>
          
          {loadingBooks ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {books.map((book, index) => (
                <AnimatedSection key={book.book_id} delay={index * 50}>
                  <div 
                    className="glass-card rounded-xl overflow-hidden group hover:border-gold/50 transition-all duration-300 hover:shadow-xl hover:shadow-gold/10 hover:-translate-y-1"
                  data-testid={`preview-book-${book.book_id}`}
                >
                  {/* Book Cover */}
                  <div className="aspect-[3/4] relative bg-gradient-to-br from-[#004D40] to-[#00332A]">
                    {book.cover_url ? (
                      <img 
                        src={`${process.env.REACT_APP_BACKEND_URL}/api/covers/${book.cover_url.replace('darussalam-kitab/covers/', '')}`}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#082E26] to-[#041815]">
                        <img src="/logo.png" alt="Book" className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                    
                    {/* Tier Badge */}
                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 backdrop-blur-sm ${getTierBadgeClass(book.tier_level)}`}>
                        <Lock className="w-3 h-3" />
                        Tier {book.tier_level}
                      </span>
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#02120F] via-[#02120F]/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-6">
                      <Link to="/register">
                        <Button size="sm" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] min-h-[44px] rounded-xl transition-all duration-200 hover:scale-105">
                          Sign Up to Read
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Book Info */}
                  <div className="p-4">
                    <h3 className="font-serif text-sm text-[#FDFBF7] line-clamp-2 mb-1 group-hover:text-gold transition-colors">{book.title}</h3>
                    <p className="text-xs text-gold/70 font-mono">{book.darussalam_code}</p>
                    {/* PDF price - Hide on iOS */}
                    {!isIOSApp && book.pdf_price && (
                      <p className="text-xs text-[#B0C4BF] mt-1">PDF: ${book.pdf_price}</p>
                    )}
                  </div>
                </div>
                </AnimatedSection>
              ))}
            </div>
          )}
          
          <AnimatedSection>
            <div className="text-center mt-12">
              {isIOSApp ? (
                <Link to="/login">
                  <Button variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 rounded-xl px-6 min-h-[48px] transition-all duration-200 hover:scale-105">
                    Log In to Browse
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 rounded-xl px-6 min-h-[48px] transition-all duration-200 hover:scale-105">
                    View All Books
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection direction="right">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#FDFBF7] text-center mb-4">Why Kitab Cloud?</h2>
            <p className="text-[#B0C4BF] text-center mb-12 max-w-2xl mx-auto">Everything you need for your Islamic reading journey</p>
          </AnimatedSection>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <AnimatedSection key={index} delay={index * 100} direction={index % 2 === 0 ? 'left' : 'right'}>
                <div className="glass-card p-6 rounded-2xl hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/5 hover:-translate-y-1 h-full group">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-gold mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">{feature.title}</h3>
                  <p className="text-sm text-[#B0C4BF]">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#082E26]/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection direction="left">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#FDFBF7] text-center mb-4">
              Simple Pricing
            </h2>
            <p className="text-[#B0C4BF] text-center mb-12 text-lg">
              Choose the plan that fits your reading goals
            </p>
          </AnimatedSection>
          
          {/* Pricing grid */}
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tiers.map((tier, index) => (
              <AnimatedSection key={tier.tier} delay={index * 100}>
                <div 
                  className={`glass-card rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${tier.featured ? 'border-gold ring-2 ring-gold/20 hover:shadow-gold/10' : 'hover:shadow-gold/5'}`}
                >
                  {tier.featured && (
                    <span className="text-xs font-semibold text-gold mb-2 block uppercase tracking-wider">Recommended</span>
                  )}
                  <h3 className="font-serif text-lg text-[#FDFBF7] mb-1">{tier.name}</h3>
                  <div className="mb-4">
                    {tier.perBook ? (
                      <span className="text-[#B0C4BF] text-sm">Pay per book</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-gold">${tier.price}</span>
                        <span className="text-[#B0C4BF]">/mo</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="text-sm text-[#B0C4BF] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gold rounded-full flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register">
                    <Button 
                      className={`w-full rounded-xl transition-all duration-200 hover:scale-[1.02] ${tier.featured ? 'bg-gold text-[#02120F] hover:bg-[#E9C85C] hover:shadow-lg hover:shadow-gold/20' : 'bg-[#082E26] text-[#FDFBF7] hover:bg-[#0A3D33]'}`}
                      size="sm"
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-3xl"></div>
        </div>
        
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#FDFBF7] mb-4">Ready to Start Reading?</h2>
            <p className="text-[#B0C4BF] mb-8 text-lg">Join readers accessing the Dar-Us-Salam digital library.</p>
            <Link to="/register">
              <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold px-8 min-h-[52px] rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-gold/30">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="bg-[#02120F]/80 backdrop-blur-sm border-t border-[rgba(212,175,55,0.2)] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kitab Cloud" className="w-8 h-8 rounded-lg object-cover" />
            <div className="flex flex-col">
              <span className="font-serif text-[#FDFBF7] leading-tight">Kitab Cloud</span>
              <span className="text-[10px] text-[#B0C4BF] leading-tight">By Dar-Us-Salam.com</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-sm text-[#B0C4BF] hover:text-gold transition-colors">
              Privacy Policy
            </Link>
            <p className="text-sm text-[#B0C4BF]">
              Powered by <a href="https://dar-us-salam.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Dar-Us-Salam</a>
            </p>
          </div>
          <a href="https://dar-us-salam.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline flex items-center gap-1">
            Visit Dar-Us-Salam.com <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
