import Calendar from "react-calendar";
import { CalendarDays } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { ReservationForm, PaymentCycle } from "../shared/reservation.types";
import type { Unit } from "../../../data/types";

import {
  RESERVATION_LIMITS,
  clampNumber,
  computeRentalEndFromForm,
  getDurationBounds,
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
  subtotalAmount: number;
  vatAmount: number;
  initialDue: number;
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
  subtotalAmount,
  vatAmount,
  initialDue,

  
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-700">
          {form.paymentCycle === "monthly" ? "Lease Start Date" : "Booking Start Date"}
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
              calendarType="gregory"
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
                    endDate: computeRentalEndFromForm(
                      newStart,
                      prev.duration,
                      prev.paymentCycle
                    ),
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
          {form.paymentCycle === "daily"
            ? "Booking Duration (days)"
            : form.paymentCycle === "weekly"
              ? "Booking Duration (weeks)"
              : "Lease Duration (months)"}
        </label>

        <input
          type="number"
          required
          min={getDurationBounds("rental_space", form.durationType, form.paymentCycle).min}
          max={getDurationBounds("rental_space", form.durationType, form.paymentCycle).max}
          step={1}
          value={form.duration}
          onChange={(e) => {
  const parsed = parseInt(e.target.value, 10);

  setForm((prev) => {
    const bounds = getDurationBounds(
      "rental_space",
      prev.paymentCycle === "monthly" ? "months" : "days",
      prev.paymentCycle
    );

    const safeDuration = clampNumber(
      Number.isNaN(parsed) ? bounds.min : parsed,
      bounds.min,
      bounds.max
    );

    const safeStartDate = prev.startDate ?? getTomorrow();
    const nextDurationType =
      prev.paymentCycle === "monthly" ? "months" : "days";

    return {
      ...prev,
      startDate: safeStartDate,
      duration: safeDuration,
      durationType: nextDurationType,
      paymentCycle: prev.paymentCycle,
      paymentMode:
        prev.paymentCycle === "monthly"
          ? "deposit_plus_first_month"
          : "full_upfront",
      endDate: computeRentalEndFromForm(
        safeStartDate,
        safeDuration,
        prev.paymentCycle
      ),
    };
  });
}}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
        />

        {formErrors.duration && (
          <p className="mt-1 text-xs text-red-600">{formErrors.duration}</p>
        )}

        <p className="mt-2 text-xs text-gray-500">
          {form.paymentCycle === "daily"
            ? `Minimum ${RESERVATION_LIMITS.rental_space.minDays} day(s), maximum ${RESERVATION_LIMITS.rental_space.maxDays} day(s).`
            : form.paymentCycle === "weekly"
              ? `Minimum ${RESERVATION_LIMITS.rental_space.minWeeks} week(s), maximum ${RESERVATION_LIMITS.rental_space.maxWeeks} week(s).`
              : `Minimum ${RESERVATION_LIMITS.rental_space.minMonths} months (1 year), maximum ${RESERVATION_LIMITS.rental_space.maxMonths} months.`}
        </p>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm text-gray-700">
          {form.paymentCycle === "monthly"
  ? "Lease End Date (Auto-calculated)"
  : "Booking End Date (Auto-calculated)"}
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
    Booking Term
  </label>

  <select
    value={form.paymentCycle}
    onChange={(e) => {
  const nextCycle = e.target.value as PaymentCycle;

  setForm((prev) => {
    const nextDurationType =
      nextCycle === "monthly" ? "months" : "days";

    const bounds = getDurationBounds(
      "rental_space",
      nextDurationType,
      nextCycle
    );

    const safeStartDate = prev.startDate ?? getTomorrow();

    // Reset to the new term's minimum when switching term
    const nextDuration = bounds.min;

    return {
      ...prev,
      paymentCycle: nextCycle,
      paymentMode:
        nextCycle === "monthly"
          ? "deposit_plus_first_month"
          : "full_upfront",
      durationType: nextDurationType,
      duration: nextDuration,
      endDate: computeRentalEndFromForm(
        safeStartDate,
        nextDuration,
        nextCycle
      ),
    };
  });
}}  
    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
  >
    <option value="daily">Daily</option>
    <option value="weekly">Weekly</option>
    <option value="monthly">Monthly</option>
  </select>

  <p className="mt-2 text-xs text-gray-500">
  Daily and weekly bookings are flexible stays and require full upfront payment.
  Monthly leases require a security deposit plus the first month.
</p>
</div>

      <div className="rounded-2xl border border-blue-100 bg-white p-4">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
    Billing Preview
  </p>

  <div className="mt-3 space-y-2 text-sm text-gray-700">
    <div className="flex items-center justify-between gap-4">
      <span>
  {form.paymentCycle === "daily"
    ? "Daily base rate"
    : form.paymentCycle === "weekly"
      ? "Weekly base rate"
      : "Monthly base rate"}
</span>
      <span className="font-medium text-gray-900">
        {formatCurrency(rentalMonthlyAmount)}
      </span>
    </div>

    <div className="flex items-center justify-between gap-4">
      <span>Lease duration</span>
      <span className="font-medium text-gray-900">
        {form.duration || 0}{" "}
{form.paymentCycle === "daily"
  ? "day(s)"
  : form.paymentCycle === "weekly"
    ? "week(s)"
    : "month(s)"}
      </span>
    </div>

    <div className="flex items-center justify-between gap-4">
      <span>Subtotal</span>
      <span className="font-medium text-gray-900">
        {formatCurrency(subtotalAmount)}
      </span>
    </div>

    <div className="flex items-center justify-between gap-4">
      <span>VAT (12%)</span>
      <span className="font-medium text-gray-900">
        {formatCurrency(vatAmount)}
      </span>
    </div>

    <div className="flex items-center justify-between gap-4">
      <span>
  {form.paymentCycle === "daily"
    ? "Daily full payment"
    : form.paymentCycle === "weekly"
      ? "Weekly full payment"
      : "Initial required payment"}
</span>
      <span className="font-medium text-gray-900">
        {formatCurrency(rentalRequiredPayment)}
      </span>
    </div>

    <div className="flex items-center justify-between gap-4 rounded-xl bg-blue-50 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
        Due upon approval
      </span>
      <span className="text-base font-semibold text-blue-700">
        {formatCurrency(initialDue)}
      </span>
    </div>

    <div className="flex items-center justify-between gap-4 border-t border-blue-100 pt-2">
      <span className="font-medium text-gray-900">{form.paymentCycle === "monthly"
  ? "Total lease amount"
  : "Total booking amount"}</span>
      <span className="text-base font-semibold text-blue-700">
        {formatCurrency(estimatedTotal)}
      </span>
    </div>
  </div>

  <p className="mt-3 text-xs leading-relaxed text-gray-500">
    {form.paymentCycle === "monthly"
  ? "Initial payment includes the security deposit and first month. The remaining lease continues through monthly billing."
  : "Flexible stays are billed upfront based on the selected daily or weekly term."}
  </p>
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