import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import supabase from '../supabaseClient';
import { makePublicId } from '../utils/publicId';


// ─── Enums / Union Types ──────────────────────────────────────────────────────
export type UnitType = 'rental_space' | 'function_hall' | 'parking_slot';
export type ReservationStatus = 'pending' | 'approved' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'cheque' | 'gcash' | 'paymaya' | 'bank_transfer' | 'credit_card' | 'not_applicable';
export type PaymentCycle = 'monthly' | 'quarterly' | 'full';
export type InquiryStatus = 'open' | 'responded' | 'resolved'; 

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  type: UnitType;
  description: string;
  price: number;
  images: string[];
  policies: string;
  capacity?: number;
  available: boolean;
  features: string[];
  location: string;
  property?: {
    id: string;
    title: string;
    address: string;
  } | null;
}

export interface Reservation {
  id: string;
  publicId?: string;
  userId: string;
  unitId: string;
  unitName: string;
  unitType: UnitType;
  startDate: string;
  endDate: string;
  duration: number;
  totalAmount: number;
  status: ReservationStatus;
  notes?: string;
  paidAmount: number; 
  requestDate: string;
  paymentMethod?: PaymentMethod;
  paymentCycle?: PaymentCycle;
  businessType?: string;
  paymentIntent?: 'pay_onsite' | 'pay_later';
  eventPurpose?: string;
  attendees?: number;
  modeOfVisit: 'online' | 'onsite';
  vehicleType?: string;
  plateNumber?: string;
  durationType?: 'hours' | 'days' | 'months' | 'years'; 
  slotId?: string;
  slotName?: string;
  location?: string
}

export interface Payment {
  id: string;
  publicId?: string;
  reservationId: string; 
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  proofOfPayment?: string;
  date: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LedgerEntry {
  id: string; 
  userId: string;
  amount: number;
  date: string;
}

export interface AuditLog {
  id: string;
  publicId?: string; 
  userId: string;
  action: string;
  targetTable: string;
  targetId: string;
  beforeValue?: Record<string, any>;
  afterValue?: Record<string, any>;
  changedFields?: Record<string, any>;
  timestamp: string;
  notes?: string;
}

export interface User {
  id: string;
  publicId?: string;
  role: 'admin' | 'client' | 'customer';
  first_name: string;
  last_name: string;
  email: string;
  contactNumber?: string;
  address?: string;
  is_active?: boolean;
}

export interface Inquiry {
  id: string;
  userId?: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  date: string;
  response?: string;
  responseDate?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reservation' | 'payment' | 'inquiry' | 'system';
  read: boolean;
  date: string;
}

export interface BusinessSlot {
  id: string;
  unitId: string;
  unitName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
}

export interface ParkingSlot {
  id: string;
  name: string;
  imageUrl: string;
}

export interface ContentSettings {
  content_id?: string;
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    image: string;
    primaryCtaText: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaLink: string;
  };
  about: {
    eyebrow: string;
    title: string;
    text: string;
    cards: {
      title: string;
      text: string;
    }[];
  };
  history: {
    eyebrow: string;
    title: string;
    subtitle: string;
    text: string;
    image: string;
    images: string[];
    points: {
      title: string;
      text: string;
    }[];
  };
  featured: {
    title: string;
    subtitle: string;
    viewAllText: string;
    emptyTitle: string;
    emptyText: string;
  };
  contact: {
    title: string;
    subtitle: string;
    locationTitle: string;
    locationSubtitle: string;
    email: string;
    phone: string;
    address: string;
  };
  footer: {
    brandName: string;
    brandDescription: string;
    quickLinksTitle: string;
    contactTitle: string;
    copyright: string;
    privacyText: string;
  };
  menu: {
    title: string;
  };
  announcements: string[];
  policies: string;
  updated_at?: string;
}

// ─── Context Type ─────────────────────────────────────────────────────────────
interface DataContextType {
  users: User[];
  units: Unit[];
  reservations: Reservation[];
  payments: Payment[];
  ledgers: LedgerEntry[];
  auditLogs: AuditLog[];
  inquiries: Inquiry[];
  notifications: Notification[];
  businessSlots: BusinessSlot[];
  contentSettings: ContentSettings;
  parkingSlots: ParkingSlot[];

  addUnit: (unit: Omit<Unit, 'id'>) => Promise<void>;
  updateUnit: (id: string, unit: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;

  addReservation: (reservation: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>) => Promise<string>;
  updateReservation: (id: string, reservation: Partial<Reservation>) => Promise<void>;
  deleteReservation: (id: string) => void;

  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>) => Promise<string>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  
  uploadPaymentProof: (file: File) => Promise<string | null>;
  uploadUnitImage: (file: File) => Promise<string | null>;

  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<string>;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<string>;

  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => Promise<string>;
  updateInquiry: (id: string, inquiry: Partial<Inquiry>) => Promise<void>;

  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  addBusinessSlot: (slot: Omit<BusinessSlot, 'id'>) => void;
  updateBusinessSlot: (id: string, slot: Partial<BusinessSlot>) => void;
  deleteBusinessSlot: (id: string) => void;

  updateContentSettings: (settings: Partial<ContentSettings>) => Promise<void>;

  getUnitById: (id: string) => Unit | undefined;
  getReservationsByUserId: (userId: string) => Reservation[];
  getPaymentsByUserId: (userId: string) => Payment[];
  getNotificationsByUserId: (userId: string) => Notification[];
  getInquiriesByUserId: (userId: string) => Inquiry[];
  getUserById: (id: string) => User | undefined;
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const MOCK_PARKING_SLOTS: ParkingSlot[] = Array.from({ length: 10 }, (_, i) => ({
  id: `slot-${i + 1}`,
  name: `Slot ${i + 1}`,
  imageUrl: `https://placehold.co/400x300/e2e8f0/475569?text=Slot%20${i + 1}`,
}));

const DEFAULT_CONTENT: ContentSettings = {
  hero: {
    badge: 'Premium Spaces',
    title: '',
    subtitle: '',
    image: '',
    primaryCtaText: 'Get Started',
    primaryCtaLink: '/register',
    secondaryCtaText: 'Browse Collection',
    secondaryCtaLink: '#properties',
  },

  about: {
    eyebrow: 'Who We Are',
    title: 'About Us',
    text: '',
    cards: [
      {
        title: 'Flexible Spaces',
        text: 'Rental spaces designed for businesses, events, and evolving needs.',
      },
      {
        title: 'Prime Convenience',
        text: 'Accessible locations that make bookings easier for clients and guests.',
      },
      {
        title: 'Trusted Service',
        text: 'A smoother and more reliable way to manage reservations and inquiries.',
      },
    ],
  },

  history: {
    eyebrow: 'Our History',
    title: '',
    subtitle: '',
    text: '',
    image: '',
    images: [],
    points: [
      {
        title: 'The Beginning',
        text: 'A vision to create accessible and flexible commercial spaces.',
      },
      {
        title: 'Growth',
        text: 'Expanded to serve more clients, events, and rental needs.',
      },
      {
        title: 'Today',
        text: 'A trusted destination for business spaces and function venues.',
      },
    ],
  },

  featured: {
    title: 'Featured Spaces',
    subtitle: 'Experience our most premium locations.',
    viewAllText: 'View all Spaces',
    emptyTitle: 'No featured spaces yet',
    emptyText:
      'There are currently no available featured spaces to display. Please check back later.',
  },

  contact: {
    title: 'Send us a message',
    subtitle: 'We’ll get back to you as soon as possible.',
    locationTitle: 'Our Location',
    locationSubtitle: 'Visit us',
    email: '',
    phone: '',
    address: '',
  },

  footer: {
    brandName: 'Commerciales Flores',
    brandDescription:
      'Premium rental spaces and function halls for your business or event needs.',
    quickLinksTitle: 'Quick Links',
    contactTitle: 'Get in Touch',
    copyright: '© 2025 Commerciales Flores. All rights reserved.',
    privacyText: 'Compliant with the Philippine Data Privacy Act of 2012',
  },

  menu: {
    title: 'Menu',
  },

  announcements: [],
  policies: '',
};

// ─── Context & Provider ───────────────────────────────────────────────────────
const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]); 
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); 
  const [users, setUsers] = useState<User[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [businessSlots, _setBusinessSlots] = useState<BusinessSlot[]>([]);
  const [contentSettings, setContentSettings] = useState<ContentSettings>(DEFAULT_CONTENT);

  useEffect(() => {
    // Fetch all unified unit data
    const fetchAllUnits = async () => {
  try {
    const { data: baseUnits, error: baseError } = await supabase
      .from('units')
      .select('unit_id, property_id, unit_type, title, description, is_available, location');

    if (baseError) throw baseError;
    if (!baseUnits) return;

    const propertyIds = [...new Set(baseUnits.map((u) => u.property_id).filter(Boolean))];

    let propertiesData: any[] = [];

    if (propertyIds.length > 0) {
      const { data, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, address')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;
      propertiesData = data ?? [];
    }

    const propertiesMap = Object.fromEntries(propertiesData.map((p) => [p.id, p]));

    const [
      { data: rentalUnits },
      { data: functionUnits },
      { data: parkingUnits },
      { data: media },
    ] = await Promise.all([
      supabase.from('rental_units').select('unit_id, rental_price, features, policies, description'),
      supabase.from('function_units').select('unit_id, price_per_day, capacity, features, policies, description'),
      supabase.from('parking_units').select('unit_id, price_per_day, price_per_hour, features, policies, description'),
      supabase.from('media').select('unit_id, url, media_type'),
    ]);

    const combinedUnits: Unit[] = baseUnits.map((base) => {
      let specific: any = null;

      if (base.unit_type === 'rental_space') {
        specific = rentalUnits?.find((r) => r.unit_id === base.unit_id);
      } else if (base.unit_type === 'function_hall') {
        specific = functionUnits?.find((f) => f.unit_id === base.unit_id);
      } else if (base.unit_type === 'parking_slot') {
        specific = parkingUnits?.find((p) => p.unit_id === base.unit_id);
      }

      const unitMediaRecords = media?.filter((m) => m.unit_id === base.unit_id) || [];
      let imagesArray: string[] = [];

      unitMediaRecords.forEach((record) => {
        if (!record.url) return;

        const rawUrl = record.url;

        if (typeof rawUrl === 'string') {
          if (rawUrl.startsWith('http')) {
            imagesArray.push(rawUrl);
          } else {
            try {
              const parsed = JSON.parse(rawUrl);
              imagesArray.push(
                ...(Object.values(parsed).filter((v) => typeof v === 'string') as string[])
              );
            } catch {
              // ignore bad strings
            }
          }
        } else if (typeof rawUrl === 'object' && rawUrl !== null) {
          imagesArray.push(
            ...(Object.values(rawUrl).filter((v) => typeof v === 'string') as string[])
          );
        }
      });

      let parsedFeatures: string[] = [];
      if (Array.isArray(specific?.features)) {
        parsedFeatures = specific.features;
      } else if (typeof specific?.features === 'string') {
        parsedFeatures = specific.features
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const property = propertiesMap[base.property_id];

      return {
        id: base.unit_id,
        propertyId: base.property_id,
        name: base.title || '',
        type: base.unit_type as UnitType,
        description: base.description || specific?.description || '',
        price:
          base.unit_type === 'rental_space'
            ? Number(specific?.rental_price || 0)
            : base.unit_type === 'function_hall'
            ? Number(specific?.price_per_day || 0)
            : Number(specific?.price_per_day || specific?.price_per_hour || 0),
        images:
          imagesArray.length > 0
            ? imagesArray
            : ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
        policies: specific?.policies || '',
        available: base.is_available,
        features: parsedFeatures,
        location: base.location || '',
        property: property
          ? {
              id: property.id,
              title: property.title || '',
              address: property.address || '',
            }
          : null,
        ...(typeof specific?.capacity === 'number' ? { capacity: specific.capacity } : {}),
      };
    });

    setUnits(combinedUnits);
  } catch (error) {
    console.error('Error loading units from Supabase:', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    });
  }

};

    const fetchUsers = async () => {
    const { data, error } = await supabase
    .from('users')
    .select('user_id, public_id, role, first_name, last_name, email, phone, address, is_active');
    if (!error && data) {
      setUsers(data.map((row: any) => ({
        id: row.user_id,
        publicId: row.public_id,
        role: row.role,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        contactNumber: row.phone,
        address: row.address,
        is_active: row.is_active,
      })));
    }
  };

  

    const fetchReservations = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('reservation_id, public_id, user_id, unit_id, title, unit_type, start_date, end_date, duration, total_amount, status, notes, paid_amount, created_at, payment_method, payment_intent, mode_of_visit, details')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReservations(data.map((row: any) => ({
          id: row.reservation_id,
          publicId: row.public_id,
          userId: row.user_id,
          unitId: row.unit_id,
          unitName: row.title,
          unitType: row.unit_type,
          startDate: row.start_date,
          endDate: row.end_date,
          duration: row.duration,
          totalAmount: Number(row.total_amount),
          status: row.status as ReservationStatus,
          notes: row.notes,
          paidAmount: Number(row.paid_amount || 0), 
          requestDate: row.created_at,
          paymentMethod: row.payment_method,
          paymentIntent: row.payment_intent,
          modeOfVisit: row.mode_of_visit,
          paymentCycle: row.details?.paymentCycle,
          businessType: row.details?.businessType,
          eventPurpose: row.details?.eventPurpose,
          attendees: row.details?.attendees,
          slotId: row.details?.slotId,
          slotName: row.details?.slotName,
          vehicleType: row.details?.vehicleType,
          plateNumber: row.details?.plateNumber,
          durationType: row.details?.durationType,
        })));
      }
    };

    const fetchInquiries = async () => {
      const { data, error } = await supabase.from('messages')
.select('message_id, user_id, first_name, last_name, email, subject, message, status, date, response, response_date').order('date', { ascending: false });
      if (!error && data) {
        setInquiries(data.map((row: any) => ({
          id: row.message_id,
          userId: row.user_id,
          first_name: row.first_name ?? '',
          last_name: row.last_name ?? '',
          email: row.email,
          subject: row.subject,
          message: row.message,
          status: row.status as InquiryStatus,
          date: row.date,
          response: row.response,
          responseDate: row.response_date,
        })));
      }
    };
    
    const fetchNotifications = async () => {
      const { data, error } = await supabase.from('notifications')
.select('notification_id, user_id, title, message, type, is_read, date').order('date', { ascending: false });
      if (!error && data) {
        setNotifications(data.map((row: any) => ({
          id: row.notification_id,
          userId: row.user_id,
          title: row.title,
          message: row.message,
          type: row.type as any,
          read: row.is_read,
          date: row.date,
        })));
      }
    };

    const fetchPayments = async () => {
      const { data, error } = await supabase.from('payments')
.select('payment_id, public_id, reservation_id, user_id, amount, method, status, proofOfPayment, date, notes, created_at, updated_at').order('created_at', { ascending: false });
      if (!error && data) {
        setPayments(data.map((row: any) => ({
          id: row.payment_id,
          publicId: row.public_id,
          reservationId: row.reservation_id,
          userId: row.user_id,
          amount: Number(row.amount),
          method: row.method as PaymentMethod,
          status: row.status as PaymentStatus,
          proofOfPayment: row.proofOfPayment,
          date: row.date,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })));
      }
    };

    const fetchLedgers = async () => {
      const { data, error } = await supabase.from('ledger')
.select('ledger_id, user_id, amount, date').order('date', { ascending: false });
      if (!error && data) {
        setLedgers(data.map((row: any) => ({
          id: row.ledger_id,
          userId: row.user_id,
          amount: Number(row.amount),
          date: row.date
        })));
      }
    };

    const fetchAuditLogs = async () => {
      const { data, error } = await supabase.from('audit_log')
.select('audit_id, public_id, user_id, action, target_table, target_id, before_value, after_value, changed_fields, timestamp, notes').order('timestamp', { ascending: false });
      if (!error && data) {
        setAuditLogs(data.map((row: any) => ({
          id: row.audit_id,
          publicId: row.public_id,
          userId: row.user_id,
          action: row.action,
          targetTable: row.target_table,
          targetId: row.target_id,
          beforeValue: row.before_value,
          afterValue: row.after_value,
          changedFields: row.changed_fields,
          timestamp: row.timestamp,
          notes: row.notes
        })));
      }
    };

    const fetchContentSettings = async () => {
  const { data, error } = await supabase
    .from('site_content')
.select('content_id, hero, about, history, featured, contact, footer, menu, announcements, policies, updated_at')
    .limit(1)
    .single();

  if (!error && data) {
    setContentSettings({
      content_id: data.content_id,

      hero: {
        badge: data.hero?.badge || 'Premium Spaces',
        title: data.hero?.title || '',
        subtitle: data.hero?.subtitle || '',
        image: data.hero?.image || '',
        primaryCtaText: data.hero?.primaryCtaText || 'Get Started',
        primaryCtaLink: data.hero?.primaryCtaLink || '/register',
        secondaryCtaText: data.hero?.secondaryCtaText || 'Browse Collection',
        secondaryCtaLink: data.hero?.secondaryCtaLink || '#properties',
      },

      about: {
        eyebrow: data.about?.eyebrow || 'Who We Are',
        title: data.about?.title || 'About Us',
        text: data.about?.text || '',
        cards:
          Array.isArray(data.about?.cards) && data.about.cards.length > 0
            ? data.about.cards
            : [
                {
                  title: 'Flexible Spaces',
                  text: 'Rental spaces designed for businesses, events, and evolving needs.',
                },
                {
                  title: 'Prime Convenience',
                  text: 'Accessible locations that make bookings easier for clients and guests.',
                },
                {
                  title: 'Trusted Service',
                  text: 'A smoother and more reliable way to manage reservations and inquiries.',
                },
              ],
      },

      history: {
        eyebrow: data.history?.eyebrow || 'Our History',
        title: data.history?.title || '',
        subtitle: data.history?.subtitle || '',
        text: data.history?.text || '',
        image: data.history?.image || '',
        images: Array.isArray(data.history?.images) ? data.history.images : [],
        points:
          Array.isArray(data.history?.points) && data.history.points.length > 0
            ? data.history.points
            : [
                {
                  title: 'The Beginning',
                  text: 'A vision to create accessible and flexible commercial spaces.',
                },
                {
                  title: 'Growth',
                  text: 'Expanded to serve more clients, events, and rental needs.',
                },
                {
                  title: 'Today',
                  text: 'A trusted destination for business spaces and function venues.',
                },
              ],
      },

      featured: {
        title: data.featured?.title || 'Featured Spaces',
        subtitle:
          data.featured?.subtitle || 'Experience our most premium locations.',
        viewAllText: data.featured?.viewAllText || 'View all Spaces',
        emptyTitle: data.featured?.emptyTitle || 'No featured spaces yet',
        emptyText:
          data.featured?.emptyText ||
          'There are currently no available featured spaces to display. Please check back later.',
      },

      contact: {
        title: data.contact?.title || 'Send us a message',
        subtitle:
          data.contact?.subtitle || 'We’ll get back to you as soon as possible.',
        locationTitle: data.contact?.locationTitle || 'Our Location',
        locationSubtitle: data.contact?.locationSubtitle || 'Visit us',
        email: data.contact?.email || '',
        phone: data.contact?.phone || '',
        address: data.contact?.address || '',
      },

      footer: {
        brandName: data.footer?.brandName || 'Commerciales Flores',
        brandDescription:
          data.footer?.brandDescription ||
          'Premium rental spaces and function halls for your business or event needs.',
        quickLinksTitle: data.footer?.quickLinksTitle || 'Quick Links',
        contactTitle: data.footer?.contactTitle || 'Get in Touch',
        copyright:
          data.footer?.copyright ||
          '© 2025 Commerciales Flores. All rights reserved.',
        privacyText:
          data.footer?.privacyText ||
          'Compliant with the Philippine Data Privacy Act of 2012',
      },

      menu: {
        title: data.menu?.title || 'Menu',
      },

      announcements: Array.isArray(data.announcements) ? data.announcements : [],
      policies: data.policies || '',
      updated_at: data.updated_at,
    });
  }
};

    fetchAllUnits();
    fetchUsers();
    fetchReservations();
    fetchInquiries();
    fetchNotifications();
    fetchPayments();
    fetchLedgers();
    fetchAuditLogs();
    fetchContentSettings();
  }, []);

  // ── Storage ─────────────────────────────────────────────────────────────────
  const uploadPaymentProof = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading proof:", error);
      return null;
    }
  };

  const uploadUnitImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `units/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('unit_images') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('unit_images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading unit image:", error);
      return null;
    }
  };

  // ── Units ──────────────────────────────────────────────────────────────────
  const addUnit = async (unitData: Omit<Unit, 'id'>): Promise<void> => {
    try {
      const { data: baseUnit, error: baseError } = await supabase
        .from('units')
        .insert([{
          property_id: unitData.propertyId,
          unit_type: unitData.type,
          title: unitData.name,
          description: unitData.description,
          is_available: unitData.available,
          location: unitData.location,
        }])
        .select()
        .single();

      if (baseError) throw baseError;
      const newUnitId = baseUnit.unit_id;

      const specificData: any = {
        unit_id: newUnitId,
      };

      if (unitData.type === 'rental_space') {
        specificData.rental_price = unitData.price;
      }
      if (unitData.type === 'function_hall') {
        specificData.price_per_day = unitData.price;
        if (unitData.capacity !== undefined) specificData.capacity = unitData.capacity;
      }
      if (unitData.type === 'parking_slot') {
        specificData.price_per_day = unitData.price;
      }

      let tableError = null;

      // ✅ FIX: Determine which of the 3 sub-tables to save into based on type
      let targetTable = '';
      if (unitData.type === 'rental_space') targetTable = 'rental_units';
      else if (unitData.type === 'function_hall') targetTable = 'function_units';
      else if (unitData.type === 'parking_slot') targetTable = 'parking_units';

      if (targetTable) {
        const { error } = await supabase.from(targetTable).insert([specificData]);
        tableError = error;
      }

      if (tableError) {
        console.error(`Sub-table insert failed for ${targetTable}, rolling back base unit...`, tableError);
        await supabase.from('units').delete().eq('unit_id', newUnitId);
        throw tableError;
      }

      if (unitData.images && unitData.images.length > 0) {
        const jsonbUrls = unitData.images.reduce((acc, url, index) => {
          acc[`image_${index + 1}`] = url;
          return acc;
        }, {} as Record<string, string>);
        
        const { error: mediaError } = await supabase.from('media').insert([{
          unit_id: newUnitId,
          url: jsonbUrls, 
          media_type: 'image'
        }]);
        
        if (mediaError) console.error("Media insert failed, but unit was saved:", mediaError);
      }

      setUnits(prev => [...prev, { ...unitData, id: newUnitId }]);
    } catch (error) {
      console.error("Error adding unit:", error);
      throw error;
    }
  };

  const updateUnit = async (id: string, unitUpdate: Partial<Unit>): Promise<void> => {
    try {
      const existingUnit = units.find(u => u.id === id);
      if (!existingUnit) return;

      const basePayload: any = {};
      if (unitUpdate.name !== undefined) basePayload.title = unitUpdate.name;
      if (unitUpdate.description !== undefined) basePayload.description = unitUpdate.description;
      if (unitUpdate.available !== undefined) basePayload.is_available = unitUpdate.available;
      if (unitUpdate.location !== undefined) basePayload.location = unitUpdate.location;

      if (Object.keys(basePayload).length > 0) {
        const { error } = await supabase.from('units').update(basePayload).eq('unit_id', id);
        if (error) throw error;
      }

      const specificPayload: any = {};

      if (existingUnit.type === 'rental_space') {
        if (unitUpdate.price !== undefined) specificPayload.rental_price = unitUpdate.price;
        // add these only if your Unit type supports them
        if ((unitUpdate as any).size !== undefined) specificPayload.size = (unitUpdate as any).size;
        if ((unitUpdate as any).amenities !== undefined) specificPayload.amenities = (unitUpdate as any).amenities;
      }

      if (existingUnit.type === 'function_hall') {
        if (unitUpdate.price !== undefined) specificPayload.price_per_day = unitUpdate.price;
        if (unitUpdate.capacity !== undefined) specificPayload.capacity = unitUpdate.capacity;
      }

      if (existingUnit.type === 'parking_slot') {
        // choose whichever pricing model you want your UI to edit
        if (unitUpdate.price !== undefined) specificPayload.price_per_day = unitUpdate.price;
        if ((unitUpdate as any).pricePerHour !== undefined) specificPayload.price_per_hour = (unitUpdate as any).pricePerHour;
        if ((unitUpdate as any).dimensions !== undefined) specificPayload.dimensions = (unitUpdate as any).dimensions;
      }

      if (Object.keys(specificPayload).length > 0) {
        // ✅ FIX: Determine which of the 3 sub-tables to update
        let tableName = '';
        if (existingUnit.type === 'rental_space') tableName = 'rental_units';
        else if (existingUnit.type === 'function_hall') tableName = 'function_units';
        else if (existingUnit.type === 'parking_slot') tableName = 'parking_units';
        
        if (tableName) {
          const { error } = await supabase.from(tableName).update(specificPayload).eq('unit_id', id);
          if (error) throw error;
        }
      }

      if (unitUpdate.images !== undefined) {
        await supabase.from('media').delete().eq('unit_id', id);
        
        if (unitUpdate.images.length > 0) {
          const jsonbUrls = unitUpdate.images.reduce((acc, url, index) => {
            acc[`image_${index + 1}`] = url;
            return acc;
          }, {} as Record<string, string>);

          await supabase.from('media').insert([{
            unit_id: id,
            url: jsonbUrls, 
            media_type: 'image'
          }]);
        }
      }

      setUnits(prev => prev.map(u => (u.id === id ? { ...u, ...unitUpdate } : u)));
    } catch (error) {
      console.error("Error updating unit:", error);
      throw error;
    }
  };

  const deleteUnit = async (id: string): Promise<void> => {
    try {
      const existingUnit = units.find(u => u.id === id);
      if (!existingUnit) return;

      await supabase.from('media').delete().eq('unit_id', id);
      
      // ✅ FIX: Determine which of the 3 sub-tables to delete from
      let tableName = '';
      if (existingUnit.type === 'rental_space') tableName = 'rental_units';
      else if (existingUnit.type === 'function_hall') tableName = 'function_units';
      else if (existingUnit.type === 'parking_slot') tableName = 'parking_units';
                      
      if (tableName) {
        await supabase.from(tableName).delete().eq('unit_id', id);
      }

      const { error } = await supabase.from('units').delete().eq('unit_id', id);
      if (error) throw error;

      setUnits(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error("Error deleting unit:", error);
      throw error;
    }
  };

  const addReservation = async (reservationData: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>): Promise<string> => {
    try {
      const details = {
        paymentCycle: reservationData.paymentCycle,
        businessType: reservationData.businessType,
        eventPurpose: reservationData.eventPurpose,
        attendees: reservationData.attendees,
        slotId: reservationData.slotId,
        slotName: reservationData.slotName,
        vehicleType: reservationData.vehicleType,
        plateNumber: reservationData.plateNumber,
        durationType: reservationData.durationType,
      };

      const cleanDetails = Object.fromEntries(Object.entries(details).filter(([_, v]) => v !== undefined));

      const { data, error } = await supabase
        .from('reservations')
        .insert([{
          user_id: reservationData.userId,
          unit_id: reservationData.unitId,
          title: reservationData.unitName,
          unit_type: reservationData.unitType,
          start_date: reservationData.startDate,
          end_date: reservationData.endDate,
          duration: reservationData.duration,
          total_amount: reservationData.totalAmount,
          status: 'pending',
          payment_method: reservationData.paymentMethod,
          payment_intent: reservationData.paymentIntent,
          mode_of_visit: reservationData.modeOfVisit,
          notes: reservationData.notes,
          details: cleanDetails
        }])
        .select() 
        .single();

        const publicId = makePublicId("RSV", { uuid: data.reservation_id });

        await supabase
          .from('reservations')
          .update({ public_id: publicId })
          .eq('reservation_id', data.reservation_id);

      if (error) throw error;

      const newReservation: Reservation = {
        id: data.reservation_id,
        publicId, 
        userId: data.user_id,
        unitId: data.unit_id,
        unitName: data.title,
        unitType: data.unit_type as UnitType,
        startDate: data.start_date,
        endDate: data.end_date,
        duration: data.duration,
        totalAmount: Number(data.total_amount), 
        status: data.status as ReservationStatus,
        notes: data.notes,
        paidAmount: Number(data.paid_amount || 0),
        requestDate: data.created_at, 
        paymentMethod: data.payment_method as any,
        paymentIntent: data.payment_intent as any,
        modeOfVisit: data.mode_of_visit as any,
        ...cleanDetails
      };

      setReservations(prev => [newReservation, ...prev]);
      return newReservation.id;
    } catch (error) {
      console.error("Error inserting reservation:", error);
      throw error; 
    }
  };

  const updateReservation = async (id: string, reservation: Partial<Reservation>): Promise<void> => {
    try {
      const dbPayload: any = {};
      if (reservation.status) dbPayload.status = reservation.status;
      if (reservation.paidAmount !== undefined) dbPayload.paid_amount = reservation.paidAmount;

      const { error } = await supabase
        .from('reservations')
        .update(dbPayload)
        .eq('reservation_id', id);

      if (error) throw error;

      setReservations(prev => prev.map(b => (b.id === id ? { ...b, ...reservation } : b)));
    } catch (error) {
      console.error("Error updating reservation:", error);
      throw error;
    }
  };

  const deleteReservation = (id: string) => { setReservations(prev => prev.filter(b => b.id !== id)); };

  // ── Payments (WITH AUTO AUDIT, LEDGER, & RESERVATION SYNC) ─────────────────────────
  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>): Promise<string> => {
    try {
      const paymentDate = new Date().toISOString(); 
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          user_id: paymentData.userId,
          reservation_id: paymentData.reservationId,
          amount: paymentData.amount,
          method: paymentData.method,
          status: paymentData.status,
          proofOfPayment: paymentData.proofOfPayment,
          date: paymentDate, 
          notes: paymentData.notes
        }])
        .select()
        .single();

        const publicId = makePublicId("PAY", { uuid: data.payment_id });

        await supabase
          .from('payments')
          .update({ public_id: publicId })
          .eq('payment_id', data.payment_id);

      if (error) throw error;

      const newPayment: Payment = {
        id: data.payment_id,
        publicId,
        reservationId: data.reservation_id,
        userId: data.user_id,
        amount: Number(data.amount),
        method: data.method as PaymentMethod,
        status: data.status as PaymentStatus,
        proofOfPayment: data.proofOfPayment,
        date: data.date,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      addAuditLog({
        userId: newPayment.userId,
        action: 'INSERT',
        targetTable: 'payments',
        targetId: newPayment.id,
        afterValue: newPayment,
        notes: `Created new payment for reservation ${newPayment.reservationId}`
      }).catch(err => console.error("Failed to write audit log:", err));

      if (newPayment.status === 'paid') {
        addLedgerEntry({
          userId: newPayment.userId,
          amount: newPayment.amount,
          date: newPayment.date
        }).catch(err => console.error("Failed to write ledger entry:", err));

        const reservation = reservations.find(b => b.id === newPayment.reservationId);
        if (reservation) {
          updateReservation(reservation.id, { paidAmount: reservation.paidAmount + newPayment.amount })
            .catch(err => console.error("Failed to update reservation paid amount:", err));
        }
      }

      setPayments(prev => [newPayment, ...prev]);
      return newPayment.id;
    } catch (error) {
      console.error("Error inserting payment:", error);
      throw error;
    }
  };

  const updatePayment = async (id: string, paymentUpdate: Partial<Payment>): Promise<void> => {
    try {
      const existingPayment = payments.find(p => p.id === id);
      
      const dbPayload: any = {};
      if (paymentUpdate.status) dbPayload.status = paymentUpdate.status;
      if (paymentUpdate.amount !== undefined) dbPayload.amount = paymentUpdate.amount;
      if (paymentUpdate.method) dbPayload.method = paymentUpdate.method;
      if (paymentUpdate.proofOfPayment) dbPayload.proofOfPayment = paymentUpdate.proofOfPayment;
      if (paymentUpdate.notes) dbPayload.notes = paymentUpdate.notes;

      const { error } = await supabase
        .from('payments')
        .update(dbPayload)
        .eq('payment_id', id);

      if (error) throw error;

      if (existingPayment) {
        addAuditLog({
          userId: existingPayment.userId, 
          action: 'UPDATE',
          targetTable: 'payments',
          targetId: id,
          beforeValue: existingPayment,
          afterValue: { ...existingPayment, ...paymentUpdate },
          changedFields: paymentUpdate,
          notes: `Updated payment ${id}`
        }).catch(err => console.error("Failed to write audit log:", err));

        if (existingPayment.status !== 'paid' && paymentUpdate.status === 'paid') {
          const finalAmount = paymentUpdate.amount !== undefined ? paymentUpdate.amount : existingPayment.amount;
          addLedgerEntry({
            userId: existingPayment.userId,
            amount: finalAmount,
            date: new Date().toISOString()
          }).catch(err => console.error("Failed to write ledger entry:", err));
        }

        const reservation = reservations.find(b => b.id === existingPayment.reservationId);
        if (reservation) {
          let newPaidAmount = reservation.paidAmount;
          let needsReservationUpdate = false;

          if (existingPayment.status !== 'paid' && paymentUpdate.status === 'paid') {
            newPaidAmount += (paymentUpdate.amount ?? existingPayment.amount);
            needsReservationUpdate = true;
          } 
          else if (existingPayment.status === 'paid' && paymentUpdate.status && paymentUpdate.status !== 'paid') {
            newPaidAmount -= existingPayment.amount;
            needsReservationUpdate = true;
          }
          else if (existingPayment.status === 'paid' && (!paymentUpdate.status || paymentUpdate.status === 'paid') && paymentUpdate.amount !== undefined && paymentUpdate.amount !== existingPayment.amount) {
            newPaidAmount = newPaidAmount - existingPayment.amount + paymentUpdate.amount;
            needsReservationUpdate = true;
          }

          if (needsReservationUpdate) {
            updateReservation(reservation.id, { paidAmount: Math.max(0, newPaidAmount) })
              .catch(err => console.error("Failed to update reservation paid amount:", err));
          }
        }
      }

      setPayments(prev => prev.map(p => (p.id === id ? { ...p, ...paymentUpdate } : p)));
    } catch (error) {
      console.error("Error updating payment:", error);
      throw error;
    }
  };

  // ── Ledger ──────────────────────────────────────────────────────────────────
  const addLedgerEntry = async (entry: Omit<LedgerEntry, 'id'>): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('ledger')
        .insert([{
          user_id: entry.userId,
          amount: entry.amount,
          date: entry.date || new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      const newEntry: LedgerEntry = {
        id: data.ledger_id,
        userId: data.user_id,
        amount: Number(data.amount),
        date: data.date
      };

      setLedgers(prev => [newEntry, ...prev]);
      return newEntry.id;
    } catch (error) {
      console.error("Error inserting ledger entry:", error);
      throw error;
    }
  };

  // ── Audit Log ───────────────────────────────────────────────────────────────
  const addAuditLog = async (log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .insert([{
          user_id: log.userId,
          action: log.action,
          target_table: log.targetTable,
          target_id: log.targetId,
          before_value: log.beforeValue,
          after_value: log.afterValue,
          changed_fields: log.changedFields,
          timestamp: new Date().toISOString(),
          notes: log.notes
        }])
        .select()
        .single();
        const publicId = makePublicId("AUD", { uuid: data.audit_id });

        await supabase
          .from('audit_log')
          .update({ public_id: publicId })
          .eq('audit_id', data.audit_id);

      if (error) throw error;

      const newLog: AuditLog = {
        id: data.audit_id,
        publicId,
        userId: data.user_id,
        action: data.action,
        targetTable: data.target_table,
        targetId: data.target_id,
        beforeValue: data.beforeValue,
        afterValue: data.afterValue,
        changedFields: data.changedFields,
        timestamp: data.timestamp,
        notes: data.notes
      };

      setAuditLogs(prev => [newLog, ...prev]);
      return newLog.id;
    } catch (error) {
      console.error("Error inserting audit log:", error);
      throw error;
    }
  };

  // ── Inquiries ─────────────────────────────────────────────────────────────
  const addInquiry = async (inquiryData: Omit<Inquiry, 'id' | 'date' | 'status'>): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          user_id: inquiryData.userId || null,
          first_name: inquiryData.first_name,
          last_name: inquiryData.last_name,
          email: inquiryData.email,
          subject: inquiryData.subject,
          message: inquiryData.message,
          status: 'open',
          date: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      const newInquiry: Inquiry = {
        id: data.message_id,
        userId: data.user_id,
        first_name: data.first_name ?? '',
        last_name: data.last_name ?? '',
        email: data.email,
        subject: data.subject,
        message: data.message,
        status: data.status as InquiryStatus,
        date: data.date,
        response: data.response,
        responseDate: data.response_date,
      };

      setInquiries(prev => [newInquiry, ...prev]);
      return newInquiry.id;
    } catch (error) {
      console.error("Error inserting message:", error);
      throw error;
    }
  };

  const updateInquiry = async (id: string, inquiry: Partial<Inquiry>): Promise<void> => {
    try {
      const dbPayload: any = {};
      if (inquiry.status) dbPayload.status = inquiry.status;
      if (inquiry.response) dbPayload.response = inquiry.response;
      if (inquiry.responseDate) dbPayload.response_date = inquiry.responseDate;

      const { error } = await supabase.from('messages').update(dbPayload).eq('message_id', id);
      if (error) throw error;

      setInquiries(prev => prev.map(i => (i.id === id ? { ...i, ...inquiry } : i)));
    } catch (error) {
      console.error("Error updating inquiry in Supabase:", error);
      throw error;
    }
  };

  // ── Notifications ────────────────────────────────────────────────────────
  const addNotification = async (notification: Omit<Notification, 'id' | 'date' | 'read'>): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_read: false,
          date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      const newNotification: Notification = {
        id: data.notification_id,
        userId: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type as any,
        read: data.is_read,
        date: data.date,
      };

      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error("Error inserting notification:", error);
    }
  };

  const markNotificationRead = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('notification_id', id);
      if (error) throw error;
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const markAllNotificationsRead = async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
      if (error) throw error;
      setNotifications(prev => prev.map(n => (n.userId === userId ? { ...n, read: true } : n)));
    } catch (error) {
      console.error("Error marking all notifications read:", error);
    }
  };

  const deleteNotification = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('notification_id', id);

    if (error) throw error;

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};
  

  // ── Content Settings ───────────────────────────────────────────────

  const updateContentSettings = async (settings: Partial<ContentSettings>) => {
  const payload: any = {};

  if (settings.hero) payload.hero = settings.hero;
  if (settings.about) payload.about = settings.about;
  if (settings.history) payload.history = settings.history;
  if (settings.featured) payload.featured = settings.featured;
  if (settings.contact) payload.contact = settings.contact;
  if (settings.footer) payload.footer = settings.footer;
  if (settings.menu) payload.menu = settings.menu;
  if (settings.announcements) payload.announcements = settings.announcements;
  if (settings.policies !== undefined) payload.policies = settings.policies;

  const targetId = contentSettings.content_id;

  if (!targetId) {
    const { data, error } = await supabase
      .from('site_content')
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      setContentSettings((prev) => ({
        ...prev,
        ...payload,
        content_id: data.content_id,
        updated_at: data.updated_at,
      }));
    }

    return;
  }

  const { data, error } = await supabase
    .from('site_content')
    .update(payload)
    .eq('content_id', targetId)
    .select()
    .single();

  if (!error && data) {
    setContentSettings({
      content_id: data.content_id,
      hero: data.hero ?? DEFAULT_CONTENT.hero,
      about: data.about ?? DEFAULT_CONTENT.about,
      history: data.history ?? DEFAULT_CONTENT.history,
      featured: data.featured ?? DEFAULT_CONTENT.featured,
      contact: data.contact ?? DEFAULT_CONTENT.contact,
      footer: data.footer ?? DEFAULT_CONTENT.footer,
      menu: data.menu ?? DEFAULT_CONTENT.menu,
      announcements: data.announcements ?? [],
      policies: data.policies ?? '',
      updated_at: data.updated_at,
    });
  }
};

  // ─────────────────────────────────────────────────────────────────────────────
  const addBusinessSlot = (_s: any) => {};
  const updateBusinessSlot = (_id: string, _s: any) => {};
  const deleteBusinessSlot = (_id: string) => {};

  return (
    <DataContext.Provider value={{
      users, units, reservations, payments, ledgers, auditLogs, inquiries, notifications, businessSlots, contentSettings, parkingSlots: MOCK_PARKING_SLOTS,
      addUnit, updateUnit, deleteUnit, addReservation, updateReservation, deleteReservation, 
      addPayment, updatePayment, uploadPaymentProof, uploadUnitImage, addLedgerEntry, addAuditLog, 
      addInquiry, updateInquiry, addNotification, markNotificationRead, markAllNotificationsRead, deleteNotification,
      addBusinessSlot, updateBusinessSlot, deleteBusinessSlot, updateContentSettings,
      getUnitById: (id) => units.find(p => p.id === id),
      getReservationsByUserId: (userId) => reservations.filter(b => b.userId === userId),
      getPaymentsByUserId: (userId) => payments.filter(p => p.userId === userId),
      getNotificationsByUserId: (userId) => notifications.filter(n => n.userId === userId),
      getInquiriesByUserId: (userId) => inquiries.filter(i => i.userId === userId),
      getUserById: (id) => users.find(u => u.id === id),
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
}