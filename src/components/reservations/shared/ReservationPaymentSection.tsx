import type { Dispatch, SetStateAction } from "react";
import supabase from "../../../supabaseClient";
import type { UnitType } from "../../../data/types";
import type { ReservationForm, PaymentMethod } from "./reservation.types";
import type { PaymentMethodCode } from "../../../contexts/PaymentMethodsContext";

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

function normalizePaymentMethodCode(
  value?: string | null
): PaymentMethod {
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

  const paymentRuleText = isRental
    ? "Initial payment includes the required security deposit and first month, subject to admin approval."
    : "Select your preferred payment method for this booking.";

  const refundRuleText = isRental
    ? "Security deposits are refundable, subject to policy review."
    : null;

  return (
    <>
      {shouldShowPaymentSection && (
        <div className="space-y-4">
  <div
  className={`rounded-2xl border bg-white p-4 shadow-sm ${
    isRental
      ? "border-blue-200"
      : isParking
        ? "border-orange-200"
        : "border-purple-200"
  }`}
>
  <div className="flex items-start justify-between gap-3">
    <div>
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          isRental
            ? "text-blue-600"
            : isParking
              ? "text-orange-600"
              : "text-purple-600"
        }`}
      >
        Payment Details
      </p>

      <p className="mt-1 text-sm font-medium text-gray-900">
        {isRental
          ? "Deposit + First Month Required"
          : "Full Payment Upfront"}
      </p>
    </div>

    <div
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        isRental
          ? "bg-blue-50 text-blue-700"
          : isParking
            ? "bg-orange-50 text-orange-700"
            : "bg-purple-50 text-purple-700"
      }`}
    >
      {isRental ? "Monthly Billing" : "One-Time Payment"}
    </div>
  </div>

  <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
    <div className="space-y-2 text-sm text-gray-600">
      <p>
        {isRental
          ? "Residential and commercial units require a security deposit plus the first month’s rent upon approval."
          : isParking
            ? "Parking reservations require full payment before the slot is confirmed."
            : "Function hall reservations require full payment before the booking is confirmed."}
      </p>

      <p>
        Displayed prices are tax-exclusive. A{" "}
        <span className="font-medium text-gray-900">12% VAT</span> is applied separately.
      </p>

      {isRental && (
        <div className="rounded-lg bg-white px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Estimated Initial Due
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {formatCurrency(initialDue)}
          </p>
        </div>
      )}

      {refundRuleText && (
        <p className="text-xs text-gray-500">
          {refundRuleText}
        </p>
      )}
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