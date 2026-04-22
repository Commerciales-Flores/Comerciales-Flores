import type { Reservation } from "../../../data/types";
import type {
  UnitAvailability,
  DurationType,
} from "../shared/reservation.types";
import { computeEndFromForm } from "../shared/reservation.utils";

const BLOCKING_STATUSES = ["approved", "confirmed"] as const;
const DEFAULT_SAME_DAY_HOURLY_LEAD_MINUTES = 120;

export const PARKING_DURATION_LIMITS = {
  hours: { min: 1, max: 24 },
  days: { min: 1, max: 30 },
  months: { min: 1, max: 12 },
} as const;

type ParkingDurationType = keyof typeof PARKING_DURATION_LIMITS;

function isValidTimeHHMM(value?: string) {
  return !!value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseHHMM(value: string) {
  const [hour, minute] = value.split(":").map(Number);

  return {
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
  };
}

function formatHourLabel(hour24: number, minute: number) {
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

/**
 * Builds selectable hourly parking start times.
 * hourly_end is treated as the closing boundary.
 *
 * Example:
 * 09:00 to 17:00
 * returns starts:
 * 09:00 ... 16:00
 */
export function buildParkingHourlyOptions(
  hourlyStart = "09:00",
  hourlyEnd = "17:00"
) {
  if (!isValidTimeHHMM(hourlyStart) || !isValidTimeHHMM(hourlyEnd)) {
    return [];
  }

  const start = parseHHMM(hourlyStart);
  const end = parseHHMM(hourlyEnd);

  if (start.totalMinutes >= end.totalMinutes) {
    return [];
  }

  const options: Array<{ value: string; label: string }> = [];

  for (
    let mins = start.totalMinutes;
    mins < end.totalMinutes;
    mins += 60
  ) {
    const hour = Math.floor(mins / 60);
    const minute = mins % 60;

    options.push({
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      label: formatHourLabel(hour, minute),
    });
  }

  return options;
}

export function isBlockingReservation(status?: string | null) {
  return BLOCKING_STATUSES.includes(
    (status ?? "") as (typeof BLOCKING_STATUSES)[number]
  );
}

export function getParkingDurationBounds(durationType: ParkingDurationType) {
  return PARKING_DURATION_LIMITS[durationType];
}

/**
 * Parking reservations are fixed blocks only.
 * Users cannot extend an active parking reservation.
 * They must create a new reservation instead.
 */
export function parkingSupportsExtension() {
  return false;
}

/**
 * Parking charges are based on the reserved duration,
 * not the actual time used.
 */
export function parkingChargesReservedPeriodOnly() {
  return true;
}

export function shouldSwitchToDaily(
  duration: number,
  durationType: DurationType
) {
  return (
    durationType === "hours" && duration > PARKING_DURATION_LIMITS.hours.max
  );
}

export function shouldSwitchToMonthly(
  duration: number,
  durationType: DurationType
) {
  return durationType === "days" && duration > PARKING_DURATION_LIMITS.days.max;
}

export function validateParkingDuration(params: {
  duration: number;
  durationType: ParkingDurationType;
}) {
  const { duration, durationType } = params;
  const bounds = getParkingDurationBounds(durationType);

  if (!Number.isFinite(duration)) {
    return "Please enter a valid parking duration.";
  }

  if (!Number.isInteger(duration)) {
    if (durationType === "hours") {
      return "Hourly parking must be in whole hours.";
    }

    if (durationType === "days") {
      return "Daily parking must be in whole days.";
    }

    return "Monthly parking must be in whole months.";
  }

  if (duration < bounds.min) {
    if (durationType === "hours") {
      return "Minimum hourly parking is 1 hour.";
    }

    if (durationType === "days") {
      return "Daily parking minimum is 1 full day.";
    }

    return "Monthly parking minimum is 1 month.";
  }

  if (duration > bounds.max) {
    if (durationType === "hours") {
      return "Hourly parking allows up to 24 hours only. For longer stays, switch to Daily.";
    }

    if (durationType === "days") {
      return "Daily parking allows up to 30 days only. For longer stays, switch to Monthly.";
    }

    return "Monthly parking allows up to 12 months only.";
  }

  return "";
}

export function getParkingDurationPolicyText(durationType: DurationType) {
  if (durationType === "hours") {
    return "Hourly parking is available in whole-hour blocks only, up to 24 hours.";
  }

  if (durationType === "days") {
    return "Daily parking is billed in full-day blocks only. Partial-day daily reservations are not supported.";
  }

  return "Monthly parking is billed in full-month blocks only. Early departure does not reduce charges.";
}

/**
 * Parking reservations may start today.
 */
export function getParkingMinStartDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isSameParkingDay(date?: Date | null) {
  if (!date) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function roundUpToNextWholeHour(date: Date) {
  const next = new Date(date);

  if (
    next.getMinutes() > 0 ||
    next.getSeconds() > 0 ||
    next.getMilliseconds() > 0
  ) {
    next.setHours(next.getHours() + 1);
  }

  next.setMinutes(0, 0, 0);
  return next;
}

export function getParkingEarliestSelectableDateTime(
  leadMinutes = DEFAULT_SAME_DAY_HOURLY_LEAD_MINUTES
) {
  const next = new Date();
  next.setMinutes(next.getMinutes() + leadMinutes);
  return roundUpToNextWholeHour(next);
}

export function getParkingEarliestSelectableTimeValue(
  leadMinutes = DEFAULT_SAME_DAY_HOURLY_LEAD_MINUTES
) {
  const next = getParkingEarliestSelectableDateTime(leadMinutes);

  return `${String(next.getHours()).padStart(2, "0")}:${String(
    next.getMinutes()
  ).padStart(2, "0")}`;
}

export function getParkingEarliestStartTimeLabel(
  leadMinutes = DEFAULT_SAME_DAY_HOURLY_LEAD_MINUTES
) {
  const next = getParkingEarliestSelectableDateTime(leadMinutes);

  const hours = next.getHours();
  const minutes = next.getMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function filterParkingHourlyOptionsByEarliestTime(
  options: Array<{ value: string; label: string }>,
  params?: {
    selectedDate?: Date;
    leadMinutes?: number;
  }
) {
  const {
    selectedDate,
    leadMinutes = DEFAULT_SAME_DAY_HOURLY_LEAD_MINUTES,
  } = params ?? {};

  if (!selectedDate || !isSameParkingDay(selectedDate)) {
    return options;
  }

  const earliestValue = getParkingEarliestSelectableTimeValue(leadMinutes);

  return options.filter((option) => option.value >= earliestValue);
}

export function validateSameDayHourlyParking(params: {
  startDate?: Date;
  startTime?: string;
  leadMinutes?: number;
}) {
  const {
    startDate,
    startTime,
    leadMinutes = DEFAULT_SAME_DAY_HOURLY_LEAD_MINUTES,
  } = params;

  if (!startDate || !startTime) return "";
  if (!isSameParkingDay(startDate)) return "";

  const [hourStr, minuteStr] = startTime.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return "Please select a valid parking start time.";
  }

  const selected = new Date(startDate);
  selected.setHours(hour, minute, 0, 0);

  const earliest = getParkingEarliestSelectableDateTime(leadMinutes);

  if (selected.getTime() < earliest.getTime()) {
    return `For same-day hourly parking, the earliest allowed start time is ${getParkingEarliestStartTimeLabel(
      leadMinutes
    )}.`;
  }

  return "";
}
export function getParkingAvailability(params: {
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
      !!slot.isOccupied ||
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

export function getReservedSlotIds(params: {
  reservations: Reservation[];
  selectedUnitId?: string | null;
  startDate?: Date;
  duration: number;
  durationType: DurationType;
  userId?: string;
}) {
  const {
    reservations,
    selectedUnitId,
    startDate,
    duration,
    durationType,
    userId,
  } = params;

  if (!selectedUnitId || !startDate || !duration) {
    return new Set<string>();
  }

  const formStart = new Date(startDate);
  const formEnd = computeEndFromForm(formStart, duration, durationType);

  const reservedIds = reservations
    .filter(
      (r) =>
        r.unitType === "parking_slot" &&
        r.unitId === selectedUnitId &&
        r.slotId &&
        isBlockingReservation(r.status) &&
        r.userId !== userId
    )
    .filter((r) => {
      const resStart = new Date(r.startDate);
      const resType = (r.durationType as DurationType) ?? "months";
      const resEnd = computeEndFromForm(resStart, r.duration, resType);

      return formStart <= resEnd && formEnd >= resStart;
    })
    .map((r) => r.slotId as string);

  return new Set(reservedIds);
}

export function getOwnReservedSlotIds(params: {
  reservations: Reservation[];
  selectedUnitId?: string | null;
  startDate?: Date;
  duration: number;
  durationType: DurationType;
  userId?: string;
}) {
  const {
    reservations,
    selectedUnitId,
    startDate,
    duration,
    durationType,
    userId,
  } = params;

  if (!selectedUnitId || !startDate) {
    return new Set<string>();
  }

  const formStart = new Date(startDate);
  const formEnd = computeEndFromForm(
    formStart,
    duration || 1,
    durationType
  );

  const ownReservedIds = reservations
    .filter(
      (r) =>
        r.unitType === "parking_slot" &&
        r.unitId === selectedUnitId &&
        r.slotId &&
        isBlockingReservation(r.status) &&
        r.userId === userId
    )
    .filter((r) => {
      const resStart = new Date(r.startDate);
      const resType = (r.durationType as DurationType) ?? "months";
      const resEnd = computeEndFromForm(resStart, r.duration, resType);

      return formStart <= resEnd && formEnd >= resStart;
    })
    .map((r) => r.slotId as string);

  return new Set(ownReservedIds);
}

export function getParkingSlotState(params: {
  slot: {
    id: string;
    status: string;
    isOccupied?: boolean;
  };
  ownReservedSlotIds: Set<string>;
  reservedSlotIds: Set<string>;
}) {
  const { slot, ownReservedSlotIds, reservedSlotIds } = params;

  const isOwned = ownReservedSlotIds.has(slot.id);
  const isTakenByOthers = reservedSlotIds.has(slot.id);
  const isInactive = slot.status !== "active" || !!slot.isOccupied;
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
}