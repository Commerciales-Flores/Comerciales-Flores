import { useState, useEffect, useMemo } from 'react';
import { useAdminData } from '../../contexts/AdminDataContext';
import { usePayments } from '../../contexts/PaymentsContext';
import type { PaymentMethod } from '../../data/types';
import { formatCurrency } from '../../utils/currency';
import AppNotice from '../common/AppNotice';
import {
  Paperclip,
  Trash2,
  CheckCircle,
  CreditCard,
  FileText,
  Landmark,
} from 'lucide-react';

interface AdminPaymentFormProps {
  userId: string;
  reservationId: string;
  onComplete: () => void;
}


export default function AdminPaymentForm({
  userId,
  reservationId,
  onComplete,
}: AdminPaymentFormProps) {
  const { reservations } = useAdminData();
  const { addPayment } = usePayments();

  const [notice, setNotice] = useState<{
    message: string;
    variant?: 'error' | 'warning' | 'success' | 'info';
  } | null>(null);

  const reservation = reservations.find((r) => r.id === reservationId);

  const balance = reservation
    ? Math.max(
        Number(reservation.totalAmount || 0) - Number(reservation.paidAmount || 0),
        0
      )
    : 0;

  const minimumPercent = Number(
    reservation?.minimumPaymentPercentSnapshot ?? 0
  );

  const paidAmount = Number(reservation?.paidAmount || 0);
  const totalAmount = Number(reservation?.totalAmount || 0);
  const duration = Number(reservation?.duration || 0);

  const isFirstPayment = paidAmount <= 0;

  const minimumFirstPayment = minimumPercent
    ? (totalAmount * minimumPercent) / 100
    : 0;

  const MIN_SUBSEQUENT_PAYMENT = 500;

  const rentalMonthlyAmount =
    reservation?.unitType === 'rental_space' && duration > 0
      ? totalAmount / duration
      : 0;

  const rentalRequiredPayment =
    reservation?.unitType === 'rental_space'
      ? reservation.paymentCycle === 'quarterly'
        ? Math.min(rentalMonthlyAmount * 3, balance)
        : reservation.paymentCycle === 'full'
          ? balance
          : Math.min(rentalMonthlyAmount, balance)
      : 0;

  const minimumSubsequentPayment =
    reservation?.unitType === 'rental_space'
      ? rentalRequiredPayment
      : Math.min(MIN_SUBSEQUENT_PAYMENT, balance);

  const effectiveMinimum = isFirstPayment
    ? minimumFirstPayment
    : minimumSubsequentPayment;

  const [formState, setFormState] = useState<{
    amount: string;
    method: PaymentMethod;
    notes: string;
    bank: string;
    referenceNumber: string;
  }>({
    amount: '',
    method: 'cash',
    notes: '',
    bank: '',
    referenceNumber: '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showReferenceFields =
    formState.method === 'bank_transfer' ||
    formState.method === 'gcash' ||
    formState.method === 'paymaya' ||
    formState.method === 'cheque';

  const enteredAmount = Number(formState.amount || 0);

  const isInvalidAmount =
    !formState.amount ||
    Number.isNaN(enteredAmount) ||
    enteredAmount <= 0 ||
    enteredAmount > balance ||
    enteredAmount < effectiveMinimum;

  const paymentCycleLabel = useMemo(() => {
    if (!reservation || reservation.unitType !== 'rental_space') return null;

    if (reservation.paymentCycle === 'quarterly') return 'Quarterly';
    if (reservation.paymentCycle === 'full') return 'Full';
    return 'Monthly';
  }, [reservation]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];

    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
    }

    setProofFile(file);
    setProofPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(null);
    setProofPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    };
  }, [proofPreviewUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reservation || isInvalidAmount || balance <= 0 || isSubmitting) return;

    if (
      reservation.unitType === 'rental_space' &&
      enteredAmount < effectiveMinimum
    ) {
      setNotice({
        message: `Minimum required payment is ${formatCurrency(
          effectiveMinimum
        )} for this ${reservation.paymentCycle ?? 'monthly'} rental billing cycle.`,
        variant: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const simulatedProofUrl = proofFile
        ? `https://your-storage-service.com/receipts/admin-${Date.now()}-${proofFile.name}`
        : '';

      const compiledNotes = [
        formState.notes.trim(),
        showReferenceFields && formState.bank.trim()
          ? `Bank/Provider: ${formState.bank.trim()}`
          : '',
        showReferenceFields && formState.referenceNumber.trim()
          ? `Reference No: ${formState.referenceNumber.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join(' | ');

      await addPayment({
        reservationId: reservation.id,
        userId,
        amount: parseFloat(formState.amount),
        method: formState.method,
        status: 'paid',
        notes: compiledNotes,
        proofOfPayment: simulatedProofUrl,
      });

      onComplete();
    } catch (error) {
      console.error('Failed to add payment:', error);
      setNotice({
        message: 'Failed to add verified payment. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!reservation) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Error: Reservation information could not be found.
      </div>
    );
  }

  if (balance <= 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        This reservation is already fully paid.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {notice && (
        <AppNotice
          message={notice.message}
          variant={notice.variant}
          onClose={() => setNotice(null)}
          autoHideMs={4000}
        />
      )}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Payment Target
        </p>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {reservation.unitName}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500">
              Reservation ID: {reservation.publicId ?? reservation.id}
            </p>

            {reservation.unitType === 'rental_space' && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-500">
                  Payment Cycle:{' '}
                  <span className="font-medium text-slate-700">
                    {paymentCycleLabel}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Monthly Rate:{' '}
                  <span className="font-medium text-slate-700">
                    {formatCurrency(rentalMonthlyAmount)}
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Outstanding Balance
            </p>
            <p className="mt-1 text-base font-bold text-rose-600">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h3 className="mb-3 ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Payment Information
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Payment Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  ₱
                </span>
                <input
                  type="number"
                  required
                  value={formState.amount}
                  onChange={(e) =>
                    setFormState({ ...formState, amount: e.target.value })
                  }
                  max={balance}
                  min={effectiveMinimum}
                  step="0.01"
                  placeholder="0.00"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <p
                className={`ml-1 text-[11px] ${
                  isInvalidAmount && formState.amount
                    ? 'text-rose-500'
                    : 'text-slate-400'
                }`}
              >
                {isFirstPayment && minimumPercent > 0 && (
                  <>
                    Minimum first payment: {formatCurrency(minimumFirstPayment)} (
                    {minimumPercent}%){' '}
                    •{' '}
                  </>
                )}

                {!isFirstPayment && reservation.unitType !== 'rental_space' && (
                  <>
                    Minimum payment: {formatCurrency(minimumSubsequentPayment)} •{' '}
                  </>
                )}

                {!isFirstPayment && reservation.unitType === 'rental_space' && (
                  <>
                    {reservation.paymentCycle === 'quarterly'
                      ? `Quarterly required: ${formatCurrency(
                          minimumSubsequentPayment
                        )}`
                      : reservation.paymentCycle === 'full'
                        ? `Full payment required: ${formatCurrency(
                            minimumSubsequentPayment
                          )}`
                        : `Monthly required: ${formatCurrency(
                            minimumSubsequentPayment
                          )}`}
                    {' • '}
                  </>
                )}

                Maximum: {formatCurrency(balance)}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Payment Method
              </label>
              <select
                value={formState.method}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    method: e.target.value as PaymentMethod,
                  })
                }
                disabled={isSubmitting}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="gcash">GCash</option>
                <option value="paymaya">PayMaya</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {showReferenceFields && (
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Bank / Provider
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={100}
                    value={formState.bank}
                    onChange={(e) =>
                      setFormState({ ...formState, bank: e.target.value })
                    }
                    placeholder="e.g. BDO, GCash, Maya"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            )}

            {showReferenceFields && (
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Reference Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={100}
                    value={formState.referenceNumber}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        referenceNumber: e.target.value,
                      })
                    }
                    placeholder="Optional reference or transaction no."
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Proof of Payment
          </h3>

          {!proofPreviewUrl ? (
            <label
              htmlFor="admin-file-upload"
              className="flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50"
            >
              <Paperclip className="size-5" />
              <span className="text-sm font-semibold">Attach Receipt</span>
              <span className="text-[11px] text-slate-400">
                Optional image proof for recorded payment
              </span>
              <input
                id="admin-file-upload"
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept="image/*"
                disabled={isSubmitting}
              />
            </label>
          ) : (
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img
                  src={proofPreviewUrl}
                  alt="Proof preview"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {proofFile?.name ?? 'Receipt attached'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Review the uploaded proof before submitting this verified payment.
                </p>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isSubmitting}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Notes
          </h3>

          <div className="space-y-1.5">
            <label className="ml-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Internal Remarks
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <textarea
                maxLength={500}
                value={formState.notes}
                onChange={(e) =>
                  setFormState({ ...formState, notes: e.target.value })
                }
                rows={4}
                placeholder="e.g. Manual payment recorded by admin"
                disabled={isSubmitting}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isInvalidAmount || isSubmitting || balance <= 0}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold uppercase tracking-widest transition-all ${
            isInvalidAmount || isSubmitting || balance <= 0
              ? 'cursor-not-allowed bg-slate-200 text-slate-400'
              : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98]'
          }`}
        >
          <CheckCircle className="size-5" />
          {isSubmitting ? 'Processing...' : 'Add Verified Payment'}
        </button>
      </div>
    </form>
  );
}