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

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getDurationBounds(unitType: UnitType, durationType: DurationType) {
  if (unitType === 'rental_space' && durationType === 'months') {
    return {
      min: RESERVATION_LIMITS.rental_space.minMonths,
      max: RESERVATION_LIMITS.rental_space.maxMonths,
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

function buildInitialForm(
  unitType?: UnitType,
  defaultPaymentMethod?: PaymentMethod
): AdminReservationFormState {
  const tomorrow = getTomorrow();

  if (unitType === 'parking_slot') {
    const endDate = computeEndFromForm(tomorrow, 1, 'months');

    return {
      startDate: tomorrow,
      endDate,
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
      paymentCycle: 'full',
      eventPurpose: '',
      attendees: '',
      vehicleType: '',
      plateNumber: '',
      businessType: '',
      paymentMethod: defaultPaymentMethod,
      slotId: '',
    };
  }

  const endDate = computeEndFromForm(tomorrow, 1, 'months');

  return {
    startDate: tomorrow,
    endDate,
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

function getSafeCalendarAnchor(date?: Date) {
  return startOfLocalDay(date ?? getTomorrow());
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
    setShowCalendar(false);
    setIsSlotPanelOpen(false);
  }, [unit?.id, unit?.type, defaultPaymentMethod]);

  useEffect(() => {
    if (!unit) return;

    const bounds = getDurationBounds(unit.type, formState.durationType);

    if (formState.duration < bounds.min || formState.duration > bounds.max) {
      const safeDuration = clampNumber(formState.duration, bounds.min, bounds.max);

      setFormState((prev) => {
        if (!prev.startDate) {
          return {
            ...prev,
            duration: safeDuration,
          };
        }

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

        return {
          ...prev,
          duration: safeDuration,
          endDate: computeEndFromForm(prev.startDate, safeDuration, prev.durationType),
        };
      });
    }
  }, [unit, formState.duration, formState.durationType]);

  useEffect(() => {
    if (!unit?.type || !formState.startDate) return;
    if (unit.type === 'function_hall') return;

    setFormState((prev) => ({
      ...prev,
      endDate: computeEndFromForm(prev.startDate!, Number(prev.duration) || 1, prev.durationType),
    }));
  }, [unit?.type, formState.startDate, formState.duration, formState.durationType]);

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

  const totalContractValue = useMemo(() => {
    if (!unit) return 0;

    return calculateTotalAmount(
      unit.type,
      unit.price,
      Number(formState.duration) || 1,
      formState.paymentCycle
    );
  }, [unit, formState.duration, formState.paymentCycle]);

  const rentalMonthlyAmount = useMemo(() => {
    if (!unit || unit.type !== 'rental_space') return 0;
    if (!formState.duration || formState.duration <= 0) return 0;

    return totalContractValue / formState.duration;
  }, [unit, formState.duration, totalContractValue]);

  const rentalRequiredPayment = useMemo(() => {
    if (!unit || unit.type !== 'rental_space') return 0;

    if (formState.paymentCycle === 'quarterly') {
      return Math.min(rentalMonthlyAmount * 3, totalContractValue);
    }

    if (formState.paymentCycle === 'full') {
      return totalContractValue;
    }

    return Math.min(rentalMonthlyAmount, totalContractValue);
  }, [unit, formState.paymentCycle, rentalMonthlyAmount, totalContractValue]);

  const functionHallCalendarValue = useMemo(() => {
    if (formState.startDate && formState.endDate) {
      return [formState.startDate, formState.endDate] as [Date, Date];
    }
    return undefined;
  }, [formState.startDate, formState.endDate]);

  const calendarAnchorDate = useMemo(() => {
    if (unit?.type === 'function_hall') {
      return getSafeCalendarAnchor(formState.startDate);
    }
    return getSafeCalendarAnchor(formState.startDate);
  }, [unit?.type, formState.startDate]);

  if (!unit) {
    return <div className="p-4 text-sm text-red-500">Error: Unit information could not be found.</div>;
  }

  if (!user) {
    return <div className="p-4 text-sm text-red-500">Error: User information could not be found.</div>;
  }

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

    const durationBounds = getDurationBounds(unit.type, formState.durationType);
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
      return;
    }

    if (unit.type === 'function_hall' && !formState.eventPurpose.trim()) {
      setFormError('Please enter the event purpose.');
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
        return;
      }
    }

    if (
      unit.type === 'parking_slot' &&
      (!formState.vehicleType.trim() || !formState.plateNumber.trim())
    ) {
      setFormError('Please enter vehicle type and plate number.');
      return;
    }

    if (unit.type === 'rental_space') {
      const hasConflict = blockingReservationsForUnit.some((reservation) =>
        rangesOverlap(
          formState.startDate,
          formState.endDate,
          reservation.startDate,
          reservation.endDate
        )
      );

      if (hasConflict) {
        setFormError('This rental space is occupied for the selected lease period.');
        return;
      }
    }

    if (unit.type === 'function_hall') {
      if (safeDuration <= 0) {
        setFormError('Please select reservation dates first.');
        return;
      }

      const hasConflict = blockingReservationsForUnit.some((reservation) =>
        rangesOverlap(
          formState.startDate,
          formState.endDate,
          reservation.startDate,
          reservation.endDate
        )
      );

      if (hasConflict) {
        setFormError('This function hall is already reserved for the selected date(s).');
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
      totalAmount: totalContractValue,
      notes: formState.notes.trim(),
      modeOfVisit: 'online',
      paymentMethod: resolvedPaymentMethod,
      status: 'approved',

      ...(unit.type === 'rental_space' && {
        paymentCycle: formState.paymentCycle as PaymentCycle,
        businessType: formState.businessType.trim(),
        durationType: 'months' as const,
      }),

      ...(unit.type === 'function_hall' && {
        eventPurpose: formState.eventPurpose.trim(),
        attendees: Math.max(1, Number(formState.attendees) || 1),
        paymentCycle: 'full' as const,
        durationType: 'days' as const,
      }),

      ...(unit.type === 'parking_slot' && {
        vehicleType: formState.vehicleType.trim(),
        plateNumber: formState.plateNumber.trim(),
        paymentCycle: formState.paymentCycle as PaymentCycle,
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
              <p className="mt-1 text-xs capitalize text-gray-500">
                {unit.type.replace(/_/g, ' ')}
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
          subtitle="Set the lease start date, duration, and billing cycle."
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
                        setFormState((prev) => ({
                          ...prev,
                          startDate: startOfLocalDay(value),
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
              <FieldLabel>Duration (months)</FieldLabel>
              <input
                type="number"
                min={RESERVATION_LIMITS.rental_space.minMonths}
                max={RESERVATION_LIMITS.rental_space.maxMonths}
                value={formState.duration}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    duration: clampNumber(
                      Number(e.target.value) || RESERVATION_LIMITS.rental_space.minMonths,
                      RESERVATION_LIMITS.rental_space.minMonths,
                      RESERVATION_LIMITS.rental_space.maxMonths
                    ),
                    durationType: 'months',
                  }))
                }
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

            <div>
              <FieldLabel>Business Type</FieldLabel>
              <input
                type="text"
                placeholder="e.g., Retail, Office, Restaurant"
                value={formState.businessType}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    businessType: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <FieldLabel icon={<Wallet className="size-3.5" />}>Payment Cycle</FieldLabel>
              <select
                value={formState.paymentCycle}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    paymentCycle: e.target.value as PaymentCycle,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                disabled={isSubmitting}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="full">Full (Upfront)</option>
              </select>
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
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      attendees: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Event Purpose</FieldLabel>
              <input
                type="text"
                placeholder="e.g., Wedding, Conference"
                value={formState.eventPurpose}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    eventPurpose: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                disabled={isSubmitting}
              />
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
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        slotId: '',
                      }))
                    }
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

                      let badgeClass =
                        'border-green-200 bg-green-50 text-green-700';
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
                            setFormState((prev) => ({
                              ...prev,
                              slotId: slot.id,
                            }));
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

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}
                            >
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
                  placeholder="e.g., Sedan, SUV, Motorcycle"
                  value={formState.vehicleType}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      vehicleType: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <FieldLabel>Plate Number</FieldLabel>
                <input
                  type="text"
                  placeholder="e.g., ABC 1234"
                  value={formState.plateNumber}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      plateNumber: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  disabled={isSubmitting}
                />
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
            <FieldLabel icon={<ReceiptText className="size-3.5" />}>Estimated Total</FieldLabel>
            <ReadOnlyValue>{formatCurrency(totalContractValue)}</ReadOnlyValue>
          </div>
        </div>

        {unit.type === 'rental_space' && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-800">
            Initial required payment for this cycle:{' '}
            <span className="font-bold">{formatCurrency(rentalRequiredPayment)}</span>
          </div>
        )}

        <div className="mt-4">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            rows={4}
            placeholder="Add internal notes or reservation remarks..."
            value={formState.notes}
            onChange={(e) =>
              setFormState((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
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
              This will be created immediately with approved status.
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