// src/components/admin/AdminPaymentForm.tsx

import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/currency';
import { Paperclip, Trash2, CheckCircle } from 'lucide-react';

interface AdminPaymentFormProps {
  userId: string;
  bookingId: string;
  onComplete: () => void;
}

export default function AdminPaymentForm({ userId, bookingId, onComplete }: AdminPaymentFormProps) {
  const { bookings, addPayment, uploadPaymentProof } = useData();
  const booking = bookings.find(b => b.id === bookingId);
  const balance = booking ? booking.totalAmount - booking.paidAmount : 0;

  // --- State management ---
  const [formState, setFormState] = useState({
    amount: '',
    method: 'cash' as any,
    notes: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Handlers ---
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setIsSubmitting(true);

    try {
      let proofUrl = '';

      // 1. Actually upload the file to Supabase if one was attached
      if (proofFile) {
        const uploadedUrl = await uploadPaymentProof(proofFile);
        if (uploadedUrl) {
          proofUrl = uploadedUrl;
        } else {
          alert("Failed to upload receipt. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Save the payment record
      await addPayment({
        bookingId,
        userId,
        amount: parseFloat(formState.amount),
        method: formState.method,
        status: 'paid', // Admin payments are considered pre-verified
        notes: formState.notes,
        proofOfPayment: proofUrl,
      });

      onComplete(); // Signal completion to the parent modal and close it
    } catch (error) {
      console.error("Failed to submit payment:", error);
      alert("An error occurred while saving the payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!booking) {
    return <div className="text-red-500 p-4">Error: Booking information could not be found.</div>;
  }

  // --- Form JSX ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="font-semibold text-gray-800">{booking.propertyName}</p>
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block font-medium text-gray-700 mb-1">Payment Method</label>
        <select
          value={formState.method}
          onChange={(e) => setFormState({ ...formState, method: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="gcash">GCash</option>
          <option value="paymaya">PayMaya</option>
          <option value="cheque">Cheque</option>
          <option value="credit_card">Credit Card</option>
        </select>
      </div>

      {/* Proof of Payment Upload */}
      <div>
        <label className="block font-medium text-gray-700 mb-1">Proof of Payment (Optional)</label>
        {!proofPreviewUrl ? (
          <label htmlFor="admin-file-upload" className="relative cursor-pointer w-full flex justify-center items-center gap-2 px-4 py-4 border-2 border-gray-300 border-dashed rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50">
            <Paperclip className="size-4" />
            <span className="font-medium">Attach Receipt</span>
            <input id="admin-file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg" />
          </label>
        ) : (
          <div className="relative group w-32 h-32">
            <img src={proofPreviewUrl} alt="Proof preview" className="w-full h-full object-cover rounded-lg shadow-sm border border-gray-200" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <button type="button" onClick={handleRemoveImage} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-full hover:bg-red-700 shadow-sm transition-colors">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Manual payment recorded by admin"
        />
      </div>

      <div className="flex justify-end pt-4">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-6 py-2 text-white font-semibold rounded-lg transition-colors shadow-sm ${
            isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            'Saving...'
          ) : (
            <>
              <CheckCircle className="size-5" />
              Add Verified Payment
            </>
          )}
        </button>
      </div>
    </form>
  );
}