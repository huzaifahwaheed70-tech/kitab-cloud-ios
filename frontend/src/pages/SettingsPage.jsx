import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import {
  User, ArrowLeft, Mail, Lock, CreditCard, AlertTriangle,
  CheckCircle, XCircle, Calendar, Library, Crown, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { shouldHidePrices } from '../utils/platform';

const SettingsPage = () => {
  const { user, token, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [hidePrices, setHidePrices] = useState(false);

  useEffect(() => {
    setHidePrices(shouldHidePrices());
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const getAuthHeaders = () => {
    const storedToken = localStorage.getItem('auth_token') || token;
    return storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
  };

  const fetchProfile = async () => {
    const storedToken = localStorage.getItem('auth_token') || token;
    if (!storedToken) {
      setProfileLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/user/profile`, { headers: getAuthHeaders() });
      setProfile(response.data);
      setName(response.data.name || '');
      setEmail(response.data.email || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      toast.error('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProfile();
    }
  }, [token, authLoading]);

  const loading = authLoading || profileLoading;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await axios.put(`${API}/user/profile`, { name, email }, { headers: getAuthHeaders() });
      toast.success('Profile updated successfully');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await axios.put(`${API}/user/password`, { current_password: currentPassword, new_password: newPassword }, { headers: getAuthHeaders() });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await axios.post(`${API}/user/cancel-subscription`, {}, { headers: getAuthHeaders() });
      toast.success(response.data.message);
      setShowCancelDialog(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivate = async () => {
    try {
      await axios.post(`${API}/user/reactivate-subscription`, {}, { headers: getAuthHeaders() });
      toast.success('Subscription reactivated!');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reactivate subscription');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    
    setDeleting(true);
    
    try {
      await axios.delete(`${API}/user/account`, { 
        headers: getAuthHeaders(), 
        withCredentials: true 
      });
      toast.success('Account deleted successfully');
      setShowDeleteDialog(false);
      await logout();
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getTierBadgeClass = (tier) => {
    const classes = {
      0: 'bg-gray-500/20 text-gray-400',
      1: 'bg-blue-500/20 text-blue-400',
      2: 'bg-purple-500/20 text-purple-400',
      3: 'bg-gold/20 text-gold',
      4: 'bg-gradient-to-r from-gold/30 to-amber-500/30 text-gold'
    };
    return classes[tier] || classes[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      <header className="glass sticky top-0 z-50 border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/library" className="text-[#B0C4BF] hover:text-[#FDFBF7] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-serif text-xl text-[#FDFBF7]">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="flex gap-2 mb-8 border-b border-[rgba(212,175,55,0.2)]">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'subscription', label: 'Subscription', icon: CreditCard },
            { id: 'account', label: 'Account', icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id ? 'border-gold text-gold' : 'border-transparent text-[#B0C4BF] hover:text-[#FDFBF7]'}`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="glass-card rounded-sm p-6">
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-6">Profile Information</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label className="text-[#FDFBF7]">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1" placeholder="Your name" data-testid="profile-name" />
              </div>
              <div>
                <Label className="text-[#FDFBF7]">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1" placeholder="your@email.com" data-testid="profile-email" />
              </div>
              <div className="pt-4">
                <Button type="submit" disabled={savingProfile} className="bg-gold text-[#02120F] hover:bg-[#E9C85C]" data-testid="save-profile-btn">
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="glass-card rounded-sm p-6">
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-6">Change Password</h2>
            {!profile?.has_password ? (
              <div className="flex items-center gap-3 text-[#B0C4BF] bg-[#082E26] rounded-sm p-4">
                <Mail className="w-5 h-5 text-gold" />
                <p>You signed in with Google. Password changes are managed through your Google account.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label className="text-[#FDFBF7]">Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1" required data-testid="current-password" />
                </div>
                <div>
                  <Label className="text-[#FDFBF7]">New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1" required minLength={6} data-testid="new-password" />
                </div>
                <div>
                  <Label className="text-[#FDFBF7]">Confirm New Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1" required data-testid="confirm-password" />
                </div>
                <div className="pt-4">
                  <Button type="submit" disabled={changingPassword} className="bg-gold text-[#02120F] hover:bg-[#E9C85C]" data-testid="change-password-btn">
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="glass-card rounded-sm p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-serif text-xl text-[#FDFBF7] mb-2">Current Plan</h2>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierBadgeClass(profile?.subscription_tier || 0)}`}>
                      {profile?.subscription_tier === 4 && <Crown className="w-4 h-4 inline mr-1" />}
                      {profile?.tier_info?.name || 'Free'}
                    </span>
                    {profile?.cancellation_pending && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">Cancelling</span>
                    )}
                  </div>
                </div>
                {profile?.subscription_tier > 0 && (
                  <div className="text-right">
                    {hidePrices ? (
                      <>
                        <p className="text-lg font-bold text-gold">Active Plan</p>
                        <p className="text-sm text-[#B0C4BF]">Manage via web portal</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gold">${profile?.tier_info?.price || 0}</p>
                        <p className="text-sm text-[#B0C4BF]">per month</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#082E26] rounded-sm p-4">
                  <div className="flex items-center gap-2 text-[#B0C4BF] mb-1">
                    <Library className="w-4 h-4" />
                    <span className="text-sm">Book Limit</span>
                  </div>
                  <p className="text-[#FDFBF7] font-medium">
                    {profile?.tier_info?.book_limit === null ? 'Unlimited' : `${profile?.tier_info?.book_limit || 0} books/month`}
                  </p>
                </div>
                {profile?.subscription_tier > 0 && (
                  <div className="bg-[#082E26] rounded-sm p-4">
                    <div className="flex items-center gap-2 text-[#B0C4BF] mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{profile?.cancellation_pending ? 'Access Until' : 'Renews On'}</span>
                    </div>
                    <p className="text-[#FDFBF7] font-medium">
                      {formatDate(profile?.cancellation_effective_date || profile?.subscription_end)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {profile?.subscription_tier === 0 ? (
                  <Button onClick={() => navigate('/pricing')} className="bg-gold text-[#02120F] hover:bg-[#E9C85C]" data-testid="subscribe-btn">
                    Subscribe Now
                  </Button>
                ) : profile?.cancellation_pending ? (
                  <Button onClick={handleReactivate} className="bg-green-600 text-white hover:bg-green-500" data-testid="reactivate-btn">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reactivate Subscription
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => navigate('/pricing')} variant="outline" className="border-gold text-gold hover:bg-gold/10" data-testid="change-plan-btn">
                      Change Plan
                    </Button>
                    <Button onClick={() => setShowCancelDialog(true)} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" data-testid="cancel-subscription-btn">
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </div>
            </div>

            {profile?.cancellation_pending && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-red-400 font-medium mb-1">Subscription Cancellation Pending</h3>
                    <p className="text-[#B0C4BF] text-sm">
                      Your subscription will end on {formatDate(profile?.cancellation_effective_date)}.
                      You'll continue to have access until then.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {profile?.subscription_tier > 0 && (
              <div className="glass-card rounded-sm p-6">
                <h3 className="font-serif text-lg text-[#FDFBF7] mb-4">Your Benefits</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-[#B0C4BF]">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Access to {profile?.tier_info?.book_limit === null ? 'unlimited' : profile?.tier_info?.book_limit} books per month
                  </li>
                  {profile?.subscription_tier >= 3 && (
                    <>
                      <li className="flex items-center gap-2 text-[#B0C4BF]">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        In-book text search
                      </li>
                      <li className="flex items-center gap-2 text-[#B0C4BF]">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Access to Volume books
                      </li>
                    </>
                  )}
                  {profile?.subscription_tier === 4 && (
                    <li className="flex items-center gap-2 text-[#B0C4BF]">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Access to Advanced/Premium books
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="glass-card rounded-sm p-6 border border-red-500/30">
              <h2 className="font-serif text-xl text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h2>
              
              <div className="bg-red-500/10 rounded-sm p-4 mb-4">
                <h3 className="text-[#FDFBF7] font-medium mb-2">Delete Account</h3>
                <p className="text-[#B0C4BF] text-sm mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <ul className="text-sm text-[#B0C4BF] space-y-1 mb-4">
                  <li>• All your reading progress will be deleted</li>
                  <li>• Your bookshelf and favorites will be removed</li>
                  <li>• Any active subscription will be cancelled</li>
                  <li>• Purchased PDFs access will be revoked</li>
                </ul>
                <Button 
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-red-600 text-white hover:bg-red-500"
                  data-testid="delete-account-btn"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-surface border-[rgba(212,175,55,0.2)]">
          <DialogHeader>
            <DialogTitle className="text-[#FDFBF7] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription className="text-[#B0C4BF]">
              Are you sure you want to cancel your subscription? You'll continue to have access until the end of your billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#082E26] rounded-sm p-4 my-4">
            <p className="text-sm text-[#B0C4BF]"><strong className="text-[#FDFBF7]">What happens next:</strong></p>
            <ul className="mt-2 space-y-1 text-sm text-[#B0C4BF]">
              <li>• You keep access until end of billing period</li>
              <li>• Your reading progress and favorites are saved</li>
              <li>• You can resubscribe anytime</li>
              <li>• After cancellation, you'll move to the free tier</li>
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="border-[rgba(212,175,55,0.2)] text-[#FDFBF7]">
              Keep Subscription
            </Button>
            <Button onClick={handleCancelSubscription} disabled={cancelling} className="bg-red-600 text-white hover:bg-red-500" data-testid="confirm-cancel-btn">
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-surface border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription className="text-[#B0C4BF]">
              This action is permanent and cannot be undone. All your data will be deleted.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <Label className="text-[#FDFBF7] mb-2 block">
              Type <strong className="text-red-400">DELETE</strong> to confirm:
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              className="bg-[#082E26] border-red-500/30 text-[#FDFBF7]"
              data-testid="delete-confirm-input"
            />
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText('');
              }}
              className="border-[rgba(212,175,55,0.2)] text-[#FDFBF7]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== 'DELETE'}
              className="bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
              data-testid="confirm-delete-btn"
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;