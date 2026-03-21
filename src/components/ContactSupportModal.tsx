import { useState, useEffect } from 'react';
import { X, Send, CheckCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';

interface ContactSupportModalProps {
  onClose: () => void;
}

export default function ContactSupportModal({ onClose }: ContactSupportModalProps) {
  const { user } = useAuth();
  const { addInquiry } = useData();
  const { sendSystemNotification } = useNotifications();
  
  const [formData, setFormData] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timeout);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.subject.trim() || !formData.message.trim()) return;

    setLoading(true);
    // Simulate slight delay for "premium" feel
    await new Promise(resolve => setTimeout(resolve, 800));

    addInquiry({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      subject: formData.subject,
      message: formData.message
    });

    sendSystemNotification(
      user.id,
      "Support message sent",
      `Your inquiry "${formData.subject}" has been received.`
    );

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <>
      {/* Backdrop: Visible only on mobile, or can be enabled for both */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden
          ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
      />

      <div
        className={`fixed z-50 transition-all duration-300 ease-out
          /* Mobile: Centered */
          inset-x-4 top-[15%] bottom-auto mx-auto w-auto max-w-[calc(100%-2rem)]
          /* Desktop: Bottom Right */
          md:inset-auto md:bottom-8 md:right-8 md:w-[400px]
          
          bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20
          ${visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'}
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageSquare className="size-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Support</h2>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">Typically replies in 2h</p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="size-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        <div className="p-5 pt-0">
          {submitted ? (
            <div className="py-10 text-center animate-in fade-in zoom-in duration-300">
              <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="size-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">We've got it!</h3>
              <p className="text-sm text-gray-600 leading-relaxed px-4">
                Thanks for reaching out. We'll send a notification to your 
                <span className="text-blue-600 font-medium"> Messages</span> inbox once we reply.
              </p>
              <button 
                onClick={handleClose}
                className="mt-6 text-sm font-semibold text-gray-500 hover:text-gray-800"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm outline-none"
                  placeholder="What can we help with?"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Message</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm outline-none resize-none"
                  placeholder="Tell us a bit more..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 font-bold text-sm shadow-lg shadow-gray-200"
              >
                {loading ? (
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="size-4" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}