import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, X, PlusCircle, CheckCircle, Clock, ArrowLeft, Bell, Info, MessageSquare } from 'lucide-react';

export default function ClientMessages() {
  const { user } = useAuth();
  const { getInquiriesByUserId, addInquiry } = useData();
  const { sendSystemNotification } = useNotifications();

  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      first_name: user.firstName,
      last_name: user.lastName,
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

  const deselectInquiry = () => {
    setSelectedInquiryId(null);
    setShowDetail(false);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Header */}  
        <header>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Messages
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Track your support tickets and inquiries.
        </p>
      </header>

      {/* Floating Action Button restored to bottom right */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 md:hidden right-8 z-[55] size-14 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-400 flex items-center justify-center hover:bg-blue-700 hover:scale-110 active:scale-95 transition-all"
      >
        <PlusCircle className="size-8" />
      </button>

      {/* Main Content Area */}
      {sortedInquiries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="bg-blue-50 p-6 rounded-3xl shadow-sm mb-4">
            <Mail className="size-12 text-blue-500" />
          </div>

          <h3 className="text-lg font-bold text-gray-900">
            No messages yet
          </h3>

          <p className="text-gray-500 max-w-xs text-sm mt-1">
            Need help? Start a conversation with our team.
          </p>
        </motion.div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden relative">
          
          {/* Left Side: List */}
          <div className={`w-full lg:w-1/3 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-24 lg:pb-0 ${showDetail ? 'hidden lg:flex' : 'flex'}`}>
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
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${statusStyles[inq.status].bg} ${statusStyles[inq.status].text} ${statusStyles[inq.status].border}`}>
                    {statusStyles[inq.status].label}
                  </span>
                  <span className="text-[11px] text-gray-400">{new Date(inq.date).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1 truncate">{inq.subject}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{inq.message}</p>
              </button>
            ))}
          </div>
          

          {/* Right Side: Detail Panel */}
          <div className={`fixed inset-0 z-[60] lg:relative lg:inset-auto lg:z-auto lg:flex-1 bg-white lg:bg-transparent ${showDetail ? 'flex' : 'hidden lg:flex'}`}>
            <AnimatePresence mode="wait">
              {selectedInquiry ? (
                <motion.div
                  key={selectedInquiry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex-1 bg-white lg:rounded-[32px] border-none lg:border lg:border-gray-100 flex flex-col overflow-hidden h-full"
                >
                  {/* DETAIL HEADER - Fixed to show back/close buttons */}
                  <div className="p-4 lg:p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      {/* Back Arrow - Always visible on mobile, used to deselect */}
                      <button 
                        onClick={deselectInquiry} 
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
                      >
                        <ArrowLeft className="size-6 text-gray-900" />
                      </button>
                      <div>
                        <h2 className="text-base lg:text-lg font-bold text-gray-900 leading-tight">
                          {selectedInquiry.subject}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className={`text-[10px] font-bold uppercase ${statusStyles[selectedInquiry.status].text}`}>
                            {statusStyles[selectedInquiry.status].label}
                           </span>
                           <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">• ID: #{selectedInquiry.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Close Button */}
                    <button 
                      onClick={deselectInquiry} 
                      className="hidden lg:flex p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                      <X className="size-5" />
                    </button>
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
                    <div className="flex flex-col items-end">
                      <div className="max-w-[90%] bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{selectedInquiry.message}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-2">You • {new Date(selectedInquiry.date).toLocaleString()}</span>
                    </div>

                    {selectedInquiry.response ? (
                      <div className="flex flex-col items-start">
                        <div className="max-w-[90%] bg-gray-100 text-gray-800 p-4 rounded-2xl rounded-tl-none border border-gray-200">
                          <p className="text-sm whitespace-pre-wrap">{selectedInquiry.response}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-2">Support Team • {new Date(selectedInquiry.responseDate!).toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 max-w-sm mx-auto">
                        <Clock className="size-5 shrink-0 animate-pulse" />
                        <p className="text-xs font-medium">Wait tight! We're reviewing your inquiry.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-white rounded-[32px] border border-gray-100 text-center p-12">
                   <div className="bg-gray-50 p-6 rounded-full mb-4">
                     <MessageSquare className="size-10 text-gray-300" />
                   </div>
                  <h3 className="text-gray-900 font-bold">Your conversation</h3>
                  <p className="text-gray-500 text-sm mt-1">Select a ticket from the list to view the full chat history.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      

      {/* New Inquiry Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">New Support Ticket</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-blue-600">
                  <X className="size-6" />
                </button>
              </div>

              {formSuccess ? (
                <div className="p-12 text-center">
                  <div className="size-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="size-10" />
                  </div>
                  <h3 className="text-lg font-bold">Message Sent</h3>
                  <p className="text-sm text-gray-500">We'll notify you as soon as we reply.</p>
                </div>
              ) : (
                <form onSubmit={handleNewInquirySubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subject</label>
                    <input
                      type="text" required
                      value={newInquiryForm.subject}
                      onChange={(e) => setNewInquiryForm({ ...newInquiryForm, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="What is this regarding?"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Message</label>
                    <textarea
                      rows={4} required
                      value={newInquiryForm.message}
                      onChange={(e) => setNewInquiryForm({ ...newInquiryForm, message: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>
                  <button
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    <Send className="size-4" />
                    {loading ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}