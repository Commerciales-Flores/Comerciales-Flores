import type { UnitType } from "../../../contexts/DataContext";
import type { Reservation } from "../../../data/types";
import { formatDate } from "../../../utils/date";

export type UnitAvailability = {
  status: "available" | "occupied" | "partial";
  badgeText: string;
  badgeTone: "green" | "red" | "amber" | "gray" | "blue";
  reserveDisabled: boolean;
  reserveLabel: string;
  nextAvailableText?: string;
};

const BLOCKING_STATUSES = ["approved", "confirmed"] as const;

function isBlockingReservation(status?: string | null) {
  return BLOCKING_STATUSES.includes(
    (status ?? "") as (typeof BLOCKING_STATUSES)[number]
  );
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
        new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime()
    );

  const ownReservations = blockingReservations.filter(
    (r) => r.userId === userId
  );

  const otherReservations = blockingReservations.filter(
    (r) => r.userId !== userId
  );

  const now = Date.now();

  const activeOwnRental = ownReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    const end = new Date(r.endDate).getTime();
    return start <= now && end >= now;
  });

  const upcomingOwnRental = ownReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    return start > now;
  });

  if (activeOwnRental || upcomingOwnRental) {
    const ownReservation =
      activeOwnRental ?? upcomingOwnRental;

    return {
      status: "occupied",
      badgeText: "Reserved by you",
      badgeTone: "blue",
      reserveDisabled: true,
      reserveLabel: "Reserved",
      nextAvailableText:
        ownReservation?.startDate &&
        ownReservation?.endDate
          ? `${formatDate(
              ownReservation.startDate
            )} - ${formatDate(
              ownReservation.endDate
            )}`
          : undefined,
    };
  }

  const activeOtherRental = otherReservations.find((r) => {
    const start = new Date(r.startDate).getTime();
    const end = new Date(r.endDate).getTime();
    return start <= now && end >= now;
  });

  if (activeOtherRental) {
    return {
      status: "occupied",
      badgeText: "Occupied",
      badgeTone: "red",
      reserveDisabled: true,
      reserveLabel: "Occupied",
      nextAvailableText: activeOtherRental.endDate
        ? `Until ${formatDate(
            activeOtherRental.endDate
          )}`
        : undefined,
    };
  }

  const upcomingOtherRental = otherReservations.find(
    (r) => {
      const start = new Date(r.startDate).getTime();
      return start > now;
    }
  );

  if (upcomingOtherRental) {
    return {
      status: "partial",
      badgeText: "Available soon",
      badgeTone: "amber",
      reserveDisabled: false,
      reserveLabel: "Reserve Now",
      nextAvailableText: `Reserved ${formatDate(
        upcomingOtherRental.startDate
      )} - ${formatDate(
        upcomingOtherRental.endDate
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