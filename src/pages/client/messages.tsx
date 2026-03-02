import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Mail, Send, X, PlusCircle, CheckCircle, Clock, MessageSquare, ArrowLeft } from 'lucide-react';

export default function ClientMessages() {
  const { user } = useAuth();
  const { getInquiriesByUserId, addInquiry } = useData();
  const { sendSystemNotification } = useNotifications();

  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for mobile view toggle
  const [showDetail, setShowDetail] = useState(false);

  const userInquiries = user ? getInquiriesByUserId(user.id) : [];
  const sortedInquiries = [...userInquiries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const selectedInquiry = sortedInquiries.find(i => i.id === selectedInquiryId);

  const statusStyles = {
    open: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending' },
    responded: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Replied' },
    resolved: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Resolved' }
  };

  const [newInquiryForm, setNewInquiryForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const handleNewInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newInquiryForm.subject.trim() || !newInquiryForm.message.trim()) return;

    setLoading(true);
    await addInquiry({
      userId: user.id,
      name: user.name,
      email: user.email,
      subject: newInquiryForm.subject,
      message: newInquiryForm.message,
    });

    sendSystemNotification(
      user.id,
      "Inquiry Submitted",
      `We've received your inquiry: "${newInquiryForm.subject}".`
    );
    
    setLoading(false);
    setFormSuccess(true);

    setTimeout(() => {
      setIsModalOpen(false);
      setFormSuccess(false);
      setNewInquiryForm({ subject: '', message: '' });
    }, 2000);
  };

  const selectInquiry = (id: string) => {
    setSelectedInquiryId(id);
    setShowDetail(true);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 h-[calc(100vh-140px)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Center</h1>
          <p className="text-gray-500">Track your support tickets and inquiries.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <PlusCircle className="size-5 group-hover:rotate-90 transition-transform" />
          <span className="font-semibold">New Inquiry</span>
        </button>
      </div>

      {sortedInquiries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
          <div className="bg-blue-50 p-6 rounded-full mb-4">
            <Mail className="size-12 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No messages yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-2">
            Have a question about your booking or parking rates? Start a conversation with our team.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Left: List (Hidden on mobile when detail is shown) */}
          <div className={`lg:w-1/3 flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar ${showDetail ? 'hidden lg:flex' : 'flex'}`}>
            {sortedInquiries.map((inq) => (
              <button
                key={inq.id}
                onClick={() => selectInquiry(inq.id)}
                className={`w-full text-left p-5 rounded-2xl border transition-all ${
                  selectedInquiryId === inq.id
                    ? 'bg-white border-blue-500 ring-4 ring-blue-50 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyles[inq.status].bg} ${statusStyles[inq.status].text} ${statusStyles[inq.status].border}`}>
                    {statusStyles[inq.status].label}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {new Date(inq.date).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{inq.subject}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{inq.message}</p>
              </button>
            ))}
          </div>

          {/* Right: Detail View */}
          <div className={`lg:w-2/3 bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-0 ${!showDetail ? 'hidden lg:flex' : 'flex'}`}>
            {!selectedInquiry ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <MessageSquare className="size-12 text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">Select a conversation to read</p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowDetail(false)} className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full">
                      <ArrowLeft className="size-5" />
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedInquiry.subject}</h2>
                      <p className="text-xs text-gray-500">Ticket ID: #{selectedInquiry.id.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${statusStyles[selectedInquiry.status].bg} ${statusStyles[selectedInquiry.status].text}`}>
                    <div className={`size-1.5 rounded-full ${selectedInquiry.status === 'open' ? 'bg-amber-500 animate-pulse' : 'bg-current'}`} />
                    {statusStyles[selectedInquiry.status].label}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  {/* Client Message */}
                  <div className="flex flex-col items-end">
                    <div className="max-w-[85%] bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md shadow-blue-100">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedInquiry.message}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-2 font-medium">You • {new Date(selectedInquiry.date).toLocaleString()}</span>
                  </div>

                  {/* Admin Response */}
                  {selectedInquiry.response ? (
                    <div className="flex flex-col items-start">
                      <div className="max-w-[85%] bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none border border-gray-200">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedInquiry.response}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-2 font-medium">Support Team • {new Date(selectedInquiry.responseDate!).toLocaleString()}</span>
                    </div>
                  ) : (
                    selectedInquiry.status === 'open' && (
                      <div className="flex items-center gap-3 py-4 px-6 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 mx-auto max-w-sm">
                        <Clock className="size-5 shrink-0" />
                        <p className="text-xs font-medium">We've received your message. A team member will respond shortly.</p>
                      </div>
                    )
                  )}
                </div>

                {selectedInquiry.status === 'resolved' && (
                  <div className="p-4 bg-green-50 border-t border-green-100 flex items-center justify-center gap-2 text-green-700 font-bold text-xs uppercase tracking-wider">
                    <CheckCircle className="size-4" />
                    This issue has been marked as resolved
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* New Inquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-50">
              <h2 className="text-xl font-bold text-gray-900">New Support Ticket</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X className="size-6" />
              </button>
            </div>
            
            {formSuccess ? (
              <div className="p-12 text-center">
                <div className="size-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="size-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-500">We'll notify you as soon as an admin responds.</p>
              </div>
            ) : (
              <form onSubmit={handleNewInquirySubmit}>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Topic / Subject</label>
                    <input
                      type="text"
                      required
                      value={newInquiryForm.subject}
                      onChange={(e) => setNewInquiryForm({ ...newInquiryForm, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g. Issues with my reservation"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Detailed Message</label>
                    <textarea
                      rows={5}
                      required
                      value={newInquiryForm.message}
                      onChange={(e) => setNewInquiryForm({ ...newInquiryForm, message: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                      placeholder="Describe your question or issue in detail..."
                    />
                  </div>
                </div>
                <div className="p-6 bg-gray-50 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
                  >
                    <Send className="size-4" />
                    {loading ? 'Sending...' : 'Submit Inquiry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}