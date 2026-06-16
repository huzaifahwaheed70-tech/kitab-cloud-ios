import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  ArrowLeft, BookMarked, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, X, ShoppingCart, Heart, Bookmark, Search, Library, ExternalLink, Download, Tag, Loader2, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { openPaymentUrl } from '../utils/browser';
import { shouldHideExternalPurchases, shouldHideDiscounts, getWebsiteUrl, isIOSNativeApp, isCapacitorApp } from '../utils/platform';
import { Filesystem, Directory } from '@capacitor/filesystem';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BookDetailPage = () => {
  const { bookId } = useParams();
  const [searchParams] = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();
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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState({ show: false, url: null });
  const [isIOSApp, setIsIOSApp] = useState(false);
  const [bookshelfStatus, setBookshelfStatus] = useState({ is_locked: false, count: 0, limit: null });
  
  // Discount popup state for PDF purchases (not used on iOS)
  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [visibleDiscounts, setVisibleDiscounts] = useState([]);
  
  // Admin test purchase state
  const [adminTestLoading, setAdminTestLoading] = useState(false);

  const userTier = user?.subscription_tier || 0;
  
  // Check if iOS app (hide external purchases - PDF and physical books)
  useEffect(() => {
    setIsIOSApp(shouldHideExternalPurchases());
  }, []);
  
  // Fetch visible discount codes (not on iOS - Apple handles their own discounts)
  useEffect(() => {
    if (shouldHideDiscounts()) return;
    
    const fetchVisibleDiscounts = async () => {
      try {
        const response = await axios.get(`${API}/discount/visible`);
        setVisibleDiscounts(response.data.discounts || []);
      } catch (error) {
        console.error('Error fetching discounts:', error);
      }
    };
    fetchVisibleDiscounts();
  }, []);
  
  const canSearch = userTier >= 3;

  useEffect(() => {
    // Only fetch once auth is fully resolved
    if (!authLoading) {
      // Always try to fetch the book (it's public info)
      fetchBook();
      // Only fetch user-specific data if authenticated (not guest)
      if (user && token && !user.is_guest) {
        checkBookshelf();
        checkFavorites();
        checkPurchased();
        loadReadingProgress();
      }
    }
    
    // Check if just purchased (from URL param after Stripe redirect)
    if (searchParams.get('purchased') === 'true') {
      toast.success('PDF purchased successfully! You can now download it.');
      setHasPurchased(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, authLoading, user, token]);

  const fetchBook = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/books/${bookId}`, { 
        headers,
        withCredentials: true 
      });
      setBook(response.data);
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

  const loadPdf = async () => {
    if (!book?.pdf_url || !token) return;
    setPdfLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const pdfResponse = await axios.get(`${API}/files/${book.pdf_url}`, {
        headers,
        withCredentials: true,
        responseType: 'blob'
      });
      const url = URL.createObjectURL(pdfResponse.data);
      setPdfUrl(url);
      setShowReader(true);
    } catch (error) {
      console.error('Error loading PDF:', error);
      if (error.response?.status === 403) {
        const detail = error.response?.data?.detail || 'Access denied';
        if (detail.includes('Monthly reading limit')) {
          toast.error(detail);
        } else if (detail.includes('Purchase')) {
          toast.error('Please purchase this PDF or subscribe to read.');
        } else {
          toast.error(detail);
        }
      } else if (error.response?.status === 401) {
        toast.error('Please log in to read this book');
      } else {
        toast.error('Failed to load PDF. Please try again.');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleReadNow = () => {
    // Block guest users from reading
    if (user?.is_guest) {
      toast.error('Please create an account to read books');
      navigate('/register');
      return;
    }
    
    if (pdfUrl) {
      setShowReader(true);
    } else {
      loadPdf();
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
      setBookshelfStatus({
        is_locked: response.data.is_locked || false,
        count: response.data.count || 0,
        limit: response.data.limit
      });
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

  const saveReadingProgress = useCallback(async (page, showToast = false) => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API}/reading-progress/${bookId}?page=${page}`, 
        {},
        { headers, withCredentials: true }
      );
      if (showToast) {
        setPageSaved(true);
        toast.success(`Page ${page} saved!`);
        setTimeout(() => setPageSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
      if (showToast) {
        toast.error('Failed to save progress');
      }
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
      // Refresh bookshelf status
      checkBookshelf();
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
      // Refresh bookshelf status
      checkBookshelf();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove from reading list');
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

  // Show discount popup before buying PDF
  const initiateBuyPdf = () => {
    if (!book?.pdf_price) {
      toast.error('This book is not available for purchase');
      return;
    }

    // For guest users, redirect to the website
    if (user?.is_guest) {
      const websiteUrl = `https://kitab-cloud.emergent.host/book/${bookId}`;
      window.open(websiteUrl, '_blank');
      return;
    }

    // Show discount popup first
    setDiscountCode('');
    setDiscountInfo(null);
    setShowDiscountPopup(true);
  };

  // Validate discount code for PDF purchase
  const validateDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error('Please enter a discount code');
      return;
    }
    
    setDiscountLoading(true);
    
    try {
      const response = await axios.post(
        `${API}/discount/validate`,
        { code: discountCode.trim(), book_id: bookId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, withCredentials: true }
      );
      
      setDiscountInfo(response.data);
      toast.success(`Discount applied: ${response.data.description || response.data.name}`);
    } catch (error) {
      console.error('Error validating discount:', error);
      toast.error(error.response?.data?.detail || 'Invalid discount code');
      setDiscountInfo(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  // Proceed to checkout with or without discount
  const proceedToPdfCheckout = async (withDiscount = false) => {
    setShowDiscountPopup(false);
    setPurchaseLoading(true);
    
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const requestData = {};
      
      // Include discount code if applied
      if (withDiscount && discountInfo) {
        requestData.discount_code = discountCode;
      }
      
      const response = await axios.post(`${API}/purchase-pdf/${bookId}`, requestData, { 
        headers, 
        withCredentials: true 
      });
      
      // Open payment URL
      const result = await openPaymentUrl(response.data.url);
      
      // On iOS, show modal with tappable link
      if (result.showModal) {
        setPaymentModal({ show: true, url: result.url });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate purchase');
    } finally {
      setPurchaseLoading(false);
      setDiscountCode('');
      setDiscountInfo(null);
    }
  };

  // Legacy function for backward compatibility
  const handleBuyPdf = async () => {
    initiateBuyPdf();
  };

  // Admin test PDF purchase - grants free access
  const handleAdminTestPdfPurchase = async () => {
    if (!isAdmin) return;
    
    setAdminTestLoading(true);
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(
        `${API}/admin/test-pdf-purchase/${bookId}`,
        {},
        { headers, withCredentials: true }
      );
      
      if (response.data.already_owned) {
        toast.info(response.data.message);
      } else {
        toast.success(response.data.message);
        // Refresh purchase status
        checkPurchased();
      }
    } catch (error) {
      console.error('Admin test purchase error:', error);
      toast.error(error.response?.data?.detail || 'Test purchase failed');
    } finally {
      setAdminTestLoading(false);
    }
  };

  // Download PDF state
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  // Download PDF to device files
  const handleDownloadPdf = async () => {
    if (!book?.pdf_url || !token) {
      toast.error('PDF not available or please log in');
      return;
    }
    
    setDownloadLoading(true);
    toast.info('Preparing download...');
    
    try {
      // Fetch PDF through the authenticated API endpoint
      const headers = { Authorization: `Bearer ${token}` };
      const pdfResponse = await axios.get(`${API}/files/${book.pdf_url}`, {
        headers,
        withCredentials: true,
        responseType: 'blob'
      });
      
      const pdfBlob = pdfResponse.data;
      const fileName = `${book.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.pdf`;
      
      // Check if running in Capacitor native app
      if (isCapacitorApp()) {
        try {
          // Convert blob to base64 for Capacitor Filesystem
          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
              // Remove data:application/pdf;base64, prefix
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(pdfBlob);
          const base64Data = await base64Promise;
          
          // Save to device Downloads/Documents folder
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });
          
          toast.success(`PDF saved to Documents folder: ${fileName}`);
          console.log('File saved at:', result.uri);
        } catch (fsError) {
          console.error('Filesystem error:', fsError);
          // Fallback: open blob URL
          const blobUrl = URL.createObjectURL(pdfBlob);
          window.open(blobUrl, '_blank');
          toast.info('PDF opened. Use Share to save to Files.');
        }
      } else {
        // Web browser - create download link
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success('Download started!');
      }
    } catch (error) {
      console.error('Download error:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied. Please ensure you have purchased this PDF.');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to download');
      } else {
        toast.error('Failed to download PDF. Please try again.');
      }
    } finally {
      setDownloadLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Store PDF document reference for text search
  const onDocumentLoadSuccessWithDoc = (pdf) => {
    setNumPages(pdf.numPages);
    setPdfDocument(pdf);
  };

  // In-book search function
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

  // Check if user can read this book
  // Admins can read all books for free
  // Subscribed users must have book in their reading list
  const isAdmin = user?.is_admin === true;
  const isInReadingList = inBookshelf || hasPurchased || isAdmin;
  const canRead = isAdmin || hasPurchased || (userTier > 0 && inBookshelf);
  const isVolumeLocked = book?.is_volume && userTier < 3 && !isAdmin;
  const isAdvancedLocked = book?.is_advanced && userTier < 4 && !isAdmin;
  const isLocked = isVolumeLocked || isAdvancedLocked;
  const needsToAddToReadingList = userTier > 0 && !inBookshelf && !hasPurchased && !isAdmin;

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
          className="fixed inset-0 z-50 bg-[#02120F] flex flex-col"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Reader Header - Larger tap targets on mobile */}
          <div className="glass border-b border-[rgba(212,175,55,0.2)] flex-shrink-0 order-first md:order-first">
            <div className="max-w-7xl mx-auto px-4 py-3 md:px-4 md:py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    saveReadingProgress(pageNumber, true);
                    setShowReader(false);
                  }}
                  className="text-[#FDFBF7] hover:bg-[#082E26] h-11 w-11 min-h-[44px] min-w-[44px]"
                  data-testid="close-reader-btn"
                >
                  <X className="w-6 h-6" />
                </Button>
                <h1 className="font-serif text-sm md:text-lg text-[#FDFBF7] truncate max-w-[120px] md:max-w-[300px]">
                  {book.title}
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Save Page Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => saveReadingProgress(pageNumber, true)}
                  className={`h-11 w-11 min-h-[44px] min-w-[44px] ${pageSaved ? 'text-gold bg-gold/10' : 'text-[#B0C4BF] hover:text-gold'}`}
                  data-testid="save-page-btn"
                >
                  <Bookmark className={`w-5 h-5 ${pageSaved ? 'fill-gold' : ''}`} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                  className="text-[#B0C4BF] hover:text-[#FDFBF7] h-11 w-11 min-h-[44px] min-w-[44px]"
                  data-testid="zoom-out-btn"
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
                <span className="text-[#B0C4BF] text-xs min-w-[35px] text-center hidden md:inline">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScale(s => Math.min(2, s + 0.25))}
                  className="text-[#B0C4BF] hover:text-[#FDFBF7] h-11 w-11 min-h-[44px] min-w-[44px]"
                  data-testid="zoom-in-btn"
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
                
                {/* Search Toggle for Mobile */}
                {canSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearch(!showSearch)}
                    className={`h-11 w-11 min-h-[44px] min-w-[44px] ${showSearch ? 'text-gold bg-gold/10' : 'text-[#B0C4BF] hover:text-gold'}`}
                    data-testid="toggle-search-btn"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* In-book Search Bar - Always visible when toggled (Tier 3+) */}
          {canSearch && showSearch && (
            <div className="glass border-b border-[rgba(212,175,55,0.2)] px-3 py-2 flex-shrink-0">
              <div className="max-w-xl mx-auto flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Search in book..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') searchInBook();
                      e.stopPropagation();
                    }}
                    className="bg-[#082E26] border-[rgba(212,175,55,0.2)] text-[#FDFBF7] text-sm pr-10"
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    data-testid="in-book-search"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={searchInBook}
                  disabled={isSearching || !searchText.trim()}
                  className="bg-gold text-[#02120F] hover:bg-[#E9C85C] h-9 px-3"
                  data-testid="search-btn"
                >
                  Search
                </Button>
              </div>
              
              {/* Search Results Navigation */}
              {searchResults.length > 0 && (
                <div className="max-w-xl mx-auto mt-2 flex items-center justify-between text-sm">
                  <span className="text-[#B0C4BF]">
                    Result {currentSearchIndex + 1} of {searchResults.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevResult}
                      className="text-[#B0C4BF] hover:text-[#FDFBF7] h-7 px-2"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextResult}
                      className="text-[#B0C4BF] hover:text-[#FDFBF7] h-7 px-2"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PDF Content */}
          <div 
            className="flex-1 overflow-auto pdf-container"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            onCopy={(e) => e.preventDefault()}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccessWithDoc}
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
                renderTextLayer={canSearch}
              />
            </Document>
          </div>

          {/* Reader Footer with navigation - Centered at bottom on mobile for better accessibility */}
          <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
            <div className="glass rounded-full border-2 border-gold/50 px-4 py-3 flex items-center gap-4 shadow-xl bg-[#02120F]/95">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="text-gold hover:text-[#FDFBF7] hover:bg-gold/20 disabled:opacity-30 h-12 w-12 min-h-[48px] min-w-[48px]"
                data-testid="prev-page-btn-mobile"
              >
                <ChevronLeft className="w-7 h-7" />
              </Button>
              
              <span className="text-[#FDFBF7] font-mono text-base min-w-[70px] text-center font-semibold">
                {pageNumber}/{numPages || '?'}
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(Math.min(numPages || pageNumber, pageNumber + 1))}
                disabled={pageNumber >= (numPages || 1)}
                className="text-gold hover:text-[#FDFBF7] hover:bg-gold/20 disabled:opacity-30 h-12 w-12 min-h-[48px] min-w-[48px]"
                data-testid="next-page-btn-mobile"
              >
                <ChevronRight className="w-7 h-7" />
              </Button>
            </div>
          </div>

          {/* Desktop footer */}
          <div className="hidden md:block glass border-t border-[rgba(212,175,55,0.2)] flex-shrink-0">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="text-[#B0C4BF] hover:text-[#FDFBF7] disabled:opacity-30 h-12 w-12"
                data-testid="prev-page-btn"
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              
              <div className="flex items-center gap-3 min-w-[100px] justify-center">
                <span className="text-[#FDFBF7] font-mono text-base">
                  {pageNumber} / {numPages || '?'}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(Math.min(numPages || pageNumber, pageNumber + 1))}
                disabled={pageNumber >= (numPages || 1)}
                className="text-[#B0C4BF] hover:text-[#FDFBF7] disabled:opacity-30 h-12 w-12"
                data-testid="next-page-btn"
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
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
                  <img src="/logo.png" alt="Book" className="w-20 h-20 opacity-30" />
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

              {/* Pricing Info - Always show prices (RevenueCat handles iOS subscriptions) */}
              {/* Hide on iOS only for PDF/Physical since those purchases are disabled */}
              {!isIOSApp && (book.original_price || book.pdf_price) && (
              <div className="flex flex-wrap items-center gap-6 p-4 bg-surface rounded-sm border border-[rgba(212,175,55,0.2)]">
                {book.original_price && (
                  <div>
                    <p className="text-[#B0C4BF] text-sm">Physical Book</p>
                    <p className="text-[#FDFBF7] text-xl font-bold">${book.original_price}</p>
                  </div>
                )}
                {book.pdf_price && (
                  <div>
                    <p className="text-[#B0C4BF] text-sm">PDF</p>
                    <p className="text-gold text-xl font-bold">${book.pdf_price}</p>
                  </div>
                )}
              </div>
              )}

              {/* Reading List Notice for Subscribed Users */}
              {needsToAddToReadingList && book.pdf_url && (
                <div className={`p-4 rounded-sm border ${bookshelfStatus.is_locked ? 'bg-red-500/10 border-red-500/30' : 'bg-gold/10 border-gold/30'}`}>
                  <div className="flex items-start gap-3">
                    <BookMarked className={`w-5 h-5 mt-0.5 ${bookshelfStatus.is_locked ? 'text-red-400' : 'text-gold'}`} />
                    <div>
                      {bookshelfStatus.is_locked ? (
                        <>
                          <p className="text-[#FDFBF7] font-medium">Reading List Full</p>
                          <p className="text-[#B0C4BF] text-sm">
                            You've reached your monthly limit of {bookshelfStatus.limit} books. 
                            Your reading list is locked until next month. Upgrade your tier for a higher limit.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[#FDFBF7] font-medium">Add to Your Reading List</p>
                          <p className="text-[#B0C4BF] text-sm">
                            To read this book, add it to your monthly reading list first. 
                            You have {bookshelfStatus.limit === null ? 'unlimited' : (bookshelfStatus.limit - bookshelfStatus.count)} slots remaining this month.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                {isLocked ? (
                  // Locked book - redirect to pricing (works for both web and iOS with RevenueCat)
                  <Link to="/pricing">
                    <Button size="lg" className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold" data-testid="upgrade-btn">
                      Upgrade to Access
                    </Button>
                  </Link>
                ) : book.pdf_url ? (
                  canRead ? (
                    <Button
                      size="lg"
                      onClick={handleReadNow}
                      disabled={pdfLoading}
                      className="bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold"
                      data-testid="read-now-btn"
                    >
                      {pdfLoading ? (
                        <>
                          <div className="w-5 h-5 mr-2 border-2 border-[#02120F] border-t-transparent rounded-full animate-spin"></div>
                          Loading PDF...
                        </>
                      ) : (
                        <>
                          <Library className="w-5 h-5 mr-2" />
                          Read Now
                        </>
                      )}
                    </Button>
                  ) : needsToAddToReadingList ? (
                    // Subscribed but book not in reading list - show add to reading list button
                    <Button
                      size="lg"
                      onClick={handleAddToBookshelf}
                      disabled={bookshelfStatus.is_locked}
                      className={bookshelfStatus.is_locked 
                        ? "bg-surface text-[#B0C4BF] cursor-not-allowed" 
                        : "bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold"
                      }
                      data-testid="add-to-read-btn"
                    >
                      <BookMarked className="w-5 h-5 mr-2" />
                      {bookshelfStatus.is_locked 
                        ? "Reading List Full" 
                        : "Add to Reading List to Read"
                      }
                    </Button>
                  ) : (
                    // Not subscribed - redirect to pricing (works for both web and iOS with RevenueCat)
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

                {/* Buy PDF button - COMPLETELY HIDDEN on iOS (not even copy link) */}
                {!isIOSApp && book.pdf_price && !hasPurchased && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBuyPdf}
                    disabled={purchaseLoading}
                    className="border-gold text-gold hover:bg-gold/10"
                    data-testid="buy-pdf-btn"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    {purchaseLoading ? 'Processing...' : (user?.is_guest ? `Buy on Website ($${book.pdf_price})` : `Buy PDF ($${book.pdf_price})`)}
                  </Button>
                )}
                
                {/* Admin Test PDF Purchase Button */}
                {isAdmin && book.pdf_price && !hasPurchased && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleAdminTestPdfPurchase}
                    disabled={adminTestLoading}
                    className="border-green-500 text-green-500 hover:bg-green-500/10"
                    data-testid="admin-test-pdf-btn"
                  >
                    {adminTestLoading ? (
                      'Processing...'
                    ) : (
                      <>🧪 Test Get PDF (Admin)</>
                    )}
                  </Button>
                )}
                
                {/* Buy Physical Book button - COMPLETELY HIDDEN on iOS */}
                {!isIOSApp && book.purchase_link && (
                  <a 
                    href={book.purchase_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-[#B0C4BF] text-[#B0C4BF] hover:bg-[#B0C4BF]/10"
                      data-testid="buy-physical-btn"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Buy Physical Book
                    </Button>
                  </a>
                )}

                {/* Download PDF button - shown after purchase */}
                {hasPurchased && book.pdf_url && (
                  <Button
                    size="lg"
                    onClick={handleDownloadPdf}
                    disabled={downloadLoading}
                    className="bg-green-600 hover:bg-green-500 text-white"
                    data-testid="download-pdf-btn"
                  >
                    {downloadLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                )}

                {hasPurchased && !book.pdf_url && (
                  <span className="text-green-500 text-sm self-center">✓ PDF Purchased</span>
                )}

                {/* Add to reading list (subscribers only) - only show if not already shown as main action */}
                {userTier > 0 && !isLocked && !needsToAddToReadingList && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={inBookshelf ? handleRemoveFromBookshelf : handleAddToBookshelf}
                    disabled={!inBookshelf && bookshelfStatus.is_locked}
                    className={`border-[rgba(212,175,55,0.3)] ${
                      inBookshelf 
                        ? 'bg-gold/10 text-gold border-gold' 
                        : bookshelfStatus.is_locked
                          ? 'opacity-50 cursor-not-allowed text-[#B0C4BF]'
                          : 'text-[#FDFBF7] hover:bg-[#082E26]'
                    }`}
                    data-testid="bookshelf-btn"
                  >
                    <BookMarked className="w-5 h-5 mr-2" />
                    {inBookshelf 
                      ? 'In Reading List' 
                      : bookshelfStatus.is_locked 
                        ? 'Reading List Full'
                        : 'Add to Reading List'
                    }
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

      {/* iOS Payment Modal - Shows tappable link to open in external browser */}
      {paymentModal.show && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-gold/30 rounded-lg max-w-md w-full p-6 relative">
            <button 
              onClick={() => setPaymentModal({ show: false, url: null })}
              className="absolute top-4 right-4 text-[#B0C4BF] hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-serif text-xl text-[#FDFBF7] mb-2">
                {user?.is_guest ? 'Continue on Website' : 'Complete Payment'}
              </h3>
              <p className="text-[#B0C4BF] mb-6">
                {user?.is_guest 
                  ? 'Create an account on our website to purchase this book, then log in here.'
                  : 'Tap the button below to open secure checkout in your browser.'
                }
              </p>
              
              {/* This is an actual anchor tag - iOS allows user taps on real links to open externally */}
              <a 
                href={paymentModal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-4 px-8 rounded-md w-full transition-colors"
                data-testid="external-payment-link"
              >
                <ExternalLink className="w-5 h-5" />
                {user?.is_guest ? 'Open Kitab Cloud Website' : 'Open Secure Checkout'}
              </a>
              
              {/* For guests, show instructions */}
              {user?.is_guest && (
                <div className="mt-4 p-3 bg-[#082E26] rounded-md text-left">
                  <p className="text-sm text-[#FDFBF7] font-medium mb-2">How to purchase:</p>
                  <ol className="text-sm text-[#B0C4BF] space-y-1 list-decimal list-inside">
                    <li>Create an account on the website</li>
                    <li>Purchase the book</li>
                    <li>Return here and log in with your account</li>
                  </ol>
                </div>
              )}
              
              <p className="text-xs text-[#B0C4BF] mt-4">
                {user?.is_guest 
                  ? 'After purchasing, log in to the app to access your book'
                  : 'You\'ll be redirected to Stripe\'s secure payment page'
                }
              </p>
              <Link to="/privacy" className="text-xs text-gold hover:underline mt-2 inline-block">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Discount Code Popup for PDF Purchase - Not shown on iOS */}
      {!shouldHideDiscounts() && showDiscountPopup && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-gold/30 rounded-lg max-w-md w-full p-6 relative">
            <button 
              onClick={() => {
                setShowDiscountPopup(false);
                setDiscountCode('');
                setDiscountInfo(null);
              }}
              className="absolute top-4 right-4 text-[#B0C4BF] hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <Tag className="w-8 h-8 text-gold" />
              </div>
              <h3 className="font-serif text-xl text-[#FDFBF7] mb-2">
                Buy PDF - ${book?.pdf_price}
              </h3>
              <p className="text-[#B0C4BF] mb-6">
                Have a discount code? Enter it below before checkout.
              </p>
              
              {/* Discount Applied Success State */}
              {discountInfo ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">Discount Applied!</span>
                  </div>
                  <p className="text-[#FDFBF7] font-mono">{discountInfo.code}</p>
                  <p className="text-sm text-[#B0C4BF] mt-1">{discountInfo.description || discountInfo.name}</p>
                  {discountInfo.savings > 0 && (
                    <p className="text-green-400 text-sm mt-2">
                      You save ${discountInfo.savings.toFixed(2)}!
                    </p>
                  )}
                  <button 
                    onClick={() => {
                      setDiscountInfo(null);
                      setDiscountCode('');
                    }}
                    className="text-xs text-[#B0C4BF] hover:text-red-400 mt-2"
                  >
                    Remove discount
                  </button>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter discount code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      className="bg-[#082E26] border-gold/30 text-[#FDFBF7] uppercase"
                      data-testid="pdf-discount-input"
                      onKeyDown={(e) => e.key === 'Enter' && validateDiscount()}
                    />
                    <Button
                      onClick={validateDiscount}
                      disabled={discountLoading || !discountCode.trim()}
                      className="bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30 px-4"
                      data-testid="pdf-apply-discount-btn"
                    >
                      {discountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  
                  {/* Available discounts hint */}
                  {visibleDiscounts.length > 0 && (
                    <div className="text-xs text-[#B0C4BF] bg-[#082E26] rounded p-2 text-left">
                      <span className="text-gold">Tip:</span> Try code{' '}
                      <button 
                        onClick={() => setDiscountCode(visibleDiscounts[0].code)}
                        className="text-gold hover:underline font-mono"
                      >
                        {visibleDiscounts[0].code}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={() => proceedToPdfCheckout(false)}
                  variant="outline"
                  className="flex-1 border-gold/30 text-[#B0C4BF] hover:text-[#FDFBF7]"
                  data-testid="pdf-skip-discount-btn"
                >
                  {discountInfo ? 'Skip Discount' : 'Continue Without'}
                </Button>
                <Button
                  onClick={() => proceedToPdfCheckout(true)}
                  disabled={!discountInfo}
                  className="flex-1 bg-gold text-[#02120F] hover:bg-[#E9C85C] disabled:opacity-50"
                  data-testid="pdf-checkout-btn"
                >
                  {discountInfo ? 'Checkout with Discount' : 'Enter Code First'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetailPage;
