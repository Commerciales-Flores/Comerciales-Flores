import { useEffect, useMemo, useRef, useState } from "react";
import type { ReservationForm } from "../shared/reservation.types";
import { formatDate } from "../../../utils/date";
import { ChevronDown } from "lucide-react";
import {
  getParkingDurationBounds,
  getBusinessNow,
  validateParkingDuration,
  getParkingMinStartDate,
  isSameParkingDay,
  getParkingEarliestStartTimeLabel,
  getParkingEarliestSelectableTimeValue,
  buildParkingHourlyOptions,
  PARKING_VEHICLE_TYPE_OPTIONS,
} from "./parking.utils";

import {
  fetchParkingRules,
  DEFAULT_PARKING_RULES,
  type ParkingRules,
} from "../../../data/appSettings";

type ParkingDurationType = "hours" | "days" | "months";

interface Props {
  form: ReservationForm;
  setForm: React.Dispatch<React.SetStateAction<ReservationForm>>;
  updateReservationField: (field: keyof ReservationForm, value: string) => void;
  handleFieldBlur: (field: keyof ReservationForm, value: string) => void;
  formErrors: Record<string, string>;
  estimatedTotal: number;
  subtotalAmount: number;
  vatAmount: number;
  formatCurrency: (value: number) => string;
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

  const date = getBusinessNow();
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

export default function ParkingReservationForm({
  form,
  setForm,
  updateReservationField,
  handleFieldBlur,
  formErrors,
}: Props) {
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [parkingRules, setParkingRules] = useState<ParkingRules>(
    DEFAULT_PARKING_RULES,
  );
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
  const earliestSameDayTimeValue = getParkingEarliestSelectableTimeValue(
    parkingRules.same_day_lead_minutes,
  );

  const availableHourlyOptions = useMemo(() => {
    const baseOptions = buildParkingHourlyOptions(
      parkingRules.hourly_start,
      parkingRules.hourly_end,
    );

    if (parkingDurationType !== "hours") return baseOptions;
    if (!isSameDayStart) return baseOptions;

    const earliestMinutes = timeValueToMinutes(earliestSameDayTimeValue);

    return baseOptions.filter(
      (option) => timeValueToMinutes(option.value) >= earliestMinutes,
    );
  }, [
    parkingDurationType,
    isSameDayStart,
    earliestSameDayTimeValue,
    parkingRules.hourly_start,
    parkingRules.hourly_end,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadParkingRules = async () => {
      const rules = await fetchParkingRules();

      if (!cancelled) {
        setParkingRules(rules);
      }
    };

    void loadParkingRules();

    return () => {
      cancelled = true;
    };
  }, []);

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
        nextBounds.max,
      ),
      appointmentTime:
        type === "hours"
          ? prev.appointmentTime || availableHourlyOptions[0]?.value || "00:00"
          : "",
    }));
  };

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
      <div className="space-y-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          Parking reservations are submitted as <strong>requests</strong>. A
          specific slot will be assigned by admin after availability review.
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Payment is collected <strong>only after admin approval</strong>.
          Please wait for confirmation before making any parking payment.
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Hourly parking currently operates from{" "}
          <strong>
            {formatTime12h(parkingRules.hourly_start)} to{" "}
            {formatTime12h(parkingRules.hourly_end)}
          </strong>
          . These hours may be adjusted by admin later.
        </div>
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
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-gray-700">Start Date</label>
          <input
            type="date"
            min={minStartDateValue}
            value={toDateInputValue(form.startDate)}
            onChange={(e) => {
              const value = e.target.value;
              const nextStart = value
                ? new Date(`${value}T00:00:00+08:00`)
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
          <label className="mb-2 block text-sm text-gray-700">Duration</label>
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
                <strong>
                  {getParkingEarliestStartTimeLabel(
                    parkingRules.same_day_lead_minutes,
                  )}
                </strong>
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
                · Start time:{" "}
                <strong>{formatTime12h(form.appointmentTime)}</strong>
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
        Charges are based on the approved reservation period. Leaving early does
        not reduce the final billed amount.
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Slot Assignment</p>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          You do not need to choose a specific parking slot. After you submit
          this request, admin will review availability and assign a slot for
          your selected schedule.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">Vehicle Type</label>

        <select
          required
          value={form.vehicleType}
          onChange={(e) =>
            updateReservationField("vehicleType", e.target.value)
          }
          onBlur={(e) => handleFieldBlur("vehicleType", e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Select vehicle type</option>
          {PARKING_VEHICLE_TYPE_OPTIONS.map((vehicleType) => (
            <option key={vehicleType} value={vehicleType}>
              {vehicleType}
            </option>
          ))}
        </select>

        {formErrors.vehicleType && (
          <p className="mt-1 text-xs text-red-600">{formErrors.vehicleType}</p>
        )}

        <p className="mt-1 text-xs text-slate-500">
          Larger vehicles may require admin review and may be rejected if the
          available slot cannot safely accommodate the vehicle.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">Plate Number</label>
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
          <p className="mt-1 text-xs text-red-600">{formErrors.plateNumber}</p>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {parkingDurationType === "hours"
          ? "Billed in whole-hour blocks."
          : parkingDurationType === "days"
            ? "Billed in full-day blocks."
            : "Billed in full-month blocks."}
      </p>
    </div>
  );
}
