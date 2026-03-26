import React, { useCallback, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState'
import { formatDate, formatDateTime } from '../../utils/date';

import {
  Mail,
  Send,
  X,
  PlusCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';


const statusStyles = {
  open: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Pending',
  },
  responded: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Replied',
  },
  resolved: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    label: 'Resolved',
  },
} as const;

const defaultStatusStyle = {
  bg: 'bg-gray-50',
  text: 'text-gray-700',
  border: 'border-gray-200',
  label: 'Unknown',
};

const initialFormState = {
  subject: '',
  message: '',
};

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}


function getInquiryStatusStyle(status?: string) {
  return statusStyles[status as keyof typeof statusStyles] ?? defaultStatusStyle;
}

type InquiryListItemProps = {
  inquiry: any;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

const InquiryListItem = React.memo(function InquiryListItem({
  inquiry,
  isSelected,
  onSelect,
}: InquiryListItemProps) {
  const style = getInquiryStatusStyle(inquiry.status);

  return (
    <button
      onClick={() => onSelect(inquiry.id)}
      className={`w-full rounded-2xl border p-5 text-left transition-all ${
        isSelected
          ? 'border-blue-500 bg-white ring-4 ring-blue-50 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-300'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <span
          className={`rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${style.bg} ${style.text} ${style.border}`}
        >
          {style.label}
        </span>

        <span className="shrink-0 text-[11px] text-gray-400">
          {formatDate(inquiry.date)}
        </span>
      </div>

      <h3 className="mb-1 truncate text-sm font-bold text-gray-900">
        {inquiry.subject}
      </h3>

      <p className="line-clamp-2 text-xs text-gray-500">{inquiry.message}</p>
    </button>
  );
});


type InquiryDetailProps = {
  inquiry: any;
  onBack: () => void;
  onClose: () => void;
};

const InquiryDetail = React.memo(function InquiryDetail({
  inquiry,
  onBack,
  onClose,
}: InquiryDetailProps) {
  const style = getInquiryStatusStyle(inquiry.status);

  return (
    <motion.div
      key={inquiry.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex h-full flex-1 flex-col overflow-hidden border-none bg-white lg:rounded-[32px] lg:border lg:border-gray-100"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4 lg:p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-full p-2 -ml-2 transition-colors hover:bg-gray-100 lg:hidden"
          >
            <ArrowLeft className="size-6 text-gray-900" />
          </button>

          <div>
            <h2 className="text-base font-bold leading-tight text-gray-900 lg:text-lg">
              {inquiry.subject}
            </h2>

            <div className="mt-0.5 flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase ${style.text}`}>
                {style.label}
              </span>

              <span className="hidden font-mono text-[10px] text-gray-400 sm:inline">
                • ID: #{String(inquiry.id).slice(-6).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="hidden rounded-full bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 lg:flex"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-white p-6">
        <div className="flex flex-col items-end">
          <span className="mb-2 text-[10px] font-bold uppercase text-blue-500">
            Your Message
          </span>

          <div className="max-w-[90%] rounded-2xl rounded-tr-none bg-blue-600 p-4 text-white shadow-sm">
            <p className="whitespace-pre-wrap text-sm">{inquiry.message}</p>
          </div>

          <span className="mt-2 text-[10px] text-gray-400">
            You • {formatDateTime(inquiry.date)}
          </span>
        </div>

        {inquiry.response ? (
          <>
            <div className="flex flex-col items-start">
              <span className="mb-2 text-[10px] font-bold uppercase text-gray-500">
                Support Reply
              </span>

              <div className="max-w-[90%] rounded-2xl rounded-tl-none border border-gray-200 bg-gray-100 p-4 text-gray-800">
                <p className="whitespace-pre-wrap text-sm">{inquiry.response}</p>
              </div>

              <span className="mt-2 text-[10px] text-gray-400">
                Support Team • {formatDateTime(inquiry.responseDate)}
              </span>
            </div>

            <div className="mx-auto max-w-xl rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              This ticket is now closed. Each ticket is for one concern only. If you still
              need help, please submit a new message.
            </div>
          </>
        ) : (
          <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
            <Clock className="size-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Awaiting response</p>
              <p className="text-[11px] text-amber-700">
                Your message has been sent to the support team. This ticket will close once
                a reply is sent.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

type InquiryComposerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  form: { subject: string; message: string };
  loading: boolean;
  formSuccess: boolean;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const InquiryComposerModal = React.memo(function InquiryComposerModal({
  isOpen,
  onClose,
  form,
  loading,
  formSuccess,
  onSubjectChange,
  onMessageChange,
  onSubmit,
}: InquiryComposerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60"
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px]"
          >
            <div className="flex items-center justify-between border-b border-gray-50 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                New Support Ticket
              </h2>

              <button
                onClick={onClose}
                className="rounded-full p-2 text-blue-600 hover:bg-gray-100"
              >
                <X className="size-6" />
              </button>
            </div>

            {formSuccess ? (
              <div className="p-12 text-center">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-50 text-green-500">
                  <CheckCircle className="size-10" />
                </div>

                <h3 className="text-lg font-bold">Message Sent</h3>
                <p className="text-sm text-gray-500">
                  We&apos;ll notify you as soon as we reply.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Subject
                  </label>

                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => onSubjectChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What is this regarding?"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Message
                  </label>

                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={(e) => onMessageChange(e.target.value)}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  This ticket is for one concern only. Once our team responds, the ticket is considered
                  closed. If you need more help afterward, please submit a new message.
                </div>

                <button
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
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
  );
});

export default function ClientMessages() {
  const { user } = useAuth();
  const { getInquiriesByUserId, addInquiry } = useData();
  const { sendSystemNotification } = useNotifications();

  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [newInquiryForm, setNewInquiryForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const userId = user?.id ?? '';

  const sortedInquiries = useMemo(() => {
    if (!userId) return [];
    const userInquiries = getInquiriesByUserId(userId) ?? [];

    return [...userInquiries].sort(
      (a, b) => getTimestamp(b.date) - getTimestamp(a.date)
    );
  }, [getInquiriesByUserId, userId]);

  const selectedInquiry = useMemo(
    () => sortedInquiries.find((i) => i.id === selectedInquiryId) ?? null,
    [sortedInquiries, selectedInquiryId]
  );

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (loading) return;
    setIsModalOpen(false);
    if (!formSuccess) {
      setNewInquiryForm(initialFormState);
    }
  }, [loading, formSuccess]);

  const selectInquiry = useCallback((id: string) => {
    setSelectedInquiryId(id);
    setShowDetail(true);
  }, []);

  const deselectInquiry = useCallback(() => {
    setSelectedInquiryId(null);
    setShowDetail(false);
  }, []);

  const handleSubjectChange = useCallback((value: string) => {
    setNewInquiryForm((prev) => ({ ...prev, subject: value }));
  }, []);

  const handleMessageChange = useCallback((value: string) => {
    setNewInquiryForm((prev) => ({ ...prev, message: value }));
  }, []);

  const handleNewInquirySubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const subject = newInquiryForm.subject.trim();
      const message = newInquiryForm.message.trim();

      if (!user || !subject || !message || loading) return;

      setLoading(true);

      try {
        await addInquiry({
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          subject,
          message,
        });

        sendSystemNotification(
          user.id,
          'Inquiry Submitted',
          `We've received your inquiry: "${subject}".`
        );

        setFormSuccess(true);

        window.setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(false);
          setNewInquiryForm(initialFormState);
        }, 2000);
      } finally {
        setLoading(false);
      }
    },
    [addInquiry, loading, newInquiryForm.message, newInquiryForm.subject, sendSystemNotification, user]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-end justify-between gap-4">
  <header>
    <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
      Messages
    </h1>
    <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
      Track your support tickets and inquiries.
    </p>
  </header>

  <button
    onClick={openModal}
    className="hidden md:inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
  >
    <PlusCircle className="size-5" />
    New Message
  </button>
</div>

        {sortedInquiries.length === 0 ? (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
  >
    <EmptyState
      icon={<Mail className="size-10 text-blue-500" />}
      title="No messages yet"
      description="Need help? Start a conversation with our team."
    />
  </motion.div>
) : (
          <div className="relative flex flex-1 gap-6 overflow-hidden">
            <div
              className={`custom-scrollbar w-full flex-col gap-3 overflow-y-auto pb-24 lg:w-1/3 lg:pb-0 ${
                showDetail ? 'hidden lg:flex' : 'flex'
              }`}
            >
              {sortedInquiries.map((inquiry) => (
                <InquiryListItem
                  key={inquiry.id}
                  inquiry={inquiry}
                  isSelected={selectedInquiryId === inquiry.id}
                  onSelect={selectInquiry}
                />
              ))}
            </div>

            <div
              className={`fixed inset-0 z-[60] bg-white lg:relative lg:inset-auto lg:z-auto lg:flex-1 lg:bg-transparent ${
                showDetail ? 'flex' : 'hidden lg:flex'
              }`}
            >
              <AnimatePresence mode="wait">
                {selectedInquiry ? (
                  <InquiryDetail
                    key={selectedInquiry.id}
                    inquiry={selectedInquiry}
                    onBack={deselectInquiry}
                    onClose={deselectInquiry}
                  />
                ) : (
                  <div className="hidden flex-1 flex-col items-center justify-center rounded-[32px] border border-gray-100 bg-white p-12 text-center lg:flex">
                    <div className="mb-4 rounded-full bg-gray-50 p-6">
                      <MessageSquare className="size-10 text-gray-300" />
                    </div>

                    <h3 className="font-bold text-gray-900">
                      Your conversation
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Select a ticket from the list to view the full chat
                      history.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        <InquiryComposerModal
          isOpen={isModalOpen}
          onClose={closeModal}
          form={newInquiryForm}
          loading={loading}
          formSuccess={formSuccess}
          onSubjectChange={handleSubjectChange}
          onMessageChange={handleMessageChange}
          onSubmit={handleNewInquirySubmit}
        />
      </div>
    </div>
  );
}