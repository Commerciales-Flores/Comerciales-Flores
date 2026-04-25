import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import { CalendarDays } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { ReservationForm } from "../shared/reservation.types";
import type { Unit } from "../../../contexts/DataContext";

import {
  RESERVATION_LIMITS,
  getTomorrow,
} from "../shared/reservation.utils";
import {
  endOfLocalDay,
  startOfLocalDay,
} from "./functionHall.utils";
import { formatDate } from "../../../utils/date";

interface Props {
  form: ReservationForm;
  setForm: Dispatch<SetStateAction<ReservationForm>>;
  updateReservationField: (field: keyof ReservationForm, value: string) => void;
  handleFieldBlur: (field: keyof ReservationForm, value: string) => void;
  formErrors: Record<string, string>;
  conflictMessage: string;
  setConflictMessage: Dispatch<SetStateAction<string>>;
  selectedUnitData: Unit;

  showCalendar: boolean;
  setShowCalendar: Dispatch<SetStateAction<boolean>>;
  calendarLegend: ReactNode;

  isSelectingRangeEnd: boolean;
  setIsSelectingRangeEnd: Dispatch<SetStateAction<boolean>>;

  isCalendarTileDisabled: ({ date, view }: { date: Date; view: string }) => boolean;
  getCalendarTileClassName: ({ date, view }: { date: Date; view: string }) => string;


  selectedUnitBlockingReservations: Array<{
    startDate: string | Date;
    endDate: string | Date;
    status?: string;
  }>;

  rangesOverlap: (
    startA?: string | Date | null,
    endA?: string | Date | null,
    startB?: string | Date | null,
    endB?: string | Date | null
  ) => boolean;

  estimatedTotal: number;
  subtotalAmount: number;
  vatAmount: number;
  formatCurrency: (value: number) => string;
}

function getFunctionHallMaxDate() {
  const base = getTomorrow();
  const max = new Date(base);
  max.setFullYear(max.getFullYear() + 1);
  return max;
}

export default function FunctionHallReservationForm({
  form,
  setForm,
  updateReservationField,
  handleFieldBlur,
  formErrors,
  conflictMessage,
  setConflictMessage,
  selectedUnitData,
  showCalendar,
  setShowCalendar,
  calendarLegend,
  isSelectingRangeEnd,
  setIsSelectingRangeEnd,
  isCalendarTileDisabled,
  getCalendarTileClassName,
  selectedUnitBlockingReservations,
  rangesOverlap,
  }: Props){
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Reservation Dates
        </label>

        <button
          type="button"
          onClick={() => setShowCalendar((s) => !s)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-left text-sm transition hover:border-blue-400 sm:text-base"
        >
          <span
            className={
              form.startDate && form.endDate && form.duration > 0
                ? "text-gray-900"
                : "text-gray-400"
            }
          >
            {form.startDate && form.endDate && form.duration > 0
              ? `${formatDate(form.startDate)} - ${formatDate(form.endDate)}`
              : "Please select reservation dates"}
          </span>

          <CalendarDays className="ml-3 size-4 shrink-0 text-blue-500" />
        </button>

        {showCalendar && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
            <Calendar
              tileDisabled={isCalendarTileDisabled}
              tileClassName={getCalendarTileClassName}
              onChange={(value) => {
                if (!(value instanceof Date)) return;

                const clickedDate = startOfLocalDay(new Date(value));

                const currentStart = form.startDate
                  ? startOfLocalDay(form.startDate)
                  : null;

                const currentEnd = form.endDate
                  ? startOfLocalDay(form.endDate)
                  : null;

                const applyRange = (rangeStart: Date, rangeEnd: Date) => {
                  const safeStart = startOfLocalDay(rangeStart);
                  const safeEndDay = startOfLocalDay(rangeEnd);
                  const adjustedEnd = endOfLocalDay(safeEndDay);

                  const rawDayCount =
                    Math.floor(
                      (safeEndDay.getTime() - safeStart.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;

                  if (rawDayCount < RESERVATION_LIMITS.function_hall.minDays) {
                    setConflictMessage(
                      `Minimum reservation is ${RESERVATION_LIMITS.function_hall.minDays} day(s).`
                    );
                    return false;
                  }

                  if (rawDayCount > RESERVATION_LIMITS.function_hall.maxDays) {
                    setConflictMessage(
                      `Maximum reservation is ${RESERVATION_LIMITS.function_hall.maxDays} day(s).`
                    );
                    return false;
                  }

                  const hasConflict = selectedUnitBlockingReservations.some((r) =>
                    rangesOverlap(safeStart, adjustedEnd, r.startDate, r.endDate)
                  );

                  if (hasConflict) {
                    setConflictMessage(
                      "Please select one continuous available date range. Separate date groups require separate reservations."
                    );
                    return false;
                  }

                  setForm((prev) => ({
                    ...prev,
                    startDate: safeStart,
                    endDate: adjustedEnd,
                    duration: rawDayCount,
                    durationType: "days",
                  }));
                  setConflictMessage("");
                  return true;
                };

                if (!currentStart || !currentEnd) {
                  setForm((prev) => ({
                    ...prev,
                    startDate: clickedDate,
                    endDate: endOfLocalDay(clickedDate),
                    duration: 1,
                    durationType: "days",
                  }));
                  setConflictMessage("");
                  setIsSelectingRangeEnd(true);
                  return;
                }

                if (isSelectingRangeEnd) {
                  const tentativeStart =
                    clickedDate.getTime() < currentStart.getTime()
                      ? clickedDate
                      : currentStart;

                  const tentativeEnd =
                    clickedDate.getTime() < currentStart.getTime()
                      ? currentStart
                      : clickedDate;

                  const applied = applyRange(tentativeStart, tentativeEnd);

                  if (applied) {
                    setIsSelectingRangeEnd(false);
                  }
                  return;
                }

                const distanceToStart = Math.abs(
                  clickedDate.getTime() - currentStart.getTime()
                );
                const distanceToEnd = Math.abs(
                  clickedDate.getTime() - currentEnd.getTime()
                );

                const nextStart =
                  distanceToStart <= distanceToEnd ? clickedDate : currentStart;

                const nextEnd =
                  distanceToStart <= distanceToEnd ? currentEnd : clickedDate;

                const normalizedStart =
                  nextStart.getTime() <= nextEnd.getTime() ? nextStart : nextEnd;
                const normalizedEnd =
                  nextStart.getTime() <= nextEnd.getTime() ? nextEnd : nextStart;

                applyRange(normalizedStart, normalizedEnd);
              }}
              value={
                form.startDate && form.endDate
                  ? [form.startDate, form.endDate]
                  : form.startDate ?? null
              }
              calendarType="gregory"
              selectRange={false}
              minDate={getTomorrow()}
              maxDate={getFunctionHallMaxDate()}
              defaultActiveStartDate={getTomorrow()}
              className="w-full border-0"
            />

            {calendarLegend}

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 text-xs leading-5 text-amber-700">
                <p>
                  Same-day reservations are not allowed. The earliest available booking date is tomorrow.
                </p>
                <p>
                  Function hall reservations must be one continuous available date range.
                  If you need dates separated by unavailable days, please submit separate reservations.
                </p>
              </div>

              {(form.startDate || form.endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      startDate: undefined,
                      endDate: undefined,
                      duration: 0,
                      durationType: "days",
                    }));
                    setConflictMessage("");
                    setIsSelectingRangeEnd(false);
                  }}
                  className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                >
                  Clear dates
                </button>
              )}
            </div>

            {conflictMessage ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {conflictMessage}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-4">
          <label className="mb-2 block text-sm text-gray-700">
            Calculated Duration
          </label>
          <input
            type="text"
            readOnly
            value={form.duration > 0 ? `${form.duration} day(s)` : ""}
            placeholder="Duration will appear here"
            className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm sm:text-base"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Event Purpose
        </label>
        <input
          type="text"
          required
          maxLength={150}
          value={form.eventPurpose}
          onChange={(e) => updateReservationField("eventPurpose", e.target.value)}
          onBlur={(e) => handleFieldBlur("eventPurpose", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
          placeholder="e.g., Wedding, Conference, Birthday"
        />
        {formErrors.eventPurpose && (
          <p className="mt-1 text-xs text-red-600">
            {formErrors.eventPurpose}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Number of Attendees
        </label>
        <input
          type="number"
          required
          min={RESERVATION_LIMITS.attendees.min}
          max={Math.min(
            selectedUnitData.capacity ?? RESERVATION_LIMITS.attendees.max,
            RESERVATION_LIMITS.attendees.max
          )}
          step={1}
          value={form.attendees}
          onChange={(e) => updateReservationField("attendees", e.target.value)}
          onBlur={(e) => handleFieldBlur("attendees", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
        />
        {formErrors.attendees && (
  <p className="mt-1 text-xs text-red-600">
    {formErrors.attendees}
  </p>
)}
</div>


</div>
  );
}