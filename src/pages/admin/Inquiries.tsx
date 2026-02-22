import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Mail, Send, X, CheckCircle } from 'lucide-react';

export default function AdminInquiries() {
  const { inquiries, updateInquiry } = useData();
  const { sendInquiryResponseNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'responded' | 'resolved'>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  const filteredInquiries = filterStatus === 'all' 
    ? inquiries 
    : inquiries.filter(i => i.status === filterStatus);

  const sortedInquiries = [...filteredInquiries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleRespond = () => {
    if (!selectedInquiry || !response.trim()) return;
    
    const inquiry = inquiries.find(i => i.id === selectedInquiry);
    updateInquiry(selectedInquiry, {
      status: 'responded',
      response,
      responseDate: new Date().toISOString().split('T')[0]
    });

    if (inquiry?.userId) {
      sendInquiryResponseNotification(inquiry.userId, inquiry.subject);
    }

    setResponse('');
    setSelectedInquiry(null);
  };

  const handleResolve = (id: string) => {
    updateInquiry(id, { status: 'resolved' });
    setSelectedInquiry(null);
  };

  const inquiry = selectedInquiry ? inquiries.find(i => i.id === selectedInquiry) : null;

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    responded: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2">Inquiries & Messages</h1>
        <p className="text-gray-600">Manage customer inquiries and support tickets</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex">
        {(['all', 'open', 'responded', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-2">({inquiries.filter(i => i.status === status).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Inquiries List */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {sortedInquiries.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Mail className="size-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No inquiries found</p>
            </div>
          ) : (
            sortedInquiries.map((inq) => (
              <div
                key={inq.id}
                onClick={() => setSelectedInquiry(inq.id)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedInquiry === inq.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm text-gray-900 line-clamp-1">{inq.subject}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[inq.status]}`}>
                    {inq.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{inq.message}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{inq.name}</span>
                  <span>{new Date(inq.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {!inquiry ? (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center p-12">
              <div className="text-center">
                <Mail className="size-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select an inquiry to view details</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h2>{inquiry.subject}</h2>
                  <span className={`px-3 py-1 text-xs rounded-full ${statusColors[inquiry.status]}`}>
                    {inquiry.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>From: {inquiry.name} ({inquiry.email})</p>
                  <p>Date: {new Date(inquiry.date).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-6">
                  <h3 className="text-sm text-gray-600 mb-2">Customer Message:</h3>
                  <div className="bg-gray-50 p-4 rounded-lg text-gray-900">
                    {inquiry.message}
                  </div>
                </div>

                {inquiry.response && (
                  <div className="mb-6">
                    <h3 className="text-sm text-gray-600 mb-2">Your Response:</h3>
                    <div className="bg-blue-50 p-4 rounded-lg text-gray-900">
                      {inquiry.response}
                    </div>
                    {inquiry.responseDate && (
                      <p className="text-xs text-gray-500 mt-2">
                        Responded on {new Date(inquiry.responseDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {inquiry.status !== 'resolved' && (
                  <div>
                    <h3 className="text-sm text-gray-600 mb-2">
                      {inquiry.response ? 'Send Another Response:' : 'Send Response:'}
                    </h3>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type your response here..."
                    />
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200">
                {inquiry.status === 'resolved' ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="size-5" />
                    <span>This inquiry has been resolved</span>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {inquiry.status !== 'open' && (
                      <button
                        onClick={() => handleResolve(inquiry.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="size-4" />
                        Mark as Resolved
                      </button>
                    )}
                    <button
                      onClick={handleRespond}
                      disabled={!response.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="size-4" />
                      Send Response
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
