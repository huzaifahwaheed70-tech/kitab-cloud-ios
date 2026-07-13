import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  Flame, BookOpen, Heart, Settings, BookMarked, Plus, X, Lock,
  ChevronRight, Trophy, Star, Clock, Crown, Grip
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Widget Dashboard Component
 * Customizable widgets that users can show/hide via long press
 * Widgets: Reading Streak, My Books, Favorites, Settings, Monthly Reading List
 */

const WIDGET_STORAGE_KEY = 'kitab_widget_preferences';

const DEFAULT_WIDGETS = {
  streak: true,
  myBooks: true,
  favorites: true,
  settings: false,
  monthlyList: true
};

const WidgetDashboard = ({ bookshelf, userTier, favorites = [], continueReading = [] }) => {
  const { token } = useAuth();
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [streak, setStreak] = useState(null);
  const [longPressTarget, setLongPressTarget] = useState(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const longPressTimer = useRef(null);
  const [loadingStreak, setLoadingStreak] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) {
      try {
        setVisibleWidgets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse widget preferences');
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (prefs) => {
    setVisibleWidgets(prefs);
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(prefs));
  };

  // Fetch streak data
  useEffect(() => {
    if (token && visibleWidgets.streak) {
      fetchStreak();
    }
  }, [token, visibleWidgets.streak]);

  const fetchStreak = async () => {
    setLoadingStreak(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API}/reading-streak`, { headers });
      setStreak(res.data);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoadingStreak(false);
    }
  };

  // Long press handlers
  const handleTouchStart = (widgetId) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressTarget(widgetId);
      // Vibrate on mobile if supported
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleRemoveWidget = (widgetId) => {
    const newPrefs = { ...visibleWidgets, [widgetId]: false };
    savePreferences(newPrefs);
    setLongPressTarget(null);
    toast.success('Widget hidden. Tap + Add Widget below to restore.');
  };

  const handleAddWidget = (widgetId) => {
    const newPrefs = { ...visibleWidgets, [widgetId]: true };
    savePreferences(newPrefs);
    setShowAddWidget(false);
    toast.success('Widget added!');
  };

  // Check if any widgets are hidden
  const hasHiddenWidgets = Object.values(visibleWidgets).some(v => !v);
  const visibleCount = Object.values(visibleWidgets).filter(v => v).length;

  // Widget definitions
  const widgets = {
    streak: {
      id: 'streak',
      title: 'Reading Streak',
      icon: Flame,
      iconColor: 'text-orange-500',
      bgGradient: 'from-orange-500/20 to-orange-500/5',
      link: '/reading-streak',
      render: () => (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-[#FDFBF7] font-semibold">Reading Streak</span>
            </div>
            {loadingStreak ? (
              <div className="spinner-gap spinner-gap-sm"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-orange-400">{streak?.current_streak || 0} days</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-[#B0C4BF]">
                  <Trophy className="w-3 h-3 text-gold" />
                  <span>Best: {streak?.longest_streak || 0}</span>
                  <span>•</span>
                  <span>{streak?.goal_progress || 0}/{streak?.reading_goal_days || 7} this week</span>
                </div>
              </>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gold/50" />
        </div>
      )
    },
    myBooks: {
      id: 'myBooks',
      title: 'My Books',
      icon: BookOpen,
      iconColor: 'text-emerald-400',
      bgGradient: 'from-emerald-500/20 to-emerald-500/5',
      link: '/bookshelf',
      render: () => (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span className="text-[#FDFBF7] font-semibold">My Books</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">{bookshelf?.count || 0} books</p>
            {continueReading.length > 0 && (
              <p className="text-xs text-[#B0C4BF] mt-1">
                Continue: {continueReading[0]?.title?.slice(0, 20)}...
              </p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-gold/50" />
        </div>
      )
    },
    favorites: {
      id: 'favorites',
      title: 'Favorites',
      icon: Heart,
      iconColor: 'text-rose-400',
      bgGradient: 'from-rose-500/20 to-rose-500/5',
      link: '/favorites',
      render: () => (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-rose-400" />
              <span className="text-[#FDFBF7] font-semibold">Favorites</span>
            </div>
            <p className="text-3xl font-bold text-rose-400">{favorites?.length || 0} saved</p>
            <p className="text-xs text-[#B0C4BF] mt-1">Your saved books</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gold/50" />
        </div>
      )
    },
    settings: {
      id: 'settings',
      title: 'Quick Settings',
      icon: Settings,
      iconColor: 'text-blue-400',
      bgGradient: 'from-blue-500/20 to-blue-500/5',
      link: '/settings',
      render: () => (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-blue-400" />
              <span className="text-[#FDFBF7] font-semibold">Settings</span>
            </div>
            <p className="text-sm text-[#B0C4BF]">Account & Preferences</p>
            <p className="text-xs text-[#666] mt-1">Tier {userTier || 0} Member</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gold/50" />
        </div>
      )
    },
    monthlyList: {
      id: 'monthlyList',
      title: 'Reading List',
      icon: BookMarked,
      iconColor: bookshelf?.is_locked ? 'text-red-400' : 'text-gold',
      bgGradient: bookshelf?.is_locked ? 'from-red-500/20 to-red-500/5' : 'from-gold/20 to-gold/5',
      link: '/bookshelf',
      show: userTier > 0 && userTier < 4,
      render: () => (
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {bookshelf?.is_locked ? (
                <Lock className="w-5 h-5 text-red-400" />
              ) : (
                <BookMarked className="w-5 h-5 text-gold" />
              )}
              <span className="text-[#FDFBF7] font-semibold">
                {bookshelf?.is_locked ? 'List Full' : 'Reading List'}
              </span>
            </div>
            <p className={`text-3xl font-bold ${bookshelf?.is_locked ? 'text-red-400' : 'text-gold'}`}>
              {bookshelf?.count || 0}/{bookshelf?.limit || 0}
            </p>
            <p className="text-xs text-[#B0C4BF] mt-1">
              {bookshelf?.is_locked 
                ? 'Locked until next month' 
                : `${(bookshelf?.limit || 0) - (bookshelf?.count || 0)} slots left`}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gold/50" />
        </div>
      )
    }
  };

  // Get ordered visible widgets
  const orderedWidgets = Object.keys(widgets).filter(id => {
    const w = widgets[id];
    return visibleWidgets[id] && (w.show === undefined || w.show);
  });

  const hiddenWidgets = Object.keys(widgets).filter(id => {
    const w = widgets[id];
    return !visibleWidgets[id] && (w.show === undefined || w.show);
  });

  return (
    <div className="space-y-4 mb-6">
      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orderedWidgets.map(widgetId => {
          const w = widgets[widgetId];
          const isLongPressed = longPressTarget === widgetId;
          
          const handleClick = (e) => {
            // If long press overlay is showing, prevent navigation
            if (isLongPressed) {
              e.preventDefault();
              return;
            }
          };
          
          return (
            <Link
              key={widgetId}
              to={w.link}
              className={`relative block p-4 rounded-xl border border-gold/20 bg-gradient-to-br ${w.bgGradient} 
                hover:border-gold/40 transition-all group`}
              onTouchStart={() => handleTouchStart(widgetId)}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => handleTouchStart(widgetId)}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              onClick={handleClick}
              data-testid={`widget-${widgetId}`}
            >
              {w.render()}
              
              {/* Long press remove overlay */}
              {isLongPressed && (
                <div 
                  className="absolute inset-0 z-50 bg-red-500/90 rounded-xl flex items-center justify-center animate-in fade-in duration-200"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveWidget(widgetId); }}
                >
                  <div className="text-center">
                    <X className="w-8 h-8 text-white mx-auto mb-2" />
                    <p className="text-white font-medium">Tap to hide widget</p>
                    <p className="text-white/70 text-xs mt-1">Tap + Add Widget below to restore</p>
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Tier 4 Premium Banner (always visible) */}
      {userTier >= 4 && (
        <div className="p-4 rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-amber-500/5">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-gold" />
            <div>
              <p className="text-[#FDFBF7] font-semibold">Premium Unlimited Access</p>
              <p className="text-sm text-[#B0C4BF]">No monthly limits. Read any book, anytime.</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Widget Button (shows when widgets are hidden) */}
      {hiddenWidgets.length > 0 && (
        <button
          onClick={() => setShowAddWidget(true)}
          className="w-full p-4 rounded-xl border border-dashed border-gold/30 text-[#B0C4BF] hover:text-gold 
            hover:border-gold/50 transition-all flex items-center justify-center gap-2"
          data-testid="add-widget-btn"
        >
          <Plus className="w-5 h-5" />
          <span>Add Widget ({hiddenWidgets.length} hidden)</span>
        </button>
      )}

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowAddWidget(false)}
        >
          <div 
            className="bg-dark border border-gold/20 rounded-xl w-full max-w-md max-h-[70vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gold/20 flex items-center justify-between sticky top-0 bg-dark">
              <h3 className="text-[#FDFBF7] font-serif text-lg">Add Widget</h3>
              <button onClick={() => setShowAddWidget(false)} className="text-[#B0C4BF] hover:text-gold">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              {hiddenWidgets.length === 0 ? (
                <p className="text-[#B0C4BF] text-center py-8">All widgets are visible!</p>
              ) : (
                hiddenWidgets.map(widgetId => {
                  const w = widgets[widgetId];
                  return (
                    <button
                      key={widgetId}
                      onClick={() => handleAddWidget(widgetId)}
                      className={`w-full p-4 rounded-xl border border-gold/20 bg-gradient-to-br ${w.bgGradient}
                        hover:border-gold/40 transition-all flex items-center gap-3 text-left`}
                    >
                      <div className={`w-10 h-10 rounded-full bg-surface flex items-center justify-center ${w.iconColor}`}>
                        <w.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[#FDFBF7] font-medium">{w.title}</p>
                        <p className="text-xs text-[#B0C4BF]">Tap to add to dashboard</p>
                      </div>
                      <Plus className="w-5 h-5 text-gold ml-auto" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel long press overlay */}
      {longPressTarget && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setLongPressTarget(null)}
        />
      )}
    </div>
  );
};

export default WidgetDashboard;
