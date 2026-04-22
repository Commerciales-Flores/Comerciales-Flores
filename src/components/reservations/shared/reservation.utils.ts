import type { UnitType } from "../../../contexts/DataContext";
import type {
  DurationType,
  PaymentMethod,
  ReservationForm,
} from "./reservation.types";

export const RESERVATION_LIMITS = {
  rental_space: {
    minDays: 1,
    maxDays: 30,
    minWeeks: 1,
    maxWeeks: 12,
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
} as const;

type ReservationDefaults = Pick<
  ReservationForm,
  | "duration"
  | "durationType"
  | "modeOfVisit"
  | "paymentIntent"
  | "paymentCycle"
  | "paymentMode"
>;

const UNIT_DEFAULTS: Record<UnitType, ReservationDefaults> = {
  rental_space: {
    duration: RESERVATION_LIMITS.rental_space.minMonths,
    durationType: "months",
    modeOfVisit: "online",
    paymentIntent: "pay_later",
    paymentCycle: "monthly",
    paymentMode: "deposit_plus_first_month",
  },
  function_hall: {
    duration: 0,
    durationType: "days",
    modeOfVisit: "online",
    paymentIntent: "pay_later",
    paymentCycle: "daily",
    paymentMode: "full_upfront",
  },
  parking_slot: {
    duration: RESERVATION_LIMITS.parking_slot.minMonths,
    durationType: "months",
    modeOfVisit: "online",
    paymentIntent: "pay_later",
    paymentCycle: "monthly",
    paymentMode: "full_upfront",
  },
};

export function computeEndFromForm(
  start: Date,
  duration: number,
  type: DurationType
) {
  const end = new Date(start);

  switch (type) {
    case "hours":
      end.setHours(end.getHours() + duration);
      break;

    case "days":
      end.setDate(end.getDate() + duration - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case "months":
      end.setMonth(end.getMonth() + duration);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;

    case "years":
      end.setFullYear(end.getFullYear() + duration);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return end;
}

export function computeRentalEndFromForm(
  start: Date,
  duration: number,
  paymentCycle: ReservationForm["paymentCycle"]
) {
  if (paymentCycle === "daily") {
    return computeEndFromForm(start, duration, "days");
  }

  if (paymentCycle === "weekly") {
    return computeEndFromForm(start, duration * 7, "days");
  }

  return computeEndFromForm(start, duration, "months");
}

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function getDurationBounds(
  unitType: UnitType,
  durationType: DurationType,
  paymentCycle?: ReservationForm["paymentCycle"]
) {
  switch (unitType) {
    case "rental_space":
      if (paymentCycle === "daily") {
        return {
          min: RESERVATION_LIMITS.rental_space.minDays,
          max: RESERVATION_LIMITS.rental_space.maxDays,
        };
      }

      if (paymentCycle === "weekly") {
        return {
          min: RESERVATION_LIMITS.rental_space.minWeeks,
          max: RESERVATION_LIMITS.rental_space.maxWeeks,
        };
      }

      return {
        min: RESERVATION_LIMITS.rental_space.minMonths,
        max: RESERVATION_LIMITS.rental_space.maxMonths,
      };

    case "parking_slot":
      return durationType === "months"
        ? {
            min: RESERVATION_LIMITS.parking_slot.minMonths,
            max: RESERVATION_LIMITS.parking_slot.maxMonths,
          }
        : { min: 1, max: 30 };

    case "function_hall":
      return durationType === "days"
        ? {
            min: RESERVATION_LIMITS.function_hall.minDays,
            max: RESERVATION_LIMITS.function_hall.maxDays,
          }
        : { min: 1, max: 30 };

    default:
      return { min: 1, max: 30 };
  }
}

export function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getInitialDates(unitType: UnitType) {
  if (unitType === "function_hall") {
    return {
      startDate: undefined,
      endDate: undefined,
    };
  }

  const startDate = getTomorrow();
  const defaults = UNIT_DEFAULTS[unitType];

  return {
    startDate,
    endDate: computeEndFromForm(
      startDate,
      defaults.duration,
      defaults.durationType
    ),
  };
}

export function buildInitialReservationForm(
  unitType: UnitType,
  defaultPaymentMethod: PaymentMethod = "gcash"
): ReservationForm {
  const defaults = UNIT_DEFAULTS[unitType];
  const { startDate, endDate } = getInitialDates(unitType);

  return {
    startDate,
    endDate,

    duration: defaults.duration,
    durationType: defaults.durationType,

    modeOfVisit: defaults.modeOfVisit,
    paymentIntent: defaults.paymentIntent,

    paymentMethod: defaultPaymentMethod,
    paymentCycle: defaults.paymentCycle,
    paymentMode: defaults.paymentMode,

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