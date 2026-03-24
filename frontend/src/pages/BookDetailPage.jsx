import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  BookOpen, ArrowLeft, BookMarked, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, X, ShoppingCart, Heart, Bookmark, Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BookDetailPage = () => {
  const { bookId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inBookshelf, setInBookshelf] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  const userTier = user?.subscription_tier || 0;
  const canSearch = userTier >= 3;

  useEffect(() => {
    fetchBook();
    checkBookshelf();
    checkFavorites();
    checkPurchased();
    loadReadingProgress();
    
    // Check if just purchased
    if (searchParams.get('purchased') === 'true') {
      toast.success('PDF purchased successfully! You can now read it.');
      setHasPurchased(true);
    }
  }, [bookId]);

  const fetchBook = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/books/${bookId}`, { 
        headers,
        withCredentials: true 
      });
      setBook(response.data);
      
      if (response.data.pdf_url) {
        const pdfResponse = await axios.get(`${API}/files/${response.data.pdf_url}`, {
          headers,
          withCredentials: true,
          responseType: 'blob'
        });
        const url = URL.createObjectURL(pdfResponse.data);
        setPdfUrl(url);
      }
    } catch (error) {
      console.error('Error fetching book:', error);
      if (error.response?.status === 403) {
        toast.error('Upgrade required to access this book');
      } else if (error.response?.status === 404) {
        toast.error('Book not found');
      }
      navigate('/library');
    } finally {
      setLoading(false);
    }
  };

  const checkBookshelf = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/bookshelf`, { 
        headers,
        withCredentials: true 
      });
      const bookIds = response.data.books.map(b => b.book_id);
      setInBookshelf(bookIds.includes(bookId));
    } catch (error) {
      console.error('Error checking bookshelf:', error);
    }
  };

  const checkFavorites = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/favorites`, { 
        headers,
        withCredentials: true 
      });
      const bookIds = response.data.books.map(b => b.book_id);
      setIsFavorite(bookIds.includes(bookId));
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const checkPurchased = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/purchased-books`, { 
        headers,
        withCredentials: true 
      });
      const bookIds = response.data.books.map(b => b.book_id);
      setHasPurchased(bookIds.includes(bookId));
    } catch (error) {
      console.error('Error checking purchases:', error);
    }
  };

  const loadReadingProgress = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/reading-progress/${bookId}`, { 
        headers,
        withCredentials: true 
      });
      if (response.data.page > 1) {
        setPageNumber(response.data.page);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveReadingProgress = useCallback(async (page) => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/reading-progress/${bookId}`, 
        { page },
        { headers, withCredentials: true }
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [token, bookId]);

  const handleAddToBookshelf = async () => {
    if (userTier === 0) {
      toast.error('Subscribe to add books to your monthly reading list');
      return;
    }
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/bookshelf/${bookId}`, {}, { 
        headers,
        withCredentials: true 
      });
      setInBookshelf(true);
      toast.success('Added to your monthly reading list!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to reading list');
    }
  };

  const handleRemoveFromBookshelf = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${API}/bookshelf/${bookId}`, { 
        headers,
        withCredentials: true 
      });
      setInBookshelf(false);
      toast.success('Removed from reading list');
    } catch (error) {
      toast.error('Failed to remove from reading list');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${bookId}`, { headers, withCredentials: true });
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites/${bookId}`, {}, { headers, withCredentials: true });
        setIsFavorite(true);
        toast.success('Added to favorites!');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleBuyPdf = async () => {
    if (!book?.pdf_price) {
      toast.error('This book is not available for purchase');
      return;
    }
    
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API}/purchase-pdf/${bookId}`, {}, { 
        headers, 
        withCredentials: true 
      });
      
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to initiate purchase');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePageChange = (newPage) => {
    setPageNumber(newPage);
    saveReadingProgress(newPage);
  };

  // Check if user can read this book
  const canRead = userTier > 0 || hasPurchased;
  const isVolumeLocked = book?.is_volume && userTier < 3;
  const isAdvancedLocked = book?.is_advanced && userTier < 4;
  const isLocked = isVolumeLocked || isAdvancedLocked;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!book) return null;

  return (
    <div className="min-h-screen bg-dark">
      {/* PDF Reader Modal - with copy protection */}
      {showReader && pdfUrl && (
        <div 
          className="fixed inset-0 z-50 bg-[#02120F]"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
        >
          {/* Reader Header */}
          <div className="glass sticky top-0 z-10 border-b border-[rgba(212,175,55,0.2)]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    saveReadingProgress(pageNumber);
                    setShowReader(false);
                  }}
                  className="text-[#FDFBF7] hover:bg-[#082E26]"
                  data-testid="close-reader-btn"
                >
                  <X className="w-5 h-5" />
                </Button>
                <h1 className="font-serif text-lg text-[#FDFBF7] truncate max-w-[200px] md:max-w-none">
                  {book.title}
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                {/* In-book search for Tier 3+ */}
                {canSearch && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSearch(!showSearch)}
                      className="text-[#B0C4BF] hover:text-gold"
                      data-testid="toggle-search-btn"
                    >
                      <Search className="w-5 h-5" />
                    </Button>
                    {showSearch && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-[rgba(212,175,55,0.2)] rounded-sm p-2">
                        <Input
                          type="text"
                          placeholder="Search in book..."
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] text-sm"
                          data-testid="in-book-search"
                        />
                        <p className="text-xs text-[#B0C4BF] mt-1">Press Enter to search</p>
                      </div>
                    )}
                  </div>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                  className="text-[#B0C4BF] hover:text-[#FDFBF7]"
                  data-testid="zoom-out-btn"
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <span className="text-[#B0C4BF] text-sm min-w-[50px] text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScale(s => Math.min(2, s + 0.25))}
                  className="text-[#B0C4BF] hover:text-[#FDFBF7]"
                  data-testid="zoom-in-btn"
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* PDF Content - copy protected */}
          <div 
            className="h-[calc(100vh-120px)] overflow-auto pdf-container"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber} 
                scale={scale}
                className="mx-auto"
                renderTextLayer={false}
              />
            </Document>
          </div>

          {/* Reader Footer with bookmark */}
          <div className="glass fixed bottom-0 left-0 right-0 border-t border-[rgba(212,175,55,0.2)]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-gold" />
                <span className="text-xs text-[#B0C4BF]">Page saved</span>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                  className="text-[#B0C4BF] hover:text-[#FDFBF7] disabled:opacity-30"
                  data-testid="prev-page-btn"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <span className="text-[#FDFBF7] font-mono text-sm">
                  {pageNumber} / {numPages || '?'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handlePageChange(Math.min(numPages || pageNumber, pageNumber + 1))}
                  disabled={pageNumber >= (numPages || 1)}
                  className="text-[#B0C4BF] hover:text-[#FDFBF7] disabled:opacity-30"
                  data-testid="next-page-btn"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>
              
              <div className="w-20"></div>
            </div>
          </div>
        </div>
      )}

      {/* Regular View */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <Link to="/library" className="inline-flex items-center gap-2 text-[#B0C4BF] hover:text-gold mb-8" data-testid="back-to-library">
          <ArrowLeft className="w-5 h-5" />
          Back to Library
        </Link>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {/* Book Cover */}
          <div className="md:col-span-1">
            <div className="relative aspect-[2/3] rounded-sm overflow-hidden bg-surface border border-[rgba(212,175,55,0.2)]">
              {book.cover_url ? (
                <img 
                  src={`${process.env.REACT_APP_BACKEND_URL}/api/covers/${book.cover_url.replace('darussalam-kitab/covers/', '')}`}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#004D40] to-[#00332A]">
                  <BookOpen className="w-20 h-20 text-gold/30" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                {book.is_volume && (
                  <span className="text-xs px-2 py-1 bg-purple-500/80 text-white rounded">VOLUME</span>
                )}
                {book.is_advanced && (
                  <span className="text-xs px-2 py-1 bg-red-500/80 text-white rounded">ADVANCED</span>
                )}
              </div>
            </div>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2">
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-4xl md:text-5xl text-[#FDFBF7] font-bold tracking-tight mb-4">
                  {book.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  {book.is_volume && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded">
                      Volume Collection (Tier 3+)
                    </span>
                  )}
                  {book.is_advanced && (
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded">
                      Advanced (Tier 4 Only)
                    </span>
                  )}
                  {canSearch && (
                    <span className="px-3 py-1 bg-gold/20 text-gold text-sm rounded">
                      In-book Search Available
                    </span>
                  )}
                </div>
              </div>

              {book.description && (
                <p className="text-[#B0C4BF] leading-relaxed text-lg">
                  {book.description}
                </p>
              )}

              {/* Pricing Info */}
              <div className="flex flex-wrap items-center gap-6 p-4 bg-surface rounded-sm border border-[rgba(212,175,55,0.2)]">
                {book.original_price && (
                  <div>
                    <p className="text-[#B0C4BF] text-sm">Physical Book</p>
                    <p className="text-[#FDFBF7] text-xl font-bold">${book.original_price}</p>
                  </div>
                )}
                {book.pdf_price && (
                  <div>
                    <p className="text-[#B0C4BF] text-sm">PDF Price</p>
                    <p className="text-gold text-xl font-bold">${book.pdf_price}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                {isLocked ? (
                  <Link to="/pricing">
                    <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="upgrade-btn">
                      Upgrade to Access
                    </Button>
                  </Link>
                ) : book.pdf_url ? (
                  canRead || hasPurchased ? (
                    <Button
                      size="lg"
                      onClick={() => setShowReader(true)}
                      className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold"
                      data-testid="read-now-btn"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      Read Now
                    </Button>
                  ) : (
                    <Link to="/pricing">
                      <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="subscribe-btn">
                        Subscribe to Read
                      </Button>
                    </Link>
                  )
                ) : (
                  <Button size="lg" disabled className="bg-surface text-[#B0C4BF]" data-testid="pdf-unavailable-btn">
                    PDF Coming Soon
                  </Button>
                )}

                {/* Buy PDF button */}
                {book.pdf_price && !hasPurchased && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBuyPdf}
                    className="border-gold text-gold hover:bg-gold/10"
                    data-testid="buy-pdf-btn"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy PDF (${book.pdf_price})
                  </Button>
                )}

                {hasPurchased && (
                  <span className="text-green-500 text-sm self-center">✓ PDF Purchased</span>
                )}

                {/* Add to reading list (subscribers only) */}
                {userTier > 0 && !isLocked && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={inBookshelf ? handleRemoveFromBookshelf : handleAddToBookshelf}
                    className={`border-[rgba(212,175,55,0.3)] ${
                      inBookshelf 
                        ? 'bg-gold/10 text-gold border-gold' 
                        : 'text-[#FDFBF7] hover:bg-[#082E26]'
                    }`}
                    data-testid="bookshelf-btn"
                  >
                    <BookMarked className="w-5 h-5 mr-2" />
                    {inBookshelf ? 'In Reading List' : 'Add to Reading List'}
                  </Button>
                )}

                {/* Favorite button */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleToggleFavorite}
                  className={`border-[rgba(212,175,55,0.3)] ${
                    isFavorite 
                      ? 'bg-red-500/10 text-red-400 border-red-400' 
                      : 'text-[#FDFBF7] hover:bg-[#082E26]'
                  }`}
                  data-testid="favorite-btn"
                >
                  <Heart className={`w-5 h-5 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </Button>
              </div>

              {/* Book Info */}
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-[rgba(212,175,55,0.2)]">
                <div>
                  <p className="text-[#B0C4BF] text-sm mb-1">Code</p>
                  <p className="text-gold font-mono">{book.darussalam_code}</p>
                </div>
                <div>
                  <p className="text-[#B0C4BF] text-sm mb-1">Added</p>
                  <p className="text-[#FDFBF7]">
                    {new Date(book.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;
