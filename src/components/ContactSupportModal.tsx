import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useInquiries } from '../contexts/InquiriesContext';
import { useNotifications } from '../contexts/NotificationContext';

interface ContactSupportModalProps {
  onClose: () => void;
}

export default function ContactSupportModal({ onClose }: ContactSupportModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createTicket } = useInquiries();
  const { sendSystemNotification } = useNotifications();

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!visible) {
      document.body.style.overflow = '';
    }
  }, [visible]);

  const handleClose = () => {
    setVisible(false);
    window.setTimeout(() => onClose(), 250);
  };

  const handleGoToMessages = () => {
    handleClose();
    navigate('/client/messages');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || loading) return;

    const subject = formData.subject.trim();
    const message = formData.message.trim();

    if (!subject || !message) {
      setError('Please fill in both the subject and message.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createTicket({
        userId: user.id,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        email: user.email ?? undefined,
        subject,
        message,
        senderType: 'customer',
      });

      sendSystemNotification(
        user.id,
        'Support ticket created',
        `Your ticket "${subject}" has been created. Continue the conversation in Messages.`
      );

      setSubmitted(true);
      setFormData({ subject: '', message: '' });
    } catch (err) {
      console.error('Failed to create support ticket:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create your support ticket right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed z-50 transition-all duration-300 ease-out
          inset-x-4 top-[10%] mx-auto w-auto max-w-[calc(100%-2rem)]
          md:inset-auto md:bottom-8 md:right-8 md:top-auto md:w-[430px]
          rounded-[2rem] border border-gray-200 bg-white shadow-2xl
          ${visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-support-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-2xl bg-blue-50 p-3">
              <MessageSquare className="size-5 text-blue-600" />
            </div>

            <div className="min-w-0">
              <h2
                id="contact-support-title"
                className="text-base font-bold tracking-tight text-gray-900"
              >
                Start a Support Ticket
              </h2>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                New concern only
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close support modal"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-4">
          {submitted ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="size-9 text-green-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-900">Ticket created</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
                Your support request has been sent successfully. Continue the conversation
                in <span className="font-semibold text-blue-600">Messages</span> once support replies.
              </p>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                  What happens next
                </p>
                <p className="mt-1 text-sm leading-relaxed text-blue-900">
                  This created a new ticket. Future back-and-forth replies should happen in
                  the Messages page, not here.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleGoToMessages}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-black"
                >
                  Go to Messages
                  <ArrowRight className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                  Before you send
                </p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900">
                  Use this form to start a <span className="font-semibold">new support ticket</span>.
                  If you already have an ongoing conversation, continue it from the
                  <span className="font-semibold"> Messages</span> page instead.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, subject: e.target.value }))
                    }
                    maxLength={120}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder="Example: Partial payment not reflecting"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, message: e.target.value }))
                    }
                    rows={5}
                    maxLength={2000}
                    className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    placeholder="Describe your concern clearly. Include useful details like reservation, payment, unit, or date if relevant."
                    required
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-gray-200 transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        <Send className="size-4" />
                        Create Ticket
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}