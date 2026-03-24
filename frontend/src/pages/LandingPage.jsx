import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { BookOpen, Shield, Sparkles, ArrowRight, ShoppingCart, BookMarked } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: "Premium Digital Library",
      description: "Access hundreds of carefully digitized Islamic texts from the Dar-Us-Salam collection."
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
    { tier: 0, name: "Pay Per Book", price: 0, features: ["Buy individual PDFs", "Own forever", "No monthly fee"], perBook: true },
    { tier: 1, name: "Basic", price: 20, features: ["10 books/month", "Standard library", "Email support"] },
    { tier: 2, name: "Standard", price: 40, features: ["20 books/month", "Standard library", "Email support"] },
    { tier: 3, name: "Advanced", price: 60, features: ["30 books/month", "Volume books access", "In-book search"] },
    { tier: 4, name: "Premium", price: 80, features: ["Unlimited books", "All books including advanced", "In-book search"], featured: true },
  ];

  return (
    <div className="min-h-screen bg-dark relative noise-overlay">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="nav-logo">
            <div className="w-10 h-10 rounded-sm bg-gold flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#02120F]" />
            </div>
            <span className="font-serif text-xl font-semibold text-[#FDFBF7]">Kitab Cloud</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/library">
                <Button className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-medium" data-testid="enter-library-btn">
                  Enter Library
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

      {/* Hero Section */}
      <section className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1505664063603-28e48ca204eb?crop=entropy&cs=srgb&fm=jpg&q=85)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#02120F]/90 via-[#004D40]/80 to-[#02120F]" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-32 md:py-48">
          <div className="max-w-3xl">
            <p className="text-gold uppercase tracking-[0.2em] text-sm font-medium mb-6 animate-fade-in-up">
              Dar-Us-Salam Publications
            </p>
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-[#FDFBF7] leading-tight mb-6 tracking-tight animate-fade-in-up animate-delay-100">
              Your Digital<br />
              <span className="text-gradient-gold">Islamic Library</span>
            </h1>
            <p className="text-xl text-[#B0C4BF] mb-4 max-w-xl leading-relaxed animate-fade-in-up animate-delay-200">
              Access a curated collection of authentic Islamic literature. Subscribe monthly or buy individual PDFs.
            </p>
            <p className="text-lg text-gold mb-10 animate-fade-in-up animate-delay-200">
              <ShoppingCart className="w-5 h-5 inline mr-2" />
              Buy PDFs individually without a subscription!
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in-up animate-delay-300">
              <Link to={user ? "/library" : "/register"}>
                <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold text-lg px-8 py-6" data-testid="hero-cta-btn">
                  Start Reading <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="border-gold/50 text-gold hover:bg-gold/10 font-semibold text-lg px-8 py-6" data-testid="view-plans-btn">
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-gold uppercase tracking-[0.2em] text-sm font-medium mb-4">Why Choose Us</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#FDFBF7] tracking-tight">
              A Modern Approach to Islamic Learning
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="glass-card rounded-sm p-8 book-card-hover"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-sm bg-gold/10 flex items-center justify-center text-gold mb-6">
                  {feature.icon}
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#FDFBF7] mb-3">{feature.title}</h3>
                <p className="text-[#B0C4BF] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier Info */}
      <section className="py-16 bg-dark">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass-card rounded-sm p-8 border-gold/30">
            <h3 className="font-serif text-2xl text-[#FDFBF7] mb-6 text-center">What's Included in Each Tier</h3>
            <div className="grid md:grid-cols-2 gap-6 text-[#B0C4BF]">
              <div>
                <h4 className="text-gold font-medium mb-2">Volume Books (Tier 3+)</h4>
                <p className="text-sm">Multi-volume collections and comprehensive Islamic texts are only available for Advanced and Premium subscribers.</p>
              </div>
              <div>
                <h4 className="text-gold font-medium mb-2">Advanced Books (Tier 4 only)</h4>
                <p className="text-sm">Highly advanced Islamic scholarly works are exclusively available to Premium subscribers.</p>
              </div>
              <div>
                <h4 className="text-gold font-medium mb-2">In-Book Search (Tier 3+)</h4>
                <p className="text-sm">Search within any book to find specific text passages. Available for Advanced and Premium tiers.</p>
              </div>
              <div>
                <h4 className="text-gold font-medium mb-2">Bookmarks & Progress</h4>
                <p className="text-sm">All subscribers can bookmark pages and track reading progress across all their books.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 bg-surface relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-gold uppercase tracking-[0.2em] text-sm font-medium mb-4">Membership Tiers</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-[#FDFBF7] tracking-tight mb-4">
              Choose Your Access Level
            </h2>
            <p className="text-[#B0C4BF] max-w-2xl mx-auto">
              From buying individual PDFs to unlimited access, find the perfect plan for your learning journey.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {tiers.map((tier) => (
              <div 
                key={tier.tier}
                className={`rounded-sm p-6 border book-card-hover ${
                  tier.featured 
                    ? 'bg-gradient-to-b from-gold/20 to-gold/5 border-gold' 
                    : 'bg-surface border-[rgba(212,175,55,0.2)]'
                }`}
                data-testid={`tier-${tier.tier}-card`}
              >
                {tier.featured && (
                  <div className="text-xs font-mono text-gold uppercase tracking-wider mb-2">Best Value</div>
                )}
                <div className={`tier-badge tier-${tier.tier} inline-block mb-3`}>
                  {tier.tier === 0 ? 'No Sub' : `Tier ${tier.tier}`}
                </div>
                <h3 className="font-serif text-2xl font-semibold text-[#FDFBF7] mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  {tier.perBook ? (
                    <span className="text-lg text-gold">Pay per book</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gold">${tier.price}</span>
                      <span className="text-[#B0C4BF]">/mo</span>
                    </>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="text-[#B0C4BF] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/pricing">
              <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="compare-plans-btn">
                Compare All Plans <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark border-t border-[rgba(212,175,55,0.2)] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-gold flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#02120F]" />
              </div>
              <span className="font-serif text-lg text-[#FDFBF7]">Dar-Us-Salam Kitab Cloud</span>
            </div>
            <p className="text-[#B0C4BF] text-sm">
              © {new Date().getFullYear()} Dar-Us-Salam Publications. All rights reserved.
            </p>
            <p className="text-[#B0C4BF] text-sm">
              Support: sales@dar-us-salam.com
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
