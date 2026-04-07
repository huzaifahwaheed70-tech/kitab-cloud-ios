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

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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
  const [pdfDocument, setPdfDocument] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [pageSaved, setPageSaved] = useState(false);

  const userTier = user?.subscription_tier || 0;
  const canSearch = userTier >= 3;

  const getAuthHeaders = () => {
    const storedToken = localStorage.getItem('auth_token') || token;
    return storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
  };

  useEffect(() => {
    fetchBook();
    checkBookshelf();
    checkFavorites();
    checkPurchased();
    loadReadingProgress();

    if (searchParams.get('purchased') === 'true') {
      toast.success('PDF purchased successfully! You can now read it.');
      setHasPurchased(true);
    }
  }, [bookId, token]);

  const fetchBook = async () => {
    try {
      const response = await axios.get(`${API}/books/${bookId}`, { headers: getAuthHeaders() });
      setBook(response.data);

      if (response.data.pdf_url) {
        const pdfResponse = await axios.get(`${API}/files/${response.data.pdf_url}`, {
          headers: getAuthHeaders(),
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
    try {
      const response = await axios.get(`${API}/bookshelf`, { headers: getAuthHeaders() });
      const bookIds = response.data.books.map(b => b.book_id);
      setInBookshelf(bookIds.includes(bookId));
    } catch (error) {
      console.error('Error checking bookshelf:', error);
    }
  };

  const checkFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, { headers: getAuthHeaders() });
      const bookIds = response.data.books.map(b => b.book_id);
      setIsFavorite(bookIds.includes(bookId));
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const checkPurchased = async () => {
    try {
      const response = await axios.get(`${API}/purchased-books`, { headers: getAuthHeaders() });
      const bookIds = response.data.books.map(b => b.book_id);
      setHasPurchased(bookIds.includes(bookId));
    } catch (error) {
      console.error('Error checking purchases:', error);
    }
  };

  const loadReadingProgress = async () => {
    try {
      const response = await axios.get(`${API}/reading-progress/${bookId}`, { headers: getAuthHeaders() });
      if (response.data.page > 1) {
        setPageNumber(response.data.page);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveReadingProgress = useCallback(async (page, showToast = false) => {
    try {
      await axios.post(`${API}/reading-progress/${bookId}?page=${page}`, {}, { headers: getAuthHeaders() });
      if (showToast) {
        setPageSaved(true);
        toast.success(`Page ${page} saved!`);
        setTimeout(() => setPageSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      if (showToast) toast.error('Failed to save progress');
    }
  }, [token, bookId]);

  const handleAddToBookshelf = async () => {
    if (userTier === 0) {
      toast.error('Subscribe to add books to your monthly reading list');
      return;
    }
    try {
      await axios.post(`${API}/bookshelf/${bookId}`, {}, { headers: getAuthHeaders() });
      setInBookshelf(true);
      toast.success('Added to your monthly reading list!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to reading list');
    }
  };

  const handleRemoveFromBookshelf = async () => {
    try {
      await axios.delete(`${API}/bookshelf/${bookId}`, { headers: getAuthHeaders() });
      setInBookshelf(false);
      toast.success('Removed from reading list');
    } catch (error) {
      toast.error('Failed to remove from reading list');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${bookId}`, { headers: getAuthHeaders() });
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await axios.post(`${API}/favorites/${bookId}`, {}, { headers: getAuthHeaders() });
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
      const response = await axios.post(`${API}/purchase-pdf/${bookId}`, {}, { headers: getAuthHeaders() });
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to initiate purchase');
    }
  };

  const onDocumentLoadSuccessWithDoc = (pdf) => {
    setNumPages(pdf.numPages);
    setPdfDocument(pdf);
  };

  const searchInBook = async () => {
    if (!pdfDocument || !searchText.trim() || !canSearch) return;
    setIsSearching(true);
    setSearchResults([]);
    const results = [];
    const searchTerm = searchText.toLowerCase();

    try {
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ').toLowerCase();
        if (pageText.includes(searchTerm)) {
          results.push({
            page: i,
            preview: pageText.substring(
              Math.max(0, pageText.indexOf(searchTerm) - 30),
              pageText.indexOf(searchTerm) + searchTerm.length + 30
            )
          });
        }
      }
      setSearchResults(results);
      setCurrentSearchIndex(0);
      if (results.length > 0) {
        setPageNumber(results[0].page);
        toast.success(`Found ${results.length} result${results.length > 1 ? 's' : ''}`);
      } else {
        toast.info('No results found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    setPageNumber(searchResults[nextIndex].page);
  };

  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    setPageNumber(searchResults[prevIndex].page);
  };

  const handlePageChange = (newPage) => {
    setPageNumber(newPage);
    saveReadingProgress(newPage);
  };

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
      {showReader && pdfUrl && (
        <div
          className="fixed inset-0 z-50 bg-[#02120F] flex flex-col"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
        >
          <div className="glass border-b border-[rgba(212,175,55,0.2)] flex-shrink-0">
            <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    saveReadingProgress(pageNumber, true);
                    setShowReader(false);
                  }}
                  className="text-[#FDFBF7] hover:bg-[#082E26] h-8 w-8"
                  data-testid="close-reader-btn"
                >
                  <X className="w-5 h-5" />
                </Button>
                <h1 className="font-serif text-sm md:text-lg text-[#FDFBF7] truncate max-w-[100px] md:max-w-[300px]">
                  {book.title}
                </h1>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => saveReadingProgress(pageNumber, true)}
                  className={`h-8 w-8 ${pageSaved ? 'text-gold' : 'text-[#B0C4BF] hover:text-gold'}`}
                  data-testid="save-page-btn"
                >
                  <Bookmark className={`w-4 h-4 ${pageSaved ? 'fill-gold' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="text-[#B0C4BF] hover:text-[#FDFBF7] h-8 w-8" data-testid="zoom-out-btn">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-[#B0C4BF] text-xs min-w-[35px] text-center hidden md:inline">
                  {Math.round(scale * 100)}%
                </span>
                <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2, s + 0.25))} className="text-[#B0C4BF] hover:text-[#FDFBF7] h-8 w-8" data-testid="zoom-in-btn">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                {canSearch && (
                  <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)} className={`h-8 w-8 ${showSearch ? 'text-gold' : 'text-[#B0C4BF] hover:text-gold'}`} data-testid="toggle-search-btn">
                    <Search className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {canSearch && showSearch && (
            <div className="glass border-b border-[rgba(212,175,55,0.2)] px-3 py-2 flex-shrink-0">
              <div className="max-w-xl mx-auto flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Search in book..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchInBook()}
                    className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] text-sm pr-10"
                    data-testid="in-book-search"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <Button onClick={searchInBook} disabled={isSearching || !searchText.trim()} className="bg-gold text-[#02120F] hover:bg-[#E9C85C] h-9 px-3" data-testid="search-btn">
                  Search
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-w-xl mx-auto mt-2 flex items-center justify-between text-sm">
                  <span className="text-[#B0C4BF]">Result {currentSearchIndex + 1} of {searchResults.length}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={goToPrevResult} className="text-[#B0C4BF] hover:text-[#FDFBF7] h-7 px-2">
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToNextResult} className="text-[#B0C4BF] hover:text-[#FDFBF7] h-7 px-2">
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto pdf-container" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccessWithDoc}
              loading={
                <div className="flex items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
              error={
                <div className="flex items-center justify-center py-20 text-red-400">
                  Failed to load PDF. Please try again.
                </div>
              }
            >
              <Page pageNumber={pageNumber} scale={scale} className="mx-auto" renderTextLayer={false} />
            </Document>
          </div>

          <div className="glass border-t border-[rgba(212,175,55,0.2)] flex-shrink-0 mb-12 md:mb-0">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-6">
              <Button variant="ghost" size="icon" onClick={() => handlePageChange(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} className="text-[#B0C4BF] hover:text-[#FDFBF7] disabled:opacity-30 h-12 w-12" data-testid="prev-page-btn">
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <div className="flex items-center gap-3 min-w-[100px] justify-center">
                <span className="text-[#FDFBF7] font-mono text-base">{pageNumber} / {numPages || '?'}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handlePageChange(Math.min(numPages || pageNumber, pageNumber + 1))} disabled={pageNumber >= (numPages || 1)} className="text-[#B0C4BF] hover:text-[#FDFBF7] disabled:opacity-30 h-12 w-12" data-testid="next-page-btn">
                <ChevronRight className="w-8 h-8" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <Link to="/library" className="inline-flex items-center gap-2 text-[#B0C4BF] hover:text-gold mb-8" data-testid="back-to-library">
          <ArrowLeft className="w-5 h-5" />
          Back to Library
        </Link>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
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
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                {book.is_volume && <span className="text-xs px-2 py-1 bg-purple-500/80 text-white rounded">VOLUME</span>}
                {book.is_advanced && <span className="text-xs px-2 py-1 bg-red-500/80 text-white rounded">ADVANCED</span>}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-4xl md:text-5xl text-[#FDFBF7] font-bold tracking-tight mb-4">
                  {book.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  {book.is_volume && <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded">Volume Collection (Tier 3+)</span>}
                  {book.is_advanced && <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded">Advanced (Tier 4 Only)</span>}
                  {canSearch && <span className="px-3 py-1 bg-gold/20 text-gold text-sm rounded">In-book Search Available</span>}
                </div>
              </div>

              {book.description && (
                <p className="text-[#B0C4BF] leading-relaxed text-lg">{book.description}</p>
              )}

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

              <div className="flex flex-wrap gap-4 pt-4">
                {isLocked ? (
                  <Link to="/pricing">
                    <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="upgrade-btn">
                      Upgrade to Access
                    </Button>
                  </Link>
                ) : book.pdf_url ? (
                  canRead || hasPurchased ? (
                    <Button size="lg" onClick={() => setShowReader(true)} className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="read-now-btn">
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

                {book.pdf_price && !hasPurchased && (
                  <Button size="lg" variant="outline" onClick={handleBuyPdf} className="border-gold text-gold hover:bg-gold/10" data-testid="buy-pdf-btn">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy PDF (${book.pdf_price})
                  </Button>
                )}

                {hasPurchased && (
                  <span className="text-green-500 text-sm self-center">✓ PDF Purchased</span>
                )}

                {userTier > 0 && !isLocked && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={inBookshelf ? handleRemoveFromBookshelf : handleAddToBookshelf}
                    className={`border-[rgba(212,175,55,0.3)] ${inBookshelf ? 'bg-gold/10 text-gold border-gold' : 'text-[#FDFBF7] hover:bg-[#082E26]'}`}
                    data-testid="bookshelf-btn"
                  >
                    <BookMarked className="w-5 h-5 mr-2" />
                    {inBookshelf ? 'In Reading List' : 'Add to Reading List'}
                  </Button>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleToggleFavorite}
                  className={`border-[rgba(212,175,55,0.3)] ${isFavorite ? 'bg-red-500/10 text-red-400 border-red-400' : 'text-[#FDFBF7] hover:bg-[#082E26]'}`}
                  data-testid="favorite-btn"
                >
                  <Heart className={`w-5 h-5 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-[rgba(212,175,55,0.2)]">
                <div>
                  <p className="text-[#B0C4BF] text-sm mb-1">Code</p>
                  <p className="text-gold font-mono">{book.darussalam_code}</p>
                </div>
                <div>
                  <p className="text-[#B0C4BF] text-sm mb-1">Added</p>
                  <p className="text-[#FDFBF7]">{new Date(book.created_at).toLocaleDateString()}</p>
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
