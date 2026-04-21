import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import "react-calendar/dist/Calendar.css";
import { useClientData } from "../../contexts/ClientDataContext";
import type { UnitType } from "../../contexts/DataContext";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useUnits } from '../../contexts/UnitsContext';    
import { useReviews } from '../../contexts/ReviewsContext';
import { usePaymentMethods } from '../../contexts/PaymentMethodsContext';
import type { Reservation } from '../../data/types';
import { formatDate } from '../../utils/date';
import supabase from "../../supabaseClient";
import AppNotice from "../../components/common/AppNotice";
import ReservationUnitDetailsPanel from "../../components/reservations/shared/ReservationUnitDetailsPanel";
import ReservationVisitFlowSection from "../../components/reservations/shared/ReservationVisitFlowSection";
import ReservationPaymentSection from "../../components/reservations/shared/ReservationPaymentSection";
import ReservationSummarySection from "../../components/reservations/shared/ReservationSummarySection";
import ParkingSlotPanel from "../../components/reservations/parking/ParkingSlotPanel";
import {
  sanitizePlainText,
} from "../../utils/DataNormalization";
import {
  buildFunctionHallRange,
  isSameLocalDay,
  startOfLocalDay,
  endOfLocalDay,
} from "../../components/reservations/functionHall/functionHall.utils";
import {
  RESERVATION_LIMITS,
  computeEndFromForm,
  clampNumber,
  getDurationBounds,
  buildInitialReservationForm,
} from "../../components/reservations/shared/reservation.utils";

import ParkingReservationForm from "../../components/reservations/parking/ParkingReservationForm";
import RentalReservationForm from "../../components/reservations/rental/RentalSpaceReservationForm";
import FunctionHallReservationForm from "../../components/reservations/functionHall/FunctionHallReservationForm";
import UnitTaxonomyBadges from "../../components/common/UnitTaxonomyBadges";

import {
  Search,
  Filter,
  X,
  House,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  getUnitTypeLabel,
  getPriceLabel,
  calculateTotalAmount,
} from "../../utils/propertyHelpers";

import {
  APPOINTMENT_TIME_STEP_SECONDS,
  buildAppointmentTimeOptions,
  formatTimeLabel,
  getDateInputValue,
  getFunctionHallAvailability,
  getMaxReservationDate,
  getParkingAvailability,
  getRentalAvailability,
  isBlockingReservation,
  isSameDay,
  rangesOverlap,
} from "../../components/reservations/shared/clientReservation.helpers";

import EmptyState from '../../components/common/EmptyState';

import type {
  DurationType,
  PaymentMethod,
  ReservationForm,
  ReservationIntent,
  UnitAvailability,
  VisitMode,
} from "../../components/reservations/shared/reservation.types";

const FALLBACK_IMAGE =
  "https://placehold.co/1200x800/e5e7eb/6b7280?text=No+Image";


function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(url);
}

type PriceFilterModalProps = {
  isOpen: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  onMinPriceChange: (value: number | null) => void;
  onMaxPriceChange: (value: number | null) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
};

function PriceFilterModal({
  isOpen,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApply,
  onReset,
  onClose,
}: PriceFilterModalProps) {
  if (!isOpen) return null;


  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Set Range</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Close filter"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Price Range Slider */}
{/* Price Range Slider */}
<div className="space-y-3">
  <label className="text-xs font-semibold uppercase tracking-widest text-slate-600">
    Price Range (₱)
  </label>

 <div className="relative h-6">
  {/* Background Track */}
  <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-1 w-full rounded-full bg-slate-200" />

  {/* Active Range */}
  <div
    className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-blue-500"
    style={{
      left: `${((minPrice ?? 0) / 100000) * 100}%`,
      width: `${(((maxPrice ?? 100000) - (minPrice ?? 0)) / 100000) * 100}%`,
    }}
  />

  {/* Min Slider */}
  <input
    type="range"
    min={0}
    max={100000}
    step={500}
    value={minPrice ?? 0}
    onChange={(e) =>
      onMinPriceChange(Math.min(Number(e.target.value), maxPrice ?? 100000))
    }
    className="absolute inset-0 h-full w-full appearance-none bg-transparent pointer-events-none
      [&::-webkit-slider-thumb]:pointer-events-auto
      [&::-webkit-slider-thumb]:appearance-none
      [&::-webkit-slider-thumb]:h-4
      [&::-webkit-slider-thumb]:w-4
      [&::-webkit-slider-thumb]:rounded-full
      [&::-webkit-slider-thumb]:border-2
      [&::-webkit-slider-thumb]:border-white
      [&::-webkit-slider-thumb]:bg-blue-600
      [&::-webkit-slider-thumb]:shadow
      [&::-webkit-slider-thumb]:-mt-1.5
      [&::-moz-range-thumb]:pointer-events-auto
      [&::-moz-range-thumb]:h-4
      [&::-moz-range-thumb]:w-4
      [&::-moz-range-thumb]:rounded-full
      [&::-moz-range-thumb]:border-2
      [&::-moz-range-thumb]:border-white
      [&::-moz-range-thumb]:bg-blue-600
      [&::-moz-range-thumb]:shadow"
  />

  {/* Max Slider */}
  <input
    type="range"
    min={0}
    max={100000}
    step={500}
    value={maxPrice ?? 100000}
    onChange={(e) =>
      onMaxPriceChange(Math.max(Number(e.target.value), minPrice ?? 0))
    }
    className="absolute inset-0 h-full w-full appearance-none bg-transparent pointer-events-none
      [&::-webkit-slider-thumb]:pointer-events-auto
      [&::-webkit-slider-thumb]:appearance-none
      [&::-webkit-slider-thumb]:h-4
      [&::-webkit-slider-thumb]:w-4
      [&::-webkit-slider-thumb]:rounded-full
      [&::-webkit-slider-thumb]:border-2
      [&::-webkit-slider-thumb]:border-white
      [&::-webkit-slider-thumb]:bg-blue-600
      [&::-webkit-slider-thumb]:shadow
      [&::-webkit-slider-thumb]:-mt-1.5
      [&::-moz-range-thumb]:pointer-events-auto
      [&::-moz-range-thumb]:h-4
      [&::-moz-range-thumb]:w-4
      [&::-moz-range-thumb]:rounded-full
      [&::-moz-range-thumb]:border-2
      [&::-moz-range-thumb]:border-white
      [&::-moz-range-thumb]:bg-blue-600
      [&::-moz-range-thumb]:shadow"
  />
</div>

  <div className="flex justify-between text-xs font-medium text-slate-600">
    <span>{formatCurrency(minPrice ?? 0)}</span>
    <span>{formatCurrency(maxPrice ?? 100000)}</span>
  </div>
</div>

          {/* Price Display */}
          {(minPrice !== null || maxPrice !== null) && (
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
              Filter: {minPrice ? formatCurrency(minPrice) : '₱0'} - {maxPrice ? formatCurrency(maxPrice) : 'No limit'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onReset}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}


export default function ClientUnits() {
  const { user } = useAuth();
  const { addReservation, reservations } = useClientData();
  const { reviews } = useReviews();
  const { units, parkingSlots } = useUnits();
  const { sendSystemNotification } = useNotifications();

  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  const [notice, setNotice] = useState<{
    message: string;
    variant?: 'error' | 'warning' | 'success' | 'info';
  } | null>(null);

  const updateReservationField = useCallback(
  (field: keyof ReservationForm, value: string) => {
    let sanitized = value;

    switch (field) {
      case "vehicleType":
      case "businessType":
      case "eventPurpose":
        sanitized = sanitizePlainText(value);
        break;

      case "plateNumber":
        sanitized = sanitizePlainText(value).toUpperCase();
        break;

      case "attendees":
        sanitized = value.replace(/[^\d]/g, "");
        break;

      case "notes":
        sanitized = sanitizePlainText(value);
        break;

      default:
        sanitized = sanitizePlainText(value);
    }

    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

    setReservationForm((prev) => ({
      ...prev,
      [field]: sanitized,
    }));
  },
  []
);

  const handleFieldBlur = useCallback((field: keyof ReservationForm, value: string) => {
    const trimmedValue = typeof value === 'string' ? value.trim() : String(value);

    if (!trimmedValue) {
      let errorMessage = '';
      switch (field) {
        case 'vehicleType':
          errorMessage = 'Vehicle type is required.';
          break;
        case 'plateNumber':
          errorMessage = 'Plate number is required.';
          break;
        case 'eventPurpose':
          errorMessage = 'Event purpose is required.';
          break;
        case 'attendees':
          errorMessage = 'Number of attendees is required.';
          break;
        case 'businessType':
          errorMessage = 'Business type is required.';
          break;
        default:
          return;
      }

      if (errorMessage) {
        setFormErrors((prev) => ({
          ...prev,
          [field]: errorMessage,
        }));
      }
    }
  }, []);

  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<UnitType | "all">("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [minPriceFilter, setMinPriceFilter] = useState<number | null>(null);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [showPriceFilterModal, setShowPriceFilterModal] = useState(false);
  const [tempMinPrice, setTempMinPrice] = useState<number | null>(null);
  const [tempMaxPrice, setTempMaxPrice] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
  const priceFilterButtonRef = useRef<HTMLButtonElement | null>(null);

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
}, [searchTerm, filterType, filterLocation, minPriceFilter, maxPriceFilter]);


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

  const [blockingReservations, setBlockingReservations] = useState<
  Array<{
    reservation_id: string;
    unit_id: string;
    unit_type: UnitType;
    start_date: string;
    end_date: string;
    status: string;
  }>
>([]);
  

  const selectedUnitData = useMemo(() => {
    if (!selectedUnitId) return null;
    return units.find((u) => u.id === selectedUnitId) ?? null;
  }, [selectedUnitId, units]);

  const getReviewTimestamp = (review: any) =>
  new Date(review.created_at ?? review.updated_at ?? 0).getTime();


const latestReviewByUnitId = useMemo(() => {
  const map = new Map<string, any>();

  for (const review of reviews) {
    if (!review.unit_id) continue;

    const existing = map.get(review.unit_id);
    const currentTs = getReviewTimestamp(review);
    const existingTs = existing ? getReviewTimestamp(existing) : 0;

    if (!existing || currentTs >= existingTs) {
      map.set(review.unit_id, review);
    }
  }

  return map;
}, [reviews]);

const selectedUnitReviews = useMemo(() => {
  if (!selectedUnitData) return [];

  return reviews
    .filter((review) => review.unit_id === selectedUnitData.id)
    .sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a))
    .slice(0, 3);
}, [reviews, selectedUnitData]);

  const selectedUnitBlockingReservations = useMemo(() => {
  if (!selectedUnitData) return [];

  return blockingReservations
    .filter(
      (r) =>
        r.unit_id === selectedUnitData.id &&
        r.unit_type === selectedUnitData.type &&
        isBlockingReservation(r.status)
    )
    .map((r) => ({
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
    }));
}, [blockingReservations, selectedUnitData]);

useEffect(() => {
  setCurrentReviewIndex(0);
}, [selectedUnitId]);

useEffect(() => {
  if (selectedUnitReviews.length <= 1 || !showReservationModal) return;

  const timer = window.setInterval(() => {
    setCurrentReviewIndex((prev) =>
      prev === selectedUnitReviews.length - 1 ? 0 : prev + 1
    );
  }, 5000);

  return () => window.clearInterval(timer);
}, [selectedUnitReviews.length, showReservationModal]);



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
  let mounted = true;

  async function loadBlockingReservations() {
    const { data, error } = await supabase.rpc("get_blocking_reservations");

    if (error) {
      console.error("Failed to load blocking reservations:", error);
      return;
    }

    if (!mounted) return;
    setBlockingReservations(data ?? []);
  }

  void loadBlockingReservations();

  return () => {
    mounted = false;
  };
}, []);

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

      const matchesPrice =
        (minPriceFilter === null || unit.price >= minPriceFilter) &&
        (maxPriceFilter === null || unit.price <= maxPriceFilter);

      return matchesSearch && matchesType && matchesLocation && matchesPrice;
    });
  }, [units, searchTerm, filterType, filterLocation, minPriceFilter, maxPriceFilter]);

  const filteredUnitCards = useMemo(() => {
  return filteredUnits.map((unit) => {
    const latestReview = latestReviewByUnitId.get(unit.id);
    const latestReviewComment =
      typeof latestReview?.comment === "string" ? latestReview.comment.trim() : "";

    return {
      unit,
      latestReviewComment,
      averageRating: latestReviewByUnitId.get(unit.id)?.rating ?? 0,
    };
  });
}, [filteredUnits, latestReviewByUnitId]);
  

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

  const subtotalAmount = useMemo(() => {
  return Number((estimatedTotal / 1.12).toFixed(2));
}, [estimatedTotal]);

const vatAmount = useMemo(() => {
  return Number((estimatedTotal - subtotalAmount).toFixed(2));
}, [estimatedTotal, subtotalAmount]);

const initialDue = useMemo(() => {
  if (!selectedUnitData) return estimatedTotal;

  if (selectedUnitData.type === "rental_space") {
    const monthlyBase = Number(selectedUnitData.price || 0);
    const deposit = monthlyBase;
    const firstMonth = monthlyBase;
    const raw = deposit + firstMonth;
    const withVat = Number((raw * 1.12).toFixed(2));
    return Math.min(withVat, estimatedTotal);
  }

  return estimatedTotal;
}, [selectedUnitData, estimatedTotal]);

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



const appointmentTimeOptions = useMemo(() => {
  const options = buildAppointmentTimeOptions(APPOINTMENT_TIME_STEP_SECONDS);

  if (!reservationForm.appointmentDate) return options;

  if (!isSameDay(reservationForm.appointmentDate)) return options;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return options.filter((time) => {
    const [h, m] = time.split(":").map(Number);
    const minutes = h * 60 + m;

    return minutes > nowMinutes + 30; // 30 min buffer
  });
}, [reservationForm.appointmentDate]);

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
    const isInactive = slot.status !== "active" || Boolean(slot.isOccupied);
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

const openPriceFilterModal = useCallback(() => {
  setTempMinPrice(minPriceFilter);
  setTempMaxPrice(maxPriceFilter);
  setShowPriceFilterModal(true);
}, [minPriceFilter, maxPriceFilter]);

const closePriceFilterModal = useCallback(() => {
  setShowPriceFilterModal(false);
}, []);

const applyPriceFilter = useCallback(() => {
  setMinPriceFilter(tempMinPrice);
  setMaxPriceFilter(tempMaxPrice);
  setShowPriceFilterModal(false);
}, [tempMinPrice, tempMaxPrice]);

const resetPriceFilter = useCallback(() => {
  setTempMinPrice(null);
  setTempMaxPrice(null);
  setMinPriceFilter(null);
  setMaxPriceFilter(null);
  setShowPriceFilterModal(false);
}, []);

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
const validateReservationForm = useCallback(() => {
  const errors: Record<string, string> = {};

  if (!selectedUnitData) return errors;

  if (!reservationForm.agreedToPolicies) {
    errors.agreedToPolicies = 'You must agree to the policies.';
  }

  if (requiresAppointment) {
    if (!reservationForm.appointmentDate) {
      errors.appointmentDate = 'Appointment date is required.';
    }
    if (!reservationForm.appointmentTime) {
      errors.appointmentTime = 'Appointment time is required.';
    }
  }

  if (selectedUnitData.type === 'rental_space') {
    if (!reservationForm.startDate) {
      errors.startDate = 'Start date is required.';
    }
    if (!reservationForm.endDate) {
      errors.endDate = 'End date is required.';
    }
    if (!reservationForm.businessType.trim()) {
      errors.businessType = 'Business type is required.';
    }
  }

  if (selectedUnitData.type === 'function_hall') {
    if (!reservationForm.startDate) {
      errors.startDate = 'Start date is required.';
    }
    if (!reservationForm.endDate) {
      errors.endDate = 'End date is required.';
    }
    if (!reservationForm.eventPurpose.trim()) {
      errors.eventPurpose = 'Event purpose is required.';
    }
    if (!reservationForm.attendees.trim()) {
      errors.attendees = 'Number of attendees is required.';
    }
  }

  if (selectedUnitData.type === 'parking_slot') {
    if (!reservationForm.slotId) {
      errors.slotId = 'Please select a parking slot.';
    }
    if (!reservationForm.vehicleType.trim()) {
      errors.vehicleType = 'Vehicle type is required.';
    }
    if (!reservationForm.plateNumber.trim()) {
      errors.plateNumber = 'Plate number is required.';
    }
    if (!reservationForm.startDate) {
      errors.startDate = 'Start date is required.';
    }
    if (!reservationForm.endDate) {
      errors.endDate = 'End date is required.';
    }
  }

  return errors;
}, [reservationForm, requiresAppointment, selectedUnitData]);

  const handleReservationSubmit = useCallback(
  async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    if (!selectedUnitData || !user) return;

    const isViewingOnly = reservationIntent === "viewing_only";
    const errors = validateReservationForm();
      setFormErrors(errors);

      if (Object.keys(errors).length > 0) {
        setNotice({
          message: 'Please complete the required fields.',
          variant: 'warning',
        });
        return;
      }

    const blockingReservations = selectedUnitBlockingReservations;

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

      const { data } = await supabase.rpc("get_blocking_reservations");
      setBlockingReservations(data ?? []);

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
  selectedUnitBlockingReservations,
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
<div className={`${notice ? 'relative pt-16 sm:pt-18' : 'relative'}`}>
        {notice && (
          <AppNotice
            message={notice.message}
            variant={notice.variant}
            onClose={() => setNotice(null)}
            autoHideMs={4000}
          />
        )}
        <header>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Browse units
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Secure a space or book an appointment for a tour
          </p>
        </header>
      </div>
        {hasUnits && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex gap-2 sm:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(sanitizePlainText(e.target.value))}
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
                  maxLength={100}
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(sanitizePlainText(e.target.value))}
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

              <div className="relative">
              <button
                ref={priceFilterButtonRef}
                type="button"
                onClick={openPriceFilterModal}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-sm transition ${
                  minPriceFilter !== null || maxPriceFilter !== null
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {minPriceFilter !== null || maxPriceFilter !== null
                  ? `₱${minPriceFilter || '0'} - ₱${maxPriceFilter || '∞'}`
                  : 'All Prices'}
              </button>

              <PriceFilterModal
                isOpen={showPriceFilterModal}
                minPrice={tempMinPrice}
                maxPrice={tempMaxPrice}
                onMinPriceChange={setTempMinPrice}
                onMaxPriceChange={setTempMaxPrice}
                onApply={applyPriceFilter}
                onReset={resetPriceFilter}
                onClose={closePriceFilterModal}
              />
            </div>

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
            filteredUnitCards.map(({ unit, latestReviewComment }) => {
              const unitReviews = reviews.filter(
                (r) => r.unit_id === unit.id
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
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-blue-600">
              {getUnitTypeLabel(unit.type)}
            </span>

            <UnitTaxonomyBadges
              category={unit.category}
              subtype={unit.subtype}
            />
          </div>

          <div className="min-h-[42px]">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900">
              {unit.name}
            </h3>
          </div>

          <div className="mt-2 min-h-[56px]">
          <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">
            {latestReviewComment ? "Latest Review" : "Description"}
          </p>

          <p
            className={`line-clamp-2 text-sm leading-relaxed ${
              latestReviewComment ? "italic text-slate-500" : "text-slate-500"
            }`}
          >
            {latestReviewComment || unit.description?.trim() || "No description available."}
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

              <div className="relative mb-4">
              <label className="mb-1 block text-sm text-gray-600">
                Price Range
              </label>

              <button
                type="button"
                onClick={openPriceFilterModal}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ${
                  minPriceFilter !== null || maxPriceFilter !== null
                    ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {minPriceFilter !== null || maxPriceFilter !== null
                  ? `₱${minPriceFilter || '0'} - ₱${maxPriceFilter || '∞'}`
                  : 'All Prices'}
              </button>

              <PriceFilterModal
                isOpen={showPriceFilterModal}
                minPrice={tempMinPrice}
                maxPrice={tempMaxPrice}
                onMinPriceChange={setTempMinPrice}
                onMaxPriceChange={setTempMaxPrice}
                onApply={applyPriceFilter}
                onReset={resetPriceFilter}
                onClose={closePriceFilterModal}
              />
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
            <div className="fixed inset-0 z-50 bg-black/40 p-0 sm:p-6">
              <div className="flex h-full items-end justify-center sm:items-center">
                <div
                  className={`flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[95vh] sm:rounded-3xl ${
                    reservationSuccess ? 'sm:max-w-md' : 'sm:max-w-5xl'
                  }`}
                >
                        <div
                          className={`flex items-start justify-between gap-3 border-b border-gray-100 ${
                            reservationSuccess ? 'px-4 py-4 sm:px-5' : 'px-4 py-4 sm:px-6 sm:py-5'
                          }`}
                        >
                <div>
                  <div className={`mb-1 ${reservationSuccess ? 'text-xs' : 'text-sm'} font-medium text-blue-600`}>
                  {getUnitTypeLabel(selectedUnitData.type)}
                </div>

                <h2 className={`${reservationSuccess ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'} font-bold leading-tight text-gray-900`}>
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
                            Billing Summary
                          </p>

                          <div className="mt-1 space-y-1 text-sm">
                            {isViewingOnly ? (
                              <p className="font-semibold text-gray-900">
                                No payment required
                              </p>
                            ) : (
                              <>
                                <div className="flex items-center justify-between gap-3 text-gray-600">
                                  <span>Subtotal</span>
                                  <span>{formatCurrency(subtotalAmount)}</span>
                                </div>

                                <div className="flex items-center justify-between gap-3 text-gray-600">
                                  <span>VAT (12%)</span>
                                  <span>{formatCurrency(vatAmount)}</span>
                                </div>

                                <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-1 font-semibold text-gray-900">
                                  <span>Total</span>
                                  <span>{formatCurrency(estimatedTotal)}</span>
                                </div>

                                {selectedUnitData.type === "rental_space" && (
                                  <div className="flex items-center justify-between gap-3 text-blue-700 font-semibold">
                                    <span>Initial Due</span>
                                    <span>{formatCurrency(initialDue)}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                        We’ll notify you once your request has been reviewed.
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="p-4 sm:p-6">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6">
                    <ReservationUnitDetailsPanel
                      selectedUnitData={selectedUnitData}
                      selectedUnitMedia={selectedUnitMedia}
                      safeCurrentMediaIndex={safeCurrentMediaIndex}
                      selectedUnitReviews={selectedUnitReviews}
                      currentReviewIndex={currentReviewIndex}
                      setCurrentReviewIndex={setCurrentReviewIndex}
                      reservationDurationType={reservationForm.durationType}
                      isVideoUrl={isVideoUrl}
                      nextImage={nextImage}
                      prevImage={prevImage}
                      setCurrentImageIndex={setCurrentImageIndex}
                    />

                    <form className="space-y-4" onSubmit={handleReservationSubmit}>

                      <ReservationVisitFlowSection
                        reservationForm={reservationForm}
                        setReservationForm={setReservationForm}
                        handleModeChange={handleModeChange}
                        appointmentTimeOptions={appointmentTimeOptions}
                        formatTimeLabel={formatTimeLabel}
                        getDateInputValue={getDateInputValue}
                        formErrors={formErrors}
                        isTimeSelectOpen={isTimeSelectOpen}
                        setIsTimeSelectOpen={setIsTimeSelectOpen}
                        timeSelectRef={timeSelectRef}
                        isViewingOnly={isViewingOnly}
                      />

                      {selectedUnitData.type === "parking_slot" && (
                        <ParkingReservationForm
                          form={reservationForm}
                          setForm={setReservationForm}
                          updateReservationField={updateReservationField}
                          handleFieldBlur={handleFieldBlur}
                          formErrors={formErrors}
                          estimatedTotal={estimatedTotal}
                          subtotalAmount={subtotalAmount}
                          vatAmount={vatAmount}
                          formatCurrency={formatCurrency}
                        />
                      )}

                      {selectedUnitData.type === "function_hall" && (
                        <FunctionHallReservationForm
                          form={reservationForm}
                          setForm={setReservationForm}
                          updateReservationField={updateReservationField}
                          handleFieldBlur={handleFieldBlur}
                          formErrors={formErrors}
                          conflictMessage={functionHallConflictMessage}
                          setConflictMessage={setFunctionHallConflictMessage}
                          selectedUnitData={selectedUnitData}
                          showCalendar={showCalendar}
                          setShowCalendar={setShowCalendar}
                          calendarLegend={calendarLegend}
                          isSelectingRangeEnd={isSelectingRangeEnd}
                          setIsSelectingRangeEnd={setIsSelectingRangeEnd}
                          isCalendarTileDisabled={isCalendarTileDisabled}
                          getCalendarTileClassName={getCalendarTileClassName}
                          selectedUnitBlockingReservations={selectedUnitBlockingReservations}
                          rangesOverlap={rangesOverlap}
                          estimatedTotal={estimatedTotal}
                          subtotalAmount={subtotalAmount}
                          vatAmount={vatAmount}
                          formatCurrency={formatCurrency}
                        />
                      )}

                      {selectedUnitData.type === "rental_space" && (
                        <RentalReservationForm
                          form={reservationForm}
                          setForm={setReservationForm}
                          updateReservationField={updateReservationField}
                          handleFieldBlur={handleFieldBlur}
                          formErrors={formErrors}
                          selectedUnitData={selectedUnitData}
                          showCalendar={showCalendar}
                          setShowCalendar={setShowCalendar}
                          calendarLegend={calendarLegend}
                          isCalendarTileDisabled={isCalendarTileDisabled}
                          getCalendarTileClassName={getCalendarTileClassName}
                          getMaxReservationDate={getMaxReservationDate}
                          rentalMonthlyAmount={rentalMonthlyAmount}
                          rentalRequiredPayment={rentalRequiredPayment}
                          estimatedTotal={estimatedTotal}
                          subtotalAmount={subtotalAmount}
                          vatAmount={vatAmount}
                          initialDue={initialDue}
                        />
                      )}
                      
                      <ReservationPaymentSection
                        shouldShowPaymentSection={shouldShowPaymentSection}
                        hasActivePaymentMethods={hasActivePaymentMethods}
                        activePaymentMethods={activePaymentMethods}
                        reservationForm={reservationForm}
                        setReservationForm={setReservationForm}
                        updateReservationField={updateReservationField}
                        selectedUnitData={selectedUnitData}
                        formErrors={formErrors}
                        unitType={selectedUnitData.type}
                        estimatedTotal={estimatedTotal}
                        initialDue={initialDue}
                        formatCurrency={formatCurrency}
                      />

                      <ReservationSummarySection
                        isViewingOnly={isViewingOnly}
                        estimatedTotal={estimatedTotal}
                        reservationIntent={reservationIntent}
                        isSubmitting={isSubmitting}
                        canSubmit={canSubmit}
                        formatCurrency={formatCurrency}
                        subtotalAmount={subtotalAmount}
                        vatAmount={vatAmount}
                        initialDue={initialDue}
                        unitType={selectedUnitData.type}
                      />
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
          </div>
        )}

        <ParkingSlotPanel
          open={isSlotPanelOpen}
          onClose={() => setIsSlotPanelOpen(false)}
          unitParkingSlots={unitParkingSlots}
          reservationForm={reservationForm}
          handleSlotSelectFromPanel={handleSlotSelectFromPanel}
          getParkingSlotState={getParkingSlotState}
          fallbackImage={FALLBACK_IMAGE}
        />

      </div>
    </div>
  );
}