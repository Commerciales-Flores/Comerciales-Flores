import { useState, useEffect } from 'react';
import supabase from '../../supabaseClient'; 
import { useData } from '../../contexts/DataContext';
import type { Inquiry, InquiryStatus } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Mail, Send, X, PlusCircle, CheckCircle } from 'lucide-react';

export default function ClientMessages() {
  const { user } = useAuth();
  const { addInquiry, getNotificationsByUserId, markNotificationRead } = useData();
  const { sendSystemNotification } = useNotifications();

  const [userInquiries, setUserInquiries] = useState<Inquiry[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newInquiryForm, setNewInquiryForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const userNotifications = getNotificationsByUserId(user?.id || '');
  const unreadInquiryNotifications = userNotifications.filter(n => n.type === 'inquiry' && !n.read);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (error) throw error;

        const mappedInquiries: Inquiry[] = data.map((row: any) => ({
          id: row.message_id,
          userId: row.user_id,
          name: row.name,
          email: row.email,
          subject: row.subject,
          message: row.message,
          status: row.status as InquiryStatus,
          date: row.date,
          response: row.response,
          responseDate: row.response_date,
        }));

        setUserInquiries(mappedInquiries);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [user?.id]);

  const sortedInquiries = [...userInquiries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const selectedInquiry = sortedInquiries.find(i => i.id === selectedInquiryId);

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiryId(inquiry.id);
    
    const relatedNotification = unreadInquiryNotifications.find(n => 
      n.message.includes(inquiry.subject)
    );

    if (relatedNotification) {
      markNotificationRead(relatedNotification.id);
    }
  };

  // ✅ FIX: Changed 'resolved' to 'closed' to strictly match InquiryStatus type
  const statusColors: Record<InquiryStatus, string> = {
    open: 'bg-yellow-100 text-yellow-800',
    responded: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800' 
  };

  const handleNewInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newInquiryForm.subject.trim() || !newInquiryForm.message.trim()) return;

    setLoading(true);

    try {
      // ✅ FIX: Changed to user.firstName and user.lastName
      const newInquiryId = await addInquiry({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`, 
        email: user.email,
        subject: newInquiryForm.subject,
        message: newInquiryForm.message,
      });

      const optimisticInquiry: Inquiry = {
        id: newInquiryId,
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`, // ✅ FIX
        email: user.email,
        subject: newInquiryForm.subject,
        message: newInquiryForm.message,
        status: 'open',
        date: new Date().toISOString(),
      };
      setUserInquiries(prev => [optimisticInquiry, ...prev]);

      sendSystemNotification(
        user.id,
        "Inquiry Submitted",
        `Your inquiry "${newInquiryForm.subject}" has been sent. We'll get back to you soon.`
      );
      
      setFormSuccess(true);
      
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(false);
        setNewInquiryForm({ subject: '', message: '' });
      }, 2500);

    } catch (error) {
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const openNewInquiryModal = () => {
    setNewInquiryForm({ subject: '', message: '' });
    setFormSuccess(false);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="mb-2">My Inquiries</h1>
          <p className="text-gray-600">View your communication history with us</p>
        </div>
        <button
          onClick={openNewInquiryModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="size-5" />
          New Inquiry
        </button>
      </div>

      {isLoadingMessages ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading your messages...</p>
        </div>
      ) : sortedInquiries.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Mail className="size-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No Messages Found</h3>
          <p className="text-sm text-gray-500">You haven't sent any inquiries yet. Click "New Inquiry" to start a conversation.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Inquiry List */}
          <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {sortedInquiries.map((inq) => {
              const hasUnreadReply = unreadInquiryNotifications.some(n => n.message.includes(inq.subject));

              return (
                <div
                  key={inq.id}
                  onClick={() => handleSelectInquiry(inq)}
                  className={`bg-white border rounded-lg p-4 cursor-pointer transition-all relative ${
                    selectedInquiryId === inq.id
                      ? 'border-blue-500 shadow-md ring-1 ring-blue-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {hasUnreadReply && (
                    <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-sm font-semibold line-clamp-1 pr-2 ${hasUnreadReply ? 'text-blue-700' : 'text-gray-900'}`}>
                      {inq.subject}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[inq.status]}`}>
                      {inq.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Sent on {new Date(inq.date).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Inquiry Details */}
          <div className="lg:col-span-2">
            {!selectedInquiry ? (
              <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center p-12 min-h-[400px]">
                <div className="text-center">
                  <Mail className="size-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a conversation from the left to view details.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col max-h-[calc(100vh-250px)]">
                <div className="p-6 border-b border-gray-200 shrink-0">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold pr-4">{selectedInquiry.subject}</h2>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ${statusColors[selectedInquiry.status]}`}>
                      {selectedInquiry.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Sent on: {new Date(selectedInquiry.date).toLocaleString()}
                  </p>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Message:</h3>
                    <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-gray-800 whitespace-pre-wrap">
                      {selectedInquiry.message}
                    </div>
                  </div>

                  {selectedInquiry.response && (
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-2">Admin's Response:</h3>
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-gray-800 whitespace-pre-wrap relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg"></div>
                        {selectedInquiry.response}
                      </div>
                      {selectedInquiry.responseDate && (
                        <p className="text-xs text-gray-500 mt-2 ml-1">
                          Responded on {new Date(selectedInquiry.responseDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {!selectedInquiry.response && selectedInquiry.status === 'open' && (
                      <div className="text-center p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">
                          An admin will review your message and respond shortly.
                      </div>
                  )}
                </div>
                
                {/* ✅ FIX: Changed check from 'resolved' to 'closed' */}
                {selectedInquiry.status === 'closed' && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-2 text-green-700 bg-green-50 font-medium shrink-0">
                      <CheckCircle className="size-5" />
                      <span>This conversation has been marked as closed.</span>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Inquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Send a New Inquiry</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="size-6" />
              </button>
            </div>
            
            {formSuccess ? (
                <div className="p-10 text-center bg-gray-50">
                    <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inquiry Sent Successfully!</h3>
                    <p className="text-gray-600">An admin will respond to you shortly. You can now close this window.</p>
                </div>
            ) : (
                <form onSubmit={handleNewInquirySubmit}>
                <div className="p-6 space-y-5">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                        type="text"
                        required
                        value={newInquiryForm.subject}
                        onChange={(e) => setNewInquiryForm({ ...newInquiryForm, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        placeholder="e.g., Question about Parking Rates"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                        rows={6}
                        required
                        value={newInquiryForm.message}
                        onChange={(e) => setNewInquiryForm({ ...newInquiryForm, message: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
                        placeholder="Please provide as much detail as possible..."
                    />
                    </div>
                </div>
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                    >
                    <Send className="size-4" />
                    {loading ? 'Sending...' : 'Send Inquiry'}
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