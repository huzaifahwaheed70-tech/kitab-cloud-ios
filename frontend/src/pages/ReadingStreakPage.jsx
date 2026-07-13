import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  Flame, Trophy, Target, Calendar, BookOpen, Clock, TrendingUp,
  ArrowLeft, Star, Award, ChevronRight, Edit2, Check, X, FileText
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

/**
 * Full Reading Streak Page
 * Shows detailed reading history, statistics, and goal management
 */
const ReadingStreakPage = () => {
  const { token } = useAuth();
  const [streak, setStreak] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(null); // null, 'days', 'pages', 'minutes'
  const [newGoalDays, setNewGoalDays] = useState(7);
  const [newGoalPages, setNewGoalPages] = useState(20);
  const [newGoalMinutes, setNewGoalMinutes] = useState(30);
  const [customPagesInput, setCustomPagesInput] = useState('');
  const [customMinutesInput, setCustomMinutesInput] = useState('');
  const [showCustomPages, setShowCustomPages] = useState(false);
  const [showCustomMinutes, setShowCustomMinutes] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, history, goals
  const [savingGoal, setSavingGoal] = useState(false);
  
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);
  
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [streakRes, statsRes] = await Promise.all([
        axios.get(`${API}/reading-streak`, { headers }),
        axios.get(`${API}/reading-stats`, { headers })
      ]);
      
      setStreak(streakRes.data);
      setStats(statsRes.data);
      setNewGoalDays(streakRes.data?.reading_goal_days || 7);
      setNewGoalPages(streakRes.data?.reading_goal_pages || 20);
      setNewGoalMinutes(streakRes.data?.reading_goal_minutes || 30);
    } catch (error) {
      console.error('Error fetching reading data:', error);
      toast.error('Failed to load reading data');
    } finally {
      setLoading(false);
    }
  };
  
  const updateGoal = async (type) => {
    setSavingGoal(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let params = new URLSearchParams();
      
      if (type === 'days') {
        params.append('goal_days', newGoalDays);
      } else if (type === 'pages') {
        const finalPages = showCustomPages && customPagesInput ? parseInt(customPagesInput) : newGoalPages;
        if (finalPages < 1 || finalPages > 500) {
          toast.error('Pages must be between 1 and 500');
          setSavingGoal(false);
          return;
        }
        params.append('goal_pages', finalPages);
        setNewGoalPages(finalPages);
      } else if (type === 'minutes') {
        const finalMinutes = showCustomMinutes && customMinutesInput ? parseInt(customMinutesInput) : newGoalMinutes;
        if (finalMinutes < 5 || finalMinutes > 480) {
          toast.error('Minutes must be between 5 and 480');
          setSavingGoal(false);
          return;
        }
        params.append('goal_minutes', finalMinutes);
        setNewGoalMinutes(finalMinutes);
      }
      
      await axios.put(`${API}/reading-streak/goal?${params.toString()}`, {}, { headers });
      toast.success('Goal updated!');
      setEditingGoal(null);
      setShowCustomPages(false);
      setShowCustomMinutes(false);
      setCustomPagesInput('');
      setCustomMinutesInput('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update goal');
    } finally {
      setSavingGoal(false);
    }
  };
  
  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="spinner-gap spinner-gap-lg"></div>
      </div>
    );
  }
  
  return (
    <div 
      className="min-h-screen bg-dark"
      style={{
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 bg-dark/95 backdrop-blur-sm border-b border-gold/20 px-4 py-4"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 16px)' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/library">
              <Button variant="ghost" size="icon" className="text-[#B0C4BF] hover:text-gold">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-serif text-xl text-[#FDFBF7]">Reading Streak</h1>
              <p className="text-sm text-[#B0C4BF]">Track your reading journey</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1.5 rounded-full">
            <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
            <span className="text-orange-400 font-bold">{streak?.current_streak || 0}</span>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'history', label: 'History', icon: BookOpen },
            { id: 'goals', label: 'Goals', icon: Target }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gold text-[#02120F]'
                  : 'bg-surface text-[#B0C4BF] hover:text-[#FDFBF7]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Streak Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card p-4 rounded-xl text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Flame className="w-7 h-7 text-white" />
                </div>
                <p className="text-3xl font-bold text-[#FDFBF7]">{streak?.current_streak || 0}</p>
                <p className="text-sm text-[#B0C4BF]">Current Streak</p>
              </div>
              
              <div className="glass-card p-4 rounded-xl text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center shadow-lg shadow-gold/30">
                  <Trophy className="w-7 h-7 text-[#02120F]" />
                </div>
                <p className="text-3xl font-bold text-[#FDFBF7]">{streak?.longest_streak || 0}</p>
                <p className="text-sm text-[#B0C4BF]">Longest Streak</p>
              </div>
              
              <div className="glass-card p-4 rounded-xl text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <p className="text-3xl font-bold text-[#FDFBF7]">{streak?.total_reading_days || 0}</p>
                <p className="text-sm text-[#B0C4BF]">Total Days</p>
              </div>
            </div>
            
            {/* Today's Progress */}
            <div className="glass-card p-6 rounded-xl">
              <h2 className="font-serif text-lg text-[#FDFBF7] mb-4">Todays Progress</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#B0C4BF] text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Pages
                    </span>
                    <span className="text-gold font-medium">{streak?.pages_today || 0}/{streak?.reading_goal_pages || 20}</span>
                  </div>
                  <div className="h-3 bg-[#02120F] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-700"
                      style={{ width: `${Math.min(100, ((streak?.pages_today || 0) / (streak?.reading_goal_pages || 20)) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#B0C4BF] text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time
                    </span>
                    <span className="text-gold font-medium">{streak?.minutes_today || 0}/{streak?.reading_goal_minutes || 30}m</span>
                  </div>
                  <div className="h-3 bg-[#02120F] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
                      style={{ width: `${Math.min(100, ((streak?.minutes_today || 0) / (streak?.reading_goal_minutes || 30)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Weekly Progress */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-[#FDFBF7]">This Week</h2>
                <span className="text-gold font-medium">{streak?.goal_progress || 0}/{streak?.reading_goal_days || 7} days</span>
              </div>
              
              <div className="h-3 bg-[#02120F] rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-gold via-amber-500 to-orange-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, ((streak?.goal_progress || 0) / (streak?.reading_goal_days || 7)) * 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                  const isCompleted = i < (streak?.goal_progress || 0);
                  const isGoal = i < (streak?.reading_goal_days || 7);
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCompleted 
                          ? 'bg-gold text-[#02120F]' 
                          : isGoal 
                            ? 'bg-[#082E26] border-2 border-gold/30 text-[#B0C4BF]' 
                            : 'bg-[#082E26]/50 text-[#666]'
                      }`}>
                        {isCompleted ? <Check className="w-5 h-5" /> : day[0]}
                      </div>
                      <span className="text-[10px] text-[#666]">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-5 h-5 text-gold" />
                  <span className="text-[#B0C4BF] text-sm">Books Read</span>
                </div>
                <p className="text-2xl font-bold text-[#FDFBF7]">{stats?.total_books_read || 0}</p>
              </div>
              
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-5 h-5 text-gold" />
                  <span className="text-[#B0C4BF] text-sm">Pages Read</span>
                </div>
                <p className="text-2xl font-bold text-[#FDFBF7]">{stats?.total_pages_read || 0}</p>
              </div>
              
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-gold" />
                  <span className="text-[#B0C4BF] text-sm">Reading Time</span>
                </div>
                <p className="text-2xl font-bold text-[#FDFBF7]">{formatTime(stats?.total_reading_time_minutes)}</p>
              </div>
              
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-5 h-5 text-gold" />
                  <span className="text-[#B0C4BF] text-sm">Favorite Genre</span>
                </div>
                <p className="text-lg font-bold text-[#FDFBF7] truncate">{stats?.favorite_category || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="font-serif text-lg text-[#FDFBF7]">Reading History</h2>
            
            {stats?.reading_history && stats.reading_history.length > 0 ? (
              <div className="space-y-3">
                {stats.reading_history.map((item, i) => (
                  <Link 
                    key={i} 
                    to={`/book/${item.book_id}`}
                    className="glass-card p-4 rounded-xl flex items-center gap-4 hover:border-gold/30 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[#FDFBF7] font-medium truncate group-hover:text-gold transition-colors">
                        {item.book_title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-[#B0C4BF]">
                        <span>{item.pages_read} pages</span>
                        <span>•</span>
                        <span>{formatTime(item.reading_time_minutes)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-[#666]">{item.date}</p>
                      <ChevronRight className="w-5 h-5 text-gold/50 group-hover:text-gold transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 rounded-xl text-center">
                <BookOpen className="w-12 h-12 text-gold/30 mx-auto mb-4" />
                <p className="text-[#FDFBF7] mb-2">No reading history yet</p>
                <p className="text-sm text-[#B0C4BF]">Start reading books to track your progress!</p>
                <Link to="/library">
                  <Button className="mt-4 bg-gold text-[#02120F] hover:bg-[#E9C85C]">
                    Browse Library
                  </Button>
                </Link>
              </div>
            )}
            
            {/* Monthly Breakdown */}
            {stats?.books_by_month && Object.keys(stats.books_by_month).length > 0 && (
              <div className="glass-card p-6 rounded-xl mt-6">
                <h3 className="font-serif text-lg text-[#FDFBF7] mb-4">Monthly Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(stats.books_by_month)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .slice(0, 6)
                    .map(([month, count]) => {
                      const date = new Date(month + '-01');
                      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      const maxBooks = Math.max(...Object.values(stats.books_by_month));
                      const percentage = (count / maxBooks) * 100;
                      
                      return (
                        <div key={month}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[#B0C4BF]">{monthName}</span>
                            <span className="text-[#FDFBF7] font-medium">{count} books</span>
                          </div>
                          <div className="h-2 bg-[#082E26] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gold rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            {/* Days Per Week Goal */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg text-[#FDFBF7]">Days Per Week</h2>
                    <p className="text-sm text-[#B0C4BF]">How many days do you want to read each week?</p>
                  </div>
                </div>
                {editingGoal !== 'days' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setEditingGoal('days')}
                    className="text-gold hover:bg-gold/10"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              
              {editingGoal === 'days' ? (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7].map(days => (
                      <button
                        key={days}
                        onClick={() => setNewGoalDays(days)}
                        className={`w-12 h-12 rounded-lg font-bold transition-all ${
                          newGoalDays === days
                            ? 'bg-gold text-[#02120F]'
                            : 'bg-[#082E26] text-[#B0C4BF] hover:border-gold/30 border border-transparent'
                        }`}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => updateGoal('days')} 
                      disabled={savingGoal}
                      className="bg-gold text-[#02120F] hover:bg-[#E9C85C]"
                    >
                      {savingGoal ? <div className="spinner-gap spinner-gap-sm mr-2"></div> : <Check className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditingGoal(null)} className="border-gold/30 text-[#FDFBF7]">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-gold">{streak?.reading_goal_days || 7} days</p>
                  <p className="text-[#B0C4BF]">{streak?.goal_progress || 0}/{streak?.reading_goal_days || 7} this week</p>
                </div>
              )}
            </div>
            
            {/* Daily Pages Goal */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg text-[#FDFBF7]">Daily Pages Goal</h2>
                    <p className="text-sm text-[#B0C4BF]">How many pages do you want to read each day?</p>
                  </div>
                </div>
                {editingGoal !== 'pages' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setEditingGoal('pages'); setShowCustomPages(false); }}
                    className="text-gold hover:bg-gold/10"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              
              {editingGoal === 'pages' ? (
                <div className="space-y-4">
                  {!showCustomPages ? (
                    <>
                      <div className="flex gap-2 flex-wrap">
                        {[5, 10, 15, 20, 30, 50, 75, 100].map(pages => (
                          <button
                            key={pages}
                            onClick={() => setNewGoalPages(pages)}
                            className={`px-4 py-3 rounded-lg font-bold transition-all ${
                              newGoalPages === pages
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#082E26] text-[#B0C4BF] hover:border-blue-500/30 border border-transparent'
                            }`}
                          >
                            {pages}
                          </button>
                        ))}
                        <button
                          onClick={() => setShowCustomPages(true)}
                          className="px-4 py-3 rounded-lg font-bold transition-all bg-[#082E26] text-[#B0C4BF] hover:border-blue-500/30 border border-dashed border-blue-500/30"
                        >
                          Custom
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-[#B0C4BF]">Enter a custom value (1-500 pages)</p>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={customPagesInput}
                        onChange={(e) => setCustomPagesInput(e.target.value)}
                        placeholder="Enter pages..."
                        className="w-full px-4 py-3 rounded-lg bg-[#082E26] border border-blue-500/30 text-[#FDFBF7] placeholder-[#666] focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => setShowCustomPages(false)}
                        className="text-sm text-blue-400 hover:underline"
                      >
                        ← Back to presets
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => updateGoal('pages')} 
                      disabled={savingGoal || (showCustomPages && !customPagesInput)}
                      className="bg-blue-500 text-white hover:bg-blue-400"
                    >
                      {savingGoal ? <div className="spinner-gap spinner-gap-sm mr-2"></div> : <Check className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => { setEditingGoal(null); setShowCustomPages(false); }} className="border-gold/30 text-[#FDFBF7]">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-blue-400">{streak?.reading_goal_pages || 20} pages</p>
                  <p className="text-[#B0C4BF]">{streak?.pages_today || 0}/{streak?.reading_goal_pages || 20} today</p>
                </div>
              )}
            </div>
            
            {/* Daily Reading Time Goal */}
            <div className="glass-card p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg text-[#FDFBF7]">Daily Reading Time</h2>
                    <p className="text-sm text-[#B0C4BF]">How many minutes do you want to read each day?</p>
                  </div>
                </div>
                {editingGoal !== 'minutes' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setEditingGoal('minutes'); setShowCustomMinutes(false); }}
                    className="text-gold hover:bg-gold/10"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              
              {editingGoal === 'minutes' ? (
                <div className="space-y-4">
                  {!showCustomMinutes ? (
                    <>
                      <div className="flex gap-2 flex-wrap">
                        {[10, 15, 20, 30, 45, 60, 90, 120].map(mins => (
                          <button
                            key={mins}
                            onClick={() => setNewGoalMinutes(mins)}
                            className={`px-4 py-3 rounded-lg font-bold transition-all ${
                              newGoalMinutes === mins
                                ? 'bg-purple-500 text-white'
                                : 'bg-[#082E26] text-[#B0C4BF] hover:border-purple-500/30 border border-transparent'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                        <button
                          onClick={() => setShowCustomMinutes(true)}
                          className="px-4 py-3 rounded-lg font-bold transition-all bg-[#082E26] text-[#B0C4BF] hover:border-purple-500/30 border border-dashed border-purple-500/30"
                        >
                          Custom
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-[#B0C4BF]">Enter a custom value (5-480 minutes)</p>
                      <input
                        type="number"
                        min="5"
                        max="480"
                        value={customMinutesInput}
                        onChange={(e) => setCustomMinutesInput(e.target.value)}
                        placeholder="Enter minutes..."
                        className="w-full px-4 py-3 rounded-lg bg-[#082E26] border border-purple-500/30 text-[#FDFBF7] placeholder-[#666] focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => setShowCustomMinutes(false)}
                        className="text-sm text-purple-400 hover:underline"
                      >
                        ← Back to presets
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => updateGoal('minutes')} 
                      disabled={savingGoal || (showCustomMinutes && !customMinutesInput)}
                      className="bg-purple-500 text-white hover:bg-purple-400"
                    >
                      {savingGoal ? <div className="spinner-gap spinner-gap-sm mr-2"></div> : <Check className="w-4 h-4 mr-1" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => { setEditingGoal(null); setShowCustomMinutes(false); }} className="border-gold/30 text-[#FDFBF7]">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-purple-400">{streak?.reading_goal_minutes || 30} min</p>
                  <p className="text-[#B0C4BF]">{streak?.minutes_today || 0}/{streak?.reading_goal_minutes || 30}m today</p>
                </div>
              )}
            </div>
            
            {/* Achievements */}
            <div className="glass-card p-6 rounded-xl">
              <h2 className="font-serif text-lg text-[#FDFBF7] mb-4">Achievements</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { 
                    title: 'First Steps', 
                    desc: 'Read your first book', 
                    icon: BookOpen,
                    unlocked: (stats?.total_books_read || 0) >= 1
                  },
                  { 
                    title: 'Week Warrior', 
                    desc: '7-day streak', 
                    icon: Flame,
                    unlocked: (streak?.longest_streak || 0) >= 7
                  },
                  { 
                    title: 'Bookworm', 
                    desc: 'Read 10 books', 
                    icon: Star,
                    unlocked: (stats?.total_books_read || 0) >= 10
                  },
                  { 
                    title: 'Dedicated', 
                    desc: '30-day streak', 
                    icon: Trophy,
                    unlocked: (streak?.longest_streak || 0) >= 30
                  },
                ].map((achievement, i) => (
                  <div 
                    key={i}
                    className={`p-4 rounded-xl border transition-all ${
                      achievement.unlocked
                        ? 'bg-gold/10 border-gold/30'
                        : 'bg-[#082E26]/50 border-transparent opacity-50'
                    }`}
                  >
                    <achievement.icon className={`w-8 h-8 mb-2 ${
                      achievement.unlocked ? 'text-gold' : 'text-[#666]'
                    }`} />
                    <h3 className={`font-medium ${achievement.unlocked ? 'text-[#FDFBF7]' : 'text-[#666]'}`}>
                      {achievement.title}
                    </h3>
                    <p className="text-xs text-[#B0C4BF]">{achievement.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReadingStreakPage;
