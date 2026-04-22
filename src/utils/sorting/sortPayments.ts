import type { PaymentSortOption } from "../../data/sorting";
import {
  compareDates,
  compareNumbers,
  compareStrings,
} from "./sortingHelpers";

type SortablePayment = {
  date?: string | Date | null;
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
  amount?: number | null;
  method?: string | null;
  public_id?: string | null;
  publicId?: string | null;
  status?: string | null;
  review_status?: string | null;
  reviewStatus?: string | null;
};

const PAYMENT_STATUS_PRIORITY: Record<string, number> = {
  pending: 1,
  partial: 2,
  paid: 3,
  verified: 4,
  rejected: 5,
  failed: 6,
};

const getPaymentDate = (payment: SortablePayment) =>
  payment.date ?? payment.created_at ?? payment.createdAt ?? null;

const getPaymentAmount = (payment: SortablePayment) =>
  Number(payment.amount ?? 0);

const getPaymentPublicId = (payment: SortablePayment) =>
  payment.public_id ?? payment.publicId ?? "";

const getPaymentMethod = (payment: SortablePayment) =>
  payment.method ?? "";

const getPaymentStatus = (payment: SortablePayment) =>
  String(payment.review_status ?? payment.reviewStatus ?? payment.status ?? "")
    .trim()
    .toLowerCase();

const getPaymentStatusRank = (payment: SortablePayment) =>
  PAYMENT_STATUS_PRIORITY[getPaymentStatus(payment)] ?? 999;

export function sortPayments<T extends SortablePayment>(
  payments: T[],
  sortBy: PaymentSortOption
): T[] {
  const copy = [...payments];

  switch (sortBy) {
    case "oldest":
      return copy.sort((a, b) =>
        compareDates(getPaymentDate(a), getPaymentDate(b), "asc")
      );

    case "amount_asc":
      return copy.sort((a, b) =>
        compareNumbers(getPaymentAmount(a), getPaymentAmount(b), "asc")
      );

    case "amount_desc":
  return copy.sort((a, b) =>
    compareNumbers(getPaymentAmount(a), getPaymentAmount(b), "desc")
  );

case "method_asc":
  return copy.sort((a, b) =>
    compareStrings(getPaymentMethod(a), getPaymentMethod(b), "asc")
  );

case "method_desc":
  return copy.sort((a, b) =>
    compareStrings(getPaymentMethod(a), getPaymentMethod(b), "desc")
  );

case "status":
      return copy.sort((a, b) => {
        const statusCompare = getPaymentStatusRank(a) - getPaymentStatusRank(b);
        if (statusCompare !== 0) return statusCompare;

        return compareDates(getPaymentDate(a), getPaymentDate(b), "desc");
      });

    case "newest":
    default:
      return copy.sort((a, b) => {
        const dateCompare = compareDates(getPaymentDate(a), getPaymentDate(b), "desc");
        if (dateCompare !== 0) return dateCompare;

        return compareStrings(getPaymentPublicId(a), getPaymentPublicId(b), "asc");
      });
  }
}