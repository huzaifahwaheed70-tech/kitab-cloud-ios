import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Heart, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const FavoritesPage = () => {
  const { user, token } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, [token]);

  const getAuthHeaders = () => {
    const storedToken = localStorage.getItem('auth_token') || token;
    return storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, { headers: getAuthHeaders() });
      setFavorites(response.data.books || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bookId) => {
    try {
      await axios.delete(`${API}/favorites/${bookId}`, { headers: getAuthHeaders() });
      setFavorites(prev => prev.filter(b => b.book_id !== bookId));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove from favorites');
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="glass border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
          <Link to="/library" className="inline-flex items-center gap-2 text-[#B0C4BF] hover:text-gold mb-4" data-testid="back-to-library">
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl text-[#FDFBF7] font-bold flex items-center gap-3">
            <Heart className="w-8 h-8 text-gold fill-gold" />
            Favorite Books
          </h1>
          <p className="text-[#B0C4BF] mt-1">Your collection of favorite books</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-[#B0C4BF] mx-auto mb-4" />
            <h3 className="font-serif text-2xl text-[#FDFBF7] mb-2">No favorites yet</h3>
            <p className="text-[#B0C4BF] mb-6">Mark books as favorites to find them easily</p>
            <Link to="/library">
              <Button className="bg-gold text-[#02120F] hover:bg-[#E9C85C]" data-testid="browse-library-btn">
                Browse Library
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {favorites.map((book) => (
              <div key={book.book_id} className="group relative" data-testid={`favorite-item-${book.book_id}`}>
                <Link to={`/book/${book.book_id}`}>
                  <div className="relative aspect-[2/3] rounded-sm overflow-hidden bg-surface border border-[rgba(212,175,55,0.2)] book-card-hover">
                    {book.cover_url ? (
                      <img
                        src={`${process.env.REACT_APP_BACKEND_URL}/api/files/${book.cover_url}`}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#004D40] to-[#00332A]">
                        <img src="/logo.png" alt="Book" className="w-12 h-12 opacity-30" />
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 tier-badge tier-${book.tier_level}`}>
                      T{book.tier_level}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-mono text-xs text-gold mb-1">{book.darussalam_code}</p>
                    <h3 className="font-serif text-[#FDFBF7] line-clamp-2 group-hover:text-gold transition-colors">
                      {book.title}
                    </h3>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(book.book_id)}
                  className="absolute top-2 right-2 bg-[#02120F]/80 hover:bg-red-500/80 text-[#FDFBF7] opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`remove-fav-${book.book_id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default FavoritesPage;