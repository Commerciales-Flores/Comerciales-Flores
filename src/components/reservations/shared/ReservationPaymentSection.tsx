import type { Dispatch, SetStateAction } from "react";
import supabase from "../../../supabaseClient";
import type { UnitType } from "../../../data/types";
import type { ReservationForm, PaymentMethod } from "./reservation.types";
import { usePromotions } from "../../../contexts/PromotionsContext";

interface UnitLike {
  policies?: string | null;
  contractFilePath?: string | null;
}

interface PaymentMethodItemLike {
  id: string;
  methodCode: string;
  displayName: string;
}

interface ReservationPaymentSectionProps {
  shouldShowPaymentSection: boolean;
  hasActivePaymentMethods: boolean;
  activePaymentMethods: PaymentMethodItemLike[];

  reservationForm: ReservationForm;
  setReservationForm: Dispatch<SetStateAction<ReservationForm>>;
  updateReservationField: (field: keyof ReservationForm, value: string) => void;

  selectedUnitData: UnitLike;
  formErrors: Record<string, string>;

  unitType?: UnitType;
  estimatedTotal?: number;
  initialDue?: number;
  formatCurrency: (value: number) => string;
}

function normalizePaymentMethodCode(value?: string | null): PaymentMethod {
  switch (value) {
    case "gcash":
      return "gcash";
    case "bank_transfer":
      return "bank_transfer";
    case "card":
      return "card";
    default:
      return "not_applicable";
  }
}

export default function ReservationPaymentSection({
  shouldShowPaymentSection,
  hasActivePaymentMethods,
  activePaymentMethods,
  reservationForm,
  setReservationForm,
  updateReservationField,
  selectedUnitData,
  formErrors,
  unitType,
  estimatedTotal = 0,
  initialDue = 0,
  formatCurrency,
}: ReservationPaymentSectionProps) {
  const isRental = unitType === "rental_space";
  const isParking = unitType === "parking_slot";
  const isMonthlyRental = isRental && reservationForm.paymentCycle === "monthly";
  const { activePromotions } = usePromotions();

  const accentClasses = isRental
    ? {
        border: "border-blue-200",
        text: "text-blue-600",
        badge: "bg-blue-50 text-blue-700",
      }
    : isParking
      ? {
          border: "border-orange-200",
          text: "text-orange-600",
          badge: "bg-orange-50 text-orange-700",
        }
      : {
          border: "border-purple-200",
          text: "text-purple-600",
          badge: "bg-purple-50 text-purple-700",
        };

  const paymentTitle = isRental
    ? isMonthlyRental
      ? "Deposit + First Month Required"
      : "Full Payment Upfront"
    : "Full Payment Upfront";

  const paymentBadge = isRental
    ? isMonthlyRental
      ? "Monthly Billing"
      : "Flexible Stay"
    : "One-Time Payment";

  const paymentDescription = isRental
    ? isMonthlyRental
      ? "Residential and commercial monthly leases require a security deposit plus the first month’s rent upon approval."
      : reservationForm.paymentCycle === "weekly"
        ? "Weekly flexible stays require full payment before the booking is confirmed."
        : "Daily flexible stays require full payment before the booking is confirmed."
    : isParking
      ? "Parking reservations require full payment before the slot is confirmed."
      : "Function hall reservations require full payment before the booking is confirmed.";

  const dueLabel = isRental
    ? isMonthlyRental
      ? "Estimated Initial Due"
      : "Estimated Full Payment"
    : "Estimated Full Payment";

    const promoCode = (reservationForm.promoCode || "").trim().toUpperCase();

const matchedPromo = promoCode
  ? activePromotions.find((promo) => promo.code === promoCode)
  : null;

const promoBaseAmount =
  isRental && isMonthlyRental
    ? Math.max(0, initialDue) // temporary until advance-rent-only prop is passed
    : Math.max(0, estimatedTotal);

const rawPromoDiscount = matchedPromo
  ? matchedPromo.discountType === "percent"
    ? promoBaseAmount * (matchedPromo.discountValue / 100)
    : matchedPromo.discountValue
  : 0;

const promoDiscount = Math.min(
  promoBaseAmount,
  Math.max(0, rawPromoDiscount)
);

const finalTotal = Math.max(0, promoBaseAmount - promoDiscount);

  return (
    <>
      {shouldShowPaymentSection && (
        <div className="space-y-4">
          <div className={`rounded-2xl border bg-white p-4 shadow-sm ${accentClasses.border}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClasses.text}`}
                >
                  Payment Details
                </p>

                <p className="mt-1 text-sm font-medium text-gray-900">
                  {paymentTitle}
                </p>
              </div>

              <div
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${accentClasses.badge}`}
              >
                {paymentBadge}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="space-y-2 text-sm text-gray-600">
                <p>{paymentDescription}</p>

                <p>
                  Displayed prices are tax-exclusive. A{" "}
                  <span className="font-medium text-gray-900">12% VAT</span>{" "}
                  is applied separately.
                </p>

                {/* {isRental && (
                  <div className="rounded-lg bg-white px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {dueLabel}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatCurrency(initialDue)}
                    </p>
                  </div>
                )} */}

                {isMonthlyRental && (
                  <p className="text-xs text-gray-500">
                    Security deposits are refundable, subject to policy review.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Promo Code
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  Have a promo? Apply it before checkout.
                </p>
              </div>

              <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Optional
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={reservationForm.promoCode || ""}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    promoCode: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="Enter promo code"
                className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />

              <button
                type="button"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Apply
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3">
  <div className="space-y-1 text-sm">
    <div className="flex items-center justify-between">
      <span className="text-gray-500">
  {isMonthlyRental ? "Promo Base" : "Subtotal"}
</span>
      <span className="font-medium text-gray-900">
        {formatCurrency(promoBaseAmount)}
      </span>
    </div>

    <div className="flex items-center justify-between">
      <span className="text-gray-500">Discount</span>
      <span className="font-medium text-emerald-700">
        -{formatCurrency(promoDiscount)}
      </span>
    </div>

    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
      <span className="font-semibold text-gray-900">
        Final Total
      </span>

      <span className="font-bold text-emerald-700">
        {formatCurrency(finalTotal)}
      </span>
    </div>
  </div>
</div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-700">
              Payment Method
            </label>

            {hasActivePaymentMethods ? (
              <select
                value={reservationForm.paymentMethod}
                onChange={(e) =>
                  setReservationForm((prev) => ({
                    ...prev,
                    paymentMethod: normalizePaymentMethodCode(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
              >
                {activePaymentMethods.map((method) => (
                  <option key={method.id} value={method.methodCode}>
                    {method.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                No payment methods are available right now.
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">
              Available methods may include Bank Transfer, GCash, and Credit/Debit Card depending on admin settings.
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm text-gray-700">
          Additional Notes (Optional)
        </label>
        <textarea
          maxLength={500}
          value={reservationForm.notes}
          onChange={(e) => updateReservationField("notes", e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 sm:text-base"
          placeholder="Any special requests or requirements"
        />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="mb-2 text-sm font-semibold text-amber-900">
          Policies / Agreement
        </p>

        <div className="max-h-32 overflow-y-auto rounded-xl border border-amber-100 bg-white p-3 text-sm leading-relaxed text-gray-700">
          {selectedUnitData.policies?.trim() ||
            "No policies provided for this unit."}
        </div>

        {selectedUnitData.contractFilePath ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                const { data } = supabase.storage
                  .from("unit_contracts")
                  .getPublicUrl(selectedUnitData.contractFilePath!);

                if (data?.publicUrl) {
                  window.open(data.publicUrl, "_blank", "noopener,noreferrer");
                }
              }}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 sm:text-sm"
            >
              View Contract PDF
            </button>
          </div>
        ) : null}

        <label className="mt-3 flex items-start gap-3">
          <input
            type="checkbox"
            checked={reservationForm.agreedToPolicies}
            onChange={(e) =>
              setReservationForm((prev) => ({
                ...prev,
                agreedToPolicies: e.target.checked,
              }))
            }
            className="mt-1 size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the policies and terms for this unit.
          </span>
        </label>
      </div>

      {formErrors.agreedToPolicies && (
        <p className="mt-1 text-xs text-red-600">
          {formErrors.agreedToPolicies}
        </p>
      )}
    </>
  );
}