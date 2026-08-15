import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, BookOpen, Crown, FileText, File } from 'lucide-react';

/**
 * Consistent Book Card Component
 * Features:
 * - Uniform card size
 * - Aspect ratio preserved covers
 * - Skeleton loader
 * - Lazy loading with fade-in
 * - Tier badges
 */
const BookCard = ({ 
  book, 
  userTier = 0, 
  purchasedBooks = [],
  showTierBadge = true,
  className = ''
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const isAccessible = userTier >= book.tier_level || purchasedBooks.includes(book.book_id);
  const isDocx = book.file_type === 'docx';
  
  const tierColors = {
    1: 'from-blue-500 to-blue-600',
    2: 'from-purple-500 to-purple-600',
    3: 'from-amber-500 to-amber-600',
    4: 'from-gold to-amber-500'
  };
  
  const tierNames = {
    1: 'Basic',
    2: 'Standard',
    3: 'Premium',
    4: 'Elite'
  };
  
  return (
    <Link 
      to={`/book/${book.book_id}`}
      className={`group block ${className}`}
      data-testid={`book-card-${book.book_id}`}
    >
      <div className="relative bg-surface rounded-xl overflow-hidden border border-gold/10 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/5 hover:-translate-y-1">
        {/* Cover Image Container - Fixed aspect ratio */}
        <div className="relative aspect-[3/4] bg-[#082E26] overflow-hidden">
          {/* Skeleton loader */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 animate-pulse">
              <div className="w-full h-full bg-gradient-to-br from-[#0a3d32] to-[#082E26]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-gold/20" />
              </div>
            </div>
          )}
          
          {/* Actual Cover */}
          {book.cover_url && !imageError ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a3d32] to-[#082E26] p-4">
              {isDocx ? (
                <File className="w-12 h-12 text-blue-400/60 mb-2" />
              ) : (
                <BookOpen className="w-12 h-12 text-gold/30 mb-2" />
              )}
              <p className="text-[#B0C4BF] text-xs text-center line-clamp-2">{book.title}</p>
            </div>
          )}
          
          {/* Tier Badge */}
          {showTierBadge && (
            <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r ${tierColors[book.tier_level]} text-white shadow-md`}>
              {tierNames[book.tier_level]}
            </div>
          )}
          
          {/* Lock Overlay */}
          {!isAccessible && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-center p-4">
                <Lock className="w-8 h-8 text-gold mx-auto mb-2" />
                <p className="text-white text-sm">
                  Requires {tierNames[book.tier_level]} Tier
                </p>
              </div>
            </div>
          )}
          
          {/* File Type Badge */}
          {isDocx && (
            <div className="absolute bottom-2 left-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <FileText className="w-3 h-3" />
              DOCX
            </div>
          )}
          
          {/* Page Count Badge */}
          {book.page_count && !isDocx && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {book.page_count} pages
            </div>
          )}
        </div>
        
        {/* Book Info */}
        <div className="p-3">
          <h3 className="text-[#FDFBF7] font-medium text-sm line-clamp-2 mb-1 group-hover:text-gold transition-colors">
            {book.title}
          </h3>
          <div className="flex items-center justify-between">
            <p className="text-[#B0C4BF] text-xs truncate">{book.darussalam_code}</p>
            {book.page_count && (
              <p className="text-[#666] text-xs">{book.page_count}p</p>
            )}
          </div>
          
          {/* Price if available */}
          {book.pdf_price && !isAccessible && (
            <p className="text-gold text-sm font-medium mt-2">
              ${book.pdf_price.toFixed(2)}
            </p>
          )}
        </div>
        
        {/* Ripple effect on click */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          <div className="book-card-ripple" />
        </div>
      </div>
    </Link>
  );
};

/**
 * Skeleton Loader for Book Card
 */
export const BookCardSkeleton = ({ className = '' }) => (
  <div className={`bg-surface rounded-xl overflow-hidden border border-gold/10 ${className}`}>
    <div className="aspect-[3/4] bg-[#082E26] animate-pulse">
      <div className="w-full h-full flex items-center justify-center">
        <BookOpen className="w-12 h-12 text-gold/10" />
      </div>
    </div>
    <div className="p-3 space-y-2">
      <div className="h-4 bg-[#082E26] rounded animate-pulse w-3/4" />
      <div className="h-3 bg-[#082E26] rounded animate-pulse w-1/2" />
    </div>
  </div>
);

/**
 * Book Grid Component with consistent spacing
 */
export const BookGrid = ({ children, className = '' }) => (
  <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${className}`}>
    {children}
  </div>
);

/**
 * Loading Grid with Skeletons
 */
export const BookGridSkeleton = ({ count = 12 }) => (
  <BookGrid>
    {Array.from({ length: count }).map((_, i) => (
      <BookCardSkeleton key={i} />
    ))}
  </BookGrid>
);

export default BookCard;
