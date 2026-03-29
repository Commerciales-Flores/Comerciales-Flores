import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useUsers } from '../../contexts/UsersContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  useInquiries,
  type SupportMessage,
  type SupportTicket,
} from '../../contexts/InquiriesContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDate, formatDateTime } from '../../utils/date';
import EmptyState from '../../components/common/EmptyState';
import {
  Send,
  MessageSquare,
  Search,
  PlusCircle,
  ChevronLeft,
} from 'lucide-react';

const STATUS_STYLES = {
  waiting_for_support: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: 'Waiting for Support',
    shortLabel: 'Support',
  },
  waiting_for_customer: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    label: 'Waiting for Customer',
    shortLabel: 'Customer',
  },
  resolved: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    label: 'Resolved',
    shortLabel: 'Resolved',
  },
} as const;

type TicketStatusFilter =
  | 'all'
  | 'waiting_for_support'
  | 'waiting_for_customer'
  | 'resolved';

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getTicketStatusStyle(status?: string) {
  return (
    STATUS_STYLES[status as keyof typeof STATUS_STYLES] ??
    STATUS_STYLES.waiting_for_support
  );
}

function getInitials(firstName?: string, lastName?: string, email?: string) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim();
  if (initials) return initials.toUpperCase();
  return (email?.[0] ?? 'U').toUpperCase();
}

type AdminUserListItemProps = {
  user: any;
  isSelected: boolean;
  openTicketCount: number;
  onSelect: (userId: string) => void;
};

function AdminUserListItem({
  user,
  isSelected,
  openTicketCount,
  onSelect,
}: AdminUserListItemProps) {
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.email ||
    'Unknown User';

  return (
    <button
      type="button"
      onClick={() => onSelect(user.id)}
      className={`group w-full rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-blue-200 bg-blue-50 shadow-sm ring-2 ring-blue-500/10'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
            isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {getInitials(user.firstName, user.lastName, user.email)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`truncate text-sm font-semibold ${
                  isSelected ? 'text-blue-900' : 'text-gray-900'
                }`}
              >
                {fullName}
              </p>
              <p className="mt-1 truncate text-[11px] text-gray-500">
                {user.email || '—'}
              </p>
            </div>

            {openTicketCount > 0 && (
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {openTicketCount}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[10px] text-gray-400">
              {user.publicId ?? user.id}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
              <span className="size-1.5 rounded-full bg-green-500" />
              Active
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

type AdminTicketListItemProps = {
  ticket: SupportTicket;
  preview: string;
  messageCount: number;
  isSelected: boolean;
  onSelect: (ticketId: string) => void;
};

function AdminTicketListItem({
  ticket,
  preview,
  messageCount,
  isSelected,
  onSelect,
}: AdminTicketListItemProps) {
  const style = getTicketStatusStyle(ticket.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(ticket.id)}
      className={`group w-full rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? 'border-blue-200 bg-blue-50 shadow-sm ring-2 ring-blue-500/10'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {formatDate(ticket.lastMessageAt || ticket.createdAt)}
        </span>

        <div
          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${style.bg} ${style.text} ${style.border}`}
        >
          <span className={`size-1.5 rounded-full ${style.dot}`} />
          <span className="hidden sm:inline">{style.label}</span>
          <span className="sm:hidden">{style.shortLabel}</span>
        </div>
      </div>

      <h3
        className={`truncate text-sm font-semibold ${
          isSelected ? 'text-blue-900' : 'text-gray-900'
        }`}
      >
        {ticket.subject}
      </h3>

      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500">
        {preview || 'No messages yet'}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] text-gray-400">
          {ticket.publicId ?? `#${ticket.id.slice(-6).toUpperCase()}`}
        </span>
        <span className="text-[10px] text-gray-400">
          {messageCount} {messageCount === 1 ? 'message' : 'messages'}
        </span>
      </div>
    </button>
  );
}

type EmptyThreadStateProps = {
  selectedUser: any;
  draftSubject: string;
  draftMessage: string;
  isStartingTicket: boolean;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onStartConversation: () => void;
};

function EmptyThreadState({
  selectedUser,
  draftSubject,
  draftMessage,
  isStartingTicket,
  onSubjectChange,
  onMessageChange,
  onStartConversation,
}: EmptyThreadStateProps) {
  const fullName =
    [selectedUser?.firstName, selectedUser?.lastName].filter(Boolean).join(' ').trim() ||
    selectedUser?.email ||
    'this user';

  return (
    <div className="flex flex-1 flex-col p-5 md:p-6">
      <div className="w-full rounded-[2rem] border border-dashed border-gray-300 bg-gray-50/70 p-6 md:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3">
            <PlusCircle className="size-6 text-blue-500" />
          </div>
          <div>
            <p className="mt-1 text-sm font-semibold leading-relaxed">
              {fullName} can have a new support ticket created from here.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-left">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Subject
            </label>
            <input
              type="text"
              value={draftSubject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
              placeholder="What is this regarding?"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              First Message
            </label>
            <textarea
              rows={6}
              value={draftMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
              placeholder="Write your message to the customer."
            />
          </div>

          <button
            type="button"
            onClick={onStartConversation}
            disabled={!draftSubject.trim() || !draftMessage.trim() || isStartingTicket}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Send className="size-4" />
            {isStartingTicket ? 'Starting...' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageLoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={
          <div className="flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          </div>
        }
        title="Loading inquiries..."
        description="Please wait while support tickets and conversations are being retrieved."
      />
    </div>
  );
}

function ThreadLoadingState() {
  return (
    <EmptyState
      icon={
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      }
      title="Loading messages..."
      description="Please wait while the conversation thread is being retrieved."
    />
  );
}

function EmptyMessagesState() {
  return (
    <div className="flex h-full min-h-[280px] items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <MessageSquare className="mx-auto mb-3 size-10 text-gray-300" />
        <h3 className="text-base font-semibold text-gray-900">No messages yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          This ticket does not have any conversation messages yet.
        </p>
      </div>
    </div>
  );
}

type MessageBubbleProps = {
  message: SupportMessage;
};

function MessageBubble({ message }: MessageBubbleProps) {
  const isSupportMessage = message.senderType === 'support';

  return (
    <div className={`flex ${isSupportMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex max-w-[88%] gap-3 ${
          isSupportMessage ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        <div
          className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
            isSupportMessage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          {isSupportMessage ? 'S' : 'C'}
        </div>

        <div className={`flex flex-col ${isSupportMessage ? 'items-end' : 'items-start'}`}>
          <span
            className={`mb-1.5 text-[10px] font-bold uppercase ${
              isSupportMessage ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {isSupportMessage ? 'Support Team' : 'Customer'}
          </span>

          <div
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              isSupportMessage
                ? 'rounded-tr-md bg-blue-600 text-white shadow-blue-100'
                : 'rounded-tl-md border border-gray-200 bg-gray-50 text-gray-800'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.body}
            </p>
          </div>

          <span className="mt-1.5 text-[10px] text-gray-400">
            {formatDateTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminInquiries() {
  const location = useLocation();

  const { users, isLoadingUsers } = useUsers();
  const { user: adminUser } = useAuth();
  const {
    tickets,
    messages,
    createTicket,
    sendTicketMessage,
    reopenTicket,
    fetchMessagesByTicketId,
    refreshInquiries,
    isLoadingTickets,
    isLoadingMessages,
  } = useInquiries();
  const { sendInquiryResponseNotification } = useNotifications();

  const [pageLoading, setPageLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatusFilter>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [isComposingNewTicket, setIsComposingNewTicket] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isStartingTicket, setIsStartingTicket] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const debouncedSearch = useDebouncedValue(searchTerm, 250);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setPageLoading(true);

      try {
        await refreshInquiries();
      } catch (error) {
        console.error('Failed to refresh inquiries:', error);
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [location.key, refreshInquiries]);

  const activeUsers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    return (users ?? [])
      .filter((u: any) => u.isActive)
      .filter((u: any) => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        const searchable = [fullName, u.email, u.publicId]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return q === '' || searchable.includes(q);
      })
      .sort((a: any, b: any) => {
        const aName =
          [a.firstName, a.lastName].filter(Boolean).join(' ').trim() || a.email || '';
        const bName =
          [b.firstName, b.lastName].filter(Boolean).join(' ').trim() || b.email || '';

        return aName.localeCompare(bName);
      });
  }, [users, debouncedSearch]);

  const ticketCounts = useMemo(() => {
  if (!selectedUserId) {
    return {
      all: 0,
      waiting_for_support: 0,
      waiting_for_customer: 0,
      resolved: 0,
    };
  }

  const userTickets = tickets.filter(
    (ticket) => ticket.userId === selectedUserId
  );

  return userTickets.reduce(
    (acc, ticket) => {
      acc.all += 1;
      if (ticket.status in acc) {
        acc[ticket.status as TicketStatusFilter] += 1;
      }
      return acc;
    },
    {
      all: 0,
      waiting_for_support: 0,
      waiting_for_customer: 0,
      resolved: 0,
    } as Record<TicketStatusFilter, number>
  );
}, [tickets, selectedUserId]);

  const openTicketCountByUserId = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const ticket of tickets) {
      if (!ticket.userId || ticket.status === 'resolved') continue;
      counts[ticket.userId] = (counts[ticket.userId] ?? 0) + 1;
    }

    return counts;
  }, [tickets]);

  const messagesByTicketId = useMemo(() => {
    const grouped: Record<string, SupportMessage[]> = {};

    for (const message of messages) {
      if (!grouped[message.ticketId]) grouped[message.ticketId] = [];
      grouped[message.ticketId].push(message);
    }

    for (const ticketId of Object.keys(grouped)) {
      grouped[ticketId].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return grouped;
  }, [messages]);

  const ticketPreviewByTicketId = useMemo(() => {
    const previews: Record<string, string> = {};

    for (const ticket of tickets) {
      const ticketMessages = messagesByTicketId[ticket.id] ?? [];
      previews[ticket.id] = ticketMessages[ticketMessages.length - 1]?.body ?? '';
    }

    return previews;
  }, [tickets, messagesByTicketId]);

  const selectedUser = useMemo(
    () => activeUsers.find((u: any) => u.id === selectedUserId) ?? null,
    [activeUsers, selectedUserId]
  );

  const filteredTicketsForSelectedUser = useMemo(() => {
    if (!selectedUserId) return [];

    return tickets
      .filter((ticket) => ticket.userId === selectedUserId)
      .filter((ticket) => (filterStatus === 'all' ? true : ticket.status === filterStatus))
      .sort((a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt));
  }, [tickets, selectedUserId, filterStatus]);

  const selectedTicket = useMemo(
    () =>
      filteredTicketsForSelectedUser.find((ticket) => ticket.id === selectedTicketId) ??
      null,
    [filteredTicketsForSelectedUser, selectedTicketId]
  );

  const selectedTicketMessages = useMemo(
    () => (selectedTicket ? messagesByTicketId[selectedTicket.id] ?? [] : []),
    [messagesByTicketId, selectedTicket]
  );

  const currentReply = selectedTicket ? replyDrafts[selectedTicket.id] ?? '' : '';
  const isInitialInquiriesLoading = pageLoading || isLoadingTickets || isLoadingUsers;
  const hasNoUsers = !isInitialInquiriesLoading && activeUsers.length === 0;
  const hasNoTicketsForSelectedUser =
    !isInitialInquiriesLoading &&
    !!selectedUser &&
    filteredTicketsForSelectedUser.length === 0;

  useEffect(() => {
    if (isInitialInquiriesLoading) return;

    if (!selectedUserId && activeUsers.length > 0) {
      setSelectedUserId(activeUsers[0].id);
    }
  }, [activeUsers, isInitialInquiriesLoading, selectedUserId]);

  useEffect(() => {
    if (isInitialInquiriesLoading || !selectedUserId) return;

    const stillExists = activeUsers.some((u: any) => u.id === selectedUserId);
    if (!stillExists) {
      setSelectedUserId(activeUsers[0]?.id ?? null);
      setSelectedTicketId(null);
      setShowMobileThread(false);
      setIsComposingNewTicket(false);
    }
  }, [activeUsers, isInitialInquiriesLoading, selectedUserId]);

  useEffect(() => {
    if (isInitialInquiriesLoading) return;

    if (!selectedUserId) {
      setSelectedTicketId(null);
      setIsComposingNewTicket(false);
      return;
    }

    if (isComposingNewTicket) {
      setSelectedTicketId(null);
      return;
    }

    if (filteredTicketsForSelectedUser.length === 0) {
      setSelectedTicketId(null);
      return;
    }

    const stillVisible = filteredTicketsForSelectedUser.some(
      (ticket) => ticket.id === selectedTicketId
    );

    if (!stillVisible) {
      setSelectedTicketId(filteredTicketsForSelectedUser[0].id);
    }
  }, [
    filteredTicketsForSelectedUser,
    isComposingNewTicket,
    isInitialInquiriesLoading,
    selectedTicketId,
    selectedUserId,
  ]);

  useEffect(() => {
    if (selectedTicketId) {
      setShowMobileThread(true);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    if (!selectedTicket?.id) return;
    void fetchMessagesByTicketId(selectedTicket.id);
  }, [fetchMessagesByTicketId, selectedTicket?.id]);

  const openUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setSelectedTicketId(null);
    setIsComposingNewTicket(false);
    setShowMobileThread(false);
    setNewTicketSubject('');
    setNewTicketMessage('');
  }, []);

  const openTicket = useCallback((ticketId: string) => {
    setSelectedTicketId(ticketId);
    setIsComposingNewTicket(false);
    setShowMobileThread(true);
  }, []);

  const closeMobileThread = useCallback(() => {
    setShowMobileThread(false);
    setSelectedTicketId(null);
    setIsComposingNewTicket(false);
  }, []);

  const startNewTicket = useCallback(() => {
    setSelectedTicketId(null);
    setNewTicketSubject('');
    setNewTicketMessage('');
    setIsComposingNewTicket(true);
    setShowMobileThread(true);
  }, []);

  const cancelNewTicket = useCallback(() => {
    setIsComposingNewTicket(false);
    setNewTicketSubject('');
    setNewTicketMessage('');

    if (filteredTicketsForSelectedUser.length > 0) {
      setSelectedTicketId(filteredTicketsForSelectedUser[0].id);
      setShowMobileThread(true);
    } else {
      setSelectedTicketId(null);
      setShowMobileThread(false);
    }
  }, [filteredTicketsForSelectedUser]);

  const setDraftForTicket = useCallback((ticketId: string, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [ticketId]: value,
    }));
  }, []);

  const handleStartConversation = useCallback(async () => {
    if (!selectedUser || !adminUser || isStartingTicket) return;

    const subject = newTicketSubject.trim();
    const body = newTicketMessage.trim();

    if (!subject || !body) return;

    setIsStartingTicket(true);

    try {
      const ticketId = await createTicket({
        userId: selectedUser.id,
        firstName: selectedUser.firstName,
        lastName: selectedUser.lastName,
        email: selectedUser.email,
        subject,
        message: body,
        senderType: 'support',
      });

      if (selectedUser.id) {
        await sendInquiryResponseNotification({
          userId: selectedUser.id,
          subject,
        });
      }

      setNewTicketSubject('');
      setNewTicketMessage('');
      setIsComposingNewTicket(false);
      setSelectedTicketId(ticketId);
      setShowMobileThread(true);
    } catch (error) {
      console.error('Failed to start support conversation:', error);
    } finally {
      setIsStartingTicket(false);
    }
  }, [
    adminUser,
    createTicket,
    isStartingTicket,
    newTicketMessage,
    newTicketSubject,
    selectedUser,
    sendInquiryResponseNotification,
  ]);

  const handleSendReply = useCallback(async () => {
    if (!selectedTicket || !selectedUser || !adminUser || isSending || isLoadingMessages) {
      return;
    }

    const reply = currentReply.trim();
    if (!reply) return;

    setIsSending(true);

    try {
      if (selectedTicket.status === 'resolved') {
        await reopenTicket(selectedTicket.id);
      }

      await sendTicketMessage(selectedTicket.id, {
        body: reply,
        senderType: 'support',
        senderUserId: adminUser.id,
        senderName:
          [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ').trim() ||
          'Support Team',
        senderEmail: adminUser.email ?? null,
      });

      if (selectedUser.id) {
        await sendInquiryResponseNotification({
          userId: selectedUser.id,
          subject: selectedTicket.subject,
        });
      }

      setReplyDrafts((prev) => ({
        ...prev,
        [selectedTicket.id]: '',
      }));
    } catch (error) {
      console.error('Failed to send support reply:', error);
    } finally {
      setIsSending(false);
    }
  }, [
    adminUser,
    currentReply,
    isLoadingMessages,
    isSending,
    reopenTicket,
    selectedTicket,
    selectedUser,
    sendInquiryResponseNotification,
    sendTicketMessage,
  ]);

  const handleReopen = useCallback(async () => {
    if (!selectedTicket || isReopening) return;

    setIsReopening(true);

    try {
      await reopenTicket(selectedTicket.id);
    } catch (error) {
      console.error('Failed to reopen ticket:', error);
    } finally {
      setIsReopening(false);
    }
  }, [isReopening, reopenTicket, selectedTicket]);

  return (
  <div className="h-[calc(100vh-4rem)] min-h-[900px] bg-gray-50">
    <div className="flex h-full flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div
        className={`${
          showMobileThread ? 'hidden md:flex' : 'flex'
        } shrink-0 flex-col gap-4`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Support Center
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View active users, start conversations, and continue support threads.
            </p>
          </div>

          <div className="flex overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
            {(
              ['all', 'waiting_for_support', 'waiting_for_customer', 'resolved'] as const
            ).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all md:px-4 md:text-sm ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {status === 'all'
                  ? 'All'
                  : status === 'waiting_for_support'
                  ? 'Waiting for Support'
                  : status === 'waiting_for_customer'
                  ? 'Waiting for Customer'
                  : 'Resolved'}
                <span className="ml-2 opacity-70">({ticketCounts[status]})</span>
              </button>
            ))}
          </div>
        </div>

        {!isInitialInquiriesLoading && !hasNoUsers && (
          <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search active users by name, email, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
        {isInitialInquiriesLoading ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }
              title="Loading inquiries..."
              description="Please wait while support tickets and conversations are being retrieved."
            />
        ) : hasNoUsers ? (
            <EmptyState
              icon={<MessageSquare className="size-10 text-blue-500" />}
              title="No active users found"
              description="Active users will appear here once accounts become available."
            />
        ) : (
          <div className="grid h-full min-h-0 flex-1 grid-cols-[320px_minmax(0,360px)_minmax(0,1fr)] gap-4 p-4">
            <div
              className={`min-h-0 rounded-[2rem] border border-gray-200 bg-white shadow-sm ${
                showMobileThread ? 'hidden md:flex' : 'flex'
              } flex-col`}
            >
              <div className="border-b border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-900">Users</h2>
                <p className="mt-1 text-[11px] text-gray-500">
                  Select a customer to view support tickets.
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {activeUsers.map((user: any) => (
                  <AdminUserListItem
                    key={user.id}
                    user={user}
                    isSelected={user.id === selectedUserId}
                    openTicketCount={openTicketCountByUserId[user.id] ?? 0}
                    onSelect={openUser}
                  />
                ))}
              </div>
            </div>

            <div
              className={`min-h-0 rounded-[2rem] border border-gray-200 bg-white shadow-sm ${
                showMobileThread ? 'hidden md:flex' : 'flex'
              } flex-col`}
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Tickets</h2>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {selectedUser
                      ? `Support history for ${
                          [selectedUser.firstName, selectedUser.lastName]
                            .filter(Boolean)
                            .join(' ')
                            .trim() || selectedUser.email
                        }`
                      : 'Select a user first.'}
                  </p>
                </div>

                {selectedUser && (
                  <button
                    type="button"
                    onClick={startNewTicket}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                  >
                    New Ticket
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {!selectedUser ? null : hasNoTicketsForSelectedUser ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">No tickets yet</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        Start a new support conversation for this customer.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTicketsForSelectedUser.map((ticket) => (
                      <AdminTicketListItem
                        key={ticket.id}
                        ticket={ticket}
                        preview={ticketPreviewByTicketId[ticket.id] ?? ''}
                        messageCount={(messagesByTicketId[ticket.id] ?? []).length}
                        isSelected={ticket.id === selectedTicketId}
                        onSelect={openTicket}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`min-h-0 rounded-[2rem] border border-gray-200 bg-white shadow-sm ${
                showMobileThread ? 'flex' : 'hidden md:flex'
              } flex-col`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeMobileThread}
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 md:hidden"
                  >
                    <ChevronLeft className="size-5" />
                  </button>

                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      {isComposingNewTicket
                        ? 'Start Conversation'
                        : selectedTicket?.subject || 'Conversation'}
                    </h2>

                    <p className="mt-1 text-[11px] text-gray-500">
                      {isComposingNewTicket
                        ? selectedUser
                          ? `Starting a new conversation with ${
                              [selectedUser.firstName, selectedUser.lastName]
                                .filter(Boolean)
                                .join(' ')
                                .trim() || selectedUser.email
                            }`
                          : 'Create a new support conversation'
                        : selectedTicket
                        ? `Ticket ${
                            selectedTicket.publicId ?? `#${selectedTicket.id.slice(-6).toUpperCase()}`
                          } • ${
                            selectedTicket.status === 'resolved'
                              ? 'Resolved'
                              : selectedTicket.status === 'waiting_for_support'
                              ? 'Waiting for Support'
                              : 'Waiting for Customer'
                          }`
                        : 'No conversation selected'}
                    </p>
                  </div>
                </div>

                {!isComposingNewTicket && selectedTicket?.status === 'resolved' && (
                  <button
                    type="button"
                    onClick={handleReopen}
                    disabled={isReopening}
                    className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-70"
                  >
                    {isReopening ? 'Reopening...' : 'Reopen'}
                  </button>
                )}

                {isComposingNewTicket && (
                  <button
                    type="button"
                    onClick={cancelNewTicket}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {isComposingNewTicket ? (
                <EmptyThreadState
                  selectedUser={selectedUser}
                  draftSubject={newTicketSubject}
                  draftMessage={newTicketMessage}
                  isStartingTicket={isStartingTicket}
                  onSubjectChange={setNewTicketSubject}
                  onMessageChange={setNewTicketMessage}
                  onStartConversation={handleStartConversation}
                />
              ) : !selectedTicket ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Select a ticket
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Choose a support ticket to continue the conversation.
                    </p>
                  </div>
                </div>
              ) : isLoadingMessages ? (
                <div className="flex flex-1 p-5 md:p-6">
                  <ThreadLoadingState />
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 md:p-6">
                    {selectedTicketMessages.length === 0 ? (
                      <EmptyMessagesState />
                    ) : (
                      selectedTicketMessages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))
                    )}
                  </div>

                  <div className="border-t border-gray-100 p-5">
                    <div className="space-y-3">
                      <textarea
                        rows={4}
                        value={currentReply}
                        onChange={(e) =>
                          selectedTicket &&
                          setDraftForTicket(selectedTicket.id, e.target.value)
                        }
                        placeholder="Write your reply..."
                        disabled={isSending || isLoadingMessages}
                        className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSendReply}
                          disabled={!currentReply.trim() || isSending || isLoadingMessages}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Send className="size-4" />
                          {isSending ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}