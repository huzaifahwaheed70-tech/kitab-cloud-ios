import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Search, Filter, X, SlidersHorizontal, BookOpen, FileText, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import BookCard, { BookGridSkeleton, BookGrid } from './BookCard';
import { useDebounce } from '../hooks/useDebounce';

/**
 * Advanced Search Component
 * Features:
 * - Real-time search with debounce
 * - Category filter
 * - Tier filter
 * - File type filter (PDF/DOCX)
 * - Sort options
 */
const AdvancedSearch = ({ onClose, initialQuery = '' }) => {
  const { token, user } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  
  const debouncedQuery = useDebounce(query, 300);
  
  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Search when query or filters change
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch();
    } else if (debouncedQuery.trim().length === 0) {
      setResults([]);
    }
  }, [debouncedQuery, selectedCategory, selectedTier, selectedFileType, sortBy]);
  
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/search/categories`);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  const performSearch = async () => {
    if (!debouncedQuery.trim()) return;
    
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({
        q: debouncedQuery,
        sort_by: sortBy
      });
      
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTier) params.append('tier', selectedTier);
      if (selectedFileType) params.append('file_type', selectedFileType);
      
      const response = await axios.get(`${API}/search/books?${params.toString()}`, { headers });
      setResults(response.data.books || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedTier('');
    setSelectedFileType('');
    setSortBy('relevance');
  };
  
  const hasActiveFilters = selectedCategory || selectedTier || selectedFileType || sortBy !== 'relevance';
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-dark"
      style={{
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Search Header */}
      <div className="sticky top-0 z-10 bg-dark border-b border-gold/20 px-4 py-3"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onClose} className="text-[#B0C4BF] hover:text-gold">
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0C4BF]" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search books, categories, codes..."
              className="pl-10 pr-4 bg-surface border-gold/20 text-[#FDFBF7] placeholder:text-[#666]"
              autoFocus
              data-testid="search-input"
            />
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters ? 'bg-gold text-[#02120F]' : 'bg-surface text-[#B0C4BF]'
            }`}
            data-testid="filter-toggle"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="space-y-3 pb-3 animate-in slide-in-from-top duration-200">
            <div className="grid grid-cols-2 gap-3">
              {/* Category Filter */}
              <div>
                <label className="text-xs text-[#B0C4BF] mb-1 block">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-surface border border-gold/20 rounded-lg px-3 py-2 text-[#FDFBF7] text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              {/* Tier Filter */}
              <div>
                <label className="text-xs text-[#B0C4BF] mb-1 block">Tier Level</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full bg-surface border border-gold/20 rounded-lg px-3 py-2 text-[#FDFBF7] text-sm"
                >
                  <option value="">All Tiers</option>
                  <option value="1">Basic (Tier 1)</option>
                  <option value="2">Standard (Tier 2)</option>
                  <option value="3">Premium (Tier 3)</option>
                  <option value="4">Elite (Tier 4)</option>
                </select>
              </div>
              
              {/* File Type Filter */}
              <div>
                <label className="text-xs text-[#B0C4BF] mb-1 block">File Type</label>
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  className="w-full bg-surface border border-gold/20 rounded-lg px-3 py-2 text-[#FDFBF7] text-sm"
                >
                  <option value="">All Types</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word Document</option>
                </select>
              </div>
              
              {/* Sort By */}
              <div>
                <label className="text-xs text-[#B0C4BF] mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-surface border border-gold/20 rounded-lg px-3 py-2 text-[#FDFBF7] text-sm"
                >
                  <option value="relevance">Relevance</option>
                  <option value="title">Title A-Z</option>
                  <option value="date">Newest First</option>
                </select>
              </div>
            </div>
            
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-gold text-sm hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Results */}
      <div className="flex-1 overflow-auto px-4 py-6">
        {loading ? (
          <BookGridSkeleton count={8} />
        ) : query.trim().length < 2 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <p className="text-[#B0C4BF]">Start typing to search books</p>
            <p className="text-[#666] text-sm mt-1">Search by title, code, or category</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <p className="text-[#FDFBF7]">No books found</p>
            <p className="text-[#B0C4BF] text-sm mt-1">Try different keywords or filters</p>
          </div>
        ) : (
          <>
            <p className="text-[#B0C4BF] text-sm mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            <BookGrid>
              {results.map(book => (
                <BookCard
                  key={book.book_id}
                  book={book}
                  userTier={user?.subscription_tier || 0}
                  purchasedBooks={user?.purchased_books || []}
                />
              ))}
            </BookGrid>
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedSearch;
