import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  CalendarDays,
  Gift,
  PhilippinePeso,
  Tags,
  X,
} from 'lucide-react';
import type {
  Promotion,
  PromotionPayload,
  PromotionAppliesToReservationType,
  PromotionDiscountType,
} from '../../../contexts/PromotionsContext';
import { useUnits } from '../../../contexts/UnitsContext';

type PromotionModalProps = {
  open: boolean;
  promotion: Promotion | null;
  onClose: () => void;
  onSave: (payload: PromotionPayload, id?: string, unitId?: string) => Promise<void>;
};

const VAT_RATE = 0.12;
const PERCENT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

const INITIAL_FORM: PromotionPayload = {
  code: '',
  name: '',
  description: '',
  discountType: 'percent',
  discountValue: 5,
  appliesToUnitType: 'all',
  appliesToReservationType: 'all',
  minBookingAmount: null,
  minStayDays: null,
  maxUses: null,
  validFrom: null,
  validUntil: null,
  isActive: true,
};

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function money(value: number | null | undefined) {
  return `₱${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function reservationTypeLabel(value: PromotionAppliesToReservationType) {
  switch (value) {
    case 'flexible_stay':
      return 'Flexible Stay';
    case 'monthly_lease':
      return 'Monthly Lease';
    case 'function_hall':
      return 'Function Hall Booking';
    case 'parking':
      return 'Parking Booking';
    default:
      return 'All Reservation Types';
  }
}

function unitTypeLabel(value?: string | null) {
  switch (value) {
    case 'rental_space':
      return 'Rental Space';
    case 'function_hall':
      return 'Function Hall';
    case 'parking_slot':
      return 'Parking Slot';
    default:
      return 'Unit';
  }
}

export default function PromotionModal({
  open,
  promotion,
  onClose,
  onSave,
}: PromotionModalProps) {
  const { units } = useUnits();

  const [form, setForm] = useState<PromotionPayload>(INITIAL_FORM);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableUnits = useMemo(
    () =>
      [...units]
        .filter((unit) => !('isDeleted' in unit) || !(unit as any).isDeleted)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [units]
  );

  const selectedUnit = useMemo(
    () => availableUnits.find((unit) => unit.id === selectedUnitId) ?? null,
    [availableUnits, selectedUnitId]
  );

  const selectedUnitPrice = useMemo(() => {
    if (!selectedUnit) return 0;

    if (
      form.appliesToReservationType === 'flexible_stay' &&
      selectedUnit.dailyRate
    ) {
      return Number(selectedUnit.dailyRate);
    }

    if (
      form.appliesToReservationType === 'monthly_lease' &&
      selectedUnit.monthlyRate
    ) {
      return Number(selectedUnit.monthlyRate);
    }

    return Number(selectedUnit.price ?? selectedUnit.monthlyRate ?? 0);
  }, [form.appliesToReservationType, selectedUnit]);

  const pricingPreview = useMemo(() => {
    const subtotal = roundCurrency(Math.max(0, selectedUnitPrice));

    const rawDiscount =
      form.discountType === 'percent'
        ? subtotal * (Number(form.discountValue || 0) / 100)
        : Number(form.discountValue || 0);

    const discountAmount = roundCurrency(
      Math.min(Math.max(0, rawDiscount), subtotal)
    );

    const taxableSubtotal = roundCurrency(subtotal - discountAmount);
    const vatAmount = roundCurrency(taxableSubtotal * VAT_RATE);
    const finalTotal = roundCurrency(taxableSubtotal + vatAmount);

    return {
      subtotal,
      discountAmount,
      taxableSubtotal,
      vatAmount,
      finalTotal,
    };
  }, [form.discountType, form.discountValue, selectedUnitPrice]);

  useEffect(() => {
    if (!open) return;

    if (promotion) {
      setForm({
        code: promotion.code,
        name: promotion.name,
        description: promotion.description ?? '',
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        appliesToUnitType: 'all',
        appliesToReservationType: promotion.appliesToReservationType,
        minBookingAmount: promotion.minBookingAmount,
        minStayDays: promotion.minStayDays,
        maxUses: promotion.maxUses,
        validFrom: promotion.validFrom,
        validUntil: promotion.validUntil,
        isActive: promotion.isActive,
      });

      setSelectedUnitId(promotion.attachedUnitIds?.[0] ?? '');
    } else {
      setForm(INITIAL_FORM);
      setSelectedUnitId('');
    }

    setIsSubmitting(false);
  }, [open, promotion]);

  const updateField = useCallback(
    <K extends keyof PromotionPayload>(key: K, value: PromotionPayload[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const previewDiscount = useMemo(() => {
    if (form.discountType === 'percent') {
      return `${Number(form.discountValue || 5)}% OFF`;
    }

    return `${money(Number(form.discountValue || 0))} OFF`;
  }, [form.discountType, form.discountValue]);

  const previewStatus = useMemo(() => {
    if (!form.isActive) return 'Inactive';

    const now = new Date();
    const validFrom = form.validFrom ? new Date(form.validFrom) : null;
    const validUntil = form.validUntil ? new Date(form.validUntil) : null;

    if (validFrom && validFrom > now) return 'Scheduled';
    if (validUntil && validUntil < now) return 'Expired';

    return 'Active';
  }, [form.isActive, form.validFrom, form.validUntil]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      if (!selectedUnitId) {
        alert('Please select a unit before saving this promotion.');
        return;
      }

      setIsSubmitting(true);

      try {
        await onSave(
          {
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            description: form.description?.trim() || null,
            discountType: form.discountType,
            discountValue:
              form.discountType === 'percent'
                ? Number(form.discountValue || 5)
                : Math.max(1, Number(form.discountValue || 1)),
            appliesToUnitType: 'all',
            appliesToReservationType: form.appliesToReservationType,
            minBookingAmount:
              form.minBookingAmount === null || form.minBookingAmount === undefined
                ? null
                : Number(form.minBookingAmount),
            minStayDays:
              form.minStayDays === null || form.minStayDays === undefined
                ? null
                : Number(form.minStayDays),
            maxUses:
              form.maxUses === null || form.maxUses === undefined
                ? null
                : Number(form.maxUses),
            validFrom: form.validFrom || null,
            validUntil: form.validUntil || null,
            isActive: form.isActive,
          },
          promotion?.id,
          selectedUnitId
        );

        onClose();
      } catch (error) {
        console.error('Failed to save promotion:', error);
        setIsSubmitting(false);
      }
    },
    [form, isSubmitting, onClose, onSave, promotion?.id, selectedUnitId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-slate-900 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {promotion ? 'Edit Promotion' : 'Add Promotion'}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Configure promo codes, discount rules, validity, and assign this promo to one unit.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Promo Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={form.code}
                  onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER10"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold uppercase tracking-wider outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Promo Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Summer Discount"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Applicable Unit
              </label>
              <select
                required
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Select a unit</option>
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} · {unitTypeLabel(unit.type)} · {money(unit.price)}
                  </option>
                ))}
              </select>

              {selectedUnit ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                    Selected Unit Price
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {money(selectedUnitPrice)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Used as preview base before discount and VAT.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
                  Select a unit to preview discount and VAT computation.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Discount Type
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) => {
                    const nextType = e.target.value as PromotionDiscountType;
                    updateField('discountType', nextType);
                    updateField('discountValue', nextType === 'percent' ? 5 : 1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Discount Value
                </label>

                {form.discountType === 'percent' ? (
                  <select
                    required
                    value={form.discountValue || 5}
                    onChange={(e) =>
                      updateField('discountValue', Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    {PERCENT_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}%
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedUnitPrice > 0 ? selectedUnitPrice : undefined}
                    step="0.01"
                    value={form.discountValue || ''}
                    onChange={(e) => {
                      const rawValue =
                        e.target.value === '' ? 1 : Number(e.target.value);
                      const nextValue =
                        selectedUnitPrice > 0
                          ? Math.min(selectedUnitPrice, Math.max(1, rawValue))
                          : Math.max(1, rawValue);

                      updateField('discountValue', nextValue);
                    }}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Eligible Booking Type
              </label>
              <select
                value={form.appliesToReservationType}
                onChange={(e) =>
                  updateField(
                    'appliesToReservationType',
                    e.target.value as PromotionAppliesToReservationType
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="all">All Reservation Types</option>
                <option value="flexible_stay">Flexible Stay</option>
                <option value="monthly_lease">Monthly Lease</option>
                <option value="function_hall">Function Hall Booking</option>
                <option value="parking">Parking Booking</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Min Booking Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minBookingAmount ?? ''}
                  onChange={(e) =>
                    updateField(
                      'minBookingAmount',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Min Stay Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.minStayDays ?? ''}
                  onChange={(e) =>
                    updateField(
                      'minStayDays',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Max Uses
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxUses ?? ''}
                  onChange={(e) =>
                    updateField(
                      'maxUses',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  placeholder="Unlimited"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Valid From
                </label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(form.validFrom)}
                  onChange={(e) => updateField('validFrom', fromDateTimeLocal(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Valid Until
                </label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocal(form.validUntil)}
                  onChange={(e) => updateField('validUntil', fromDateTimeLocal(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Description
              </label>
              <textarea
                rows={4}
                maxLength={500}
                value={form.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Optional internal/client-facing description."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Status
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all hover:bg-white">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Active for eligible clients
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !selectedUnitId}
                className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting
                  ? promotion
                    ? 'Updating...'
                    : 'Adding...'
                  : promotion
                    ? 'Update Promotion'
                    : 'Add Promotion'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Promo Preview</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Preview uses the selected unit’s reference price. Final discount is calculated during reservation based on booking type.
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-100">
                        {form.discountType === 'percent' ? (
                          <BadgePercent className="size-5" />
                        ) : (
                          <PhilippinePeso className="size-5" />
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                          {form.code || 'PROMO_CODE'}
                        </p>
                        <h4 className="mt-1 text-lg font-black text-slate-900">
                          {previewDiscount}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        previewStatus === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : previewStatus === 'Scheduled'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {previewStatus}
                    </span>
                  </div>

                  <div className="mt-5">
                    <h5 className="text-sm font-bold text-slate-900">
                      {form.name || 'Promotion Name'}
                    </h5>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {form.description?.trim() ||
                        'Promo description will appear here.'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Selected Unit
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {selectedUnit ? selectedUnit.name : 'No unit selected'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedUnit
                      ? `${unitTypeLabel(selectedUnit.type)} · ${money(selectedUnitPrice)} base`
                      : 'Select a unit to see final price.'}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Reference Price</span>
                    <span className="font-semibold text-slate-900">
                      {money(pricingPreview.subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Discount</span>
                    <span className="font-semibold text-rose-600">
                      -{money(pricingPreview.discountAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">Taxable Subtotal</span>
                    <span className="font-semibold text-slate-900">
                      {money(pricingPreview.taxableSubtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">VAT (12%)</span>
                    <span className="font-semibold text-slate-900">
                      {money(pricingPreview.vatAmount)}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-bold text-slate-900">
                        Final Price
                      </span>
                      <span className="text-lg font-black text-blue-700">
                        {money(pricingPreview.finalTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Tags className="mt-0.5 size-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Applicability
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        Assigned to selected unit
                      </p>
                      <p className="text-xs text-slate-500">
                        {reservationTypeLabel(form.appliesToReservationType)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 size-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Duration
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {form.validFrom
                          ? new Date(form.validFrom).toLocaleString()
                          : 'Starts anytime'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {form.validUntil
                          ? `Until ${new Date(form.validUntil).toLocaleString()}`
                          : 'No expiry date'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Gift className="mt-0.5 size-4 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Requirements
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {form.minBookingAmount
                          ? `Minimum ${money(form.minBookingAmount)} booking`
                          : 'No minimum booking amount'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {form.minStayDays
                          ? `Minimum stay: ${form.minStayDays} day(s)`
                          : 'No minimum stay requirement'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {form.maxUses ? `Usage limit: ${form.maxUses}` : 'Unlimited uses'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-500">
                  Final discount computation is still verified by the backend edge
                  function before reservation/payment submission.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}