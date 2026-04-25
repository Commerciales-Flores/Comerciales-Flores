import {
  BadgePercent,
  CalendarDays,
  Edit,
  Gift,
  PhilippinePeso,
  Tags,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import type { Promotion } from '../../../contexts/PromotionsContext';

type PromotionCardProps = {
  promotion: Promotion;
  isDeleting?: boolean;
  onEdit: (promotionId: string) => void;
  onDelete: (promotionId: string) => void;
  onToggleActive: (promotion: Promotion) => void;
};

function formatMoney(value?: number | null) {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'No date set';

  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLabel(value?: string | null) {
  if (!value) return 'All';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatus(promotion: Promotion) {
  if (!promotion.isActive) return 'Inactive';

  const now = new Date();

  if (promotion.validFrom && new Date(promotion.validFrom) > now) {
    return 'Scheduled';
  }

  if (promotion.validUntil && new Date(promotion.validUntil) < now) {
    return 'Expired';
  }

  if (
    promotion.maxUses !== null &&
    promotion.usedCount >= promotion.maxUses
  ) {
    return 'Maxed Out';
  }

  return 'Active';
}

function getStatusClass(status: string) {
  if (status === 'Active') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Scheduled') return 'bg-amber-100 text-amber-700';
  if (status === 'Expired') return 'bg-rose-100 text-rose-700';
  if (status === 'Maxed Out') return 'bg-violet-100 text-violet-700';
  return 'bg-slate-200 text-slate-700';
}

export default function PromotionCard({
  promotion,
  isDeleting = false,
  onEdit,
  onDelete,
  onToggleActive,
}: PromotionCardProps) {
  const status = getStatus(promotion);

  const discountLabel =
    promotion.discountType === 'percent'
      ? `${promotion.discountValue}% OFF`
      : `${formatMoney(promotion.discountValue)} OFF`;

  const usageLabel =
    promotion.maxUses === null
      ? `${promotion.usedCount} used · Unlimited`
      : `${promotion.usedCount}/${promotion.maxUses} used`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
            {promotion.discountType === 'percent' ? (
              <BadgePercent className="size-5" />
            ) : (
              <PhilippinePeso className="size-5" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
              {promotion.code}
            </p>

            <h3 className="mt-1 truncate text-base font-bold text-slate-900">
              {promotion.name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                {discountLabel}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClass(
                  status
                )}`}
              >
                {status}
              </span>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {usageLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {promotion.publicId ?? 'Promo'}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Description
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {promotion.description?.trim() || 'No description added.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Tags className="mt-0.5 size-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Applies To
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatLabel(promotion.appliesToUnitType)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatLabel(promotion.appliesToReservationType)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-4 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Duration
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {formatDate(promotion.validFrom)}
                </p>
                <p className="text-xs text-slate-500">
                  Until {formatDate(promotion.validUntil)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Gift className="mt-0.5 size-4 text-slate-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Requirements
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {promotion.minBookingAmount
                  ? `Minimum booking: ${formatMoney(promotion.minBookingAmount)}`
                  : 'No minimum booking amount'}
              </p>
              <p className="text-xs text-slate-500">
                {promotion.minStayDays
                  ? `Minimum stay: ${promotion.minStayDays} day(s)`
                  : 'No minimum stay requirement'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onEdit(promotion.id)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            <Edit className="size-4" />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onToggleActive(promotion)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              promotion.isActive
                ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {promotion.isActive ? (
              <ToggleRight className="size-4" />
            ) : (
              <ToggleLeft className="size-4" />
            )}
            {promotion.isActive ? 'Deactivate' : 'Activate'}
          </button>

          <button
            type="button"
            onClick={() => onDelete(promotion.id)}
            disabled={isDeleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}