import type { PaymentMethodCode } from "../../../contexts/PaymentMethodsContext";

export type DurationType = "hours" | "days" | "months" | "years";
export type VisitMode = "online" | "onsite";
export type PaymentIntent = "pay_onsite" | "pay_later";
export type PaymentMethod =
  | PaymentMethodCode
  | "not_applicable";
export type PaymentCycle = "monthly" | "quarterly" | "full";

export type ReservationIntent =
  | "viewing_only"
  | "reserve_online"
  | "reserve_onsite";

export interface ReservationForm {
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
  appointmentTime: string;

  agreedToPolicies: boolean;
}

export type UnitAvailability = {
  status: "available" | "occupied" | "partial";
  badgeText: string;
  badgeTone: "green" | "red" | "amber" | "gray" | "blue";
  reserveDisabled: boolean;
  reserveLabel: string;
  nextAvailableText?: string;
};