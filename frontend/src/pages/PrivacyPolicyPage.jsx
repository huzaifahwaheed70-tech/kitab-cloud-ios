import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import Logo from '../components/Logo';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-[rgba(212,175,55,0.2)] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="sm" showTagline={true} linkTo={null} />
          </Link>
          <Link 
            to="/"
            className="flex items-center gap-2 text-[#B0C4BF] hover:text-[#FDFBF7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-gold" />
          <h1 className="font-serif text-3xl md:text-4xl text-[#FDFBF7]">Privacy Policy</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-[#B0C4BF]">
          <p className="text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">1. Introduction</h2>
            <p>
              Welcome to Kitab Cloud ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service").
            </p>
            <p>
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">2. Information We Collect</h2>
            
            <h3 className="font-semibold text-[#FDFBF7] mt-4 mb-2">Personal Information</h3>
            <p>We collect personal information that you voluntarily provide to us when you:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Register for an account (name, email address)</li>
              <li>Make a purchase (payment information processed securely by Stripe)</li>
              <li>Contact us for support</li>
            </ul>

            <h3 className="font-semibold text-[#FDFBF7] mt-4 mb-2">Automatically Collected Information</h3>
            <p>When you use our Service, we automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device information (device type, operating system)</li>
              <li>Usage data (pages viewed, reading progress, bookmarks)</li>
              <li>Log data (access times, app features used)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send you emails regarding your account or purchases</li>
              <li>Track your reading progress and save your bookmarks</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze usage patterns to improve the Service</li>
              <li>Detect, prevent, and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">4. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> For secure payment processing. Stripe's privacy policy can be found at stripe.com/privacy</li>
              <li><strong>Resend:</strong> For sending transactional emails (account verification, purchase confirmations)</li>
            </ul>
            <p className="mt-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All data is transmitted using SSL/TLS encryption</li>
              <li>Passwords are securely hashed and never stored in plain text</li>
              <li>Payment information is handled directly by Stripe and never stored on our servers</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time through the Settings page in the app.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
              <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data in a machine-readable format</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, please use the Account settings in the app or contact us at the email below.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">8. Children's Privacy</h2>
            <p>
              Our Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-4">10. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-surface p-4 rounded-sm border border-[rgba(212,175,55,0.2)] mt-4">
              <p><strong className="text-[#FDFBF7]">Dar-Us-Salam Publications</strong></p>
              <p>Email: sales@dar-us-salam.com</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-[rgba(212,175,55,0.2)] py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-[#B0C4BF] text-sm">
          <p>&copy; {new Date().getFullYear()} Dar-Us-Salam Publications. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
