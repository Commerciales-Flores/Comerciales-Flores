import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Send, MessageSquare, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Contact() {
  const { inquiries, createInquiry } = useData();
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const userInquiries = inquiries
    .filter(i => i.userId === user?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    createInquiry({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      subject,
      message,
    });

    setSubject('');
    setMessage('');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-600">Send us a message or view your inquiries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-gray-900 mb-4">Send a Message</h2>
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
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Message</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your message here..."
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
          </form>
        </div>

        {/* Previous Inquiries */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-gray-900 mb-4">Your Inquiries</h2>
          
          {userInquiries.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No inquiries yet</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {userInquiries.map((inquiry) => (
                <div key={inquiry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-gray-900 mb-1">{inquiry.subject}</h3>
                      <p className="text-sm text-gray-600">
                        {format(new Date(inquiry.createdAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(inquiry.status)}
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Your message:</p>
                      <p className="text-gray-900">{inquiry.message}</p>
                    </div>

                    {inquiry.response && (
                      <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-600">
                        <p className="text-sm text-gray-600 mb-1">Response:</p>
                        <p className="text-gray-900">{inquiry.response}</p>
                      </div>
                    )}

                    {inquiry.status === 'open' && (
                      <p className="text-sm text-yellow-600">Waiting for response...</p>
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
