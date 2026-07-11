import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../App';
import axios from 'axios';
import { 
  History, Filter, ChevronDown, ChevronLeft, ChevronRight,
  Book, User, Mail, Tag, Settings, AlertCircle, FileText
} from 'lucide-react';
import { Button } from './ui/button';

/**
 * Admin Audit Log Component
 * Shows history of admin actions with filters
 */
const AdminAuditLog = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState(null);
  
  // Filter states
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const limit = 20;
  
  useEffect(() => {
    if (token) {
      fetchLogs();
      fetchFilters();
      fetchStats();
    }
  }, [token, offset, selectedAction, selectedType]);
  
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (selectedAction) params.append('action', selectedAction);
      if (selectedType) params.append('target_type', selectedType);
      
      const response = await axios.get(`${API}/admin/audit-logs?${params.toString()}`, { headers });
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFilters = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/admin/audit-logs/actions`, { headers });
      setFilters(response.data);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };
  
  const fetchStats = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/admin/audit-logs/stats`, { headers });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  const getActionIcon = (action) => {
    if (action.includes('book')) return <Book className="w-4 h-4" />;
    if (action.includes('user')) return <User className="w-4 h-4" />;
    if (action.includes('email')) return <Mail className="w-4 h-4" />;
    if (action.includes('discount')) return <Tag className="w-4 h-4" />;
    if (action.includes('tier') || action.includes('config')) return <Settings className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };
  
  const getActionColor = (action) => {
    if (action.includes('create') || action.includes('upload')) return 'text-green-400 bg-green-500/10';
    if (action.includes('delete')) return 'text-red-400 bg-red-500/10';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-400 bg-blue-500/10';
    return 'text-gold bg-gold/10';
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  
  return (
    <div className="space-y-6" data-testid="admin-audit-log">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gold" />
          <h2 className="text-[#FDFBF7] font-serif text-xl">Activity Log</h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showFilters || selectedAction || selectedType
              ? 'bg-gold text-[#02120F]'
              : 'bg-surface text-[#B0C4BF]'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gold">{stats.total_logs}</p>
            <p className="text-xs text-[#B0C4BF]">Total Actions</p>
          </div>
          {Object.entries(stats.action_counts || {}).slice(0, 3).map(([action, count]) => (
            <div key={action} className="bg-surface rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-[#FDFBF7]">{count}</p>
              <p className="text-xs text-[#B0C4BF] truncate">{action.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Filters Panel */}
      {showFilters && filters && (
        <div className="bg-surface rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#B0C4BF] mb-1 block">Action Type</label>
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setOffset(0); }}
                className="w-full bg-[#082E26] border border-gold/20 rounded-lg px-3 py-2 text-[#FDFBF7] text-sm"
              >
                <option value="">All Actions</option>
                {filters.actions?.map(action => (
                  <option key={action} value={action}>{action.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#B0C4BF] mb-1 block">Target Type</label>
              <select
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); setOffset(0); }}
                className="w-full bg-[#082E26] border border-gold/20 rounded-lg px-3 py-2 text-[#FDFBF7] text-sm"
              >
                <option value="">All Types</option>
                {filters.target_types?.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          {(selectedAction || selectedType) && (
            <button
              onClick={() => { setSelectedAction(''); setSelectedType(''); setOffset(0); }}
              className="text-gold text-sm hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      
      {/* Logs List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-surface rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-[#082E26] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#082E26] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-lg">
            <AlertCircle className="w-12 h-12 text-gold/30 mx-auto mb-4" />
            <p className="text-[#B0C4BF]">No activity logs found</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <div 
              key={log.log_id || i}
              className="bg-surface rounded-lg p-4 hover:border-gold/30 border border-transparent transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[#FDFBF7] font-medium">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <span className="text-xs text-[#666] flex-shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-[#B0C4BF] text-sm">
                    by <span className="text-gold">{log.admin_email}</span>
                    {log.target_id && (
                      <> on <span className="text-[#FDFBF7]">{log.target_type}: {log.target_id}</span></>
                    )}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 text-xs text-[#666] bg-[#082E26] rounded p-2 overflow-x-auto">
                      {Object.entries(log.details).slice(0, 3).map(([key, value]) => (
                        <span key={key} className="mr-3">
                          {key}: <span className="text-[#B0C4BF]">{typeof value === 'object' ? JSON.stringify(value).slice(0, 50) : String(value).slice(0, 50)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[#B0C4BF] text-sm">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="border-gold/30"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-[#FDFBF7] text-sm px-3">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="border-gold/30"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;
