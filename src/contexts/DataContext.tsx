import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type PropertyType = 'rental_space' | 'function_hall' | 'parking_slot';
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'cheque' | 'gcash' | 'paymaya' | 'bank_transfer' | 'credit_card' | 'not_applicable';
export type PaymentCycle = 'monthly' | 'quarterly' | 'full';
export type InquiryStatus = 'open' | 'responded' | 'resolved';

export type ParkingFormState = {
  name: string;
  contact: string;
  vehicleInfo: string;
  slotId: string;
  paymentMethod: PaymentMethod | "";
  reference: string;
};

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  description: string;
  price: number; // hourly for parking, daily for hall, monthly for rental
  images: string[];
  policies: string;
  capacity?: number;
  available: boolean;
  features: string[];
  location: string;
}

// In src/contexts/DataContext.tsx
export interface Reservation {
  id: string;
  userId: string;
  propertyId: string;
  propertyName: string;
  propertyType: PropertyType;
  requestDate: string;
  startDate: string;
  endDate: string;
  duration: number;
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
    paymentMethod?: 'cash' | 'cheque' | 'gcash' | 'paymaya' | 'bank_transfer' | 'credit_card' | 'not_applicable'; // ✅ ADD THIS LINE

  // --- Type-Specific Fields ---

  // For Rental Spaces
  paymentCycle?: 'monthly' | 'quarterly' | 'full';
  businessType?: string;
  paymentIntent?: 'pay_onsite' | 'pay_later';

  // For Function Halls
  eventPurpose?: string;
  attendees?: number;

  // For Parking Slots (and general visits)
  modeOfVisit: 'online' | 'onsite';
  vehicleType?: string;
  plateNumber?: string;

  // ✅ FIX: Add the new, optional properties for parking slots
  durationType?: 'hours' | 'days';
  slotId?: string;
  slotName?: string;

  location?: string;
}


export interface Payment {
  id: string;
  reservationId: string;
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
  // Allow all roles you use in your app
  role: 'admin' | 'client' | 'customer';
  first_name: string;
  last_name: string;
  email: string;
  // Make these optional with '?' so all user types are valid,
  // even if an admin user doesn't have an address or contact number.
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
  type: 'appointment' | 'reservation' | 'payment' | 'inquiry' | 'system';
  read: boolean;
  date: string;
}

export interface BusinessSlot {
  id: string;
  propertyId: string;
  propertyName: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  available: boolean;
  location?: string;
}

export interface ParkingSlot {
  id: string; // e.g., 'slot-1', 'slot-2'
  name: string; // e.g., 'Slot 1', 'Slot 2'
  imageUrl: string;
}

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

export interface AuditLog {
  id: string;
  action: string;
  target: string;
  performedBy: string;
  date: string;
  details?: string;
}

export type Location = 
  | 'Quezon City'; // add more as needed

const locations: Location[] = [
  'Quezon City'
];

interface DataContextType {
  users: User[];
  properties: Property[];
  reservations: Reservation[];
  auditLogs: AuditLog[]; 
  payments: Payment[];
  inquiries: Inquiry[];
  notifications: Notification[];
  businessSlots: BusinessSlot[];
  locations: Location[];
  contentSettings: ContentSettings;
  addProperty: (property: Omit<Property, 'id'>) => void;
  updateProperty: (id: string, property: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  parkingSlots: ParkingSlot[];
  addReservation: (reservation: Omit<Reservation, 'id' | 'requestDate' | 'paidAmount'>) => string;
  updateReservation: (id: string, reservation: Partial<Reservation>) => void;
  deleteReservation: (id: string) => void;
  addPayment: (payment: Omit<Payment, 'id' | 'date'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => void;
  updateInquiry: (id: string, inquiry: Partial<Inquiry>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
  deleteNotification: (id: string) => void;
  addBusinessSlot: (slot: Omit<BusinessSlot, 'id'>) => void;
  updateBusinessSlot: (id: string, slot: Partial<BusinessSlot>) => void;
  deleteBusinessSlot: (id: string) => void;
  updateContentSettings: (settings: Partial<ContentSettings>) => void;
  getPropertyById: (id: string) => Property | undefined;
  getReservationsByUserId: (userId: string) => Reservation[];
  getPaymentsByUserId: (userId: string) => Payment[];
  getNotificationsByUserId: (userId: string) => Notification[];
  getInquiriesByUserId: (userId: string) => Inquiry[];
  getUserById: (id: string) => User | undefined;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data
const MOCK_PROPERTIES: Property[] = [
  {
    id: 'p1',
    name: 'Commercial Unit 101',
    type: 'rental_space',
    description: 'Spacious commercial unit perfect for retail or office space. Located in prime business district with high foot traffic.',
    price: 25000, // monthly
    images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'],
    policies: 'Minimum 1-year contract. Security deposit equivalent to 2 months rent required. No subleasing without approval.',
    available: true,
    features: ['50 sqm floor area', 'Air-conditioned', '24/7 security', 'Parking space included', 'Restroom'],
    location: "Quezon City, Metro Manila",
  },
  {
    id: 'p2',
    name: 'Grand Function Hall',
    type: 'function_hall',
    description: 'Elegant function hall suitable for weddings, conferences, and special events. Fully equipped with audio-visual systems.',
    price: 15000, // daily
    images: ['https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
    policies: 'Minimum 1-day reservation. Full payment required 7 days before event. Damages will be charged separately.',
    capacity: 200,
    available: true,
    features: ['200 person capacity', 'Stage and sound system', 'Air-conditioned', 'Catering area', 'Restrooms', 'LED screen'],
    location: "Quezon City, Metro Manila",
  },
  {
    id: 'p3',
    name: 'Parking Area',
    type: 'parking_slot',
    description: 'Secure covered parking slots available for hourly, daily, or monthly rental. CCTV monitored 24/7.',
    price: 3000, 
    images: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800'],
    policies: 'Minimum 1-hour reservation. Vehicle must be registered. Not responsible for items left in vehicle.',
    available: true,
    features: ['Covered parking', '24/7 CCTV', 'Security guard', 'Well-lit area'],
    location: "Quezon City, Metro Manila"
  },
  {
    id: 'p4',
    name: 'Commercial Unit 205',
    type: 'rental_space',
    description: 'Modern office space with panoramic windows. Ideal for startups and small businesses.',
    price: 30000, // monthly
    images: ['https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800'],
    policies: 'Minimum 1-year contract. Utilities not included. Advance and deposit required.',
    available: true,
    features: ['75 sqm floor area', 'Panoramic windows', 'Fiber internet ready', 'Pantry area', 'Executive washroom'],
    location: "Quezon City, Metro Manila"
  },
  {
    id: 'p5',
    name: 'Intimate Event Space',
    type: 'function_hall',
    description: 'Cozy event space perfect for small gatherings, meetings, and celebrations.',
    price: 8000, // daily
    images: ['https://images.unsplash.com/photo-1511578314322-379afb476865?w=800'],
    policies: 'Minimum 1-day reservation. Decorations must be approved. External catering allowed.',
    capacity: 50,
    available: true,
    features: ['50 person capacity', 'Basic sound system', 'Air-conditioned', 'WiFi included', 'Kitchen access'],
    location: "Quezon City, Metro Manila"
  }
];

const MOCK_PARKING_SLOTS: ParkingSlot[] = Array.from({ length: 10 }, (_, i) => ({
  id: `slot-${i + 1}`,
  name: `Slot ${i + 1}`,
  imageUrl: `https://placehold.co/400x300/e2e8f0/475569?text=Slot%20${i + 1}`,
}));

const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'r1',
    userId: '2',
    propertyId: 'p1',
    propertyName: 'Commercial Unit 101',
    propertyType: 'rental_space',
    startDate: '2025-01-15',
    endDate: '2026-01-14',
    duration: 12, // months
    modeOfVisit: 'online',
    status: 'confirmed',
    paymentMethod: 'bank_transfer',
    paymentIntent: 'pay_later',
    paymentCycle: 'monthly',
    totalAmount: 300000, // 12 months x 25000
    paidAmount: 50000, // 2 months paid
    notes: 'Opening a small restaurant',
    requestDate: '2024-12-15',
    businessType: 'Food & Beverage'
  },
  {
    id: 'r2',
    userId: '2',
    propertyId: 'p3',
    propertyName: 'Covered Parking - Section A',
    propertyType: 'parking_slot',
    startDate: '2025-12-05',
    endDate: '2025-12-05',
    duration: 5, // hours
    modeOfVisit: 'online',
    paymentIntent: 'pay_later',
    status: 'pending',
    paymentMethod: 'gcash',
    totalAmount: 250, // 5 hours x 50
    paidAmount: 0,
    notes: 'Client meeting in the area',
    requestDate: '2025-12-03',
    vehicleType: 'Sedan',
    plateNumber: 'ABC 1234'
  }
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
  // Add other mock users as needed
];

const MOCK_PAYMENTS: Payment[] = [
  {
    id: 'pay1',
    reservationId: 'r1',
    userId: '2',
    amount: 50000,
    method: 'bank_transfer',
    status: 'paid',
    proofOfPayment: 'https://images.unsplash.com/photo-1554224311-beee4f9866a1?w=400',
    date: '2024-12-20',
    notes: 'First 2 months payment - advance and deposit'
  }
];

const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: 'inq1',
    name: 'Maria Santos',
    email: 'maria@example.com',
    subject: 'Availability for December wedding',
    message: 'Hi, I would like to inquire about the Grand Function Hall availability for December 25, 2025. We are expecting around 150 guests.',
    status: 'open',
    date: '2025-12-01'
  }
];

const MOCK_CONTENT: ContentSettings = {
  heroTitle: 'Welcome to Commerciales Flores',
  heroSubtitle: 'Your Premier Rental Management Partner',
  aboutUs: 'Commerciales Flores has been serving the community for over 20 years, providing quality commercial spaces, event venues, and parking facilities. We pride ourselves on excellent customer service and well-maintained properties.',
  contactEmail: 'info@comercialesflores.ph',
  contactPhone: '+63 2 8123 4567',
  contactAddress: '16 Rd 23, Project 8, Quezon City, Metro Manila',
  announcements: [
    'New parking rates effective January 2026',
    'Holiday promo: 10% off on function hall reservations for December'
  ],
  policies: 'All reservations are subject to admin approval. Payment terms vary by property type. Cancellations must be made 7 days in advance for refund eligibility.'
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS);
  const [payments, setPayments] = useState<Payment[]>(MOCK_PAYMENTS);
  const [users] = useState(MOCK_USERS);

  // ✅ ADD THIS HELPER FUNCTION
  const getUserById = (id: string) => users.find(u => u.id === id);
  const [inquiries, setInquiries] = useState<Inquiry[]>(MOCK_INQUIRIES);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [businessSlots, setBusinessSlots] = useState<BusinessSlot[]>([
  {
    id: 'slot1',
    propertyId: 'p1',
    propertyName: 'Commercial Unit 101',
    date: '2025-12-10',
    startTime: '09:00',
    endTime: '17:00',
    price: 25000,
    available: true
  },
  {
    id: 'slot2',
    propertyId: 'p2',
    propertyName: 'Grand Function Hall',
    date: '2025-12-15',
    startTime: '10:00',
    endTime: '22:00',
    price: 15000,
    available: true
  }
]);

  const [contentSettings, setContentSettings] = useState<ContentSettings>(MOCK_CONTENT);

  // Properties
  const addProperty = (property: Omit<Property, 'id'>) => {
    const newProperty = { ...property, id: Date.now().toString() };
    setProperties([...properties, newProperty]);
  };

  const updateProperty = (id: string, property: Partial<Property>) => {
    setProperties(properties.map(p => p.id === id ? { ...p, ...property } : p));
  };

  const deleteProperty = (id: string) => {
    setProperties(properties.filter(p => p.id !== id));
  };

  // Reservations
  const addReservation = (reservation: Omit<Reservation, 'id' | 'requestDate' | 'status' | 'paidAmount'>): string => {
    const property = getPropertyById(reservation.propertyId);
    const newReservation: Reservation = {
      ...reservation,
      id: 'r' + Date.now().toString(),
      requestDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      paidAmount: 0,
      location: property?.location, // ✅ copy from property
    };
    setReservations([...reservations, newReservation]);
    return newReservation.id;
  };

  const updateReservation = (id: string, reservation: Partial<Reservation>) => {
    setReservations(reservations.map(r => r.id === id ? { ...r, ...reservation } : r));
  };

  const deleteReservation = (id: string) => {
    setReservations(reservations.filter(r => r.id !== id));
  };

  // Payments
  const addPayment = (payment: Omit<Payment, 'id' | 'date'>) => {
    const newPayment: Payment = {
      ...payment,
      id: 'pay' + Date.now().toString(),
      date: new Date().toISOString().split('T')[0]
    };
    setPayments([...payments, newPayment]);

    // Update reservation paid amount
    const reservation = reservations.find(r => r.id === payment.reservationId);
    if (reservation) {
      const newPaidAmount = reservation.paidAmount + payment.amount;
      updateReservation(payment.reservationId, { 
        paidAmount: newPaidAmount,
      });
    }
  };

  const updatePayment = (id: string, payment: Partial<Payment>) => {
    setPayments(payments.map(p => p.id === id ? { ...p, ...payment } : p));
  };

  // Inquiries
  const addInquiry = (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => {
    const newInquiry: Inquiry = {
      ...inquiry,
      id: 'inq' + Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      status: 'open'
    };
    setInquiries([...inquiries, newInquiry]);
  };

  const updateInquiry = (id: string, inquiry: Partial<Inquiry>) => {
    setInquiries(inquiries.map(i => i.id === id ? { ...i, ...inquiry } : i));
  };

  // Notifications
  const addNotification = (notification: Omit<Notification, 'id' | 'date' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: 'notif' + Date.now().toString(),
      date: new Date().toISOString(),
      read: false
    };
    setNotifications([...notifications, newNotification]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = (userId: string) => {
    setNotifications(notifications.map(n => n.userId === userId ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Business Slots
  const addBusinessSlot = (slot: Omit<BusinessSlot, 'id'>) => {
    const newSlot = { ...slot, id: 'slot' + Date.now().toString() };
    setBusinessSlots([...businessSlots, newSlot]);
  };

  const updateBusinessSlot = (id: string, slot: Partial<BusinessSlot>) => {
    setBusinessSlots(businessSlots.map(s => s.id === id ? { ...s, ...slot } : s));
  };

  const deleteBusinessSlot = (id: string) => {
    setBusinessSlots(businessSlots.filter(s => s.id !== id));
  };

  // Content Settings
  const updateContentSettings = (settings: Partial<ContentSettings>) => {
    setContentSettings({ ...contentSettings, ...settings });
  };


  // Helper functions
  const getPropertyById = (id: string) => properties.find(p => p.id === id);
  const getReservationsByUserId = (userId: string) => reservations.filter(r => r.userId === userId);
  const getPaymentsByUserId = (userId: string) => payments.filter(p => p.userId === userId);
  const getNotificationsByUserId = (userId: string) => notifications.filter(n => n.userId === userId);
  const getInquiriesByUserId = (userId: string) => inquiries.filter(i => i.userId === userId);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); // ✅ Add this

  return (
    <DataContext.Provider
      value={{
        users,
        properties,
        reservations,
        payments,
        inquiries,
        notifications,
        businessSlots,
        contentSettings,
        parkingSlots: MOCK_PARKING_SLOTS,  // ✅ new
        auditLogs, // Placeholder for audit logs
        locations,
        deleteNotification,
        addProperty,
        updateProperty,
        deleteProperty,
        addReservation,
        updateReservation,
        deleteReservation,
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
        getPropertyById,
        getReservationsByUserId,
        getPaymentsByUserId,
        getNotificationsByUserId,
        getInquiriesByUserId,
        getUserById
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
