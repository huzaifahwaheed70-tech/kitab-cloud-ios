import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  Library, Users, ArrowLeft, Plus, Edit, Trash2, 
  Search, Save, Settings, DollarSign, RefreshCw, Tag, Eye, EyeOff,
  Bell, Send, Loader2, BookOpen
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

  const fetchTierSettings = async () => {
    const headers = getAuthHeaders();
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
    const headers = getAuthHeaders();
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
    
    const headers = getAuthHeaders();
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
    const headers = getAuthHeaders();
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
    const headers = getAuthHeaders();
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
    
    const headers = getAuthHeaders();
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
    const headers = getAuthHeaders();
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
    
    const headers = getAuthHeaders();
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
    const headers = getAuthHeaders();
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
          )}

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
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
