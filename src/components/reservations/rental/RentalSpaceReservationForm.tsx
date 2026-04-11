import Calendar from "react-calendar";
import { CalendarDays } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { ReservationForm, PaymentCycle } from "../shared/reservation.types";
import type { Unit } from "../../../data/types";

import {
  RESERVATION_LIMITS,
  clampNumber,
  computeEndFromForm,
  getTomorrow,
} from "../shared/reservation.utils";
import { formatDate } from "../../../utils/date";
import { formatCurrency } from "../../../utils/currency";

interface Props {
  form: ReservationForm;
  setForm: Dispatch<SetStateAction<ReservationForm>>;
  updateReservationField: (field: keyof ReservationForm, value: string) => void;
  handleFieldBlur: (field: keyof ReservationForm, value: string) => void;
  formErrors: Record<string, string>;
  selectedUnitData: Unit;

  showCalendar: boolean;
  setShowCalendar: Dispatch<SetStateAction<boolean>>;
  calendarLegend: ReactNode;
  isCalendarTileDisabled: ({ date, view }: { date: Date; view: string }) => boolean;
  getCalendarTileClassName: ({ date, view }: { date: Date; view: string }) => string;

  getMaxReservationDate: (unitType: Unit["type"]) => Date;
  rentalMonthlyAmount: number;
  rentalRequiredPayment: number;
  estimatedTotal: number;
}

export default function RentalReservationForm({
  form,
  setForm,
  updateReservationField,
  handleFieldBlur,
  formErrors,
  selectedUnitData,
  showCalendar,
  setShowCalendar,
  calendarLegend,
  isCalendarTileDisabled,
  getCalendarTileClassName,
  getMaxReservationDate,
  rentalMonthlyAmount,
  rentalRequiredPayment,
  estimatedTotal,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Lease Start Date
        </label>

        <button
          type="button"
          onClick={() => setShowCalendar((s) => !s)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-left text-sm transition hover:border-blue-400 sm:text-base"
        >
          <span className={form.startDate ? "text-gray-900" : "text-gray-400"}>
            {form.startDate
              ? formatDate(form.startDate)
              : "Please select lease start date"}
          </span>

          <CalendarDays className="ml-3 size-4 shrink-0 text-blue-500" />
        </button>

        {showCalendar && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
            <Calendar
              value={form.startDate ?? undefined}
              tileDisabled={isCalendarTileDisabled}
              tileClassName={getCalendarTileClassName}
              selectRange={false}
              minDate={getTomorrow()}
              maxDate={getMaxReservationDate(selectedUnitData.type)}
              defaultActiveStartDate={getTomorrow()}
              onChange={(value) => {
                if (value instanceof Date) {
                  const newStart = new Date(value);
                  newStart.setHours(0, 0, 0, 0);

                  setForm((prev) => ({
                    ...prev,
                    startDate: newStart,
                    endDate: computeEndFromForm(newStart, prev.duration, "months"),
                  }));

                  setShowCalendar(false);
                }
              }}
              className="w-full border-0"
            />
            {calendarLegend}
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 mt-4 block text-sm text-gray-700">
          Lease Duration (months)
        </label>

        <input
          type="number"
          required
          min={RESERVATION_LIMITS.rental_space.minMonths}
          max={RESERVATION_LIMITS.rental_space.maxMonths}
          step={1}
          value={form.duration}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);

            const safeDuration = clampNumber(
              Number.isNaN(parsed)
                ? RESERVATION_LIMITS.rental_space.minMonths
                : parsed,
              RESERVATION_LIMITS.rental_space.minMonths,
              RESERVATION_LIMITS.rental_space.maxMonths
            );

            setForm((prev) => {
              const safeStartDate = prev.startDate ?? getTomorrow();

              return {
                ...prev,
                startDate: safeStartDate,
                duration: safeDuration,
                durationType: "months",
                paymentCycle:
                  prev.paymentCycle === "quarterly" && safeDuration < 3
                    ? "monthly"
                    : prev.paymentCycle,
                endDate: computeEndFromForm(safeStartDate, safeDuration, "months"),
              };
            });
          }}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
        />

        {formErrors.duration && (
          <p className="mt-1 text-xs text-red-600">{formErrors.duration}</p>
        )}

        <p className="mt-2 text-xs text-gray-500">
          Minimum 12 months (1 year), maximum {RESERVATION_LIMITS.rental_space.maxMonths} months.
        </p>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm text-gray-700">
          Lease End Date (Auto-calculated)
        </label>

        <input
          type="text"
          readOnly
          value={formatDate(form.endDate)}
          className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm sm:text-base"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Payment Cycle
        </label>

        <select
          value={form.paymentCycle}
          onChange={(e) => {
            const nextCycle = e.target.value as PaymentCycle;

            if (nextCycle === "quarterly" && form.duration < 3) {
              return;
            }

            setForm((prev) => ({
              ...prev,
              paymentCycle: nextCycle,
            }));
          }}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
        >
          <option value="monthly">Monthly Installments</option>
          <option value="quarterly" disabled={form.duration < 3}>
            Quarterly Payments
          </option>
          <option value="full">Full Payment</option>
        </select>

        {form.duration < 3 && (
          <p className="mt-2 text-xs text-amber-600">
            Quarterly payment is available only for lease durations of at least 3 months.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <p className="text-xs font-bold uppercase text-blue-700">
          Billing Summary
        </p>

        <div className="mt-2 space-y-1 text-sm text-gray-700">
          <div className="flex items-center justify-between gap-4">
            <span>Monthly rate</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(rentalMonthlyAmount)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span>
              {form.paymentCycle === "quarterly"
                ? "Quarterly minimum"
                : form.paymentCycle === "full"
                  ? "Full payment"
                  : "Monthly minimum"}
            </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(rentalRequiredPayment)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-blue-100 pt-2">
            <span>Total lease amount</span>
            <span className="font-bold text-blue-700">
              {formatCurrency(estimatedTotal)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Business Type
        </label>

        <input
          type="text"
          required
          maxLength={100}
          value={form.businessType}
          onChange={(e) => updateReservationField("businessType", e.target.value)}
          onBlur={(e) => handleFieldBlur("businessType", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
          placeholder="e.g., Retail, Office, Restaurant"
        />

        {formErrors.businessType && (
          <p className="mt-1 text-xs text-red-600">
            {formErrors.businessType}
          </p>
        )}
      </div>
    </div>
  );
}