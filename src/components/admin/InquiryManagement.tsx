import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { MessageSquare, Send, CheckCircle, Clock, XCircle, User, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function InquiryManagement() {
  const { inquiries, updateInquiry } = useData();
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  const sortedInquiries = inquiries.sort((a, b) => {
    // Open first
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;
    // Then by creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleRespond = (inquiryId: string) => {
    if (!response.trim()) return;
    
    updateInquiry(inquiryId, {
      status: 'responded',
      response: response,
    });
    
    setResponse('');
    setSelectedInquiry(null);
  };

  const handleClose = (inquiryId: string) => {
    updateInquiry(inquiryId, { status: 'closed' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Inquiry Management</h1>
        <p className="text-gray-600">Monitor and respond to customer inquiries</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-gray-600">Open</span>
          </div>
          <p className="text-gray-900">{inquiries.filter(i => i.status === 'open').length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-gray-600">Responded</span>
          </div>
          <p className="text-gray-900">{inquiries.filter(i => i.status === 'responded').length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-gray-600">Closed</span>
          </div>
          <p className="text-gray-900">{inquiries.filter(i => i.status === 'closed').length}</p>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="space-y-4">
        {sortedInquiries.map((inquiry) => {
          const isResponding = selectedInquiry === inquiry.id;
          
          return (
            <div key={inquiry.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-gray-900">{inquiry.subject}</h3>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(inquiry.status)}
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(inquiry.status)}`}>
                          {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{inquiry.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{inquiry.userEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(inquiry.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Customer Message:</p>
                        <p className="text-gray-900">{inquiry.message}</p>
                      </div>

                      {inquiry.response && (
                        <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                          <p className="text-sm text-gray-600 mb-1">Your Response:</p>
                          <p className="text-gray-900">{inquiry.response}</p>
                        </div>
                      )}

                      {isResponding ? (
                        <div className="space-y-3">
                          <textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Type your response..."
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleRespond(inquiry.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Send className="w-4 h-4" />
                              Send Response
                            </button>
                            <button
                              onClick={() => {
                                setSelectedInquiry(null);
                                setResponse('');
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {inquiry.status === 'open' && (
                            <button
                              onClick={() => setSelectedInquiry(inquiry.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Respond
                            </button>
                          )}
                          {inquiry.status !== 'closed' && (
                            <button
                              onClick={() => handleClose(inquiry.id)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Close Inquiry
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {inquiries.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No inquiries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
