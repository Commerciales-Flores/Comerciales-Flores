// src/components/admin/AdminPaymentForm.tsx

import { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { formatCurrency } from '../../../utils/currency';
import { Paperclip, Trash2, CheckCircle } from 'lucide-react';

interface AdminPaymentFormProps {
  userId: string;
  reservationId: string;
  onComplete: () => void;
}

export default function AdminPaymentForm({ userId, reservationId, onComplete }: AdminPaymentFormProps) {
  const { reservations, addPayment } = useData();
  const reservation = reservations.find(r => r.id === reservationId);
  const balance = reservation ? reservation.totalAmount - reservation.paidAmount : 0;

  // --- State management adapted from ClientPayments ---
  const [formState, setFormState] = useState({
    amount: '',
    method: 'cash' as any,
    notes: '',
    bank: '',
    referenceNumber: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  // --- Handlers adapted from ClientPayments ---
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
    if (!reservation) return;

    // Simulate file upload for admin-added proof
    const simulatedProofUrl = proofFile ? `https://your-storage-service.com/receipts/admin-${Date.now()}-${proofFile.name}` : '';

    addPayment({
      reservationId: reservation.id,
      userId,
      amount: parseFloat(formState.amount),
      method: formState.method,
      status: 'paid', // Admin payments are considered pre-verified
      notes: formState.notes,
      proofOfPayment: simulatedProofUrl,
    });

    onComplete(); // Signal completion to the parent modal
  };

  if (!reservation) {
    return <div className="text-red-500 p-4">Error: Reservation information could not be found.</div>;
  }

  // --- Form JSX adapted directly from ClientPayments ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="font-semibold text-gray-800">{reservation.propertyName}</p>
        <div className="flex justify-between mt-1">
          <span className="text-gray-600">Outstanding Balance:</span>
          <span className="font-semibold text-red-600">{formatCurrency(balance)}</span>
        </div>
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">Payment Amount (₱)</label>
        <input
          type="number"
          required
          value={formState.amount}
          onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
          max={balance}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">Payment Method</label>
        <select
          value={formState.method}
          onChange={(e) => setFormState({ ...formState, method: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="gcash">GCash</option>
          <option value="paymaya">PayMaya</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      {/* Optional file upload, same as client form */}
      <div>
        <label className="block font-medium text-gray-700 mb-1">Proof of Payment (Optional)</label>
        {!proofPreviewUrl ? (
          <label htmlFor="admin-file-upload" className="relative cursor-pointer w-full flex justify-center items-center gap-2 px-4 py-4 border-2 border-gray-300 border-dashed rounded-lg text-gray-600 hover:border-blue-500">
            <Paperclip className="size-4" />
            <span>Attach Receipt</span>
            <input id="admin-file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
          </label>
        ) : (
          <div className="relative group w-32 h-32">
            <img src={proofPreviewUrl} alt="Proof preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <button type="button" onClick={handleRemoveImage} className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-full">
                <Trash2 className="size-3" /> Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          value={formState.notes}
          onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="e.g., Manual payment recorded by admin"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
          <CheckCircle className="size-5" />
          Add Verified Payment
        </button>
      </div>
    </form>
  );
}
