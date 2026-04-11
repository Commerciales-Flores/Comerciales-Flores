import type { ReservationForm } from "../shared/reservation.types";
import type { ParkingSlot } from "../../../data/types";
import { formatDate } from "../../../utils/date";
import { X } from "lucide-react";
import {
  getParkingDurationBounds,
  validateParkingDuration,
  getParkingMinStartDate,
  isSameParkingDay,
  getParkingEarliestStartTimeLabel,
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

function computeEndTime(start?: string, duration?: number) {
  if (!start || !duration) return "";

  const [h, m] = start.split(":").map(Number);

  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setHours(date.getHours() + duration);

  const hours = date.getHours();
  const minutes = date.getMinutes();

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = ((hours + 11) % 12) + 1;

  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

const BUSINESS_HOUR_OPTIONS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
];

function formatTime12h(time?: string) {
  if (!time) return "";

  const [h, m] = time.split(":").map(Number);

  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = ((h + 11) % 12) + 1;

  return `${displayHour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

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
  const parkingDurationType: ParkingDurationType =
    form.durationType === "hours" ||
    form.durationType === "days" ||
    form.durationType === "months"
      ? form.durationType
      : "months";

    const endTime =
  parkingDurationType === "hours"
    ? computeEndTime(form.appointmentTime, form.duration)
    : "";

  const bounds = getParkingDurationBounds(parkingDurationType);

  const durationError = validateParkingDuration({
    duration: form.duration,
    durationType: parkingDurationType,
  });

  const businessHoursError =
  parkingDurationType === "hours" && form.appointmentTime
    ? (() => {
        const startHour = Number(form.appointmentTime.split(":")[0]);
        if (startHour + form.duration > 17) {
          return "Exceeds business hours (5 PM)";
        }
        return "";
      })()
    : "";

  const minStartDate = getParkingMinStartDate();
  const minStartDateValue = toDateInputValue(minStartDate);
  const isSameDayStart = isSameParkingDay(form.startDate);

  const handleDurationTypeChange = (type: ParkingDurationType) => {
    const nextBounds = getParkingDurationBounds(type);

    setForm((prev) => ({
      ...prev,
      durationType: type,
      duration: Math.min(
        Math.max(prev.duration || nextBounds.min, nextBounds.min),
        nextBounds.max
      ),
      appointmentTime: type === "hours" ? prev.appointmentTime || "09:00" : "",
    }));
  };

  const helperText =
    parkingDurationType === "hours"
      ? "Same-day parking is allowed. Hourly stays are limited to business hours only."
      : parkingDurationType === "days"
        ? "Same-day parking is allowed. Daily stays are limited to 30 days."
        : "Same-day parking is allowed. Monthly stays are limited to 12 months.";

  const durationLabel =
    parkingDurationType === "hours"
      ? `${form.duration || 0} hour(s)`
      : parkingDurationType === "days"
        ? `${form.duration || 0} day(s)`
        : `${form.duration || 0} month(s)`;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        Parking reservations may start <strong>today</strong>. Choose the
        duration type, then enter the number of{" "}
        <strong>{parkingDurationType}</strong>.
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

        <p className="mt-2 text-xs text-gray-500">{helperText}</p>

        {parkingDurationType === "hours" && (
          <p className="mt-1 text-xs text-blue-600">
            Hourly parking uses business hours only:{" "}
            <strong>9:00 AM to 5:00 PM</strong>.
          </p>
        )}
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
              const nextStart = value ? new Date(`${value}T00:00:00`) : undefined;

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
          {durationError || businessHoursError ? (
            <p className="mt-1 text-xs text-red-600">
                {durationError || businessHoursError}
            </p>
            ) : (
            <p className="mt-1 text-xs text-gray-500">
                Allowed: {bounds.min} to {bounds.max} {parkingDurationType}
            </p>
            )}
        </div>
      </div>

      {parkingDurationType === "hours" && (
        <div>
          <label className="mb-2 block text-sm text-gray-700">
            Start Time
          </label>
          <select
            value={form.appointmentTime || "09:00"}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                appointmentTime: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            {BUSINESS_HOUR_OPTIONS.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Choose a business-hour starting time for hourly parking.
          </p>
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
                You may reserve another slot as a separate request, subject to
                admin approval.
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