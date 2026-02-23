import { useState, useEffect } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';
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

  const [visible, setVisible] = useState(false); // fade-in trigger
  const [closing, setClosing] = useState(false); // fade-out trigger

  // Trigger fade-in on mount
  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(timeout);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setVisible(false);
    setTimeout(() => onClose(), 200); // match transition duration
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.subject.trim() || !formData.message.trim()) return;

    setLoading(true);

    addInquiry({
      userId: user.id,
      name: user.name,
      email: user.email,
      subject: formData.subject,
      message: formData.message
    });

    sendSystemNotification(
      user.id,
      "Support message sent",
      `Your inquiry "${formData.subject}" has been received. You can view replies in the Messages section.`
    );

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div
      className={`fixed bottom-20 right-6 w-96 bg-white rounded-lg shadow-2xl z-50
        transform transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${closing ? 'opacity-0 translate-y-4' : ''}`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg text-gray-800">Contact Support</h2>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="size-6" />
        </button>
      </div>

      {submitted ? (
        <div className="p-6 text-center">
          <CheckCircle className="size-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">Message Sent!</h3>
          <p className="text-sm text-gray-600">
            Our team will get back to you soon. You can view responses in the 
            <span className="font-semibold text-blue-600"> Messages</span> section.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g., Question about a booking"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Please describe your issue..."
              />
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-wait font-semibold text-sm"
            >
              <Send className="size-4" />
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}