import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  User, ArrowLeft, Mail, Lock, CreditCard, AlertTriangle,
  CheckCircle, XCircle, Calendar, Library, Crown, Trash2, Camera, Loader2, Info, ShoppingBag, Link2, Unlink
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

// Google Icon SVG Component
const GoogleIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const SettingsPage = () => {
  const { user, token, loading: authLoading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef(null);
  
  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Google linking
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);
  
  // Cancel subscription dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Tier change dialog
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false);
  const [selectedNewTier, setSelectedNewTier] = useState(null);
  const [changingTier, setChangingTier] = useState(false);
  
  // Delete account dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  // Purchases
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const fetchProfile = async () => {
    if (!token) {
      setProfileLoading(false);
      return;
    }
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/user/profile`, { 
        headers: authHeaders, 
        withCredentials: true 
      });
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
  
  const fetchPurchases = async () => {
    if (!token) return;
    setPurchasesLoading(true);
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/user/purchases`, { 
        headers: authHeaders, 
        withCredentials: true 
      });
      setPurchases(response.data.purchases || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    } finally {
      setPurchasesLoading(false);
    }
  };

  // Handle profile picture upload
  const handlePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const authHeaders = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API}/user/profile-picture`, formData, {
        headers: { ...authHeaders, 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      setProfile({ ...profile, picture: response.data.picture_url });
      if (refreshUser) await refreshUser();
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Error uploading picture:', error);
      toast.error('Failed to upload picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleLinkGoogle = () => {
    setLinkingGoogle(true);
    // Redirect to Google OAuth, then back to settings with link_google flag
    const redirectUrl = window.location.origin + '/settings?link_google=true';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleUnlinkGoogle = async () => {
    setUnlinkingGoogle(true);
    try {
      const authHeaders = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/auth/google/unlink`, {}, {
        headers: authHeaders,
        withCredentials: true
      });
      toast.success('Google account unlinked');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unlink Google account');
    } finally {
      setUnlinkingGoogle(false);
    }
  };

  // Process Google link callback
  useEffect(() => {
    const processGoogleLink = async () => {
      const params = new URLSearchParams(location.search);
      const hash = window.location.hash;
      
      // Check if we're returning from Google OAuth for linking
      if (params.get('link_google') === 'true' && hash.includes('session_id=')) {
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const sessionId = hashParams.get('session_id');
        
        if (sessionId && token) {
          try {
            const authHeaders = { Authorization: `Bearer ${token}` };
            const response = await axios.post(`${API}/auth/google/link`, 
              { session_id: sessionId },
              { headers: authHeaders, withCredentials: true }
            );
            toast.success('Google account linked successfully!');
            fetchProfile();
          } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to link Google account');
          }
          
          // Clear URL params
          window.history.replaceState(null, '', '/settings');
        }
      }
    };
    
    if (token) {
      processGoogleLink();
    }
  }, [location, token]);

  useEffect(() => {
    // Fetch profile when user/token are available
    if (user && token) {
      fetchProfile();
      fetchPurchases();
    } else if (!authLoading && !user) {
      // Auth check complete but no user - will be redirected by ProtectedRoute
      setProfileLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, authLoading]);

  // Show loading while auth is checking or profile is loading
  const loading = authLoading || profileLoading;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    
    try {
      await axios.put(`${API}/user/profile`, 
        { name, email },
        { headers, withCredentials: true }
      );
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
      await axios.put(`${API}/user/password`, 
        { current_password: currentPassword, new_password: newPassword },
        { headers, withCredentials: true }
      );
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
      const response = await axios.post(`${API}/user/cancel-subscription`, {}, { 
        headers, 
        withCredentials: true 
      });
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
      await axios.post(`${API}/user/reactivate-subscription`, {}, { 
        headers, 
        withCredentials: true 
      });
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
        headers, 
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleChangeTier = async () => {
    if (selectedNewTier === null || selectedNewTier >= (profile?.subscription_tier || 0)) {
      toast.error('You can only downgrade to a lower tier');
      return;
    }
    
    setChangingTier(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/user/change-tier?new_tier=${selectedNewTier}`, {}, { 
        headers, 
        withCredentials: true 
      });
      toast.success(`Successfully changed to ${getTierName(selectedNewTier)}`);
      setShowTierChangeDialog(false);
      setSelectedNewTier(null);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change tier');
    } finally {
      setChangingTier(false);
    }
  };

  const getTierName = (tier) => {
    const names = {
      0: 'Free',
      1: 'Basic',
      2: 'Standard',
      3: 'Advanced',
      4: 'Premium'
    };
    return names[tier] || `Tier ${tier}`;
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
      {/* Header */}
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
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-[rgba(212,175,55,0.2)] overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'subscription', label: 'Subscription', icon: CreditCard },
            { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
            { id: 'account', label: 'Account', icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-gold text-gold' 
                  : 'border-transparent text-[#B0C4BF] hover:text-[#FDFBF7]'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-serif text-xl text-[#FDFBF7] mb-6">Profile Picture</h2>
              
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-[#082E26] border-2 border-gold/30">
                    {profile?.picture ? (
                      <img 
                        src={profile.picture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-10 h-10 text-gold/50" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPicture}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gold text-[#02120F] flex items-center justify-center hover:bg-[#E9C85C] transition-colors"
                  >
                    {uploadingPicture ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePictureUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-[#FDFBF7] font-medium">{profile?.name || 'No name set'}</p>
                  <p className="text-sm text-[#B0C4BF]">{profile?.email}</p>
                  <p className="text-xs text-[#B0C4BF] mt-1">Click the camera icon to change your picture</p>
                </div>
              </div>
            </div>
            
            {/* Account Info */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-serif text-xl text-[#FDFBF7] mb-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-gold" />
                Account Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#082E26] rounded-lg p-4">
                  <p className="text-xs text-[#B0C4BF] uppercase tracking-wide mb-1">Member Since</p>
                  <p className="text-[#FDFBF7] font-medium">
                    {profile?.created_at 
                      ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
                <div className="bg-[#082E26] rounded-lg p-4">
                  <p className="text-xs text-[#B0C4BF] uppercase tracking-wide mb-1">User ID</p>
                  <p className="text-[#FDFBF7] font-mono text-sm truncate">{profile?.user_id || 'N/A'}</p>
                </div>
                <div className="bg-[#082E26] rounded-lg p-4">
                  <p className="text-xs text-[#B0C4BF] uppercase tracking-wide mb-1">Email Verified</p>
                  <p className="text-[#FDFBF7] font-medium flex items-center gap-2">
                    {profile?.email_verified ? (
                      <><CheckCircle className="w-4 h-4 text-green-500" /> Verified</>
                    ) : (
                      <><XCircle className="w-4 h-4 text-red-500" /> Not Verified</>
                    )}
                  </p>
                </div>
                <div className="bg-[#082E26] rounded-lg p-4">
                  <p className="text-xs text-[#B0C4BF] uppercase tracking-wide mb-1">Account Type</p>
                  <p className="text-[#FDFBF7] font-medium">
                    {profile?.is_admin ? 'Administrator' : profile?.is_guest ? 'Guest' : 'Standard User'}
                  </p>
                </div>
              </div>
            </div>
          
            {/* Edit Profile */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-serif text-xl text-[#FDFBF7] mb-6">Edit Profile</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label className="text-[#FDFBF7]">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1"
                  placeholder="Your name"
                  data-testid="profile-name"
                />
              </div>
              
              <div>
                <Label className="text-[#FDFBF7]">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1"
                  placeholder="your@email.com"
                  data-testid="profile-email"
                />
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={savingProfile}
                  className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                  data-testid="save-profile-btn"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Google Account Linking */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-serif text-xl text-[#FDFBF7] mb-6 flex items-center gap-2">
                <GoogleIcon className="w-5 h-5" />
                Google Account
              </h2>
              
              {profile?.google_linked ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-[#FDFBF7] font-medium">Google Account Linked</p>
                      <p className="text-sm text-[#B0C4BF]">
                        You can sign in with Google for faster access
                      </p>
                    </div>
                  </div>
                  
                  {profile?.has_password && (
                    <Button
                      onClick={handleUnlinkGoogle}
                      disabled={unlinkingGoogle}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      data-testid="unlink-google-btn"
                    >
                      <Unlink className="w-4 h-4 mr-2" />
                      {unlinkingGoogle ? 'Unlinking...' : 'Unlink Google Account'}
                    </Button>
                  )}
                  
                  {!profile?.has_password && (
                    <p className="text-sm text-[#B0C4BF] bg-[#082E26] rounded-lg p-3">
                      To unlink Google, please set a password first in the section below.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[#B0C4BF]">
                    Link your Google account for faster sign-in. You can use either your password or Google to log in.
                  </p>
                  <Button
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle}
                    variant="outline"
                    className="border-[rgba(212,175,55,0.3)] text-[#FDFBF7] hover:bg-[#082E26]"
                    data-testid="link-google-btn"
                  >
                    <GoogleIcon className="w-5 h-5 mr-2" />
                    {linkingGoogle ? 'Redirecting...' : 'Link Google Account'}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Change Password */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="font-serif text-xl text-[#FDFBF7] mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5 text-gold" />
                Password
              </h2>
            
            {!profile?.has_password ? (
              <div className="flex items-center gap-3 text-[#B0C4BF] bg-[#082E26] rounded-lg p-4">
                <Mail className="w-5 h-5 text-gold" />
                <p>You signed in with Google. To set a password, use the "Forgot Password" flow on the login page.</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label className="text-[#FDFBF7]">Current Password</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1"
                    required
                    data-testid="current-password"
                  />
                </div>
                
                <div>
                  <Label className="text-[#FDFBF7]">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1"
                    required
                    minLength={6}
                    data-testid="new-password"
                  />
                </div>
                
                <div>
                  <Label className="text-[#FDFBF7]">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1"
                    required
                    data-testid="confirm-password"
                  />
                </div>
                
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={changingPassword}
                    className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                    data-testid="change-password-btn"
                  >
                    {changingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            )}
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current Plan Card */}
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
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                        Cancelling
                      </span>
                    )}
                  </div>
                </div>
                
                {profile?.subscription_tier > 0 && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gold">${profile?.tier_info?.price || 0}</p>
                    <p className="text-sm text-[#B0C4BF]">per month</p>
                  </div>
                )}
              </div>
              
              {/* Plan Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#082E26] rounded-sm p-4">
                  <div className="flex items-center gap-2 text-[#B0C4BF] mb-1">
                    <Library className="w-4 h-4" />
                    <span className="text-sm">Book Limit</span>
                  </div>
                  <p className="text-[#FDFBF7] font-medium">
                    {profile?.tier_info?.book_limit === null 
                      ? 'Unlimited' 
                      : `${profile?.tier_info?.book_limit || 0} books/month`}
                  </p>
                </div>
                
                {profile?.subscription_tier > 0 && (
                  <div className="bg-[#082E26] rounded-sm p-4">
                    <div className="flex items-center gap-2 text-[#B0C4BF] mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {profile?.cancellation_pending ? 'Access Until' : 'Renews On'}
                      </span>
                    </div>
                    <p className="text-[#FDFBF7] font-medium">
                      {formatDate(profile?.cancellation_effective_date || profile?.subscription_end)}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {profile?.subscription_tier === 0 ? (
                  <Button 
                    onClick={() => navigate('/pricing')}
                    className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                    data-testid="subscribe-btn"
                  >
                    Subscribe Now
                  </Button>
                ) : profile?.cancellation_pending ? (
                  <Button 
                    onClick={handleReactivate}
                    className="bg-green-600 text-white hover:bg-green-500"
                    data-testid="reactivate-btn"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reactivate Subscription
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => navigate('/pricing')}
                      variant="outline"
                      className="border-gold text-gold hover:bg-gold/10"
                      data-testid="change-plan-btn"
                    >
                      Change Plan
                    </Button>
                    <Button 
                      onClick={() => setShowCancelDialog(true)}
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      data-testid="cancel-subscription-btn"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Cancellation Warning */}
            {profile?.cancellation_pending && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-red-400 font-medium mb-1">Subscription Cancellation Pending</h3>
                    <p className="text-[#B0C4BF] text-sm">
                      Your subscription will end on {formatDate(profile?.cancellation_effective_date)}. 
                      You'll continue to have access until then. After that, you'll be moved to the free tier.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tier Features */}
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
            
            {/* Downgrade Tier Option */}
            {profile?.subscription_tier > 1 && !profile?.cancellation_pending && (
              <div className="glass-card rounded-sm p-6">
                <h3 className="font-serif text-lg text-[#FDFBF7] mb-4">Change Your Plan</h3>
                <p className="text-[#B0C4BF] text-sm mb-4">
                  Need a smaller plan? You can downgrade to a lower tier at any time. 
                  The change takes effect immediately.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...Array(profile.subscription_tier)].map((_, i) => {
                    const tier = i;
                    if (tier === profile.subscription_tier) return null;
                    return (
                      <Button
                        key={tier}
                        variant="outline"
                        onClick={() => {
                          setSelectedNewTier(tier);
                          setShowTierChangeDialog(true);
                        }}
                        className="border-[rgba(212,175,55,0.3)] text-[#B0C4BF] hover:bg-[#082E26]"
                      >
                        Downgrade to {getTierName(tier)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Purchases Tab */}
        {activeTab === 'purchases' && (
          <div className="glass-card rounded-xl p-6">
            <h2 className="font-serif text-xl text-[#FDFBF7] mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gold" />
              Your Purchases
            </h2>
            
            {purchasesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12 text-[#B0C4BF]">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No purchases yet</p>
                <p className="text-sm mt-2">Your PDF purchases will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase, index) => (
                  <div key={index} className="bg-[#082E26] rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {purchase.cover_image ? (
                        <img 
                          src={purchase.cover_image} 
                          alt={purchase.title} 
                          className="w-12 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-[#041815] rounded flex items-center justify-center">
                          <Library className="w-6 h-6 text-gold/30" />
                        </div>
                      )}
                      <div>
                        <p className="text-[#FDFBF7] font-medium">{purchase.title || 'Unknown Book'}</p>
                        <p className="text-sm text-[#B0C4BF]">
                          Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gold font-medium">${purchase.amount?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-[#B0C4BF]">PDF</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Danger Zone */}
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

      {/* Cancel Subscription Dialog */}
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
            <p className="text-sm text-[#B0C4BF]">
              <strong className="text-[#FDFBF7]">What happens next:</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[#B0C4BF]">
              <li>• You keep access until end of billing period</li>
              <li>• Your reading progress and favorites are saved</li>
              <li>• You can resubscribe anytime</li>
              <li>• After cancellation, you'll move to the free tier</li>
            </ul>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCancelDialog(false)}
              className="border-[rgba(212,175,55,0.2)] text-[#FDFBF7]"
            >
              Keep Subscription
            </Button>
            <Button 
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-red-600 text-white hover:bg-red-500"
              data-testid="confirm-cancel-btn"
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
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

      {/* Tier Change Dialog */}
      <Dialog open={showTierChangeDialog} onOpenChange={setShowTierChangeDialog}>
        <DialogContent className="bg-surface border-gold/30 text-[#FDFBF7]">
          <DialogHeader>
            <DialogTitle className="text-[#FDFBF7] font-serif">Change Your Plan</DialogTitle>
            <DialogDescription className="text-[#B0C4BF]">
              You are about to downgrade from {getTierName(profile?.subscription_tier)} to {getTierName(selectedNewTier)}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 p-4 bg-[#082E26] rounded-sm">
            <h4 className="text-[#FDFBF7] font-medium mb-2">What changes:</h4>
            <ul className="text-sm text-[#B0C4BF] space-y-1">
              <li>• Your monthly book limit will be reduced</li>
              <li>• The change takes effect immediately</li>
              <li>• You can upgrade again anytime from the pricing page</li>
            </ul>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTierChangeDialog(false);
                setSelectedNewTier(null);
              }}
              className="border-[rgba(212,175,55,0.2)] text-[#FDFBF7]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleChangeTier}
              disabled={changingTier}
              className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
              data-testid="confirm-tier-change-btn"
            >
              {changingTier ? 'Changing...' : `Downgrade to ${getTierName(selectedNewTier)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
