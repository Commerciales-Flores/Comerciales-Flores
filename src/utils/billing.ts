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
export type RentalBillingCycle = "daily" | "weekly" | "monthly";
export type RentalBillingResult = {
  paymentCycle: RentalBillingCycle;
  monthlyBase: number;
  weeklyRate: number;
  dailyRate: number;
  durationMonths: number;
  stayDays: number;
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
  flexibleBreakdown?: FlexibleStayBillingResult;
};

export function computeRentalBilling(params: {
  monthlyBase: number;
  durationMonths?: number;
  stayDays?: number;
  paymentCycle: RentalBillingCycle;
  securityDepositMonths?: number;
  advanceRentMonths?: number;
  dailyRate?: number;
  weeklyRate?: number;
}): RentalBillingResult {
  const paymentCycle = params.paymentCycle;

  const monthlyBase = roundCurrency(sanitizeAmount(params.monthlyBase));

  const dailyRate = roundCurrency(
    sanitizeAmount(params.dailyRate ?? monthlyBase / 30)
  );

  const weeklyRate = roundCurrency(
    sanitizeAmount(params.weeklyRate ?? dailyRate * 7)
  );

  const durationMonths = sanitizePositiveInteger(params.durationMonths, 1);
  const stayDays = sanitizePositiveInteger(
    params.stayDays ?? durationMonths * 30,
    1
  );

  if (paymentCycle === "daily" || paymentCycle === "weekly") {
    const flexible = computeFlexibleStayBilling({
      stayDays,
      dailyRate,
      weeklyRate,
      monthlyRate: monthlyBase,
    });

    return {
      paymentCycle,

      monthlyBase,
      weeklyRate,
      dailyRate,

      durationMonths,
      stayDays,

      leaseSubtotal: flexible.subtotal,
      leaseVat: flexible.vatAmount,
      leaseTotal: flexible.totalAmount,

      dailyCycleTotal: flexible.totalAmount,
      weeklyCycleTotal: flexible.totalAmount,
      monthlyCycleTotal: roundCurrency(monthlyBase + monthlyBase * VAT_RATE),
      selectedCycleTotal: flexible.totalAmount,

      depositMonths: 0,
      advanceMonths: 0,

      depositBase: 0,
      firstMonthSubtotal: flexible.subtotal,
      firstMonthVat: flexible.vatAmount,
      firstMonthTotal: flexible.totalAmount,

      initialDue: flexible.totalAmount,

      flexibleBreakdown: flexible,
    };
  }

  const lease = computeMonthlyLeaseBilling({
    leaseMonths: durationMonths,
    monthlyRate: monthlyBase,
    securityDepositMonths: params.securityDepositMonths,
    advanceRentMonths: params.advanceRentMonths,
  });

  const fullLeaseVat = roundCurrency(lease.rentSubtotal * VAT_RATE);
  const fullLeaseTotal = roundCurrency(lease.rentSubtotal + fullLeaseVat);

  const monthlyCycleTotal = roundCurrency(monthlyBase + monthlyBase * VAT_RATE);

  return {
    paymentCycle,

    monthlyBase,
    weeklyRate,
    dailyRate,

    durationMonths,
    stayDays: durationMonths * 30,

    leaseSubtotal: lease.rentSubtotal,
    leaseVat: fullLeaseVat,
    leaseTotal: fullLeaseTotal,

    dailyCycleTotal: fullLeaseTotal,
    weeklyCycleTotal: fullLeaseTotal,
    monthlyCycleTotal,
    selectedCycleTotal: monthlyCycleTotal,

    depositMonths: lease.securityDepositMonths,
    advanceMonths: lease.advanceRentMonths,

    depositBase: lease.securityDepositAmount,
    firstMonthSubtotal: lease.advanceRentAmount,
    firstMonthVat: lease.vatAmount,
    firstMonthTotal: roundCurrency(lease.advanceRentAmount + lease.vatAmount),

    initialDue: lease.initialDue,
  };
}

export const BILLING_CONSTANTS = {
  VAT_RATE,
} as const;