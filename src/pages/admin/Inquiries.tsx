import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Mail, Send, X, CheckCircle, Clock, MessageSquare, User, Calendar, ChevronLeft } from 'lucide-react';

export default function AdminInquiries() {
  const { inquiries, updateInquiry } = useData();
  const { sendInquiryResponseNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'responded' | 'resolved'>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  // New state to manage mobile view toggle
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    setResponse('');
    if (selectedInquiry) {
      setShowMobileDetail(true);
    }
  }, [selectedInquiry]);

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
      responseDate: new Date().toISOString()
    });

    if (inquiry?.userId) {
      sendInquiryResponseNotification(inquiry.userId, inquiry.subject);
    }
    setResponse('');
  };

  const handleResolve = (id: string) => {
    updateInquiry(id, { status: 'resolved' });
  };

  const inquiry = selectedInquiry ? inquiries.find(i => i.id === selectedInquiry) : null;

  const statusStyles = {
    open: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: <Clock className="size-3" /> },
    responded: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: <MessageSquare className="size-3" /> },
    resolved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', icon: <CheckCircle className="size-3" /> }
  };

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-8 px-4 space-y-6 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col">
      {/* Header - Hidden on mobile when viewing a message to save space */}
      <div className={`${showMobileDetail ? 'hidden md:flex' : 'flex'} flex-col md:flex-row md:items-center justify-between gap-4 shrink-0`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Inquiries</h1>
          <p className="text-gray-500">Respond to customer messages.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          {(['all', 'open', 'responded', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 md:px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                filterStatus === status ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>
      

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative">
        
        {/* Left Sidebar: Inquiry List */}
        <div className={`${showMobileDetail ? 'hidden lg:flex' : 'flex'} lg:w-1/3 flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar`}>
          {sortedInquiries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <Mail className="size-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">No inquiries found</p>
            </div>
          ) : (
            sortedInquiries.map((inq) => (
              <button
                key={inq.id}
                onClick={() => setSelectedInquiry(inq.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedInquiry === inq.id
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10 shadow-sm'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {new Date(inq.date).toLocaleDateString()}
                  </span>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyles[inq.status].bg} ${statusStyles[inq.status].text}`}>
                    {statusStyles[inq.status].icon}
                    {inq.status}
                  </div>
                </div>
                <h3 className={`font-semibold text-sm truncate ${selectedInquiry === inq.id ? 'text-blue-900' : 'text-gray-900'}`}>
                  {inq.subject}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{inq.message}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400 italic">
                  <User className="size-3" /> {inq.first_name} {inq.last_name}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right Content: Inquiry Details */}
        <div className={`${!showMobileDetail ? 'hidden lg:flex' : 'flex'} lg:w-2/3 flex-col min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden absolute inset-0 lg:relative`}>
          {!inquiry ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                <MessageSquare className="size-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Select an inquiry</h3>
              <p className="text-gray-500 max-w-xs mx-auto">Click on a message from the sidebar to view the full conversation and respond.</p>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-start">
                <div className="flex items-start gap-3">
                  {/* Mobile Back Button */}
                  <button 
                    onClick={() => setShowMobileDetail(false)}
                    className="lg:hidden p-1 -ml-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <ChevronLeft className="size-6 text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">{inquiry.subject}</h2>
                    <div className="flex flex-col md:flex-row md:flex-wrap md:gap-4 text-xs md:text-sm text-gray-500">
                      <span className="flex items-center gap-1.5"><User className="size-3 md:size-4" /> {inquiry.first_name} {inquiry.last_name}</span>
                      <span className="flex items-center gap-1.5"><Calendar className="size-3 md:size-4" /> {new Date(inquiry.date).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase ${statusStyles[inquiry.status].bg} ${statusStyles[inquiry.status].text} border ${statusStyles[inquiry.status].border}`}>
                  {statusStyles[inquiry.status].icon}
                  {inquiry.status}
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
                <div className="flex flex-col items-start max-w-[90%]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Customer Message</span>
                  <div className="bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm">
                    <p className="text-sm leading-relaxed">{inquiry.message}</p>
                  </div>
                </div>

                {inquiry.response && (
                  <div className="flex flex-col items-end ml-auto max-w-[90%]">
                    <span className="text-[10px] font-bold text-blue-400 uppercase mb-2 mr-1">Your Response</span>
                    <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md">
                      <p className="text-sm leading-relaxed">{inquiry.response}</p>
                    </div>
                    {inquiry.responseDate && (
                      <span className="text-[10px] text-gray-400 mt-2 italic">
                        Sent on {new Date(inquiry.responseDate).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Area */}
              <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
                {inquiry.status === 'resolved' ? (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3 text-green-700">
                    <CheckCircle className="size-5 shrink-0" />
                    <span className="text-sm font-medium">Ticket resolved.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={response}
                      onChange={(e) => setResponse(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                      placeholder="Write your reply..."
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleResolve(inquiry.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all text-sm"
                      >
                        <CheckCircle className="size-4" />
                        <span className="hidden sm:inline">Resolve Ticket</span>
                        <span className="sm:hidden">Resolve</span>
                      </button>
                      <button
                        onClick={handleRespond}
                        disabled={!response.trim()}
                        className="flex-[2] flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100 text-sm"
                      >
                        <Send className="size-4" />
                        Send Response
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}