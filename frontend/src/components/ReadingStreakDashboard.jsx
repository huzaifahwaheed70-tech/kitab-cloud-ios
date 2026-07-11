import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  Flame, Trophy, Target, Calendar, BookOpen, Clock, TrendingUp,
  ChevronRight, Star, Award
} from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

/**
 * Reading Streak Dashboard Component
 * Shows current streak, longest streak, reading goals, and statistics
 */
const ReadingStreakDashboard = ({ compact = false }) => {
  const { token } = useAuth();
  const [streak, setStreak] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(7);
  
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
      setNewGoal(streakRes.data?.reading_goal_days || 7);
    } catch (error) {
      console.error('Error fetching reading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateGoal = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API}/reading-streak/goal?goal_days=${newGoal}`, {}, { headers });
      toast.success('Reading goal updated!');
      setEditingGoal(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update goal');
    }
  };
  
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-gold/10 rounded-xl"></div>
      </div>
    );
  }
  
  // Compact view for sidebar or small spaces
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-[#0a3d32] to-[#082E26] rounded-xl p-4 border border-gold/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-[#FDFBF7] font-semibold">Reading Streak</span>
          </div>
          <span className="text-2xl font-bold text-gold">{streak?.current_streak || 0}</span>
        </div>
        
        {/* Weekly Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-[#B0C4BF] mb-1">
            <span>Weekly Goal</span>
            <span>{streak?.goal_progress || 0}/{streak?.reading_goal_days || 7} days</span>
          </div>
          <div className="h-2 bg-[#02120F] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gold to-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(100, ((streak?.goal_progress || 0) / (streak?.reading_goal_days || 7)) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-[#B0C4BF]">
          <span className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-gold" />
            Best: {streak?.longest_streak || 0} days
          </span>
          <span>{streak?.total_reading_days || 0} total days</span>
        </div>
      </div>
    );
  }
  
  // Full dashboard view
  return (
    <div className="space-y-6" data-testid="reading-streak-dashboard">
      {/* Streak Header Card */}
      <div className="bg-gradient-to-br from-[#0a3d32] to-[#082E26] rounded-2xl p-6 border border-gold/20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-[#FDFBF7] font-serif text-xl mb-1">Your Reading Streak</h2>
              <p className="text-[#B0C4BF] text-sm">Keep the momentum going!</p>
            </div>
            <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="text-orange-400 text-sm font-medium">Active</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Current Streak */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-orange-500/30">
                <span className="text-2xl font-bold text-white">{streak?.current_streak || 0}</span>
              </div>
              <p className="text-[#FDFBF7] font-medium">Current</p>
              <p className="text-[#B0C4BF] text-xs">days</p>
            </div>
            
            {/* Longest Streak */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gold to-amber-600 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-gold/30">
                <span className="text-2xl font-bold text-[#02120F]">{streak?.longest_streak || 0}</span>
              </div>
              <p className="text-[#FDFBF7] font-medium">Longest</p>
              <p className="text-[#B0C4BF] text-xs">days</p>
            </div>
            
            {/* Total Days */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/30">
                <span className="text-2xl font-bold text-white">{streak?.total_reading_days || 0}</span>
              </div>
              <p className="text-[#FDFBF7] font-medium">Total</p>
              <p className="text-[#B0C4BF] text-xs">days</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Weekly Goal Progress */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-gold" />
            <h3 className="text-[#FDFBF7] font-medium">Weekly Reading Goal</h3>
          </div>
          {!editingGoal ? (
            <button 
              onClick={() => setEditingGoal(true)}
              className="text-gold text-sm hover:underline"
            >
              Edit Goal
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <select 
                value={newGoal}
                onChange={(e) => setNewGoal(parseInt(e.target.value))}
                className="bg-[#082E26] border border-gold/30 rounded px-2 py-1 text-[#FDFBF7] text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>
                ))}
              </select>
              <Button size="sm" onClick={updateGoal} className="bg-gold text-[#02120F] text-xs px-2 py-1 h-7">
                Save
              </Button>
              <button onClick={() => setEditingGoal(false)} className="text-[#B0C4BF] text-xs">
                Cancel
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#B0C4BF]">Progress this week</span>
            <span className="text-[#FDFBF7] font-medium">
              {streak?.goal_progress || 0} / {streak?.reading_goal_days || 7} days
            </span>
          </div>
          <div className="h-3 bg-[#02120F] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gold via-amber-500 to-orange-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, ((streak?.goal_progress || 0) / (streak?.reading_goal_days || 7)) * 100)}%` }}
            />
          </div>
        </div>
        
        {/* Day indicators */}
        <div className="flex justify-between">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
            const isCompleted = i < (streak?.goal_progress || 0);
            const isGoal = i < (streak?.reading_goal_days || 7);
            return (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isCompleted 
                    ? 'bg-gold text-[#02120F]' 
                    : isGoal 
                      ? 'bg-[#082E26] border border-gold/30 text-[#B0C4BF]' 
                      : 'bg-[#082E26]/50 text-[#666]'
                }`}>
                  {isCompleted ? '✓' : day}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Reading Statistics */}
      {stats && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gold" />
            <h3 className="text-[#FDFBF7] font-medium">Reading Statistics</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#082E26] rounded-lg p-4 text-center">
              <BookOpen className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#FDFBF7]">{stats.total_books_read || 0}</p>
              <p className="text-xs text-[#B0C4BF]">Books Read</p>
            </div>
            <div className="bg-[#082E26] rounded-lg p-4 text-center">
              <Star className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#FDFBF7]">{stats.total_pages_read || 0}</p>
              <p className="text-xs text-[#B0C4BF]">Pages Read</p>
            </div>
            <div className="bg-[#082E26] rounded-lg p-4 text-center">
              <Clock className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="text-2xl font-bold text-[#FDFBF7]">
                {Math.round((stats.total_reading_time_minutes || 0) / 60)}h
              </p>
              <p className="text-xs text-[#B0C4BF]">Reading Time</p>
            </div>
            <div className="bg-[#082E26] rounded-lg p-4 text-center">
              <Award className="w-6 h-6 text-gold mx-auto mb-2" />
              <p className="text-lg font-bold text-[#FDFBF7] truncate">
                {stats.favorite_category || 'N/A'}
              </p>
              <p className="text-xs text-[#B0C4BF]">Favorite Category</p>
            </div>
          </div>
          
          {/* Recent Activity */}
          {stats.reading_history && stats.reading_history.length > 0 && (
            <div>
              <h4 className="text-[#B0C4BF] text-sm mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {stats.reading_history.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#082E26] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <BookOpen className="w-4 h-4 text-gold flex-shrink-0" />
                      <span className="text-[#FDFBF7] text-sm truncate">{item.book_title}</span>
                    </div>
                    <div className="text-xs text-[#B0C4BF] flex-shrink-0">
                      {item.pages_read} pages · {item.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReadingStreakDashboard;
