import { useEffect, useMemo, useRef, useState } from "react";
import type { ReservationForm } from "../shared/reservation.types";
import type { ParkingSlot } from "../../../data/types";
import { formatDate } from "../../../utils/date";
import { ChevronDown, X } from "lucide-react";
import {
  getParkingDurationBounds,
  validateParkingDuration,
  getParkingMinStartDate,
  isSameParkingDay,
  getParkingEarliestStartTimeLabel,
  getParkingDurationPolicyText,
  getParkingEarliestSelectableTimeValue,
} from "./parking.utils";

type ParkingDurationType = "hours" | "days" | "months";

interface Props {
  form: ReservationForm;
  setForm: React.Dispatch<React.SetStateAction<ReservationForm>>;
  selectedSlotObject: ParkingSlot | null;
  setIsSlotPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  clearSlotSelection: () => void;
  updateReservationField: (field: keyof ReservationForm, value: string) => void;
  handleFieldBlur: (field: keyof ReservationForm, value: string) => void;
  formErrors: Record<string, string>;
  fallbackImage: string;
}

function toDateInputValue(date?: Date) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime12h(time?: string) {
  if (!time) return "";

  const [h, m] = time.split(":").map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";

  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = ((h + 11) % 12) + 1;

  return `${displayHour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function computeHourlyEndTime(start?: string, duration?: number) {
  if (!start || !duration || !Number.isFinite(duration)) return "";

  const [h, m] = start.split(":").map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";

  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setHours(date.getHours() + duration);

  const hours = date.getHours();
  const minutes = date.getMinutes();

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = ((hours + 11) % 12) + 1;

  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function timeValueToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

const HOURLY_TIME_OPTIONS = [
  { value: "00:00", label: "12:00 AM" },
  { value: "01:00", label: "1:00 AM" },
  { value: "02:00", label: "2:00 AM" },
  { value: "03:00", label: "3:00 AM" },
  { value: "04:00", label: "4:00 AM" },
  { value: "05:00", label: "5:00 AM" },
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
  { value: "23:00", label: "11:00 PM" },
];

export default function ParkingReservationForm({
  form,
  setForm,
  selectedSlotObject,
  setIsSlotPanelOpen,
  clearSlotSelection,
  updateReservationField,
  handleFieldBlur,
  formErrors,
  fallbackImage,
}: Props) {
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const timeDropdownRef = useRef<HTMLDivElement | null>(null);

  const parkingDurationType: ParkingDurationType =
    form.durationType === "hours" ||
    form.durationType === "days" ||
    form.durationType === "months"
      ? form.durationType
      : "months";

  const bounds = getParkingDurationBounds(parkingDurationType);

  const durationError = validateParkingDuration({
    duration: form.duration,
    durationType: parkingDurationType,
  });

  const minStartDate = getParkingMinStartDate();
  const minStartDateValue = toDateInputValue(minStartDate);
  const isSameDayStart = isSameParkingDay(form.startDate);
  const earliestSameDayTimeValue = getParkingEarliestSelectableTimeValue();

  const availableHourlyOptions = useMemo(() => {
    if (parkingDurationType !== "hours") return HOURLY_TIME_OPTIONS;
    if (!isSameDayStart) return HOURLY_TIME_OPTIONS;

    const earliestMinutes = timeValueToMinutes(earliestSameDayTimeValue);

    return HOURLY_TIME_OPTIONS.filter(
      (option) => timeValueToMinutes(option.value) >= earliestMinutes
    );
  }, [parkingDurationType, isSameDayStart, earliestSameDayTimeValue]);

  useEffect(() => {
    if (parkingDurationType !== "hours") return;

    const fallbackTime = availableHourlyOptions[0]?.value || "";

    if (!form.appointmentTime) {
      setForm((prev) => ({
        ...prev,
        appointmentTime: fallbackTime,
      }));
      return;
    }

    if (!isSameDayStart) return;

    const selectedMinutes = timeValueToMinutes(form.appointmentTime);
    const earliestMinutes = timeValueToMinutes(earliestSameDayTimeValue);

    if (selectedMinutes < earliestMinutes) {
      setForm((prev) => ({
        ...prev,
        appointmentTime: fallbackTime,
      }));
    }
  }, [
    parkingDurationType,
    isSameDayStart,
    form.appointmentTime,
    earliestSameDayTimeValue,
    availableHourlyOptions,
    setForm,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        timeDropdownRef.current &&
        !timeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTimeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (parkingDurationType !== "hours") {
      setIsTimeDropdownOpen(false);
    }
  }, [parkingDurationType]);

  const endTime =
    parkingDurationType === "hours"
      ? computeHourlyEndTime(form.appointmentTime, form.duration)
      : "";

  const handleDurationTypeChange = (type: ParkingDurationType) => {
    const nextBounds = getParkingDurationBounds(type);

    setForm((prev) => ({
      ...prev,
      durationType: type,
      duration: Math.min(
        Math.max(prev.duration || nextBounds.min, nextBounds.min),
        nextBounds.max
      ),
      appointmentTime:
        type === "hours"
          ? prev.appointmentTime || availableHourlyOptions[0]?.value || "00:00"
          : "",
    }));
  };

  const helperText =
    parkingDurationType === "hours"
      ? "Hourly parking is limited to whole-hour blocks only, up to 24 hours."
      : parkingDurationType === "days"
        ? "Daily parking is billed in full-day blocks only. Partial-day daily reservations are not supported."
        : "Monthly parking is billed in full-month blocks only.";

  const durationLabel =
    parkingDurationType === "hours"
      ? `${form.duration || 0} hour(s)`
      : parkingDurationType === "days"
        ? `${form.duration || 0} day(s)`
        : `${form.duration || 0} month(s)`;

  const selectedTimeValue =
    form.appointmentTime || availableHourlyOptions[0]?.value || "";

  const selectedTimeLabel = formatTime12h(selectedTimeValue);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        Parking reservations may start <strong>today</strong>. Same-day hourly
        reservations are time-sensitive and only show valid future time blocks.
        <strong> Extensions are not supported</strong> for parking at this time.
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Reservation Period
        </label>

        <div className="grid grid-cols-3 gap-2">
          {(["hours", "days", "months"] as const).map((type) => {
            const active = parkingDurationType === type;

            const label =
              type === "hours"
                ? "Hourly"
                : type === "days"
                  ? "Daily"
                  : "Monthly";

            return (
              <button
                key={type}
                type="button"
                onClick={() => handleDurationTypeChange(type)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium tracking-wide transition ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-700"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <p className="mt-1 text-xs text-blue-600">
          {getParkingDurationPolicyText(parkingDurationType)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            min={minStartDateValue}
            value={toDateInputValue(form.startDate)}
            onChange={(e) => {
              const value = e.target.value;
              const nextStart = value
                ? new Date(`${value}T00:00:00`)
                : undefined;

              setForm((prev) => ({
                ...prev,
                startDate: nextStart,
              }));
            }}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            Earliest allowed start date: today
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-700">
            Duration
          </label>
          <input
            type="number"
            min={bounds.min}
            max={bounds.max}
            step={1}
            value={form.duration || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                duration: Number(e.target.value),
              }))
            }
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${
              durationError
                ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
            }`}
            placeholder={`Enter number of ${parkingDurationType}`}
          />
          {durationError ? (
            <p className="mt-1 text-xs text-red-600">{durationError}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Allowed: {bounds.min} to {bounds.max} {parkingDurationType}
            </p>
          )}
        </div>
      </div>

      {parkingDurationType === "hours" && (
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm text-gray-700">
              Start Time
            </label>

            <div className="relative" ref={timeDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  if (availableHourlyOptions.length > 0) {
                    setIsTimeDropdownOpen((prev) => !prev);
                  }
                }}
                className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm transition ${
                  availableHourlyOptions.length === 0
                    ? "cursor-not-allowed border-red-200 bg-red-50 text-red-600"
                    : "border-gray-300 text-gray-700 hover:border-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                }`}
                disabled={availableHourlyOptions.length === 0}
              >
                <span>
                  {availableHourlyOptions.length === 0
                    ? "No available time slots"
                    : selectedTimeLabel || "Select start time"}
                </span>
                <ChevronDown
                  className={`size-4 transition ${
                    isTimeDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isTimeDropdownOpen && availableHourlyOptions.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">
                  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
                    {availableHourlyOptions.map((time) => {
                      const isSelected = selectedTimeValue === time.value;

                      return (
                        <button
                          key={time.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              appointmentTime: time.value,
                            }));
                            setIsTimeDropdownOpen(false);
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                              : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                          }`}
                        >
                          {time.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Select a whole-hour start time for hourly parking.
            </p>

            {isSameDayStart && availableHourlyOptions.length > 0 && (
              <p className="mt-1 text-xs text-blue-600">
                For same-day hourly parking, the earliest allowed start time is{" "}
                <strong>{getParkingEarliestStartTimeLabel()}</strong>.
              </p>
            )}

            {isSameDayStart && availableHourlyOptions.length === 0 && (
              <p className="mt-1 text-xs text-red-600">
                No same-day hourly time slots are available anymore. Please
                choose another date.
              </p>
            )}
          </div>

          {form.appointmentTime && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Selected start time: <strong>{selectedTimeLabel}</strong>
              {endTime && (
                <span className="ml-1">
                  · Estimated end time: <strong>{endTime}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Calculated Duration
        </label>
        <input
          type="text"
          readOnly
          value={durationLabel}
          className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
        />
      </div>

      {form.startDate && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Start date: <strong>{formatDate(form.startDate)}</strong>

          {parkingDurationType === "hours" && form.appointmentTime && (
            <>
              <span className="ml-1">
                · Start time: <strong>{formatTime12h(form.appointmentTime)}</strong>
              </span>

              {endTime && (
                <span className="ml-1">
                  · End time: <strong>{endTime}</strong>
                </span>
              )}
            </>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Charges are based on the <strong>reserved period</strong>. Leaving early
        does not reduce the total reservation charge.
      </div>

      <div className="space-y-3">
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700">
      Parking Slot
    </label>

    {selectedSlotObject ? (
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-4">
        <img
          src={selectedSlotObject.imageUrl || fallbackImage}
          alt={
            selectedSlotObject.slotCode ||
            selectedSlotObject.label ||
            "Parking Slot"
          }
          className="h-32 w-full rounded-xl object-cover sm:h-20 sm:w-28"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Selected Slot
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Additional time requires a new reservation request, subject to
            slot availability and admin approval.
          </p>
          <p className="truncate text-lg font-bold text-blue-700">
            {selectedSlotObject.slotCode ||
              selectedSlotObject.label ||
              "Parking Slot"}
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setIsSlotPanelOpen(true)}
            className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:flex-none"
          >
            Change
          </button>

          <button
            type="button"
            onClick={clearSlotSelection}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Clear selection"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setIsSlotPanelOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-sm font-medium text-gray-500 transition hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
      >
        Click to View & Select a Slot
      </button>
    )}
  </div>
   <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
    <p>
      Slot availability is based on existing approved or confirmed reservations
      for the selected date and time.
    </p>

    <p className="mt-1">
      <span className="font-medium text-green-700">Available</span> — Slot can
      still be reserved.
    </p>

    <p className="mt-1">
      <span className="font-medium text-red-700">Occupied</span> — Another user
      already reserved this slot for the selected schedule.
    </p>

    <p className="mt-1">
      <span className="font-medium text-blue-700">Reserved by you</span> — You
      already have a reservation for this slot.
    </p>

    <p className="mt-1">
      <span className="font-medium text-gray-700">Unavailable</span> — Slot is
      inactive, under maintenance, or currently blocked.
    </p>
  </div>

  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
    <p>
      Slot availability is checked against existing approved or confirmed parking
      reservations for the same slot and selected date range.
    </p>
    <p className="mt-1">
      <span className="font-medium text-green-700">Available</span> means the slot
      can still be reserved for your selected schedule.
    </p>
    <p className="mt-1">
      <span className="font-medium text-red-700">Occupied</span> means another user
      already has an overlapping approved or confirmed reservation for that slot.
    </p>
    <p className="mt-1">
      <span className="font-medium text-blue-700">Reserved by you</span> means the
      overlapping reservation belongs to your account.
    </p>
    <p className="mt-1">
      <span className="font-medium text-gray-700">Unavailable</span> means the slot
      is inactive, under maintenance, or currently marked occupied.
    </p>
  </div>
</div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Vehicle Type
        </label>
        <input
          type="text"
          required
          maxLength={50}
          value={form.vehicleType}
          onChange={(e) =>
            updateReservationField("vehicleType", e.target.value)
          }
          onBlur={(e) => handleFieldBlur("vehicleType", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="e.g., Sedan, SUV, Motorcycle"
        />
        {formErrors.vehicleType && (
          <p className="mt-1 text-xs text-red-600">
            {formErrors.vehicleType}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Plate Number
        </label>
        <input
          type="text"
          required
          maxLength={20}
          value={form.plateNumber}
          onChange={(e) =>
            updateReservationField("plateNumber", e.target.value)
          }
          onBlur={(e) => handleFieldBlur("plateNumber", e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          placeholder="ABC 1234"
        />
        {formErrors.plateNumber && (
          <p className="mt-1 text-xs text-red-600">
            {formErrors.plateNumber}
          </p>
        )}
      </div>
    </div>
  );
}