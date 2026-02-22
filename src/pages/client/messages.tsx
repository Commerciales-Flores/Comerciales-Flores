// src/pages/client/Messages.tsx

import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Mail, Send, X, PlusCircle, CheckCircle } from 'lucide-react';

export default function ClientMessages() {
  const { user } = useAuth();
  const { getInquiriesByUserId, addInquiry } = useData();
  const { sendSystemNotification } = useNotifications(); // For confirmation

  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch only the inquiries belonging to the current user
  const userInquiries = user ? getInquiriesByUserId(user.id) : [];
  const sortedInquiries = [...userInquiries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const selectedInquiry = sortedInquiries.find(i => i.id === selectedInquiryId);

  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    responded: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800'
  };

  // --- New Inquiry Modal State ---
  const [newInquiryForm, setNewInquiryForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const handleNewInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newInquiryForm.subject.trim() || !newInquiryForm.message.trim()) return;

    setLoading(true);

    addInquiry({
      userId: user.id,
      name: user.name,
      email: user.email,
      subject: newInquiryForm.subject,
      message: newInquiryForm.message,
    });

    sendSystemNotification(
      user.id,
      "Inquiry Submitted",
      `Your inquiry "${newInquiryForm.subject}" has been sent. We'll get back to you soon.`
    );
    
    setLoading(false);
    setFormSuccess(true); // Show success message

    setTimeout(() => {
      setIsModalOpen(false);
      setFormSuccess(false);
      setNewInquiryForm({ subject: '', message: '' });
    }, 2500);
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

            {/* ✅ START: FINAL, CORRECTED LAYOUT */}
      {sortedInquiries.length === 0 ? (
        // 1. If there are NO inquiries, show this single, centered message.
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Mail className="size-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No Messages Found</h3>
          <p className="text-sm text-gray-500">You haven't sent any inquiries yet. Click "New Inquiry" to start a conversation.</p>
        </div>
      ) : (
        // 2. Otherwise, show the full two-column layout.
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Inquiry List */}
          <div className="lg:col-span-1 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
            {sortedInquiries.map((inq) => (
              <div
                key={inq.id}
                onClick={() => setSelectedInquiryId(inq.id)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedInquiryId === inq.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{inq.subject}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[inq.status]}`}>
                    {inq.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Sent on {new Date(inq.date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column: Inquiry Details */}
          <div className="lg:col-span-2">
            {!selectedInquiry ? (
              // This is the prompt to select an item.
              <div className="bg-white rounded-lg border border-gray-200 h-full flex items-center justify-center p-12">
                <div className="text-center">
                  <Mail className="size-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a conversation from the left to view details.</p>
                </div>
              </div>
            ) : (
              // ✅ THIS IS THE PART THAT WAS MISSING. It is now restored.
              <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold">{selectedInquiry.subject}</h2>
                    <span className={`px-3 py-1 text-sm rounded-full ${statusColors[selectedInquiry.status]}`}>
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
                    <div className="bg-gray-100 p-4 rounded-lg text-gray-800 whitespace-pre-wrap">
                      {selectedInquiry.message}
                    </div>
                  </div>

                  {selectedInquiry.response && (
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-2">Admin's Response:</h3>
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-gray-800 whitespace-pre-wrap">
                        {selectedInquiry.response}
                      </div>
                      {selectedInquiry.responseDate && (
                        <p className="text-xs text-gray-500 mt-2">
                          Responded on {new Date(selectedInquiry.responseDate).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {!selectedInquiry.response && selectedInquiry.status === 'open' && (
                      <div className="text-center p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                          An admin will review your message and respond shortly.
                      </div>
                  )}
                </div>
                
                {selectedInquiry.status === 'resolved' && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-2 text-green-700 bg-green-50">
                      <CheckCircle className="size-5" />
                      <span>This conversation has been resolved.</span>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* ✅ END: FINAL, CORRECTED LAYOUT */}


      {/* New Inquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Send a New Inquiry</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="size-6" />
              </button>
            </div>
            
            {formSuccess ? (
                <div className="p-10 text-center">
                    <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Inquiry Sent!</h3>
                    <p className="text-gray-600">An admin will respond to you shortly. You can now close this window.</p>
                </div>
            ) : (
                <form onSubmit={handleNewInquirySubmit}>
                <div className="p-6 space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <input
                        type="text"
                        required
                        value={newInquiryForm.subject}
                        onChange={(e) => setNewInquiryForm({ ...newInquiryForm, subject: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Question about Parking Rates"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                        rows={6}
                        required
                        value={newInquiryForm.message}
                        onChange={(e) => setNewInquiryForm({ ...newInquiryForm, message: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Please provide as much detail as possible..."
                    />
                    </div>
                </div>
                <div className="p-6 bg-gray-50 border-t flex justify-end">
                    <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
