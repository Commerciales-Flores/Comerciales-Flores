import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useClientData } from "../../contexts/ClientDataContext";
import type { UnitType } from "../../contexts/DataContext";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useUnits } from '../../contexts/UnitsContext';    
import { useReviews } from '../../contexts/ReviewsContext';
import { usePaymentMethods, type PaymentMethodCode } from '../../contexts/PaymentMethodsContext';
import type { Reservation } from '../../data/types';
import { formatDate } from '../../utils/date';
import supabase from "../../supabaseClient";
import AppNotice from "../../components/common/AppNotice";

import {
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  House,
  CheckCircle2,
  CalendarDays,
  MapPin,
  Check, ChevronDown,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getUnitTypeLabel,
  getPriceLabel,
  calculateTotalAmount,
  getMinimumDuration,
} from "../../utils/propertyHelpers";

import EmptyState from '../../components/common/EmptyState';

type DurationType = "hours" | "days" | "months" | "years";
type PriceRange = "all" | "0-1000" | "1001-5000" | "5001-10000" | "10001+";
type VisitMode = "online" | "onsite";
type PaymentIntent = "pay_onsite" | "pay_later";
type PaymentMethod = PaymentMethodCode;
type PaymentCycle = "monthly" | "quarterly" | "full";
type ReservationIntent = "viewing_only" | "reserve_online" | "reserve_onsite";

const APPOINTMENT_START_HOUR = 9;
const APPOINTMENT_END_HOUR = 17;

function formatTimeLabel(value: string) {
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function buildAppointmentTimeOptions(stepSeconds: number) {
  const stepMinutes = Math.max(1, Math.floor(stepSeconds / 60));
  const options: string[] = [];

  for (let hour = APPOINTMENT_START_HOUR; hour <= APPOINTMENT_END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      if (hour === APPOINTMENT_END_HOUR && minute > 0) break;

      options.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );
    }
  }

  return options;
}

interface ReservationForm {
  startDate?: Date;
  endDate?: Date;
  duration: number;
  durationType: DurationType;
  modeOfVisit: VisitMode;
  paymentIntent: PaymentIntent;
  paymentMethod: PaymentMethod;
  paymentCycle: PaymentCycle;
  notes: string;
  slotId: string;
  vehicleType: string;
  plateNumber: string;
  eventPurpose: string;
  attendees: string;
  businessType: string;
  appointmentDate?: Date;
  appointmentTime?: string;
  agreedToPolicies: boolean;
}

const PRICE_RANGE_OPTIONS: { value: PriceRange; label: string }[] = [
  { value: "all", label: "All Prices" },
  { value: "0-1000", label: "₱0 - ₱1,000" },
  { value: "1001-5000", label: "₱1,001 - ₱5,000" },
  { value: "5001-10000", label: "₱5,001 - ₱10,000" },
  { value: "10001+", label: "₱10,001+" },
];

const FALLBACK_IMAGE =
  "https://placehold.co/1200x800/e5e7eb/6b7280?text=No+Image";

  const BLOCKING_STATUSES = ["approved", "confirmed"] as const;
// If you want pending requests to temporarily hold dates too, use:
// const BLOCKING_STATUSES = ["pending", "approved", "confirmed"] as const;

function isBlockingReservation(status?: string | null) {
  return BLOCKING_STATUSES.includes(
    (status ?? "") as (typeof BLOCKING_STATUSES)[number]
  );
}

function getBlockingReservationsForUnit(
  reservations: Reservation[],
  unitId: string,
  unitType: UnitType,
  excludeUserId?: string
) {
  return reservations
    .filter(
      (r) =>
        r.unitId === unitId &&
        r.unitType === unitType &&
        isBlockingReservation(r.status) &&
        r.userId !== excludeUserId
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
}


function rangesOverlap(
  startA?: string | Date | null,
  endA?: string | Date | null,
  startB?: string | Date | null,
  endB?: string | Date | null
) {
  if (!startA || !endA || !startB || !endB) return false;

  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  if (
    Number.isNaN(aStart) ||
    Number.isNaN(aEnd) ||
    Number.isNaN(bStart) ||
    Number.isNaN(bEnd)
  ) {
    return false;
  }

  return aStart <= bEnd && aEnd >= bStart;
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateInputValue(date?: Date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function differenceInCalendarDaysInclusive(start: Date, end: Date) {
  const startDay = startOfLocalDay(start).getTime();
  const endDay = startOfLocalDay(end).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((endDay - startDay) / msPerDay) + 1;
}

function buildFunctionHallRange(start: Date, end?: Date | null) {
  const safeStart = startOfLocalDay(start);
  const safeRawEnd = end ? startOfLocalDay(end) : safeStart;
  const safeEnd = safeRawEnd.getTime() < safeStart.getTime() ? safeStart : safeRawEnd;

  return {
    startDate: safeStart,
    endDate: endOfLocalDay(safeEnd),
    duration: differenceInCalendarDaysInclusive(safeStart, safeEnd),
    durationType: "days" as const,
  };
}

function isSameLocalDay(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(url);
}

function computeEndFromForm(start: Date, duration: number, type: DurationType) {
  const end = new Date(start);

  if (type === "hours") {
    end.setHours(end.getHours() + duration);
  } else if (type === "days") {
    end.setDate(end.getDate() + duration - 1);
    end.setHours(23, 59, 59, 999);
  } else if (type === "months") {
    end.setMonth(end.getMonth() + duration);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else {
    end.setFullYear(end.getFullYear() + duration);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  }

  return end;
}

function buildInitialReservationForm(
  unitType: UnitType,
  defaultPaymentMethod: PaymentMethod = 'gcash'
): ReservationForm {
  const startDate = getTomorrow();

  if (unitType === "parking_slot") {
  const endDate = computeEndFromForm(
    startDate,
    RESERVATION_LIMITS.parking_slot.minMonths,
    "months"
  );

  return {
    startDate,
    endDate,
    duration: RESERVATION_LIMITS.parking_slot.minMonths,
    durationType: "months",
    modeOfVisit: "online",
    paymentIntent: "pay_later",
    paymentMethod: defaultPaymentMethod,
    paymentCycle: "monthly",
    notes: "",
    slotId: "",
    vehicleType: "",
    plateNumber: "",
    eventPurpose: "",
    attendees: "",
    businessType: "",
    appointmentDate: undefined,
    appointmentTime: "",
    agreedToPolicies: false,
  };
}

  if (unitType === "function_hall") {
  return {
    startDate: undefined as unknown as Date,
    endDate: undefined as unknown as Date,
    duration: 0,
    durationType: "days",
    modeOfVisit: "online",
    paymentIntent: "pay_later",
    paymentMethod: defaultPaymentMethod,
    paymentCycle: "full",
    notes: "",
    slotId: "",
    vehicleType: "",
    plateNumber: "",
    eventPurpose: "",
    attendees: "",
    businessType: "",
    appointmentDate: undefined,
    appointmentTime: "",
    agreedToPolicies: false,
  };
}

  const endDate = computeEndFromForm(
  startDate,
  RESERVATION_LIMITS.rental_space.minMonths,
  "months"
);

return {
  startDate,
  endDate,
  duration: RESERVATION_LIMITS.rental_space.minMonths,
  durationType: "months",
  modeOfVisit: "online",
  paymentIntent: "pay_later",
  paymentMethod: defaultPaymentMethod,
  paymentCycle: "monthly",
  notes: "",
  slotId: "",
  vehicleType: "",
  plateNumber: "",
  eventPurpose: "",
  attendees: "",
  businessType: "",
  appointmentDate: undefined,
  appointmentTime: "",
  agreedToPolicies: false,
};
}

const RESERVATION_LIMITS = {
  rental_space: {
    minMonths: 12,
    maxMonths: 30,
  },
  function_hall: {
    minDays: 1,
    maxDays: 30,
  },
  parking_slot: {
    minMonths: 1,
    maxMonths: 12,
  },
  attendees: {
    min: 1,
    max: 100,
  },
};

const APPOINTMENT_TIME_STEP_SECONDS = 30 * 60; // 30 minutes
// if you want every 10 minutes instead, use:
// const APPOINTMENT_TIME_STEP_SECONDS = 10 * 60;

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getDurationBounds(unitType: UnitType, durationType: DurationType) {
  if (unitType === "rental_space" && durationType === "months") {
    return {
      min: RESERVATION_LIMITS.rental_space.minMonths,
      max: RESERVATION_LIMITS.rental_space.maxMonths,
    };
  }

  if (unitType === "parking_slot" && durationType === "months") {
    return {
      min: RESERVATION_LIMITS.parking_slot.minMonths,
      max: RESERVATION_LIMITS.parking_slot.maxMonths,
    };
  }

  if (unitType === "function_hall" && durationType === "days") {
    return {
      min: RESERVATION_LIMITS.function_hall.minDays,
      max: RESERVATION_LIMITS.function_hall.maxDays,
    };
  }

  return { min: 1, max: 30 };
}

type UnitAvailability = {
  status: "available" | "occupied" | "partial";
  badgeText: string;
  badgeTone: "green" | "red" | "amber" | "gray" | "blue";
  reserveDisabled: boolean;
  reserveLabel: string;
  nextAvailableText?: string;
};

function getParkingAvailability(params: {
  unitId: string;
  parkingSlots: Array<{
    id: string;
    unitId: string;
    status: string;
    isOccupied?: boolean;
  }>;
  reservations: Reservation[];
  userId?: string;
}): UnitAvailability {
  const { unitId, parkingSlots, reservations, userId } = params;

  const slots = parkingSlots.filter((slot) => slot.unitId === unitId);
  const activeSlots = slots.filter((slot) => slot.status === "active");

  const slotsWithOwnership = activeSlots.map((slot) => {
    const occupyingReservation = reservations.find(
      (r) =>
        r.unitType === "parking_slot" &&
        r.unitId === unitId &&
        r.slotId === slot.id &&
        isBlockingReservation(r.status)
    );

    const occupiedByOwnUser =
      !!occupyingReservation && occupyingReservation.userId === userId;

    const occupiedByOtherUser =
      !!occupyingReservation && occupyingReservation.userId !== userId;

    const isUnavailable =
      slot.status !== "active" ||
      slot.isOccupied ||
      occupiedByOtherUser;

    return {
      slot,
      occupyingReservation,
      occupiedByOwnUser,
      occupiedByOtherUser,
      isUnavailable,
    };
  });

  const availableActiveSlots = slotsWithOwnership.filter((s) => !s.isUnavailable);
  const ownReservedSlots = slotsWithOwnership.filter((s) => s.occupiedByOwnUser);

  if (activeSlots.length === 0) {
    return {
      status: "occupied",
      badgeText: "No slots configured",
      badgeTone: "gray",
      reserveDisabled: true,
      reserveLabel: "Unavailable",
    };
  }

  if (availableActiveSlots.length === 0) {
    return {
      status: "occupied",
      badgeText:
        ownReservedSlots.length > 0
          ? "All other slots occupied"
          : "Fully occupied",
      badgeTone: ownReservedSlots.length > 0 ? "blue" : "red",
      reserveDisabled: true,
      reserveLabel: "No Slots Left",
    };
  }

  if (ownReservedSlots.length > 0) {
    return {
      status: "partial",
      badgeText: `${availableActiveSlots.length} slot${
        availableActiveSlots.length === 1 ? "" : "s"
      } available · You already have ${ownReservedSlots.length}`,
      badgeTone: "blue",
      reserveDisabled: false,
      reserveLabel: "View Slots",
    };
  }

  if (availableActiveSlots.length < activeSlots.length) {
    return {
      status: "partial",
      badgeText: `${availableActiveSlots.length} of ${activeSlots.length} slots available`,
      badgeTone: "amber",
      reserveDisabled: false,
      reserveLabel: "Reserve Now",
    };
  }

  return {
    status: "available",
    badgeText: `${availableActiveSlots.length} slots available`,
    badgeTone: "green",
    reserveDisabled: false,
    reserveLabel: "Reserve Now",
  };
}

function getRentalAvailability(params: {
  unitId: string;
  unitType: UnitType;
  reservations: Reservation[];
  userId?: string;
}): UnitAvailability {
  const { unitId, unitType, reservations, userId } = params;

  const blockingReservations = reservations
    .filter(
      (r) =>
        r.unitId === unitId &&
        r.unitType === unitType &&
        isBlockingReservation(r.status)
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  const ownReservations = blockingReservations.filter((r) => r.userId === userId);
  const otherReservations = blockingReservations.filter((r) => r.userId !== userId);
  const now = Date.now();

  const activeOwnRental = ownReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    const end = new Date(r.endDate).getTime();
    return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && end >= now;
  });

  const upcomingOwnRental = ownReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    return !Number.isNaN(start) && start > now;
  });

  if (activeOwnRental || upcomingOwnRental) {
    const ownReservation = activeOwnRental ?? upcomingOwnRental;

    return {
      status: "occupied",
      badgeText: "Reserved by you",
      badgeTone: "blue",
      reserveDisabled: true,
      reserveLabel: "Reserved",
      nextAvailableText:
        ownReservation?.startDate && ownReservation?.endDate
          ? `${formatDate(ownReservation.startDate)} - ${formatDate(ownReservation.endDate)}`
          : ownReservation?.endDate
            ? `Until ${formatDate(ownReservation.endDate)}`
            : undefined,
    };
  }

  const activeOtherRental = otherReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    const end = new Date(r.endDate).getTime();
    return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && end >= now;
  });

  if (activeOtherRental) {
    return {
      status: "occupied",
      badgeText: "Occupied",
      badgeTone: "red",
      reserveDisabled: true,
      reserveLabel: "Occupied",
      nextAvailableText: activeOtherRental.endDate
        ? `Until ${formatDate(activeOtherRental.endDate)}`
        : undefined,
    };
  }

  const upcomingOtherRental = otherReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    return !Number.isNaN(start) && start > now;
  });

  if (upcomingOtherRental) {
    return {
      status: "partial",
      badgeText: "Available soon",
      badgeTone: "amber",
      reserveDisabled: false,
      reserveLabel: "Reserve Now",
      nextAvailableText: `Reserved ${formatDate(
        upcomingOtherRental.startDate
      )} - ${formatDate(upcomingOtherRental.endDate)}`,
    };
  }

  return {
    status: "available",
    badgeText: "Available",
    badgeTone: "green",
    reserveDisabled: false,
    reserveLabel: "Reserve Now",
  };
}

function getFunctionHallAvailability(params: {
  unitId: string;
  unitType: UnitType;
  reservations: Reservation[];
  userId?: string;
}): UnitAvailability {
  const { unitId, unitType, reservations, userId } = params;

  const blockingReservations = reservations
    .filter(
      (r) =>
        r.unitId === unitId &&
        r.unitType === unitType &&
        isBlockingReservation(r.status)
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

  const ownReservations = blockingReservations.filter((r) => r.userId === userId);
  const otherReservations = blockingReservations.filter((r) => r.userId !== userId);
  const now = Date.now();

  const activeOwnReservation = ownReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    const end = new Date(r.endDate).getTime();
    return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && end >= now;
  });

  if (activeOwnReservation) {
    return {
      status: "occupied",
      badgeText: "Reserved by you",
      badgeTone: "blue",
      reserveDisabled: true,
      reserveLabel: "Reserved",
      nextAvailableText: `${formatDate(activeOwnReservation.startDate)} - ${formatDate(
        activeOwnReservation.endDate
      )}`,
    };
  }

  const activeOtherReservation = otherReservations.find((r) => {
  const start = new Date(r.startDate).getTime();
  const end = new Date(r.endDate).getTime();
  return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && end >= now;
});

if (activeOtherReservation) {
  return {
    status: "partial",
    badgeText: "Has reserved dates",
    badgeTone: "amber",
    reserveDisabled: false,
    reserveLabel: "Check Dates",
    nextAvailableText: `${formatDate(activeOtherReservation.startDate)} - ${formatDate(
      activeOtherReservation.endDate
    )}`,
  };
}

  const upcomingOwnReservation = ownReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    return !Number.isNaN(start) && start > now;
  });

  if (upcomingOwnReservation) {
    return {
      status: "partial",
      badgeText: "Reserved by you",
      badgeTone: "blue",
      reserveDisabled: true,
      reserveLabel: "Reserved",
      nextAvailableText: `${formatDate(upcomingOwnReservation.startDate)} - ${formatDate(
        upcomingOwnReservation.endDate
      )}`,
    };
  }

  const upcomingOtherReservation = otherReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    return !Number.isNaN(start) && start > now;
  });

  if (upcomingOtherReservation) {
    return {
      status: "partial",
      badgeText: "Has upcoming reservation",
      badgeTone: "amber",
      reserveDisabled: false,
      reserveLabel: "Check Dates",
      nextAvailableText: `${formatDate(upcomingOtherReservation.startDate)} - ${formatDate(
        upcomingOtherReservation.endDate
      )}`,
    };
  }

  return {
    status: "available",
    badgeText: "Available",
    badgeTone: "green",
    reserveDisabled: false,
    reserveLabel: "Reserve Now",
  };
}

export default function ClientUnits() {
  const { user } = useAuth();
  const { addReservation, reservations } = useClientData();
  const { reviews } = useReviews();
  const { units, parkingSlots } = useUnits();
  const { sendSystemNotification } = useNotifications();

  const [notice, setNotice] = useState<{
    message: string;
    variant?: 'error' | 'warning' | 'success' | 'info';
  } | null>(null);

  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<UnitType | "all">("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const [isSelectingRangeEnd, setIsSelectingRangeEnd] = useState(false);

  const [functionHallConflictMessage, setFunctionHallConflictMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  const { activePaymentMethods } = usePaymentMethods();
  const defaultPaymentMethod = useMemo<PaymentMethod>(() => {
    return (activePaymentMethods[0]?.methodCode ?? 'gcash') as PaymentMethod;
  }, [activePaymentMethods]);

  const [reservationForm, setReservationForm] = useState<ReservationForm>(
    buildInitialReservationForm('rental_space', 'gcash')
  );

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const handleCardVideoEnter = useCallback((unitId: string) => {
  setHoveredCardId(unitId);

  const video = videoRefs.current[unitId];
  if (!video) return;

  video.currentTime = 0;
  video.loop = true;
  void video.play().catch(() => {});
}, []);

const handleCardVideoLeave = useCallback((unitId: string) => {
  setHoveredCardId((prev) => (prev === unitId ? null : prev));

  const video = videoRefs.current[unitId];
  if (!video) return;

  video.pause();
  video.currentTime = 0;
}, []);

useEffect(() => {
  Object.values(videoRefs.current).forEach((video) => {
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  });

  setHoveredCardId(null);
}, [searchTerm, filterType, filterLocation, priceRange]);

useEffect(() => {
  if (showReservationModal) {
    Object.values(videoRefs.current).forEach((video) => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    });

    setHoveredCardId(null);
  }
}, [showReservationModal]);
  

  useEffect(() => {
  setReservationForm((prev) => {
      if (prev.paymentMethod) return prev;
      return { ...prev, paymentMethod: defaultPaymentMethod };
    });
  }, [defaultPaymentMethod]);

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedUnitId]);
  

  

  const hasUnits = useMemo(() => units.length > 0, [units]);

  const locations = useMemo(() => {
    return [
      "all",
      ...Array.from(
        new Set(
          units
            .map((u) => u.location || "")
            .filter((loc) => loc.trim() !== "")
        )
      ),
    ];
  }, [units]);

  
  

  const selectedUnitData = useMemo(() => {
    if (!selectedUnitId) return null;
    return units.find((u) => u.id === selectedUnitId) ?? null;
  }, [selectedUnitId, units]);

  const selectedUnitBlockingReservations = useMemo(() => {
  if (!selectedUnitData) return [];

  return getBlockingReservationsForUnit(
    reservations,
    selectedUnitData.id,
    selectedUnitData.type,
    user?.id
  );
}, [reservations, selectedUnitData, user?.id]);



const isCalendarTileDisabled = useCallback(
  ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return false;
    if (!selectedUnitData) return false;
    if (selectedUnitData.type === "parking_slot") return false;

    const dayStart = startOfLocalDay(date);
    const dayEnd = endOfLocalDay(date);

    return selectedUnitBlockingReservations.some((reservation) =>
      rangesOverlap(dayStart, dayEnd, reservation.startDate, reservation.endDate)
    );
  },
  [selectedUnitData, selectedUnitBlockingReservations]
);

const getCalendarTileClassName = useCallback(
  ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return "";
    if (!selectedUnitData) return "";
    if (selectedUnitData.type === "parking_slot") return "";

    const dayStart = startOfLocalDay(date);
    const dayEnd = endOfLocalDay(date);

    const isBlocked = selectedUnitBlockingReservations.some((reservation) =>
      rangesOverlap(dayStart, dayEnd, reservation.startDate, reservation.endDate)
    );

    // always show blocked styling immediately
    if (isBlocked) {
      return "calendar-tile-blocked";
    }

    const isStart = isSameLocalDay(date, reservationForm.startDate);
    const isEnd = isSameLocalDay(date, reservationForm.endDate);

    if (!reservationForm.startDate || !reservationForm.endDate) {
      return "";
    }

    const rangeStart = startOfLocalDay(reservationForm.startDate);
    const rangeEnd = startOfLocalDay(reservationForm.endDate);

    const isWithinSelectedRange =
      dayStart.getTime() >= Math.min(rangeStart.getTime(), rangeEnd.getTime()) &&
      dayStart.getTime() <= Math.max(rangeStart.getTime(), rangeEnd.getTime());

    if (isStart || isEnd) {
      return "calendar-tile-selected";
    }

    if (isWithinSelectedRange) {
      return "calendar-tile-in-range";
    }

    return "";
  },
  [
    selectedUnitData,
    selectedUnitBlockingReservations,
    reservationForm.startDate,
    reservationForm.endDate,
  ]
);

  const selectedUnitMedia = useMemo(() => {
    const images = selectedUnitData?.images?.filter(Boolean) ?? [];
    const videos = selectedUnitData?.videos?.filter(Boolean) ?? [];

    const media = [...images, ...videos];
    return media.length > 0 ? media : [FALLBACK_IMAGE];
  }, [selectedUnitData]);


useEffect(() => {
  if (!selectedUnitData) return;

  const bounds = getDurationBounds(
    selectedUnitData.type,
    reservationForm.durationType
  );

  if (
    reservationForm.duration < bounds.min ||
    reservationForm.duration > bounds.max
  ) {
    const safeDuration = clampNumber(
      reservationForm.duration,
      bounds.min,
      bounds.max
    );

    setReservationForm((prev) => {
  if (!prev.startDate) {
    return {
      ...prev,
      duration: safeDuration,
    };
  }

  if (selectedUnitData.type === "function_hall") {
    const nextEnd = new Date(startOfLocalDay(prev.startDate));
    nextEnd.setDate(nextEnd.getDate() + safeDuration - 1);

    const nextRange = buildFunctionHallRange(prev.startDate, nextEnd);

    return {
      ...prev,
      startDate: nextRange.startDate,
      endDate: nextRange.endDate,
      duration: nextRange.duration,
      durationType: nextRange.durationType,
    };
  }

  return {
    ...prev,
    duration: safeDuration,
    endDate: computeEndFromForm(prev.startDate, safeDuration, prev.durationType),
  };
});
  }
}, [
  selectedUnitData,
  reservationForm.duration,
  reservationForm.durationType,
  reservationForm.startDate,
]);

useEffect(() => {
  if (selectedUnitData?.type !== "rental_space") return;

  setReservationForm((prev) => {
    if (prev.durationType === "months") return prev;

    return {
      ...prev,
      durationType: "months",
      endDate: prev.startDate
        ? computeEndFromForm(prev.startDate, prev.duration || 1, "months")
        : prev.endDate,
    };
  });
}, [selectedUnitData]);



  const unitParkingSlots = useMemo(() => {
    if (!selectedUnitData || selectedUnitData.type !== "parking_slot") return [];
    return parkingSlots.filter((slot) => slot.unitId === selectedUnitData.id);
  }, [parkingSlots, selectedUnitData]);
  
    const unitAvailabilityMap = useMemo(() => {
  const map = new Map<string, UnitAvailability>();

  for (const unit of units) {
    if (unit.type === "parking_slot") {
      map.set(
        unit.id,
        getParkingAvailability({
          unitId: unit.id,
          parkingSlots,
          reservations,
          userId: user?.id,
        })
      );
      continue;
    }

    if (unit.type === "rental_space") {
      map.set(
        unit.id,
        getRentalAvailability({
          unitId: unit.id,
          unitType: unit.type,
          reservations,
          userId: user?.id,
        })
      );
      continue;
    }

    if (unit.type === "function_hall") {
      map.set(
        unit.id,
        getFunctionHallAvailability({
          unitId: unit.id,
          unitType: unit.type,
          reservations,
          userId: user?.id,
        })
      );
      continue;
    }

    map.set(unit.id, {
      status: "available",
      badgeText: "Available",
      badgeTone: "green",
      reserveDisabled: false,
      reserveLabel: "Reserve Now",
    });
  }

  return map;
}, [units, parkingSlots, reservations, user?.id]);
  
  const safeCurrentMediaIndex = useMemo(() => {
  if (selectedUnitMedia.length === 0) return 0;
  return Math.min(currentImageIndex, selectedUnitMedia.length - 1);
}, [currentImageIndex, selectedUnitMedia]);

    const filteredUnits = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return units.filter((unit) => {
      const matchesSearch =
        q === "" ||
        unit.name.toLowerCase().includes(q) ||
        (unit.description ?? "").toLowerCase().includes(q);

      const matchesType = filterType === "all" || unit.type === filterType;
      const matchesLocation =
        filterLocation === "all" || unit.location === filterLocation;

      let matchesPrice = true;
      switch (priceRange) {
        case "0-1000":
          matchesPrice = unit.price <= 1000;
          break;
        case "1001-5000":
          matchesPrice = unit.price > 1000 && unit.price <= 5000;
          break;
        case "5001-10000":
          matchesPrice = unit.price > 5000 && unit.price <= 10000;
          break;
        case "10001+":
          matchesPrice = unit.price > 10000;
          break;
      }

      return matchesSearch && matchesType && matchesLocation && matchesPrice;
    });
  }, [units, searchTerm, filterType, filterLocation, priceRange]);
  

  const reservedSlotIds = useMemo(() => {
    if (
      !selectedUnitData ||
      selectedUnitData.type !== "parking_slot" ||
      !reservationForm.startDate ||
      !reservationForm.duration
    ) {
      return new Set<string>();
    }

    const formStart = new Date(reservationForm.startDate);
    const formEnd = computeEndFromForm(
      formStart,
      reservationForm.duration,
      reservationForm.durationType
    );

    const reservedIds = reservations
  .filter(
    (r) =>
      r.unitType === "parking_slot" &&
      r.unitId === selectedUnitData.id &&
      r.slotId &&
      isBlockingReservation(r.status) &&
      r.userId !== user?.id
  )
  .filter((r) => {
    const resStart = new Date(r.startDate);
    const resType = (r.durationType as DurationType) ?? "months";
    const resEnd = computeEndFromForm(resStart, r.duration, resType);
    return formStart <= resEnd && formEnd >= resStart;
  })
  .map((r) => r.slotId as string);

    return new Set(reservedIds);
  }, [
  reservations,
  selectedUnitData,
  reservationForm.startDate,
  reservationForm.duration,
  reservationForm.durationType,
  user?.id,
]);

const ownReservedSlotIds = useMemo(() => {
  if (selectedUnitData?.type !== "parking_slot") {
    return new Set<string>();
  }

  if (!reservationForm.startDate) {
    return new Set<string>();
  }

  const formStart = new Date(reservationForm.startDate);
  const formType = (reservationForm.durationType as DurationType) ?? "months";
  const formEnd = computeEndFromForm(
    formStart,
    reservationForm.duration || 1,
    formType
  );

  const ownReservedIds = reservations
    .filter(
      (r) =>
        r.unitType === "parking_slot" &&
        r.unitId === selectedUnitData.id &&
        r.slotId &&
        isBlockingReservation(r.status) &&
        r.userId === user?.id
    )
    .filter((r) => {
      const resStart = new Date(r.startDate);
      const resType = (r.durationType as DurationType) ?? "months";
      const resEnd = computeEndFromForm(resStart, r.duration, resType);
      return formStart <= resEnd && formEnd >= resStart;
    })
    .map((r) => r.slotId as string);

  return new Set(ownReservedIds);
}, [
  reservations,
  selectedUnitData,
  reservationForm.startDate,
  reservationForm.duration,
  reservationForm.durationType,
  user?.id,
]);

  const selectedSlotObject = useMemo(() => {
    if (!reservationForm.slotId) return null;
    return (
      unitParkingSlots.find((slot) => slot.id === reservationForm.slotId) ?? null
    );
  }, [unitParkingSlots, reservationForm.slotId]);

  

  const estimatedTotal = useMemo(() => {
    if (!selectedUnitData) return 0;

    return calculateTotalAmount(
      selectedUnitData.type,
      selectedUnitData.price,
      reservationForm.duration,
      reservationForm.paymentCycle
    );
  }, [
    selectedUnitData,
    reservationForm.duration,
    reservationForm.paymentCycle,
  ]);

  const rentalMonthlyAmount = useMemo(() => {
  if (!selectedUnitData || selectedUnitData.type !== "rental_space") return 0;
  if (!reservationForm.duration || reservationForm.duration <= 0) return 0;

  return estimatedTotal / reservationForm.duration;
}, [selectedUnitData, reservationForm.duration, estimatedTotal]);

const rentalRequiredPayment = useMemo(() => {
  if (!selectedUnitData || selectedUnitData.type !== "rental_space") return 0;

  if (reservationForm.paymentCycle === "quarterly") {
    return Math.min(rentalMonthlyAmount * 3, estimatedTotal);
  }

  if (reservationForm.paymentCycle === "full") {
    return estimatedTotal;
  }

  return Math.min(rentalMonthlyAmount, estimatedTotal);
}, [
  selectedUnitData,
  reservationForm.paymentCycle,
  rentalMonthlyAmount,
  estimatedTotal,
]);



const appointmentTimeOptions = useMemo(
  () => buildAppointmentTimeOptions(APPOINTMENT_TIME_STEP_SECONDS),
  []
);

const reservationIntent: ReservationIntent =
  reservationForm.modeOfVisit === "online"
    ? "reserve_online"
    : reservationForm.paymentIntent === "pay_later"
      ? "viewing_only"
      : "reserve_onsite";

const isViewingOnly = reservationIntent === "viewing_only";
const requiresAppointment = reservationIntent === "viewing_only" || reservationIntent === "reserve_onsite";
const shouldShowPaymentSection = reservationIntent !== "viewing_only";

const hasActivePaymentMethods = activePaymentMethods.length > 0;
const showPaymentMethodEmptyState =
  shouldShowPaymentSection && !hasActivePaymentMethods;

const canSubmit = (() => {
  if (isSubmitting) return false;
  if (!reservationForm.agreedToPolicies) return false;
  if (!selectedUnitData) return false;

  if (requiresAppointment) {
    if (!reservationForm.appointmentDate || !reservationForm.appointmentTime) {
      return false;
    }
  }

  if (shouldShowPaymentSection && showPaymentMethodEmptyState) return false;

  if (selectedUnitData.type === "parking_slot") {
    if (!selectedSlotObject) return false;
    if (!reservationForm.startDate || !reservationForm.endDate) return false;
    if (!reservationForm.vehicleType.trim()) return false;
    if (!reservationForm.plateNumber.trim()) return false;
  }

  if (selectedUnitData.type === "function_hall") {
    if (!reservationForm.startDate || !reservationForm.endDate) return false;
    if (!reservationForm.duration) return false;
    if (functionHallConflictMessage) return false;
    if (!reservationForm.eventPurpose.trim()) return false;
    if (!String(reservationForm.attendees).trim()) return false;
  }

  if (selectedUnitData.type === "rental_space") {
    if (!reservationForm.startDate || !reservationForm.endDate) return false;
    if (
      !reservationForm.duration ||
      reservationForm.duration < RESERVATION_LIMITS.rental_space.minMonths
    ) {
      return false;
    }
    if (!reservationForm.businessType.trim()) return false;
  }

  return true;
})();


const [isTimeSelectOpen, setIsTimeSelectOpen] = useState(false);
const timeSelectRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      timeSelectRef.current &&
      !timeSelectRef.current.contains(event.target as Node)
    ) {
      setIsTimeSelectOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

    const handleReserveNow = useCallback(
  (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;

    const availability = unitAvailabilityMap.get(unitId);
    if (availability?.reserveDisabled) return;

    setSelectedUnitId(unitId);
    setCurrentImageIndex(0);
    setReservationForm(buildInitialReservationForm(unit.type, defaultPaymentMethod));
    setReservationSuccess(false);
    setIsSlotPanelOpen(false);
    setFunctionHallConflictMessage("");
    setShowCalendar(false);
    setShowReservationModal(true);
  },
  [units, unitAvailabilityMap, defaultPaymentMethod]
);

const getParkingSlotState = useCallback(
  (slot: (typeof unitParkingSlots)[number]) => {
    const isOwned = ownReservedSlotIds.has(slot.id);
    const isTakenByOthers = reservedSlotIds.has(slot.id);
    const isInactive = slot.status !== "active" || slot.isOccupied;
    const isDisabled = isOwned || isTakenByOthers || isInactive;

    let statusText = "Available";
    let statusClassName = "bg-green-50 text-green-700 border-green-200";

    if (isOwned) {
      statusText = "Reserved by you";
      statusClassName = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (isTakenByOthers) {
      statusText = "Occupied";
      statusClassName = "bg-red-50 text-red-700 border-red-200";
    } else if (isInactive) {
      statusText = "Unavailable";
      statusClassName = "bg-gray-100 text-gray-600 border-gray-200";
    }

    return {
      isOwned,
      isTakenByOthers,
      isInactive,
      isDisabled,
      statusText,
      statusClassName,
    };
  },
  [ownReservedSlotIds, reservedSlotIds]
);


  const handleCloseReservationModal = useCallback(() => {
    setShowReservationModal(false);
    setShowCalendar(false);
    setReservationSuccess(false);
    setCurrentImageIndex(0);
    setIsSlotPanelOpen(false);
    setFunctionHallConflictMessage("");
    setIsSubmitting(false);
  }, []);

  const handleSlotSelectFromPanel = useCallback((slotId: string) => {
    setReservationForm((prev) => ({ ...prev, slotId }));
    setIsSlotPanelOpen(false);
  }, []);

  const clearSlotSelection = useCallback(() => {
    setReservationForm((prev) => ({ ...prev, slotId: "" }));
  }, []);

  const nextImage = useCallback(() => {
    if (!selectedUnitMedia.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % selectedUnitMedia.length);
  }, [selectedUnitMedia]);

  const prevImage = useCallback(() => {
    if (!selectedUnitMedia.length) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + selectedUnitMedia.length) % selectedUnitMedia.length
    );
  }, [selectedUnitMedia]);

  const handleModeChange = useCallback((mode: VisitMode) => {
  setReservationForm((prev) => ({
    ...prev,
    modeOfVisit: mode,
    paymentIntent: mode === "onsite" ? "pay_later" : "pay_onsite",
    appointmentDate: mode === "onsite" ? prev.appointmentDate : undefined,
    appointmentTime: mode === "onsite" ? prev.appointmentTime ?? "" : "",
  }));

  setIsTimeSelectOpen(false);
}, []);


  const handleReservationSubmit = useCallback(
  async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!selectedUnitData || !user) return;

    const isViewingOnly = reservationIntent === "viewing_only";

    const blockingReservations = getBlockingReservationsForUnit(
      reservations,
      selectedUnitData.id,
      selectedUnitData.type,
      user.id
    );

    if (!reservationForm.agreedToPolicies) {
      setNotice({
        message: "Please agree to the policies before submitting your reservation.",
        variant: "warning",
      });
      return;
    }

    if (
      requiresAppointment &&
      (!reservationForm.appointmentDate || !reservationForm.appointmentTime)
    ) {
      setNotice({
        message: "Please select an appointment date and time.",
        variant: "warning",
      });
      return;
    }

    if (shouldShowPaymentSection && !hasActivePaymentMethods) {
      setNotice({
        message: "No payment methods are currently available. Please try again later.",
        variant: "error",
      });
      return;
    }

    if (selectedUnitData.type === "rental_space") {
      if (!reservationForm.startDate || !reservationForm.endDate) {
        setNotice({
          message: "Please select your lease dates first.",
          variant: "warning",
        });
        return;
      }

      if (reservationForm.durationType !== "months") {
        setNotice({
          message: "Rental spaces must use monthly duration.",
          variant: "warning",
        });
        return;
      }

      if (!reservationForm.paymentCycle) {
        setNotice({
          message: "Rental spaces must use monthly duration.",
          variant: "warning",
        });
        return;
      }

      if (
        reservationForm.paymentCycle === "quarterly" &&
        reservationForm.duration < RESERVATION_LIMITS.rental_space.minMonths
      ) {
        setNotice({
          message: `Quarterly payment cycle requires at least ${RESERVATION_LIMITS.rental_space.minMonths} months.`,
          variant: "warning",
        });
        return;
      }

      if (!reservationForm.businessType.trim()) {
        setNotice({
          message: "Please enter your business type.",
          variant: "warning",
        });
        return;
      }

      const hasRentalConflict = blockingReservations.some((r) =>
        rangesOverlap(
          reservationForm.startDate,
          reservationForm.endDate,
          r.startDate,
          r.endDate
        )
      );

      if (hasRentalConflict) {
        setNotice({
          message: "This rental space is occupied for the selected lease period.",
          variant: "error",
        });
        return;
      }
    }

    if (selectedUnitData.type === "function_hall") {
      if (
        !reservationForm.startDate ||
        !reservationForm.endDate ||
        reservationForm.duration <= 0
      ) {
        setNotice({
          message: "Please select reservation dates first.",
          variant: "warning",
        });
        return;
      }

      const hasFunctionHallConflict = blockingReservations.some((r) =>
        rangesOverlap(
          reservationForm.startDate,
          reservationForm.endDate,
          r.startDate,
          r.endDate
        )
      );

      if (hasFunctionHallConflict) {
        setNotice({
          message: "This function hall is already reserved for the selected date(s).",
          variant: "error",
        });
        return;
      }

      if (
        !reservationForm.eventPurpose.trim() ||
        !reservationForm.attendees.trim()
      ) {
        setNotice({
          message: "Please complete the function hall reservation details.",
          variant: "warning",
        });
        return;
      }
    }

    if (selectedUnitData.type === "parking_slot") {
      if (!reservationForm.slotId) {
        setNotice({
          message: "Please select a specific parking slot before proceeding.",
          variant: "warning",
        });
        setIsSlotPanelOpen(true);
        return;
      }

      const selectedSlot = parkingSlots.find((s) => s.id === reservationForm.slotId);

      if (!selectedSlot) {
        setNotice({
          message: "Invalid slot selected.",
          variant: "error",
        });
        return;
      }

      if (ownReservedSlotIds.has(selectedSlot.id)) {
        setNotice({
          message: "You already have an active reservation for this parking slot.",
          variant: "warning",
        });
        return;
      }

      if (
        selectedSlot.isOccupied ||
        selectedSlot.status !== "active" ||
        reservedSlotIds.has(selectedSlot.id)
      ) {
        setNotice({
          message: "This parking slot is no longer available. Please select another.",
          variant: "error",
        });
        return;
      }

      if (
        !reservationForm.vehicleType.trim() ||
        !reservationForm.plateNumber.trim()
      ) {
        setNotice({
          message: "Please enter your vehicle information.",
          variant: "warning",
        });
        return;
      }
    }

    const durationBounds = getDurationBounds(
      selectedUnitData.type,
      reservationForm.durationType
    );

    if (
      reservationForm.duration < durationBounds.min ||
      reservationForm.duration > durationBounds.max
    ) {
      setNotice({
        message: `Please enter a valid duration between ${durationBounds.min} and ${durationBounds.max}.`,
        variant: "warning",
      });
      return;
    }

    const parsedAttendees = parseInt(reservationForm.attendees || "0", 10);

    const attendeesMax =
      selectedUnitData.type === "function_hall"
        ? Math.min(
            selectedUnitData.capacity ?? RESERVATION_LIMITS.attendees.max,
            RESERVATION_LIMITS.attendees.max
          )
        : RESERVATION_LIMITS.attendees.max;

    if (
      selectedUnitData.type === "function_hall" &&
      (Number.isNaN(parsedAttendees) ||
        parsedAttendees < RESERVATION_LIMITS.attendees.min ||
        parsedAttendees > attendeesMax)
    ) {
      setNotice({
        message: `Please enter attendees between ${RESERVATION_LIMITS.attendees.min} and ${attendeesMax}.`,
        variant: "warning",
      });
      return;
    }

    let normalizedStartDate = reservationForm.startDate;
    let normalizedEndDate = reservationForm.endDate;
    let normalizedDuration = reservationForm.duration;
    let normalizedDurationType = reservationForm.durationType;

    if (selectedUnitData.type === "function_hall") {
      const normalizedRange = buildFunctionHallRange(
        reservationForm.startDate!,
        reservationForm.endDate!
      );

      normalizedStartDate = normalizedRange.startDate;
      normalizedEndDate = normalizedRange.endDate;
      normalizedDuration = normalizedRange.duration;
      normalizedDurationType = normalizedRange.durationType;
    }

    if (!normalizedStartDate || !normalizedEndDate) {
      setNotice({
        message: "Please select reservation dates first.",
        variant: "warning",
      });
      return;
    }

    const reservationData: Omit<
      Reservation,
      "id" | "requestDate" | "status" | "paidAmount"
    > = {
      userId: user.id,
      unitId: selectedUnitData.id,
      unitName: selectedUnitData.name,
      unitType: selectedUnitData.type,
      startDate: normalizedStartDate.toISOString(),
      endDate: normalizedEndDate.toISOString(),
      duration: normalizedDuration,
      durationType: normalizedDurationType,
      modeOfVisit: reservationForm.modeOfVisit,
      paymentIntent: reservationForm.paymentIntent,
      paymentMethod: shouldShowPaymentSection
        ? reservationForm.paymentMethod
        : undefined,
      totalAmount: estimatedTotal,
      notes: reservationForm.notes,
    };

    if (selectedUnitData.type === "rental_space") {
      reservationData.paymentCycle = reservationForm.paymentCycle;
      reservationData.businessType = reservationForm.businessType.trim();
    }

    if (selectedUnitData.type === "function_hall") {
      reservationData.eventPurpose = reservationForm.eventPurpose.trim();
      reservationData.attendees = parsedAttendees;
    }

    if (selectedUnitData.type === "parking_slot") {
      reservationData.slotId = reservationForm.slotId;
      reservationData.vehicleType = reservationForm.vehicleType.trim();
      reservationData.plateNumber = reservationForm.plateNumber.trim();
    }

    if (requiresAppointment) {
      reservationData.appointmentDate = reservationForm.appointmentDate
        ? getDateInputValue(reservationForm.appointmentDate)
        : null;

      reservationData.appointmentTime = reservationForm.appointmentTime || null;
    }

    try {
      setIsSubmitting(true);

      await addReservation(reservationData);

      sendSystemNotification(
        user.id,
        isViewingOnly ? "Viewing Appointment Submitted" : "Reservation Request Submitted",
        isViewingOnly
          ? `Your viewing appointment request for ${selectedUnitData.name} has been submitted.`
          : `Your reservation request for ${selectedUnitData.name} has been submitted and is pending admin approval.`
      );

      setReservationSuccess(true);
      setTimeout(() => {
        setShowReservationModal(false);
        setReservationSuccess(false);
      }, 7000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit reservation. Please try again.";
      setNotice({
        message,
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  },
  [
  selectedUnitData,
  user,
  reservationForm,
  estimatedTotal,
  addReservation,
  sendSystemNotification,
  hasActivePaymentMethods,
  reservations,
  parkingSlots,
  reservedSlotIds,
  ownReservedSlotIds,
  isSubmitting,
  reservationIntent,
  requiresAppointment,
  shouldShowPaymentSection,
]
);

    const getAvailabilityBadgeClass = useCallback(
  (tone: "green" | "red" | "amber" | "gray" | "blue") => {
    switch (tone) {
      case "green":
        return "bg-green-50 text-green-700 border-green-200";
      case "red":
        return "bg-red-50 text-red-700 border-red-200";
      case "amber":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "blue":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "gray":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  },
  []
);

const calendarLegend = (
  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
      Legend
    </p>

    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm">
      <div className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-md border border-green-300 bg-green-200" />
        <span className="text-gray-600">Today</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-md border border-blue-300 bg-blue-200" />
        <span className="text-gray-600">Selected</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-md border border-blue-200 bg-blue-100" />
        <span className="text-gray-600">In range</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-md border border-red-300 bg-red-200" />
        <span className="text-gray-600">Unavailable</span>
      </div>
    </div>
  </div>
);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Browse units
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Secure a space or book an appointment for a tour
          </p>
        </header>

        {notice && (
          <AppNotice
            message={notice.message}
            variant={notice.variant}
            onClose={() => setNotice(null)}
            autoHideMs={4000}
          />
        )}

        {hasUnits && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex gap-2 sm:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center justify-center rounded-xl border border-gray-300 px-3 transition hover:bg-gray-50"
                type="button"
              >
                <Filter className="size-5 text-gray-600" />
              </button>
            </div>

            <div className="hidden gap-4 sm:flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as UnitType | "all")}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All Types</option>
                <option value="rental_space">Rental Spaces</option>
                <option value="function_hall">Function Halls</option>
                <option value="parking_slot">Parking Slots</option>
              </select>

              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {PRICE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc === "all" ? "All Locations" : loc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
  {filteredUnits.length > 0 ? (
    filteredUnits.map((unit) => {
      const unitReviews = reviews.filter(
        (r) => r.unit_id === (unit.id)
      );

      const averageRating =
        unitReviews.length > 0
          ? unitReviews.reduce((sum, r) => sum + (r.rating || 0), 0) /
            unitReviews.length
          : 0;

            const availability = unitAvailabilityMap.get(unit.id) ?? {
              status: "available",
              badgeText: "Available",
              badgeTone: "green" as const,
              reserveDisabled: false,
              reserveLabel: "Reserve Now",
            };

      return (
      <div
        key={unit.id}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out
                  hover:-translate-y-1 hover:shadow-xl hover:border-blue-200"
      >
        <div
          className="relative h-44 w-full overflow-hidden bg-gray-100"
          onMouseEnter={() => handleCardVideoEnter(unit.id)}
          onMouseLeave={() => handleCardVideoLeave(unit.id)}
        >
          {unit.videos?.[0] ? (
            <video
              ref={(node) => {
                videoRefs.current[unit.id] = node;
              }}
              src={unit.videos[0]}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={unit.images?.[0] || FALLBACK_IMAGE}
              alt={unit.name}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          )}

          {unit.videos?.length ? (
            <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white">
              {hoveredCardId === unit.id
                ? "Playing"
                : `${unit.videos.length} video${unit.videos.length > 1 ? "s" : ""}`}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <span className="mb-1 text-xs font-medium text-blue-600">
            {getUnitTypeLabel(unit.type)}
          </span>

          <div className="min-h-[42px]">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900">
              {unit.name}
            </h3>
          </div>

          <div className="mt-1 min-h-[40px]">
            <p className="line-clamp-2 text-sm text-gray-600">
              {unit.description?.trim() || "No description available"}
            </p>
          </div>

          <div className="mt-2 space-y-1 min-h-[40px]">
            {unit.location ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="size-3.5 text-red-500" />
                <span className="line-clamp-1">{unit.location}</span>
              </div>
            ) : (
              <div className="select-none text-xs text-transparent">placeholder</div>
            )}

            <div className="flex items-center gap-1 text-xs text-gray-600">
              {averageRating > 0 ? (
                <>
                  <span className="text-amber-500">★</span>
                  <span className="font-medium text-gray-900">
                    {averageRating.toFixed(1)}
                  </span>
                  <span className="text-gray-400">
                    ({unitReviews.length})
                  </span>
                </>
              ) : (
                <span className="text-gray-400">No ratings yet</span>
              )}
            </div>
          </div>

                    <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getAvailabilityBadgeClass(
                  availability.badgeTone
                )}`}
              >
                {availability.badgeText}
              </span>

              {unit.capacity ? (
                <span className="text-xs font-medium text-gray-600">
                  {unit.capacity} pax
                </span>
              ) : null}
            </div>

            {availability.nextAvailableText ? (
              <p className="text-xs text-gray-500">{availability.nextAvailableText}</p>
            ) : (
              <div className="min-h-[16px]" />
            )}

            <div className="flex min-h-[44px] items-end justify-between">
              <div>
                <div className="text-base font-bold text-blue-600">
                  {formatCurrency(unit.price)}
                </div>
                <div className="text-xs text-gray-500">
                  {unit.type === "rental_space"
                    ? "per month"
                    : getPriceLabel(unit.type)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <button
              onClick={() => handleReserveNow(unit.id)}
              disabled={availability.reserveDisabled}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition ${
                availability.reserveDisabled
                  ? "cursor-not-allowed bg-gray-300"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {availability.reserveLabel}
            </button>
          </div>
        </div>
      </div>
    )})
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="col-span-1 md:col-span-2 lg:col-span-3"
    >
      <EmptyState
        icon={<House className="size-10 text-blue-500" />}
        title="No units found"
        description="Try adjusting your search or filters to browse units and view their current availability."
      />
    </motion.div>
  )}
</div>

        {showFilterModal && hasUnits && (
          <div className="fixed inset-0 z-50 flex items-end sm:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setShowFilterModal(false)}
            />
            <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button onClick={() => setShowFilterModal(false)} type="button">
                  <X className="size-6 text-gray-500" />
                </button>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm text-gray-600">
                  Unit Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as UnitType | "all")}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">All Types</option>
                  <option value="rental_space">Rental Spaces</option>
                  <option value="function_hall">Function Halls</option>
                  <option value="parking_slot">Parking Slots</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1 block text-sm text-gray-600">
                  Price Range
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {PRICE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="mb-1 block text-sm text-gray-600">
                  Location
                </label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc === "all" ? "All Locations" : loc}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowFilterModal(false)}
                type="button"
                className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {showReservationModal && selectedUnitData && (
          <div className="fixed inset-0 z-50 bg-black/40 p-4 sm:p-6">
            <div className="flex h-full items-center justify-center">
              <div
                className={`flex max-h-[95vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${
                  reservationSuccess ? 'max-w-md' : 'max-w-5xl'
                }`}
              >
                        <div
            className={`flex items-start justify-between border-b border-gray-100 ${
              reservationSuccess ? 'px-5 py-4' : 'px-6 py-5'
            }`}
          >
                <div>
                  <div className={`mb-1 ${reservationSuccess ? 'text-xs' : 'text-sm'} font-medium text-blue-600`}>
                  {getUnitTypeLabel(selectedUnitData.type)}
                </div>

                <h2 className={`${reservationSuccess ? 'text-lg' : 'text-xl'} font-bold text-gray-900`}>
                  {selectedUnitData.name}
                </h2>

                <div className={`mt-1 ${reservationSuccess ? 'text-xs' : 'text-sm'} text-gray-500`}>
                  📍 {selectedUnitData.location}
                </div>
                </div>

                <button
                  onClick={handleCloseReservationModal}
                  type="button"
                  className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="size-6" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] px-1 scroll-smooth">
  {reservationSuccess ? (
    <div className="flex justify-center p-4 sm:p-5">
    <div className="w-full max-w-md rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 text-center shadow-sm">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="size-6 text-green-600" />
      </div>

      <h3 className="text-base font-bold text-gray-900">
        Reservation Request Submitted
      </h3>

      <p className="mt-1 text-sm text-gray-600">
        Your reservation for <strong>{selectedUnitData.name}</strong> is now pending admin approval.
      </p>

      <div className="mt-4 space-y-2 text-left">
        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Schedule
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {formatDate(reservationForm.startDate)} – {formatDate(reservationForm.endDate)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Visit Mode
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {reservationForm.modeOfVisit === 'onsite'
              ? 'On-site Visit'
              : 'Online / Digital Process'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Location
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {selectedUnitData.location}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Estimated Total
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {isViewingOnly
                ? 'No payment required'
                : selectedUnitData.type === "rental_space"
                  ? formatCurrency(estimatedTotal) + ' total lease'
                  : formatCurrency(estimatedTotal)}
            </p>
          </div>
        </div>
      </div>

        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          We’ll notify you once your request has been reviewed.
        </div>
      </div>
    </div>
  ) : (
                <div className="p-6 sm:p-7">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <div className="relative mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                        {isVideoUrl(selectedUnitMedia[safeCurrentMediaIndex]) ? (
                          <video
                            key={selectedUnitMedia[safeCurrentMediaIndex]}
                            src={selectedUnitMedia[safeCurrentMediaIndex]}
                            controls
                            autoPlay
                            muted
                            playsInline
                            preload="metadata"
                            className="h-56 w-full object-cover"
                          />
                        ) : (
                          <img
                            key={selectedUnitMedia[safeCurrentMediaIndex]}
                            src={selectedUnitMedia[safeCurrentMediaIndex]}
                            alt={selectedUnitData.name}
                            className="h-56 w-full object-cover"
                          />
                        )}

                        {isVideoUrl(selectedUnitMedia[safeCurrentMediaIndex]) && (
                          <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white">
                            Video
                          </span>
                        )}

                        {selectedUnitMedia.length > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              type="button"
                              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition hover:bg-white"
                            >
                              <ChevronLeft className="size-5" />
                            </button>

                            <button
                              onClick={nextImage}
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition hover:bg-white"
                            >
                              <ChevronRight className="size-5" />
                            </button>
                          </>
                        )}
                      </div>

                      {selectedUnitMedia.length > 1 && (
                        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {selectedUnitMedia.map((media, index) => (
                            <button
                              key={`${media}-${index}`}
                              type="button"
                              onClick={() => setCurrentImageIndex(index)}
                              className={`overflow-hidden rounded-xl border ${
                                index === safeCurrentMediaIndex
                                  ? "border-blue-500 ring-2 ring-blue-200"
                                  : "border-gray-200"
                              }`}
                            >
                              {isVideoUrl(media) ? (
                                <div className="relative h-16 w-20 bg-gray-100">
                                  <video
                                    src={media}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                                    Video
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={media}
                                  alt={`Media ${index + 1}`}
                                  className="h-16 w-20 object-cover"
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="mb-4 text-sm leading-relaxed text-gray-600">
                        {selectedUnitData.description}
                      </p>

                      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">Price</p>
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(selectedUnitData.price)}{" "}
                          <span className="text-sm font-medium text-gray-500">
                            {getPriceLabel(selectedUnitData.type)}
                          </span>
                        </div>
                        {selectedUnitData.minimumPaymentPercent && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-xs text-amber-800">
                            Minimum initial payment:{" "}
                            <strong>{selectedUnitData.minimumPaymentPercent}%</strong> of total amount.
                          </div>
                        )}

                        <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-xs text-gray-600">
                          {selectedUnitData.type === "rental_space" &&
                            "Payments follow your selected billing cycle."}
                          {selectedUnitData.type === "function_hall" &&
                            "Partial payments are allowed until the event is fully paid."}
                          {selectedUnitData.type === "parking_slot" &&
                            "Partial payments may be allowed, but monthly dues must be completed on time."}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        <p>
                          Minimum Duration:{" "}
                          <span className="font-semibold text-gray-900">
                            {getMinimumDuration(selectedUnitData.type).value}{" "}
                            {getMinimumDuration(selectedUnitData.type).unit}
                          </span>
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleReservationSubmit} className="space-y-4 pb-1">
                      <div className="space-y-4 rounded-2xl border border-gray-200 p-4">
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700">
      How do you want to proceed?
    </label>
    <select
      value={reservationForm.modeOfVisit}
      onChange={(e) => handleModeChange(e.target.value as VisitMode)}
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <option value="online">Reserve Online</option>
      <option value="onsite">Visit On-site First</option>
    </select>
  </div>

  {reservationForm.modeOfVisit === "onsite" && (
    <div className="border-t border-gray-200 pt-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Appointment Date
        </label>
        <input
          type="date"
          value={getDateInputValue(reservationForm.appointmentDate)}
          min={getDateInputValue(new Date())}
          onChange={(e) =>
            setReservationForm((prev) => ({
              ...prev,
              appointmentDate: e.target.value
                ? new Date(`${e.target.value}T00:00:00`)
                : undefined,
            }))
          }
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="mt-4">
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Appointment Time
  </label>

  <div className="relative" ref={timeSelectRef}>
    <button
      type="button"
      onClick={() => setIsTimeSelectOpen((prev) => !prev)}
      className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-left outline-none transition hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
    >
      <span
        className={
          reservationForm.appointmentTime ? "text-gray-900" : "text-gray-400"
        }
      >
        {reservationForm.appointmentTime
          ? formatTimeLabel(reservationForm.appointmentTime)
          : "Select appointment time"}
      </span>

      <ChevronDown
        className={`size-4 text-blue-500 transition-transform ${
          isTimeSelectOpen ? "rotate-180" : ""
        }`}
      />
    </button>

    {isTimeSelectOpen && (
      <div className="absolute z-30 mt-2 max-h-64 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="max-h-64 overflow-y-auto py-1">
          {appointmentTimeOptions.map((time) => {
            const isSelected = reservationForm.appointmentTime === time;

            return (
              <button
                key={time}
                type="button"
                onClick={() => {
                  setReservationForm((prev) => ({
                    ...prev,
                    appointmentTime: time,
                  }));
                  setIsTimeSelectOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-left text-sm transition ${
                  isSelected
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{formatTimeLabel(time)}</span>
                {isSelected ? <Check className="size-4" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    )}
  </div>

  <p className="mt-2 text-xs text-gray-500">
    Available visiting hours: 9:00 AM to 5:00 PM
  </p>
</div>

      <label className="mt-6 mb-2 block text-sm font-medium text-gray-700">
        What is the goal of your visit?
      </label>

      <div className="space-y-2">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
            reservationForm.paymentIntent === "pay_later"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name="paymentIntent"
            value="pay_later"
            checked={reservationForm.paymentIntent === "pay_later"}
            onChange={(e) =>
              setReservationForm((prev) => ({
                ...prev,
                paymentIntent: e.target.value as PaymentIntent,
              }))
            }
            className="mt-1 size-4 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Book Viewing Only
            </p>
            <p className="text-xs text-gray-500">
              I want to tour the unit first. No payment is required for the visit.
            </p>
          </div>
        </label>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
            reservationForm.paymentIntent === "pay_onsite"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name="paymentIntent"
            value="pay_onsite"
            checked={reservationForm.paymentIntent === "pay_onsite"}
            onChange={(e) =>
              setReservationForm((prev) => ({
                ...prev,
                paymentIntent: e.target.value as PaymentIntent,
              }))
            }
            className="mt-1 size-4 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Reserve with On-site Visit
            </p>
            <p className="text-xs text-gray-500">
              Submit a reservation request and complete the visit onsite. Approval is still required before payment is finalized.
            </p>
          </div>
        </label>
      </div>

      {isViewingOnly && (
        <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-3 text-sm text-green-800">
          Viewing only selected. No payment method is required for this appointment.
        </div>
      )}
    </div>
  )}
</div>

                      {selectedUnitData.type === "parking_slot" && (
                        <>
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                            Parking spaces require a{" "}
                            <strong>minimum occupancy of 1 month</strong>.
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Reservation Period (Minimum 1 Month)
                            </label>

                            <button
                              type="button"
                              onClick={() => setShowCalendar((s) => !s)}
                              className="flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-left text-sm transition hover:border-blue-400"
                            >
                              <span>
                                {`${formatDate(reservationForm.startDate)} - ${formatDate(reservationForm.endDate)}`}
                              </span>
                            </button>

                            {showCalendar && (
                              <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                                <Calendar
                                  value={reservationForm.startDate}
                                  selectRange={false}
                                  minDate={getTomorrow()}
                                  onChange={(value) => {
                                    if (value instanceof Date) {
                                      const newStart = new Date(value);
                                      newStart.setHours(0, 0, 0, 0);

                                      setReservationForm((prev) => ({
                                        ...prev,
                                        startDate: newStart,
                                        endDate: computeEndFromForm(newStart, 1, "months"),
                                        duration: 1,
                                        durationType: "months",
                                      }));
                                      setShowCalendar(false);
                                    }
                                  }}
                                  className="w-full border-0"
                                />
                                {calendarLegend}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Calculated Duration
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={`${reservationForm.duration} month(s)`}
                              className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                              Parking Slot
                            </label>

                            {selectedSlotObject ? (
                              <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-3 shadow-sm">
                                <img
                                  src={selectedSlotObject.imageUrl || FALLBACK_IMAGE}
                                  alt={
                                    selectedSlotObject.slotCode ||
                                    selectedSlotObject.label ||
                                    "Parking Slot"
                                  }
                                  className="h-20 w-28 rounded-xl object-cover"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs uppercase tracking-wide text-gray-500">
                                    Selected Slot
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">
                                    You may reserve another slot as a separate request, subject to admin approval.
                                  </p>
                                   <p className="truncate text-lg font-bold text-blue-700">
                                    {selectedSlotObject.slotCode ||
                                      selectedSlotObject.label ||
                                      "Parking Slot"}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setIsSlotPanelOpen(true)}
                                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                                  >
                                    Change
                                  </button>
                                  <button
                                    type="button"
                                    onClick={clearSlotSelection}
                                    className="rounded-xl p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                    aria-label="Clear selection"
                                  >
                                    <X className="size-5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsSlotPanelOpen(true)}
                                className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-medium text-gray-500 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                              >
                                Click to View & Select a Slot
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Vehicle Type
                            </label>
                            <input
                              type="text"
                              required
                              value={reservationForm.vehicleType}
                              onChange={(e) =>
                                setReservationForm((prev) => ({
                                  ...prev,
                                  vehicleType: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              placeholder="e.g., Sedan, SUV, Motorcycle"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Plate Number
                            </label>
                            <input
                              type="text"
                              required
                              value={reservationForm.plateNumber}
                              onChange={(e) =>
                                setReservationForm((prev) => ({
                                  ...prev,
                                  plateNumber: e.target.value.toUpperCase(),
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              placeholder="ABC 1234"
                            />
                          </div>
                        </>
                      )}

                      {selectedUnitData.type === "function_hall" && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Reservation Dates
                            </label>

                            <button
                              type="button"
                              onClick={() => setShowCalendar((s) => !s)}
                              className="flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-left text-sm transition hover:border-blue-400"
                            >
                              <span className={reservationForm.startDate && reservationForm.endDate && reservationForm.duration > 0
                                ? "text-gray-900"
                                : "text-gray-400"}
                              >
                                {reservationForm.startDate &&
                                reservationForm.endDate &&
                                reservationForm.duration > 0
                                  ? `${formatDate(reservationForm.startDate)} - ${formatDate(reservationForm.endDate)}`
                                  : "Please select reservation dates"}
                              </span>

                              <CalendarDays className="ml-3 size-4 shrink-0 text-blue-500" />
                            </button>

                            {showCalendar && (
                              <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                                <Calendar
                                  tileDisabled={isCalendarTileDisabled}
                                  tileClassName={getCalendarTileClassName}
                                  onChange={(value) => {
                                    if (!(value instanceof Date)) return;

                                    const clickedDate = startOfLocalDay(new Date(value));

                                    const currentStart = reservationForm.startDate
                                      ? startOfLocalDay(reservationForm.startDate)
                                      : null;

                                    const currentEnd = reservationForm.endDate
                                      ? startOfLocalDay(reservationForm.endDate)
                                      : null;

                                    const applyRange = (rangeStart: Date, rangeEnd: Date) => {
                                      const safeStart = startOfLocalDay(rangeStart);
                                      const safeEndDay = startOfLocalDay(rangeEnd);
                                      const adjustedEnd = endOfLocalDay(safeEndDay);

                                      const rawDayCount =
                                        Math.floor(
                                          (safeEndDay.getTime() - safeStart.getTime()) /
                                            (1000 * 60 * 60 * 24)
                                        ) + 1;

                                      if (rawDayCount < RESERVATION_LIMITS.function_hall.minDays) {
                                        setFunctionHallConflictMessage(
                                          `Minimum reservation is ${RESERVATION_LIMITS.function_hall.minDays} day(s).`
                                        );
                                        return false;
                                      }

                                      if (rawDayCount > RESERVATION_LIMITS.function_hall.maxDays) {
                                        setFunctionHallConflictMessage(
                                          `Maximum reservation is ${RESERVATION_LIMITS.function_hall.maxDays} day(s).`
                                        );
                                        return false;
                                      }

                                      const hasConflict = selectedUnitBlockingReservations.some((r) =>
                                        rangesOverlap(safeStart, adjustedEnd, r.startDate, r.endDate)
                                      );

                                      if (hasConflict) {
                                        setFunctionHallConflictMessage(
                                          "Please select one continuous available date range. Separate date groups require separate reservations."
                                        );
                                        return false;
                                      }

                                      setReservationForm((prev) => ({
                                        ...prev,
                                        startDate: safeStart,
                                        endDate: adjustedEnd,
                                        duration: rawDayCount,
                                        durationType: "days",
                                      }));
                                      setFunctionHallConflictMessage("");
                                      return true;
                                    };

                                    // no selection yet -> start with one day
                                    if (!currentStart || !currentEnd) {
                                      setReservationForm((prev) => ({
                                        ...prev,
                                        startDate: clickedDate,
                                        endDate: endOfLocalDay(clickedDate),
                                        duration: 1,
                                        durationType: "days",
                                      }));
                                      setFunctionHallConflictMessage("");
                                      setIsSelectingRangeEnd(true);
                                      return;
                                    }

                                    // currently choosing the second click
                                    if (isSelectingRangeEnd) {
                                      const tentativeStart =
                                        clickedDate.getTime() < currentStart.getTime()
                                          ? clickedDate
                                          : currentStart;

                                      const tentativeEnd =
                                        clickedDate.getTime() < currentStart.getTime()
                                          ? currentStart
                                          : clickedDate;

                                      const applied = applyRange(tentativeStart, tentativeEnd);

                                      if (applied) {
                                        setIsSelectingRangeEnd(false);
                                      }
                                      return;
                                    }

                                    // range already exists -> adjust whichever edge is closer
                                    const distanceToStart = Math.abs(
                                      clickedDate.getTime() - currentStart.getTime()
                                    );
                                    const distanceToEnd = Math.abs(
                                      clickedDate.getTime() - currentEnd.getTime()
                                    );

                                    const nextStart =
                                      distanceToStart <= distanceToEnd ? clickedDate : currentStart;

                                    const nextEnd =
                                      distanceToStart <= distanceToEnd ? currentEnd : clickedDate;

                                    const normalizedStart =
                                      nextStart.getTime() <= nextEnd.getTime() ? nextStart : nextEnd;
                                    const normalizedEnd =
                                      nextStart.getTime() <= nextEnd.getTime() ? nextEnd : nextStart;

                                    applyRange(normalizedStart, normalizedEnd);
                                  }}
                                  value={
                                    reservationForm.startDate && reservationForm.endDate
                                      ? [reservationForm.startDate, reservationForm.endDate]
                                      : reservationForm.startDate ?? undefined
                                  }
                                  selectRange={false}
                                  minDate={getTomorrow()}
                                  defaultActiveStartDate={getTomorrow()}
                                  className="w-full border-0"
                                />

                                {calendarLegend}

                                <div className="mt-3 flex items-center justify-between gap-3">
                                  <p className="text-xs leading-5 text-amber-700">
                                    Function hall reservations must be one continuous available date range.
                                    If you need dates separated by unavailable days, please submit separate reservations.
                                  </p>

                                  {(reservationForm.startDate || reservationForm.endDate) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReservationForm((prev) => ({
                                          ...prev,
                                          startDate: undefined,
                                          endDate: undefined,
                                          duration: 0,
                                          durationType: "days",
                                        }));
                                        setFunctionHallConflictMessage("");
                                        setIsSelectingRangeEnd(false);
                                      }}
                                      className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-xs font-medium text-red-700 transition hover:bg-red-100"
                                    >
                                      Clear dates
                                    </button>
                                  )}
                                </div>

                                {functionHallConflictMessage ? (
                                  <p className="mt-2 text-xs font-medium text-red-600">
                                    {functionHallConflictMessage}
                                  </p>
                                ) : null}
                              </div>
                            )}

                            <div className="mt-4">
                              <label className="mb-2 block text-sm text-gray-700">
                                Calculated Duration
                              </label>
                              <input
                                type="text"
                                readOnly
                                value={
                                  reservationForm.duration > 0
                                    ? `${reservationForm.duration} day(s)`
                                    : ""
                                }
                                placeholder="Duration will appear here"
                                className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Event Purpose
                            </label>
                            <input
                              type="text"
                              required
                              value={reservationForm.eventPurpose}
                              onChange={(e) =>
                                setReservationForm((prev) => ({
                                  ...prev,
                                  eventPurpose: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              placeholder="e.g., Wedding, Conference, Birthday"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Number of Attendees
                            </label>
                            <input
                              type="number"
                              required
                              min={RESERVATION_LIMITS.attendees.min}
                              max={Math.min(
                                selectedUnitData.capacity ?? RESERVATION_LIMITS.attendees.max,
                                RESERVATION_LIMITS.attendees.max
                              )}
                              step={1}
                              value={reservationForm.attendees}
                              onChange={(e) =>
                                setReservationForm((prev) => ({
                                  ...prev,
                                  attendees: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </div>
                        </>
                      )}

                      {selectedUnitData.type === "rental_space" && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Lease Start Date
                            </label>

                            <button
                              type="button"
                              onClick={() => setShowCalendar((s) => !s)}
                              className="flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-left text-sm transition hover:border-blue-400"
                            >
                              <span className={reservationForm.startDate ? "text-gray-900" : "text-gray-400"}>
                                {reservationForm.startDate
                                  ? formatDate(reservationForm.startDate)
                                  : "Please select lease start date"}
                              </span>

                              <CalendarDays className="ml-3 size-4 shrink-0 text-blue-500" />
                            </button>

                            {showCalendar && (
                              <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                                <Calendar
                                  value={reservationForm.startDate ?? undefined}
                                  tileDisabled={isCalendarTileDisabled}
                                  tileClassName={getCalendarTileClassName}
                                  selectRange={false}
                                  minDate={getTomorrow()}
                                  defaultActiveStartDate={getTomorrow()}
                                  onChange={(value) => {
                                    if (value instanceof Date) {
                                      const newStart = new Date(value);
                                      newStart.setHours(0, 0, 0, 0);

                                      setReservationForm((prev) => ({
                                        ...prev,
                                        startDate: newStart,
                                        endDate: computeEndFromForm(
                                          newStart,
                                          prev.duration,
                                          "months"
                                        ),
                                      }));
                                      setShowCalendar(false);
                                    }
                                  }}
                                  className="w-full border-0"
                                />
                                {calendarLegend}
                              </div>
                            )}
                          </div>

                          <div>
                          <label className="mb-2 mt-4 block text-sm text-gray-700">
                            Lease Duration (months)
                          </label>
                          <input
                            type="number"
                            required
                            min={RESERVATION_LIMITS.rental_space.minMonths}
                            max={RESERVATION_LIMITS.rental_space.maxMonths}
                            step={1}
                            value={reservationForm.duration}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);

                              const safeDuration = clampNumber(
                                Number.isNaN(parsed)
                                  ? RESERVATION_LIMITS.rental_space.minMonths
                                  : parsed,
                                RESERVATION_LIMITS.rental_space.minMonths,
                                RESERVATION_LIMITS.rental_space.maxMonths
                              );

                              setReservationForm((prev) => {
                                const safeStartDate = prev.startDate ?? getTomorrow();

                                return {
                                  ...prev,
                                  startDate: safeStartDate,
                                  duration: safeDuration,
                                  durationType: "months",
                                  paymentCycle:
                                  prev.paymentCycle === "quarterly" &&
                                  safeDuration < RESERVATION_LIMITS.rental_space.minMonths
                                    ? "monthly"
                                    : prev.paymentCycle,
                                  endDate: computeEndFromForm(
                                    safeStartDate,
                                    safeDuration,
                                    "months"
                                  ),
                                };
                              });
                            }}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            Minimum 12 months (1 year), maximum {RESERVATION_LIMITS.rental_space.maxMonths} months.
                          </p>
                        </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm text-gray-700">
                              Lease End Date (Auto-calculated)
                            </label>
                            <input
                              type="text"
                              readOnly
                              value={formatDate(reservationForm.endDate)}
                              className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Payment Cycle
                            </label>
                            <select
                              value={reservationForm.paymentCycle}
                              onChange={(e) => {
                                const nextCycle = e.target.value as PaymentCycle;

                                if (nextCycle === "quarterly" && reservationForm.duration < 3) {
                                  return;
                                }

                                setReservationForm((prev) => ({
                                  ...prev,
                                  paymentCycle: nextCycle,
                                }));
                              }}
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                              <option value="monthly">Monthly Installments</option>
                              <option
                                value="quarterly"
                                disabled={reservationForm.duration < 3}
                              >
                                Quarterly Payments
                              </option>
                              <option value="full">Full Payment</option>
                            </select>

                            {reservationForm.duration < 3 && (
                              <p className="mt-2 text-xs text-amber-600">
                                Quarterly payment is available only for lease durations of at least 3 months.
                              </p>
                            )}
                          </div>

                          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                              Billing Summary
                            </p>

                            <div className="mt-2 space-y-1 text-sm text-gray-700">
                              <div className="flex items-center justify-between gap-4">
                                <span>Monthly rate</span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(rentalMonthlyAmount)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <span>
                                  {reservationForm.paymentCycle === "quarterly"
                                    ? "Quarterly minimum"
                                    : reservationForm.paymentCycle === "full"
                                      ? "Full payment"
                                      : "Monthly minimum"}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(rentalRequiredPayment)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-4 border-t border-blue-100 pt-2">
                                <span>Total lease amount</span>
                                <span className="font-bold text-blue-700">
                                  {formatCurrency(estimatedTotal)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm text-gray-700">
                              Business Type
                            </label>
                            <input
                              type="text"
                              required
                              value={reservationForm.businessType}
                              onChange={(e) =>
                                setReservationForm((prev) => ({
                                  ...prev,
                                  businessType: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              placeholder="e.g., Retail, Office, Restaurant"
                            />
                          </div>
                        </>
                      )}

                      {shouldShowPaymentSection && (
                        <div>
                          <label className="mb-2 block text-sm text-gray-700">
                            Payment Method
                          </label>

                          {hasActivePaymentMethods ? (
                            <select
                              value={reservationForm.paymentMethod}
                              onChange={(e) =>
                                setReservationForm((prev) => ({
                                  ...prev,
                                  paymentMethod: e.target.value as PaymentMethod,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                              {activePaymentMethods.map((method) => (
                                <option key={method.id} value={method.methodCode}>
                                  {method.displayName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                              No payment methods are available right now.
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="mb-2 block text-sm text-gray-700">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          value={reservationForm.notes}
                          onChange={(e) =>
                            setReservationForm((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          rows={3}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          placeholder="Any special requests or requirements"
                        />
                      </div>

                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="mb-2 text-sm font-semibold text-amber-900">Policies / Agreement</p>

                        <div className="max-h-32 overflow-y-auto rounded-xl border border-amber-100 bg-white p-3 text-sm leading-relaxed text-gray-700">
                          {selectedUnitData.policies?.trim() || "No policies provided for this unit."}
                        </div>

                      {selectedUnitData.contractFilePath ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => {
                              const { data } = supabase.storage
                                .from("unit_contracts")
                                .getPublicUrl(selectedUnitData.contractFilePath!);

                              if (data?.publicUrl) {
                                window.open(data.publicUrl, "_blank", "noopener,noreferrer");
                              }
                            }}
                            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm sm:text-base text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                          >
                            View Contract PDF
                          </button>
                        </div>
                      ) : null}

                      <label className="mt-3 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={reservationForm.agreedToPolicies}
                          onChange={(e) =>
                            setReservationForm((prev) => ({
                              ...prev,
                              agreedToPolicies: e.target.checked,
                            }))
                          }
                          className="mt-1 size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          I have read and agree to the policies and terms for this unit.
                        </span>
                      </label>
                      </div>
                

                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-1 text-sm text-gray-600">
                          {isViewingOnly ? "Appointment Summary" : "Reservation Summary"}
                        </p>

                        <div className="text-lg font-bold text-gray-900">
                          {isViewingOnly ? "No payment required" : formatCurrency(estimatedTotal)}
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          {isViewingOnly
                            ? "* This request is for viewing only and does not require payment."
                            : "* Reservation requests are subject to admin approval before payment is finalized."}
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting
                          ? "Submitting..."
                          : isViewingOnly
                            ? "Book Viewing Appointment"
                            : reservationIntent === "reserve_onsite"
                              ? "Submit Reservation & Visit Request"
                              : "Submit Reservation Request"}
                      </button>
                                          </form>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
          </div>
        )}

        {isSlotPanelOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-100/80 p-4 "
            onClick={() => setIsSlotPanelOpen(false)}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Select Your Parking Slot
                  </h3>
                  <p className="text-sm text-slate-500">
                    Choose from the available slots below.
                  </p>
                </div>

                <button
                  onClick={() => setIsSlotPanelOpen(false)}
                  type="button"
                  className="rounded-full p-2 text-slate-500 transition hover:bg-white hover:text-slate-800"
                >
                  <X className="size-6" />
                </button>
              </div>

              <div className="overflow-y-auto p-6">
                {unitParkingSlots.length === 0 ? (
                <EmptyState
                  icon={<House className="size-10 text-blue-500" />}
                  title="No parking slots found"
                  description="There are no parking slots available for this parking area."
                />
              ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {unitParkingSlots.map((slot) => {
  const slotState = getParkingSlotState(slot);
  const isSelected = reservationForm.slotId === slot.id;
  const isSelectable = !slotState.isDisabled;

  return (
    <button
      type="button"
      key={slot.id}
      disabled={!isSelectable}
      onClick={() => handleSlotSelectFromPanel(slot.id)}
      className={`group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all ${
        isSelected
          ? "scale-[1.02] border-blue-600 ring-4 ring-blue-100"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
      } ${slotState.isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {isSelected && (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-blue-600 p-1.5 text-white shadow">
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      <img
        src={slot.imageUrl || FALLBACK_IMAGE}
        alt={slot.slotCode || slot.label || "Parking Slot"}
        className="h-36 w-full object-cover"
      />

      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Parking Slot
          </p>
          <h4 className="truncate text-lg font-bold text-slate-900">
            {slot.slotCode || slot.label || "Parking Slot"}
          </h4>
        </div>

        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${slotState.statusClassName}`}
        >
          {slotState.statusText}
        </span>
      </div>
    </button>
  );
})}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}