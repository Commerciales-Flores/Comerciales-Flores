import { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { formatCurrency } from '../../../utils/currency';
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
  const { reservations, addPayment } = useData();
  const reservation = reservations.find((r) => r.id === reservationId);
  const balance = reservation ? reservation.totalAmount - reservation.paidAmount : 0;

  const [formState, setFormState] = useState({
    amount: '',
    method: 'cash' as any,
    notes: '',
    bank: '',
    referenceNumber: '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  const showReferenceFields =
    formState.method === 'bank_transfer' ||
    formState.method === 'gcash' ||
    formState.method === 'paymaya' ||
    formState.method === 'cheque';

  const enteredAmount = Number(formState.amount || 0);
  const isInvalidAmount =
    !formState.amount || Number.isNaN(enteredAmount) || enteredAmount <= 0 || enteredAmount > balance;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      const previewUrl = URL.createObjectURL(file);
      setProofPreviewUrl(previewUrl);
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation || isInvalidAmount) return;

    const simulatedProofUrl = proofFile
      ? `https://your-storage-service.com/receipts/admin-${Date.now()}-${proofFile.name}`
      : '';

    addPayment({
      reservationId: reservation.id,
      userId,
      amount: parseFloat(formState.amount),
      method: formState.method,
      status: 'paid',
      notes: formState.notes,
      proofOfPayment: simulatedProofUrl,
    });

    onComplete();
  };

  if (!reservation) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Error: Reservation information could not be found.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Reservation Summary */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Payment Target
        </p>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {reservation.unitName}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Reservation ID: {reservation.publicId ?? reservation.id}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Outstanding Balance
            </p>
            <p className="text-base font-bold text-rose-600 mt-1">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="space-y-5">
        <div>
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 ml-1">
            Payment Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide ml-1">
                Payment Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
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
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                />
              </div>
              <p
                className={`text-[11px] ml-1 ${
                  isInvalidAmount && formState.amount
                    ? 'text-rose-500'
                    : 'text-slate-400'
                }`}
              >
                Maximum allowed: {formatCurrency(balance)}
              </p>
            </div>

            {/* Method */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide ml-1">
                Payment Method
              </label>
              <select
                value={formState.method}
                onChange={(e) =>
                  setFormState({ ...formState, method: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="gcash">GCash</option>
                <option value="paymaya">PayMaya</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            {/* Bank / Provider */}
            {showReferenceFields && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide ml-1">
                  Bank / Provider
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={formState.bank}
                    onChange={(e) =>
                      setFormState({ ...formState, bank: e.target.value })
                    }
                    placeholder="e.g. BDO, GCash, Maya"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>
            )}

            {/* Reference Number */}
            {showReferenceFields && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide ml-1">
                  Reference Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={formState.referenceNumber}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        referenceNumber: e.target.value,
                      })
                    }
                    placeholder="Optional reference or transaction no."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Proof Upload */}
        <div>
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 ml-1">
            Proof of Payment
          </h3>

          {!proofPreviewUrl ? (
            <label
              htmlFor="admin-file-upload"
              className="w-full min-h-28 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-slate-500"
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
              />
            </label>
          ) : (
            <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                <img
                  src={proofPreviewUrl}
                  alt="Proof preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {proofFile?.name ?? 'Receipt attached'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Review the uploaded proof before submitting this verified payment.
                </p>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all text-sm font-medium"
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3 ml-1">
            Notes
          </h3>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide ml-1">
              Internal Remarks
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <textarea
                value={formState.notes}
                onChange={(e) =>
                  setFormState({ ...formState, notes: e.target.value })
                }
                rows={4}
                placeholder="e.g. Manual payment recorded by admin"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-500 focus:bg-white transition-all outline-none text-sm font-medium resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isInvalidAmount}
          className={`w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            isInvalidAmount
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-xl shadow-blue-600/20'
          }`}
        >
          <CheckCircle className="size-5" />
          Add Verified Payment
        </button>
      </div>
    </form>
  );
}