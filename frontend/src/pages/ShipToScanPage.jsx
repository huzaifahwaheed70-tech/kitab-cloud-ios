import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Package, ArrowLeft, MapPin, Mail, Truck, Shield, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const ShipToScanPage = () => {
  const { user } = useAuth();

  // Only Tier 4 (Premium) and Tier 5 (Unlimited) users can access
  if (user?.subscription_tier < 4) {
    return <Navigate to="/pricing" replace />;
  }

  const steps = [
    {
      icon: <Package className="w-6 h-6" />,
      title: "Package Your Book",
      description: "Wrap your book securely in bubble wrap or padding. Use a sturdy shipping box."
    },
    {
      icon: <Truck className="w-6 h-6" />,
      title: "Ship to Our Houston Store",
      description: "Send your package to our address below. We recommend using tracked shipping."
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Professional Digitization",
      description: "Our team will professionally scan and digitize your book within 7-10 business days."
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Access Your Book",
      description: "Once digitized, your book will appear in your personal library and bookshelf."
    }
  ];

  return (
    <div className="min-h-screen bg-dark">
      {/* Hero Header */}
      <div className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.pexels.com/photos/1907784/pexels-photo-1907784.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#02120F]/90 via-[#004D40]/80 to-[#02120F]" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 md:px-6 py-8">
          <Link to="/library" className="inline-flex items-center gap-2 text-gold hover:text-[#E9C85C] mb-8" data-testid="back-to-library">
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-sm bg-gold flex items-center justify-center">
              <Package className="w-8 h-8 text-[#02120F]" />
            </div>
            <div>
              <div className="tier-badge tier-4 mb-2">Premium & Unlimited Members</div>
              <h1 className="font-serif text-4xl md:text-5xl text-[#FDFBF7] font-bold tracking-tight">
                Ship-to-Scan Portal
              </h1>
            </div>
          </div>
          
          <p className="text-xl text-[#B0C4BF] max-w-2xl">
            As a Premium or Unlimited member, you can ship your personal Islamic books to our store 
            for professional archiving and digitization.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        {/* Process Steps */}
        <section className="mb-16">
          <h2 className="font-serif text-3xl text-[#FDFBF7] mb-8">How It Works</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="glass-card rounded-sm p-6 flex gap-4"
                data-testid={`step-${index + 1}`}
              >
                <div className="w-12 h-12 rounded-sm bg-gold/10 flex items-center justify-center text-gold flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-gold text-sm">0{index + 1}</span>
                    <h3 className="font-serif text-lg text-[#FDFBF7]">{step.title}</h3>
                  </div>
                  <p className="text-[#B0C4BF]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Shipping Address */}
        <section className="mb-16">
          <h2 className="font-serif text-3xl text-[#FDFBF7] mb-8">Shipping Address</h2>
          
          <div className="glass-card rounded-sm p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-sm bg-gold flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#02120F]" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#FDFBF7] mb-3">Dar-Us-Salam Publications</h3>
                <address className="not-italic text-[#B0C4BF] space-y-1">
                  <p>Ship-to-Scan Department</p>
                  <p>Attn: Digital Archives Team</p>
                  <p className="text-gold font-medium mt-2">1111 Conrad Sauer Dr</p>
                  <p className="text-gold font-medium">Houston, TX 77043</p>
                </address>
                
                <div className="mt-6 pt-6 border-t border-[rgba(212,175,55,0.2)] space-y-3">
                  <p className="text-sm text-[#B0C4BF] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gold" />
                    sales@dar-us-salam.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Guidelines */}
        <section className="mb-16">
          <h2 className="font-serif text-3xl text-[#FDFBF7] mb-8">Shipping Guidelines</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card rounded-sm p-6">
              <h3 className="font-serif text-lg text-gold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                What We Accept
              </h3>
              <ul className="space-y-2 text-[#B0C4BF]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0"></span>
                  Islamic religious texts and scholarly works
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0"></span>
                  Arabic language books
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0"></span>
                  Books in good condition (no water damage)
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 flex-shrink-0"></span>
                  Rare or out-of-print Islamic literature
                </li>
              </ul>
            </div>
            
            <div className="glass-card rounded-sm p-6">
              <h3 className="font-serif text-lg text-[#FDFBF7] mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-gold" />
                Book Safety
              </h3>
              <ul className="space-y-2 text-[#B0C4BF]">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B0C4BF] mt-2 flex-shrink-0"></span>
                  Your books are handled with care by our trained team
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B0C4BF] mt-2 flex-shrink-0"></span>
                  Non-destructive scanning preserves book integrity
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B0C4BF] mt-2 flex-shrink-0"></span>
                  Books can be returned upon request (you cover return shipping)
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B0C4BF] mt-2 flex-shrink-0"></span>
                  Or donate to our Houston community library
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Important Notes */}
        <section>
          <div className="bg-gold/10 border border-gold/30 rounded-sm p-6">
            <h3 className="font-serif text-xl text-gold mb-4">Important Notes</h3>
            <ul className="space-y-2 text-[#FDFBF7]">
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                Include a printed note with your email address and member name
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                Please allow 7-10 business days for processing after we receive your book
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                You'll receive an email notification when your book is ready to read
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold">•</span>
                Questions? Contact us at sales@dar-us-salam.com
              </li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link to="/library">
            <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="return-library-btn">
              Return to Library
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ShipToScanPage;
