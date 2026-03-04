import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Mail, Send, X, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminInquiries() {
  const { inquiries, updateInquiry } = useData();
  const { sendInquiryResponseNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'responded' | 'resolved'>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredInquiries = filterStatus === 'all' 
    ? inquiries 
    : inquiries.filter(i => i.status === filterStatus);

  const sortedInquiries = [...filteredInquiries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleRespond = async () => {
    if (!selectedInquiry || !response.trim()) return;
    
    setIsSubmitting(true);
    const inquiry = inquiries.find(i => i.id === selectedInquiry);
    
    try {
      await updateInquiry(selectedInquiry, {
        status: 'responded',
        response,
        responseDate: new Date().toISOString()
      });

      if (inquiry?.userId) {
        await sendInquiryResponseNotification(inquiry.userId, inquiry.subject);
      }

      setResponse('');
      setSelectedInquiry(null);
    } catch (error) {
      console.error("Failed to respond to inquiry", error);
      alert("Failed to send response.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateInquiry(id, { status: 'closed' as any }); // DataContext uses 'closed'
      setSelectedInquiry(null);
    } catch (error) {
      console.error("Failed to resolve inquiry", error);
    }
  };

  const inquiry = selectedInquiry ? inquiries.find(i => i.id === selectedInquiry) : null;

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    responded: 'bg-blue-100 text-blue-800 border-blue-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Inquiries & Messages</h1>
        <p className="text-gray-600">Manage customer inquiries and support tickets</p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex shadow-sm">
        {(['all', 'open', 'responded', 'closed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-md ${filterStatus === status ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                 {inquiries.filter(i => i.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inquiries List */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {sortedInquiries.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
              <Mail className="size-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No inquiries found</p>
            </div>
          ) : (
            sortedInquiries.map((inq) => (
              <div
                key={inq.id}
                onClick={() => setSelectedInquiry(inq.id)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedInquiry === inq.id
                    ? 'border-blue-500 shadow-md ring-1 ring-blue-500'
                    : 'border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`text-sm font-semibold line-clamp-1 pr-2 ${selectedInquiry === inq.id ? 'text-blue-700' : 'text-gray-900'}`}>{inq.subject}</h3>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[inq.status as keyof typeof statusColors]}`}>
                    {inq.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{inq.message}</p>
                <div className="flex justify-between items-center text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  <span>{inq.name}</span>
                  <span>{new Date(inq.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {!inquiry ? (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center p-12 shadow-sm">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Mail className="size-10 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">Select an inquiry to view details</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col shadow-sm">
              <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-gray-900 pr-4">{inquiry.subject}</h2>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusColors[inquiry.status as keyof typeof statusColors]}`}>
                    {inquiry.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600">
                  <p><span className="font-semibold text-gray-700">From:</span> {inquiry.name} <a href={`mailto:${inquiry.email}`} className="text-blue-600 hover:underline">({inquiry.email})</a></p>
                  <p><span className="font-semibold text-gray-700">Date:</span> {new Date(inquiry.date).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto bg-white">
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Customer Message</h3>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-gray-800 whitespace-pre-wrap shadow-inner">
                    {inquiry.message}
                  </div>
                </div>

                {inquiry.response && (
                  <div className="mb-6">
                    <div className="flex justify-between items-end mb-2">
                       <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Your Response</h3>
                       {inquiry.responseDate && (
                         <span className="text-xs text-gray-400 font-medium">
                           {new Date(inquiry.responseDate).toLocaleString()}
                         </span>
                       )}
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-gray-900 whitespace-pre-wrap">
                      {inquiry.response}
                    </div>
                  </div>
                )}

                {inquiry.status !== 'closed'&& (
                  <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      {inquiry.response ? 'Send Another Response' : 'Draft Response'}
                    </h3>
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-inner"
                      placeholder="Type your professional response here..."
                    />
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                {inquiry.status === 'closed' ? (
                  <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 py-3 rounded-lg border border-green-200 font-medium">
                    <CheckCircle className="size-5" />
                    <span>This inquiry has been resolved and closed.</span>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {inquiry.status !== 'open' && (
                      <button
                        onClick={() => handleResolve(inquiry.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                      >
                        <CheckCircle className="size-4" />
                        Mark as Resolved
                      </button>
                    )}
                    <button
                      onClick={handleRespond}
                      disabled={!response.trim() || isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
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