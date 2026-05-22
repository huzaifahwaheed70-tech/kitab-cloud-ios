import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Library, Shield, Sparkles, ArrowRight, ShoppingCart, Lock, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

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

  const features = [
    {
      icon: <Library className="w-8 h-8" />,
      title: "Digital Book Collection",
      description: "Access Islamic texts from the Dar-Us-Salam collection in digital format."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Monthly Reading Plans",
      description: "Choose from 4 subscription tiers. Select your books each month based on your plan."
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Buy Individual PDFs",
      description: "Don't want a subscription? Purchase individual book PDFs to own forever."
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Advanced Search (Tier 3+)",
      description: "Search within books to find exact text passages. Available for Advanced and Premium members."
    }
  ];

  const tiers = [
    { tier: 0, name: "Pay Per Book", features: ["Buy individual PDFs", "Own forever", "No monthly fee"], perBook: true },
    { tier: 1, name: "Basic", features: ["Monthly book allowance", "Standard library", "Email support"] },
    { tier: 2, name: "Standard", features: ["Expanded book allowance", "Standard library", "Email support"] },
    { tier: 3, name: "Advanced", features: ["Enhanced book allowance", "Volume books access", "In-book search"] },
    { tier: 4, name: "Premium", features: ["Unlimited books", "All books including advanced", "In-book search"], featured: true },
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
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3 min-h-[44px]" data-testid="nav-logo">
            <img src="/logo.png" alt="Kitab Cloud" className="w-9 h-9 md:w-10 md:h-10 rounded-sm object-cover" />
            <span className="font-serif text-lg md:text-xl font-semibold text-[#FDFBF7]">Kitab Cloud</span>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/login">
              <Button variant="ghost" className="text-[#FDFBF7] hover:bg-[#082E26] min-h-[44px] px-3 md:px-4" data-testid="login-btn">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-medium min-h-[44px] px-3 md:px-4" data-testid="register-btn">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-6xl font-bold text-[#FDFBF7] mb-6">
            Your Digital Islamic
            <span className="text-gold block">Library</span>
          </h1>
          <p className="text-base md:text-lg text-[#B0C4BF] max-w-2xl mx-auto mb-8 px-2">
            Access the complete Dar-Us-Salam digital collection. Subscribe monthly or buy individual books.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Link to="/register">
              <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold px-8 min-h-[48px] w-full sm:w-auto" data-testid="hero-cta">
                Start Reading
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#browse-books">
              <Button size="lg" variant="outline" className="border-gold text-gold hover:bg-gold/10 px-8 min-h-[48px] w-full sm:w-auto">
                Browse Books
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Browse Books Section */}
      <section id="browse-books" className="py-16 px-4 md:px-6 bg-[#082E26]/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#FDFBF7] mb-4">Browse Our Collection</h2>
            <p className="text-[#B0C4BF]">Preview our library. Sign up to start reading!</p>
          </div>
          
          {loadingBooks ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              {books.map((book) => (
                <div 
                  key={book.book_id} 
                  className="glass-card rounded-sm overflow-hidden group hover:border-gold/50 transition-all"
                  data-testid={`preview-book-${book.book_id}`}
                >
                  {/* Book Cover */}
                  <div className="aspect-[3/4] relative bg-gradient-to-br from-[#004D40] to-[#00332A]">
                    {book.cover_url ? (
                      <img 
                        src={`${process.env.REACT_APP_BACKEND_URL}/api/covers/${book.cover_url.replace('darussalam-kitab/covers/', '')}`}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src="/logo.png" alt="Book" className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                    
                    {/* Tier Badge */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getTierBadgeClass(book.tier_level)}`}>
                        <Lock className="w-3 h-3" />
                        Tier {book.tier_level}
                      </span>
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#02120F] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <Link to="/register">
                        <Button size="sm" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] min-h-[44px]">
                          Sign Up to Read
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Book Info */}
                  <div className="p-3">
                    <h3 className="font-serif text-sm text-[#FDFBF7] line-clamp-2 mb-1">{book.title}</h3>
                    <p className="text-xs text-gold font-mono">{book.darussalam_code}</p>
                    {book.pdf_price && (
                      <p className="text-xs text-gold mt-1">PDF Available</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-center mt-8">
            <Link to="/register">
              <Button variant="outline" className="border-gold text-gold hover:bg-gold/10">
                View All Books
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-[#FDFBF7] text-center mb-12">Why Kitab Cloud?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="glass-card p-6 rounded-sm hover:border-gold/30 transition-all">
                <div className="w-14 h-14 rounded-sm bg-gold/10 flex items-center justify-center text-gold mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-serif text-lg text-[#FDFBF7] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#B0C4BF]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-6 bg-[#082E26]/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl font-bold text-[#FDFBF7] text-center mb-4">Simple Pricing</h2>
          <p className="text-[#B0C4BF] text-center mb-12">Choose the plan that fits your reading goals</p>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tiers.map((tier) => (
              <div 
                key={tier.tier}
                className={`glass-card rounded-sm p-6 ${tier.featured ? 'border-gold ring-2 ring-gold/20' : ''}`}
              >
                {tier.featured && (
                  <span className="text-xs font-semibold text-gold mb-2 block">RECOMMENDED</span>
                )}
                <h3 className="font-serif text-lg text-[#FDFBF7] mb-1">{tier.name}</h3>
                <div className="mb-4">
                  {tier.perBook ? (
                    <span className="text-[#B0C4BF] text-sm">Pay per book</span>
                  ) : (
                    <span className="text-gold text-sm">Monthly Plan</span>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="text-sm text-[#B0C4BF] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button 
                    className={`w-full ${tier.featured ? 'bg-gold text-[#02120F] hover:bg-[#E9C85C]' : 'bg-[#082E26] text-[#FDFBF7] hover:bg-[#0A3D33]'}`}
                    size="sm"
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold text-[#FDFBF7] mb-4">Ready to Start Reading?</h2>
          <p className="text-[#B0C4BF] mb-8">Join readers accessing the Dar-Us-Salam digital library.</p>
          <Link to="/register">
            <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold px-8">
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-[rgba(212,175,55,0.2)] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Kitab Cloud" className="w-8 h-8 rounded-sm object-cover" />
            <span className="font-serif text-[#FDFBF7]">Kitab Cloud</span>
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
