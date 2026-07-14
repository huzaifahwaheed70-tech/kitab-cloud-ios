import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  Flame, BookOpen, Heart, Settings, BookMarked, Plus, X, Lock,
  ChevronRight, Trophy, Star, Clock, Crown, GripVertical
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Widget Dashboard Component
 * Customizable widgets with drag-and-drop reordering
 * Long-press to hide widgets, long-press empty area to add them back
 */

const WIDGET_STORAGE_KEY = 'kitab_widget_preferences';
const WIDGET_ORDER_KEY = 'kitab_widget_order';

const DEFAULT_WIDGETS = {
  streak: true,
  myBooks: true,
  favorites: true,
  settings: false,
  monthlyList: true,
  premium: true  // New: Premium banner is now a widget
};

const DEFAULT_ORDER = ['streak', 'myBooks', 'favorites', 'monthlyList', 'premium', 'settings'];

// Sortable Widget Component
const SortableWidget = ({ widgetId, widget, isLongPressed, onLongPressStart, onLongPressEnd, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  const content = (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative p-4 rounded-xl border border-gold/20 bg-gradient-to-br ${widget.bgGradient} 
        hover:border-gold/40 transition-all group ${isDragging ? 'shadow-xl' : ''}`}
      data-testid={`widget-${widgetId}`}
      onTouchStart={() => onLongPressStart(widgetId)}
      onTouchEnd={onLongPressEnd}
      onMouseDown={() => onLongPressStart(widgetId)}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none"
        data-testid={`widget-drag-${widgetId}`}
      >
        <GripVertical className="w-4 h-4 text-[#666]" />
      </div>

      {/* Widget Content */}
      {widget.render()}
      
      {/* Long press remove overlay */}
      {isLongPressed && (
        <div 
          className="absolute inset-0 z-50 bg-red-500/90 rounded-xl flex items-center justify-center animate-in fade-in duration-200"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(widgetId); }}
        >
          <div className="text-center">
            <X className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="text-white font-medium">Tap to hide widget</p>
            <p className="text-white/70 text-xs mt-1">Long-press empty area to add back</p>
          </div>
        </div>
      )}
    </div>
  );

  // If widget has a link, wrap in Link
  if (widget.link) {
    return (
      <Link 
        to={widget.link} 
        className="block"
        onClick={(e) => {
          if (isLongPressed) {
            e.preventDefault();
          }
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
};

const WidgetDashboard = ({ bookshelf, userTier, favorites = [], continueReading = [] }) => {
  const { token } = useAuth();
  const [visibleWidgets, setVisibleWidgets] = useState(DEFAULT_WIDGETS);
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_ORDER);
  const [streak, setStreak] = useState(null);
  const [longPressTarget, setLongPressTarget] = useState(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const longPressTimer = useRef(null);
  const [loadingStreak, setLoadingStreak] = useState(true);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load preferences from localStorage
  useEffect(() => {
    const savedWidgets = localStorage.getItem(WIDGET_STORAGE_KEY);
    const savedOrder = localStorage.getItem(WIDGET_ORDER_KEY);
    
    if (savedWidgets) {
      try {
        const parsed = JSON.parse(savedWidgets);
        // Merge with defaults to handle new widgets
        setVisibleWidgets({ ...DEFAULT_WIDGETS, ...parsed });
      } catch (e) {
        console.error('Failed to parse widget preferences');
      }
    }
    
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        // Add any new widgets not in saved order
        const allWidgets = [...new Set([...parsed, ...DEFAULT_ORDER])];
        setWidgetOrder(allWidgets);
      } catch (e) {
        console.error('Failed to parse widget order');
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (prefs) => {
    setVisibleWidgets(prefs);
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(prefs));
  };

  const saveOrder = (order) => {
    setWidgetOrder(order);
    localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(order));
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
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Long press on empty area to show add modal
  const handleEmptyAreaLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setShowAddWidget(true);
    }, 600);
  };

  const handleRemoveWidget = (widgetId) => {
    const newPrefs = { ...visibleWidgets, [widgetId]: false };
    savePreferences(newPrefs);
    setLongPressTarget(null);
    toast.success('Widget hidden. Long-press empty area to add it back.');
  };

  const handleAddWidget = (widgetId) => {
    const newPrefs = { ...visibleWidgets, [widgetId]: true };
    savePreferences(newPrefs);
    setShowAddWidget(false);
    toast.success('Widget added!');
  };

  // Drag end handler
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id);
      const newIndex = widgetOrder.indexOf(over.id);
      const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
      saveOrder(newOrder);
    }
  };

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
        <div className="flex items-center justify-between pr-6">
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
        <div className="flex items-center justify-between pr-6">
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
        <div className="flex items-center justify-between pr-6">
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
        <div className="flex items-center justify-between pr-6">
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
        <div className="flex items-center justify-between pr-6">
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
    },
    premium: {
      id: 'premium',
      title: 'Premium Unlimited',
      icon: Crown,
      iconColor: 'text-gold',
      bgGradient: 'from-gold/20 to-amber-500/5',
      link: null, // No link - just informational
      show: userTier >= 4,
      render: () => (
        <div className="flex items-center gap-3 pr-6">
          <Crown className="w-6 h-6 text-gold flex-shrink-0" />
          <div>
            <p className="text-[#FDFBF7] font-semibold">Premium Unlimited Access</p>
            <p className="text-sm text-[#B0C4BF]">No monthly limits. Read any book, anytime.</p>
          </div>
        </div>
      )
    }
  };

  // Get ordered visible widgets
  const orderedWidgets = widgetOrder.filter(id => {
    const w = widgets[id];
    return w && visibleWidgets[id] && (w.show === undefined || w.show);
  });

  const hiddenWidgets = Object.keys(widgets).filter(id => {
    const w = widgets[id];
    return w && !visibleWidgets[id] && (w.show === undefined || w.show);
  });

  return (
    <div className="space-y-4 mb-6">
      {/* Widget Grid with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedWidgets} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderedWidgets.map(widgetId => {
              const w = widgets[widgetId];
              if (!w) return null;
              
              return (
                <SortableWidget
                  key={widgetId}
                  widgetId={widgetId}
                  widget={w}
                  isLongPressed={longPressTarget === widgetId}
                  onLongPressStart={handleTouchStart}
                  onLongPressEnd={handleTouchEnd}
                  onRemove={handleRemoveWidget}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty Area for Long Press to Add - Only show if there are hidden widgets */}
      {hiddenWidgets.length > 0 && (
        <div
          className="h-16 rounded-xl border border-dashed border-gold/20 flex items-center justify-center text-[#666] text-sm cursor-pointer hover:border-gold/30 transition-colors"
          onTouchStart={handleEmptyAreaLongPress}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleEmptyAreaLongPress}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onClick={() => setShowAddWidget(true)}
          data-testid="widget-add-area"
        >
          <span>Hold to customize • {hiddenWidgets.length} widget{hiddenWidgets.length > 1 ? 's' : ''} hidden</span>
        </div>
      )}

      {/* Drag Hint - only if multiple widgets */}
      {orderedWidgets.length > 1 && (
        <p className="text-center text-xs text-[#666]">
          Drag ⋮⋮ to reorder • Long press to hide
        </p>
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
                  if (!w) return null;
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
