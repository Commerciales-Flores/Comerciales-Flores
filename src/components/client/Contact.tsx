import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Send, MessageSquare, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Contact() {
  const { inquiries, addInquiry } = useData();
  const { user } = useAuth();
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const userInquiries = inquiries
    .filter(i => i.userId === user?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await addInquiry({
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`, 
        email: user.email,
        subject,
        message,
      });

      setSubject('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'responded':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'closed':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  // ✅ FIX: Removed the unused getStatusColor function!

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-600">Send us a message or view your inquiries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-gray-900 mb-4">Send a Message</h2>
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="size-5" />
              Message sent successfully! We will get back to you soon.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What is your inquiry about?"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Message</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Type your message here..."
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Previous Inquiries */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-gray-900 mb-4">Your Inquiries</h2>
          
          {userInquiries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">You haven't sent any messages yet.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {userInquiries.map((inquiry) => (
                <div key={inquiry.id} className="border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-gray-900 font-medium mb-1">{inquiry.subject}</h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(inquiry.date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 pr-3 rounded-full border border-gray-100">
                      {getStatusIcon(inquiry.status)}
                      <span className={`text-sm font-medium ${inquiry.status === 'responded' ? 'text-green-700' : inquiry.status === 'closed' ? 'text-gray-600' : 'text-yellow-700'}`}>
                        {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Message</p>
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">{inquiry.message}</p>
                    </div>

                    {inquiry.response && (
                      <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg"></div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Admin Response</p>
                          {inquiry.responseDate && (
                            <p className="text-xs text-gray-500">{format(new Date(inquiry.responseDate), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap text-sm">{inquiry.response}</p>
                      </div>
                    )}

                    {inquiry.status === 'open' && !inquiry.response && (
                      <p className="text-sm text-yellow-600 italic flex items-center gap-2 mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                        Waiting for response...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}