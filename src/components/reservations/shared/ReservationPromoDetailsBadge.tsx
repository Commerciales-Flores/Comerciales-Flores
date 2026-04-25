import { BadgePercent, CalendarClock, Tag } from "lucide-react";
import { useMemo } from "react";
import { usePromotions } from "../../../contexts/PromotionsContext";
import { formatCurrency } from "../../../utils/currency";

type ReservationPromoDetailsBadgeProps = {
  unitId: string;
  compact?: boolean;
  detailed?: boolean;
  subtotal?: number;
  unitType?: "rental_space" | "function_hall" | "parking_slot";
};

export default function ReservationPromoDetailsBadge({
  unitId,
  compact = false,
  detailed = false,
  subtotal,
  unitType,
}: ReservationPromoDetailsBadgeProps) {
  const { promotions } = usePromotions();

  const promo = useMemo(() => {
    return (
      promotions.find(
        (item) =>
          item.isActive &&
          Array.isArray(item.attachedUnitIds) &&
          item.attachedUnitIds.includes(unitId)
      ) ?? null
    );
  }, [promotions, unitId]);

  if (!promo) return null;

  const discountLabel =
    promo.discountType === "percent"
      ? `${promo.discountValue}% OFF`
      : `${formatCurrency(promo.discountValue)} OFF`;

  const estimatedSavings =
    typeof subtotal === "number" && subtotal > 0
      ? promo.discountType === "percent"
        ? Math.min(subtotal, subtotal * (promo.discountValue / 100))
        : Math.min(subtotal, promo.discountValue)
      : 0;

  const expiryLabel = promo.validUntil
    ? new Date(promo.validUntil).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  if (compact) {
    return (
      <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        <BadgePercent className="size-3.5" />
        <span>{promo.code} • {discountLabel}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-600 p-2.5 text-white shadow-sm">
            <Tag className="size-4" />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
              Promo Available
            </p>

            <p className="mt-1 text-base font-bold text-slate-900">
              {promo.code}
            </p>

            <p className="mt-0.5 text-sm font-semibold text-emerald-700">
              {discountLabel}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
          Active
        </span>
      </div>

      {promo.description ? (
        <p className="mt-3 text-sm leading-5 text-slate-600">
          {promo.description}
        </p>
      ) : null}

      {detailed && (
        <div className="mt-4 grid gap-2 rounded-xl border border-emerald-100 bg-white p-3 text-sm">
          {estimatedSavings > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Estimated savings</span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(estimatedSavings)}
              </span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Promo code</span>
            <span className="font-bold text-slate-900">{promo.code}</span>
          </div>

          {expiryLabel ? (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <CalendarClock className="size-3.5" />
                Valid until
              </span>
              <span className="font-semibold text-slate-900">
                {expiryLabel}
              </span>
            </div>
          ) : null}

          {unitType === "rental_space" ? (
            <p className="border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500">
              For monthly leases, promo discounts apply to advance rent only.
              Security deposit is excluded.
            </p>
          ) : (
            <p className="border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500">
              Final discount is verified when the promo code is applied during
              reservation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}