import type { ReservationIntent } from "./reservation.types";

interface ReservationSummarySectionProps {
  isViewingOnly: boolean;
  estimatedTotal: number;
  reservationIntent: ReservationIntent;
  isSubmitting: boolean;
  canSubmit: boolean;
  formatCurrency: (value: number) => string;
}

export default function ReservationSummarySection({
  isViewingOnly,
  estimatedTotal,
  reservationIntent,
  isSubmitting,
  canSubmit,
  formatCurrency,
}: ReservationSummarySectionProps) {
  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-1 text-sm text-gray-600">
          {isViewingOnly ? "Appointment Summary" : "Reservation Summary"}
        </p>

        <div className="text-lg font-bold text-gray-900">
          {isViewingOnly ? "No payment required" : formatCurrency(estimatedTotal)}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          {isViewingOnly
            ? "* This request is for viewing only and does not require payment."
            : "* Reservation requests are subject to admin approval before payment is finalized."}
        </p>
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