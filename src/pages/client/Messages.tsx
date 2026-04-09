import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, formatDateTime } from '../../utils/date';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { normalizeLowercaseText } from '../../utils/DataNormalization';
import {
  useInquiries,
  type SupportMessage,
  type SupportTicket,
} from '../../contexts/InquiriesContext';
import {
  Mail,
  Send,
  X,
  PlusCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  MessageSquare,
  RefreshCcw,
  Search,
  Filter,
} from 'lucide-react';

const statusStyles = {
  waiting_for_support: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'Waiting for Support',
  },
  waiting_for_customer: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    label: 'Support Replied',
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

type TicketFilterStatus =
  | 'all'
  | 'waiting_for_support'
  | 'waiting_for_customer'
  | 'resolved';

const TICKET_FILTER_OPTIONS: TicketFilterStatus[] = [
  'all',
  'waiting_for_support',
  'waiting_for_customer',
  'resolved',
];

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getTicketStatusStyle(status?: string) {
  return statusStyles[status as keyof typeof statusStyles] ?? defaultStatusStyle;
}

function getMessagePreview(messages: SupportMessage[]) {
  const last = messages[messages.length - 1];
  return last?.body ?? 'No messages yet';
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isDesktop;
}

type TicketListItemProps = {
  ticket: SupportTicket;
  messages: SupportMessage[];
  isSelected: boolean;
  onSelect: (id: string) => void;
};

const TicketListItem = React.memo(function TicketListItem({
  ticket,
  messages,
  isSelected,
  onSelect,
}: TicketListItemProps) {
  const style = getTicketStatusStyle(ticket.status);
  const preview = getMessagePreview(messages);

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={`w-full rounded-2xl border p-3.5 sm:p-4 text-left transition-all ${
        isSelected
          ? 'border-blue-500 bg-white ring-4 ring-blue-50 shadow-sm'
          : 'border-gray-100 bg-white hover:border-gray-300'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <span
          className={`rounded-lg border px-2 py-0.5 text-[11px] font-black uppercase ${style.bg} ${style.text} ${style.border}`}
        >
          {style.label}
        </span>

        <span className="shrink-0 text-xs text-gray-400">
          {formatDate(ticket.lastMessageAt || ticket.createdAt)}
        </span>
      </div>

      <h3 className="mb-1 min-w-0 line-clamp-2 text-[13px] font-bold text-gray-900">
        {ticket.subject}
      </h3>

      <p className="line-clamp-2 text-xs text-gray-500">{preview}</p>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <span className="font-mono">
          {ticket.publicId ?? `#${ticket.id.slice(-6).toUpperCase()}`}
        </span>
      </div>
    </button>
  );
});

type TicketFilterTabsProps = {
  filter: TicketFilterStatus;
  counts: Record<TicketFilterStatus, number>;
  onChange: (status: TicketFilterStatus) => void;
};

function TicketFilterTabs({
  filter,
  counts,
  onChange,
}: TicketFilterTabsProps) {
  return (
    <div className="hidden w-fit gap-1 rounded-xl bg-gray-100/80 p-1 md:flex">
      {TICKET_FILTER_OPTIONS.map((status) => {
        const label =
          status === 'all'
            ? 'all'
            : getTicketStatusStyle(status).label;

        return (
          <button
            key={status}
            type="button"
            onClick={() => onChange(status)}
            className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition-all ${
              filter === status
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span>{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  filter === status
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-white text-gray-500'
                }`}
              >
                {counts[status]}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type TicketFilterBottomSheetProps = {
  isOpen: boolean;
  filter: TicketFilterStatus;
  counts: Record<TicketFilterStatus, number>;
  onClose: () => void;
  onSelect: (status: TicketFilterStatus) => void;
};

function TicketFilterBottomSheet({
  isOpen,
  filter,
  counts,
  onClose,
  onSelect,
}: TicketFilterBottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] md:hidden"
          >
            <button
              type="button"
              aria-label="Close ticket filters"
              className="absolute inset-0 bg-gray-900/40"
              onClick={onClose}
            />
          </motion.div>

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-0 bottom-0 z-[70] md:hidden"
          >
            <div className="relative w-full rounded-t-3xl bg-white px-4 pb-4 pt-5 shadow-xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Filter tickets
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose which ticket status to show.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-gray-100 p-2 transition hover:bg-gray-200"
                >
                  <X className="size-5 text-gray-600" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {TICKET_FILTER_OPTIONS.map((status) => {
                  const label =
                    status === 'all'
                      ? 'all'
                      : getTicketStatusStyle(status).label;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => onSelect(status)}
                      className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold capitalize transition ${
                        filter === status
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'border border-gray-200 bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>{label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          filter === status
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-gray-500'
                        }`}
                      >
                        {counts[status]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

type TicketDetailProps = {
  ticket: SupportTicket;
  messages: SupportMessage[];
  currentUserId: string;
  replyDraft: string;
  isSendingReply: boolean;
  isUpdatingStatus: boolean;
  onReplyChange: (value: string) => void;
  onSendReply: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onBack: () => void;
  onClose: () => void;
};

const TicketDetail = React.memo(function TicketDetail({
  ticket,
  messages,
  currentUserId,
  replyDraft,
  isSendingReply,
  isUpdatingStatus,
  onReplyChange,
  onSendReply,
  onResolve,
  onReopen,
  onBack,
  onClose,
}: TicketDetailProps) {
  const style = getTicketStatusStyle(ticket.status);

  return (
    <motion.div
      key={ticket.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex h-full flex-1 flex-col overflow-hidden border-none bg-white lg:rounded-[32px] lg:border lg:border-gray-100"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 -ml-2 transition-colors hover:bg-gray-100 lg:hidden"
          >
            <ArrowLeft className="size-6 text-gray-900" />
          </button>

          <div>
            <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-lg">
              {ticket.subject}
            </h2>

            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className={`text-xs font-bold uppercase ${style.text}`}>
                {style.label}
              </span>

              <span className="hidden font-mono text-xs text-gray-400 sm:inline">
                • {ticket.publicId ?? `#${ticket.id.slice(-6).toUpperCase()}`}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="hidden rounded-full bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 lg:flex"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-white p-6">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-sm rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No messages yet.
          </div>
        ) : (
          messages.map((message) => {
            const isCurrentUserMessage =
              message.senderType === 'customer' &&
              message.senderUserId === currentUserId;

            const isSupportMessage = message.senderType === 'support';

            return (
              <div
                key={message.id}
                className={`flex flex-col ${
                  isCurrentUserMessage ? 'items-end' : 'items-start'
                }`}
              >
                <span
                  className={`mb-2 text-xs font-bold uppercase ${
                    isCurrentUserMessage
                      ? 'text-blue-500'
                      : isSupportMessage
                      ? 'text-gray-500'
                      : 'text-slate-500'
                  }`}
                >
                  {isCurrentUserMessage
                    ? 'Your Message'
                    : isSupportMessage
                    ? 'Support Reply'
                    : 'Guest Message'}
                </span>

                <div
                  className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-4 shadow-sm ${
                    isCurrentUserMessage
                      ? 'rounded-tr-none bg-blue-600 text-white'
                      : 'rounded-tl-none border border-gray-200 bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                </div>

                <span className="mt-2 text-xs text-gray-400">
                  {isCurrentUserMessage ? 'You' : 'Support Team'} •{' '}
                  {formatDateTime(message.createdAt)}
                </span>
              </div>
            );
          })
        )}

        {ticket.status === 'resolved' ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
            This ticket has been marked as resolved.
          </div>
        ) : ticket.status === 'waiting_for_support' ? (
          <div className="mx-auto flex max-w-sm lg:max-w-xs items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 lg:p-2.5 text-amber-800">
            <Clock className="size-5 lg:size-4 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Waiting for support</p>
              <p className="text-xs text-amber-700">
                Our support team will reply here once they review your message.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-800">
            <CheckCircle className="size-5 shrink-0" />
            <div>
              <p className="text-xs font-semibold">Support replied</p>
              <p className="text-xs sm:text-sm text-blue-700">
                You can reply back here or mark this ticket as resolved.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white p-4 lg:p-6">
        {ticket.status === 'resolved' ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onReopen}
              disabled={isUpdatingStatus}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="size-4" />
              {isUpdatingStatus ? 'Reopening...' : 'Reopen Ticket'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={2}
              maxLength={2000}
              value={replyDraft}
              onChange={(e) => onReplyChange(e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500 sm:text-sm"
              placeholder="Write your reply here..."
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={onResolve}
                disabled={isUpdatingStatus}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold min-h-[44px] text-green-700 transition-all hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle className="size-4" />
                {isUpdatingStatus ? 'Updating...' : 'Mark as Resolved'}
              </button>

              <button
                type="button"
                onClick={onSendReply}
                disabled={isSendingReply || !replyDraft.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold min-h-[44px] text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Send className="size-4" />
                {isSendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

type TicketComposerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  form: { subject: string; message: string };
  loading: boolean;
  formSuccess: boolean;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

const TicketComposerModal = React.memo(function TicketComposerModal({
  isOpen,
  onClose,
  form,
  loading,
  formSuccess,
  onSubjectChange,
  onMessageChange,
  onSubmit,
}: TicketComposerModalProps) {
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
                type="button"
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

                <h3 className="text-lg font-bold">Ticket Created</h3>
                <p className="text-sm text-gray-500">
                  Continue the conversation here once support replies.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                    Subject
                  </label>

                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={form.subject}
                    onChange={(e) => onSubjectChange(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What is this regarding?"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                    Message
                  </label>

                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    maxLength={2000}
                    onChange={(e) => onMessageChange(e.target.value)}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tell us more about your concern..."
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                  This creates a new ticket. Future replies should continue in this
                  Messages page.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Send className="size-4" />
                  {loading ? 'Creating...' : 'Create Ticket'}
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
  const { sendSystemNotification } = useNotifications();
  const {
  tickets,
  fetchTickets,
  getMessagesByTicketId,
  fetchMessagesByTicketId,
  createTicket,
  sendTicketMessage,
  markTicketResolved,
  reopenTicket,
  markTicketRead,
} = useInquiries();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState(initialFormState);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isDesktop = useIsDesktop();
const isDetailVisible = isDesktop || showDetail;

  const [searchQuery, setSearchQuery] = useState('');
const [filterStatus, setFilterStatus] = useState<TicketFilterStatus>('all');
const [showFilterMenu, setShowFilterMenu] = useState(false);

  const userId = user?.id ?? '';

  const filterCounts = useMemo(() => {
  if (!userId) {
    return {
      all: 0,
      waiting_for_support: 0,
      waiting_for_customer: 0,
      resolved: 0,
    };
  }

  const userTickets = (tickets ?? []).filter(
    (ticket: SupportTicket) => ticket.userId === userId
  );

  return {
    all: userTickets.length,
    waiting_for_support: userTickets.filter(
      (ticket) => ticket.status === 'waiting_for_support'
    ).length,
    waiting_for_customer: userTickets.filter(
      (ticket) => ticket.status === 'waiting_for_customer'
    ).length,
    resolved: userTickets.filter(
      (ticket) => ticket.status === 'resolved'
    ).length,
  };
}, [tickets, userId]);

const sortedTickets = useMemo(() => {
  if (!userId) return [];

  const query = searchQuery.trim().toLowerCase();

  const userTickets = (tickets ?? []).filter(
    (ticket: SupportTicket) => ticket.userId === userId
  );

  const filtered = userTickets.filter((ticket) => {
    const matchesFilter =
      filterStatus === 'all' ? true : ticket.status === filterStatus;

    if (!matchesFilter) return false;
    if (!query) return true;

    const messages = getMessagesByTicketId(ticket.id);
    const preview = getMessagePreview(messages);

    const searchableText = [
      ticket.subject,
      ticket.publicId,
      ticket.id,
      ticket.status,
      preview,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });

  return [...filtered].sort(
    (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
  );
}, [tickets, userId, searchQuery, filterStatus, getMessagesByTicketId]);

  const selectedTicket = useMemo(
    () => sortedTickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [sortedTickets, selectedTicketId]
  );

  const selectedMessages = useMemo(
    () => (selectedTicket ? getMessagesByTicketId(selectedTicket.id) : []),
    [getMessagesByTicketId, selectedTicket]
  );

  useEffect(() => {
  if (!selectedTicket?.id) return;

  void fetchMessagesByTicketId(selectedTicket.id);
  void markTicketRead(selectedTicket.id, 'customer');
}, [fetchMessagesByTicketId, markTicketRead, selectedTicket?.id]);

  useEffect(() => {
    if (!user?.id) return;

    void fetchTickets(user.id);
  }, [fetchTickets, user?.id]);

  useEffect(() => {
  if (isDesktop) return;

  if (!selectedTicketId && sortedTickets.length > 0) {
    setSelectedTicketId(sortedTickets[0].id);
  }
}, [isDesktop, selectedTicketId, sortedTickets]);

  const currentReply = selectedTicket ? replyDrafts[selectedTicket.id] ?? '' : '';

  const openModal = useCallback(() => {
    setFormSuccess(false);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (loading) return;
    setIsModalOpen(false);
    if (!formSuccess) {
      setNewTicketForm(initialFormState);
    }
  }, [loading, formSuccess]);

  const selectTicket = useCallback((id: string) => {
  setSelectedTicketId(id);
  if (!isDesktop) setShowDetail(true);
}, [isDesktop]);

  const deselectTicket = useCallback(() => {
  setSelectedTicketId(null);
  setShowDetail(false);
}, []);

  const handleFilterChange = useCallback((status: TicketFilterStatus) => {
  setFilterStatus(status);
}, []);

const handleFilterSelectFromSheet = useCallback((status: TicketFilterStatus) => {
  setFilterStatus(status);
  setShowFilterMenu(false);
}, []);

  const handleSubjectChange = useCallback((value: string) => {
    setNewTicketForm((prev) => ({ ...prev, subject: value }));
  }, []);

  const handleMessageChange = useCallback((value: string) => {
    setNewTicketForm((prev) => ({ ...prev, message: value }));
  }, []);

  const handleReplyChange = useCallback((ticketId: string, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [ticketId]: value,
    }));
  }, []);

  const handleNewTicketSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const subject = newTicketForm.subject.trim();
      const message = newTicketForm.message.trim();

      if (!user || !subject || !message || loading) return;

      setLoading(true);

      try {
        const newTicket = await createTicket({
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
          'Support Ticket Created',
          `We've received your ticket: "${subject}".`
        );

        setSelectedTicketId(newTicket.id);
        setShowDetail(true);
        setFormSuccess(true);

        window.setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(false);
          setNewTicketForm(initialFormState);
        }, 1600);
      } finally {
        setLoading(false);
      }
    },
    [
      createTicket,
      loading,
      newTicketForm.message,
      newTicketForm.subject,
      sendSystemNotification,
      user,
    ]
  );

  const handleSendReply = useCallback(async () => {
  if (!selectedTicket || !user || isSendingReply) return;

  const reply = currentReply.trim();
  if (!reply) return;

  setIsSendingReply(true);

  try {
    await sendTicketMessage(selectedTicket.id, {
      body: reply,
      senderType: 'customer',
      senderUserId: user.id,
      senderName:
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null,
      senderEmail: user.email ?? null,
    });

    setReplyDrafts((prev) => ({
      ...prev,
      [selectedTicket.id]: '',
    }));

    sendSystemNotification(
      user.id,
      'Reply Sent',
      `Your reply to "${selectedTicket.subject}" has been sent.`
    );
  } finally {
    setIsSendingReply(false);
  }
}, [
  currentReply,
  isSendingReply,
  selectedTicket,
  sendSystemNotification,
  sendTicketMessage,
  user,
]);

  const handleResolve = useCallback(async () => {
    if (!selectedTicket || isUpdatingStatus) return;

    setIsUpdatingStatus(true);

    try {
      await markTicketResolved(selectedTicket.id);

      if (user?.id) {
        sendSystemNotification(
          user.id,
          'Ticket Resolved',
          `You marked "${selectedTicket.subject}" as resolved.`
        );
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [isUpdatingStatus, markTicketResolved, selectedTicket, sendSystemNotification, user]);

  const handleReopen = useCallback(async () => {
    if (!selectedTicket || isUpdatingStatus) return;

    setIsUpdatingStatus(true);

    try {
      await reopenTicket(selectedTicket.id);

      if (user?.id) {
        sendSystemNotification(
          user.id,
          'Ticket Reopened',
          `You reopened "${selectedTicket.subject}".`
        );
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [isUpdatingStatus, reopenTicket, selectedTicket, sendSystemNotification, user]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex items-end justify-between gap-4">
          <header>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Messages
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track your support tickets and continue the conversation here.
            </p>
          </header>

          <button
            type="button"
            onClick={openModal}
            className="hidden items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 md:inline-flex"
          >
            <PlusCircle className="size-5" />
            New Ticket
          </button>
        </div>

        {filterCounts.all === 0 ? (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
  >
    <EmptyState
      icon={<Mail className="size-10 text-blue-500" />}
      title="No messages yet"
      description="Need help? Start a support ticket and continue the conversation here."
    />
  </motion.div>
) : (
  <>
    <div className="flex w-full flex-col gap-3">
      <div className="flex w-full items-stretch gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            maxLength={100}
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(normalizeLowercaseText(e.target.value))
            }
            className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilterMenu(true)}
          aria-label="Open ticket filters"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 md:hidden"
        >
          <Filter className="size-4" />
        </button>
      </div>

      <TicketFilterTabs
        filter={filterStatus}
        counts={filterCounts}
        onChange={handleFilterChange}
      />
    </div>

    {sortedTickets.length === 0 ? (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <EmptyState
          icon={<Search className="size-10 text-blue-500" />}
          title="No matching tickets"
          description={
            searchQuery.trim()
              ? `No ${
                  filterStatus === 'all'
                    ? ''
                    : `${getTicketStatusStyle(filterStatus).label.toLowerCase()} `
                }tickets matched "${searchQuery.trim()}".`
              : filterStatus === 'all'
              ? 'No tickets matched your search.'
              : `No ${getTicketStatusStyle(filterStatus).label.toLowerCase()} tickets found.`
          }
        />
      </motion.div>
    ) : (
      <div className="relative flex flex-1 gap-6 overflow-hidden">
        <div
          className={`custom-scrollbar w-full flex-col gap-3 overflow-y-auto pb-24 md:w-1/3 md:pb-0 ${
            isDetailVisible && !isDesktop ? 'hidden' : 'flex'
          }`}
        >
          {sortedTickets.map((ticket) => (
            <TicketListItem
              key={ticket.id}
              ticket={ticket}
              messages={getMessagesByTicketId(ticket.id)}
              isSelected={selectedTicketId === ticket.id}
              onSelect={selectTicket}
            />
          ))}
        </div>

        <div
          className={`
            ${isDetailVisible ? 'flex' : 'hidden'}
            flex-1
            flex-col
            bg-white
            md:flex
            md:relative
            md:bg-transparent
          `}
        >
          {!isDesktop ? (
  <div className="fixed inset-0 z-[60] bg-white flex flex-col">
    <AnimatePresence mode="wait">
      {selectedTicket ? (
        <TicketDetail
          key={selectedTicket.id}
          ticket={selectedTicket}
          messages={selectedMessages}
          currentUserId={userId}
          replyDraft={currentReply}
          isSendingReply={isSendingReply}
          isUpdatingStatus={isUpdatingStatus}
          onReplyChange={(value) => handleReplyChange(selectedTicket.id, value)}
          onSendReply={handleSendReply}
          onResolve={handleResolve}
          onReopen={handleReopen}
          onBack={deselectTicket}
          onClose={deselectTicket}
        />
      ) : null}
    </AnimatePresence>
  </div>
) : (
  <AnimatePresence mode="wait">
    {selectedTicket ? (
      <TicketDetail
        key={selectedTicket.id}
        ticket={selectedTicket}
        messages={selectedMessages}
        currentUserId={userId}
        replyDraft={currentReply}
        isSendingReply={isSendingReply}
        isUpdatingStatus={isUpdatingStatus}
        onReplyChange={(value) => handleReplyChange(selectedTicket.id, value)}
        onSendReply={handleSendReply}
        onResolve={handleResolve}
        onReopen={handleReopen}
        onBack={deselectTicket}
        onClose={deselectTicket}
      />
    ) : (
      <div className="hidden flex-1 flex-col items-center justify-center rounded-[32px] border border-gray-100 bg-white p-12 text-center lg:flex">
        <div className="mb-4 rounded-full bg-gray-50 p-6">
          <MessageSquare className="size-10 text-gray-300" />
        </div>

        <h3 className="font-bold text-gray-900">Your conversation</h3>

        <p className="mt-1 text-sm text-gray-500">
          Select a ticket from the list to view the full conversation history.
        </p>
      </div>
    )}
  </AnimatePresence>
)}
        </div>
      </div>
    )}
  </>
)}

        <button
          type="button"
          onClick={openModal}
          className="fixed bottom-5 right-5 z-50 flex size-14 sm:size-16 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 md:hidden"
        >
          <PlusCircle className="size-8" />
        </button>
        <TicketFilterBottomSheet
          isOpen={showFilterMenu}
          filter={filterStatus}
          counts={filterCounts}
          onClose={() => setShowFilterMenu(false)}
          onSelect={handleFilterSelectFromSheet}
        />

        <TicketComposerModal
          isOpen={isModalOpen}
          onClose={closeModal}
          form={newTicketForm}
          loading={loading}
          formSuccess={formSuccess}
          onSubjectChange={handleSubjectChange}
          onMessageChange={handleMessageChange}
          onSubmit={handleNewTicketSubmit}
        />
      </div>
    </div>
  );
}