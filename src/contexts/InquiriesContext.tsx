import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';

export type SupportTicketStatus =
  | 'waiting_for_support'
  | 'waiting_for_customer'
  | 'resolved';

export type SupportSenderType = 'customer' | 'support' | 'guest';

export type SupportTicket = {
  id: string;
  publicId?: string | null;
  userId?: string | null;
  guestEmail?: string | null;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  subject: string;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessageBy: SupportSenderType;
  resolvedAt?: string | null;
  resolvedByUser: boolean;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  senderType: SupportSenderType;
  senderUserId?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  body: string;
  createdAt: string;
  isInternal: boolean;
};

type CreateTicketInput = {
  userId?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  subject: string;
  message: string;
  senderType?: SupportSenderType;
};

type SendTicketMessageInput = {
  body: string;
  senderType: SupportSenderType;
  senderUserId?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
};

interface InquiriesContextType {
  tickets: SupportTicket[];
  messages: SupportMessage[];
  refreshInquiries: () => Promise<void>;
  isLoadingTickets: boolean;
  isLoadingMessages: boolean;
  createTicket: (input: CreateTicketInput) => Promise<string>;
  sendTicketMessage: (ticketId: string, input: SendTicketMessageInput) => Promise<void>;
  markTicketResolved: (ticketId: string) => Promise<void>;
  reopenTicket: (ticketId: string) => Promise<void>;
  refreshSupport: () => Promise<void>;
  
  fetchMessagesByTicketId: (ticketId: string, force?: boolean) => Promise<SupportMessage[]>;
  getTicketsByUserId: (userId: string) => SupportTicket[];
  getMessagesByTicketId: (ticketId: string) => SupportMessage[];
  getTicketById: (ticketId: string) => SupportTicket | undefined;
}

const InquiriesContext = createContext<InquiriesContextType | undefined>(undefined);

function mapTicket(row: any): SupportTicket {
  return {
    id: row.ticket_id,
    publicId: row.public_id ?? null,
    userId: row.user_id ?? null,
    guestEmail: row.guest_email ?? null,
    guestFirstName: row.guest_first_name ?? null,
    guestLastName: row.guest_last_name ?? null,
    subject: row.subject ?? 'Untitled Ticket',
    status: row.status as SupportTicketStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at ?? row.created_at,
    lastMessageBy: (row.last_message_by ?? 'customer') as SupportSenderType,
    resolvedAt: row.resolved_at ?? null,
    resolvedByUser: Boolean(row.resolved_by_user),
  };
}

function mapMessage(row: any): SupportMessage {
  return {
    id: row.support_message_id,
    ticketId: row.ticket_id,
    senderType: row.sender_type as SupportSenderType,
    senderUserId: row.sender_user_id ?? null,
    senderName: row.sender_name ?? null,
    senderEmail: row.sender_email ?? null,
    body: row.body ?? '',
    createdAt: row.created_at,
    isInternal: Boolean(row.is_internal),
  };
}

function sortTicketsByLastMessageDesc(items: SupportTicket[]) {
  return [...items].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

function sortMessagesByCreatedAtAsc(items: SupportMessage[]) {
  return [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function InquiriesProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const loadedTicketIdsRef = useRef<Set<string>>(new Set());
  const loadingTicketIdsRef = useRef<Set<string>>(new Set());

  const refreshSupport = useCallback(async () => {
    setIsLoadingTickets(true);

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(
          [
            'ticket_id',
            'public_id',
            'user_id',
            'guest_email',
            'guest_first_name',
            'guest_last_name',
            'subject',
            'status',
            'created_at',
            'updated_at',
            'last_message_at',
            'last_message_by',
            'resolved_at',
            'resolved_by_user',
          ].join(', ')
        )
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      setTickets(sortTicketsByLastMessageDesc((data ?? []).map(mapTicket)));
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  const refreshInquiries = refreshSupport;

  useEffect(() => {
    void refreshSupport();
  }, [refreshSupport]);

  const fetchMessagesByTicketId = useCallback(
    async (ticketId: string, force = false): Promise<SupportMessage[]> => {
      if (!ticketId) return [];

      if (!force && loadedTicketIdsRef.current.has(ticketId)) {
        return sortMessagesByCreatedAtAsc(
          messages.filter((message) => message.ticketId === ticketId)
        );
      }

      if (loadingTicketIdsRef.current.has(ticketId)) {
        return sortMessagesByCreatedAtAsc(
          messages.filter((message) => message.ticketId === ticketId)
        );
      }

      loadingTicketIdsRef.current.add(ticketId);
      setIsLoadingMessages(true);

      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select(
            [
              'support_message_id',
              'ticket_id',
              'sender_type',
              'sender_user_id',
              'sender_name',
              'sender_email',
              'body',
              'created_at',
              'is_internal',
            ].join(', ')
          )
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const nextMessages = (data ?? []).map(mapMessage);

        setMessages((prev) => {
          const otherMessages = prev.filter((message) => message.ticketId !== ticketId);
          return [...otherMessages, ...nextMessages];
        });

        loadedTicketIdsRef.current.add(ticketId);

        return nextMessages;
      } finally {
        loadingTicketIdsRef.current.delete(ticketId);
        setIsLoadingMessages(loadingTicketIdsRef.current.size > 0);
      }
    },
    [messages]
  );

  const createTicket = useCallback(
  async (input: CreateTicketInput): Promise<string> => {
    const now = new Date().toISOString();

    const trimmedFirstName = input.firstName?.trim() || null;
    const trimmedLastName = input.lastName?.trim() || null;
    const trimmedEmail = input.email?.trim().toLowerCase() || null;
    const trimmedSubject = input.subject.trim();
    const trimmedMessage = input.message.trim();

    let resolvedUserId = input.userId ?? null;

    if (!resolvedUserId && trimmedEmail) {
      const { data: matchedUser, error: matchedUserError } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (matchedUserError) throw matchedUserError;

      resolvedUserId = matchedUser?.user_id ?? null;
    }

    const senderType: SupportSenderType =
      input.senderType ?? (resolvedUserId ? 'customer' : 'guest');

    const ticketPayload = {
      user_id: resolvedUserId,
      guest_email: resolvedUserId ? null : trimmedEmail,
      guest_first_name: resolvedUserId ? null : trimmedFirstName,
      guest_last_name: resolvedUserId ? null : trimmedLastName,
      subject: trimmedSubject,
      status:
        senderType === 'support'
          ? ('waiting_for_customer' as SupportTicketStatus)
          : ('waiting_for_support' as SupportTicketStatus),
      created_at: now,
      updated_at: now,
      last_message_at: now,
      last_message_by: senderType,
      resolved_at: null,
      resolved_by_user: false,
    };

    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .insert([ticketPayload])
      .select()
      .single();

    if (ticketError) throw ticketError;

    const messagePayload = {
      ticket_id: ticketData.ticket_id,
      sender_type: senderType,
      sender_user_id: senderType === 'support' ? null : resolvedUserId,
      sender_name:
        senderType === 'support'
          ? 'Support Team'
          : [trimmedFirstName, trimmedLastName].filter(Boolean).join(' ').trim() || null,
      sender_email: trimmedEmail,
      body: trimmedMessage,
      created_at: now,
      is_internal: false,
    };

    const { data: messageData, error: messageError } = await supabase
      .from('support_messages')
      .insert([messagePayload])
      .select()
      .single();

    if (messageError) throw messageError;

    const newTicket = mapTicket(ticketData);
    const newMessage = mapMessage(messageData);

    loadedTicketIdsRef.current.add(newTicket.id);

    setTickets((prev) => sortTicketsByLastMessageDesc([newTicket, ...prev]));
    setMessages((prev) => [...prev, newMessage]);

    return newTicket.id;
  },
  []
);

  const sendTicketMessage = useCallback(
    async (ticketId: string, input: SendTicketMessageInput): Promise<void> => {
      const now = new Date().toISOString();
      const trimmedBody = input.body.trim();

      const { data: messageData, error: messageError } = await supabase
        .from('support_messages')
        .insert([
          {
            ticket_id: ticketId,
            sender_type: input.senderType,
            sender_user_id: input.senderUserId ?? null,
            sender_name:
              input.senderType === 'support'
                ? input.senderName?.trim() || 'Support Team'
                : input.senderName?.trim() || null,
            sender_email: input.senderEmail?.trim() || null,
            body: trimmedBody,
            created_at: now,
            is_internal: false,
          },
        ])
        .select()
        .single();

      if (messageError) throw messageError;

      const nextStatus: SupportTicketStatus =
        input.senderType === 'support' ? 'waiting_for_customer' : 'waiting_for_support';

      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .update({
          status: nextStatus,
          updated_at: now,
          last_message_at: now,
          last_message_by: input.senderType,
          resolved_at: null,
          resolved_by_user: false,
        })
        .eq('ticket_id', ticketId)
        .select()
        .single();

      if (ticketError) throw ticketError;

      const newMessage = mapMessage(messageData);
      const updatedTicket = mapTicket(ticketData);

      loadedTicketIdsRef.current.add(ticketId);

      setMessages((prev) => [...prev, newMessage]);
      setTickets((prev) =>
        sortTicketsByLastMessageDesc(
          prev.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))
        )
      );
    },
    []
  );

  const markTicketResolved = useCallback(async (ticketId: string): Promise<void> => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status: 'resolved',
        updated_at: now,
        resolved_at: now,
        resolved_by_user: true,
      })
      .eq('ticket_id', ticketId)
      .select()
      .single();

    if (error) throw error;

    const updatedTicket = mapTicket(data);

    setTickets((prev) =>
      sortTicketsByLastMessageDesc(
        prev.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))
      )
    );
  }, []);

  const reopenTicket = useCallback(async (ticketId: string): Promise<void> => {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status: 'waiting_for_support',
        updated_at: now,
        resolved_at: null,
        resolved_by_user: false,
      })
      .eq('ticket_id', ticketId)
      .select()
      .single();

    if (error) throw error;

    const updatedTicket = mapTicket(data);

    setTickets((prev) =>
      sortTicketsByLastMessageDesc(
        prev.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))
      )
    );
  }, []);

  const getTicketsByUserId = useCallback(
    (userId: string) => tickets.filter((ticket) => ticket.userId === userId),
    [tickets]
  );

  const getMessagesByTicketId = useCallback(
    (ticketId: string) =>
      sortMessagesByCreatedAtAsc(
        messages.filter((message) => message.ticketId === ticketId)
      ),
    [messages]
  );

  const getTicketById = useCallback(
    (ticketId: string) => tickets.find((ticket) => ticket.id === ticketId),
    [tickets]
  );

  const value = useMemo(
  () => ({
    tickets,
    messages,
    isLoadingTickets,
    isLoadingMessages,
    createTicket,
    sendTicketMessage,
    markTicketResolved,
    reopenTicket,
    refreshSupport,
    refreshInquiries,
    fetchMessagesByTicketId,
    getTicketsByUserId,
    getMessagesByTicketId,
    getTicketById,
  }),
  [
    tickets,
    messages,
    isLoadingTickets,
    isLoadingMessages,
    createTicket,
    sendTicketMessage,
    markTicketResolved,
    reopenTicket,
    refreshSupport,
    refreshInquiries,
    fetchMessagesByTicketId,
    getTicketsByUserId,
    getMessagesByTicketId,
    getTicketById,
  ]
);

  return <InquiriesContext.Provider value={value}>{children}</InquiriesContext.Provider>;
}

export function useInquiries() {
  const context = useContext(InquiriesContext);

  if (!context) {
    throw new Error('useInquiries must be used within InquiriesProvider');
  }

  return context;
}