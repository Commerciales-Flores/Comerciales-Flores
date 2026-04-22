export type PaymentCycle = "daily" | "weekly" | "monthly";

export type VatBreakdown = {
  subtotal: number;
  vat: number;
  total: number;
};

export type RentalBillingResult = {
  monthlyBase: number;

  leaseSubtotal: number;
  leaseVat: number;
  leaseTotal: number;

  dailyCycleTotal: number;
  weeklyCycleTotal: number;
  monthlyCycleTotal: number;

  selectedCycleTotal: number;

  depositMonths: number;
  advanceMonths: number;

  depositBase: number;
  firstMonthSubtotal: number;
  firstMonthVat: number;
  firstMonthTotal: number;

  initialDue: number;
};

const VAT_RATE = 0.12;

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function sanitizeAmount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function sanitizeDuration(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.floor(parsed);
}

function sanitizeMonths(
  value: number | string | null | undefined,
  fallback: number,
  min = 0
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
}

export function computeVatBreakdown(baseAmount: number): VatBreakdown {
  const subtotal = roundCurrency(sanitizeAmount(baseAmount));
  const vat = roundCurrency(subtotal * VAT_RATE);
  const total = roundCurrency(subtotal + vat);

  return {
    subtotal,
    vat,
    total,
  };
}

export function computeRentalBilling(params: {
  monthlyBase: number;
  durationMonths: number;
  paymentCycle: PaymentCycle;
  securityDepositMonths?: number;
  advanceDepositMonths?: number;
}): RentalBillingResult {
  const monthlyBase = roundCurrency(sanitizeAmount(params.monthlyBase));
  const durationMonths = sanitizeDuration(params.durationMonths);
  const paymentCycle = params.paymentCycle;

  const depositMonths = sanitizeMonths(
    params.securityDepositMonths,
    1,
    0
  );

  const advanceMonths = sanitizeMonths(
    params.advanceDepositMonths,
    1,
    1
  );

  const leaseBase = roundCurrency(monthlyBase * durationMonths);
  const leaseBreakdown = computeVatBreakdown(leaseBase);

  const firstMonthBase = roundCurrency(monthlyBase * advanceMonths);
  const firstMonthBreakdown = computeVatBreakdown(firstMonthBase);

  const depositBase = roundCurrency(monthlyBase * depositMonths);

  // Daily / weekly = full upfront
  const dailyCycleTotal = leaseBreakdown.total;
  const weeklyCycleTotal = leaseBreakdown.total;

  // Monthly = recurring monthly charge after approval
  const oneMonthBreakdown = computeVatBreakdown(monthlyBase);
  const monthlyCycleTotal = oneMonthBreakdown.total;

  const selectedCycleTotal =
    paymentCycle === "daily"
      ? dailyCycleTotal
      : paymentCycle === "weekly"
        ? weeklyCycleTotal
        : monthlyCycleTotal;

  // Monthly rentals:
  // deposit is non-VAT
  // advance month(s) are VAT-inclusive
  const initialDue =
    paymentCycle === "monthly"
      ? roundCurrency(depositBase + firstMonthBreakdown.total)
      : leaseBreakdown.total;

  return {
    monthlyBase,

    leaseSubtotal: leaseBreakdown.subtotal,
    leaseVat: leaseBreakdown.vat,
    leaseTotal: leaseBreakdown.total,

    dailyCycleTotal,
    weeklyCycleTotal,
    monthlyCycleTotal,

    selectedCycleTotal,

    depositMonths,
    advanceMonths,

    depositBase,
    firstMonthSubtotal: firstMonthBreakdown.subtotal,
    firstMonthVat: firstMonthBreakdown.vat,
    firstMonthTotal: firstMonthBreakdown.total,

    initialDue,
  };
}

export function computeOneTimeBilling(params: {
  baseAmount: number;
}): VatBreakdown {
  return computeVatBreakdown(params.baseAmount);
}

export const BILLING_CONSTANTS = {
  VAT_RATE,
} as const;