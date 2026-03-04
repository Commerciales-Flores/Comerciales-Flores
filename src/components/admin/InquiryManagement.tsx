import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { MessageSquare, Send, CheckCircle, Clock, XCircle, User, Mail, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function InquiryManagement() {
  // ✅ Clean: Only grabbing what we need from context
  const { inquiries, updateInquiry } = useData();
  const { sendSystemNotification } = useNotifications();

  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedInquiries = [...inquiries].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const handleRespond = async (inquiryId: string) => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    
    try {
      const now = new Date().toISOString();

      // ✅ Uses the global context method, updating both DB and state automatically
      await updateInquiry(inquiryId, {
        status: 'responded',
        response: response,
        responseDate: now
      });

      const inquiryToNotify = inquiries.find(i => i.id === inquiryId);
      if (inquiryToNotify && inquiryToNotify.userId) {
         sendSystemNotification(
            inquiryToNotify.userId,
            "Response Received",
            `An admin has responded to your inquiry: "${inquiryToNotify.subject}"`
         );
      }
      
      setResponse('');
      setSelectedInquiry(null);

    } catch (error) {
      alert("Failed to send response.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async (inquiryId: string) => {
    try {
       // ✅ Clean context call
       await updateInquiry(inquiryId, { status: 'closed' });
    } catch (error) {
       alert("Failed to close inquiry.");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'closed': return <XCircle className="w-5 h-5 text-gray-600" />;
      case 'open':
      default: return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'open':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inquiry Management</h1>
        <p className="text-gray-600">Monitor and respond to customer messages and inquiries</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Awaiting Response (Open)</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{inquiries.filter(i => i.status === 'open').length}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Responded</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{inquiries.filter(i => i.status === 'responded').length}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Closed (Resolved)</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{inquiries.filter(i => i.status === 'closed').length}</p>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="space-y-4">
        {sortedInquiries.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No inquiries to review.</p>
          </div>
        ) : (
          sortedInquiries.map((inquiry) => {
            const isResponding = selectedInquiry === inquiry.id;
            
            return (
              <div key={inquiry.id} className={`bg-white rounded-lg border transition-shadow ${isResponding ? 'border-blue-400 shadow-md ring-1 ring-blue-400' : 'border-gray-200 shadow-sm'}`}>
                <div className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900 pr-4">{inquiry.subject}</h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusIcon(inquiry.status)}
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(inquiry.status)}`}>
                          {inquiry.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mb-5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{inquiry.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${inquiry.email}`} className="hover:text-blue-600 transition-colors">{inquiry.email}</a>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(inquiry.date), 'MMM d, yyyy - h:mm a')}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Customer Message Box */}
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer Message</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{inquiry.message}</p>
                      </div>

                      {/* Admin Response Box */}
                      {inquiry.response && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                             <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Admin Response</p>
                             {inquiry.responseDate && (
                                <p className="text-xs text-blue-500">{format(new Date(inquiry.responseDate), 'MMM d, h:mm a')}</p>
                             )}
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap">{inquiry.response}</p>
                        </div>
                      )}

                      {/* Response Editor */}
                      {isResponding ? (
                        <div className="pt-2">
                          <textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-inner"
                            placeholder="Type your professional response to the customer here..."
                            autoFocus
                          />
                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={() => {
                                setSelectedInquiry(null);
                                setResponse('');
                              }}
                              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRespond(inquiry.id)}
                              disabled={isSubmitting || !response.trim()}
                              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Send Response
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 pt-2">
                          {inquiry.status === 'open' && (
                            <button
                              onClick={() => {
                                 setSelectedInquiry(inquiry.id);
                                 setResponse('');
                              }}
                              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Write Response
                            </button>
                          )}
                          
                          {inquiry.status !== 'closed' && (
                            <button
                              onClick={() => {
                                 if(window.confirm('Are you sure you want to mark this inquiry as closed?')) {
                                    handleClose(inquiry.id);
                                 }
                              }}
                              className="px-5 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              Mark as Closed
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}