export type VatBreakdown = {
  subtotal: number;
  vat: number;
  total: number;
};

export type FlexibleStayBillingResult = {
  stayDays: number;
  months: number;
  weeks: number;
  days: number;

  monthlyRate: number;
  weeklyRate: number;
  dailyRate: number;

  monthlySubtotal: number;
  weeklySubtotal: number;
  dailySubtotal: number;

  subtotal: number;
  discountAmount: number;
  taxableSubtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountDue: number;
};

export type MonthlyLeaseBillingResult = {
  leaseMonths: number;
  monthlyRate: number;

  rentSubtotal: number;
  discountAmount: number;
  taxableRentSubtotal: number;
  vatRate: number;
  vatAmount: number;

  securityDepositMonths: number;
  advanceRentMonths: number;
  securityDepositAmount: number;
  advanceRentAmount: number;

  initialDue: number;
  totalContractValue: number;
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

function sanitizePositiveInteger(
  value: number | string | null | undefined,
  fallback = 1
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function sanitizeNonNegativeInteger(
  value: number | string | null | undefined,
  fallback = 0
): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export function computeVatBreakdown(baseAmount: number): VatBreakdown {
  const subtotal = roundCurrency(sanitizeAmount(baseAmount));
  const vat = roundCurrency(subtotal * VAT_RATE);
  const total = roundCurrency(subtotal + vat);

  return { subtotal, vat, total };
}

export function computeFlexibleStayBilling(params: {
  stayDays: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  discountAmount?: number;
}): FlexibleStayBillingResult {
  const stayDays = sanitizePositiveInteger(params.stayDays, 1);

  const dailyRate = roundCurrency(sanitizeAmount(params.dailyRate));
  const weeklyRate = roundCurrency(sanitizeAmount(params.weeklyRate));
  const monthlyRate = roundCurrency(sanitizeAmount(params.monthlyRate));

  const months = Math.floor(stayDays / 30);
  const remainingAfterMonths = stayDays % 30;
  const weeks = Math.floor(remainingAfterMonths / 7);
  const days = remainingAfterMonths % 7;

  const monthlySubtotal = roundCurrency(months * monthlyRate);
  const weeklySubtotal = roundCurrency(weeks * weeklyRate);
  const dailySubtotal = roundCurrency(days * dailyRate);

  const subtotal = roundCurrency(
    monthlySubtotal + weeklySubtotal + dailySubtotal
  );

  const rawDiscount = sanitizeAmount(params.discountAmount);
  const discountAmount = roundCurrency(Math.min(rawDiscount, subtotal));

  const taxableSubtotal = roundCurrency(subtotal - discountAmount);
  const vatAmount = roundCurrency(taxableSubtotal * VAT_RATE);
  const totalAmount = roundCurrency(taxableSubtotal + vatAmount);

  return {
    stayDays,
    months,
    weeks,
    days,

    monthlyRate,
    weeklyRate,
    dailyRate,

    monthlySubtotal,
    weeklySubtotal,
    dailySubtotal,

    subtotal,
    discountAmount,
    taxableSubtotal,
    vatRate: VAT_RATE,
    vatAmount,
    totalAmount,
    amountDue: totalAmount,
  };
}

export function computeMonthlyLeaseBilling(params: {
  leaseMonths: number;
  monthlyRate: number;
  securityDepositMonths?: number;
  advanceRentMonths?: number;
  discountAmount?: number;
}): MonthlyLeaseBillingResult {
  const leaseMonths = sanitizePositiveInteger(params.leaseMonths, 1);
  const monthlyRate = roundCurrency(sanitizeAmount(params.monthlyRate));

  const securityDepositMonths = sanitizeNonNegativeInteger(
    params.securityDepositMonths,
    1
  );

  const advanceRentMonths = sanitizePositiveInteger(
    params.advanceRentMonths,
    1
  );

  const securityDepositAmount = roundCurrency(
    monthlyRate * securityDepositMonths
  );

  const advanceRentAmount = roundCurrency(
    monthlyRate * advanceRentMonths
  );

  const rawDiscount = sanitizeAmount(params.discountAmount);
  const discountAmount = roundCurrency(Math.min(rawDiscount, advanceRentAmount));

  const taxableRentSubtotal = roundCurrency(advanceRentAmount - discountAmount);
  const vatAmount = roundCurrency(taxableRentSubtotal * VAT_RATE);

  const initialDue = roundCurrency(
    securityDepositAmount + taxableRentSubtotal + vatAmount
  );

  const rentSubtotal = roundCurrency(monthlyRate * leaseMonths);
  const totalContractValue = roundCurrency(
    rentSubtotal + securityDepositAmount + vatAmount
  );

  return {
    leaseMonths,
    monthlyRate,

    rentSubtotal,
    discountAmount,
    taxableRentSubtotal,
    vatRate: VAT_RATE,
    vatAmount,

    securityDepositMonths,
    advanceRentMonths,
    securityDepositAmount,
    advanceRentAmount,

    initialDue,
    totalContractValue,
  };
}

export function computeOneTimeBilling(params: {
  baseAmount: number;
  discountAmount?: number;
}) {
  const subtotal = roundCurrency(sanitizeAmount(params.baseAmount));
  const discountAmount = roundCurrency(
    Math.min(sanitizeAmount(params.discountAmount), subtotal)
  );
  const taxableSubtotal = roundCurrency(subtotal - discountAmount);
  const vatAmount = roundCurrency(taxableSubtotal * VAT_RATE);
  const totalAmount = roundCurrency(taxableSubtotal + vatAmount);

  return {
    subtotal,
    discountAmount,
    taxableSubtotal,
    vatRate: VAT_RATE,
    vatAmount,
    totalAmount,
    amountDue: totalAmount,
  };
}
export function computeRentalBilling(params: {
  monthlyBase: number;
  durationMonths: number;
  paymentCycle: "daily" | "weekly" | "monthly";
  securityDepositMonths?: number;
  advanceRentMonths?: number;
}) {
  const result = computeMonthlyLeaseBilling({
    leaseMonths: params.durationMonths,
    monthlyRate: params.monthlyBase,
    securityDepositMonths: params.securityDepositMonths,
    advanceRentMonths: params.advanceRentMonths,
  });

  return {
    monthlyBase: result.monthlyRate,

    leaseSubtotal: result.rentSubtotal,
    leaseVat: roundCurrency(result.rentSubtotal * VAT_RATE),
    leaseTotal: roundCurrency(result.rentSubtotal + result.rentSubtotal * VAT_RATE),

    dailyCycleTotal: roundCurrency(result.rentSubtotal + result.rentSubtotal * VAT_RATE),
    weeklyCycleTotal: roundCurrency(result.rentSubtotal + result.rentSubtotal * VAT_RATE),
    monthlyCycleTotal: roundCurrency(result.monthlyRate + result.monthlyRate * VAT_RATE),

    selectedCycleTotal:
      params.paymentCycle === "monthly"
        ? roundCurrency(result.monthlyRate + result.monthlyRate * VAT_RATE)
        : roundCurrency(result.rentSubtotal + result.rentSubtotal * VAT_RATE),

    depositMonths: result.securityDepositMonths,
    advanceMonths: result.advanceRentMonths,

    depositBase: result.securityDepositAmount,
    firstMonthSubtotal: result.advanceRentAmount,
    firstMonthVat: result.vatAmount,
    firstMonthTotal: roundCurrency(result.advanceRentAmount + result.vatAmount),

    initialDue:
      params.paymentCycle === "monthly"
        ? result.initialDue
        : roundCurrency(result.rentSubtotal + result.rentSubtotal * VAT_RATE),
  };
}

export const BILLING_CONSTANTS = {
  VAT_RATE,
} as const;