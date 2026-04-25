import { useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  FileSpreadsheet,
  PieChartIcon,
  Printer,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Tag,
BadgePercent,
} from "lucide-react";
import {
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { useReactToPrint } from "react-to-print";
import { usePromotions } from "../../contexts/PromotionsContext";

import { useAdminData } from "../../contexts/AdminDataContext";
import type { UnitType } from "../../data/types";
import { formatCurrency } from "../../utils/currency";
import { getUnitTypeLabel } from "../../utils/propertyHelpers";
import EmptyState from "../../components/common/EmptyState";

type Granularity = "daily" | "weekly" | "monthly" | "yearly";
type BreakdownMode = "category" | "type";

type TrendPoint = {
  label: string;
  reservations: number;
  revenue: number;
  payments: number;
};

type DistributionPoint = {
  name: string;
  value: number;
  color: string;
};

const GRANULARITY_OPTIONS: Array<{
  value: Granularity;
  label: string;
}> = [
  { value: "daily", label: "Daily (Last 30 Days)" },
  { value: "weekly", label: "Weekly (Last 12 Weeks)" },
  { value: "monthly", label: "Monthly (Last 12 Months)" },
  { value: "yearly", label: "Yearly (Last 5 Years)" },
];

const BREAKDOWN_OPTIONS: Array<{
  value: BreakdownMode;
  label: string;
}> = [
  { value: "category", label: "By Category" },
  { value: "type", label: "By Unit Type" },
];

const UNIT_TYPE_COLORS: Record<UnitType, string> = {
  rental_space: "#4f46e5",
  function_hall: "#8b5cf6",
  parking_slot: "#f97316",
};

const CATEGORY_COLOR_FALLBACKS = [
  "#2563eb",
  "#16a34a",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#65a30d",
];

function getSafeDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthShort(date: Date) {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

function formatWeekLabel(start: Date, end: Date) {
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
}

function capitalizeWords(value?: string | null) {
  if (!value) return "Uncategorized";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sanitizeCsvValue(value: unknown) {
  return String(value ?? "").replace(/"/g, '""');
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getStartOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getStartOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addWeeks(date: Date, amount: number) {
  return addDays(date, amount * 7);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addYears(date: Date, amount: number) {
  return new Date(date.getFullYear() + amount, 0, 1);
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${sanitizeCsvValue(row[header])}"`).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toNumericTooltipValue(value: ValueType | undefined) {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "number") return first;
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function revenueTooltipFormatter(
  value: ValueType | undefined,
  name: NameType | undefined
): [string, string] {
  return [formatCurrency(toNumericTooltipValue(value)), String(name ?? "Revenue")];
}

function countTooltipFormatter(
  value: ValueType | undefined,
  name: NameType | undefined
): [string, string] {
  return [String(toNumericTooltipValue(value)), String(name ?? "Value")];
}

export default function AdminAnalytics() {
  const { reservations, payments, units } = useAdminData();
  const { promotions } = usePromotions();
  const [granularity, setGranularity] = useState<Granularity>("monthly");
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>("category");

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Commerciales-Flores-Analytics-${
      new Date().toISOString().split("T")[0]
    }`,
  });

  const paidPayments = useMemo(
    () => payments.filter((payment) => payment.status === "paid"),
    [payments]
  );

  const promoReservations = useMemo(() => {
  return reservations.filter((reservation) => {
    const promoCode =
      (reservation as any).promoCode ??
      (reservation as any).promo_code ??
      null;

    const discountAmount =
      Number(
        (reservation as any).discountAmount ??
          (reservation as any).discount_amount ??
          0
      );

    return Boolean(promoCode) || discountAmount > 0;
  });
}, [reservations]);

const totalPromoDiscount = useMemo(() => {
  return promoReservations.reduce((sum, reservation) => {
    return (
      sum +
      Number(
        (reservation as any).discountAmount ??
          (reservation as any).discount_amount ??
          0
      )
    );
  }, 0);
}, [promoReservations]);

const promoRevenueInfluenced = useMemo(() => {
  const promoReservationIds = new Set(promoReservations.map((r) => r.id));

  return paidPayments
    .filter((payment) => promoReservationIds.has(payment.reservationId))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}, [paidPayments, promoReservations]);

const activePromosCount = useMemo(() => {
  return promotions.filter((promo) => promo.isActive).length;
}, [promotions]);

const topPromoCode = useMemo(() => {
  const map = new Map<string, number>();

  promoReservations.forEach((reservation) => {
    const code =
      String(
        (reservation as any).promoCode ??
          (reservation as any).promo_code ??
          ""
      )
        .trim()
        .toUpperCase() || "PROMO";

    map.set(code, (map.get(code) ?? 0) + 1);
  });

  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0] ?? null;
}, [promoReservations]);

  const reservationById = useMemo(() => {
    const map = new Map<string, (typeof reservations)[number]>();

    reservations.forEach((reservation) => {
      map.set(reservation.id, reservation);
    });

    return map;
  }, [reservations]);

  const unitById = useMemo(() => {
    const map = new Map<string, (typeof units)[number]>();

    units.forEach((unit) => {
      map.set(unit.id, unit);
    });

    return map;
  }, [units]);

  const paidRevenueByUnitId = useMemo(() => {
    const revenueMap = new Map<string, number>();

    paidPayments.forEach((payment) => {
      const reservation = reservationById.get(payment.reservationId);
      if (!reservation) return;

      const current = revenueMap.get(reservation.unitId) ?? 0;
      revenueMap.set(reservation.unitId, current + Number(payment.amount || 0));
    });

    return revenueMap;
  }, [paidPayments, reservationById]);

  const approvedOrBetterReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        ["approved", "confirmed", "completed"].includes(reservation.status)
      ),
    [reservations]
  );

  const confirmedReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        ["confirmed", "completed"].includes(reservation.status)
      ),
    [reservations]
  );

  const totalRevenue = useMemo(
    () =>
      paidPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      ),
    [paidPayments]
  );

  const totalReservations = reservations.length;

  const expectedTotal = useMemo(
    () =>
      approvedOrBetterReservations.reduce(
        (sum, reservation) => sum + Number(reservation.totalAmount || 0),
        0
      ),
    [approvedOrBetterReservations]
  );

  const outstandingTotal = useMemo(() => {
  return approvedOrBetterReservations.reduce((sum, reservation) => {
    const paid = paidPayments
      .filter((p) => p.reservationId === reservation.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const remaining =
      Number(reservation.totalAmount || 0) - paid;

    return sum + Math.max(remaining, 0);
  }, 0);
}, [approvedOrBetterReservations, paidPayments]);

  const collectionRate = useMemo(() => {
    if (expectedTotal <= 0) return 0;
    return clampPercentage((totalRevenue / expectedTotal) * 100);
  }, [expectedTotal, totalRevenue]);

  const averageReservationValue = useMemo(() => {
    if (approvedOrBetterReservations.length === 0) return 0;
    return totalRevenue / approvedOrBetterReservations.length;
  }, [approvedOrBetterReservations.length, totalRevenue]);

  const averageDuration = useMemo(() => {
    if (confirmedReservations.length === 0) return 0;

    const totalDuration = confirmedReservations.reduce(
      (sum, reservation) => sum + Number(reservation.duration || 0),
      0
    );

    return totalDuration / confirmedReservations.length;
  }, [confirmedReservations]);

  const activeUnitsCount = useMemo(
    () => units.filter((unit) => unit.available).length,
    [units]
  );

  const globalOccupancyRate = useMemo(() => {
    if (units.length === 0) return 0;

    const now = new Date();

const activeReservationUnitIds = new Set(
  reservations
    .filter((reservation) => {
      const start = getSafeDate(reservation.startDate);
      const end = getSafeDate(reservation.endDate);

      return (
        reservation.status === "confirmed" &&
        start &&
        end &&
        start <= now &&
        end >= now
      );
    })
    .map((reservation) => reservation.unitId)
);

    return clampPercentage((activeReservationUnitIds.size / units.length) * 100);
  }, [approvedOrBetterReservations, units.length]);

  const reservationsByDayOfWeek = useMemo(() => {
    const labels = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    return labels.map((label, index) => ({
      label,
      count: reservations.filter((reservation) => {
        const date = getSafeDate(reservation.requestDate);
        return date ? date.getDay() === index : false;
      }).length,
    }));
  }, [reservations]);

  const trendData = useMemo<TrendPoint[]>(() => {
    const now = new Date();

    if (granularity === "daily") {
      return Array.from({ length: 30 }, (_, index) => {
        const date = addDays(getStartOfDay(now), -(29 - index));
        const nextDay = addDays(date, 1);

        const reservationsCount = reservations.filter((reservation) => {
          const requestDate = getSafeDate(reservation.requestDate);
          return requestDate ? requestDate >= date && requestDate < nextDay : false;
        }).length;

        const revenue = paidPayments
          .filter((payment) => {
            const paymentDate = getSafeDate(payment.date);
            return paymentDate ? paymentDate >= date && paymentDate < nextDay : false;
          })
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const paymentsCount = paidPayments.filter((payment) => {
          const paymentDate = getSafeDate(payment.date);
          return paymentDate ? paymentDate >= date && paymentDate < nextDay : false;
        }).length;

        return {
          label: formatShortDate(date),
          reservations: reservationsCount,
          revenue,
          payments: paymentsCount,
        };
      });
    }

    if (granularity === "weekly") {
      return Array.from({ length: 12 }, (_, index) => {
        const start = addWeeks(getStartOfWeek(now), -(11 - index));
        const endExclusive = addWeeks(start, 1);
        const endDisplay = addDays(endExclusive, -1);

        const reservationsCount = reservations.filter((reservation) => {
          const requestDate = getSafeDate(reservation.requestDate);
          return requestDate ? requestDate >= start && requestDate < endExclusive : false;
        }).length;

        const revenue = paidPayments
          .filter((payment) => {
            const paymentDate = getSafeDate(payment.date);
            return paymentDate ? paymentDate >= start && paymentDate < endExclusive : false;
          })
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const paymentsCount = paidPayments.filter((payment) => {
          const paymentDate = getSafeDate(payment.date);
          return paymentDate ? paymentDate >= start && paymentDate < endExclusive : false;
        }).length;

        return {
          label: formatWeekLabel(start, endDisplay),
          reservations: reservationsCount,
          revenue,
          payments: paymentsCount,
        };
      });
    }

    if (granularity === "monthly") {
      return Array.from({ length: 12 }, (_, index) => {
        const start = addMonths(getStartOfMonth(now), -(11 - index));
        const endExclusive = addMonths(start, 1);

        const reservationsCount = reservations.filter((reservation) => {
          const requestDate = getSafeDate(reservation.requestDate);
          return requestDate ? requestDate >= start && requestDate < endExclusive : false;
        }).length;

        const revenue = paidPayments
          .filter((payment) => {
            const paymentDate = getSafeDate(payment.date);
            return paymentDate ? paymentDate >= start && paymentDate < endExclusive : false;
          })
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        const paymentsCount = paidPayments.filter((payment) => {
          const paymentDate = getSafeDate(payment.date);
          return paymentDate ? paymentDate >= start && paymentDate < endExclusive : false;
        }).length;

        return {
          label: formatMonthShort(start),
          reservations: reservationsCount,
          revenue,
          payments: paymentsCount,
        };
      });
    }

    return Array.from({ length: 5 }, (_, index) => {
      const start = addYears(getStartOfYear(now), -(4 - index));
      const endExclusive = addYears(start, 1);

      const reservationsCount = reservations.filter((reservation) => {
        const requestDate = getSafeDate(reservation.requestDate);
        return requestDate ? requestDate >= start && requestDate < endExclusive : false;
      }).length;

      const revenue = paidPayments
        .filter((payment) => {
          const paymentDate = getSafeDate(payment.date);
          return paymentDate ? paymentDate >= start && paymentDate < endExclusive : false;
        })
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      const paymentsCount = paidPayments.filter((payment) => {
        const paymentDate = getSafeDate(payment.date);
        return paymentDate ? paymentDate >= start && paymentDate < endExclusive : false;
      }).length;

      return {
        label: String(start.getFullYear()),
        reservations: reservationsCount,
        revenue,
        payments: paymentsCount,
      };
    });
  }, [granularity, reservations, paidPayments]);

  const typeDistributionData = useMemo<DistributionPoint[]>(() => {
    const totals: Record<UnitType, number> = {
      rental_space: 0,
      function_hall: 0,
      parking_slot: 0,
    };

    reservations.forEach((reservation) => {
      if (reservation.unitType in totals) {
        totals[reservation.unitType as UnitType] += 1;
      }
    });

    return [
      {
        name: "Rental Space",
        value: totals.rental_space,
        color: UNIT_TYPE_COLORS.rental_space,
      },
      {
        name: "Function Hall",
        value: totals.function_hall,
        color: UNIT_TYPE_COLORS.function_hall,
      },
      {
        name: "Parking Slot",
        value: totals.parking_slot,
        color: UNIT_TYPE_COLORS.parking_slot,
      },
    ].filter((entry) => entry.value > 0);
  }, [reservations]);

  const categoryDistributionData = useMemo<DistributionPoint[]>(() => {
    const totals = new Map<string, number>();

    reservations.forEach((reservation) => {
      const unit = unitById.get(reservation.unitId);

      const key =
        unit?.category?.trim() ||
        unit?.type ||
        reservation.unitType ||
        "uncategorized";

      totals.set(key, (totals.get(key) ?? 0) + 1);
    });

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, value], index) => ({
        name: capitalizeWords(key),
        value,
        color:
          key === "commercial_space"
            ? "#2563eb"
            : key === "residential_space"
            ? "#16a34a"
            : key === "function_room"
            ? "#7c3aed"
            : key === "parking"
            ? "#ea580c"
            : CATEGORY_COLOR_FALLBACKS[index % CATEGORY_COLOR_FALLBACKS.length],
      }));
  }, [reservations, unitById]);

  const distributionData =
    breakdownMode === "category" ? categoryDistributionData : typeDistributionData;

  const unitRanking = useMemo(() => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);
    const endOfCurrentYear = new Date(now.getFullYear(), 11, 31);
    const msPerDay = 1000 * 60 * 60 * 24;

    const getOverlapDays = (
      rangeStart: Date,
      rangeEnd: Date,
      windowStart: Date,
      windowEnd: Date
    ) => {
      const start = new Date(Math.max(rangeStart.getTime(), windowStart.getTime()));
      const end = new Date(Math.min(rangeEnd.getTime(), windowEnd.getTime()));

      if (start > end) return 0;
      return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
    };

    const getOverlapMonths = (
      rangeStart: Date,
      rangeEnd: Date,
      windowStart: Date,
      windowEnd: Date
    ) => {
      const start = new Date(Math.max(rangeStart.getTime(), windowStart.getTime()));
      const end = new Date(Math.min(rangeEnd.getTime(), windowEnd.getTime()));

      if (start > end) return 0;

      return (
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) +
        1
      );
    };

    const daysInCurrentMonth = endOfCurrentMonth.getDate();
    const monthsInCurrentYear = 12;

    return units
      .map((unit) => {
        const unitReservations = reservations.filter(
          (reservation) =>
            reservation.unitId === unit.id &&
            ["approved", "confirmed", "completed"].includes(reservation.status)
        );

        const revenue = paidRevenueByUnitId.get(unit.id) ?? 0;

        let bookedSlots = 0;
        const totalSlots =
          unit.type === "rental_space" ? monthsInCurrentYear : daysInCurrentMonth;

        unitReservations.forEach((reservation) => {
          const start = getSafeDate(reservation.startDate);
          const end = getSafeDate(reservation.endDate);

          if (!start || !end) return;

          if (unit.type === "rental_space") {
            bookedSlots += getOverlapMonths(
              start,
              end,
              startOfCurrentYear,
              endOfCurrentYear
            );
          } else {
            bookedSlots += getOverlapDays(
              start,
              end,
              startOfCurrentMonth,
              endOfCurrentMonth
            );
          }
        });

        const occupancyRate =
          totalSlots > 0 ? Math.min((bookedSlots / totalSlots) * 100, 100) : 0;

        return {
          ...unit,
          reservationCount: unitReservations.length,
          revenue,
          occupancyRate: Number(occupancyRate.toFixed(1)),
        };
      })
      .sort((a, b) => {
        if (b.revenue !== a.revenue) return b.revenue - a.revenue;
        return b.reservationCount - a.reservationCount;
      });
  }, [units, reservations, paidRevenueByUnitId]);

  const topCategory = useMemo(() => {
    if (categoryDistributionData.length === 0) return null;
    return categoryDistributionData[0];
  }, [categoryDistributionData]);

  const hasAnyAnalyticsData = reservations.length > 0 || payments.length > 0;
  const hasPaidPayments = paidPayments.length > 0;
  const hasReservationTrendData = trendData.some((point) => point.reservations > 0);
  const hasRevenueTrendData = trendData.some(
    (point) => point.revenue > 0 || point.payments > 0
  );
  const hasUnitRanking = unitRanking.length > 0;
  const hasDistribution = distributionData.length > 0;
  const hasReservationsByDay = reservationsByDayOfWeek.some((entry) => entry.count > 0);

  const exportTrendCsv = useCallback(() => {
    const rows = trendData.map((item) => ({
      Period: item.label,
      Reservations: item.reservations,
      Verified_Payments: item.payments,
      Revenue: formatCurrency(item.revenue),
    }));

    downloadCsv(
      `analytics-trend-${granularity}-${new Date().toISOString().split("T")[0]}.csv`,
      rows
    );
  }, [granularity, trendData]);

  const exportUnitRankingCsv = useCallback(() => {
    const rows = unitRanking.map((unit, index) => ({
      Rank: index + 1,
      Unit: unit.name,
      Unit_Type: getUnitTypeLabel(unit.type as UnitType),
      Category: capitalizeWords(unit.category),
      Subtype: capitalizeWords(unit.subtype),
      Reservations: unit.reservationCount,
      Revenue: formatCurrency(unit.revenue),
      Occupancy: `${unit.occupancyRate}%`,
      Available: unit.available ? "Yes" : "No",
      Location: unit.location ?? "N/A",
    }));

    downloadCsv(
      `analytics-unit-ranking-${new Date().toISOString().split("T")[0]}.csv`,
      rows
    );
  }, [unitRanking]);

  const exportDistributionCsv = useCallback(() => {
    const total = distributionData.reduce((sum, item) => sum + item.value, 0);

    const rows = distributionData.map((item) => ({
      Group: item.name,
      Reservations: item.value,
      Percentage: `${
        total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"
      }%`,
    }));

    downloadCsv(
      `analytics-distribution-${breakdownMode}-${new Date()
        .toISOString()
        .split("T")[0]}.csv`,
      rows
    );
  }, [breakdownMode, distributionData]);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Analytics
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              Performance insights for reservations, revenue, units, and collections
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="hidden cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 lg:flex"
            title="Print report"
          >
            <Printer className="size-5" />
            <span className="hidden sm:inline">Print Analytics</span>
          </button>
        </div>

        <style>
          {`
            @media print {
              .no-print { display: none !important; }
              body { background: white; }
            }
          `}
        </style>

        <div ref={printRef} className="flex flex-col gap-6">
          {!hasAnyAnalyticsData ? (
            <EmptyState
              icon={<BarChart3 className="size-10 text-blue-500" />}
              title="No analytics data yet"
              description="Analytics will appear here once reservations or payments are added to the system."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MetricCard
                  label="Verified Revenue"
                  value={formatCurrency(totalRevenue)}
                  subtext={
                    hasPaidPayments
                      ? "Verified payments only"
                      : "Waiting for paid payments"
                  }
                  icon={<TrendingUp className="size-4 text-emerald-600 sm:size-5" />}
                  valueClassName="text-emerald-600"
                />

                <MetricCard
                  label="Reservations"
                  value={totalReservations}
                  subtext={`${approvedOrBetterReservations.length} approved or better`}
                  icon={<Calendar className="size-4 text-blue-600 sm:size-5" />}
                />

                <MetricCard
                  label="Collection Rate"
                  value={`${collectionRate.toFixed(1)}%`}
                  subtext={
                    expectedTotal > 0
                      ? `${formatCurrency(outstandingTotal)} still outstanding`
                      : "Waiting for confirmed revenue"
                  }
                  icon={<CircleDollarSign className="size-4 text-violet-600 sm:size-5" />}
                />

                <MetricCard
                  label="Active Units"
                  value={activeUnitsCount}
                  subtext={`${globalOccupancyRate.toFixed(1)}% with bookings`}
                  icon={<Building2 className="size-4 text-orange-600 sm:size-5" />}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                <InsightCard
                  title="Average Reservation Value"
                  value={formatCurrency(averageReservationValue)}
                  note="Verified revenue divided by approved and confirmed reservations"
                  icon={<Wallet className="size-5 text-blue-600" />}
                />

                <InsightCard
                  title="Average Booking Length"
                  value={averageDuration > 0 ? averageDuration.toFixed(1) : "0.0"}
                  note="Average raw booking duration across confirmed bookings"
                  icon={<Activity className="size-5 text-emerald-600" />}
                />

                <InsightCard
                  title="Top Category"
                  value={topCategory?.name ?? "No data"}
                  note={
                    topCategory
                      ? `${topCategory.value} reservations`
                      : "Category ranking appears when reservations exist"
                  }
                  icon={<PieChartIcon className="size-5 text-violet-600" />}
                />
                <InsightCard
                  title="Top Promo"
                  value={topPromoCode ? topPromoCode[0] : "No data"}
                  note={
                    topPromoCode
                      ? `${topPromoCode[1]} uses`
                      : "No promo reservations yet"
                  }
                  icon={<Tag className="size-5 text-orange-600" />}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
  <MetricCard
    label="Active Promos"
    value={activePromosCount}
    subtext="Currently enabled promos"
    icon={<Tag className="size-4 text-emerald-600 sm:size-5" />}
  />

  <MetricCard
    label="Promo Reservations"
    value={promoReservations.length}
    subtext="Bookings with promo usage"
    icon={<BadgePercent className="size-4 text-violet-600 sm:size-5" />}
  />

  <MetricCard
    label="Discounts Given"
    value={formatCurrency(totalPromoDiscount)}
    subtext="Total promo savings granted"
    icon={<CircleDollarSign className="size-4 text-orange-600 sm:size-5" />}
    valueClassName="text-orange-600"
  />

  <MetricCard
    label="Revenue Influenced"
    value={formatCurrency(promoRevenueInfluenced)}
    subtext="Verified revenue from promo bookings"
    icon={<TrendingUp className="size-4 text-blue-600 sm:size-5" />}
    valueClassName="text-blue-600"
  />
</div>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 sm:text-lg">
                      <BarChart3 className="size-4 text-blue-600 sm:size-5" />
                      Reservation & Revenue Trend
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      Track reservation activity, verified payments, and revenue over time
                    </p>
                  </div>

                  <div className="no-print flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <select
                        value={granularity}
                        onChange={(e) => setGranularity(e.target.value as Granularity)}
                        className="appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-xs font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm"
                      >
                        {GRANULARITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    </div>

                    {hasReservationTrendData || hasRevenueTrendData ? (
                      <button
                        onClick={exportTrendCsv}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:text-sm"
                      >
                        <FileSpreadsheet className="size-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                      </button>
                    ) : (
                      <DisabledExportButton />
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-900 sm:text-base">
                        Reservation Trend
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        Reservation volume across the selected period
                      </p>
                    </div>

                    {hasReservationTrendData ? (
                      <div className="h-[280px] w-full sm:h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={trendData}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="label"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94a3b8", fontSize: 11 }}
                              interval={granularity === "daily" ? 4 : 0}
                            />
                            <YAxis
                              allowDecimals={false}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94a3b8", fontSize: 11 }}
                            />
                            <Tooltip
                              formatter={countTooltipFormatter}
                              contentStyle={{
                                borderRadius: "14px",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                              }}
                            />
                            <Bar
                              dataKey="reservations"
                              fill="#2563eb"
                              radius={[6, 6, 0, 0]}
                              name="Reservations"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <AnalyticsEmptyState
                        icon={<BarChart3 className="size-7" />}
                        title="No reservation trend data yet"
                        description="Reservation trend will appear once bookings start coming in."
                        hint="New reservations are grouped automatically by the selected date range."
                      />
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-900 sm:text-base">
                        Revenue Trend
                      </h3>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        Verified revenue across the selected period
                      </p>
                    </div>

                    {hasRevenueTrendData ? (
                      <div className="h-[280px] w-full sm:h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={trendData}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#f1f5f9"
                            />
                            <XAxis
                              dataKey="label"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94a3b8", fontSize: 11 }}
                              interval={granularity === "daily" ? 4 : 0}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#94a3b8", fontSize: 11 }}
                              tickFormatter={(value) =>
                                `₱${Math.round(Number(value) / 1000)}k`
                              }
                            />
                            <Tooltip
                              formatter={revenueTooltipFormatter}
                              contentStyle={{
                                borderRadius: "14px",
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="revenue"
                              stroke="#16a34a"
                              strokeWidth={3}
                              dot={{ r: 3, fill: "#16a34a" }}
                              activeDot={{ r: 5 }}
                              name="Revenue"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <AnalyticsEmptyState
                        icon={<TrendingUp className="size-7" />}
                        title="No revenue trend data yet"
                        description="Revenue trend will appear once paid payments are recorded."
                        hint="Only verified paid payments contribute to this chart."
                      />
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-800 sm:text-lg">
                  <Calendar className="size-4 text-indigo-600 sm:size-5" />
                  Reservations by Day of Week
                </h2>

                {hasReservationsByDay ? (
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reservationsByDayOfWeek}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="label"
                          tickFormatter={(value) => value.slice(0, 3)}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={countTooltipFormatter}
                          contentStyle={{
                            borderRadius: "14px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                          name="Reservations"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <AnalyticsEmptyState
                    icon={<Calendar className="size-7" />}
                    title="No weekday pattern yet"
                    description="We need more reservation history before weekday demand patterns can be shown."
                    hint="Once bookings accumulate, this chart will reveal busy days."
                  />
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 sm:text-lg">
                      <PieChartIcon className="size-4 text-violet-600 sm:size-5" />
                      Reservation Distribution
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      View reservation mix by unit category or unit type
                    </p>
                  </div>

                  <div className="no-print flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <select
                        value={breakdownMode}
                        onChange={(e) =>
                          setBreakdownMode(e.target.value as BreakdownMode)
                        }
                        className="appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-xs font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-sm"
                      >
                        {BREAKDOWN_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    </div>

                    {hasDistribution ? (
                      <button
                        onClick={exportDistributionCsv}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 sm:text-sm"
                      >
                        <FileSpreadsheet className="size-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                      </button>
                    ) : (
                      <DisabledExportButton />
                    )}
                  </div>
                </div>

                {hasDistribution ? (
                  <div className="flex flex-col items-center gap-8 lg:flex-row">
                    <div className="h-[260px] w-full lg:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={88}
                            innerRadius={58}
                            paddingAngle={4}
                            isAnimationActive={false}
                          >
                            {distributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={countTooltipFormatter}
                            contentStyle={{
                              borderRadius: "14px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid w-full grid-cols-1 gap-2 lg:w-1/2">
                      {distributionData.map((entry, index) => {
                        const total = distributionData.reduce(
                          (sum, item) => sum + item.value,
                          0
                        );
                        const percentage =
                          total > 0
                            ? ((entry.value / total) * 100).toFixed(1)
                            : "0.0";

                        return (
                          <div
                            key={`${entry.name}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="size-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="truncate text-sm font-medium text-gray-700">
                                {entry.name}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">
                              {entry.value} ({percentage}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <AnalyticsEmptyState
                    icon={<PieChartIcon className="size-7" />}
                    title="No distribution data yet"
                    description="Distribution charts will appear once reservations are recorded."
                    hint="Category and type breakdowns become more useful as your dataset grows."
                  />
                )}
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-bold text-gray-800 sm:text-lg">
                      <Building2 className="size-4 text-orange-600 sm:size-5" />
                      Unit Ranking
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      Ranked by verified revenue, then reservation volume
                    </p>
                  </div>

                  <div className="no-print">
                    {hasUnitRanking ? (
                      <button
                        onClick={exportUnitRankingCsv}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 sm:text-sm"
                      >
                        <FileSpreadsheet className="size-4" />
                        <span className="hidden sm:inline">Export CSV</span>
                      </button>
                    ) : (
                      <DisabledExportButton />
                    )}
                  </div>
                </div>

                {hasUnitRanking ? (
                  <div className="-mx-4 overflow-x-auto sm:mx-0">
                    <table className="min-w-[760px] w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:px-0">
                            Rank
                          </th>
                          <th className="py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Unit
                          </th>
                          <th className="py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Category
                          </th>
                          <th className="py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Type
                          </th>
                          <th className="py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Reservations
                          </th>
                          <th className="py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            Revenue
                          </th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:px-0">
                            Occupancy
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-50">
                        {unitRanking.map((unit, index) => (
                          <tr key={unit.id} className="transition-colors hover:bg-gray-50/50">
                            <td className="px-4 py-4 text-sm font-medium text-gray-400 sm:px-0">
                              #{index + 1}
                            </td>

                            <td className="py-4">
                              <p className="max-w-[180px] truncate text-sm font-semibold text-gray-900">
                                {unit.name}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-400">
                                {unit.location || "No location"}
                              </p>
                            </td>

                            <td className="py-4 text-sm text-gray-600">
                              {capitalizeWords(unit.category)}
                            </td>

                            <td className="py-4 text-sm text-gray-600">
                              {getUnitTypeLabel(unit.type as UnitType)}
                            </td>

                            <td className="py-4 text-right text-sm font-semibold text-gray-700">
                              {unit.reservationCount}
                            </td>

                            <td className="py-4 text-right text-sm font-bold text-emerald-600">
                              {formatCurrency(unit.revenue)}
                            </td>

                            <td className="px-4 py-4 text-right sm:px-0">
                              <div className="inline-flex items-center justify-end gap-2">
                                <span className="text-xs font-medium text-gray-600">
                                  {unit.occupancyRate}%
                                </span>
                                <div className="hidden h-1.5 w-14 rounded-full bg-gray-100 sm:block">
                                  <div
                                    className="h-1.5 rounded-full bg-blue-600"
                                    style={{ width: `${unit.occupancyRate}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <AnalyticsEmptyState
                    icon={<Building2 className="size-7" />}
                    title="No unit performance data yet"
                    description="Unit rankings will appear once units start generating bookings and paid revenue."
                    hint="Add units and complete bookings to compare performance."
                  />
                )}
              </section>

              <section className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-lg shadow-emerald-900/10 sm:p-8">
                <h2 className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-50/90 sm:text-sm">
                  <ShieldCheck className="size-4" />
                  Financial Overview
                </h2>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <OverviewCard
                    label="Total Collected"
                    value={formatCurrency(totalRevenue)}
                  />
                  <OverviewCard
                    label="Outstanding"
                    value={formatCurrency(outstandingTotal)}
                  />
                  <OverviewCard
                    label="Expected Total"
                    value={formatCurrency(expectedTotal)}
                  />
                </div>
              </section>

              <div className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/50 p-3 text-gray-400">
                <ShieldCheck className="size-4" />
                <p className="text-center text-[10px] font-medium sm:text-xs">
                  Compliant with the Philippine Data Privacy Act of 2012
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  icon,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: ReactNode;
  valueClassName?: string;
}) {
  const isZero =
    value === 0 ||
    value === "0" ||
    value === "0.0" ||
    value === "₱0.00" ||
    value === "0.0%";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-6">
      <div className="mb-1 flex items-center justify-between sm:mb-2">
        <p className="text-[10px] font-semibold uppercase text-gray-500 sm:text-xs">
          {label}
        </p>
        {icon}
      </div>

      <p
        className={`truncate text-base font-bold sm:text-xl ${
          isZero ? "text-gray-400" : valueClassName
        }`}
      >
        {value}
      </p>

      <p className="mt-0.5 text-[10px] text-gray-400 sm:text-xs">{subtext}</p>
    </div>
  );
}

function InsightCard({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </p>
        {icon}
      </div>

      <p className="truncate text-lg font-bold text-gray-900 sm:text-xl">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-gray-400">{note}</p>
    </div>
  );
}

function OverviewCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md transition hover:bg-white/15">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider opacity-70 sm:text-xs">
        {label}
      </p>
      <p className="text-lg font-black sm:text-2xl">{value}</p>
    </div>
  );
}

function AnalyticsEmptyState({
  icon,
  title,
  description,
  hint,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center sm:min-h-[280px]">
      <div className="mx-auto max-w-md px-6 py-10 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-gray-400">
          {icon}
        </div>
        <h3 className="text-base font-bold text-gray-900 sm:text-lg">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
        {hint ? <p className="mt-3 text-xs text-gray-400">{hint}</p> : null}
      </div>
    </div>
  );
}

function DisabledExportButton() {
  return (
    <button
      disabled
      className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 sm:text-sm"
    >
      <FileSpreadsheet className="size-4" />
      <span className="hidden sm:inline">Export CSV</span>
    </button>
  );
}