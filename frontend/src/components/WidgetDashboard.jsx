import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  Flame, BookOpen, Heart, Settings, BookMarked, Plus, X, Lock,
  ChevronRight, Trophy, Clock, Crown, GripVertical, Pencil, Check
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
 * - Swipe left/right to remove widgets
 * - Plus icon to add widgets
 * - Pencil icon to enable drag mode for reordering
 */

const WIDGET_STORAGE_KEY = 'kitab_widget_preferences';
const WIDGET_ORDER_KEY = 'kitab_widget_order';

const DEFAULT_WIDGETS = {
  streak: true,
  myBooks: true,
  favorites: true,
  settings: true,
  monthlyList: true,
  premium: true
};

const DEFAULT_ORDER = ['streak', 'myBooks', 'favorites', 'monthlyList', 'premium', 'settings'];

// Swipeable Widget Component
const SwipeableWidget = ({ widgetId, widget, onRemove, isEditMode }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId, disabled: !isEditMode });

  const style = isEditMode ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 1,
  } : {};

  const handleTouchStart = (e) => {
    if (isEditMode) return;
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping || isEditMode) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    // Limit swipe distance
    const limitedDiff = Math.max(-100, Math.min(100, diff));
    setSwipeX(limitedDiff);
  };

  const handleTouchEnd = () => {
    if (isEditMode) return;
    setIsSwiping(false);
    // If swiped far enough, show delete
    if (Math.abs(swipeX) > 60) {
      setSwipeX(swipeX > 0 ? 80 : -80);
    } else {
      setSwipeX(0);
    }
  };

  const handleMouseDown = (e) => {
    if (isEditMode) return;
    startX.current = e.clientX;
    setIsSwiping(true);
  };

  const handleMouseMove = (e) => {
    if (!isSwiping || isEditMode) return;
    const diff = e.clientX - startX.current;
    const limitedDiff = Math.max(-100, Math.min(100, diff));
    setSwipeX(limitedDiff);
  };

  const handleMouseUp = () => {
    if (isEditMode) return;
    setIsSwiping(false);
    if (Math.abs(swipeX) > 60) {
      setSwipeX(swipeX > 0 ? 80 : -80);
    } else {
      setSwipeX(0);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(widgetId);
    setSwipeX(0);
  };

  const resetSwipe = () => {
    setSwipeX(0);
  };

  const content = (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (isEditMode) setNodeRef(node);
      }}
      style={style}
      className={`relative overflow-hidden rounded-xl ${isDragging ? 'shadow-xl' : ''}`}
      data-testid={`widget-${widgetId}`}
    >
      {/* Delete background - appears on swipe */}
      <div className={`absolute inset-y-0 flex items-center transition-opacity duration-200 ${
        swipeX !== 0 ? 'opacity-100' : 'opacity-0'
      } ${swipeX > 0 ? 'left-0 pl-4' : 'right-0 pr-4'}`}>
        <button
          onClick={handleRemove}
          className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg"
          data-testid={`remove-${widgetId}`}
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Widget content - slides on swipe */}
      <div
        className={`relative p-4 border border-gold/20 bg-gradient-to-br ${widget.bgGradient} rounded-xl transition-transform duration-200`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { if (isSwiping) handleMouseUp(); }}
      >
        {/* Edit mode drag handle */}
        {isEditMode && (
          <div 
            {...attributes} 
            {...listeners}
            className="absolute top-2 right-2 p-2 rounded-lg bg-gold/20 cursor-grab active:cursor-grabbing touch-none z-10"
          >
            <GripVertical className="w-5 h-5 text-gold" />
          </div>
        )}

        {widget.render()}
      </div>
    </div>
  );

  // If widget has a link and not in edit mode, wrap in Link
  if (widget.link && !isEditMode && swipeX === 0) {
    return (
      <Link to={widget.link} className="block" onClick={(e) => swipeX !== 0 && e.preventDefault()}>
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
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingStreak, setLoadingStreak] = useState(true);

  // DnD sensors - only active in edit mode
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
        setVisibleWidgets({ ...DEFAULT_WIDGETS, ...parsed });
      } catch (e) {
        console.error('Failed to parse widget preferences');
      }
    }
    
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const allWidgets = [...new Set([...parsed, ...DEFAULT_ORDER])];
        setWidgetOrder(allWidgets);
      } catch (e) {
        console.error('Failed to parse widget order');
      }
    }
  }, []);

  // Save preferences
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

  const handleRemoveWidget = (widgetId) => {
    const newPrefs = { ...visibleWidgets, [widgetId]: false };
    savePreferences(newPrefs);
    toast.success('Widget removed');
  };

  const handleAddWidget = (widgetId) => {
    const newPrefs = { ...visibleWidgets, [widgetId]: true };
    savePreferences(newPrefs);
    setShowAddWidget(false);
    toast.success('Widget added');
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = widgetOrder.indexOf(active.id);
      const newIndex = widgetOrder.indexOf(over.id);
      const newOrder = arrayMove(widgetOrder, oldIndex, newIndex);
      saveOrder(newOrder);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (isEditMode) {
      toast.success('Changes saved');
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
      title: 'Settings',
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
    },
    premium: {
      id: 'premium',
      title: 'Premium',
      icon: Crown,
      iconColor: 'text-gold',
      bgGradient: 'from-gold/20 to-amber-500/5',
      link: null,
      show: userTier >= 4,
      render: () => (
        <div className="flex items-center gap-3">
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
      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="bg-gold/20 border border-gold/30 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-gold text-sm font-medium">Drag widgets to reorder</span>
          <button 
            onClick={toggleEditMode}
            className="text-gold hover:text-[#FDFBF7] transition-colors"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Widget Grid */}
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
                <SwipeableWidget
                  key={widgetId}
                  widgetId={widgetId}
                  widget={w}
                  onRemove={handleRemoveWidget}
                  isEditMode={isEditMode}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Bottom Controls - Plus and Edit icons */}
      <div className="flex items-center justify-center gap-3">
        {hiddenWidgets.length > 0 && (
          <button
            onClick={() => setShowAddWidget(true)}
            className="w-10 h-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold hover:bg-gold/30 transition-colors"
            data-testid="add-widget-btn"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
        {orderedWidgets.length > 1 && (
          <button
            onClick={toggleEditMode}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors ${
              isEditMode 
                ? 'bg-gold border-gold text-[#02120F]' 
                : 'bg-gold/20 border-gold/30 text-gold hover:bg-gold/30'
            }`}
            data-testid="edit-widgets-btn"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

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
              {hiddenWidgets.map(widgetId => {
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
                    <div className="flex-1">
                      <p className="text-[#FDFBF7] font-medium">{w.title}</p>
                    </div>
                    <Plus className="w-5 h-5 text-gold" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetDashboard;
