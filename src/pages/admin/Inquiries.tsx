import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useUsers } from '../../contexts/UsersContext';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../supabaseClient';
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

type TicketSenderFilter = 'all' | 'customer' | 'guest' | 'support';
type ContactType = 'user' | 'guest';

type SupportContact = {
  id: string;
  type: ContactType;
  userId?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  publicId?: string | null;
  isActive: boolean;
  openTicketCount: number;
  unreadForSupportCount: number;
  latestTicketAt: string;
};

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

function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
) {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim();
  if (initials) return initials.toUpperCase();
  return (email?.[0] ?? 'U').toUpperCase();
}

type AdminContactListItemProps = {
  contact: SupportContact;
  isSelected: boolean;
  onSelect: (contactId: string) => void;
};

function AdminContactListItem({
  contact,
  isSelected,
  onSelect,
}: AdminContactListItemProps) {
  const fullName =
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    contact.email ||
    'Unknown Contact';

  const isGuest = contact.type === 'guest';

  return (
    <button
      type="button"
      onClick={() => onSelect(contact.id)}
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
          {getInitials(contact.firstName, contact.lastName, contact.email)}
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
                {contact.email || '—'}
              </p>
            </div>

            {contact.unreadForSupportCount > 0 && (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                {contact.unreadForSupportCount > 9 ? '9+' : contact.unreadForSupportCount}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {contact.publicId && (
              <span className="font-mono text-[10px] text-gray-400">
                {contact.publicId}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isGuest
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  isGuest ? 'bg-amber-500' : 'bg-green-500'
                }`}
              />
              {isGuest ? 'Guest' : 'Active'}
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
  selectedContact: SupportContact | null;
  draftSubject: string;
  draftMessage: string;
  isStartingTicket: boolean;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onStartConversation: () => void;
};

function EmptyThreadState({
  selectedContact,
  draftSubject,
  draftMessage,
  isStartingTicket,
  onSubjectChange,
  onMessageChange,
  onStartConversation,
}: EmptyThreadStateProps) {
  const fullName =
    [selectedContact?.firstName, selectedContact?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    selectedContact?.email ||
    'this contact';

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
  const senderLabel =
    message.senderType === 'support'
      ? 'Support Team'
      : message.senderType === 'guest'
      ? 'Guest'
      : 'Customer';

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
          {isSupportMessage ? 'S' : senderLabel[0]}
        </div>

        <div className={`flex flex-col ${isSupportMessage ? 'items-end' : 'items-start'}`}>
          <span
            className={`mb-1.5 text-[10px] font-bold uppercase ${
              isSupportMessage ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {senderLabel}
          </span>

          <div
            className={`rounded-2xl px-4 py-3 shadow-sm ${
              isSupportMessage
                ? 'rounded-tr-md bg-blue-600 text-white shadow-blue-100'
                : 'rounded-tl-md border border-gray-200 bg-gray-50 text-gray-800'
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>
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

  const { users, isLoadingUsers, refreshUsers } = useUsers();
  const { user: adminUser } = useAuth();
  const {
    tickets,
    messages,
    fetchTickets,
    createTicket,
    sendTicketMessage,
    reopenTicket,
    fetchMessagesByTicketId,
    markTicketRead,
    isLoadingMessages,
    isLoadingTickets,
  } = useInquiries();
  const { sendInquiryResponseNotification } = useNotifications();

  const [pageLoading, setPageLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TicketStatusFilter>('all');
  const [filterSenderType, setFilterSenderType] = useState<TicketSenderFilter>('all');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const [isComposingNewTicket, setIsComposingNewTicket] = useState(false);

  const [filterContactType, setFilterContactType] = useState<'all' | 'user' | 'guest'>('all');

  const { getMessagesByTicketId } = useInquiries();

  const [searchTerm, setSearchTerm] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isStartingTicket, setIsStartingTicket] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [sendReplyError, setSendReplyError] = useState('');

  const debouncedSearch = useDebouncedValue(searchTerm, 250);

  const normalizedTickets = useMemo(
    () =>
      tickets.map((ticket) => ({
        ...ticket,
        normalizedGuestEmail: ticket.guestEmail?.trim().toLowerCase() ?? '',
      })),
    [tickets]
  );

  const ticketIndex = useMemo(() => {
    const byUserId = new Map<string, SupportTicket[]>();
    const byGuestEmail = new Map<string, SupportTicket[]>();

    for (const ticket of normalizedTickets) {
      if (ticket.userId) {
        const existing = byUserId.get(ticket.userId) ?? [];
        existing.push(ticket);
        byUserId.set(ticket.userId, existing);
      } else if (ticket.normalizedGuestEmail) {
        const existing = byGuestEmail.get(ticket.normalizedGuestEmail) ?? [];
        existing.push(ticket);
        byGuestEmail.set(ticket.normalizedGuestEmail, existing);
      }
    }

    for (const list of byUserId.values()) {
      list.sort((a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt));
    }

    for (const list of byGuestEmail.values()) {
      list.sort((a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt));
    }

    return { byUserId, byGuestEmail };
  }, [normalizedTickets]);

  useEffect(() => {
  let cancelled = false;

  const loadPage = async () => {
    setPageLoading(true);

    try {
      await Promise.all([refreshUsers(true), fetchTickets()]);
    } catch (error) {
      console.error('Failed to load inquiries page data:', error);
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
}, [fetchTickets, location.key, refreshUsers]);

  useEffect(() => {
    setFilterSenderType('all');
  }, [selectedContactId]);

  useEffect(() => {
    setSendReplyError('');
  }, [selectedTicketId]);

  const contacts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const map = new Map<string, SupportContact>();

    const activeUserList = (users ?? []).filter((u: any) => u.isActive);

    for (const user of activeUserList) {
      const email = user.email?.trim().toLowerCase();
      if (!email) continue;

      const relatedByUserId = ticketIndex.byUserId.get(user.id) ?? [];
      const relatedGuestTickets = (ticketIndex.byGuestEmail.get(email) ?? []).filter(
        (ticket) => !ticket.userId
      );
      const relatedTickets = [...relatedByUserId, ...relatedGuestTickets].sort(
        (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
      );

      const openTicketCount = relatedTickets.filter(
        (ticket) => ticket.status !== 'resolved'
      ).length;

      const unreadForSupportCount = relatedTickets.filter((ticket) => {
        if (ticket.lastMessageBy !== 'customer' && ticket.lastMessageBy !== 'guest') {
          return false;
        }

        return getTimestamp(ticket.lastMessageAt) > getTimestamp(ticket.lastReadAtSupport);
      }).length;

      const latestTicketAt =
        relatedTickets[0]?.lastMessageAt ?? relatedTickets[0]?.createdAt ?? '';

      map.set(`user:${user.id}`, {
        id: `user:${user.id}`,
        type: 'user',
        userId: user.id,
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        publicId: user.publicId ?? user.id,
        isActive: true,
        openTicketCount,
        unreadForSupportCount,
        latestTicketAt,
      });
    }

    for (const [email, guestTickets] of ticketIndex.byGuestEmail.entries()) {
      const existingUserContact = Array.from(map.values()).find(
        (contact) => contact.type === 'user' && contact.email === email
      );

      if (existingUserContact) continue;

      const firstTicket = guestTickets[0];

      const unreadForSupportCount = guestTickets.filter((ticket) => {
      if (ticket.lastMessageBy !== 'customer' && ticket.lastMessageBy !== 'guest') {
        return false;
      }

      return getTimestamp(ticket.lastMessageAt) > getTimestamp(ticket.lastReadAtSupport);
    }).length;

    map.set(`guest:${email}`, {
      id: `guest:${email}`,
      type: 'guest',
      userId: null,
      email,
      firstName: firstTicket?.guestFirstName ?? null,
      lastName: firstTicket?.guestLastName ?? null,
      publicId: 'GUEST',
      isActive: true,
      openTicketCount: guestTickets.filter((ticket) => ticket.status !== 'resolved').length,
      unreadForSupportCount,
      latestTicketAt: firstTicket?.lastMessageAt ?? firstTicket?.createdAt ?? '',
    });
    }

    return Array.from(map.values())
      .filter((contact) => {
        const fullName = [contact.firstName, contact.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        const searchable = [fullName, contact.email, contact.publicId]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch = q === '' || searchable.includes(q);

        const matchesType =
          filterContactType === 'all' || contact.type === filterContactType;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const aTime = getTimestamp(a.latestTicketAt);
        const bTime = getTimestamp(b.latestTicketAt);

        if (aTime !== bTime) return bTime - aTime;

        const aName =
          [a.firstName, a.lastName].filter(Boolean).join(' ').trim() || a.email;
        const bName =
          [b.firstName, b.lastName].filter(Boolean).join(' ').trim() || b.email;

        return aName.localeCompare(bName);
      });
}, [users, ticketIndex, debouncedSearch, filterContactType]);


  const ticketPreviewByTicketId = useMemo(() => {
  const previews: Record<string, string> = {};

  for (const ticket of tickets) {
    const msgs = getMessagesByTicketId(ticket.id);
    previews[ticket.id] = msgs[msgs.length - 1]?.body ?? '';
  }

  return previews;
}, [tickets, getMessagesByTicketId]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  const ticketsForSelectedContact = useMemo(() => {
    if (!selectedContact) return [];

    const baseTickets =
      selectedContact.type === 'user'
        ? [
            ...(ticketIndex.byUserId.get(selectedContact.userId ?? '') ?? []),
            ...(ticketIndex.byGuestEmail.get(selectedContact.email) ?? []).filter(
              (ticket) => !ticket.userId
            ),
          ]
        : ticketIndex.byGuestEmail.get(selectedContact.email) ?? [];

    const senderFiltered = baseTickets.filter((ticket) =>
      filterSenderType === 'all' ? true : ticket.lastMessageBy === filterSenderType
    );

    return [...senderFiltered].sort(
      (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
    );
  }, [selectedContact, ticketIndex, filterSenderType]);

  const ticketCounts = useMemo(() => {
    return ticketsForSelectedContact.reduce(
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
  }, [ticketsForSelectedContact]);

  const filteredTicketsForSelectedContact = useMemo(() => {
    if (filterStatus === 'all') return ticketsForSelectedContact;
    return ticketsForSelectedContact.filter((ticket) => ticket.status === filterStatus);
  }, [ticketsForSelectedContact, filterStatus]);

  const selectedTicket = useMemo(
    () =>
      filteredTicketsForSelectedContact.find((ticket) => ticket.id === selectedTicketId) ??
      null,
    [filteredTicketsForSelectedContact, selectedTicketId]
  );

  const selectedTicketMessages = useMemo(
  () => (selectedTicket ? getMessagesByTicketId(selectedTicket.id) : []),
  [getMessagesByTicketId, selectedTicket]
);
  const currentReply = selectedTicket ? replyDrafts[selectedTicket.id] ?? '' : '';
  const isInitialInquiriesLoading = pageLoading || isLoadingTickets || isLoadingUsers;
  const trimmedSearch = debouncedSearch.trim();

const hasNoContacts =
  !isInitialInquiriesLoading && contacts.length === 0 && trimmedSearch.length === 0;

const hasNoSearchResults =
  !isInitialInquiriesLoading && contacts.length === 0 && trimmedSearch.length > 0;  
  const hasNoTicketsForSelectedContact =
    !isInitialInquiriesLoading &&
    !!selectedContact &&
    filteredTicketsForSelectedContact.length === 0;

  useEffect(() => {
    if (isInitialInquiriesLoading) return;

    if (!selectedContactId && contacts.length > 0) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, isInitialInquiriesLoading, selectedContactId]);

  useEffect(() => {
    if (isInitialInquiriesLoading || !selectedContactId) return;

    const stillExists = contacts.some((contact) => contact.id === selectedContactId);
    if (!stillExists) {
      setSelectedContactId(contacts[0]?.id ?? null);
      setSelectedTicketId(null);
      setShowMobileThread(false);
      setIsComposingNewTicket(false);
    }
  }, [contacts, isInitialInquiriesLoading, selectedContactId]);

  useEffect(() => {
    if (isInitialInquiriesLoading) return;

    if (!selectedContactId) {
      setSelectedTicketId(null);
      setIsComposingNewTicket(false);
      return;
    }

    if (isComposingNewTicket) {
      setSelectedTicketId(null);
      return;
    }

    if (filteredTicketsForSelectedContact.length === 0) {
      setSelectedTicketId(null);
      return;
    }

    const stillVisible = filteredTicketsForSelectedContact.some(
      (ticket) => ticket.id === selectedTicketId
    );

    if (!stillVisible) {
      setSelectedTicketId(filteredTicketsForSelectedContact[0].id);
    }
  }, [
    filteredTicketsForSelectedContact,
    isComposingNewTicket,
    isInitialInquiriesLoading,
    selectedTicketId,
    selectedContactId,
  ]);

  useEffect(() => {
    if (selectedTicketId) {
      setShowMobileThread(true);
    }
  }, [selectedTicketId]);

  useEffect(() => {
  if (!selectedTicket?.id) return;

  void fetchMessagesByTicketId(selectedTicket.id);
  void markTicketRead(selectedTicket.id, 'support');
}, [fetchMessagesByTicketId, markTicketRead, selectedTicket?.id]);

  const openContact = useCallback((contactId: string) => {
    setSelectedContactId(contactId);
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

    if (filteredTicketsForSelectedContact.length > 0) {
      setSelectedTicketId(filteredTicketsForSelectedContact[0].id);
      setShowMobileThread(true);
    } else {
      setSelectedTicketId(null);
      setShowMobileThread(false);
    }
  }, [filteredTicketsForSelectedContact]);

  const setDraftForTicket = useCallback((ticketId: string, value: string) => {
    setReplyDrafts((prev) => ({
      ...prev,
      [ticketId]: value,
    }));
  }, []);

  const handleStartConversation = useCallback(async () => {
  if (!selectedContact || selectedContact.type !== 'user' || !adminUser || isStartingTicket) {
    return;
  }

  const subject = newTicketSubject.trim();
  const body = newTicketMessage.trim();

  if (!subject || !body) return;

  setIsStartingTicket(true);

  try {
    const newTicket = await createTicket({
      userId: selectedContact.userId,
      firstName: selectedContact.firstName ?? undefined,
      lastName: selectedContact.lastName ?? undefined,
      email: selectedContact.email,
      subject,
      message: body,
      senderType: 'support',
    });

    if (selectedContact.userId) {
      await sendInquiryResponseNotification({
        userId: selectedContact.userId,
        subject,
      });
    }

    setNewTicketSubject('');
    setNewTicketMessage('');
    setIsComposingNewTicket(false);
    setSelectedTicketId(newTicket.id);
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
  selectedContact,
  sendInquiryResponseNotification,
]);

  const handleSendReply = useCallback(async () => {
  if (!selectedTicket || !adminUser || isSending || isLoadingMessages) {
    return;
  }

  const reply = currentReply.trim();
  if (!reply) return;

  setIsSending(true);
  setSendReplyError('');

  try {
    let activeTicket = selectedTicket;

    if (selectedTicket.status === 'resolved') {
      activeTicket = await reopenTicket(selectedTicket.id);
    }

    const isGuestTicket = !activeTicket.userId;

    if (isGuestTicket) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

      const accessToken = refreshed?.session?.access_token;

      if (refreshError || !accessToken) {
        throw new Error('Admin session expired. Please log out and log back in.');
      }

      const result = await supabase.functions.invoke('reply-to-support-ticket', {
        body: {
          ticketId: activeTicket.id,
          subject: `Re: ${activeTicket.subject}`,
          message: reply,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (result.error) {
        try {
          const response = (result.error as any).context as Response | undefined;
          const text = response ? await response.text() : '';
          throw new Error(text || result.error.message || 'Failed to send guest reply.');
        } catch (parseError) {
          throw parseError instanceof Error
            ? parseError
            : new Error(result.error.message || 'Failed to send guest reply.');
        }
      }

      await fetchTickets();
      await fetchMessagesByTicketId(activeTicket.id, true);
    } else {
      await sendTicketMessage(activeTicket.id, {
        body: reply,
        senderType: 'support',
        senderUserId: adminUser.id,
        senderName:
          [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ').trim() ||
          'Support Team',
        senderEmail: adminUser.email ?? null,
      });

      if (selectedContact?.type === 'user' && selectedContact.userId) {
        await sendInquiryResponseNotification({
          userId: selectedContact.userId,
          subject: activeTicket.subject,
        });
      }
    }

    setReplyDrafts((prev) => ({
      ...prev,
      [activeTicket.id]: '',
    }));
  } catch (error) {
    console.error('Failed to send support reply:', error);
    setSendReplyError(
      error instanceof Error
        ? error.message
        : 'Failed to send the reply. Please try again.'
    );
  } finally {
    setIsSending(false);
  }
}, [
  adminUser,
  currentReply,
  fetchMessagesByTicketId,
  fetchTickets,
  isLoadingMessages,
  isSending,
  reopenTicket,
  selectedContact,
  selectedTicket,
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
    <div className="h-[calc(100vh-4rem)] min-h-[900px] bg-white">
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
                View contacts, start conversations, and continue support threads.
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

          {!isInitialInquiriesLoading && (
            <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contacts by name, email, or ID..."
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
         ) : hasNoContacts ? (
          <EmptyState
            icon={<MessageSquare className="size-10 text-blue-500" />}
            title="No contacts found"
            description="Contacts with user accounts or guest ticket history will appear here."
          />
        ) : hasNoSearchResults ? (
          <EmptyState
            icon={<Search className="size-10 text-blue-500" />}
            title="No matching contacts found"
            description="Try adjusting your search term."
          />
        ) : (
            <div className="grid h-full min-h-0 flex-1 grid-cols-[320px_minmax(0,360px)_minmax(0,1fr)] gap-4 p-4">
              <div
                className={`min-h-0 rounded-[2rem] border border-gray-200 bg-white shadow-sm ${
                  showMobileThread ? 'hidden md:flex' : 'flex'
                } flex-col`}
              >
                <div className="border-b border-gray-100 p-5">
                  <h2 className="text-sm font-bold text-gray-900">Contacts</h2>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Select a contact to view support tickets and conversations.
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    {(['all', 'user', 'guest'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFilterContactType(type)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                          filterContactType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type === 'all' ? 'All' : type === 'user' ? 'Users' : 'Guests'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {contacts.map((contact) => (
                    <AdminContactListItem
                      key={contact.id}
                      contact={contact}
                      isSelected={contact.id === selectedContactId}
                      onSelect={openContact}
                    />
                  ))}
                </div>
              </div>

              <div
                className={`min-h-0 rounded-[2rem] border border-gray-200 bg-white shadow-sm ${
                  showMobileThread ? 'hidden md:flex' : 'flex'
                } flex-col`}
              >
                <div className="border-b border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Tickets</h2>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {selectedContact
                          ? `Support history for ${
                              [selectedContact.firstName, selectedContact.lastName]
                                .filter(Boolean)
                                .join(' ')
                                .trim() || selectedContact.email
                            }`
                          : 'Select a contact first.'}
                      </p>

                      {selectedContact?.type === 'guest' && (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
                          <p className="text-[11px] font-semibold text-amber-800">
                            Guest inquiries are one-time email conversations.
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                            Each new landing page inquiry creates a separate ticket for this guest.
                            Replies are sent by email and do not continue as in-app messaging.
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedContact?.type === 'user' && (
                      <div>
                        <button
                          type="button"
                          onClick={startNewTicket}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                        >
                          New Ticket
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <select
                      value={filterSenderType}
                      onChange={(e) =>
                        setFilterSenderType(e.target.value as TicketSenderFilter)
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="all">All Senders</option>
                      <option value="customer">Customer</option>
                      <option value="guest">Guest</option>
                      <option value="support">Support</option>
                    </select>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {!selectedContact ? null : hasNoTicketsForSelectedContact ? (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          No tickets yet
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {selectedContact.type === 'guest'
                            ? 'Each landing page inquiry from this guest creates a new ticket. Replies are handled via email.'
                            : 'Start a new support conversation for this customer.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTicketsForSelectedContact.map((ticket) => (
                        <AdminTicketListItem
                          key={ticket.id}
                          ticket={ticket}
                          preview={ticketPreviewByTicketId[ticket.id] ?? ''}
                          messageCount={getMessagesByTicketId(ticket.id).length}
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
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-gray-900">
                          {isComposingNewTicket
                            ? 'Start Conversation'
                            : selectedTicket?.subject || 'Conversation'}
                        </h2>

                        {!isComposingNewTicket && selectedContact?.type === 'guest' && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Guest Inquiry
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[11px] text-gray-500">
                        {isComposingNewTicket
                          ? selectedContact
                            ? `Starting a new conversation with ${
                                [selectedContact.firstName, selectedContact.lastName]
                                  .filter(Boolean)
                                  .join(' ')
                                  .trim() || selectedContact.email
                              }`
                            : 'Create a new support conversation'
                          : selectedTicket
                          ? `Ticket ${
                              selectedTicket.publicId ??
                              `#${selectedTicket.id.slice(-6).toUpperCase()}`
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
                    selectedContact={selectedContact}
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
                        {selectedContact?.type === 'guest' && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-800">
                              This reply will be sent to the guest’s email.
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-amber-700">
                              If the same guest submits another inquiry from the landing page, it
                              will appear as a new ticket under this contact.
                            </p>
                          </div>
                        )}

                        <textarea
                          rows={4}
                          value={currentReply}
                          onChange={(e) =>
                            selectedTicket &&
                            setDraftForTicket(selectedTicket.id, e.target.value)
                          }
                          placeholder={
                            selectedContact?.type === 'guest'
                              ? 'Write your email reply to this guest...'
                              : 'Write your reply...'
                          }
                          disabled={isSending || isLoadingMessages}
                          className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
                        />

                        {sendReplyError && (
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {sendReplyError}
                          </div>
                        )}

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