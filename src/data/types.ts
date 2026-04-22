export type UnitType = 'rental_space' | 'function_hall' | 'parking_slot';
export type UnitCategory = string;
export type UnitSubtype = string;
export type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'overdue'
  | 'rejected';

export type PaymentReviewStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export type PaymentMethod =
  | 'gcash'
  | 'bank_transfer'
  | 'card'
  | 'not_applicable';

export type BookingTerm = 'daily' | 'weekly' | 'monthly';
export type PaymentMode = 'full_upfront' | 'deposit_plus_first_month';

export type InquiryStatus = 'open' | 'responded' | 'resolved';
export type OverdueReason =
  | 'reservation_ended_with_balance'
  | 'rental_ended_with_balance'
  | 'manual_admin_flag';

export type ParkingSlotStatus = 'active' | 'inactive' | 'maintenance';

export interface ReservationDetails {
  bookingTerm?: BookingTerm;
  paymentMode?: PaymentMode;
  businessType?: string;
  eventPurpose?: string;
  attendees?: number;
  slotId?: string;
  slotName?: string;

  assignedSlotId?: string;
  assignedSlotCode?: string;
  assignedSlotLabel?: string;

  vehicleType?: string;
  plateNumber?: string;
  durationType?: 'hours' | 'days' | 'months' | 'years';

  extensionRequested?: boolean;
  extensionMonths?: number;
  extensionRequestedAt?: string;
  extensionApprovedAt?: string;
  extensionApprovedMonths?: number;
  extensionRejectedAt?: string;
  extensionRejectedMonths?: number;
}

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

  isOccupied?: boolean;
  occupiedByUserId?: string | null;
  occupiedByName?: string | null;
  occupiedByPublicId?: string | null;
  occupiedSince?: string | null;
}

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  type: UnitType;
  category?: UnitCategory | null;
  subtype?: UnitSubtype | null;
  description: string;
  price: number;
  images: string[];
  imagePaths: string[];
  videos?: string[];
  videoPaths?: string[];
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
  minimumPaymentPercent?: number | null;
  contractFilePath?: string | null;
  contractFileName?: string | null;
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
  bookingTerm?: BookingTerm;
  paymentMode?: PaymentMode;
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

  assignedParkingSlotId?: string | null;
  assignedParkingSlotLabel?: string | null;

  location?: string;
  details?: ReservationDetails;

  minimumPaymentPercentSnapshot?: number | null;

  confirmedVisitDate?: string | null;
  confirmedVisitTime?: string | null;
  visitStatus?: 'requested' | 'confirmed' | 'reschedule_requested' | 'completed' | 'declined';

  overdueAt?: string | null;
  overdueReason?: OverdueReason | null;
  lastOverdueNotificationAt?: string | null;
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
  reviewStatus?: PaymentReviewStatus;

  paymentMethodId?: string | null;
paymentMethodSnapshot?: Record<string, any> | null;

category?:
  | 'payment'
  | 'advance_deposit'
  | 'security_deposit'
  | 'reservation_fee'
  | 'monthly_rent'
  | 'parking_fee'
  | 'function_room_fee'
  | 'vat'
  | 'penalty';
}

export interface LedgerEntry {
  id: string;
  userId: string | null;
  publicId?: string;
  reservationId: string | null;
  paymentId: string | null;
  depositType?: 'security' | 'advance';
  entryType:
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
  referenceNo?: string | null;
  description?: string | null;
  notes?: string | null;
  recordedAt: string;
  createdAt: string;
  createdBy?: string | null;
}

export interface AuditLog {
  id: string;
  publicId?: string;
  userId: string;
  action: string;
  targetTable: string;
  targetId: string;
  targetPublicId?: string;
  beforeValue?: unknown | null;
  afterValue?: unknown | null;
  changedFields?: string[] | Record<string, unknown> | null;
  timestamp: string;
  notes?: string;
}

export interface User {
  id: string;
  publicId?: string;
  role: 'admin' | 'client';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  formattedAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  profilePictureUrl?: string;
  lastLogin?: string;
  phoneVerified: boolean;
  phoneVerifiedAt?: string | null;
  addressConfirmed: boolean;
  addressConfirmedAt?: string | null;
  createdAt?: string;

  isMessagingBlocked?: boolean;

  hasActiveOccupancy?: boolean;
  activeUnitName?: string | null;
  activeUnitType?: UnitType | null;
  activeSince?: string | null;

  hasUpcomingReservation?: boolean;
  hasUnpaidBalance?: boolean;

  deactivationBlocked?: boolean;
  deactivationReason?: string | null;
}

export interface Inquiry {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  date: string;
  response?: string;
  responseDate?: string;
}

export type NotificationType =
  | 'reservation'
  | 'payment'
  | 'inquiry'
  | 'review'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
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
  faq: {
  title: string;
  subtitle: string;
  items: {
    question: string;
    answer: string;
  }[];
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