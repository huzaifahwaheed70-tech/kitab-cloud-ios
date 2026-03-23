import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import { Send, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const RequestScanPage = () => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    book_title: '',
    darussalam_code: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/scan-requests`, { 
        headers,
        withCredentials: true 
      });
      setMyRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.book_title && !formData.darussalam_code) {
      toast.error('Please provide a book title or Darussalam code');
      return;
    }

    setSubmitting(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API}/scan-requests`, formData, { 
        headers,
        withCredentials: true 
      });
      
      setMyRequests(prev => [response.data, ...prev]);
      setFormData({ book_title: '', darussalam_code: '', notes: '' });
      toast.success('Scan request submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-[#B0C4BF]" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-500';
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'rejected':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-[#B0C4BF]/20 text-[#B0C4BF]';
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <div className="glass border-b border-[rgba(212,175,55,0.2)]">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <Link to="/library" className="inline-flex items-center gap-2 text-[#B0C4BF] hover:text-gold mb-4" data-testid="back-to-library">
            <ArrowLeft className="w-5 h-5" />
            Back to Library
          </Link>
          
          <h1 className="font-serif text-3xl md:text-4xl text-[#FDFBF7] font-bold flex items-center gap-3">
            <Send className="w-8 h-8 text-gold" />
            Request a Scan
          </h1>
          <p className="text-[#B0C4BF] mt-2">
            Can't find a book? Submit a request and we'll digitize it for you.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Request Form */}
          <div className="glass-card rounded-sm p-6 md:p-8">
            <h2 className="font-serif text-2xl text-[#FDFBF7] mb-6">Submit Request</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="book_title" className="text-[#FDFBF7] mb-2 block">
                  Book Title
                </Label>
                <Input
                  id="book_title"
                  value={formData.book_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, book_title: e.target.value }))}
                  className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold"
                  placeholder="Enter the book title"
                  data-testid="book-title-input"
                />
              </div>

              <div>
                <Label htmlFor="darussalam_code" className="text-[#FDFBF7] mb-2 block">
                  Darussalam Code <span className="text-[#B0C4BF] text-sm">(if known)</span>
                </Label>
                <Input
                  id="darussalam_code"
                  value={formData.darussalam_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, darussalam_code: e.target.value }))}
                  className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold font-mono"
                  placeholder="e.g., C21, E20"
                  data-testid="darussalam-code-input"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-[#FDFBF7] mb-2 block">
                  Additional Notes <span className="text-[#B0C4BF] text-sm">(optional)</span>
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-surface border-[rgba(212,175,55,0.2)] text-[#FDFBF7] focus:ring-1 focus:ring-gold min-h-[100px]"
                  placeholder="Any additional information about the book..."
                  data-testid="notes-input"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold text-[#02120F] hover:bg-[#E9C85C] font-semibold py-6"
                data-testid="submit-request-btn"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </form>

            <p className="text-sm text-[#B0C4BF] mt-6">
              We typically process requests within 3-5 business days. You'll receive an email when your book is ready.
            </p>
          </div>

          {/* My Requests */}
          <div>
            <h2 className="font-serif text-2xl text-[#FDFBF7] mb-6">My Requests</h2>
            
            {loadingRequests ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="glass-card rounded-sm p-6 text-center">
                <Send className="w-12 h-12 text-[#B0C4BF] mx-auto mb-3" />
                <p className="text-[#B0C4BF]">No requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <div 
                    key={request.request_id}
                    className="glass-card rounded-sm p-4"
                    data-testid={`request-${request.request_id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {request.book_title && (
                          <h3 className="text-[#FDFBF7] font-medium truncate">{request.book_title}</h3>
                        )}
                        {request.darussalam_code && (
                          <p className="font-mono text-gold text-sm">{request.darussalam_code}</p>
                        )}
                        <p className="text-xs text-[#B0C4BF] mt-2">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="capitalize">{request.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-[#B0C4BF] mt-3 line-clamp-2">{request.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RequestScanPage;
