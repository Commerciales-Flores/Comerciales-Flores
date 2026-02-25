import { createContext, useContext, useState, ReactNode } from 'react';
import supabase from '../supabaseClient';
import { fetchUnits } from '../utils/fetchUnits';   // adjust path as needed
import { useEffect } from 'react';                  // already available in React

// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type UnitType = 'rental_space' | 'function_hall' | 'parking_slot';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'approved'; // ✅ FIX 3: added 'approved'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'cheque' | 'gcash' | 'paymaya' | 'bank_transfer' | 'credit_card' | 'not_applicable';
export type PaymentCycle = 'monthly' | 'quarterly' | 'full';
export type InquiryStatus = 'open' | 'responded' | 'resolved';
export type GuestParkingReservationStatus = 'pending' | 'approved' | 'rejected';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Unit {
  id: string;
  name: string;
  type: UnitType;
  description: string;
  price: number;
  images: string[];
  policies: string;
  capacity?: number;
  available: boolean;
  features: string[];
}

export interface Booking {
  id: string;
  userId: string;
  unitId: string;
  propertyName: string;
  unitType: UnitType;
  startDate: string;
  endDate: string;
  duration: number;
  totalAmount: number;
  status: BookingStatus;
  notes?: string;

  // ✅ FIX 2: Added missing fields that are used in mock data and addPayment logic
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
  durationType?: 'hours' | 'days';
  slotId?: string;
  slotName?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  proofOfPayment?: string;
  date: string;
  notes: string;
}

export interface User {
  id: string;
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
  name: string;
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
  type: 'booking' | 'payment' | 'inquiry' | 'system';
  read: boolean;
  date: string;
}

export interface BusinessSlot {
  id: string;
  unitId: string;
  propertyName: string;
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

// ✅ FIX 1: Defined the missing GuestParkingReservation interface
export interface GuestParkingReservation {
  id: string;
  name: string;
  contact: string;
  vehicleInfo: string;
  vehicleType?: string;
  plateNumber?: string;
  slotId: string;
  slotName: string;
  paymentMethod: PaymentMethod | '';
  reference: string;
  status: GuestParkingReservationStatus;
  createdAt: string;
  is_a_user: boolean;
}

export type ParkingFormState = {
  name: string;
  contact: string;
  vehicleInfo: string;
  slotId: string;
  paymentMethod: PaymentMethod | '';
  reference: string;
};

export interface ContentSettings {
  heroTitle: string;
  heroSubtitle: string;
  aboutUs: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  announcements: string[];
  policies: string;
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface DataContextType {
  users: User[];
  units: Unit[];
  bookings: Booking[];
  payments: Payment[];
  inquiries: Inquiry[];
  notifications: Notification[];
  businessSlots: BusinessSlot[];
  contentSettings: ContentSettings;
  parkingSlots: ParkingSlot[];
  guestParkingReservations: GuestParkingReservation[];

  addUnit: (unit: Omit<Unit, 'id'>) => void;
  updateUnit: (id: string, unit: Partial<Unit>) => void;
  deleteUnit: (id: string) => void;

  addParkingReservation: (
    // ✅ FIX 7: Also omit 'slotName' since the function derives it internally
    reservation: Omit<GuestParkingReservation, 'id' | 'status' | 'createdAt' | 'is_a_user' | 'slotName'>
  ) => void;

  // ✅ FIX 4: addBooking omit now matches the implementation (also omits 'status')
  addBooking: (booking: Omit<Booking, 'id' | 'requestDate' | 'status' | 'paidAmount'>) => string;
  updateBooking: (id: string, booking: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  addPayment: (payment: Omit<Payment, 'id' | 'date'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;

  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => void;
  updateInquiry: (id: string, inquiry: Partial<Inquiry>) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;

  addBusinessSlot: (slot: Omit<BusinessSlot, 'id'>) => void;
  updateBusinessSlot: (id: string, slot: Partial<BusinessSlot>) => void;
  deleteBusinessSlot: (id: string) => void;

  updateContentSettings: (settings: Partial<ContentSettings>) => void;

  getUnitById: (id: string) => Unit | undefined;
  getBookingsByUserId: (userId: string) => Booking[];
  getPaymentsByUserId: (userId: string) => Payment[];
  getNotificationsByUserId: (userId: string) => Notification[];
  getInquiriesByUserId: (userId: string) => Inquiry[];
  // ✅ FIX 5: Added getUserById to the interface
  getUserById: (id: string) => User | undefined;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_UNITS: Unit[] = [
  {
    id: 'p1',
    name: 'Commercial Unit 101',
    type: 'rental_space',
    description: 'Spacious commercial unit perfect for retail or office space.',
    price: 25000,
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
    ],
    policies: 'Minimum 1-year contract. Security deposit equivalent to 2 months rent required.',
    available: true,
    features: ['50 sqm floor area', 'Air-conditioned', '24/7 security', 'Parking space included', 'Restroom'],
  },
  {
    id: 'p2',
    name: 'Grand Function Hall',
    type: 'function_hall',
    description: 'Elegant function hall suitable for weddings, conferences, and special events.',
    price: 15000,
    images: [
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    ],
    policies: 'Minimum 1-day booking. Full payment required 7 days before event.',
    capacity: 200,
    available: true,
    features: ['200 person capacity', 'Stage and sound system', 'Air-conditioned', 'Catering area', 'LED screen'],
  },
  {
    id: 'p3',
    name: 'Parking Area',
    type: 'parking_slot',
    description: 'Secure covered parking slots available for hourly, daily, or monthly rental.',
    price: 3000,
    images: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800'],
    policies: 'Minimum 1-hour booking. Vehicle must be registered.',
    available: true,
    features: ['Covered parking', '24/7 CCTV', 'Security guard', 'Well-lit area'],
  },
  {
    id: 'p4',
    name: 'Commercial Unit 205',
    type: 'rental_space',
    description: 'Modern office space with panoramic windows.',
    price: 30000,
    images: ['https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800'],
    policies: 'Minimum 1-year contract. Utilities not included.',
    available: true,
    features: ['75 sqm floor area', 'Panoramic windows', 'Fiber internet ready', 'Pantry area'],
  },
  {
    id: 'p5',
    name: 'Intimate Event Space',
    type: 'function_hall',
    description: 'Cozy event space perfect for small gatherings.',
    price: 8000,
    images: ['https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'],
    policies: 'Minimum 1-day booking. External catering allowed.',
    capacity: 50,
    available: true,
    features: ['50 person capacity', 'Basic sound system', 'Air-conditioned', 'WiFi included'],
  },
];

const MOCK_PARKING_SLOTS: ParkingSlot[] = Array.from({ length: 10 }, (_, i) => ({
  id: `slot-${i + 1}`,
  name: `Slot ${i + 1}`,
  imageUrl: `https://placehold.co/400x300/e2e8f0/475569?text=Slot%20${i + 1}`,
}));

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    userId: '2',
    unitId: 'p1',
    propertyName: 'Commercial Unit 101',
    unitType: 'rental_space',
    startDate: '2025-01-15',
    endDate: '2026-01-14',
    duration: 12,
    modeOfVisit: 'online',
    status: 'confirmed', // ✅ FIX 3: changed from invalid 'approved' to 'confirmed'
    paymentMethod: 'bank_transfer',
    paymentIntent: 'pay_later',
    paymentCycle: 'monthly',
    totalAmount: 300000,
    paidAmount: 50000, // ✅ FIX 2: now valid — field exists on Booking
    requestDate: '2024-12-15', // ✅ FIX 2: now valid — field exists on Booking
    notes: 'Opening a small restaurant',
    businessType: 'Food & Beverage',
  },
  {
    id: 'b2',
    userId: '2',
    unitId: 'p3',
    propertyName: 'Covered Parking - Section A',
    unitType: 'parking_slot',
    startDate: '2025-12-05',
    endDate: '2025-12-05',
    duration: 5,
    modeOfVisit: 'online',
    paymentIntent: 'pay_later',
    status: 'pending',
    paymentMethod: 'gcash',
    totalAmount: 250,
    paidAmount: 0,
    requestDate: '2025-12-03',
    notes: 'Client meeting in the area',
    vehicleType: 'Sedan',
    plateNumber: 'ABC 1234',
  },
];

const MOCK_USERS: User[] = [
  {
    id: '2',
    first_name: 'John',
    last_name: 'Doe',
    email: 'client@example.com',
    contactNumber: '+63 918 765 4321',
    address: '123 Business Avenue, Manila, Philippines 1000',
    role: 'customer',
    is_active: true,
  },
];

const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay1',
    bookingId: 'b1',
    userId: '2',
    amount: 50000,
    method: 'bank_transfer',
    status: 'paid',
    proofOfPayment: 'https://images.unsplash.com/photo-1554224311-beee4f9866a1?w=400',
    date: '2024-12-20',
    notes: 'First 2 months payment - advance and deposit',
  },
];

const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: 'inq1',
    name: 'Maria Santos',
    email: 'maria@example.com',
    subject: 'Availability for December wedding',
    message: 'Hi, I would like to inquire about the Grand Function Hall availability for December 25, 2025.',
    status: 'open',
    date: '2025-12-01',
  },
];

const MOCK_CONTENT: ContentSettings = {
  heroTitle: 'Welcome to Commerciales Flores',
  heroSubtitle: 'Your Premier Rental Management Partner',
  aboutUs:
    'Commerciales Flores has been serving the community for over 20 years, providing quality commercial spaces, event venues, and parking facilities.',
  contactEmail: 'info@comercialesflores.ph',
  contactPhone: '+63 2 8123 4567',
  contactAddress: '123 Business Avenue, Manila, Philippines 1000',
  announcements: [
    'New parking rates effective January 2026',
    'Holiday promo: 10% off on function hall bookings for December',
  ],
  policies:
    'All bookings are subject to admin approval. Payment terms vary by property type. Cancellations must be made 7 days in advance for refund eligibility.',
};

// ─── Context & Provider ───────────────────────────────────────────────────────

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  //const [units, setUnits] = useState<Unit[]>(MOCK_UNITS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [users] = useState<User[]>(MOCK_USERS); // ✅ FIX 9: removed unused setUsers
  const [inquiries, setInquiries] = useState<Inquiry[]>(MOCK_INQUIRIES);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [guestParkingReservations, setGuestParkingReservations] = useState<GuestParkingReservation[]>([]);
  //Supabase Unit Fetching Logic
  const [units, setUnits] = useState<Unit[]>([]);
  const [businessSlots, setBusinessSlots] = useState<BusinessSlot[]>([
    {
      id: 'slot1',
      unitId: 'p1',
      propertyName: 'Commercial Unit 101',
      date: '2025-12-10',
      startTime: '09:00',
      endTime: '17:00',
      price: 25000,
      available: true,
    },
    {
      id: 'slot2',
      unitId: 'p2',
      propertyName: 'Grand Function Hall',
      date: '2025-12-15',
      startTime: '10:00',
      endTime: '22:00',
      price: 15000,
      available: true,
    },
  ]);
  const [contentSettings, setContentSettings] = useState<ContentSettings>(MOCK_CONTENT);
  // Fetch units from Supabase on mount
  useEffect(() => {
    fetchUnits(3).then((fetched) => {
      if (fetched.length > 0) {
        setUnits(fetched);
      } else {
        // Fall back to mock data if DB is empty or unreachable
        setUnits(MOCK_UNITS);
      }
    });
  }, []);
  // ── Units ──────────────────────────────────────────────────────────────

  const addUnit = (unit: Omit<Unit, 'id'>) => {
    setUnits(prev => [...prev, { ...unit, id: Date.now().toString() }]);
  };

  const updateUnit = (id: string, unit: Partial<Unit>) => {
    setUnits(prev => prev.map(u => (u.id === id ? { ...u, ...unit } : u)));
  };

  const deleteUnit = (id: string) => {
    setUnits(prev => prev.filter(u => u.id !== id));
  };

  // ── Bookings ────────────────────────────────────────────────────────────────

  // ✅ FIX 4: Omit list matches the interface — 'status' is also omitted so caller doesn't pass it
  const addBooking = (booking: Omit<Booking, 'id' | 'requestDate' | 'status' | 'paidAmount'>): string => {
    const newBooking: Booking = {
      ...booking,
      id: 'b' + Date.now().toString(),
      requestDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      paidAmount: 0,
    };
    setBookings(prev => [...prev, newBooking]);
    return newBooking.id;
  };

  const updateBooking = (id: string, booking: Partial<Booking>) => {
    setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...booking } : b)));
  };

  const deleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  // ── Payments ────────────────────────────────────────────────────────────────

  const addPayment = (payment: Omit<Payment, 'id' | 'date'>) => {
    const newPayment: Payment = {
      ...payment,
      id: 'pay' + Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
    };
    setPayments(prev => [...prev, newPayment]);

    // Keep paidAmount on the booking in sync
    setBookings(prev =>
      prev.map(b =>
        b.id === payment.bookingId
          ? { ...b, paidAmount: b.paidAmount + payment.amount }
          : b
      )
    );
  };

  const updatePayment = (id: string, payment: Partial<Payment>) => {
    setPayments(prev => prev.map(p => (p.id === id ? { ...p, ...payment } : p)));
  };

  // ── Inquiries ───────────────────────────────────────────────────────────────

  const addInquiry = (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => {
    const newInquiry: Inquiry = {
      ...inquiry,
      id: 'inq' + Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      status: 'open',
    };
    setInquiries(prev => [...prev, newInquiry]);
  };

  const updateInquiry = (id: string, inquiry: Partial<Inquiry>) => {
    setInquiries(prev => prev.map(i => (i.id === id ? { ...i, ...inquiry } : i)));
  };

  // ── Notifications ────────────────────────────────────────────────────────────

  const addNotification = (notification: Omit<Notification, 'id' | 'date' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: 'notif' + Date.now().toString(),
      date: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [...prev, newNotification]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = (userId: string) => {
    setNotifications(prev => prev.map(n => (n.userId === userId ? { ...n, read: true } : n)));
  };

  // ── Business Slots ───────────────────────────────────────────────────────────

  const addBusinessSlot = (slot: Omit<BusinessSlot, 'id'>) => {
    setBusinessSlots(prev => [...prev, { ...slot, id: 'bslot' + Date.now().toString() }]);
  };

  const updateBusinessSlot = (id: string, slot: Partial<BusinessSlot>) => {
    setBusinessSlots(prev => prev.map(s => (s.id === id ? { ...s, ...slot } : s)));
  };

  const deleteBusinessSlot = (id: string) => {
    setBusinessSlots(prev => prev.filter(s => s.id !== id));
  };

  // ── Content Settings ─────────────────────────────────────────────────────────

  const updateContentSettings = (settings: Partial<ContentSettings>) => {
    setContentSettings(prev => ({ ...prev, ...settings }));
  };

  // ── Guest Parking Reservations ───────────────────────────────────────────────

  const addParkingReservation = (
    reservation: Omit<GuestParkingReservation, 'id' | 'status' | 'createdAt' | 'is_a_user' | 'slotName'>
  ) => {
    // ✅ FIX 6: Look up from MOCK_PARKING_SLOTS (not properties) using the slotId
    const slot = MOCK_PARKING_SLOTS.find(s => s.id === reservation.slotId);
    const slotName = slot?.name ?? reservation.slotId; // graceful fallback

    const newReservation: GuestParkingReservation = {
      ...reservation,
      id: 'gpr' + Date.now().toString(),
      status: 'pending',
      is_a_user: false,
      createdAt: new Date().toISOString(),
      slotName,
    };
    setGuestParkingReservations(prev => [...prev, newReservation]);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getUnitById = (id: string) => units.find(p => p.id === id);
  const getBookingsByUserId = (userId: string) => bookings.filter(b => b.userId === userId);
  const getPaymentsByUserId = (userId: string) => payments.filter(p => p.userId === userId);
  const getNotificationsByUserId = (userId: string) => notifications.filter(n => n.userId === userId);
  const getInquiriesByUserId = (userId: string) => inquiries.filter(i => i.userId === userId);
  const getUserById = (id: string) => users.find(u => u.id === id); // ✅ FIX 5: now also in interface

  // ── Provider ─────────────────────────────────────────────────────────────────

  return (
    <DataContext.Provider
      value={{
        users,
        units,
        bookings,
        payments,
        inquiries,
        notifications,
        businessSlots,
        contentSettings,
        parkingSlots: MOCK_PARKING_SLOTS,
        guestParkingReservations,
        addParkingReservation,
        addUnit,
        updateUnit,
        deleteUnit,
        addBooking,
        updateBooking,
        deleteBooking,
        addPayment,
        updatePayment,
        addInquiry,
        updateInquiry,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        addBusinessSlot,
        updateBusinessSlot,
        deleteBusinessSlot,
        updateContentSettings,
        getUnitById,
        getBookingsByUserId,
        getPaymentsByUserId,
        getNotificationsByUserId,
        getInquiriesByUserId,
        getUserById,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}