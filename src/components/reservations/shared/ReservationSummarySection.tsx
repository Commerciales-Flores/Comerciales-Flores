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

  const dueNowLabel =
    unitType === "rental_space"
      ? "Amount Due Now"
      : "Full Payment Due";

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-1 text-sm text-gray-600">
          {isViewingOnly ? "Appointment Summary" : "Reservation Summary"}
        </p>

        {isViewingOnly ? (
          <>
            <div className="text-lg font-bold text-gray-900">
              No payment required
            </div>

            <p className="mt-2 text-xs text-gray-500">
              * This request is for viewing only and does not require payment.
            </p>
          </>
        ) : (
          <>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(resolvedSubtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-600">
                <span>VAT (12%)</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(resolvedVat)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-gray-900">
                <span className="font-semibold">Total Contract Amount</span>
                <span className="text-base font-bold">
                  {formatCurrency(estimatedTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-blue-700">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {dueNowLabel}
                </span>
                <span className="text-sm font-bold">
                  {formatCurrency(resolvedInitialDue)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              {unitType === "rental_space"
                ? "* Initial payment includes the required deposit and first month, subject to admin approval."
                : "* Reservation requests are subject to admin approval before payment is finalized."}
            </p>
          </>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-base"
        >
          {isSubmitting
            ? "Submitting..."
            : isViewingOnly
              ? "Book Viewing Appointment"
              : reservationIntent === "reserve_onsite"
                ? "Submit Reservation & Visit Request"
                : "Submit Reservation Request"}
        </button>
      </div>
    </>
  );
}