import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import supabase from '../supabaseClient';
import type { Inquiry, InquiryStatus } from '../data/types';

interface InquiriesContextType {
  inquiries: Inquiry[];
  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => Promise<string>;
  updateInquiry: (id: string, inquiry: Partial<Inquiry>) => Promise<void>;
  refreshInquiries: () => Promise<void>;
  getInquiriesByUserId: (userId: string) => Inquiry[];
}

const InquiriesContext = createContext<InquiriesContextType | undefined>(undefined);

export function InquiriesProvider({ children }: { children: ReactNode }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  const refreshInquiries = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(
        'message_id, user_id, first_name, last_name, email, subject, message, status, date, response, response_date'
      )
      .order('date', { ascending: false });

    if (!error && data) {
      setInquiries(
        data.map((row: any) => ({
          id: row.message_id,
          userId: row.user_id,
          firstName: row.first_name ?? '',
          lastName: row.last_name ?? '',
          email: row.email,
          subject: row.subject,
          message: row.message,
          status: row.status as InquiryStatus,
          date: row.date,
          response: row.response,
          responseDate: row.response_date,
        }))
      );
    }
  };

  useEffect(() => {
    refreshInquiries();
  }, []);

  const addInquiry = async (
    inquiryData: Omit<Inquiry, 'id' | 'date' | 'status'>
  ): Promise<string> => {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          user_id: inquiryData.userId || null,
          first_name: inquiryData.firstName,
          last_name: inquiryData.lastName,
          email: inquiryData.email,
          subject: inquiryData.subject,
          message: inquiryData.message,
          status: 'open',
          date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const newInquiry: Inquiry = {
      id: data.message_id,
      userId: data.user_id,
      firstName: data.first_name ?? '',
      lastName: data.last_name ?? '',
      email: data.email,
      subject: data.subject,
      message: data.message,
      status: data.status,
      date: data.date,
      response: data.response,
      responseDate: data.response_date,
    };

    setInquiries((prev) => [newInquiry, ...prev]);
    return newInquiry.id;
  };

  const updateInquiry = async (
    id: string,
    inquiry: Partial<Inquiry>
  ): Promise<void> => {
    const dbPayload: any = {};
    if (inquiry.status) dbPayload.status = inquiry.status;
    if (inquiry.response) dbPayload.response = inquiry.response;
    if (inquiry.responseDate) dbPayload.response_date = inquiry.responseDate;

    const { error } = await supabase
      .from('messages')
      .update(dbPayload)
      .eq('message_id', id);

    if (error) throw error;

    setInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...inquiry } : i))
    );
  };

  const value = useMemo(
    () => ({
      inquiries,
      addInquiry,
      updateInquiry,
      refreshInquiries,
      getInquiriesByUserId: (userId: string) =>
        inquiries.filter((i) => i.userId === userId),
    }),
    [inquiries]
  );

  return (
    <InquiriesContext.Provider value={value}>
      {children}
    </InquiriesContext.Provider>
  );
}

export function useInquiries() {
  const context = useContext(InquiriesContext);
  if (!context) throw new Error('useInquiries must be used within InquiriesProvider');
  return context;
}