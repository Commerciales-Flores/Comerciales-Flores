import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import supabase from '../supabaseClient';

// ─── Enums / Union Types ──────────────────────────────────────────────────────
export type UnitType = 'rental_space' | 'function_hall' | 'parking_slot';
export type BookingStatus = 'pending' | 'approved' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'cheque' | 'gcash' | 'paymaya' | 'bank_transfer' | 'credit_card' | 'not_applicable';
export type PaymentCycle = 'monthly' | 'quarterly' | 'full';
export type InquiryStatus = 'open' | 'responded' | 'closed'; 
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

export interface ContentSettings {
  content_id?: string;
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
  ledgers: LedgerEntry[];
  auditLogs: AuditLog[];
  inquiries: Inquiry[];
  notifications: Notification[];
  businessSlots: BusinessSlot[];
  contentSettings: ContentSettings;
  parkingSlots: ParkingSlot[];
  guestParkingReservations: GuestParkingReservationStatus[];

  addUnit: (unit: Omit<Unit, 'id'>) => Promise<void>;
  updateUnit: (id: string, unit: Partial<Unit>) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;

  addParkingReservation: (reservation: Omit<GuestParkingReservationStatus, 'id' | 'status' | 'createdAt' | 'is_a_user' | 'slotName'>) => void;

  addBooking: (booking: Omit<Booking, 'id' | 'requestDate' | 'status' | 'paidAmount'>) => Promise<string>;
  updateBooking: (id: string, booking: Partial<Booking>) => Promise<void>;
  deleteBooking: (id: string) => void;

  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>) => Promise<string>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  
  uploadPaymentProof: (file: File) => Promise<string | null>;
  uploadPropertyImage: (file: File) => Promise<string | null>;

  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<string>;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => Promise<string>;

  addInquiry: (inquiry: Omit<Inquiry, 'id' | 'date' | 'status'>) => Promise<string>;
  updateInquiry: (id: string, inquiry: Partial<Inquiry>) => Promise<void>;

  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: (userId: string) => Promise<void>;

  addBusinessSlot: (slot: Omit<BusinessSlot, 'id'>) => void;
  updateBusinessSlot: (id: string, slot: Partial<BusinessSlot>) => void;
  deleteBusinessSlot: (id: string) => void;

  updateContentSettings: (settings: Partial<ContentSettings>) => Promise<void>;

  getUnitById: (id: string) => Unit | undefined;
  getBookingsByUserId: (userId: string) => Booking[];
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
  heroTitle: '',
  heroSubtitle: '',
  aboutUs: '',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  announcements: [],
  policies: '',
};

// ─── Context & Provider ───────────────────────────────────────────────────────
const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]); 
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); 
  const [users, setUsers] = useState<User[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [guestParkingReservations, _setGuestParkingReservations] = useState<GuestParkingReservationStatus[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [businessSlots, _setBusinessSlots] = useState<BusinessSlot[]>([]);
  const [contentSettings, setContentSettings] = useState<ContentSettings>(DEFAULT_CONTENT);

  useEffect(() => {
    // Fetch all unified property data
    const fetchAllProperties = async () => {
      try {
        const { data: baseUnits, error: baseError } = await supabase.from('units').select('*');
        const { data: rentalUnits } = await supabase.from('rental_units').select('*');
        // ✅ NEW: Added fetch for function_units
        const { data: functionUnits } = await supabase.from('function_units').select('*');
        const { data: parkingUnits } = await supabase.from('parking_units').select('*');
        const { data: media } = await supabase.from('media').select('*');

        if (baseError) throw baseError;
        if (!baseUnits) return;

        const combinedUnits: Unit[] = baseUnits.map(base => {
          let specific = null;
          
          // ✅ FIX: 3-way split based on new schema
          if (base.unit_type === 'rental_space') {
            specific = rentalUnits?.find(r => r.unit_id === base.unit_id);
          } else if (base.unit_type === 'function_hall') {
            specific = functionUnits?.find(f => f.unit_id === base.unit_id);
          } else if (base.unit_type === 'parking_slot') {
            specific = parkingUnits?.find(p => p.unit_id === base.unit_id);
          }

          const unitMediaRecords = media?.filter(m => m.unit_id === base.unit_id) || [];
          let imagesArray: string[] = [];

          unitMediaRecords.forEach(record => {
            if (!record.url) return;
            
            const rawUrl = record.url;

            if (typeof rawUrl === 'string') {
              if (rawUrl.startsWith('http')) {
                imagesArray.push(rawUrl);
              } else {
                try {
                  const parsed = JSON.parse(rawUrl);
                  imagesArray.push(...Object.values(parsed).filter(v => typeof v === 'string') as string[]);
                } catch (e) { /* ignore broken strings */ }
              }
            } else if (typeof rawUrl === 'object' && rawUrl !== null) {
              imagesArray.push(...Object.values(rawUrl).filter(v => typeof v === 'string') as string[]);
            }
          });

          let parsedFeatures: string[] = [];
          if (Array.isArray(specific?.features)) {
            parsedFeatures = specific.features;
          } else if (typeof specific?.features === 'string') {
            parsedFeatures = (specific.features as string).split(',').map(s => s.trim());
          }

          return {
            id: base.unit_id,
            name: base.title,
            type: base.unit_type as UnitType,
            description: specific?.description || '',
            price: Number(base.price),
            images: imagesArray,
            policies: specific?.policies || '',
            available: base.is_available,
            features: parsedFeatures,
            capacity: undefined 
          };
        });

        setUnits(combinedUnits);
      } catch (error) {
        console.error("Error loading properties from Supabase:", error);
      }
    };

    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) setUsers(data);
    };

    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBookings(data.map((row: any) => ({
          id: row.reservation_id,
          userId: row.user_id,
          unitId: row.unit_id,
          propertyName: row.title,
          unitType: row.unit_type,
          startDate: row.start_date,
          endDate: row.end_date,
          duration: row.duration,
          totalAmount: Number(row.total_amount),
          status: row.status as BookingStatus,
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
      const { data, error } = await supabase.from('messages').select('*').order('date', { ascending: false });
      if (!error && data) {
        setInquiries(data.map((row: any) => ({
          id: row.message_id,
          userId: row.user_id,
          name: row.name,
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
      const { data, error } = await supabase.from('notifications').select('*').order('date', { ascending: false });
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
      const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setPayments(data.map((row: any) => ({
          id: row.payment_id,
          bookingId: row.reservation_id,
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
      const { data, error } = await supabase.from('ledger').select('*').order('date', { ascending: false });
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
      const { data, error } = await supabase.from('audit_log').select('*').order('timestamp', { ascending: false });
      if (!error && data) {
        setAuditLogs(data.map((row: any) => ({
          id: row.audit_id,
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
      const { data, error } = await supabase.from('site_content').select('*').limit(1).single();
      if (!error && data) {
        setContentSettings({
          content_id: data.content_id,
          heroTitle: data.heroTitle || '',
          heroSubtitle: data.heroSubtitle || '',
          aboutUs: data.aboutUs || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          contactAddress: data.contactAddress || '',
          announcements: data.announcements || [],
          policies: data.policies || ''
        });
      }
    };

    fetchAllProperties();
    fetchUsers();
    fetchBookings();
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

  const uploadPropertyImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property_images') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('property_images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading property image:", error);
      return null;
    }
  };

  // ── Units ──────────────────────────────────────────────────────────────────
  const addUnit = async (unitData: Omit<Unit, 'id'>): Promise<void> => {
    try {
      const { data: baseUnit, error: baseError } = await supabase
        .from('units')
        .insert([{
          unit_type: unitData.type,
          title: unitData.name,
          is_available: unitData.available,
          price: unitData.price
        }])
        .select()
        .single();

      if (baseError) throw baseError;
      const newUnitId = baseUnit.unit_id;

      const specificData = {
        unit_id: newUnitId,
        title: unitData.name,
        description: unitData.description,
        policies: unitData.policies,
        features: unitData.features 
      };

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
      if (unitUpdate.type !== undefined) basePayload.unit_type = unitUpdate.type;
      if (unitUpdate.name !== undefined) basePayload.title = unitUpdate.name;
      if (unitUpdate.available !== undefined) basePayload.is_available = unitUpdate.available;
      if (unitUpdate.price !== undefined) basePayload.price = unitUpdate.price;

      if (Object.keys(basePayload).length > 0) {
        const { error } = await supabase.from('units').update(basePayload).eq('unit_id', id);
        if (error) throw error;
      }

      const specificPayload: any = {};
      if (unitUpdate.name !== undefined) specificPayload.title = unitUpdate.name;
      if (unitUpdate.description !== undefined) specificPayload.description = unitUpdate.description;
      if (unitUpdate.policies !== undefined) specificPayload.policies = unitUpdate.policies;
      if (unitUpdate.features !== undefined) specificPayload.features = unitUpdate.features;

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

  // ── Bookings ────────────────────────────────────────────────────────────────
  const addBooking = async (bookingData: Omit<Booking, 'id' | 'requestDate' | 'status' | 'paidAmount'>): Promise<string> => {
    try {
      const details = {
        paymentCycle: bookingData.paymentCycle,
        businessType: bookingData.businessType,
        eventPurpose: bookingData.eventPurpose,
        attendees: bookingData.attendees,
        slotId: bookingData.slotId,
        slotName: bookingData.slotName,
        vehicleType: bookingData.vehicleType,
        plateNumber: bookingData.plateNumber,
        durationType: bookingData.durationType,
      };

      const cleanDetails = Object.fromEntries(Object.entries(details).filter(([_, v]) => v !== undefined));

      const { data, error } = await supabase
        .from('reservations')
        .insert([{
          user_id: bookingData.userId,
          unit_id: bookingData.unitId,
          title: bookingData.propertyName,
          unit_type: bookingData.unitType,
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          duration: bookingData.duration,
          total_amount: bookingData.totalAmount,
          status: 'pending',
          payment_method: bookingData.paymentMethod,
          payment_intent: bookingData.paymentIntent,
          mode_of_visit: bookingData.modeOfVisit,
          notes: bookingData.notes,
          details: cleanDetails
        }])
        .select() 
        .single();

      if (error) throw error;

      const newBooking: Booking = {
        id: data.reservation_id, 
        userId: data.user_id,
        unitId: data.unit_id,
        propertyName: data.title,
        unitType: data.unit_type as UnitType,
        startDate: data.start_date,
        endDate: data.end_date,
        duration: data.duration,
        totalAmount: Number(data.total_amount), 
        status: data.status as BookingStatus,
        notes: data.notes,
        paidAmount: Number(data.paid_amount || 0),
        requestDate: data.created_at, 
        paymentMethod: data.payment_method as any,
        paymentIntent: data.payment_intent as any,
        modeOfVisit: data.mode_of_visit as any,
        ...cleanDetails
      };

      setBookings(prev => [newBooking, ...prev]);
      return newBooking.id;
    } catch (error) {
      console.error("Error inserting booking:", error);
      throw error; 
    }
  };

  const updateBooking = async (id: string, booking: Partial<Booking>): Promise<void> => {
    try {
      const dbPayload: any = {};
      if (booking.status) dbPayload.status = booking.status;
      if (booking.paidAmount !== undefined) dbPayload.paid_amount = booking.paidAmount;

      const { error } = await supabase
        .from('reservations')
        .update(dbPayload)
        .eq('reservation_id', id);

      if (error) throw error;

      setBookings(prev => prev.map(b => (b.id === id ? { ...b, ...booking } : b)));
    } catch (error) {
      console.error("Error updating booking:", error);
      throw error;
    }
  };

  const deleteBooking = (id: string) => { setBookings(prev => prev.filter(b => b.id !== id)); };

  // ── Payments (WITH AUTO AUDIT, LEDGER, & BOOKING SYNC) ─────────────────────────
  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'date'>): Promise<string> => {
    try {
      const paymentDate = new Date().toISOString(); 
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          user_id: paymentData.userId,
          reservation_id: paymentData.bookingId,
          amount: paymentData.amount,
          method: paymentData.method,
          status: paymentData.status,
          proofOfPayment: paymentData.proofOfPayment,
          date: paymentDate, 
          notes: paymentData.notes
        }])
        .select()
        .single();

      if (error) throw error;

      const newPayment: Payment = {
        id: data.payment_id,
        bookingId: data.reservation_id,
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
        notes: `Created new payment for reservation ${newPayment.bookingId}`
      }).catch(err => console.error("Failed to write audit log:", err));

      if (newPayment.status === 'paid') {
        addLedgerEntry({
          userId: newPayment.userId,
          amount: newPayment.amount,
          date: newPayment.date
        }).catch(err => console.error("Failed to write ledger entry:", err));

        const booking = bookings.find(b => b.id === newPayment.bookingId);
        if (booking) {
          updateBooking(booking.id, { paidAmount: booking.paidAmount + newPayment.amount })
            .catch(err => console.error("Failed to update booking paid amount:", err));
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

        const booking = bookings.find(b => b.id === existingPayment.bookingId);
        if (booking) {
          let newPaidAmount = booking.paidAmount;
          let needsBookingUpdate = false;

          if (existingPayment.status !== 'paid' && paymentUpdate.status === 'paid') {
            newPaidAmount += (paymentUpdate.amount ?? existingPayment.amount);
            needsBookingUpdate = true;
          } 
          else if (existingPayment.status === 'paid' && paymentUpdate.status && paymentUpdate.status !== 'paid') {
            newPaidAmount -= existingPayment.amount;
            needsBookingUpdate = true;
          }
          else if (existingPayment.status === 'paid' && (!paymentUpdate.status || paymentUpdate.status === 'paid') && paymentUpdate.amount !== undefined && paymentUpdate.amount !== existingPayment.amount) {
            newPaidAmount = newPaidAmount - existingPayment.amount + paymentUpdate.amount;
            needsBookingUpdate = true;
          }

          if (needsBookingUpdate) {
            updateBooking(booking.id, { paidAmount: Math.max(0, newPaidAmount) })
              .catch(err => console.error("Failed to update booking paid amount:", err));
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

      if (error) throw error;

      const newLog: AuditLog = {
        id: data.audit_id,
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
          name: inquiryData.name,
          email: inquiryData.email,
          subject: inquiryData.subject,
          message: inquiryData.message,
          status: 'open',
          date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      const newInquiry: Inquiry = {
        id: data.message_id,
        userId: data.user_id,
        name: data.name,
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

  // ── Content Settings ───────────────────────────────────────────────
  const updateContentSettings = async (settings: Partial<ContentSettings>): Promise<void> => {
    try {
      if (!contentSettings.content_id) {
        console.error("Cannot update: Content ID not found.");
        return;
      }

      const dbPayload = { ...settings } as any;
      delete dbPayload.content_id;
      dbPayload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('site_content')
        .update(dbPayload)
        .eq('content_id', contentSettings.content_id);

      if (error) throw error;

      setContentSettings(prev => ({ ...prev, ...settings }));
    } catch (error) {
      console.error("Error updating content settings:", error);
      throw error;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const addBusinessSlot = (_s: any) => {};
  const updateBusinessSlot = (_id: string, _s: any) => {};
  const deleteBusinessSlot = (_id: string) => {};
  const addParkingReservation = (_r: any) => {};

  return (
    <DataContext.Provider value={{
      users, units, bookings, payments, ledgers, auditLogs, inquiries, notifications, businessSlots, contentSettings, parkingSlots: MOCK_PARKING_SLOTS, guestParkingReservations,
      addParkingReservation, addUnit, updateUnit, deleteUnit, addBooking, updateBooking, deleteBooking, 
      addPayment, updatePayment, uploadPaymentProof, uploadPropertyImage, addLedgerEntry, addAuditLog, 
      addInquiry, updateInquiry, addNotification, markNotificationRead, markAllNotificationsRead, 
      addBusinessSlot, updateBusinessSlot, deleteBusinessSlot, updateContentSettings,
      getUnitById: (id) => units.find(p => p.id === id),
      getBookingsByUserId: (userId) => bookings.filter(b => b.userId === userId),
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