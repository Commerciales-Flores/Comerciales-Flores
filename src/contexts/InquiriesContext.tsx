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
  isLoadingMessages: boolean;
  fetchTickets: (userId?: string) => Promise<SupportTicket[]>;
  createTicket: (input: CreateTicketInput) => Promise<SupportTicket>;
  sendTicketMessage: (
    ticketId: string,
    input: SendTicketMessageInput
  ) => Promise<{ ticket: SupportTicket; message: SupportMessage }>;
  markTicketResolved: (ticketId: string) => Promise<SupportTicket>;
  reopenTicket: (ticketId: string) => Promise<SupportTicket>;
  fetchMessagesByTicketId: (ticketId: string, force?: boolean) => Promise<SupportMessage[]>;
  getMessagesByTicketId: (ticketId: string) => SupportMessage[];
  hydrateTicketMessages: (ticketId: string, nextMessages: SupportMessage[]) => void;
  clearTicketMessages: (ticketId?: string) => void;
}

const InquiriesContext = createContext<InquiriesContextType | undefined>(undefined);

function getTimestamp(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

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

function sortMessagesByCreatedAtAsc(items: SupportMessage[]) {
  return [...items].sort(
    (a, b) => getTimestamp(a.createdAt) - getTimestamp(b.createdAt)
  );
}

export function InquiriesProvider({ children }: { children: ReactNode }) {
  const [messagesByTicketId, setMessagesByTicketId] = useState<
    Record<string, SupportMessage[]>
  >({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const loadedTicketIdsRef = useRef<Set<string>>(new Set());
  const loadingTicketIdsRef = useRef<Set<string>>(new Set());

  const fetchMessagesByTicketId = useCallback(
    async (ticketId: string, force = false): Promise<SupportMessage[]> => {
      if (!ticketId) return [];

      const cached = messagesByTicketId[ticketId] ?? [];

      if (!force && loadedTicketIdsRef.current.has(ticketId)) {
        return cached;
      }

      if (loadingTicketIdsRef.current.has(ticketId)) {
        return cached;
      }

      loadingTicketIdsRef.current.add(ticketId);
      setIsLoadingMessages(true);

      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select(`
            support_message_id,
            ticket_id,
            sender_type,
            sender_user_id,
            sender_name,
            sender_email,
            body,
            created_at,
            is_internal
          `)
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const nextMessages = sortMessagesByCreatedAtAsc((data ?? []).map(mapMessage));

        setMessagesByTicketId((prev) => ({
          ...prev,
          [ticketId]: nextMessages,
        }));

        loadedTicketIdsRef.current.add(ticketId);

        return nextMessages;
      } finally {
        loadingTicketIdsRef.current.delete(ticketId);
        setIsLoadingMessages(loadingTicketIdsRef.current.size > 0);
      }
    },
    [messagesByTicketId]
  );

  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  const fetchTickets = useCallback(async (userId?: string): Promise<SupportTicket[]> => {
  setIsLoadingTickets(true);

  try {
    let query = supabase
      .from('support_tickets')
      .select(`
        ticket_id,
        public_id,
        user_id,
        guest_email,
        guest_first_name,
        guest_last_name,
        subject,
        status,
        created_at,
        updated_at,
        last_message_at,
        last_message_by,
        resolved_at,
        resolved_by_user
      `)
      .order('last_message_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const nextTickets = (data ?? []).map(mapTicket).sort(
      (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
    );

    setTickets(nextTickets);

    return nextTickets;
  } finally {
    setIsLoadingTickets(false);
  }
}, []);

  const hydrateTicketMessages = useCallback((ticketId: string, nextMessages: SupportMessage[]) => {
    setMessagesByTicketId((prev) => ({
      ...prev,
      [ticketId]: sortMessagesByCreatedAtAsc(nextMessages),
    }));
    loadedTicketIdsRef.current.add(ticketId);
  }, []);

  const clearTicketMessages = useCallback((ticketId?: string) => {
    if (!ticketId) {
      setMessagesByTicketId({});
      loadedTicketIdsRef.current.clear();
      loadingTicketIdsRef.current.clear();
      setIsLoadingMessages(false);
      return;
    }

    setMessagesByTicketId((prev) => {
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });

    loadedTicketIdsRef.current.delete(ticketId);
    loadingTicketIdsRef.current.delete(ticketId);
  }, []);

  const createTicket = useCallback(async (input: CreateTicketInput): Promise<SupportTicket> => {
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

    setTickets((prev) =>
      [newTicket, ...prev].sort(
        (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
      )
    );

    setMessagesByTicketId((prev) => ({
      ...prev,
      [newTicket.id]: [newMessage],
    }));

    loadedTicketIdsRef.current.add(newTicket.id);

    return newTicket;
  }, []);

  const sendTicketMessage = useCallback(
    async (
      ticketId: string,
      input: SendTicketMessageInput
    ): Promise<{ ticket: SupportTicket; message: SupportMessage }> => {
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

      setTickets((prev) =>
        [...prev.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))].sort(
          (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
        )
      );

      loadedTicketIdsRef.current.add(ticketId);

      setMessagesByTicketId((prev) => {
        const existing = prev[ticketId] ?? [];
        return {
          ...prev,
          [ticketId]: sortMessagesByCreatedAtAsc([...existing, newMessage]),
        };
      });

      return {
        ticket: updatedTicket,
        message: newMessage,
      };
    },
    []
  );

  const markTicketResolved = useCallback(async (ticketId: string): Promise<SupportTicket> => {
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
    [...prev.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))].sort(
      (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
    )
  );

  return updatedTicket;
}, []);

  const reopenTicket = useCallback(async (ticketId: string): Promise<SupportTicket> => {
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
    [...prev.map((ticket) => (ticket.id === ticketId ? updatedTicket : ticket))].sort(
      (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
    )
  );

  return updatedTicket;
}, []);

  const getMessagesByTicketId = useCallback(
    (ticketId: string) => messagesByTicketId[ticketId] ?? [],
    [messagesByTicketId]
  );

  const messages = useMemo(() => {
    return sortMessagesByCreatedAtAsc(Object.values(messagesByTicketId).flat());
  }, [messagesByTicketId]);

  const value = useMemo(
    () => ({
      tickets,
      messages,
      isLoadingMessages,
      isLoadingTickets,
      fetchTickets,
      createTicket,
      sendTicketMessage,
      markTicketResolved,
      reopenTicket,
      fetchMessagesByTicketId,
      getMessagesByTicketId,
      hydrateTicketMessages,
      clearTicketMessages,
    }),
    [
      tickets,
      messages,
      isLoadingMessages,
      isLoadingTickets,
      fetchTickets,
      createTicket,
      sendTicketMessage,
      markTicketResolved,
      reopenTicket,
      fetchMessagesByTicketId,
      getMessagesByTicketId,
      hydrateTicketMessages,
      clearTicketMessages,
    ]
  );

  useEffect(() => {
  const channel = supabase
    .channel('support-realtime')

    // ✅ TICKETS (status changes, new tickets, etc.)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
      },
      async () => {
        try {
          const { data, error } = await supabase
            .from('support_tickets')
            .select(`
              ticket_id,
              public_id,
              user_id,
              guest_email,
              guest_first_name,
              guest_last_name,
              subject,
              status,
              created_at,
              updated_at,
              last_message_at,
              last_message_by,
              resolved_at,
              resolved_by_user
            `)
            .order('last_message_at', { ascending: false });

          if (error) throw error;

          const nextTickets = (data ?? []).map(mapTicket).sort(
            (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
          );

          setTickets(nextTickets);
        } catch (err) {
          console.error('Realtime tickets error:', err);
        }
      }
    )

    // ✅ MESSAGES (new replies)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
      },
      async (payload) => {
        try {
          const ticketId = (payload.new as any)?.ticket_id;
          if (!ticketId) return;

          const { data, error } = await supabase
            .from('support_messages')
            .select(`
              support_message_id,
              ticket_id,
              sender_type,
              sender_user_id,
              sender_name,
              sender_email,
              body,
              created_at,
              is_internal
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

          if (error) throw error;

          const nextMessages = sortMessagesByCreatedAtAsc(
            (data ?? []).map(mapMessage)
          );

          setMessagesByTicketId((prev) => ({
            ...prev,
            [ticketId]: nextMessages,
          }));

          loadedTicketIdsRef.current.add(ticketId);
        } catch (err) {
          console.error('Realtime messages error:', err);
        }
      }
    )

    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  return <InquiriesContext.Provider value={value}>{children}</InquiriesContext.Provider>;
}

export function useInquiries() {
  const context = useContext(InquiriesContext);

  if (!context) {
    throw new Error('useInquiries must be used within InquiriesProvider');
  }

  return context;
}