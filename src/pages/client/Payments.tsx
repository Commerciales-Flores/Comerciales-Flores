import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CreditCard, CheckCircle, Clock, Plus, Download, FileDown, X, XCircle, Paperclip, Trash2 } from 'lucide-react'; 
import { getPropertyTypeLabel } from '../../utils/propertyHelpers';
import Papa from 'papaparse'; 
import { formatCurrency } from '../../utils/currency';

export default function ClientPayments() {
  const { user } = useAuth();
  const { getBookingsByUserId, getPaymentsByUserId, addPayment, uploadPaymentProof } = useData();
  const { sendSystemNotification } = useNotifications();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'gcash' as any,
    proofOfPayment: '',
    notes: ''
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const userBookings = getBookingsByUserId(user?.id || '');
  const userPayments = getPaymentsByUserId(user?.id || '');

  // ✅ Elegantly simple: The DataContext now keeps `paidAmount` perfectly in sync!
  const eligibleBookings = userBookings.filter(
    b => (b.status === 'approved' || b.status === 'confirmed') && b.paidAmount < b.totalAmount
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      const previewUrl = URL.createObjectURL(file);
      setProofPreviewUrl(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setProofFile(null);
    setProofPreviewUrl(null);
  };

  const handleMakePayment = (bookingId: string) => {
    setSelectedBooking(bookingId);
    setShowPaymentModal(true);
    setPaymentForm({ amount: '', method: 'gcash', proofOfPayment: '', notes: '' });
    handleRemoveImage();
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !user) return;
    const booking = userBookings.find(b => b.id === selectedBooking);
    if (!booking) return;

    setIsSubmitting(true); 

    try {
      const amount = parseFloat(paymentForm.amount);
      let finalProofUrl = paymentForm.proofOfPayment; 
      
      // ✅ ACTUAL DB UPLOAD LOGIC
      if (proofFile) {
        const uploadedUrl = await uploadPaymentProof(proofFile);
        if (uploadedUrl) {
          finalProofUrl = uploadedUrl;
        } else {
          alert("Failed to upload receipt. Please try again.");
          setIsSubmitting(false);
          return; 
        }
      }

      await addPayment({
        bookingId: selectedBooking,
        userId: user.id,
        amount,
        method: paymentForm.method,
        // ✅ Client submissions start as 'unpaid' (pending verification)
        status: 'unpaid', 
        proofOfPayment: finalProofUrl,
        notes: paymentForm.notes
      });

      sendSystemNotification(
        user.id,
        'Payment Submitted',
        `Your payment of ${formatCurrency(amount)} for ${booking.propertyName} has been submitted and is pending verification.`
      );
      
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        handleRemoveImage(); 
      }, 2000);

    } catch (error) {
      console.error("Payment submission failed:", error);
      alert("An error occurred while submitting your payment. Please try again.");
    } finally {
      setIsSubmitting(false); 
    }
  };

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }
    };
  }, [proofPreviewUrl]);

  const paymentStatusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800'
  };

  const paymentStatusIcons: Record<string, any> = {
    paid: CheckCircle,
    unpaid: Clock,
    partial: Clock
  };

  const handleDownloadInvoice = (payment: any) => {
    const booking = userBookings.find(b => b.id === payment.bookingId);
    const invoiceContent = `
      ========================================
      PAYMENT INVOICE
      ========================================

      INVOICE ID:   ${payment.id}
      PAYMENT DATE: ${new Date(payment.date).toLocaleDateString()}

      ----------------------------------------
      BILLED TO
      ----------------------------------------
      Name:    ${user?.firstName} ${user?.lastName}
      Email:   ${user?.email}

      ----------------------------------------
      RESERVATION DETAILS
      ----------------------------------------
      Booking ID:   ${booking?.id}
      Property:     ${booking?.propertyName}
      Property Type: ${getPropertyTypeLabel(booking?.unitType || 'rental_space')}
      Booking Date: ${new Date(booking?.startDate || '').toLocaleDateString()}

      ----------------------------------------
      PAYMENT DETAILS
      ----------------------------------------
      Description:    Payment for ${booking?.propertyName}
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
      const booking = userBookings.find(b => b.id === payment.bookingId);
      return {
        'Payment ID': payment.id,
        'Payment Date': new Date(payment.date).toLocaleDateString(),
        'Booking ID': payment.bookingId,
        'Property Name': booking?.propertyName,
        'Property Type': booking ? getPropertyTypeLabel(booking.unitType) : 'N/A',
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
    link.download = `payment_history_${user?.firstName || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Payments</h1>
          <p className="text-gray-600">Manage your payment records</p>
        </div>
      </div>

      {eligibleBookings.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Balance due</h2>
          <div className="space-y-3">
            {eligibleBookings.map((booking) => {
              const balance = booking.totalAmount - booking.paidAmount;
              
              return (
                <div key={booking.id} className="flex justify-between items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-medium">{booking.propertyName}</h3>
                    <p className="text-sm text-gray-600">Booking ID: {booking.id}</p>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">Total: {formatCurrency(booking.totalAmount)}</span>
                      <span className="mx-2">•</span>
                      <span className="text-green-600">Verified Paid: {formatCurrency(booking.paidAmount)}</span>
                      <span className="mx-2">•</span>
                      <span className="text-red-600 font-medium">Balance: {formatCurrency(balance)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleMakePayment(booking.id)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="size-4" />
                    Make Payment
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Payment History</h2>
          {userPayments.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <FileDown className="size-4" />
              Export as .csv
            </button>
          )}
        </div>

        {userPayments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="size-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-600 font-medium mb-2">No payments yet</h3>
            <p className="text-sm text-gray-500">Your payment records will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {[...userPayments]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((payment) => {
                const booking = userBookings.find(b => b.id === payment.bookingId);
                const StatusIcon = paymentStatusIcons[payment.status] || Clock;

                return (
                  <div key={payment.id} className="p-6 hover:bg-gray-50/50">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full ${paymentStatusColors[payment.status] || 'bg-gray-100 text-gray-800'}`}>
                            <StatusIcon className="size-3" />
                            {payment.status === 'unpaid' ? 'PENDING VERIFICATION' : payment.status.toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-gray-500 tracking-wider">
                            {getPropertyTypeLabel(booking?.unitType || 'rental_space').toUpperCase()}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">{formatCurrency(payment.amount)}</h3>
                        <p className="text-sm text-gray-500">Submitted on {new Date(payment.date).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleDownloadInvoice(payment)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Download className="size-4" />
                        Invoice
                      </button>
                    </div>

                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold mb-2">{booking?.propertyName}</h4>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between md:block">
                          <span className="text-gray-600">Booking ID: </span>
                          <span className="text-gray-900">{booking?.id}</span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-gray-600">Method: </span>
                          <span className="text-gray-900 capitalize">{payment.method.replace('_', ' ')}</span>
                        </div>
                        {booking?.paymentCycle && (
                          <div className="flex justify-between md:block">
                            <span className="text-gray-600">Cycle: </span>
                            <span className="text-gray-900 capitalize">{booking.paymentCycle}</span>
                          </div>
                        )}
                        <div className="flex justify-between md:block">
                          <span className="text-gray-600">Total Bill: </span>
                          <span className="text-gray-900">{formatCurrency(booking?.totalAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-gray-600">Verified Paid: </span>
                          <span className="font-semibold text-green-600">{formatCurrency(booking?.paidAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-gray-600">Remaining Balance: </span>
                          <span className="font-semibold text-red-600">{formatCurrency((booking?.totalAmount || 0) - (booking?.paidAmount || 0))}</span>
                        </div>
                      </div>

                      {payment.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700"><strong>Notes:</strong> {payment.notes}</p>
                        </div>
                      )}
                      {payment.proofOfPayment && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => setViewingImage(payment.proofOfPayment!)}
                            className="text-sm text-blue-600 hover:underline font-medium"
                          >
                            View Proof of Payment
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {userPayments.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 mb-2">Total Verified Paid</p>
            <p className="text-2xl font-semibold text-green-600">{formatCurrency(userPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0))}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 mb-2">Pending Verification</p>
            <p className="text-2xl font-semibold text-yellow-600">{formatCurrency(userPayments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + p.amount, 0))}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-600 mb-2">Total Transactions</p>
            <p className="text-2xl font-semibold text-gray-900">{userPayments.length}</p>
          </div>
        </div>
      )}

      {showPaymentModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">          
          <div className="bg-white rounded-lg max-w-md w-full flex flex-col max-h-[90vh] shadow-xl">
            <div className="flex-shrink-0 p-6 border-b flex justify-between items-center">              
              <h2 className="text-lg font-semibold">Make Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><XCircle className="size-6"/></button>
            </div>
            {paymentSuccess ? (
              <div className="p-10 text-center">
                  <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Payment Submitted!</h3>
                  <p className="text-gray-600">Your payment is pending admin verification. You can now close this window.</p>
              </div>
            ) : (
              <form id="payment-form" onSubmit={handlePaymentSubmit} className="p-6 space-y-5 overflow-y-auto">                
                {(() => {
                  const booking = userBookings.find(b => b.id === selectedBooking);
                  if (!booking) return null;
                  
                  const balance = booking.totalAmount - booking.paidAmount;
                  
                  return (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-800 mb-2">{booking.propertyName}</p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Total Amount:</span><span className="text-gray-900">{formatCurrency(booking.totalAmount)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Verified Paid:</span><span className="text-green-600 font-medium">{formatCurrency(booking.paidAmount)}</span></div>
                        <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5"><span className="font-semibold text-gray-900">Remaining Balance:</span><span className="font-semibold text-red-600">{formatCurrency(balance)}</span></div>
                      </div>
                    </div>
                  );
                })()}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Amount (₱)</label>
                  <input 
                    type="number" 
                    required 
                    min="0.01" 
                    step="0.01" 
                    max={(() => { 
                      const booking = userBookings.find(b => b.id === selectedBooking); 
                      return booking ? booking.totalAmount - booking.paidAmount : 0; 
                    })()} 
                    value={paymentForm.amount} 
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="0.00" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                  <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="gcash">GCash</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="paymaya">PayMaya</option><option value="bank_transfer">Bank Transfer</option><option value="credit_card">Credit/Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Proof of Payment</label>
                  
                  {!proofPreviewUrl ? (
                    <div>
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer w-full flex justify-center items-center gap-2 px-4 py-4 border-2 border-gray-300 border-dashed rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50"
                      >
                        <Paperclip className="size-4" />
                        <span className="font-medium">Choose File to Upload</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg" />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">Please upload a screenshot or photo of your receipt (PNG, JPG).</p>
                    </div>
                  ) : (
                    <div className="relative group w-36 h-36">
                      <img src={proofPreviewUrl} alt="Proof preview" className="w-full h-full object-cover rounded-lg shadow-sm border border-gray-200" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-full hover:bg-red-700 shadow-md transition-colors"
                          title="Remove Image"
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                  <textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any additional information or reference numbers..." />
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 px-4 py-2 font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" disabled={isSubmitting}>Cancel</button>
                  <button 
                    type="submit" 
                    form="payment-form" 
                    className={`flex-1 px-4 py-2 font-medium text-white rounded-lg transition-colors ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Uploading...' : 'Submit Payment'}
                  </button>              
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-6 right-6 z-50 text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors"
            aria-label="Close image viewer"
          >
            <X className="size-6" />
          </button>
          <div
            className="relative max-w-4xl max-h-[90vh] p-4 flex justify-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingImage}
              alt="Proof of Payment"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}