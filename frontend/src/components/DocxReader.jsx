import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import mammoth from 'mammoth';

/**
 * Word Document Reader Component
 * Features:
 * - Text scaling (pinch-to-zoom on mobile)
 * - Clean rendering of DOCX content
 * - Responsive layout
 */
const DocxReader = ({ docxUrl, onClose, bookTitle }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fontSize, setFontSize] = useState(16);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  
  // Touch handling for pinch-to-zoom
  const [lastTouchDistance, setLastTouchDistance] = useState(null);
  
  useEffect(() => {
    loadDocument();
  }, [docxUrl]);
  
  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch the DOCX file
      const response = await fetch(docxUrl);
      if (!response.ok) {
        throw new Error('Failed to load document');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert DOCX to HTML using mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setContent(result.value);
      
      if (result.messages.length > 0) {
        console.log('Mammoth messages:', result.messages);
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleZoomIn = () => {
    setFontSize(prev => Math.min(prev + 2, 32));
  };
  
  const handleZoomOut = () => {
    setFontSize(prev => Math.max(prev - 2, 10));
  };
  
  const handleResetZoom = () => {
    setFontSize(16);
  };
  
  // Touch handlers for pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(distance);
    }
  };
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const delta = distance - lastTouchDistance;
      if (Math.abs(delta) > 10) {
        if (delta > 0) {
          setFontSize(prev => Math.min(prev + 1, 32));
        } else {
          setFontSize(prev => Math.max(prev - 1, 10));
        }
        setLastTouchDistance(distance);
      }
    }
  };
  
  const handleTouchEnd = () => {
    setLastTouchDistance(null);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-gap spinner-gap-lg mx-auto mb-4"></div>
          <p className="text-[#02120F]">Loading document...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-[#02120F] mb-2">Failed to Load Document</h2>
          <p className="text-[#666] mb-4">{error}</p>
          <Button onClick={loadDocument} className="bg-gold text-[#02120F]">
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen bg-[#FDFBF7] flex flex-col"
      style={{
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Header / Controls */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)' }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-[#02120F]"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Button>
        
        <h1 className="text-sm font-medium text-[#02120F] truncate max-w-[40%]">
          {bookTitle || 'Document'}
        </h1>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            className="h-8 w-8"
            data-testid="zoom-out-btn"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-[#666] min-w-[40px] text-center">
            {Math.round((fontSize / 16) * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            className="h-8 w-8"
            data-testid="zoom-in-btn"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetZoom}
            className="h-8 w-8"
            data-testid="reset-zoom-btn"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Document Content */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          ref={contentRef}
          className="docx-content max-w-3xl mx-auto px-4 py-8"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
      
      {/* Zoom indicator on touch */}
      {lastTouchDistance !== null && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
          {Math.round((fontSize / 16) * 100)}%
        </div>
      )}
      
      <style>{`
        .docx-content h1 {
          font-size: 1.75em;
          font-weight: 700;
          margin: 1.5em 0 0.5em;
          color: #02120F;
        }
        .docx-content h2 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 1.25em 0 0.5em;
          color: #02120F;
        }
        .docx-content h3 {
          font-size: 1.25em;
          font-weight: 600;
          margin: 1em 0 0.5em;
          color: #02120F;
        }
        .docx-content p {
          margin: 0.75em 0;
          color: #333;
        }
        .docx-content ul, .docx-content ol {
          margin: 0.75em 0;
          padding-left: 1.5em;
        }
        .docx-content li {
          margin: 0.25em 0;
        }
        .docx-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }
        .docx-content td, .docx-content th {
          border: 1px solid #ddd;
          padding: 0.5em;
        }
        .docx-content th {
          background: #f5f5f5;
          font-weight: 600;
        }
        .docx-content img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }
        .docx-content blockquote {
          border-left: 3px solid #D4AF37;
          padding-left: 1em;
          margin: 1em 0;
          color: #555;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default DocxReader;
