import { useCallback, useMemo, useState } from "react";
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

type GuestParkingDuration = "hourly" | "daily" | "monthly";

type GuestParkingForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vehicleType: string;
  plateNumber: string;
  durationType: GuestParkingDuration;
  durationValue: string;
  startDate: string;
  startTime: string;
  notes: string;
};

const DURATION_OPTIONS: Array<{
  value: GuestParkingDuration;
  label: string;
  helper: string;
  icon: typeof Clock3;
}> = [
  {
    value: "hourly",
    label: "Hourly",
    helper: "Short stays during business hours",
    icon: Clock3,
  },
  {
    value: "daily",
    label: "Daily",
    helper: "Whole-day parking requests",
    icon: CalendarDays,
  },
  {
    value: "monthly",
    label: "Monthly",
    helper: "Longer-term parking arrangement",
    icon: CalendarRange,
  },
];

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

function getTodayInputValue() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildInitialForm(): GuestParkingForm {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    vehicleType: "",
    plateNumber: "",
    durationType: "hourly",
    durationValue: "1",
    startDate: getTodayInputValue(),
    startTime: "09:00",
    notes: "",
  };
}

function formatTime12h(time?: string) {
  if (!time) return "";

  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = ((h + 11) % 12) + 1;

  return `${displayHour}:${m.toString().padStart(2, "0")} ${suffix}`;
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

function mapDurationTypeToDb(value: GuestParkingDuration) {
  switch (value) {
    case "hourly":
      return "hours";
    case "daily":
      return "days";
    case "monthly":
      return "months";
    default:
      return "hours";
  }
}

export default function GuestParking() {
  const [form, setForm] = useState<GuestParkingForm>(buildInitialForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const durationBounds = useMemo(() => {
    switch (form.durationType) {
      case "hourly":
        return { min: 1, max: 8, label: "Hours" };
      case "daily":
        return { min: 1, max: 30, label: "Days" };
      case "monthly":
        return { min: 1, max: 12, label: "Months" };
      default:
        return { min: 1, max: 8, label: "Duration" };
    }
  }, [form.durationType]);

  const endTime = useMemo(() => {
    if (form.durationType !== "hourly") return "";
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
    []
  );

  const handleDurationTypeChange = useCallback((value: GuestParkingDuration) => {
    setSubmitError("");
    setSubmitted(false);

    setForm((prev) => ({
      ...prev,
      durationType: value,
      durationValue: "1",
      startTime: value === "monthly" ? "" : "09:00",
    }));
  }, []);

  const businessHoursError = useMemo(() => {
    if (form.durationType !== "hourly" || !form.startTime) return "";

    const startHour = Number(form.startTime.split(":")[0]);
    const duration = Number(form.durationValue || "0");

    if (!duration) return "";

    if (startHour + duration > 17) {
      return "Hourly parking cannot go beyond business hours (5:00 PM).";
    }

    return "";
  }, [form.durationType, form.startTime, form.durationValue]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isSubmitting) return;

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

      if (
        durationValue < durationBounds.min ||
        durationValue > durationBounds.max
      ) {
        setSubmitError(
          `Please enter a valid ${durationBounds.label.toLowerCase()} value between ${durationBounds.min} and ${durationBounds.max}.`
        );
        return;
      }

      if ((durationType === "hourly" || durationType === "daily") && !startTime) {
        setSubmitError("Please select a preferred start time.");
        return;
      }

      if (businessHoursError) {
        setSubmitError(businessHoursError);
        return;
      }

      setIsSubmitting(true);
      setSubmitError("");
      setSubmitted(false);

      const fullName = `${firstName} ${lastName}`.trim();
      const dbDurationType = mapDurationTypeToDb(durationType);

      const payload = {
        full_name: fullName,
        email,
        phone,
        vehicle_type: vehicleType,
        plate_number: plateNumber,
        duration: durationValue,
        duration_type: dbDurationType,
        start_date:
          durationType === "monthly"
            ? `${startDate}T00:00:00`
            : `${startDate}T00:00:00`,
        appointment_time:
          durationType === "monthly" ? null : `${startTime}:00`,
        notes: notes || null,
        status: "pending",
        unit_type: "parking_slot",
        /*
          IMPORTANT:
          Your current SQL requires unit_id NOT NULL.
          This component has no slot picker yet, so this insert will only work if:
          1) you made unit_id nullable temporarily, OR
          2) you add unit selection and pass a real unit_id here.
        */
      };

      const { error } = await supabase
        .from("guest_parking_requests")
        .insert([payload]);

      if (error) {
        console.error("Failed to submit guest parking request:", error);
        setSubmitError(
          error.message ||
            "We couldn't send your guest parking request right now. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
      setForm(buildInitialForm());
      setIsSubmitting(false);
    },
    [businessHoursError, durationBounds, form, isSubmitting]
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
            Need parking for a few hours, a day, or a monthly arrangement? Send a
            parking request and our team will review it.
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
                    onClick={() => handleDurationTypeChange(option.value)}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
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
                      {option.helper}
                    </p>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  maxLength={100}
                  placeholder="First Name"
                  value={form.firstName}
                  disabled={isSubmitting}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="text"
                  maxLength={100}
                  placeholder="Last Name"
                  value={form.lastName}
                  disabled={isSubmitting}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="email"
                  maxLength={150}
                  placeholder="Email"
                  value={form.email}
                  disabled={isSubmitting}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="text"
                  maxLength={20}
                  placeholder="Phone Number"
                  value={form.phone}
                  disabled={isSubmitting}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Vehicle Type"
                  value={form.vehicleType}
                  disabled={isSubmitting}
                  onChange={(e) => updateField("vehicleType", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />

                <input
                  type="text"
                  maxLength={20}
                  placeholder="Plate Number"
                  value={form.plateNumber}
                  disabled={isSubmitting}
                  onChange={(e) => updateField("plateNumber", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    {durationBounds.label}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={form.durationValue}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("durationValue", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Start Date
                  </label>
                  <input
                    type="date"
                    min={getTodayInputValue()}
                    value={form.startDate}
                    disabled={isSubmitting}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    Start Time
                  </label>
                  <select
                    value={form.startTime}
                    disabled={isSubmitting || form.durationType === "monthly"}
                    onChange={(e) => updateField("startTime", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {form.durationType === "monthly" ? (
                      <option value="">Not required</option>
                    ) : (
                      BUSINESS_HOUR_OPTIONS.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {form.durationType === "hourly" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-sm font-semibold text-blue-800">
                    Hourly parking summary
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    Start time: <strong>{formatTime12h(form.startTime)}</strong>
                    {endTime && (
                      <>
                        {" "}
                        · End time: <strong>{endTime}</strong>
                      </>
                    )}
                  </p>
                  {businessHoursError && (
                    <p className="mt-2 text-sm font-medium text-red-600">
                      {businessHoursError}
                    </p>
                  )}
                </div>
              )}

              <textarea
                placeholder="Additional notes"
                maxLength={1000}
                rows={5}
                value={form.notes}
                disabled={isSubmitting}
                onChange={(e) => updateField("notes", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending Parking Request..." : "Send Parking Request"}
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
                    address you provided.
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
                <h3 className="text-xl font-bold">Flexible guest parking options</h3>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-300">
              <p>
                Guests can request parking by hour, by day, or by month without
                creating an account first.
              </p>
              <p>
                Final availability, slot assignment, and approval will still be
                confirmed by your team.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 text-blue-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Important</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    This creates a guest parking request, not a direct reservation.
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