import { useState } from 'react';
import { X, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext'; // Make sure this path is correct

interface ContactSupportModalProps {
  onClose: () => void;
}

export default function ContactSupportModal({ onClose }: ContactSupportModalProps) {
  const { user } = useAuth();
  const { addInquiry } = useData();
  const { sendSystemNotification } = useNotifications();
  
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

    // Send a system notification for a persistent record
    sendSystemNotification(
      user.id,
      "Support message sent",
      `Your inquiry "${formData.subject}" has been received. You can view replies in the Messages section.`
    );

    setSubmitted(true);
    setLoading(false);

    // Close the modal after a delay
    setTimeout(() => {
      onClose();
    }, 3000); // Increased delay for better readability of the success message
  };

  return (
    // ✅ This is your original layout, preserved as requested.
    <div className="fixed bottom-20 right-6 w-96 bg-white rounded-lg shadow-2xl z-50 animate-fade-in-up">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg text-gray-800">Contact Support</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="size-6" />
        </button>
      </div>

      {submitted ? (
        // ✅ 1. IMPROVEMENT: A much richer and more informative success screen.
        <div className="p-6 text-center">
          <CheckCircle className="size-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">Message Sent!</h3>
          <p className="text-sm text-gray-600">
            Our team will get back to you soon. You can view responses in the 
            <span className="font-semibold text-blue-600"> Messages</span> section.
          </p>
        </div>
      ) : (
        // ✅ 2. IMPROVEMENT: A cleaner form with loading state feedback.
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
          <div className="p-4 bg-gray-50 border-t flex justify-end">
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

// Optional: Add a simple animation in your tailwind.config.js and global CSS
// In tailwind.config.js -> theme -> extend -> keyframes:
// 'fade-in-up': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } }
// In tailwind.config.js -> theme -> extend -> animation:
// 'fade-in-up': 'fade-in-up 0.3s ease-out'
