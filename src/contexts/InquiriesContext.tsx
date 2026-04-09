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

import {
  normalizeName,
  normalizeEmail,
  normalizeText,
} from '../utils/DataNormalization';

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
  lastReadAtCustomer?: string | null;
  lastReadAtSupport?: string | null;
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
  isLoadingTickets: boolean;
  fetchTickets: (userId?: string) => Promise<SupportTicket[]>;
  createTicket: (input: CreateTicketInput) => Promise<SupportTicket>;
  sendTicketMessage: (
    ticketId: string,
    input: SendTicketMessageInput
  ) => Promise<{ ticket: SupportTicket; message: SupportMessage }>;
  markTicketResolved: (ticketId: string) => Promise<SupportTicket>;
  reopenTicket: (ticketId: string) => Promise<SupportTicket>;
  markTicketRead: (
    ticketId: string,
    reader: 'customer' | 'support'
  ) => Promise<void>;
  fetchMessagesByTicketId: (
    ticketId: string,
    force?: boolean
  ) => Promise<SupportMessage[]>;
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

function pickLatestTimestamp(
  current?: string | null,
  incoming?: string | null
): string | null {
  return getTimestamp(current) >= getTimestamp(incoming)
    ? current ?? null
    : incoming ?? null;
}

function mapTicket(row: any): SupportTicket {
  return {
    id: row.ticket_id,
    publicId: row.public_id ?? null,
    userId: row.user_id ?? null,
    guestEmail: row.guest_email ? normalizeEmail(row.guest_email) : null,
    guestFirstName: row.guest_first_name ? normalizeName(row.guest_first_name) : null,
    guestLastName: row.guest_last_name ? normalizeName(row.guest_last_name) : null,
    subject: normalizeText(row.subject ?? 'Untitled Ticket'),
    status: row.status as SupportTicketStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at ?? row.created_at,
    lastMessageBy: (row.last_message_by ?? 'customer') as SupportSenderType,
    resolvedAt: row.resolved_at ?? null,
    resolvedByUser: Boolean(row.resolved_by_user),
    lastReadAtCustomer: row.last_read_at_customer ?? null,
    lastReadAtSupport: row.last_read_at_support ?? null,
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

function sortTicketsByLatest(items: SupportTicket[]) {
  return [...items].sort(
    (a, b) => getTimestamp(b.lastMessageAt) - getTimestamp(a.lastMessageAt)
  );
}

export function InquiriesProvider({ children }: { children: ReactNode }) {
  const [messagesByTicketId, setMessagesByTicketId] = useState<
    Record<string, SupportMessage[]>
  >({});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const loadedTicketIdsRef = useRef<Set<string>>(new Set());
  const loadingTicketIdsRef = useRef<Set<string>>(new Set());
  const messagesByTicketIdRef = useRef<Record<string, SupportMessage[]>>({});
  const ticketsRef = useRef<SupportTicket[]>([]);

  useEffect(() => {
    messagesByTicketIdRef.current = messagesByTicketId;
  }, [messagesByTicketId]);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  const fetchMessagesByTicketId = useCallback(
    async (ticketId: string, force = false): Promise<SupportMessage[]> => {
      if (!ticketId) return [];

      const cached = messagesByTicketIdRef.current[ticketId] ?? [];

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

        setMessagesByTicketId((prev) => {
          const existing = prev[ticketId] ?? [];

          if (
            existing.length === nextMessages.length &&
            existing.every((message, index) => message.id === nextMessages[index]?.id)
          ) {
            return prev;
          }

          return {
            ...prev,
            [ticketId]: nextMessages,
          };
        });
        loadedTicketIdsRef.current.add(ticketId);

        return nextMessages;
      } finally {
        loadingTicketIdsRef.current.delete(ticketId);
        setIsLoadingMessages(loadingTicketIdsRef.current.size > 0);
      }
    },
    []
  );

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
          resolved_by_user,
          last_read_at_customer,
          last_read_at_support
        `)
        .order('last_message_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const nextTickets = sortTicketsByLatest((data ?? []).map(mapTicket));
      setTickets(nextTickets);

      return nextTickets;
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  const hydrateTicketMessages = useCallback((ticketId: string, nextMessages: SupportMessage[]) => {
  setMessagesByTicketId((prev) => {
    const existing = prev[ticketId] ?? [];

    if (
      existing.length === nextMessages.length &&
      existing.every((message, index) => message.id === nextMessages[index]?.id)
    ) {
      return prev;
    }

    return {
      ...prev,
      [ticketId]: sortMessagesByCreatedAtAsc(nextMessages),
    };
  });

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

  const normalizedFirstName = input.firstName
    ? normalizeName(input.firstName)
    : null;
  const normalizedLastName = input.lastName
    ? normalizeName(input.lastName)
    : null;
  const normalizedEmail = input.email
    ? normalizeEmail(input.email)
    : null;
  const normalizedSubject = normalizeText(input.subject);
  const cleanedMessage = input.message.replace(/\r\n/g, '\n').trim();

  if (!normalizedSubject || !cleanedMessage) {
    throw new Error('Subject and first message are required.');
  }

let resolvedUserId = input.userId ?? null;
let resolvedFirstName = normalizedFirstName;
let resolvedLastName = normalizedLastName;
let resolvedEmail = normalizedEmail;

if (!resolvedUserId && normalizedEmail) {
  const { data: matchedUser, error: matchedUserError } = await supabase
    .from('users')
    .select('user_id, first_name, last_name, email')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (matchedUserError) {
    throw matchedUserError;
  }

  if (matchedUser?.user_id) {
    resolvedUserId = matchedUser.user_id;
    resolvedFirstName = matchedUser.first_name
      ? normalizeName(matchedUser.first_name)
      : resolvedFirstName;
    resolvedLastName = matchedUser.last_name
      ? normalizeName(matchedUser.last_name)
      : resolvedLastName;
    resolvedEmail = matchedUser.email
      ? normalizeEmail(matchedUser.email)
      : resolvedEmail;
  }
}

const senderType: SupportSenderType =
  input.senderType ?? (resolvedUserId ? 'customer' : 'guest');

  const ticketPayload = {
  user_id: resolvedUserId,
  guest_email: resolvedUserId ? null : resolvedEmail,
  guest_first_name: resolvedUserId ? null : resolvedFirstName,
  guest_last_name: resolvedUserId ? null : resolvedLastName,
    subject: normalizedSubject,
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
    last_read_at_customer: senderType === 'customer' ? now : null,
    last_read_at_support: senderType === 'support' ? now : null,
  };

    const { error: ticketError } = await supabase
    .from('support_tickets')
    .insert([ticketPayload]);

  if (ticketError) throw ticketError;

  const { data: latestTicketData, error: latestTicketError } = await supabase
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
      resolved_by_user,
      last_read_at_customer,
      last_read_at_support
    `)
    .eq('created_at', now)
    .eq('subject', normalizedSubject)
    .maybeSingle();

  if (latestTicketError || !latestTicketData) {
    throw latestTicketError ?? new Error('Ticket created, but could not load it.');
  }

  const newTicket = mapTicket(latestTicketData);

  const displayName =
  senderType === 'support'
    ? 'Support Team'
    : [resolvedFirstName, resolvedLastName].filter(Boolean).join(' ').trim() || null;

  const { data: messageData, error: messageError } = await supabase
    .from('support_messages')
    .insert([
      {
        ticket_id: newTicket.id,
        sender_type: senderType,
        sender_user_id: resolvedUserId,
        sender_name: displayName,
        sender_email: resolvedEmail,
        body: cleanedMessage,
        created_at: now,
        is_internal: false,
      },
    ])
    .select()
    .single();

  if (messageError) {
    await supabase.from('support_tickets').delete().eq('ticket_id', newTicket.id);
    throw messageError;
  }

  const newMessage = mapMessage(messageData);

  setTickets((prev) => {
    if (prev.some((ticket) => ticket.id === newTicket.id)) return prev;
    return sortTicketsByLatest([newTicket, ...prev]);
  });

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
    const cleanedBody = input.body.replace(/\r\n/g, '\n').trim();

    if (!cleanedBody) {
      throw new Error('Message body is required.');
    }

    const normalizedSenderName = input.senderName
      ? normalizeName(input.senderName)
      : null;

    const normalizedSenderEmail = input.senderEmail
      ? normalizeEmail(input.senderEmail)
      : null;

    const { data: messageData, error: messageError } = await supabase
      .from('support_messages')
      .insert([
        {
          ticket_id: ticketId,
          sender_type: input.senderType,
          sender_user_id: input.senderUserId ?? null,
          sender_name:
            input.senderType === 'support'
              ? normalizedSenderName || 'Support Team'
              : normalizedSenderName,
          sender_email: normalizedSenderEmail,
          body: cleanedBody,
          created_at: now,
          is_internal: false,
        },
      ])
      .select()
      .single();

    if (messageError) throw messageError;

    const nextStatus: SupportTicketStatus =
      input.senderType === 'support' ? 'waiting_for_customer' : 'waiting_for_support';

    const ticketUpdate =
      input.senderType === 'support'
        ? {
            status: nextStatus,
            updated_at: now,
            last_message_at: now,
            last_message_by: input.senderType,
            resolved_at: null,
            resolved_by_user: false,
            last_read_at_support: now,
          }
        : {
            status: nextStatus,
            updated_at: now,
            last_message_at: now,
            last_message_by: input.senderType,
            resolved_at: null,
            resolved_by_user: false,
            last_read_at_customer: now,
          };

    const { data: ticketData, error: ticketError } = await supabase
      .from('support_tickets')
      .update(ticketUpdate)
      .eq('ticket_id', ticketId)
      .select()
      .single();

    if (ticketError) throw ticketError;

    const newMessage = mapMessage(messageData);
    const updatedTicket = mapTicket(ticketData);

    setTickets((prev) =>
      sortTicketsByLatest(
        prev.map((ticket) => {
          if (ticket.id !== ticketId) return ticket;

          return {
            ...updatedTicket,
            lastReadAtCustomer: pickLatestTimestamp(
              ticket.lastReadAtCustomer,
              updatedTicket.lastReadAtCustomer
            ),
            lastReadAtSupport: pickLatestTimestamp(
              ticket.lastReadAtSupport,
              updatedTicket.lastReadAtSupport
            ),
          };
        })
      )
    );

    loadedTicketIdsRef.current.add(ticketId);

    setMessagesByTicketId((prev) => {
      const existing = prev[ticketId] ?? [];

      if (existing.some((message) => message.id === newMessage.id)) {
        return prev;
      }

      const lastMessage = existing[existing.length - 1];

      if (!lastMessage || getTimestamp(lastMessage.createdAt) <= getTimestamp(newMessage.createdAt)) {
        return {
          ...prev,
          [ticketId]: [...existing, newMessage],
        };
      }

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
      sortTicketsByLatest(
        prev.map((ticket) => {
          if (ticket.id !== ticketId) return ticket;

          return {
            ...updatedTicket,
            lastReadAtCustomer: pickLatestTimestamp(
              ticket.lastReadAtCustomer,
              updatedTicket.lastReadAtCustomer
            ),
            lastReadAtSupport: pickLatestTimestamp(
              ticket.lastReadAtSupport,
              updatedTicket.lastReadAtSupport
            ),
          };
        })
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
      sortTicketsByLatest(
        prev.map((ticket) => {
          if (ticket.id !== ticketId) return ticket;

          return {
            ...updatedTicket,
            lastReadAtCustomer: pickLatestTimestamp(
              ticket.lastReadAtCustomer,
              updatedTicket.lastReadAtCustomer
            ),
            lastReadAtSupport: pickLatestTimestamp(
              ticket.lastReadAtSupport,
              updatedTicket.lastReadAtSupport
            ),
          };
        })
      )
    );

    return updatedTicket;
  }, []);

  const markTicketRead = useCallback(
  async (ticketId: string, reader: 'customer' | 'support'): Promise<void> => {
    if (!ticketId) return;

    const currentTicket = ticketsRef.current.find((ticket) => ticket.id === ticketId);
    if (!currentTicket) return;

    const ticketMessages = messagesByTicketIdRef.current[ticketId] ?? [];
    const latestMessageAt =
      ticketMessages.length > 0
        ? ticketMessages[ticketMessages.length - 1]?.createdAt ?? currentTicket.lastMessageAt
        : currentTicket.lastMessageAt;

    const existingReadAt =
      reader === 'customer'
        ? currentTicket.lastReadAtCustomer
        : currentTicket.lastReadAtSupport;

    if (getTimestamp(existingReadAt) >= getTimestamp(latestMessageAt)) {
      return;
    }

    const now = new Date().toISOString();
    const column =
      reader === 'customer' ? 'last_read_at_customer' : 'last_read_at_support';

    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id !== ticketId) return ticket;

        return {
          ...ticket,
          lastReadAtCustomer:
            reader === 'customer'
              ? pickLatestTimestamp(ticket.lastReadAtCustomer, now)
              : ticket.lastReadAtCustomer ?? null,
          lastReadAtSupport:
            reader === 'support'
              ? pickLatestTimestamp(ticket.lastReadAtSupport, now)
              : ticket.lastReadAtSupport ?? null,
        };
      })
    );

    const { error } = await supabase
      .from('support_tickets')
      .update({
        [column]: now,
        updated_at: now,
      })
      .eq('ticket_id', ticketId);

    if (error) {
      console.error('Failed to mark ticket as read:', error);
      await fetchTickets();
    }
  },
  [fetchTickets]
);

  const messages = useMemo(() => {
  const allMessages: SupportMessage[] = [];

  for (const ticketMessages of Object.values(messagesByTicketId)) {
    if (ticketMessages.length > 0) {
      allMessages.push(...ticketMessages);
    }
  }

  return allMessages;
}, [messagesByTicketId]);

  const getMessagesByTicketId = useCallback(
    (ticketId: string) => messagesByTicketId[ticketId] ?? [],
    [messagesByTicketId]
  );

  const value = useMemo<InquiriesContextType>(
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
      markTicketRead,
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
      markTicketRead,
      fetchMessagesByTicketId,
      getMessagesByTicketId,
      hydrateTicketMessages,
      clearTicketMessages,
    ]
  );

  useEffect(() => {
    const channel = supabase
      .channel('support-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          const event = payload.eventType;

          if (event === 'INSERT') {
            const newTicket = mapTicket(payload.new);

            setTickets((prev) => {
              if (prev.some((ticket) => ticket.id === newTicket.id)) {
                return prev;
              }

              return sortTicketsByLatest([newTicket, ...prev]);
            });

            return;
          }

          if (event === 'UPDATE') {
            const updatedTicket = mapTicket(payload.new);

            setTickets((prev) =>
              sortTicketsByLatest(
                prev.map((ticket) => {
                  if (ticket.id !== updatedTicket.id) return ticket;

                  return {
                    ...updatedTicket,
                    lastReadAtCustomer: pickLatestTimestamp(
                      ticket.lastReadAtCustomer,
                      updatedTicket.lastReadAtCustomer
                    ),
                    lastReadAtSupport: pickLatestTimestamp(
                      ticket.lastReadAtSupport,
                      updatedTicket.lastReadAtSupport
                    ),
                  };
                })
              )
            );

            return;
          }

          if (event === 'DELETE') {
            const deletedId = payload.old.ticket_id;

            setTickets((prev) => prev.filter((ticket) => ticket.id !== deletedId));
            setMessagesByTicketId((prev) => {
              const next = { ...prev };
              delete next[deletedId];
              return next;
            });
            loadedTicketIdsRef.current.delete(deletedId);
            loadingTicketIdsRef.current.delete(deletedId);
          }
        }
      )
      .on(
  'postgres_changes',
  {
    event: 'INSERT',
    schema: 'public',
    table: 'support_messages',
  },
  (payload) => {
    const newMessage = mapMessage(payload.new);
    const ticketId = newMessage.ticketId;

    setMessagesByTicketId((prev) => {
      const existing = prev[ticketId] ?? [];

      if (existing.some((message) => message.id === newMessage.id)) {
        return prev;
      }

      const lastMessage = existing[existing.length - 1];

      if (
        !lastMessage ||
        getTimestamp(lastMessage.createdAt) <= getTimestamp(newMessage.createdAt)
      ) {
        return {
          ...prev,
          [ticketId]: [...existing, newMessage],
        };
      }

      return {
        ...prev,
        [ticketId]: sortMessagesByCreatedAtAsc([...existing, newMessage]),
      };
    });

    loadedTicketIdsRef.current.add(ticketId);
  }
)
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('Support realtime status:', status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
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