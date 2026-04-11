import type { Reservation } from "../../../data/types";
import type { UnitAvailability, DurationType } from "../shared/reservation.types";
import { computeEndFromForm } from "../shared/reservation.utils";

const BLOCKING_STATUSES = ["approved", "confirmed"] as const;

export function isBlockingReservation(status?: string | null) {
  return BLOCKING_STATUSES.includes(
    (status ?? "") as (typeof BLOCKING_STATUSES)[number]
  );
}

export const PARKING_DURATION_LIMITS = {
  hours: { min: 1, max: 24 },
  days: { min: 1, max: 30 },
  months: { min: 1, max: 12 },
} as const;

export function getParkingDurationBounds(
  durationType: "hours" | "days" | "months"
) {
  return PARKING_DURATION_LIMITS[durationType];
}

export function validateParkingDuration(params: {
  duration: number;
  durationType: "hours" | "days" | "months";
}) {
  const { duration, durationType } = params;
  const bounds = getParkingDurationBounds(durationType);

  if (!Number.isFinite(duration) || duration < bounds.min) {
    return `Minimum is ${bounds.min} ${durationType}.`;
  }

  if (duration > bounds.max) {
    if (durationType === "hours") {
      return "Hourly parking allows up to 24 hours only. Switch to Daily for longer stays.";
    }

    if (durationType === "days") {
      return "Daily parking allows up to 30 days only. Switch to Monthly for longer stays.";
    }

    return "Monthly parking allows up to 12 months only.";
  }

  return "";
}

/**
 * Parking can start today.
 * Unlike rental space, this should not force tomorrow-only selection.
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

/**
 * For same-day hourly parking, require a lead time.
 * Default: 30 minutes.
 */
export function getParkingEarliestStartTime(bufferMinutes = 30) {
  const next = new Date();
  next.setMinutes(next.getMinutes() + bufferMinutes);
  next.setSeconds(0, 0);
  return next;
}

export function roundUpToNextTimeStep(date: Date, stepMinutes = 30) {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const remainder = minutes % stepMinutes;

  if (remainder !== 0) {
    rounded.setMinutes(minutes + (stepMinutes - remainder));
  }

  rounded.setSeconds(0, 0);

  return rounded;
}

export function getParkingEarliestStartTimeLabel(
  bufferMinutes = 30,
  stepMinutes = 30
) {
  const rounded = roundUpToNextTimeStep(
    getParkingEarliestStartTime(bufferMinutes),
    stepMinutes
  );

  const hours = rounded.getHours();
  const minutes = rounded.getMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/**
 * Use this for submit validation when hourly parking supports same-day starts.
 * If selected date is today, start time must not be in the past and must respect the lead time.
 */
export function validateSameDayHourlyParking(params: {
  startDate?: Date;
  startTime?: string;
  bufferMinutes?: number;
}) {
  const {
    startDate,
    startTime,
    bufferMinutes = 30,
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

  const earliest = getParkingEarliestStartTime(bufferMinutes);

  if (selected.getTime() < earliest.getTime()) {
    return `For same-day hourly parking, the earliest allowed start time is ${getParkingEarliestStartTimeLabel(
      bufferMinutes
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