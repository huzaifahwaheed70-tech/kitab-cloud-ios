import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
<<<<<<< HEAD
import { 
  Library, Users, ArrowLeft, Plus, Edit, Trash2, 
  Search, Save, Settings, DollarSign, RefreshCw, Tag, Eye, EyeOff,
  Bell, Send, Loader2
=======
import {
  BookOpen, Users, ArrowLeft, Plus, Edit, Trash2,
  Search, Save, Library
>>>>>>> origin/main
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('books');
  const [stats, setStats] = useState(null);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
<<<<<<< HEAD
  
  // Tier Settings State
  const [tierSettings, setTierSettings] = useState({});
  const [tierLoading, setTierLoading] = useState(false);
  const [tierSaving, setTierSaving] = useState(false);
  
  // Discount Codes State
  const [discountCodes, setDiscountCodes] = useState([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [discountForm, setDiscountForm] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    value: '',
    buy_x_value: '',
    is_visible: false,
    is_active: true,
    usage_limit: '',
    per_user_limit: 1,
    applicable_tiers: [],
    valid_from: '',
    valid_until: '',
    banner_text: '',
    badge_text: ''
  });

  // Push Notifications State
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    target: 'all',
    url: ''
  });
  const [notificationSending, setNotificationSending] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [notificationHistoryLoading, setNotificationHistoryLoading] = useState(false);

  // Book Form State
=======
>>>>>>> origin/main
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    darussalam_code: '',
    tier_level: 1,
    is_volume: false,
    is_advanced: false,
    description: '',
    original_price: '',
    pdf_price: '',
    purchase_link: ''
  });

  const getAuthHeaders = () => {
    const storedToken = localStorage.getItem('auth_token') || token;
    return storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const [statsRes, booksRes, usersRes, purchasesRes, subsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/books/all`),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/purchases`, { headers }),
        axios.get(`${API}/admin/subscriptions`, { headers })
      ]);
      setStats(statsRes.data);
      setBooks(booksRes.data);
      setUsers(usersRes.data);
      setPurchases(purchasesRes.data);
      setSubscriptions(subsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const fetchTierSettings = async () => {
    setTierLoading(true);
    try {
      const response = await axios.get(`${API}/admin/tiers`, { headers, withCredentials: true });
      console.log('Tier settings response:', response.data);
      if (response.data && response.data.tiers) {
        setTierSettings(response.data.tiers);
      }
    } catch (error) {
      console.error('Error fetching tier settings:', error);
      toast.error('Failed to load tier settings');
    } finally {
      setTierLoading(false);
    }
  };

  const handleTierChange = (tierId, field, value) => {
    setTierSettings(prev => ({
      ...prev,
      [tierId]: {
        ...prev[tierId],
        [field]: field === 'price' ? parseFloat(value) || 0 : 
                 field === 'book_limit' ? (value === '' ? null : parseInt(value)) : 
                 value
      }
    }));
  };

  const saveTierSettings = async () => {
    setTierSaving(true);
    try {
      await axios.put(`${API}/admin/tiers`, { tiers: tierSettings }, { headers, withCredentials: true });
      toast.success('Tier settings saved! Changes will reflect across the app.');
    } catch (error) {
      console.error('Error saving tier settings:', error);
      toast.error('Failed to save tier settings');
    } finally {
      setTierSaving(false);
    }
  };

  const resetTierSettings = async () => {
    if (!window.confirm('Are you sure you want to reset all tier settings to defaults?')) return;
    
    setTierSaving(true);
    try {
      const response = await axios.post(`${API}/admin/tiers/reset`, {}, { headers, withCredentials: true });
      setTierSettings(response.data.tiers);
      toast.success('Tier settings reset to defaults!');
    } catch (error) {
      console.error('Error resetting tier settings:', error);
      toast.error('Failed to reset tier settings');
    } finally {
      setTierSaving(false);
    }
  };

  // Discount Code Functions
  const fetchDiscountCodes = async () => {
    setDiscountLoading(true);
    try {
      const response = await axios.get(`${API}/admin/discount-codes`, { headers, withCredentials: true });
      setDiscountCodes(response.data.discount_codes || []);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Failed to load discount codes');
    } finally {
      setDiscountLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'discounts' && token) {
      fetchDiscountCodes();
    }
  }, [activeTab, token]);

  // Fetch notification history when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications' && token) {
      fetchNotificationHistory();
    }
  }, [activeTab, token]);

  const fetchNotificationHistory = async () => {
    setNotificationHistoryLoading(true);
    try {
      const response = await axios.get(`${API}/admin/notifications/history`, { headers, withCredentials: true });
      setNotificationHistory(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setNotificationHistoryLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast.error('Please enter both title and message');
      return;
    }
    
    setNotificationSending(true);
    try {
      const response = await axios.post(
        `${API}/admin/notifications/send`,
        {
          title: notificationForm.title,
          message: notificationForm.message,
          target: notificationForm.target,
          url: notificationForm.url || null
        },
        { headers, withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success(`Notification sent to ${response.data.recipients} devices!`);
        setNotificationForm({ title: '', message: '', target: 'all', url: '' });
        fetchNotificationHistory();
      } else {
        toast.error(response.data.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.response?.data?.detail || 'Failed to send notification');
    } finally {
      setNotificationSending(false);
    }
  };

  const resetDiscountForm = () => {
    setDiscountForm({
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      value: '',
      buy_x_value: '',
      is_visible: false,
      is_active: true,
      usage_limit: '',
      per_user_limit: 1,
      applicable_tiers: [],
      valid_from: '',
      valid_until: '',
      banner_text: '',
      badge_text: ''
    });
    setEditingDiscount(null);
  };

  const handleCreateDiscount = async (e) => {
    e.preventDefault();
    try {
      const data = {
        code: discountForm.code.toUpperCase(),
        name: discountForm.name,
        description: discountForm.description || null,
        discount_type: discountForm.discount_type,
        value: parseFloat(discountForm.value),
        buy_x_value: discountForm.discount_type === 'buy_x_get_y' ? parseInt(discountForm.buy_x_value) : null,
        is_visible: discountForm.is_visible,
        is_active: discountForm.is_active,
        usage_limit: discountForm.usage_limit ? parseInt(discountForm.usage_limit) : null,
        per_user_limit: parseInt(discountForm.per_user_limit) || 1,
        applicable_tiers: discountForm.applicable_tiers.length > 0 ? discountForm.applicable_tiers : null,
        valid_from: discountForm.valid_from || null,
        valid_until: discountForm.valid_until || null,
        banner_text: discountForm.banner_text || null,
        badge_text: discountForm.badge_text || null
      };

      if (editingDiscount) {
        await axios.put(`${API}/admin/discount-codes/${editingDiscount.discount_id}`, data, { headers, withCredentials: true });
        toast.success('Discount code updated!');
      } else {
        await axios.post(`${API}/admin/discount-codes`, data, { headers, withCredentials: true });
        toast.success('Discount code created!');
      }

      setShowDiscountModal(false);
      resetDiscountForm();
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error saving discount code:', error);
      toast.error(error.response?.data?.detail || 'Failed to save discount code');
    }
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscount(discount);
    setDiscountForm({
      code: discount.code,
      name: discount.name,
      description: discount.description || '',
      discount_type: discount.discount_type,
      value: discount.value.toString(),
      buy_x_value: discount.buy_x_value?.toString() || '',
      is_visible: discount.is_visible,
      is_active: discount.is_active,
      usage_limit: discount.usage_limit?.toString() || '',
      per_user_limit: discount.per_user_limit || 1,
      applicable_tiers: discount.applicable_tiers || [],
      valid_from: discount.valid_from ? discount.valid_from.split('T')[0] : '',
      valid_until: discount.valid_until ? discount.valid_until.split('T')[0] : '',
      banner_text: discount.banner_text || '',
      badge_text: discount.badge_text || ''
    });
    setShowDiscountModal(true);
  };

  const handleDeleteDiscount = async (discountId) => {
    if (!window.confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
      await axios.delete(`${API}/admin/discount-codes/${discountId}`, { headers, withCredentials: true });
      toast.success('Discount code deleted!');
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error('Failed to delete discount code');
    }
  };

  const toggleDiscountActive = async (discount) => {
    try {
      await axios.put(`${API}/admin/discount-codes/${discount.discount_id}`, {
        is_active: !discount.is_active
      }, { headers, withCredentials: true });
      toast.success(`Discount code ${!discount.is_active ? 'activated' : 'deactivated'}!`);
      fetchDiscountCodes();
    } catch (error) {
      console.error('Error toggling discount status:', error);
      toast.error('Failed to update discount code');
    }
  };

=======
>>>>>>> origin/main
  const fetchUserDetails = async (userId) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API}/admin/users/${userId}/details`, { headers });
      setUserDetails(response.data);
      setSelectedUser(userId);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    }
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    try {
      const data = {
        title: bookForm.title,
        darussalam_code: bookForm.darussalam_code,
        tier_level: parseInt(bookForm.tier_level),
        is_volume: bookForm.is_volume,
        is_advanced: bookForm.is_advanced,
        description: bookForm.description || null,
        original_price: bookForm.original_price ? parseFloat(bookForm.original_price) : null,
        pdf_price: bookForm.pdf_price ? parseFloat(bookForm.pdf_price) : null,
        purchase_link: bookForm.purchase_link || null
      };
      const headers = getAuthHeaders();
      if (editingBook) {
        await axios.put(`${API}/books/${editingBook.book_id}`, data, { headers });
        toast.success('Book updated!');
      } else {
        const response = await axios.post(`${API}/books`, data, { headers });
        setBooks(prev => [...prev, response.data]);
        toast.success('Book created!');
      }
      setShowBookModal(false);
      resetBookForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save book');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await axios.delete(`${API}/books/${bookId}`, { headers: getAuthHeaders() });
      setBooks(prev => prev.filter(b => b.book_id !== bookId));
      toast.success('Book deleted');
    } catch (error) {
      toast.error('Failed to delete book');
    }
  };

  const handleUploadPdf = async (bookId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      toast.info('Uploading PDF... This may take a moment.');
      const storedToken = localStorage.getItem('auth_token') || token;
      await axios.post(`${API}/books/${bookId}/upload-pdf`, formData, {
        headers: { Authorization: `Bearer ${storedToken}`, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('PDF uploaded! Cover generated from first page.');
      fetchData();
    } catch (error) {
      toast.error('Failed to upload PDF');
    }
  };

  const handleUpdateUserTier = async (userId, tier) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/tier?tier=${tier}`, {}, { headers: getAuthHeaders() });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscription_tier: tier } : u));
      toast.success('User tier updated');
    } catch (error) {
      toast.error('Failed to update tier');
    }
  };

  const handleToggleAdmin = async (userId, isAdmin) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/admin?is_admin=${isAdmin}`, {}, { headers: getAuthHeaders() });
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_admin: isAdmin } : u));
      toast.success('Admin status updated');
    } catch (error) {
      toast.error('Failed to update admin status');
    }
  };

  const resetBookForm = () => {
    setBookForm({
      title: '',
      darussalam_code: '',
      tier_level: 1,
      is_volume: false,
      is_advanced: false,
      description: '',
      original_price: '',
      pdf_price: '',
      purchase_link: ''
    });
    setEditingBook(null);
  };

  const openEditBook = (book) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      darussalam_code: book.darussalam_code,
      tier_level: book.tier_level,
      is_volume: book.is_volume || false,
      is_advanced: book.is_advanced || false,
      description: book.description || '',
      original_price: book.original_price ? String(book.original_price) : '',
      pdf_price: book.pdf_price ? String(book.pdf_price) : '',
      purchase_link: book.purchase_link || ''
    });
    setShowBookModal(true);
  };

  const filteredBooks = books.filter(book =>
    book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.darussalam_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      <div className="glass border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <Link to="/library" className="inline-flex items-center gap-2 text-[#B0C4BF] hover:text-gold mb-4" data-testid="back-to-library">
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl text-[#FDFBF7] font-bold">Admin Dashboard</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="glass-card rounded-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-gold/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#FDFBF7]">{stats.total_users}</p>
                  <p className="text-sm text-[#B0C4BF]">Total Users</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-gold/10 flex items-center justify-center">
                  <Library className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#FDFBF7]">{stats.total_books}</p>
                  <p className="text-sm text-[#B0C4BF]">Total Books</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-sm p-4">
              <div className="text-sm">
                <p className="text-[#B0C4BF] mb-2">Tier Distribution</p>
                {Object.entries(stats.tier_distribution).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <span className={`tier-badge tier-${tier} text-xs`}>T{tier}</span>
                    <span className="text-[#FDFBF7]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
<<<<<<< HEAD
          <TabsList className="bg-surface border border-[rgba(212,175,55,0.2)] mb-6 flex-wrap">
            <TabsTrigger value="books" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-books">
              Books
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-users">
              Users
            </TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-purchases">
              Purchases
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-subscriptions">
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="discounts" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-discounts">
              <Tag className="w-4 h-4 mr-1" />
              Discounts
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-notifications">
              <Bell className="w-4 h-4 mr-1" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Search (hidden on settings, discounts, and notifications tab) */}
          {activeTab !== 'settings' && activeTab !== 'discounts' && activeTab !== 'notifications' && (
=======
          <TabsList className="bg-surface border border-[rgba(212,175,55,0.2)] mb-6">
            <TabsTrigger value="books" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-books">Books</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-purchases">Purchases</TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

>>>>>>> origin/main
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7]"
              data-testid="admin-search"
            />
          </div>

          <TabsContent value="books">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-[#FDFBF7]">Books Management</h2>
              <Dialog open={showBookModal} onOpenChange={setShowBookModal}>
                <DialogTrigger asChild>
                  <Button onClick={resetBookForm} className="bg-gold text-[#02120F] hover:bg-[#E9C85C]" data-testid="add-book-btn">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-2xl">
                      {editingBook ? 'Edit Book' : 'Add New Book'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateBook} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div>
                      <Label className="text-[#FDFBF7]">Title</Label>
                      <Input value={bookForm.title} onChange={(e) => setBookForm(p => ({ ...p, title: e.target.value }))} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7]" required data-testid="book-form-title" />
                    </div>
                    <div>
                      <Label className="text-[#FDFBF7]">Dar-Us-Salam Code</Label>
                      <Input value={bookForm.darussalam_code} onChange={(e) => setBookForm(p => ({ ...p, darussalam_code: e.target.value }))} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] font-mono" placeholder="e.g., C21, E20" required data-testid="book-form-code" />
                    </div>
                    <div>
                      <Label className="text-[#FDFBF7]">Tier Level</Label>
                      <Select value={String(bookForm.tier_level)} onValueChange={(v) => setBookForm(p => ({ ...p, tier_level: parseInt(v) }))}>
                        <SelectTrigger className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7]" data-testid="book-form-tier">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-[rgba(212,175,55,0.2)]">
                          {[1, 2, 3, 4].map(t => (
                            <SelectItem key={t} value={String(t)} className="text-[#FDFBF7]">
                              Tier {t} - {t === 1 ? 'Basic' : t === 2 ? 'Standard' : t === 3 ? 'Advanced' : 'Premium'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={bookForm.is_volume} onChange={(e) => setBookForm(p => ({ ...p, is_volume: e.target.checked }))} className="w-4 h-4 accent-gold" data-testid="book-form-is-volume" />
                        <span className="text-[#FDFBF7] text-sm">Volume Book (Tier 3+)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={bookForm.is_advanced} onChange={(e) => setBookForm(p => ({ ...p, is_advanced: e.target.checked }))} className="w-4 h-4 accent-gold" data-testid="book-form-is-advanced" />
                        <span className="text-[#FDFBF7] text-sm">Advanced (Tier 4 Only)</span>
                      </label>
                    </div>
                    <div>
                      <Label className="text-[#FDFBF7]">Description (optional)</Label>
                      <Textarea value={bookForm.description} onChange={(e) => setBookForm(p => ({ ...p, description: e.target.value }))} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7]" data-testid="book-form-description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#FDFBF7]">Original Book Price ($)</Label>
                        <Input type="number" step="0.01" value={bookForm.original_price} onChange={(e) => setBookForm(p => ({ ...p, original_price: e.target.value }))} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7]" placeholder="Physical book price" data-testid="book-form-original-price" />
                      </div>
                      <div>
                        <Label className="text-[#FDFBF7]">PDF Price ($)</Label>
                        <Input type="number" step="0.01" value={bookForm.pdf_price} onChange={(e) => setBookForm(p => ({ ...p, pdf_price: e.target.value }))} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7]" placeholder="For Tier 0 purchase" data-testid="book-form-pdf-price" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[#FDFBF7]">Purchase Link (Dar-Us-Salam.com)</Label>
                      <Input value={bookForm.purchase_link} onChange={(e) => setBookForm(p => ({ ...p, purchase_link: e.target.value }))} className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7]" placeholder="https://dar-us-salam.com/product/..." data-testid="book-form-purchase-link" />
                    </div>
                    <Button type="submit" className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C]" data-testid="book-form-submit">
                      <Save className="w-5 h-5 mr-2" />
                      {editingBook ? 'Update Book' : 'Create Book'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {filteredBooks.map((book) => (
                <div key={book.book_id} className="glass-card rounded-sm p-4 flex items-center gap-4" data-testid={`admin-book-${book.book_id}`}>
                  <div className="w-16 h-24 rounded-sm overflow-hidden bg-[#082E26] flex-shrink-0">
                    {book.cover_url ? (
                      <img src={`${process.env.REACT_APP_BACKEND_URL}/api/covers/${book.cover_url.replace('darussalam-kitab/covers/', '')}`} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src="/logo.png" alt="Book" className="w-6 h-6 opacity-30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-gold text-sm">{book.darussalam_code}</span>
                      <span className={`tier-badge tier-${book.tier_level} text-xs`}>T{book.tier_level}</span>
                    </div>
                    <h3 className="text-[#FDFBF7] font-medium truncate">{book.title}</h3>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      {book.pdf_url ? (
                        <span className="text-green-500">✓ PDF Uploaded</span>
                      ) : (
                        <span className="text-yellow-500">No PDF yet</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadPdf(book.book_id, e.target.files[0])} />
                      <div className="px-3 py-2 bg-gold/10 hover:bg-gold/20 rounded-sm text-gold text-sm font-medium border border-gold/30 cursor-pointer">
                        {book.pdf_url ? 'Replace PDF' : 'Upload PDF'}
                      </div>
                    </label>
                    <Button variant="ghost" size="icon" onClick={() => openEditBook(book)} className="text-[#B0C4BF] hover:text-gold">
                      <Edit className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBook(book.book_id)} className="text-[#B0C4BF] hover:text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredBooks.length === 0 && (
                <div className="text-center py-12 text-[#B0C4BF]">No books found</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <h2 className="font-serif text-2xl text-[#FDFBF7] mb-6">Users Management</h2>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.user_id} className="glass-card rounded-sm p-4 flex items-center gap-4" data-testid={`admin-user-${user.user_id}`}>
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <Users className="w-5 h-5 text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[#FDFBF7] font-medium">{user.name}</h3>
                      {user.is_admin && (
                        <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded-sm">Admin</span>
                      )}
                    </div>
                    <p className="text-sm text-[#B0C4BF] truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => fetchUserDetails(user.user_id)} className="border-[rgba(212,175,55,0.2)] text-[#B0C4BF] hover:text-gold">
                      Details
                    </Button>
                    <Select value={String(user.subscription_tier)} onValueChange={(v) => handleUpdateUserTier(user.user_id, parseInt(v))}>
                      <SelectTrigger className="w-24 bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-[rgba(212,175,55,0.2)]">
                        {[0, 1, 2, 3, 4, 5].map(t => (
                          <SelectItem key={t} value={String(t)} className="text-[#FDFBF7]">Tier {t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant={user.is_admin ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleAdmin(user.user_id, !user.is_admin)}
                      className={user.is_admin ? 'bg-gold text-[#02120F]' : 'border-[rgba(212,175,55,0.2)] text-[#B0C4BF]'}
                    >
                      {user.is_admin ? 'Admin' : 'Make Admin'}
                    </Button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-[#B0C4BF]">No users found</div>
              )}
            </div>

            {selectedUser && userDetails && (
              <Dialog open={!!selectedUser} onOpenChange={() => { setSelectedUser(null); setUserDetails(null); }}>
                <DialogContent className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">User Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#B0C4BF]">Email</p>
                        <p className="text-[#FDFBF7]">{userDetails.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#B0C4BF]">Name</p>
                        <p className="text-[#FDFBF7]">{userDetails.name || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#B0C4BF]">Tier</p>
                        <p className="text-[#FDFBF7]">Tier {userDetails.subscription_tier}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#B0C4BF]">Admin</p>
                        <p className="text-[#FDFBF7]">{userDetails.is_admin ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[#B0C4BF] mb-2">Favorite Books ({userDetails.favorites?.length || 0})</p>
                      <div className="flex flex-wrap gap-2">
                        {userDetails.favorites?.map(book => (
                          <span key={book.book_id} className="px-2 py-1 bg-[#082E26] rounded text-sm">{book.title}</span>
                        ))}
                        {(!userDetails.favorites || userDetails.favorites.length === 0) && (
                          <span className="text-[#B0C4BF] text-sm">No favorites</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[#B0C4BF] mb-2">PDF Purchases ({userDetails.purchases?.length || 0})</p>
                      {userDetails.purchases?.map((purchase, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-[rgba(212,175,55,0.1)]">
                          <span className="text-sm">{purchase.book_title}</span>
                          <span className="text-gold text-sm">${purchase.amount}</span>
                        </div>
                      ))}
                      {(!userDetails.purchases || userDetails.purchases.length === 0) && (
                        <span className="text-[#B0C4BF] text-sm">No purchases</span>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          <TabsContent value="purchases">
            <h2 className="font-serif text-2xl text-[#FDFBF7] mb-6">PDF Purchases</h2>
            <div className="space-y-3">
              {purchases.map((purchase, index) => (
                <div key={index} className="glass-card rounded-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[#FDFBF7] font-medium">{purchase.book_title}</p>
                    <p className="text-sm text-[#B0C4BF]">{purchase.user_email}</p>
                    <p className="text-xs text-[#B0C4BF]">{new Date(purchase.purchased_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-gold font-medium">${purchase.amount}</span>
                </div>
              ))}
              {purchases.length === 0 && (
                <div className="text-center py-12 text-[#B0C4BF]">No purchases yet</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <h2 className="font-serif text-2xl text-[#FDFBF7] mb-6">Subscription Payments</h2>
            <div className="space-y-3">
              {subscriptions.map((sub, index) => (
                <div key={index} className="glass-card rounded-sm p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[#FDFBF7] font-medium">{sub.user_email || sub.user_name}</p>
                    <p className="text-sm text-[#B0C4BF]">Tier {sub.tier} subscription</p>
                    <p className="text-xs text-[#B0C4BF]">{new Date(sub.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-gold font-medium">${sub.amount}</span>
                    <p className={`text-xs ${sub.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {sub.payment_status}
                    </p>
                  </div>
                </div>
              ))}
              {subscriptions.length === 0 && (
                <div className="text-center py-12 text-[#B0C4BF]">No subscriptions yet</div>
              )}
            </div>
          </TabsContent>
<<<<<<< HEAD

          {/* Discounts Tab */}
          <TabsContent value="discounts">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl text-[#FDFBF7]">Discount Codes</h2>
                  <p className="text-[#B0C4BF] text-sm mt-1">Create and manage promotional codes</p>
                </div>
                <Button
                  onClick={() => { resetDiscountForm(); setShowDiscountModal(true); }}
                  className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                  data-testid="create-discount-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Discount Code
                </Button>
              </div>

              {discountLoading ? (
                <div className="text-center py-12 text-[#B0C4BF]">Loading discount codes...</div>
              ) : discountCodes.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[rgba(212,175,55,0.3)] rounded-lg">
                  <Tag className="w-12 h-12 mx-auto text-[#B0C4BF] mb-4" />
                  <p className="text-[#B0C4BF]">No discount codes yet</p>
                  <p className="text-sm text-[#B0C4BF]/60">Create your first discount code to offer promotions</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {discountCodes.map((discount) => (
                    <div
                      key={discount.discount_id}
                      className={`glass-card p-4 rounded-lg border ${discount.is_active ? 'border-gold/30' : 'border-[rgba(212,175,55,0.1)] opacity-60'}`}
                      data-testid={`discount-${discount.code}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-lg text-gold font-bold">{discount.code}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${discount.is_visible ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {discount.is_visible ? 'Visible' : 'Secret'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${discount.is_active ? 'bg-gold/20 text-gold' : 'bg-red-500/20 text-red-400'}`}>
                              {discount.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h3 className="text-[#FDFBF7] font-medium">{discount.name}</h3>
                          <p className="text-sm text-[#B0C4BF] mt-1">
                            {discount.discount_type === 'percentage' && `${discount.value}% off`}
                            {discount.discount_type === 'fixed_amount' && `$${discount.value} off`}
                            {discount.discount_type === 'free_trial' && `${discount.value} day free trial`}
                            {discount.discount_type === 'buy_x_get_y' && `Buy ${discount.buy_x_value} month, get ${discount.value} month free`}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[#B0C4BF]/70">
                            <span>Used: {discount.used_count || 0}{discount.usage_limit ? `/${discount.usage_limit}` : ''}</span>
                            {discount.valid_until && <span>Expires: {new Date(discount.valid_until).toLocaleDateString()}</span>}
                          </div>
                          {discount.banner_text && (
                            <p className="text-xs text-gold/70 mt-2 italic">Banner: "{discount.banner_text}"</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDiscountActive(discount)}
                            className="text-[#B0C4BF] hover:text-gold"
                            title={discount.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {discount.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditDiscount(discount)}
                            className="text-[#B0C4BF] hover:text-gold"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDiscount(discount.discount_id)}
                            className="text-[#B0C4BF] hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Discount Code Modal */}
            <Dialog open={showDiscountModal} onOpenChange={(open) => { setShowDiscountModal(open); if (!open) resetDiscountForm(); }}>
              <DialogContent className="bg-[#02120F] border-gold/30 text-[#FDFBF7] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">
                    {editingDiscount ? 'Edit Discount Code' : 'Create Discount Code'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateDiscount} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code *</Label>
                      <Input
                        value={discountForm.code}
                        onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., WELCOME20"
                        className="bg-surface border-gold/30 uppercase"
                        required
                        disabled={!!editingDiscount}
                      />
                    </div>
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={discountForm.name}
                        onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                        placeholder="e.g., Welcome Discount"
                        className="bg-surface border-gold/30"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description (Internal)</Label>
                    <Textarea
                      value={discountForm.description}
                      onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                      placeholder="Internal notes about this discount"
                      className="bg-surface border-gold/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount Type *</Label>
                      <Select
                        value={discountForm.discount_type}
                        onValueChange={(value) => setDiscountForm({ ...discountForm, discount_type: value })}
                      >
                        <SelectTrigger className="bg-surface border-gold/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#02120F] border-gold/30">
                          <SelectItem value="percentage">Percentage Off</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount Off</SelectItem>
                          <SelectItem value="free_trial">Free Trial (Days)</SelectItem>
                          <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>
                        {discountForm.discount_type === 'percentage' ? 'Percentage (%)' :
                         discountForm.discount_type === 'fixed_amount' ? 'Amount ($)' :
                         discountForm.discount_type === 'free_trial' ? 'Trial Days' :
                         'Free Months (Y)'} *
                      </Label>
                      <Input
                        type="number"
                        value={discountForm.value}
                        onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                        placeholder={discountForm.discount_type === 'percentage' ? '20' : '7'}
                        className="bg-surface border-gold/30"
                        required
                      />
                    </div>
                  </div>

                  {discountForm.discount_type === 'buy_x_get_y' && (
                    <div>
                      <Label>Paid Months (X) *</Label>
                      <Input
                        type="number"
                        value={discountForm.buy_x_value}
                        onChange={(e) => setDiscountForm({ ...discountForm, buy_x_value: e.target.value })}
                        placeholder="1"
                        className="bg-surface border-gold/30"
                        required
                      />
                      <p className="text-xs text-[#B0C4BF] mt-1">User pays for X months, then gets Y months free</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Usage Limit (Total)</Label>
                      <Input
                        type="number"
                        value={discountForm.usage_limit}
                        onChange={(e) => setDiscountForm({ ...discountForm, usage_limit: e.target.value })}
                        placeholder="Unlimited"
                        className="bg-surface border-gold/30"
                      />
                    </div>
                    <div>
                      <Label>Per User Limit</Label>
                      <Input
                        type="number"
                        value={discountForm.per_user_limit}
                        onChange={(e) => setDiscountForm({ ...discountForm, per_user_limit: parseInt(e.target.value) || 1 })}
                        placeholder="1"
                        className="bg-surface border-gold/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valid From</Label>
                      <Input
                        type="date"
                        value={discountForm.valid_from}
                        onChange={(e) => setDiscountForm({ ...discountForm, valid_from: e.target.value })}
                        className="bg-surface border-gold/30"
                      />
                    </div>
                    <div>
                      <Label>Valid Until</Label>
                      <Input
                        type="date"
                        value={discountForm.valid_until}
                        onChange={(e) => setDiscountForm({ ...discountForm, valid_until: e.target.value })}
                        className="bg-surface border-gold/30"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gold/20 pt-4">
                    <h4 className="text-sm font-medium text-gold mb-3">Display Options</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Show on Homepage</Label>
                          <p className="text-xs text-[#B0C4BF]">Display banner and badge on pricing pages</p>
                        </div>
                        <Switch
                          checked={discountForm.is_visible}
                          onCheckedChange={(checked) => setDiscountForm({ ...discountForm, is_visible: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Active</Label>
                          <p className="text-xs text-[#B0C4BF]">Code can be used at checkout</p>
                        </div>
                        <Switch
                          checked={discountForm.is_active}
                          onCheckedChange={(checked) => setDiscountForm({ ...discountForm, is_active: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  {discountForm.is_visible && (
                    <div className="space-y-4 border-t border-gold/20 pt-4">
                      <div>
                        <Label>Banner Text</Label>
                        <Input
                          value={discountForm.banner_text}
                          onChange={(e) => setDiscountForm({ ...discountForm, banner_text: e.target.value })}
                          placeholder="Use code WELCOME20 for 20% off!"
                          className="bg-surface border-gold/30"
                        />
                      </div>
                      <div>
                        <Label>Pricing Badge Text</Label>
                        <Input
                          value={discountForm.badge_text}
                          onChange={(e) => setDiscountForm({ ...discountForm, badge_text: e.target.value })}
                          placeholder="20% OFF"
                          className="bg-surface border-gold/30"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowDiscountModal(false); resetDiscountForm(); }}
                      className="border-gold/30"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gold text-[#02120F] hover:bg-[#E9C85C]">
                      {editingDiscount ? 'Update' : 'Create'} Discount Code
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="max-w-4xl space-y-8">
              {/* Send Notification Form */}
              <div className="glass-card rounded-lg p-6 border border-gold/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Send className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="font-serif text-xl text-[#FDFBF7]">Send Push Notification</h2>
                    <p className="text-[#B0C4BF] text-sm">Send notifications to your users' devices</p>
                  </div>
                </div>

                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div>
                    <Label className="text-[#FDFBF7]">Title *</Label>
                    <Input
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                      placeholder="e.g., New Books Added!"
                      className="bg-surface border-gold/30 text-[#FDFBF7]"
                      maxLength={50}
                      required
                      data-testid="notification-title"
                    />
                    <p className="text-xs text-[#B0C4BF] mt-1">{notificationForm.title.length}/50 characters</p>
                  </div>

                  <div>
                    <Label className="text-[#FDFBF7]">Message *</Label>
                    <Textarea
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                      placeholder="Write your message here..."
                      className="bg-surface border-gold/30 text-[#FDFBF7] min-h-[100px]"
                      maxLength={200}
                      required
                      data-testid="notification-message"
                    />
                    <p className="text-xs text-[#B0C4BF] mt-1">{notificationForm.message.length}/200 characters</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#FDFBF7]">Target Audience</Label>
                      <Select
                        value={notificationForm.target}
                        onValueChange={(value) => setNotificationForm({ ...notificationForm, target: value })}
                      >
                        <SelectTrigger className="bg-surface border-gold/30 text-[#FDFBF7]" data-testid="notification-target">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#02120F] border-gold/30">
                          <SelectItem value="all" className="text-[#FDFBF7]">Everyone (All Users)</SelectItem>
                          <SelectItem value="unsubscribed" className="text-[#FDFBF7]">Unsubscribed Users Only</SelectItem>
                          <SelectItem value="subscribed" className="text-[#FDFBF7]">Subscribed Users Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#B0C4BF] mt-1">
                        {notificationForm.target === 'all' && 'Send to all users who have enabled notifications'}
                        {notificationForm.target === 'unsubscribed' && 'Target users who haven\'t subscribed yet - great for promotions!'}
                        {notificationForm.target === 'subscribed' && 'Only send to paying subscribers'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-[#FDFBF7]">Deep Link URL (Optional)</Label>
                      <Input
                        value={notificationForm.url}
                        onChange={(e) => setNotificationForm({ ...notificationForm, url: e.target.value })}
                        placeholder="e.g., /pricing or /book/book_abc123"
                        className="bg-surface border-gold/30 text-[#FDFBF7]"
                        data-testid="notification-url"
                      />
                      <p className="text-xs text-[#B0C4BF] mt-1">Where should users go when they tap the notification?</p>
                    </div>
                  </div>

                  {/* Preview */}
                  {(notificationForm.title || notificationForm.message) && (
                    <div className="bg-[#082E26] rounded-lg p-4 border border-gold/20">
                      <p className="text-xs text-gold mb-2">Preview:</p>
                      <div className="bg-white rounded-lg p-3 shadow-lg max-w-xs">
                        <div className="flex items-start gap-2">
                          <div className="w-8 h-8 rounded bg-gold/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-gold" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{notificationForm.title || 'Notification Title'}</p>
                            <p className="text-gray-600 text-xs mt-0.5">{notificationForm.message || 'Your message will appear here'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={notificationSending || !notificationForm.title.trim() || !notificationForm.message.trim()}
                    className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                    data-testid="send-notification-btn"
                  >
                    {notificationSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Notification
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Notification History */}
              <div>
                <h3 className="font-serif text-lg text-[#FDFBF7] mb-4">Notification History</h3>
                
                {notificationHistoryLoading ? (
                  <div className="text-center py-8 text-[#B0C4BF]">Loading history...</div>
                ) : notificationHistory.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gold/30 rounded-lg">
                    <Bell className="w-12 h-12 mx-auto text-[#B0C4BF] mb-4" />
                    <p className="text-[#B0C4BF]">No notifications sent yet</p>
                    <p className="text-sm text-[#B0C4BF]/60">Your sent notifications will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notificationHistory.map((notif) => (
                      <div
                        key={notif.notification_id || notif.onesignal_id}
                        className="glass-card p-4 rounded-lg border border-gold/20"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[#FDFBF7] font-medium truncate">{notif.title}</h4>
                            <p className="text-sm text-[#B0C4BF] mt-1 line-clamp-2">{notif.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-[#B0C4BF]/70">
                              <span>Target: {notif.target === 'all' ? 'Everyone' : notif.target === 'unsubscribed' ? 'Unsubscribed' : 'Subscribed'}</span>
                              <span>Recipients: {notif.recipients || 0}</span>
                              <span>{new Date(notif.sent_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="max-w-4xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl text-[#FDFBF7]">Subscription Tiers & Pricing</h2>
                  <p className="text-[#B0C4BF] text-sm mt-1">Changes will update across the entire app and website</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetTierSettings}
                    disabled={tierSaving}
                    className="border-[rgba(212,175,55,0.3)] text-[#B0C4BF] hover:bg-surface"
                    data-testid="reset-tiers-btn"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  <Button
                    onClick={saveTierSettings}
                    disabled={tierSaving}
                    className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                    data-testid="save-tiers-btn"
                  >
                    {tierSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#02120F] border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {tierLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : Object.keys(tierSettings).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#B0C4BF] mb-4">No tier settings loaded. Click below to load defaults.</p>
                  <Button
                    onClick={fetchTierSettings}
                    className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load Tier Settings
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(tierSettings).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).map(([tierId, tierInfo]) => (
                    <div 
                      key={tierId} 
                      className={`glass-card rounded-sm p-6 border ${parseInt(tierId) === 4 ? 'border-gold' : 'border-[rgba(212,175,55,0.2)]'}`}
                      data-testid={`tier-setting-${tierId}`}
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-10 h-10 rounded-sm bg-gold/10 flex items-center justify-center`}>
                          <DollarSign className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                          <span className={`tier-badge tier-${tierId} text-xs mb-1`}>Tier {tierId}</span>
                          <p className="text-[#B0C4BF] text-xs">
                            {parseInt(tierId) === 0 ? 'Pay per book option' : 
                             parseInt(tierId) === 4 ? 'Premium unlimited plan' : 
                             'Monthly subscription'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-[#FDFBF7] text-sm">Tier Name</Label>
                          <Input
                            value={tierInfo.name || ''}
                            onChange={(e) => handleTierChange(tierId, 'name', e.target.value)}
                            className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1"
                            placeholder="e.g. Basic, Premium"
                            data-testid={`tier-${tierId}-name`}
                          />
                        </div>
                        <div>
                          <Label className="text-[#FDFBF7] text-sm">Price (USD/month)</Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0C4BF]">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tierInfo.price || 0}
                              onChange={(e) => handleTierChange(tierId, 'price', e.target.value)}
                              className="pl-7 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7]"
                              placeholder="0.00"
                              data-testid={`tier-${tierId}-price`}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[#FDFBF7] text-sm">Monthly Book Limit</Label>
                          <Input
                            type="number"
                            min="0"
                            value={tierInfo.book_limit ?? ''}
                            onChange={(e) => handleTierChange(tierId, 'book_limit', e.target.value)}
                            className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] mt-1"
                            placeholder="Empty = Unlimited"
                            data-testid={`tier-${tierId}-limit`}
                          />
                          <p className="text-xs text-[#B0C4BF] mt-1">Leave empty for unlimited</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 glass-card rounded-sm p-6 border border-[rgba(212,175,55,0.2)]">
                <h3 className="font-serif text-lg text-[#FDFBF7] mb-3">How Tier Changes Work</h3>
                <ul className="space-y-2 text-sm text-[#B0C4BF]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0"></span>
                    Price changes apply to new subscriptions only. Existing subscribers keep their current rate until renewal.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0"></span>
                    Book limit changes apply immediately to all users of that tier.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0"></span>
                    Tier 0 (Pay Per Book) price is always $0 as users buy individual books.
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
=======
>>>>>>> origin/main
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;