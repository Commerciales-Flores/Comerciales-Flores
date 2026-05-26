import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CarFront,
  Clock3,
  CalendarDays,
  CalendarRange,
  Info,
} from "lucide-react";
import supabase from "../../supabaseClient";
import {
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizePlainText,
  sanitizePhoneInput,
} from "../../utils/DataNormalization";
import {
  getBusinessNow,
  getParkingDurationBounds,
  validateParkingDuration,
  getParkingMinStartDate,
  getParkingMinStartDateInputValue,
  isSameParkingDay,
  getParkingDurationPolicyText,
  getParkingEarliestSelectableTimeValue,
  validateSameDayHourlyParking,
  buildParkingHourlyOptions,
  isParkingRequestAllowedNow,
  parkingDurationRequiresOfficeHours,
  PARKING_VEHICLE_TYPE_OPTIONS,
} from "../reservations/parking/parking.utils";

import {
  fetchParkingRules,
  DEFAULT_PARKING_RULES,
  type ParkingRules,
} from "../../data/appSettings";

type ParkingDurationType = "hours" | "days" | "months";

type GuestParkingForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleType: string;
  plateNumber: string;
  durationType: ParkingDurationType;
  durationValue: string;
  startDate: string;
  startTime: string;
  notes: string;
};

const DURATION_OPTIONS: Array<{
  value: ParkingDurationType;
  label: string;
  helperLabel: string;
  icon: typeof Clock3;
}> = [
  {
    value: "hours",
    label: "Hourly",
    helperLabel: "Short stays",
    icon: Clock3,
  },
  {
    value: "days",
    label: "Daily",
    helperLabel: "Full-day parking",
    icon: CalendarDays,
  },
  {
    value: "months",
    label: "Monthly",
    helperLabel: "Longer-term arrangement",
    icon: CalendarRange,
  },
];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayInputValue() {
  return toDateInputValue(getParkingMinStartDate());
}

function buildInitialForm(): GuestParkingForm {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    vehicleType: "",
    plateNumber: "",
    durationType: "hours",
    durationValue: "1",
    startDate: getTodayInputValue(),
    startTime: "",
    notes: "",
  };
}

function formatTime12h(time?: string) {
  if (!time) return "";

  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";

  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = ((h + 11) % 12) + 1;

  return `${displayHour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

function computeEndTime(start?: string, duration?: number) {
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

export default function GuestParking() {
  const [form, setForm] = useState<GuestParkingForm>(buildInitialForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [parkingRules, setParkingRules] = useState<ParkingRules>(
    DEFAULT_PARKING_RULES,
  );

  const durationBounds = useMemo(
    () => getParkingDurationBounds(form.durationType),
    [form.durationType],
  );

  const selectedDurationRequiresOfficeHours =
    parkingDurationRequiresOfficeHours(form.durationType);

  const parkingRequestsOpenNow = useMemo(
    () =>
      isParkingRequestAllowedNow({
        durationType: form.durationType,
        hourlyStart: parkingRules.hourly_start,
        hourlyEnd: parkingRules.hourly_end,
      }),
    [form.durationType, parkingRules.hourly_start, parkingRules.hourly_end],
  );

  const minStartDateValue = useMemo(
    () =>
      getParkingMinStartDateInputValue({
        durationType: form.durationType,
        hourlyEnd: parkingRules.hourly_end,
      }),
    [form.durationType, parkingRules.hourly_end],
  );

  const formLocked =
    isSubmitting ||
    (selectedDurationRequiresOfficeHours && !parkingRequestsOpenNow);

  const startDateObject = useMemo(() => {
    return form.startDate ? new Date(`${form.startDate}T00:00:00`) : undefined;
  }, [form.startDate]);

  const isSameDayStart = useMemo(
    () => isSameParkingDay(startDateObject),
    [startDateObject],
  );

  const earliestSameDayTimeValue = useMemo(
    () =>
      getParkingEarliestSelectableTimeValue(parkingRules.same_day_lead_minutes),
    [parkingRules.same_day_lead_minutes],
  );

  const availableHourlyOptions = useMemo(() => {
    const baseOptions = buildParkingHourlyOptions(
      parkingRules.hourly_start,
      parkingRules.hourly_end,
    );

    if (form.durationType !== "hours") return baseOptions;
    if (!isSameDayStart) return baseOptions;

    const earliestMinutes = timeValueToMinutes(earliestSameDayTimeValue);

    return baseOptions.filter(
      (option) => timeValueToMinutes(option.value) >= earliestMinutes,
    );
  }, [
    form.durationType,
    isSameDayStart,
    earliestSameDayTimeValue,
    parkingRules.hourly_start,
    parkingRules.hourly_end,
  ]);

  useEffect(() => {
    if (form.durationType !== "hours") {
      if (form.startTime !== "") {
        setForm((prev) => ({ ...prev, startTime: "" }));
      }
      return;
    }

    const fallbackTime = availableHourlyOptions[0]?.value || "";

    if (!form.startTime) {
      setForm((prev) => ({
        ...prev,
        startTime: fallbackTime,
      }));
      return;
    }

    if (!isSameDayStart) return;

    const selectedMinutes = timeValueToMinutes(form.startTime);
    const earliestMinutes = timeValueToMinutes(earliestSameDayTimeValue);

    if (selectedMinutes < earliestMinutes) {
      setForm((prev) => ({
        ...prev,
        startTime: fallbackTime,
      }));
    }
  }, [
    form.durationType,
    form.startTime,
    isSameDayStart,
    earliestSameDayTimeValue,
    availableHourlyOptions,
  ]);

  useEffect(() => {
    if (!form.startDate) return;

    if (form.startDate < minStartDateValue) {
      setForm((prev) => ({
        ...prev,
        startDate: minStartDateValue,
      }));
    }
  }, [form.startDate, minStartDateValue]);

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

  const durationError = useMemo(() => {
    const durationValue = Number(form.durationValue || "0");

    if (!form.durationValue) return "";

    return validateParkingDuration({
      duration: durationValue,
      durationType: form.durationType,
    });
  }, [form.durationType, form.durationValue]);

  const sameDayHourlyError = useMemo(() => {
    if (form.durationType !== "hours") return "";

    return validateSameDayHourlyParking({
      startDate: startDateObject,
      startTime: form.startTime,
      leadMinutes: parkingRules.same_day_lead_minutes,
    });
  }, [form.durationType, startDateObject, form.startTime]);

  const parkingRequestWindowText = `${formatTime12h(
    parkingRules.hourly_start,
  )} to ${formatTime12h(parkingRules.hourly_end)}`;

  const endTime = useMemo(() => {
    if (form.durationType !== "hours") return "";
    return computeEndTime(form.startTime, Number(form.durationValue || "0"));
  }, [form.durationType, form.startTime, form.durationValue]);

  const updateField = useCallback(
    (field: keyof GuestParkingForm, value: string) => {
      setSubmitError("");
      setSubmitted(false);

      let sanitized = value;

      switch (field) {
        case "firstName":
        case "lastName":
          sanitized = sanitizeNameInput(value);
          break;

        case "email":
          sanitized = sanitizeEmailInput(value);
          break;

        case "phone":
          sanitized = sanitizePhoneInput(value);
          break;

        case "vehicleType":
        case "notes":
          sanitized = sanitizePlainText(value);
          break;

        case "plateNumber":
          sanitized = sanitizePlainText(value).toUpperCase();
          break;

        case "durationValue":
          sanitized = value.replace(/[^\d]/g, "").slice(0, 2);
          break;

        default:
          sanitized = value;
      }

      setForm((prev) => ({
        ...prev,
        [field]: sanitized,
      }));
    },
    [],
  );

  const handleDurationTypeChange = useCallback((value: ParkingDurationType) => {
    setSubmitError("");
    setSubmitted(false);

    const nextBounds = getParkingDurationBounds(value);

    setForm((prev) => ({
      ...prev,
      durationType: value,
      durationValue: String(nextBounds.min),
      startTime: value === "hours" ? prev.startTime : "",
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmitting) return;

      if (selectedDurationRequiresOfficeHours && !parkingRequestsOpenNow) {
        setSubmitError(
          `Parking requests are currently closed. Requests are accepted from ${parkingRequestWindowText}.`,
        );
        return;
      }

      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();
      const email = form.email.trim().toLowerCase();
      const phone = form.phone.trim();
      const vehicleType = form.vehicleType.trim();
      const plateNumber = form.plateNumber.trim().toUpperCase();
      const durationType = form.durationType;
      const durationValue = Number(form.durationValue || "0");
      const startDate = form.startDate;
      const startTime = form.startTime.trim();
      const notes = form.notes.trim();

      const minimumStartDate = getParkingMinStartDateInputValue({
        durationType,
        hourlyEnd: parkingRules.hourly_end,
      });

      if (startDate < minimumStartDate) {
        setSubmitError(
          durationType === "hours"
            ? "Please choose a valid hourly parking start date."
            : `Daily and monthly parking requests must start no earlier than ${minimumStartDate} to allow admin review and slot assignment.`,
        );
        return;
      }

      if (
        !firstName ||
        !lastName ||
        !email ||
        !phone ||
        !vehicleType ||
        !plateNumber ||
        !startDate ||
        !durationValue
      ) {
        setSubmitError("Please complete all required parking request details.");
        return;
      }

      if (durationError) {
        setSubmitError(durationError);
        return;
      }

      if (durationType === "hours" && !startTime) {
        setSubmitError("Please select a preferred start time.");
        return;
      }

      if (sameDayHourlyError) {
        setSubmitError(sameDayHourlyError);
        return;
      }

      setIsSubmitting(true);
      setSubmitError("");
      setSubmitted(false);

      const { data: submitResult, error } = await supabase.functions.invoke(
        "submit-guest-parking-request",
        {
          body: {
            firstName,
            lastName,
            email,
            phone,
            vehicleType,
            plateNumber,
            durationValue,
            durationType,
            startDate,
            startTime: durationType === "hours" ? startTime : null,
            notes: notes || null,
          },
        },
      );

      if (error || !submitResult?.success) {
        console.error(
          "Failed to submit guest parking request:",
          error,
          submitResult,
        );
        setSubmitError(
          submitResult?.reason ||
            error?.message ||
            "We couldn't send your guest parking request right now. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      if (!submitResult.adminNotificationSent) {
        console.warn(
          "Guest parking request was saved, but admin notification may have failed:",
          submitResult.adminNotificationError,
        );
      }
      if (!submitResult.guestEmailSent) {
        console.warn(
          "Guest parking request was saved, but guest receipt email may have failed:",
          submitResult.guestEmailError,
        );
      }

      setSubmitted(true);
      setForm(buildInitialForm());
      setIsSubmitting(false);
    },
    [
      durationError,
      form,
      isSubmitting,
      parkingRequestsOpenNow,
      parkingRequestWindowText,
      sameDayHourlyError,
      parkingRules,
      selectedDurationRequiresOfficeHours,
    ],
  );

  return (
    <section id="guest-parking" className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Guest Parking
          </p>
          <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-4xl">
            Request parking without creating an account
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
            Need parking for a few hours, a day, or a monthly arrangement? Send
            a parking request and our team will review it.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm md:p-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {DURATION_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = form.durationType === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleDurationTypeChange(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      isSubmitting ? "cursor-not-allowed opacity-60" : ""
                    } ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <Icon className="mb-3 size-5" />
                    <p className="text-sm font-bold">{option.label}</p>
                    <p
                      className={`mt-1 text-xs leading-relaxed ${
                        active ? "text-blue-100" : "text-slate-500"
                      }`}
                    >
                      {option.helperLabel}
                    </p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  Guest parking requests are reviewed by admin first. A specific
                  slot will be assigned only after availability has been
                  confirmed. Submission does not guarantee approval, and
                  requests may still be rejected if no suitable slot is
                  available.
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Payment is collected{" "}
                  <strong>only after admin approval</strong>. Please do not send
                  payment until your request has been approved. If the request
                  is rejected, no parking slot will be reserved.
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Hourly parking currently operates from{" "}
                  <strong>
                    {formatTime12h(parkingRules.hourly_start)} to{" "}
                    {formatTime12h(parkingRules.hourly_end)}
                  </strong>
                  . These hours may be adjusted later by admin settings.
                </div>

                {!parkingRequestsOpenNow &&
                  selectedDurationRequiresOfficeHours && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      <strong>Parking requests are closed right now.</strong>
                      <span className="mt-1 block">
                        Requests are accepted from {parkingRequestWindowText}.
                      </span>
                    </div>
                  )}

                <p className="text-xs text-blue-600">
                  {getParkingDurationPolicyText(form.durationType)}
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
                    value={form.startDate}
                    disabled={formLocked}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Earliest allowed start date:{" "}
                    {form.durationType === "hours"
                      ? "today, subject to available hourly time slots"
                      : minStartDateValue}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-700">
                    Duration
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={form.durationValue}
                    disabled={formLocked}
                    onChange={(e) =>
                      updateField("durationValue", e.target.value)
                    }
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-4 ${
                      durationError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                    }`}
                    placeholder={`Enter number of ${form.durationType}`}
                    required
                  />
                  {durationError ? (
                    <p className="mt-1 text-xs text-red-600">{durationError}</p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      Allowed: {durationBounds.min} to {durationBounds.max}{" "}
                      {form.durationType}
                    </p>
                  )}
                </div>
              </div>

              {form.durationType === "hours" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm text-gray-700">
                      Start Time
                    </label>

                    <select
                      value={form.startTime}
                      disabled={
                        formLocked || availableHourlyOptions.length === 0
                      }
                      onChange={(e) => updateField("startTime", e.target.value)}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none transition ${
                        availableHourlyOptions.length === 0
                          ? "cursor-not-allowed border-red-200 bg-red-50 text-red-600"
                          : "border-gray-300 text-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      }`}
                    >
                      {availableHourlyOptions.length === 0 ? (
                        <option value="">No available time slots</option>
                      ) : (
                        availableHourlyOptions.map((time) => (
                          <option key={time.value} value={time.value}>
                            {time.label}
                          </option>
                        ))
                      )}
                    </select>

                    <p className="mt-2 text-xs text-gray-500">
                      Select a whole-hour start time for hourly parking.
                    </p>

                    {isSameDayStart && availableHourlyOptions.length === 0 && (
                      <p className="mt-1 text-xs text-red-600">
                        No same-day hourly time slots are available anymore.
                        Please choose another date.
                      </p>
                    )}

                    {sameDayHourlyError && (
                      <p className="mt-1 text-xs text-red-600">
                        {sameDayHourlyError}
                      </p>
                    )}
                  </div>

                  {form.startTime && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      Selected start time:{" "}
                      <strong>{formatTime12h(form.startTime)}</strong>
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
                  value={
                    form.durationType === "hours"
                      ? `${Number(form.durationValue || "0")} hour(s)`
                      : form.durationType === "days"
                        ? `${Number(form.durationValue || "0")} day(s)`
                        : `${Number(form.durationValue || "0")} month(s)`
                  }
                  className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
                />
              </div>

              {form.startDate && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Start date: <strong>{form.startDate}</strong>
                  {form.durationType === "hours" && form.startTime && (
                    <>
                      <span className="ml-1">
                        · Start time:{" "}
                        <strong>{formatTime12h(form.startTime)}</strong>
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
                If approved, charges will be based on the{" "}
                <strong>approved parking period</strong>. Leaving early does not
                reduce the final approved parking charge.
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-gray-700">
                    First Name
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Enter first name"
                    value={form.firstName}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-700">
                    Last Name
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Enter last name"
                    value={form.lastName}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    maxLength={150}
                    placeholder="Enter email address"
                    value={form.email}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="Enter phone number"
                    value={form.phone}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-gray-700">
                    Vehicle Type
                  </label>

                  <select
                    value={form.vehicleType}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("vehicleType", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    required
                  >
                    <option value="">Select vehicle type</option>
                    {PARKING_VEHICLE_TYPE_OPTIONS.map((vehicleType) => (
                      <option key={vehicleType} value={vehicleType}>
                        {vehicleType}
                      </option>
                    ))}
                  </select>

                  <p className="mt-1 text-xs text-slate-500">
                    Larger vehicles may require admin review and may be rejected
                    if the available slot cannot safely accommodate the vehicle.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-gray-700">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="ABC 1234"
                    value={form.plateNumber}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("plateNumber", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-700">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Any special requests or parking details"
                  maxLength={1000}
                  rows={4}
                  value={form.notes}
                  disabled={isSubmitting}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={formLocked}
                className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Sending Parking Request..."
                  : parkingRequestsOpenNow
                    ? "Send Parking Request"
                    : form.durationType === "hours"
                      ? "Hourly Requests Closed"
                      : form.durationType === "days"
                        ? "Daily Requests Closed"
                        : "Send Parking Request"}
              </button>

              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left"
                >
                  <p className="text-sm font-semibold text-red-800">
                    Parking request not sent
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-red-700">
                    {submitError}
                  </p>
                </motion.div>
              )}

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-left"
                >
                  <p className="text-sm font-semibold text-green-800">
                    Parking request sent
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-green-700">
                    We’ll review your request and contact you using the email
                    address you provided. Please note that this is not yet an
                    approved reservation, and your request may still be rejected
                    depending on slot availability.
                  </p>
                </motion.div>
              )}
            </form>
          </div>

          <div className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl md:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-600 p-3">
                <CarFront className="size-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                  Parking Access
                </p>
                <h3 className="text-xl font-bold">
                  Flexible guest parking options
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">
              <p>
                Guests can request parking by hour, by day, or by month without
                creating an account first.
              </p>
              <p>
                Admin will review availability, approve or reject the request,
                assign a parking slot only if approved, and only then instruct
                the guest about payment.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 text-blue-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Important</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    This creates a guest parking request only. Slot assignment
                    and payment happen after admin approval. Requests may still
                    be rejected if availability cannot be confirmed.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                Supported request types
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                <li>• Hourly parking</li>
                <li>• Daily parking</li>
                <li>• Monthly parking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
