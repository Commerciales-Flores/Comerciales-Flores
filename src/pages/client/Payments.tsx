import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CreditCard, CheckCircle, Clock, Plus, Download, FileDown, X, XCircle, Paperclip, Trash2, Eye } from 'lucide-react'; // Added FileDown and Ximport { formatCurrency } from '../../utils/currency';
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';
import Papa from 'papaparse'; // Import PapaParse for CSV export
import { formatCurrency } from '../../utils/currency';

export default function ClientPayments() {
  const { user } = useAuth();
  const { getReservationsByUserId, getPaymentsByUserId, addPayment } = useData();
  const { sendSystemNotification } = useNotifications();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const [proofFile, setProofFile] = useState<File | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'gcash' as any,
    proofOfPayment: '',
    notes: ''
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const userReservations = getReservationsByUserId(user?.id || '');
  const userPayments = getPaymentsByUserId(user?.id || '');

  const eligibleReservations = userReservations.filter(
    b => b.status === 'completed' && b.paidAmount < b.totalAmount
  );

  // ✅ Updated file change handler to create a preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);

      // Create a temporary URL for the preview
      const previewUrl = URL.createObjectURL(file);
      setProofPreviewUrl(previewUrl);
    }
  };

  const filteredPayments = userPayments.filter(payment => {
  const reservation = userReservations.find(r => r.id === payment.reservationId);
  const query = searchQuery.toLowerCase();

  return (
    payment.id.toLowerCase().includes(query) ||
    payment.method.toLowerCase().includes(query) ||
    payment.notes?.toLowerCase().includes(query) ||
    payment.amount.toString().includes(query) || // ✅ include amount
    (reservation?.propertyName.toLowerCase().includes(query)) ||
    (reservation?.id.toLowerCase().includes(query))
  );
});

  // ✅ Function to clear the file selection
  const handleRemoveImage = () => {
    setProofFile(null);
    setProofPreviewUrl(null);
  };
  // No changes to handleMakePayment or handlePaymentSubmit
  const handleMakePayment = (reservationId: string) => {
    setSelectedReservation(reservationId);
    setShowPaymentModal(true);
    setPaymentForm({ amount: '', method: 'gcash', proofOfPayment: '', notes: '' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewingImage(null);
        setShowPaymentModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePaymentSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedReservation || !user) return;

  const reservation = userReservations.find(b => b.id === selectedReservation);
  if (!reservation) return;

  const amount = parseFloat(paymentForm.amount);
  const balance = reservation.totalAmount - reservation.paidAmount;

  // Safety Check: Prevent invalid amounts
  if (isNaN(amount) || amount <= 0 || amount > balance) {
    alert("Please enter a valid payment amount.");
    return;
  }

  addPayment({
    reservationId: selectedReservation,
    userId: user.id,
    amount,
    method: paymentForm.method,
    status: 'unpaid',
    // Note: In production, upload proofFile to S3/Firebase here
    proofOfPayment: proofPreviewUrl || '', 
    notes: paymentForm.notes
  });
  
  sendSystemNotification(
    user.id,
    'Payment Submitted',
    `Your payment of ${formatCurrency(amount)} for ${reservation.propertyName} is pending verification.`
  );
  setPaymentSuccess(true);
  setTimeout(() => {
    setShowPaymentModal(false);
    setPaymentSuccess(false);
  }, 2000);
};

  useEffect(() => {
    // This function will be called when the component unmounts
    return () => {
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }
    };
  }, [proofPreviewUrl]);

  const paymentStatusColors = {
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800'
  };

  const paymentStatusIcons = {
    paid: CheckCircle,
    unpaid: Clock,
    partial: Clock
  };

  // ✅ START: NEW INVOICE & CSV EXPORT FUNCTIONS
  const handleDownloadInvoice = (payment: any) => {
    const reservation = userReservations.find(b => b.id === payment.reservationId);
    const invoiceContent = `
      ========================================
      PAYMENT INVOICE
      ========================================

      INVOICE ID:   ${payment.id}
      PAYMENT DATE: ${new Date(payment.date).toLocaleDateString()}

      ----------------------------------------
      BILLED TO
      ----------------------------------------
      Name:    ${user?.name}
      Email:   ${user?.email}

      ----------------------------------------
      RESERVATION DETAILS
      ----------------------------------------
      Reservation ID:   ${reservation?.id}
      Property:     ${reservation?.propertyName}
      Property Type: ${getPropertyTypeLabel(reservation?.propertyType || 'rental_space')}
      Reservation Date: ${new Date(reservation?.startDate || '').toLocaleDateString()}

      ----------------------------------------
      PAYMENT DETAILS
      ----------------------------------------
      Description:    Payment for ${reservation?.propertyName}
      Payment Method: ${payment.method.replace('_', ' ')}
      Amount Paid:    ${formatCurrency(payment.amount)}

      ----------------------------------------
      STATUS:         ${payment.status.toUpperCase()}
      ----------------------------------------

      Thank you for your business!
    `;

    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice-${payment.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const csvData = userPayments.map(payment => {
      const reservation = userReservations.find(b => b.id === payment.reservationId);
      return {
        'Payment ID': payment.id,
        'Payment Date': new Date(payment.date).toLocaleDateString(),
        'Reservation ID': payment.reservationId,
        'Property Name': reservation ?.propertyName,
        'Property Type': reservation ? getPropertyTypeLabel(reservation.propertyType) : 'N/A',
        'Amount': payment.amount,
        'Payment Method': payment.method,
        'Payment Status': payment.status,
        'Notes': payment.notes
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payment_history_${user?.name?.replace(' ', '_') || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // ✅ END: NEW INVOICE & CSV EXPORT FUNCTIONS

  return (
    <div className="bg-gray-50 min-h-screen">
  <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <header>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          Payments
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          Manage your payment records and view payment history
        </p>
      </header>
      </div>

      {/* Pending Payments Section is unchanged */}
      {eligibleReservations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4">Balance due</h2>
          <div className="space-y-3">
            {eligibleReservations.map((reservation) => {
              const balance = reservation.totalAmount - reservation.paidAmount;
              return (
                <div key={reservation.id} className="flex justify-between items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-gray-900">{reservation.propertyName}</h3>
                    <p className="text-sm text-gray-600">Reservation ID: {reservation.id}</p>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Total: {formatCurrency(reservation.totalAmount)}</span>
                      <span className="mx-2">•</span>
                      <span className="text-green-600">Paid: {formatCurrency(reservation.paidAmount)}</span>
                      <span className="mx-2">•</span>
                      <span className="text-red-600">Balance: {formatCurrency(balance)}</span>
                    </div>
                  </div>
                  <button
                  onClick={() => handleMakePayment(reservation.id)}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus className="size-4" />
                  Make Payment
                </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ START: REFACTORED PAYMENT HISTORY SECTION */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Header with Export Button */}
          <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
  {/* History Heading with Icon */}
  <h2 className="text-lg font-semibold flex items-center gap-2">
    <Clock className="size-5 text-gray-600" />
    History
  </h2>

  {/* Container for search + export, responsive */}
  <div className="flex w-full sm:w-auto gap-2 mt-3 sm:mt-0 sm:ml-auto">
    {/* Search bar */}
    <input
      type="text"
      placeholder="Search payments..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="flex-1 sm:flex-[2] md:flex-[3] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm outline-none"
    />

    {/* Export CSV Button */}
    {userPayments.length > 0 && (
      <button
        onClick={handleExportCSV}
        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
      >
        {/* Mobile: icon only */}
        <FileDown className="size-4 sm:hidden" />

        {/* Desktop: icon + text */}
        <div className="hidden sm:flex items-center gap-2">
          <FileDown className="size-4" />
          Export as CSV
        </div>
      </button>
    )}
  </div>
</div>

        {userPayments.length > 0 ? (
  filteredPayments.length > 0 ? (
    <div className="divide-y divide-gray-200">
      {[...filteredPayments]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((payment) => {
          const reservation = userReservations.find(r => r.id === payment.reservationId);
          const StatusIcon = paymentStatusIcons[payment.status];

          return (
            <div key={payment.id} className="p-4 sm:p-6 hover:bg-gray-50/50">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold rounded-md ${paymentStatusColors[payment.status]}`}>
                      <StatusIcon className="size-3" />
                      {payment.status.toUpperCase()}
                    </span>

                    {/* Mobile Invoice button */}
                    <button 
                      onClick={() => handleDownloadInvoice(payment)}
                      className="sm:hidden flex items-center gap-1 text-blue-600 text-xs font-semibold"
                    >
                      <Download className="size-3" />
                      Invoice
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(payment.amount)}</h3>
                  <p className="text-xs text-gray-500 font-medium">Paid on {new Date(payment.date).toLocaleDateString()}</p>
                </div>

                {/* Desktop Invoice button */}
                <button
                  onClick={() => handleDownloadInvoice(payment)}
                  className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <Download className="size-4" />
                  Invoice
                </button>
              </div>

              {/* Card Body */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold mb-2">{reservation?.propertyName}</h4>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {[
                    { label: 'Reservation ID', value: reservation?.id },
                    { label: 'Method', value: payment.method.replace('_', ' '), className: 'capitalize' },
                    { label: 'Cycle', value: reservation?.paymentCycle, hide: !reservation?.paymentCycle },
                    { label: 'Total Bill', value: formatCurrency(reservation?.totalAmount || 0) },
                    { label: 'Total Paid', value: formatCurrency(reservation?.paidAmount || 0), className: 'text-green-600 font-medium' },
                    { label: 'Balance', value: formatCurrency((reservation?.totalAmount || 0) - (reservation?.paidAmount || 0)), className: 'text-red-600 font-medium' },
                  ].map((item, idx) => !item.hide && (
                    <div key={idx} className="flex flex-col border-l-2 border-gray-100 pl-3">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{item.label}</span>
                      <span className={`text-gray-900 ${item.className || ''}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {payment.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm"><strong>Notes:</strong> {payment.notes}</p>
                  </div>
                )}

                {payment.proofOfPayment && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => setViewingImage(payment.proofOfPayment || null)}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      <Eye className="size-4 text-blue-600 sm:hidden" /> {/* Mobile: eye icon */}
                      <span className="hidden sm:inline">View Proof of Payment</span> {/* Desktop: text */}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  ) : (
    <div className="p-12 text-center">
      <CreditCard className="size-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-gray-600 mb-2">No payments matched your search</h3>
      <p className="text-sm text-gray-500">Try a different keyword or amount</p>
    </div>
  )
) : null} {/* Render nothing if userPayments.length === 0 */}
        
      </div>
      {/* ✅ END: REFACTORED PAYMENT HISTORY SECTION */}
      
      {/* Payment Summary section is unchanged */}
      {/* ✅ START: NEW, SMALLER SUMMARY CARDS */}
{userPayments.length > 0 && (
  <section className="w-full">
    <h3 className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
      Payment Overview
    </h3>

    

    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
      
      {/* Total Paid Card - Prominent layout */}
      <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-green-50 to-white p-5 rounded-2xl border border-green-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
            <CheckCircle className="size-5" />
          </div>
          <span className="text-[10px] font-bold text-green-700 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">Verified</span>
        </div>
        <div className="mt-5">
          <p className="text-xs font-medium text-green-700/70">Total Paid</p>
          <p className="text-2xl font-bold text-gray-900 leading-none mt-1">
            {formatCurrency(userPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0))}
          </p>
        </div>
      </div>

      {/* Pending Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all active:scale-95">
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600 w-fit">
          <Clock className="size-5" />
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500">Pending</p>
          <p className="text-lg font-bold text-amber-600 mt-1">
            {formatCurrency(userPayments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0))}
          </p>
        </div>
      </div>

      {/* Transactions Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all active:scale-95">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600 w-fit">
          <CreditCard className="size-5" />
        </div>
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500">Transactions</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {userPayments.length}
          </p>
        </div>
      </div>

    </div>
  </section>
)}
{/* ✅ END: NEW, SMALLER SUMMARY CARDS */}


      {/* Make Payment Modal is unchanged */}
      {showPaymentModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">          
                    <div className="bg-white rounded-lg max-w-md w-full flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 p-6 border-b flex justify-between items-center">              
              <h2 className="text-lg font-semibold">Make Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="size-6"/></button>
            </div>
            {paymentSuccess ? (
              <div className="p-10 text-center">
                  <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Payment Submitted!</h3>
                  <p className="text-gray-600">Your payment is pending admin verification. You can now close this window.</p>
              </div>
            ) : (
                <form id="payment-form" onSubmit={handlePaymentSubmit} className="p-6 space-y-4 overflow-y-auto">                {(() => {
                  const reservation = userReservations.find(r => r.id === selectedReservation);
                  if (!reservation) return null;
                  const balance = reservation.totalAmount - reservation.paidAmount;
                  return (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">{reservation.propertyName}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Total Amount:</span><span className="text-gray-900">{formatCurrency(reservation.totalAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Paid Amount:</span><span className="text-green-600">{formatCurrency(reservation.paidAmount)}</span></div>
                        <div className="flex justify-between border-t border-gray-200 pt-1 mt-1"><span className="font-semibold text-gray-900">Outstanding Balance:</span><span className="font-semibold text-red-600">{formatCurrency(balance)}</span></div>
                      </div>
                    </div>
                  );
                })()}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount (₱)</label>
                  <input type="number" required min="0.01" step="0.01" max={(() => { const reservation = userReservations.find(r => r.id === selectedReservation); return reservation ? reservation.totalAmount - reservation.paidAmount : 0; })()} value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="gcash">GCash</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="paymaya">PayMaya</option><option value="bank_transfer">Bank Transfer</option><option value="credit_card">Credit/Debit Card</option>
                  </select>
                </div>

                 {/* ✅ START: NEW FILE UPLOAD WITH PREVIEW */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Proof of Payment</label>

                  {/* If no image is selected, show the upload button */}
                  {!proofPreviewUrl && (
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer w-full flex justify-center items-center gap-2 px-4 py-4 border-2 border-gray-300 border-dashed rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <Paperclip className="size-4" />
                      <span>Choose File to Upload</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg" />
                    </label>
                  )}

                  {/* If an image IS selected, show the preview and a remove button */}
                  {proofPreviewUrl && (
                    <div className="relative group w-36 h-36">
                      <img src={proofPreviewUrl} alt="Proof preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-600 text-white rounded-full hover:bg-red-700"
                          title="Remove Image"
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Please upload a screenshot or photo of your receipt (PNG, JPG).</p>
                </div>
                {/* ✅ END: NEW FILE UPLOAD WITH PREVIEW */}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any additional information" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" form="payment-form" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Submit Payment</button>                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* ✅ START: NEW IMAGE VIEWER MODAL */}
      {viewingImage && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setViewingImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Proof of payment viewer"
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="size-8" />
            </button>

            <div className="relative max-w-full sm:max-w-5xl max-h-screen p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                  src={viewingImage}
                  alt="Proof of Payment Receipt"
                  className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl border border-white/10"
                />
              <p className="text-white/60 text-center mt-4 text-sm font-light">
                Click anywhere outside to close
              </p>
            </div>
          </div>
        )}
      {/* ✅ END: NEW IMAGE VIEWER MODAL */}
      
    </div>
    </div>
  );
}
