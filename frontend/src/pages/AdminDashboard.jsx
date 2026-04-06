import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import {
  BookOpen, Users, ArrowLeft, Plus, Edit, Trash2,
  Search, Save
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    pdf_price: ''
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
      const [statsRes, booksRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/books/all`),
        axios.get(`${API}/admin/users`, { headers })
      ]);
      setStats(statsRes.data);
      setBooks(booksRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
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
        pdf_price: bookForm.pdf_price ? parseFloat(bookForm.pdf_price) : null
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
      pdf_price: ''
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
      pdf_price: book.pdf_price ? String(book.pdf_price) : ''
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
                  <BookOpen className="w-5 h-5 text-gold" />
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
          <TabsList className="bg-surface border border-[rgba(212,175,55,0.2)] mb-6">
            <TabsTrigger value="books" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-books">
              Books
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-[#02120F]" data-testid="tab-users">
              Users
            </TabsTrigger>
          </TabsList>

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
                              Tier {t} - {t === 1 ? 'Basic ($20)' : t === 2 ? 'Standard ($40)' : t === 3 ? 'Advanced ($60)' : 'Premium ($80)'}
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
                        <BookOpen className="w-6 h-6 text-gold/30" />
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
