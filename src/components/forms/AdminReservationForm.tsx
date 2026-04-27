// src/components/admin/AdminReservationForm.tsx

import { useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  MapPin,
  ReceiptText,
  User as UserIcon,
  Wallet,
  Warehouse,
  X,
} from 'lucide-react';

import { useAdminData } from '../../contexts/AdminDataContext';
import { useUnits } from '../../contexts/UnitsContext';
import { usePaymentMethods } from '../../contexts/PaymentMethodsContext';
import type {
  PaymentCycle,
  PaymentMethod,
  Reservation,
  UnitType,
} from '../../contexts/DataContext';
import { calculateTotalAmount } from '../../utils/propertyHelpers';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import {
  computeOneTimeBilling,
  computeRentalBilling,
} from '../../utils/billing';

interface AdminReservationFormProps {
  userId: string;
  unitId: string;
  onComplete: () => void;
}

type DurationType = 'hours' | 'days' | 'months' | 'years';

interface AdminReservationFormState {
  startDate?: Date;
  endDate?: Date;
  duration: number;
  durationType: DurationType;
  notes: string;
  paymentCycle: PaymentCycle;
  eventPurpose: string;
  attendees: string;
  vehicleType: string;
  plateNumber: string;
  businessType: string;
  paymentMethod?: Reservation['paymentMethod'];
  slotId: string;
}

const BLOCKING_STATUSES = ['approved', 'confirmed'] as const;

const RESERVATION_LIMITS = {
  rental_space: {
    minDays: 1,
    maxDays: 29,
    minMonths: 1,
    maxMonths: 60,
  },
  function_hall: {
    minDays: 1,
    maxDays: 7,
  },
  parking_slot: {
    minMonths: 1,
    maxMonths: 12,
  },
  attendees: {
    min: 1,
    max: 1000,
  },
};

const INPUT_LIMITS = {
  businessType: 100,
  eventPurpose: 150,
  vehicleType: 50,
  plateNumber: 20,
  notes: 1000,
};

function isBlockingReservation(status?: string | null) {
  return BLOCKING_STATUSES.includes(
    (status ?? '') as (typeof BLOCKING_STATUSES)[number]
  );
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
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
    durationType: 'days' as const,
  };
}

function computeEndFromForm(start: Date, duration: number, type: DurationType) {
  const end = new Date(start);

  if (type === 'hours') {
    end.setHours(end.getHours() + duration);
  } else if (type === 'days') {
    end.setDate(end.getDate() + duration - 1);
    end.setHours(23, 59, 59, 999);
  } else if (type === 'months') {
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

function computeRentalEndFromForm(
  start: Date,
  duration: number,
  paymentCycle: PaymentCycle
) {
  if (paymentCycle === 'monthly') {
    return computeEndFromForm(start, duration, 'months');
  }

  return computeEndFromForm(start, duration, 'days');
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getDurationBounds(unitType: UnitType, durationType: DurationType, paymentCycle?: PaymentCycle) {
  if (unitType === 'rental_space') {
    if (paymentCycle === 'monthly' || durationType === 'months') {
      return {
        min: RESERVATION_LIMITS.rental_space.minMonths,
        max: RESERVATION_LIMITS.rental_space.maxMonths,
      };
    }

    return {
      min: RESERVATION_LIMITS.rental_space.minDays,
      max: RESERVATION_LIMITS.rental_space.maxDays,
    };
  }

  if (unitType === 'parking_slot' && durationType === 'months') {
    return {
      min: RESERVATION_LIMITS.parking_slot.minMonths,
      max: RESERVATION_LIMITS.parking_slot.maxMonths,
    };
  }

  if (unitType === 'function_hall' && durationType === 'days') {
    return {
      min: RESERVATION_LIMITS.function_hall.minDays,
      max: RESERVATION_LIMITS.function_hall.maxDays,
    };
  }

  return { min: 1, max: 30 };
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

function getUnitRate(unit: any, key: 'dailyRate' | 'weeklyRate' | 'monthlyRate') {
  const camelValue = Number(unit?.[key] ?? 0);
  if (Number.isFinite(camelValue) && camelValue > 0) return camelValue;

  const snakeKey =
    key === 'dailyRate'
      ? 'daily_rate'
      : key === 'weeklyRate'
        ? 'weekly_rate'
        : 'monthly_rate';

  const snakeValue = Number(unit?.[snakeKey] ?? 0);
  if (Number.isFinite(snakeValue) && snakeValue > 0) return snakeValue;

  if (key === 'monthlyRate') return Number(unit?.price ?? 0);
  if (key === 'weeklyRate') return Number(unit?.price ?? 0) / 4;
  return Number(unit?.price ?? 0) / 30;
}

function getDepositMonths(unit: any) {
  return Number(unit?.securityDepositMonths ?? unit?.security_deposit_months ?? 1) || 1;
}

function getAdvanceMonths(unit: any) {
  return Number(unit?.advanceRentMonths ?? unit?.advance_deposit_months ?? 1) || 1;
}

function buildInitialForm(
  unitType?: UnitType,
  defaultPaymentMethod?: PaymentMethod
): AdminReservationFormState {
  const tomorrow = getTomorrow();

  if (unitType === 'parking_slot') {
    return {
      startDate: tomorrow,
      endDate: computeEndFromForm(tomorrow, 1, 'months'),
      duration: 1,
      durationType: 'months',
      notes: '',
      paymentCycle: 'monthly',
      eventPurpose: '',
      attendees: '',
      vehicleType: '',
      plateNumber: '',
      businessType: '',
      paymentMethod: defaultPaymentMethod,
      slotId: '',
    };
  }

  if (unitType === 'function_hall') {
    return {
      startDate: undefined,
      endDate: undefined,
      duration: 0,
      durationType: 'days',
      notes: '',
      paymentCycle: 'daily',
      eventPurpose: '',
      attendees: '',
      vehicleType: '',
      plateNumber: '',
      businessType: '',
      paymentMethod: defaultPaymentMethod,
      slotId: '',
    };
  }

  return {
    startDate: tomorrow,
    endDate: computeRentalEndFromForm(tomorrow, 12, 'monthly'),
    duration: 12,
    durationType: 'months',
    notes: '',
    paymentCycle: 'monthly',
    eventPurpose: '',
    attendees: '',
    vehicleType: '',
    plateNumber: '',
    businessType: '',
    paymentMethod: defaultPaymentMethod,
    slotId: '',
  };
}

function getSafeCalendarAnchor(date?: Date) {
  return startOfLocalDay(date ?? getTomorrow());
}

function formatUnitTypeLabel(value: UnitType) {
  switch (value) {
    case 'rental_space':
      return 'Rental Space';
    case 'function_hall':
      return 'Function Hall';
    case 'parking_slot':
      return 'Parking Slot';
    default:
      return String(value).replace(/_/g, ' ');
  }
}

function FieldLabel({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
      {icon}
      <span>{children}</span>
    </label>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-gray-100 p-2 text-gray-700">{icon}</div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
      {children}
    </div>
  );
}

export default function AdminReservationForm({
  userId,
  unitId,
  onComplete,
}: AdminReservationFormProps) {
  const { reservations, users, addReservation } = useAdminData();
  const { units, parkingSlots } = useUnits();
  const { activePaymentMethods } = usePaymentMethods();

  const unit = units.find((u) => u.id === unitId);
  const user = users.find((u) => u.id === userId);

  const defaultPaymentMethod = useMemo<PaymentMethod | undefined>(() => {
    return activePaymentMethods[0]?.methodCode as PaymentMethod | undefined;
  }, [activePaymentMethods]);

  const [formError, setFormError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [isSlotPanelOpen, setIsSlotPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formState, setFormState] = useState<AdminReservationFormState>(() =>
    buildInitialForm(unit?.type, defaultPaymentMethod)
  );

  useEffect(() => {
    if (!unit) return;
    setFormState(buildInitialForm(unit.type, defaultPaymentMethod));
    setFormError(null);
    setFormErrors({});
    setShowCalendar(false);
    setIsSlotPanelOpen(false);
  }, [unit?.id, unit?.type, defaultPaymentMethod]);

  useEffect(() => {
    if (!unit) return;

    const bounds = getDurationBounds(
      unit.type,
      formState.durationType,
      formState.paymentCycle
    );

    if (formState.duration < bounds.min || formState.duration > bounds.max) {
      const safeDuration = clampNumber(formState.duration, bounds.min, bounds.max);

      setFormState((prev) => {
        if (!prev.startDate) return { ...prev, duration: safeDuration };

        if (unit.type === 'function_hall') {
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

        if (unit.type === 'rental_space') {
          const nextDurationType: DurationType =
            prev.paymentCycle === 'monthly' ? 'months' : 'days';

          return {
            ...prev,
            duration: safeDuration,
            durationType: nextDurationType,
            endDate: computeRentalEndFromForm(
              prev.startDate,
              safeDuration,
              prev.paymentCycle
            ),
          };
        }

        return {
          ...prev,
          duration: safeDuration,
          endDate: computeEndFromForm(prev.startDate, safeDuration, prev.durationType),
        };
      });
    }
  }, [unit, formState.duration, formState.durationType, formState.paymentCycle]);

  useEffect(() => {
    if (!unit?.type || !formState.startDate) return;
    if (unit.type === 'function_hall') return;

    setFormState((prev) => {
      if (unit.type === 'rental_space') {
        return {
          ...prev,
          endDate: computeRentalEndFromForm(
            prev.startDate!,
            Number(prev.duration) || 1,
            prev.paymentCycle
          ),
        };
      }

      return {
        ...prev,
        endDate: computeEndFromForm(
          prev.startDate!,
          Number(prev.duration) || 1,
          prev.durationType
        ),
      };
    });
  }, [unit?.type, formState.startDate, formState.duration, formState.durationType, formState.paymentCycle]);

  const unitParkingSlots = useMemo(() => {
    if (unit?.type !== 'parking_slot') return [];
    return parkingSlots.filter((slot) => slot.unitId === unit.id);
  }, [parkingSlots, unit]);

  const blockingReservationsForUnit = useMemo(() => {
    if (!unit) return [];

    return reservations
      .filter(
        (r) =>
          r.unitId === unit.id &&
          r.unitType === unit.type &&
          isBlockingReservation(r.status)
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
  }, [reservations, unit]);

  const reservedSlotIds = useMemo(() => {
    if (
      unit?.type !== 'parking_slot' ||
      !formState.startDate ||
      !formState.duration
    ) {
      return new Set<string>();
    }

    const formStart = new Date(formState.startDate);
    const formEnd = computeEndFromForm(
      formStart,
      Number(formState.duration) || 1,
      formState.durationType
    );

    const reservedIds = reservations
      .filter(
        (r) =>
          r.unitType === 'parking_slot' &&
          r.unitId === unit.id &&
          r.slotId &&
          isBlockingReservation(r.status)
      )
      .filter((r) => {
        const resStart = new Date(r.startDate);
        const resType = (r.durationType as DurationType) ?? 'months';
        const resEnd = computeEndFromForm(resStart, r.duration, resType);
        return formStart <= resEnd && formEnd >= resStart;
      })
      .map((r) => r.slotId as string);

    return new Set<string>(reservedIds);
  }, [
    reservations,
    unit,
    formState.startDate,
    formState.duration,
    formState.durationType,
  ]);

  const selectedSlotObject = useMemo(() => {
    if (!formState.slotId) return null;
    return unitParkingSlots.find((slot) => slot.id === formState.slotId) ?? null;
  }, [formState.slotId, unitParkingSlots]);

  const rentalBilling = useMemo(() => {
    if (!unit || unit.type !== 'rental_space') return null;

    return computeRentalBilling({
      monthlyBase: getUnitRate(unit, 'monthlyRate'),
      dailyRate: getUnitRate(unit, 'dailyRate'),
      weeklyRate: getUnitRate(unit, 'weeklyRate'),
      durationMonths:
        formState.paymentCycle === 'monthly'
          ? Number(formState.duration) || 1
          : Math.max(1, Math.ceil((Number(formState.duration) || 1) / 30)),
      stayDays:
        formState.paymentCycle === 'monthly'
          ? (Number(formState.duration) || 1) * 30
          : Number(formState.duration) || 1,
      paymentCycle: formState.paymentCycle as 'daily' | 'weekly' | 'monthly',
      securityDepositMonths: getDepositMonths(unit),
      advanceRentMonths: getAdvanceMonths(unit),
    });
  }, [unit, formState.duration, formState.paymentCycle]);

  const totalBilling = useMemo(() => {
    if (!unit) {
      return {
        subtotal: 0,
        vatAmount: 0,
        totalAmount: 0,
        amountDue: 0,
      };
    }

    if (unit.type === 'rental_space' && rentalBilling) {
      return {
        subtotal: rentalBilling.leaseSubtotal,
        vatAmount: rentalBilling.leaseVat,
        totalAmount: rentalBilling.leaseTotal,
        amountDue: rentalBilling.initialDue,
      };
    }

    const baseAmount = calculateTotalAmount(
      unit.type,
      unit.price,
      Number(formState.duration) || 1,
      formState.paymentCycle
    );

    const result = computeOneTimeBilling({ baseAmount });

    return {
      subtotal: result.subtotal,
      vatAmount: result.vatAmount,
      totalAmount: result.totalAmount,
      amountDue: result.amountDue,
    };
  }, [unit, rentalBilling, formState.duration, formState.paymentCycle]);

  const functionHallCalendarValue = useMemo(() => {
    if (formState.startDate && formState.endDate) {
      return [formState.startDate, formState.endDate] as [Date, Date];
    }
    return undefined;
  }, [formState.startDate, formState.endDate]);

  const calendarAnchorDate = useMemo(() => {
    return getSafeCalendarAnchor(formState.startDate);
  }, [formState.startDate]);

  if (!unit) {
    return <div className="p-4 text-sm text-red-500">Error: Unit information could not be found.</div>;
  }

  if (!user) {
    return <div className="p-4 text-sm text-red-500">Error: User information could not be found.</div>;
  }

  const handleFieldBlur = (field: string, value: string) => {
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
        setFormErrors((prev) => ({ ...prev, [field]: errorMessage }));
      }
    }
  };

  const handleRentalCycleChange = (nextCycle: PaymentCycle) => {
    setFormState((prev) => {
      const nextDuration = nextCycle === 'monthly' ? 12 : 1;
      const nextDurationType: DurationType = nextCycle === 'monthly' ? 'months' : 'days';

      return {
        ...prev,
        paymentCycle: nextCycle,
        duration: nextDuration,
        durationType: nextDurationType,
        endDate: prev.startDate
          ? computeRentalEndFromForm(prev.startDate, nextDuration, nextCycle)
          : prev.endDate,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setFormError(null);

    if (!formState.startDate || !formState.endDate) {
      setFormError(
        unit.type === 'function_hall'
          ? 'Please select reservation dates first.'
          : 'Please select a start date.'
      );
      return;
    }

    const durationBounds = getDurationBounds(
      unit.type,
      formState.durationType,
      formState.paymentCycle
    );

    const safeDuration = clampNumber(
      Number(formState.duration) || durationBounds.min,
      durationBounds.min,
      durationBounds.max
    );

    if (unit.type === 'parking_slot' && !formState.slotId) {
      setFormError('Please select a parking slot.');
      return;
    }

    if (unit.type === 'rental_space' && !formState.businessType.trim()) {
      setFormError('Please enter the business type.');
      setFormErrors({ businessType: 'Business type is required.' });
      return;
    }

    if (unit.type === 'function_hall' && !formState.eventPurpose.trim()) {
      setFormError('Please enter the event purpose.');
      setFormErrors({ eventPurpose: 'Event purpose is required.' });
      return;
    }

    if (unit.type === 'function_hall') {
      const attendeeCount = Number(formState.attendees);
      const maxAllowedAttendees = Math.min(
        unit.capacity ?? RESERVATION_LIMITS.attendees.max,
        RESERVATION_LIMITS.attendees.max
      );

      if (
        !formState.attendees.trim() ||
        !Number.isFinite(attendeeCount) ||
        attendeeCount < RESERVATION_LIMITS.attendees.min ||
        attendeeCount > maxAllowedAttendees
      ) {
        setFormError(
          `Please enter a valid number of attendees (${RESERVATION_LIMITS.attendees.min} - ${maxAllowedAttendees}).`
        );
        setFormErrors({ attendees: 'Number of attendees is required.' });
        return;
      }
    }

    if (
      unit.type === 'parking_slot' &&
      (!formState.vehicleType.trim() || !formState.plateNumber.trim())
    ) {
      setFormError('Please enter vehicle type and plate number.');
      if (!formState.vehicleType.trim()) {
        setFormErrors((prev) => ({ ...prev, vehicleType: 'Vehicle type is required.' }));
      }
      if (!formState.plateNumber.trim()) {
        setFormErrors((prev) => ({ ...prev, plateNumber: 'Plate number is required.' }));
      }
      return;
    }

    if (unit.type === 'rental_space' || unit.type === 'function_hall') {
      const hasConflict = blockingReservationsForUnit.some((reservation) =>
        rangesOverlap(
          formState.startDate,
          formState.endDate,
          reservation.startDate,
          reservation.endDate
        )
      );

      if (hasConflict) {
        setFormError(
          unit.type === 'rental_space'
            ? 'This rental space is occupied for the selected lease period.'
            : 'This function hall is already reserved for the selected date(s).'
        );
        return;
      }
    }

    if (unit.type === 'parking_slot') {
      const formStart = new Date(formState.startDate);
      const formEnd = computeEndFromForm(
        formStart,
        safeDuration,
        formState.durationType
      );

      const selectedSlotConflict = reservations
        .filter(
          (r) =>
            r.unitType === 'parking_slot' &&
            r.unitId === unit.id &&
            r.slotId === formState.slotId &&
            isBlockingReservation(r.status)
        )
        .some((r) => {
          const resStart = new Date(r.startDate);
          const resType = (r.durationType as DurationType) ?? 'months';
          const resEnd = computeEndFromForm(resStart, r.duration, resType);
          return formStart <= resEnd && formEnd >= resStart;
        });

      if (selectedSlotConflict) {
        setFormError('This parking slot is already reserved for the selected period.');
        return;
      }
    }

    const resolvedPaymentMethod = formState.paymentMethod as PaymentMethod | undefined;

    const finalReservationData: Omit<
      Reservation,
      'id' | 'requestDate' | 'paidAmount'
    > = {
      userId,
      unitId,
      unitName: unit.name,
      unitType: unit.type,
      startDate: formState.startDate.toISOString(),
      endDate: formState.endDate.toISOString(),
      duration: safeDuration,
      totalAmount: totalBilling.totalAmount,
      notes: formState.notes.trim(),
      modeOfVisit: 'online',
      paymentMethod: resolvedPaymentMethod,
      status: 'approved',

      ...(unit.type === 'rental_space' && {
        bookingTerm: formState.paymentCycle,
        paymentMode:
          formState.paymentCycle === 'monthly'
            ? 'deposit_plus_first_month'
            : 'full_upfront',
        businessType: formState.businessType.trim(),
        durationType: formState.durationType,
      }),

      ...(unit.type === 'function_hall' && {
        eventPurpose: formState.eventPurpose.trim(),
        attendees: Math.max(1, Number(formState.attendees) || 1),
        bookingTerm: 'daily',
        paymentMode: 'full_upfront',
        durationType: 'days' as const,
      }),

      ...(unit.type === 'parking_slot' && {
        vehicleType: formState.vehicleType.trim(),
        plateNumber: formState.plateNumber.trim(),
        bookingTerm: formState.paymentCycle,
        paymentMode: 'full_upfront',
        durationType: 'months' as const,
        slotId: formState.slotId,
        slotName:
          selectedSlotObject?.slotCode ||
          selectedSlotObject?.label ||
          undefined,
      }),
    };

    try {
      setIsSubmitting(true);
      await addReservation(finalReservationData);
      onComplete();
    } catch (error) {
      console.error('Failed to create reservation:', error);
      setFormError('Failed to create reservation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[2rem] bg-gray-50 p-4 sm:p-6"
    >
      <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-gray-900 p-3 text-white">
              <Warehouse className="size-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">
                Create Reservation
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Reserve this property directly for the selected customer.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Unit
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{unit.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                {formatUnitTypeLabel(unit.type)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Location
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <MapPin className="size-3.5 text-gray-400" />
                {unit.location || 'No location provided'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Customer"
        subtitle="This reservation will be attached to the selected account."
        icon={<UserIcon className="size-4" />}
      >
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed User'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {user.publicId || user.email || 'No user identifier available'}
          </p>
        </div>
      </SectionCard>

      {formError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {formError}
        </div>
      )}

      {unit.type === 'rental_space' && (
        <SectionCard
          title="Lease Details"
          subtitle="Set the lease start date, booking term, and business details."
          icon={<CalendarDays className="size-4" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel icon={<CalendarDays className="size-3.5" />}>
                Lease Start Date
              </FieldLabel>

              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 transition hover:border-gray-400"
                disabled={isSubmitting}
              >
                <span>
                  {formState.startDate ? formatDate(formState.startDate) : 'Select date'}
                </span>
                <ChevronDown
                  className={`size-4 text-gray-400 transition ${showCalendar ? 'rotate-180' : ''}`}
                />
              </button>

              {showCalendar && (
                <div className="relative z-20 mt-3 overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white p-3 shadow-xl">
                  <Calendar
                    onChange={(value) => {
                      if (value instanceof Date) {
                        const startDate = startOfLocalDay(value);
                        setFormState((prev) => ({
                          ...prev,
                          startDate,
                          endDate: computeRentalEndFromForm(
                            startDate,
                            Number(prev.duration) || 1,
                            prev.paymentCycle
                          ),
                        }));
                        setShowCalendar(false);
                      }
                    }}
                    value={formState.startDate}
                    activeStartDate={calendarAnchorDate}
                    minDate={getTomorrow()}
                    className="w-full border-0"
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel icon={<Wallet className="size-3.5" />}>Booking Term</FieldLabel>
              <select
                value={formState.paymentCycle}
                onChange={(e) => handleRentalCycleChange(e.target.value as PaymentCycle)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                disabled={isSubmitting}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <FieldLabel>
                Duration {formState.paymentCycle === 'monthly' ? '(months)' : '(days)'}
              </FieldLabel>
              <input
                type="number"
                min={getDurationBounds(unit.type, formState.durationType, formState.paymentCycle).min}
                max={getDurationBounds(unit.type, formState.durationType, formState.paymentCycle).max}
                value={formState.duration}
                onChange={(e) => {
                  const bounds = getDurationBounds(
                    unit.type,
                    formState.paymentCycle === 'monthly' ? 'months' : 'days',
                    formState.paymentCycle
                  );

                  const nextDuration = clampNumber(
                    Number(e.target.value) || bounds.min,
                    bounds.min,
                    bounds.max
                  );

                  const nextDurationType: DurationType =
                    formState.paymentCycle === 'monthly' ? 'months' : 'days';

                  setFormState((prev) => ({
                    ...prev,
                    duration: nextDuration,
                    durationType: nextDurationType,
                    endDate: prev.startDate
                      ? computeRentalEndFromForm(
                          prev.startDate,
                          nextDuration,
                          prev.paymentCycle
                        )
                      : prev.endDate,
                  }));
                }}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel>Lease End Date</FieldLabel>
              <ReadOnlyValue>
                {formState.endDate ? formatDate(formState.endDate) : '—'}
              </ReadOnlyValue>
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Business Type</FieldLabel>
              <input
                type="text"
                placeholder="e.g., Retail, Office, Restaurant"
                maxLength={INPUT_LIMITS.businessType}
                value={formState.businessType}
                onChange={(e) => {
                  setFormState((prev) => ({ ...prev, businessType: e.target.value }));
                  setFormErrors((prev) => {
                    if (!prev.businessType) return prev;
                    const next = { ...prev };
                    delete next.businessType;
                    return next;
                  });
                }}
                onBlur={(e) => handleFieldBlur('businessType', e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                disabled={isSubmitting}
              />
              {formErrors.businessType && (
                <p className="mt-1 text-xs text-red-600">{formErrors.businessType}</p>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {unit.type === 'function_hall' && (
        <SectionCard
          title="Event Reservation"
          subtitle="Pick the date range and event details."
          icon={<CalendarDays className="size-4" />}
        >
          <div className="space-y-4">
            <div>
              <FieldLabel icon={<CalendarDays className="size-3.5" />}>
                Reservation Dates
              </FieldLabel>

              <button
                type="button"
                onClick={() => setShowCalendar((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 transition hover:border-gray-400"
                disabled={isSubmitting}
              >
                <span>
                  {formState.startDate && formState.endDate
                    ? `${formatDate(formState.startDate)} - ${formatDate(formState.endDate)}`
                    : 'Select reservation dates'}
                </span>
                <ChevronDown
                  className={`size-4 text-gray-400 transition ${showCalendar ? 'rotate-180' : ''}`}
                />
              </button>

              {showCalendar && (
                <div className="relative z-20 mt-3 overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white p-3 shadow-xl">
                  <Calendar
                    value={functionHallCalendarValue}
                    activeStartDate={calendarAnchorDate}
                    selectRange
                    minDate={getTomorrow()}
                    onChange={(value) => {
                      if (Array.isArray(value) && value[0] && value[1]) {
                        const nextRange = buildFunctionHallRange(value[0], value[1]);

                        setFormState((prev) => ({
                          ...prev,
                          startDate: nextRange.startDate,
                          endDate: nextRange.endDate,
                          duration: nextRange.duration,
                          durationType: nextRange.durationType,
                        }));

                        setShowCalendar(false);
                      }
                    }}
                    className="w-full border-0"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Calculated Duration</FieldLabel>
                <ReadOnlyValue>{`${formState.duration} day(s)`}</ReadOnlyValue>
              </div>

              <div>
                <FieldLabel>Number of Attendees</FieldLabel>
                <input
                  type="number"
                  min={RESERVATION_LIMITS.attendees.min}
                  max={Math.min(
                    unit.capacity ?? RESERVATION_LIMITS.attendees.max,
                    RESERVATION_LIMITS.attendees.max
                  )}
                  placeholder={`Max: ${Math.min(
                    unit.capacity ?? RESERVATION_LIMITS.attendees.max,
                    RESERVATION_LIMITS.attendees.max
                  )}`}
                  value={formState.attendees}
                  onChange={(e) => {
                    setFormState((prev) => ({ ...prev, attendees: e.target.value }));
                    setFormErrors((prev) => {
                      if (!prev.attendees) return prev;
                      const next = { ...prev };
                      delete next.attendees;
                      return next;
                    });
                  }}
                  onBlur={(e) => handleFieldBlur('attendees', e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  disabled={isSubmitting}
                />
                {formErrors.attendees && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.attendees}</p>
                )}
              </div>
            </div>

            <div>
              <FieldLabel>Event Purpose</FieldLabel>
              <input
                type="text"
                placeholder="e.g., Wedding, Conference"
                maxLength={INPUT_LIMITS.eventPurpose}
                value={formState.eventPurpose}
                onChange={(e) => {
                  setFormState((prev) => ({ ...prev, eventPurpose: e.target.value }));
                  setFormErrors((prev) => {
                    if (!prev.eventPurpose) return prev;
                    const next = { ...prev };
                    delete next.eventPurpose;
                    return next;
                  });
                }}
                onBlur={(e) => handleFieldBlur('eventPurpose', e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                disabled={isSubmitting}
              />
              {formErrors.eventPurpose && (
                <p className="mt-1 text-xs text-red-600">{formErrors.eventPurpose}</p>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {unit.type === 'parking_slot' && (
        <SectionCard
          title="Parking Reservation"
          subtitle="Choose the reservation period, then assign a slot."
          icon={<CalendarDays className="size-4" />}
        >
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel icon={<CalendarDays className="size-3.5" />}>
                  Reservation Start Date
                </FieldLabel>

                <button
                  type="button"
                  onClick={() => setShowCalendar((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 transition hover:border-gray-400"
                  disabled={isSubmitting}
                >
                  <span>
                    {formState.startDate && formState.endDate
                      ? `${formatDate(formState.startDate)} - ${formatDate(formState.endDate)}`
                      : 'Select reservation period'}
                  </span>
                  <ChevronDown
                    className={`size-4 text-gray-400 transition ${showCalendar ? 'rotate-180' : ''}`}
                  />
                </button>

                {showCalendar && (
                  <div className="relative z-20 mt-3 overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white p-3 shadow-xl">
                    <Calendar
                      value={formState.startDate}
                      activeStartDate={calendarAnchorDate}
                      selectRange={false}
                      minDate={getTomorrow()}
                      onChange={(value) => {
                        if (value instanceof Date) {
                          const startDate = startOfLocalDay(value);
                          const duration = 1;
                          const durationType: DurationType = 'months';

                          setFormState((prev) => ({
                            ...prev,
                            startDate,
                            endDate: computeEndFromForm(startDate, duration, durationType),
                            duration,
                            durationType,
                          }));

                          setShowCalendar(false);
                        }
                      }}
                      className="w-full border-0"
                    />
                  </div>
                )}
              </div>

              <div>
                <FieldLabel>Duration (months)</FieldLabel>
                <input
                  type="number"
                  min={RESERVATION_LIMITS.parking_slot.minMonths}
                  max={RESERVATION_LIMITS.parking_slot.maxMonths}
                  value={formState.duration}
                  onChange={(e) => {
                    const nextDuration = clampNumber(
                      Number(e.target.value) || RESERVATION_LIMITS.parking_slot.minMonths,
                      RESERVATION_LIMITS.parking_slot.minMonths,
                      RESERVATION_LIMITS.parking_slot.maxMonths
                    );

                    setFormState((prev) => ({
                      ...prev,
                      duration: nextDuration,
                      durationType: 'months',
                      endDate: prev.startDate
                        ? computeEndFromForm(prev.startDate, nextDuration, 'months')
                        : prev.endDate,
                    }));
                  }}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">Parking Slot</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Select one available slot for this reservation period.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSlotPanelOpen((prev) => !prev)}
                  className="rounded-2xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  {selectedSlotObject ? 'Change Slot' : 'Choose Slot'}
                </button>
              </div>

              {selectedSlotObject ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                  <div>
                    <p className="text-sm font-bold text-blue-900">
                      {selectedSlotObject.slotCode || selectedSlotObject.label || 'Selected Slot'}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">Ready for reservation</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormState((prev) => ({ ...prev, slotId: '' }))}
                    className="rounded-full p-2 text-blue-500 transition hover:bg-blue-100"
                    disabled={isSubmitting}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
                  No slot selected yet.
                </div>
              )}

              {isSlotPanelOpen && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {unitParkingSlots.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
                      No parking slots configured for this unit.
                    </div>
                  ) : (
                    unitParkingSlots.map((slot) => {
                      const isReserved = reservedSlotIds.has(slot.id);
                      const isInactive = slot.status !== 'active' || slot.isOccupied;
                      const isSelected = formState.slotId === slot.id;
                      const isDisabled = isReserved || isInactive;

                      let badgeClass = 'border-green-200 bg-green-50 text-green-700';
                      let badgeText = 'Available';

                      if (isReserved) {
                        badgeClass = 'border-red-200 bg-red-50 text-red-700';
                        badgeText = 'Reserved';
                      } else if (isInactive) {
                        badgeClass = 'border-gray-200 bg-gray-100 text-gray-600';
                        badgeText = 'Unavailable';
                      }

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isDisabled || isSubmitting}
                          onClick={() => {
                            setFormState((prev) => ({ ...prev, slotId: slot.id }));
                            setIsSlotPanelOpen(false);
                          }}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            isSelected
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {slot.slotCode || slot.label || 'Parking Slot'}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {slot.label || 'Assigned slot'}
                              </p>
                            </div>

                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}>
                              {badgeText}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Vehicle Type</FieldLabel>
                <input
                  type="text"
                  maxLength={INPUT_LIMITS.vehicleType}
                  placeholder="e.g., Sedan, SUV, Motorcycle"
                  value={formState.vehicleType}
                  onChange={(e) => {
                    setFormState((prev) => ({ ...prev, vehicleType: e.target.value }));
                    setFormErrors((prev) => {
                      if (!prev.vehicleType) return prev;
                      const next = { ...prev };
                      delete next.vehicleType;
                      return next;
                    });
                  }}
                  onBlur={(e) => handleFieldBlur('vehicleType', e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  disabled={isSubmitting}
                />
                {formErrors.vehicleType && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.vehicleType}</p>
                )}
              </div>

              <div>
                <FieldLabel>Plate Number</FieldLabel>
                <input
                  type="text"
                  placeholder="e.g., ABC 1234"
                  maxLength={INPUT_LIMITS.plateNumber}
                  value={formState.plateNumber}
                  onChange={(e) => {
                    setFormState((prev) => ({
                      ...prev,
                      plateNumber: e.target.value.toUpperCase(),
                    }));
                    setFormErrors((prev) => {
                      if (!prev.plateNumber) return prev;
                      const next = { ...prev };
                      delete next.plateNumber;
                      return next;
                    });
                  }}
                  onBlur={(e) => handleFieldBlur('plateNumber', e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  disabled={isSubmitting}
                />
                {formErrors.plateNumber && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.plateNumber}</p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title="Payment & Notes"
        subtitle="Review billing information before creating the reservation."
        icon={<CreditCard className="size-4" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel icon={<Wallet className="size-3.5" />}>Payment Method</FieldLabel>
            <select
              value={formState.paymentMethod ?? ''}
              onChange={(e) =>
                setFormState((prev) => ({
                  ...prev,
                  paymentMethod: (e.target.value || undefined) as PaymentMethod | undefined,
                }))
              }
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              disabled={isSubmitting}
            >
              {activePaymentMethods.length === 0 && (
                <option value="">No active payment methods</option>
              )}

              {activePaymentMethods.map((method) => (
                <option key={method.id} value={method.methodCode}>
                  {method.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel icon={<ReceiptText className="size-3.5" />}>Amount Due</FieldLabel>
            <ReadOnlyValue>{formatCurrency(totalBilling.amountDue)}</ReadOnlyValue>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            Billing Breakdown
          </p>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(totalBilling.subtotal)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-500">VAT (12%)</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(totalBilling.vatAmount)}
              </span>
            </div>

            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between gap-4">
                <span className="font-bold text-gray-900">
                  {unit.type === 'rental_space' ? 'Total Contract Value' : 'Total Amount'}
                </span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(totalBilling.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {unit.type === 'rental_space' && rentalBilling && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-800">
            <p>
              Initial required payment:{' '}
              <span className="font-bold">{formatCurrency(rentalBilling.initialDue)}</span>
            </p>
            <p className="mt-1 text-xs text-blue-700">
              {formState.paymentCycle === 'monthly'
                ? 'Monthly rentals require security deposit plus advance rent and VAT.'
                : 'Daily and weekly rental bookings are treated as full upfront payments.'}
            </p>
          </div>
        )}

        <div className="mt-4">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            rows={4}
            placeholder="Add internal notes or reservation remarks..."
            value={formState.notes}
            maxLength={INPUT_LIMITS.notes}
            onChange={(e) =>
              setFormState((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            disabled={isSubmitting}
          />
        </div>
      </SectionCard>

      <div className="rounded-[1.75rem] border border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-green-600" />
          <div>
            <p className="text-sm font-bold text-green-900">Admin-created reservation</p>
            <p className="mt-1 text-sm text-green-800">
              This reservation will be created immediately with approved status.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onComplete}
          className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Reservation'
          )}
        </button>
      </div>
    </form>
  );
}
