import type { ReservationSortOption } from "../../data/sorting";
import {
  compareDates,
  compareNumbers,
  compareStrings,
} from "./sortingHelpers";

type SortableReservation = {
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
  start_date?: string | Date | null;
  startDate?: string | Date | null;
  end_date?: string | Date | null;
  endDate?: string | Date | null;
  total_amount?: number | null;
  totalAmount?: number | null;
  public_id?: string | null;
  publicId?: string | null;
  unitName?: string | null;
  propertyName?: string | null;
  status?: string | null;
};

const RESERVATION_STATUS_PRIORITY: Record<string, number> = {
  pending: 1,
  approved: 2,
  confirmed: 3,
  completed: 4,
  cancelled: 5,
  rejected: 6,
};

const getReservationCreatedAt = (reservation: SortableReservation) =>
  reservation.created_at ?? reservation.createdAt ?? null;

const getReservationStartDate = (reservation: SortableReservation) =>
  reservation.start_date ?? reservation.startDate ?? null;

const getReservationAmount = (reservation: SortableReservation) =>
  Number(reservation.total_amount ?? reservation.totalAmount ?? 0);

const getReservationPublicId = (reservation: SortableReservation) =>
  reservation.public_id ?? reservation.publicId ?? "";

const getReservationProperty = (reservation: SortableReservation) =>
  reservation.unitName ?? reservation.propertyName ?? "";

const getReservationStatusRank = (reservation: SortableReservation) => {
  const status = String(reservation.status || "")
    .trim()
    .toLowerCase();

  return RESERVATION_STATUS_PRIORITY[status] ?? 999;
};

export function sortReservations<T extends SortableReservation>(
  reservations: T[],
  sortBy: ReservationSortOption
): T[] {
  const copy = [...reservations];

  switch (sortBy) {
    case "oldest":
      return copy.sort((a, b) =>
        compareDates(getReservationCreatedAt(a), getReservationCreatedAt(b), "asc")
      );

    case "start_asc":
      return copy.sort((a, b) =>
        compareDates(getReservationStartDate(a), getReservationStartDate(b), "asc")
      );

    case "start_desc":
      return copy.sort((a, b) =>
        compareDates(getReservationStartDate(a), getReservationStartDate(b), "desc")
      );

    case "amount_asc":
      return copy.sort((a, b) =>
        compareNumbers(getReservationAmount(a), getReservationAmount(b), "asc")
      );

    case "amount_desc":
      return copy.sort((a, b) =>
        compareNumbers(getReservationAmount(a), getReservationAmount(b), "desc")
      );

    case "property_asc":
      return copy.sort((a, b) =>
        compareStrings(getReservationProperty(a), getReservationProperty(b), "asc")
      );

    case "property_desc":
      return copy.sort((a, b) =>
        compareStrings(getReservationProperty(a), getReservationProperty(b), "desc")
      );

    case "status":
      return copy.sort((a, b) => {
        const statusCompare = getReservationStatusRank(a) - getReservationStatusRank(b);
        if (statusCompare !== 0) return statusCompare;

        return compareDates(getReservationCreatedAt(a), getReservationCreatedAt(b), "desc");
      });

    case "newest":
    default:
      return copy.sort((a, b) => {
        const createdCompare = compareDates(
          getReservationCreatedAt(a),
          getReservationCreatedAt(b),
          "desc"
        );
        if (createdCompare !== 0) return createdCompare;

        return compareStrings(
          getReservationPublicId(a),
          getReservationPublicId(b),
          "asc"
        );
      });
  }
}