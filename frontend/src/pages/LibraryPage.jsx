import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  BookOpen, Search, Grid, List, Lock, BookMarked, Heart,
  LogOut, Menu, X, ChevronRight, User, Settings, PlayCircle, ShoppingCart
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

const LibraryPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchBooks();
    fetchContinueReading();
  }, [searchQuery]);

  const fetchBooks = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);

      const response = await axios.get(`${API}/books/all?${params}`);
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const fetchContinueReading = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/continue-reading`, { 
        headers,
        withCredentials: true 
      });
      setContinueReading(response.data.books || []);
    } catch (error) {
      console.error('Error fetching continue reading:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userTier = user?.subscription_tier || 0;
  const tierNames = ['Pay Per Book', 'Basic', 'Standard', 'Advanced', 'Premium'];
  const tierLimits = {0: 0, 1: 10, 2: 20, 3: 30, 4: 'Unlimited'};

  return (
    <div className="min-h-screen bg-dark">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/library" className="flex items-center gap-3" data-testid="library-logo">
              <div className="w-10 h-10 rounded-sm bg-gold flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#02120F]" />
              </div>
              <span className="font-serif text-xl font-semibold text-[#FDFBF7] hidden sm:block">Kitab Cloud</span>
            </Link>

            {/* Search Bar - Search by Title */}
            <div className="flex-1 max-w-md mx-4 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
                <Input
                  type="text"
                  placeholder="Search by book title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold"
                  data-testid="book-search-input"
                />
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Link to="/bookshelf">
                <Button variant="ghost" className="text-[#B0C4BF] hover:text-[#FDFBF7] hover:bg-[#082E26]" data-testid="nav-bookshelf">
                  <BookMarked className="w-5 h-5 mr-2" />
                  My Books
                </Button>
              </Link>
              <Link to="/favorites">
                <Button variant="ghost" className="text-[#B0C4BF] hover:text-[#FDFBF7] hover:bg-[#082E26]" data-testid="nav-favorites">
                  <Heart className="w-5 h-5 mr-2" />
                  Favorites
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-[#B0C4BF] hover:text-[#FDFBF7] hover:bg-[#082E26] gap-2" data-testid="user-menu-trigger">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                      {user?.picture ? (
                        <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <User className="w-4 h-4 text-gold" />
                      )}
                    </div>
                    <span className="hidden lg:inline">{user?.name?.split(' ')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] min-w-[200px]">
                  <div className="px-3 py-2 border-b border-[rgba(212,175,55,0.2)]">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-sm text-[#B0C4BF]">{user?.email}</p>
                    <div className={`tier-badge tier-${userTier} mt-2`}>
                      {tierNames[userTier]} • {tierLimits[userTier]} books/mo
                    </div>
                  </div>
                  {userTier < 4 && (
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-gold/10 text-gold">
                      <Link to="/pricing" data-testid="upgrade-link">
                        <ChevronRight className="w-4 h-4 mr-2" />
                        Upgrade Plan
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user?.is_admin && (
                    <DropdownMenuItem asChild className="cursor-pointer hover:bg-[#082E26]">
                      <Link to="/admin" data-testid="admin-link">
                        <Settings className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-[rgba(212,175,55,0.2)]" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-[#082E26] text-red-400" data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              className="md:hidden text-[#FDFBF7]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>

          {/* Mobile Search */}
          <div className="mt-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
              <Input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold"
                data-testid="mobile-book-search"
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgba(212,175,55,0.2)] bg-surface">
            <div className="px-4 py-4 space-y-2">
              <div className="pb-3 border-b border-[rgba(212,175,55,0.2)]">
                <p className="font-medium text-[#FDFBF7]">{user?.name}</p>
                <p className="text-sm text-[#B0C4BF]">{user?.email}</p>
                <div className={`tier-badge tier-${userTier} mt-2 inline-block`}>
                  {tierNames[userTier]}
                </div>
              </div>
              <Link to="/bookshelf" className="flex items-center gap-3 py-2 text-[#FDFBF7]" onClick={() => setMobileMenuOpen(false)}>
                <BookMarked className="w-5 h-5" />
                My Books
              </Link>
              <Link to="/favorites" className="flex items-center gap-3 py-2 text-[#FDFBF7]" onClick={() => setMobileMenuOpen(false)}>
                <Heart className="w-5 h-5" />
                Favorites
              </Link>
              {userTier < 4 && (
                <Link to="/pricing" className="flex items-center gap-3 py-2 text-gold" onClick={() => setMobileMenuOpen(false)}>
                  <ChevronRight className="w-5 h-5" />
                  Upgrade Plan
                </Link>
              )}
              {user?.is_admin && (
                <Link to="/admin" className="flex items-center gap-3 py-2 text-[#FDFBF7]" onClick={() => setMobileMenuOpen(false)}>
                  <Settings className="w-5 h-5" />
                  Admin Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="flex items-center gap-3 py-2 text-red-400 w-full">
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Continue Reading Section */}
        {continueReading.length > 0 && (
          <section className="mb-12">
            <h2 className="font-serif text-2xl text-[#FDFBF7] mb-6 flex items-center gap-2">
              <PlayCircle className="w-6 h-6 text-gold" />
              Continue Reading
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar">
              {continueReading.map((book) => (
                <Link 
                  key={book.book_id}
                  to={`/book/${book.book_id}`}
                  className="flex-shrink-0 w-40"
                  data-testid={`continue-${book.book_id}`}
                >
                  <div className="relative aspect-[2/3] rounded-sm overflow-hidden bg-surface border border-gold/50 book-card-hover">
                    {book.cover_url ? (
                      <img 
                        src={`${process.env.REACT_APP_BACKEND_URL}/api/covers/${book.cover_url.replace('darussalam-kitab/covers/', '')}`}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#004D40] to-[#00332A]">
                        <BookOpen className="w-10 h-10 text-gold/30" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#02120F] to-transparent p-2">
                      <p className="text-xs text-gold">Page {book.current_page}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[#FDFBF7] line-clamp-1">{book.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Subscription Banner for Tier 0 Users */}
        {userTier === 0 && (
          <div className="mb-8 p-6 rounded-sm bg-gradient-to-r from-gold/20 to-gold/5 border border-gold/30">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl text-[#FDFBF7] mb-1">Subscribe for Monthly Reading</h3>
                <p className="text-[#B0C4BF]">Get access to read multiple books each month, or buy individual PDFs below.</p>
              </div>
              <Link to="/pricing">
                <Button className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="subscribe-banner-btn">
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl text-[#FDFBF7]">
            All Books
            {searchQuery && <span className="text-gold ml-2">"{searchQuery}"</span>}
          </h2>
          
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'text-gold' : 'text-[#B0C4BF]'}
              data-testid="view-grid"
            >
              <Grid className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'text-gold' : 'text-[#B0C4BF]'}
              data-testid="view-list"
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-[#B0C4BF] mx-auto mb-4" />
            <h3 className="font-serif text-2xl text-[#FDFBF7] mb-2">No books found</h3>
            <p className="text-[#B0C4BF]">
              {searchQuery ? 'Try a different search term' : 'Books will appear here once added'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {books.map((book) => (
              <BookCard key={book.book_id} book={book} userTier={userTier} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <BookListItem key={book.book_id} book={book} userTier={userTier} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const BookCard = ({ book, userTier }) => {
  // Check access restrictions
  const isVolumeLocked = book.is_volume && userTier < 3;
  const isAdvancedLocked = book.is_advanced && userTier < 4;
  const isLocked = isVolumeLocked || isAdvancedLocked;
  
  return (
    <Link 
      to={`/book/${book.book_id}`}
      className="group flex-shrink-0 w-full"
      data-testid={`book-card-${book.book_id}`}
    >
      <div className="relative aspect-[2/3] rounded-sm overflow-hidden bg-surface border border-[rgba(212,175,55,0.2)] book-card-hover">
        {book.cover_url ? (
          <img 
            src={`${process.env.REACT_APP_BACKEND_URL}/api/covers/${book.cover_url.replace('darussalam-kitab/covers/', '')}`}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#004D40] to-[#00332A]">
            <BookOpen className="w-12 h-12 text-gold/30" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {book.is_volume && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/80 text-white rounded">VOLUME</span>
          )}
          {book.is_advanced && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/80 text-white rounded">ADVANCED</span>
          )}
        </div>
        
        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-[#02120F]/80 flex items-center justify-center">
            <div className="text-center">
              <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
              <span className="text-xs text-gold font-mono">
                {isAdvancedLocked ? 'TIER 4 ONLY' : 'TIER 3+'}
              </span>
            </div>
          </div>
        )}

        {/* Price badge */}
        {book.pdf_price && (
          <div className="absolute bottom-2 right-2 bg-gold text-[#02120F] text-xs font-bold px-2 py-1 rounded">
            <ShoppingCart className="w-3 h-3 inline mr-1" />
            ${book.pdf_price}
          </div>
        )}

        {/* Hover Overlay */}
        {!isLocked && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#02120F] via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        )}
      </div>
      
      <div className="mt-3">
        <h3 className="font-serif text-[#FDFBF7] line-clamp-2 group-hover:text-gold transition-colors">
          {book.title}
        </h3>
        {book.original_price && (
          <p className="text-xs text-[#B0C4BF] mt-1">Book: ${book.original_price}</p>
        )}
      </div>
    </Link>
  );
};

const BookListItem = ({ book, userTier }) => {
  const isVolumeLocked = book.is_volume && userTier < 3;
  const isAdvancedLocked = book.is_advanced && userTier < 4;
  const isLocked = isVolumeLocked || isAdvancedLocked;
  
  return (
    <Link 
      to={`/book/${book.book_id}`}
      className="flex gap-4 p-4 rounded-sm bg-surface border border-[rgba(212,175,55,0.2)] book-card-hover"
      data-testid={`book-list-${book.book_id}`}
    >
      <div className="relative w-20 h-28 flex-shrink-0 rounded-sm overflow-hidden">
        {book.cover_url ? (
          <img 
            src={`${process.env.REACT_APP_BACKEND_URL}/api/covers/${book.cover_url.replace('darussalam-kitab/covers/', '')}`}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#004D40] to-[#00332A]">
            <BookOpen className="w-8 h-8 text-gold/30" />
          </div>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-[#02120F]/80 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gold" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg text-[#FDFBF7]">{book.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              {book.is_volume && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/80 text-white rounded">VOLUME</span>
              )}
              {book.is_advanced && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-500/80 text-white rounded">ADVANCED</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {book.pdf_price && (
              <span className="bg-gold text-[#02120F] text-xs font-bold px-2 py-1 rounded">
                ${book.pdf_price}
              </span>
            )}
          </div>
        </div>
        {book.description && (
          <p className="text-sm text-[#B0C4BF] mt-2 line-clamp-2">{book.description}</p>
        )}
        {book.original_price && (
          <p className="text-xs text-[#B0C4BF] mt-2">Original book price: ${book.original_price}</p>
        )}
      </div>
    </Link>
  );
};

export default LibraryPage;
