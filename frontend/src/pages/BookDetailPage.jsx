import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  BookOpen, ArrowLeft, BookMarked, ChevronLeft, ChevronRight, 
  ZoomIn, ZoomOut, Maximize, X, ShoppingCart
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BookDetailPage = () => {
  const { bookId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inBookshelf, setInBookshelf] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    fetchBook();
    checkBookshelf();
  }, [bookId]);

  const fetchBook = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/books/${bookId}`, { 
        headers,
        withCredentials: true 
      });
      setBook(response.data);
      
      // Get PDF URL if available
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
        navigate('/pricing');
      } else {
        toast.error('Failed to load book');
        navigate('/library');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkBookshelf = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
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

  const handleAddToBookshelf = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/bookshelf/${bookId}`, {}, { 
        headers,
        withCredentials: true 
      });
      setInBookshelf(true);
      toast.success('Added to your bookshelf!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add to bookshelf');
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
      toast.success('Removed from bookshelf');
    } catch (error) {
      toast.error('Failed to remove from bookshelf');
    }
  };

  const handleBuyPdf = async () => {
    if (!book?.price) {
      toast.error('This book is not available for purchase');
      return;
    }
    
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API}/payments/create-checkout`, {
        tier: 1, // Using tier 1 as a placeholder for single book purchase
        origin_url: window.location.origin
      }, { headers, withCredentials: true });
      
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to initiate purchase');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!book) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* PDF Reader Modal */}
      {showReader && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-[#02120F]">
          {/* Reader Header */}
          <div className="glass sticky top-0 z-10 border-b border-[rgba(212,175,55,0.2)]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowReader(false)}
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

          {/* PDF Content */}
          <div className="h-[calc(100vh-120px)] overflow-auto pdf-container">
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
              />
            </Document>
          </div>

          {/* Reader Footer */}
          <div className="glass fixed bottom-0 left-0 right-0 border-t border-[rgba(212,175,55,0.2)]">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
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
                onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
                disabled={pageNumber >= (numPages || 1)}
                className="text-[#B0C4BF] hover:text-[#FDFBF7] disabled:opacity-30"
                data-testid="next-page-btn"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Regular View */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Back Button */}
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
                  src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${book.cover_url}`}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#004D40] to-[#00332A]">
                  <BookOpen className="w-20 h-20 text-gold/30" />
                </div>
              )}
              <div className={`absolute top-3 left-3 tier-badge tier-${book.tier_level}`}>
                Tier {book.tier_level}
              </div>
            </div>
          </div>

          {/* Book Details */}
          <div className="md:col-span-2">
            <div className="space-y-6">
              <div>
                <p className="font-mono text-gold text-sm mb-2">{book.darussalam_code}</p>
                <h1 className="font-serif text-4xl md:text-5xl text-[#FDFBF7] font-bold tracking-tight mb-4">
                  {book.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 bg-surface rounded-sm text-[#B0C4BF] text-sm">
                    {book.category}
                  </span>
                  <span className={`tier-badge tier-${book.tier_level}`}>
                    Tier {book.tier_level}
                  </span>
                </div>
              </div>

              {book.description && (
                <p className="text-[#B0C4BF] leading-relaxed text-lg">
                  {book.description}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                {book.pdf_url ? (
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
                  <Button
                    size="lg"
                    disabled
                    className="bg-surface text-[#B0C4BF]"
                    data-testid="pdf-unavailable-btn"
                  >
                    PDF Coming Soon
                  </Button>
                )}

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
                  {inBookshelf ? 'In Bookshelf' : 'Add to Bookshelf'}
                </Button>

                {book.price && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBuyPdf}
                    className="border-gold text-gold hover:bg-gold/10"
                    data-testid="buy-pdf-btn"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Buy PDF (${book.price})
                  </Button>
                )}
              </div>

              {/* Book Info */}
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-[rgba(212,175,55,0.2)]">
                <div>
                  <p className="text-[#B0C4BF] text-sm mb-1">Category</p>
                  <p className="text-[#FDFBF7] font-medium">{book.category}</p>
                </div>
                <div>
                  <p className="text-[#B0C4BF] text-sm mb-1">Access Level</p>
                  <p className="text-[#FDFBF7] font-medium">Tier {book.tier_level}+</p>
                </div>
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
