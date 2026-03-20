export type UnitType = 'rental_space' | 'function_hall' | 'parking_slot';
export type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod =
  | 'cash'
  | 'cheque'
  | 'gcash'
  | 'paymaya'
  | 'bank_transfer'
  | 'credit_card'
  | 'not_applicable';

export type PaymentCycle = 'monthly' | 'quarterly' | 'full';
export type InquiryStatus = 'open' | 'responded' | 'resolved';

export type ParkingSlotStatus = 'active' | 'inactive' | 'maintenance';

export interface ParkingSlot {
  id: string;
  unitId: string;
  slotCode: string;
  label?: string | null;
  status: ParkingSlotStatus;
  vehicleType?: string | null;
  imagePath?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  type: UnitType;
  description: string;
  price: number;
  images: string[];      // public URLs for rendering
  imagePaths: string[];
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
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  paymentIntent?: 'pay_onsite' | 'pay_later';
  eventPurpose?: string;
  attendees?: number;
  modeOfVisit: 'online' | 'onsite';
  vehicleType?: string;
  plateNumber?: string;
  durationType?: 'hours' | 'days' | 'months' | 'years';
  slotId?: string;
  slotName?: string;
  location?: string;
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
  userId: string | null;
  reservation_id: string | null;
  payment_id: string | null;
  entry_type:
    | 'payment'
    | 'deposit'
    | 'balance'
    | 'refund'
    | 'penalty'
    | 'discount'
    | 'adjustment';
  amount: number;
  method?: string | null;
  status?: string | null;
  reference_no?: string | null;
  description?: string | null;
  notes?: string | null;
  recorded_at: string;
  created_at: string;
  created_by?: string | null;
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