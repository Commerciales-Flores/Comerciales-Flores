import supabase from "../supabaseClient";

export type SlotAssignmentMode = "admin_assigns_later";

export type ParkingRules = {
  hourly_start: string;
  hourly_end: string;
  same_day_lead_hours: number;
  guest_payment_after_approval: boolean;
  slot_assignment_mode: SlotAssignmentMode;
};

export const DEFAULT_PARKING_RULES: ParkingRules = {
  hourly_start: "09:00",
  hourly_end: "17:00",
  same_day_lead_hours: 2,
  guest_payment_after_approval: true,
  slot_assignment_mode: "admin_assigns_later",
};

type AppSettingRow = {
  key: string;
  value_json: unknown;
  updated_at?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTimeHHMM(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

function sanitizeParkingRules(value: unknown): ParkingRules {
  if (!isPlainObject(value)) {
    return DEFAULT_PARKING_RULES;
  }

  const hourlyStart = isValidTimeHHMM(value.hourly_start)
    ? value.hourly_start
    : DEFAULT_PARKING_RULES.hourly_start;

  const hourlyEnd = isValidTimeHHMM(value.hourly_end)
    ? value.hourly_end
    : DEFAULT_PARKING_RULES.hourly_end;

  const sameDayLeadHours =
    typeof value.same_day_lead_hours === "number" &&
    Number.isInteger(value.same_day_lead_hours) &&
    value.same_day_lead_hours >= 0
      ? value.same_day_lead_hours
      : DEFAULT_PARKING_RULES.same_day_lead_hours;

  const guestPaymentAfterApproval =
    typeof value.guest_payment_after_approval === "boolean"
      ? value.guest_payment_after_approval
      : DEFAULT_PARKING_RULES.guest_payment_after_approval;

  const slotAssignmentMode: SlotAssignmentMode =
    value.slot_assignment_mode === "admin_assigns_later"
      ? "admin_assigns_later"
      : DEFAULT_PARKING_RULES.slot_assignment_mode;

  return {
    hourly_start: hourlyStart,
    hourly_end: hourlyEnd,
    same_day_lead_hours: sameDayLeadHours,
    guest_payment_after_approval: guestPaymentAfterApproval,
    slot_assignment_mode: slotAssignmentMode,
  };
}

export async function fetchParkingRules(): Promise<ParkingRules> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value_json, updated_at")
    .eq("key", "parking_rules")
    .maybeSingle<AppSettingRow>();

  if (error || !data?.value_json) {
    return DEFAULT_PARKING_RULES;
  }

  return sanitizeParkingRules(data.value_json);
}

export async function saveParkingRules(
  rules: ParkingRules
): Promise<ParkingRules> {
  const payload: ParkingRules = sanitizeParkingRules(rules);

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "parking_rules",
      value_json: payload,
    },
    {
      onConflict: "key",
    }
  );

  if (error) {
    throw error;
  }

  return payload;
}