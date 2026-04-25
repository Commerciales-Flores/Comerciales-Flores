import type { UnitType } from "../../../contexts/DataContext";
import type { Reservation } from "../../../data/types";
import { formatDate } from "../../../utils/date";

export type DurationType = "hours" | "days" | "months" | "years";
export type VisitMode = "online" | "onsite";
export type PaymentIntent = "pay_onsite" | "pay_later";
export type PaymentCycle = "daily" | "weekly" | "monthly";
export type ReservationIntent =
  | "viewing_only"
  | "reserve_online"
  | "reserve_onsite";

export type UnitAvailability = {
  status: "available" | "occupied" | "partial";
  badgeText: string;
  badgeTone: "green" | "red" | "amber" | "gray" | "blue";
  reserveDisabled: boolean;
  reserveLabel: string;
  nextAvailableText?: string;
};

export const APPOINTMENT_START_HOUR = 9;
export const APPOINTMENT_END_HOUR = 17;
export const APPOINTMENT_TIME_STEP_SECONDS = 30 * 60; // 30 minutes

export const BLOCKING_STATUSES = ["approved", "confirmed"] as const;

export function formatTimeLabel(value: string) {
  const [hourStr, minuteStr] = value.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function isSameDay(date?: Date) {
  if (!date) return false;

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function buildAppointmentTimeOptions(stepSeconds: number) {
  const stepMinutes = Math.max(1, Math.floor(stepSeconds / 60));
  const options: string[] = [];

  for (
    let hour = APPOINTMENT_START_HOUR;
    hour <= APPOINTMENT_END_HOUR;
    hour++
  ) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      if (hour === APPOINTMENT_END_HOUR && minute > 0) break;

      options.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );
    }
  }

  return options;
}

export function getMaxReservationDate(unitType: UnitType) {
  const now = new Date();
  const max = new Date(now);

  switch (unitType) {
    case "rental_space":
      max.setFullYear(max.getFullYear() + 5);
      break;

    case "parking_slot":
      max.setFullYear(max.getFullYear() + 1);
      break;

    case "function_hall":
      max.setMonth(max.getMonth() + 1);
      break;

    default:
      max.setFullYear(max.getFullYear() + 1);
  }

  return max;
}

export function isBlockingReservation(status?: string | null) {
  return BLOCKING_STATUSES.includes(
    (status ?? "") as (typeof BLOCKING_STATUSES)[number]
  );
}

export function rangesOverlap(
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

export function getDateInputValue(date?: Date) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
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
      slot.status !== "active" || slot.isOccupied || occupiedByOtherUser;

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
        ? `${ownReservedSlots.length} slot${
            ownReservedSlots.length > 1 ? "s" : ""
          } reserved by you • All other slots occupied`
        : "Fully occupied",
    badgeTone: ownReservedSlots.length > 0 ? "blue" : "red",
    reserveDisabled: true,
    reserveLabel:
      ownReservedSlots.length > 0
        ? "Already Reserved"
        : "No Slots Left",
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

export function getRentalAvailability(params: {
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

    return (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      start <= now &&
      end >= now
    );
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
          ? `${formatDate(ownReservation.startDate)} - ${formatDate(
              ownReservation.endDate
            )}`
          : ownReservation?.endDate
            ? `Until ${formatDate(ownReservation.endDate)}`
            : undefined,
    };
  }

  const activeOtherRental = otherReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    const end = new Date(r.endDate).getTime();

    return (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      start <= now &&
      end >= now
    );
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

export function getFunctionHallAvailability(params: {
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

    return (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      start <= now &&
      end >= now
    );
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

    return (
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      start <= now &&
      end >= now
    );
  });

  if (activeOtherReservation) {
    return {
      status: "partial",
      badgeText: "Has reserved dates",
      badgeTone: "amber",
      reserveDisabled: false,
      reserveLabel: "Check Dates",
      nextAvailableText: `${formatDate(
        activeOtherReservation.startDate
      )} - ${formatDate(activeOtherReservation.endDate)}`,
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
      nextAvailableText: `${formatDate(
        upcomingOwnReservation.startDate
      )} - ${formatDate(upcomingOwnReservation.endDate)}`,
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
      nextAvailableText: `${formatDate(
        upcomingOtherReservation.startDate
      )} - ${formatDate(upcomingOtherReservation.endDate)}`,
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