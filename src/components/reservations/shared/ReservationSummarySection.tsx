import type { ReservationIntent } from "./reservation.types";

interface ReservationSummarySectionProps {
  isViewingOnly: boolean;
  estimatedTotal: number;
  reservationIntent: ReservationIntent;
  isSubmitting: boolean;
  canSubmit: boolean;
  formatCurrency: (value: number) => string;

  subtotalAmount?: number;
  vatAmount?: number;
  initialDue?: number;
  vatRate?: number;
  unitType?: "rental_space" | "function_hall" | "parking_slot";
}

export default function ReservationSummarySection({
  isViewingOnly,
  estimatedTotal,
  reservationIntent,
  isSubmitting,
  canSubmit,
  formatCurrency,
  subtotalAmount,
  vatAmount,
  initialDue,
  vatRate = 0.12,
  unitType,
}: ReservationSummarySectionProps) {
  const resolvedSubtotal =
    typeof subtotalAmount === "number"
      ? subtotalAmount
      : Number((estimatedTotal / (1 + vatRate)).toFixed(2));

  const resolvedVat =
    typeof vatAmount === "number"
      ? vatAmount
      : Number((estimatedTotal - resolvedSubtotal).toFixed(2));

  const resolvedInitialDue =
    typeof initialDue === "number" ? initialDue : estimatedTotal;

  const isRental = unitType === "rental_space";

  const showMiddleBillingSummary = !isViewingOnly && isRental;

  const submitLabel = isSubmitting
    ? "Submitting..."
    : isViewingOnly
      ? "Book Viewing Appointment"
      : reservationIntent === "reserve_onsite"
        ? "Submit Reservation & Visit Request"
        : "Submit Reservation Request";

  const summaryNote = isViewingOnly
    ? "Your viewing request will be submitted for schedule confirmation."
    : isRental
      ? "Deposit and first month payment are required after approval."
      : "Full payment is required once this reservation is approved.";

  return (
    <>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-white sm:p-4">
  <div className="mb-3 rounded-2xl border border-blue-100/80 p-4 sm:p-5">
    <p className="text-[12px] font-bold uppercase text-blue-700">
      Reservation Summary
    </p>

    <div className="mt-3 space-y-2 text-sm text-gray-600">
      <div className="flex items-center justify-between gap-4">
        <span>Status</span>
        <span className="font-medium text-gray-900">
          {isViewingOnly ? "No Payment Required" : "Pending Approval"}
        </span>
      </div>

      {/* <div className="flex items-center justify-between gap-4">
        <span>Subtotal</span>
        <span className="font-medium text-gray-900">
          {formatCurrency(resolvedSubtotal)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span>VAT ({Math.round(vatRate * 100)}%)</span>
        <span className="font-medium text-gray-900">
          {formatCurrency(resolvedVat)}
        </span>
      </div> */}

      <div className="flex items-center justify-between gap-4 pt-1">
        <span>{isRental ? "Due Upon Approval" : "Estimated Total"}</span>
        <span className="font-semibold text-blue-700">
          {formatCurrency(isRental ? resolvedInitialDue : estimatedTotal)}
        </span>
      </div>

      <div className="mt-1 border-t border-blue-100/70 pt-3">
        <div className="flex items-center justify-between gap-4">
          <span>Request Type</span>
          <span className="font-medium text-gray-900">
            {isViewingOnly
              ? "Viewing Only"
              : reservationIntent === "reserve_onsite"
                ? "Reservation + Visit"
                : "Reservation"}
          </span>
        </div>
      </div>
    </div>

    <p className="mt-3 text-xs leading-relaxed text-gray-500">
      {summaryNote}
    </p>
  </div>

  <button
    type="submit"
    disabled={!canSubmit}
    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-base"
  >
    {submitLabel}
  </button>
</div>
    </>
  );
}