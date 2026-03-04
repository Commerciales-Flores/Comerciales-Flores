import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CheckCircle, Clock, FileDown, X, XCircle, Search, Eye, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import Papa from 'papaparse'; 
import AdminActionModal from '../../pages/admin/AdminActionModal';

export default function AdminPayments() {
  const { payments, bookings, updatePayment, getUserById } = useData();
  const { sendSystemNotification } = useNotifications();
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // --- Summary Calculations ---
  const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'unpaid' || p.status === 'partial').reduce((sum, p) => sum + p.amount, 0);
  
  // --- Filters & Sorting ---
  const filteredPayments = payments.filter(p => {
    const user = getUserById(p.userId);
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'paid' && p.status === 'paid') ||
      (filterStatus === 'pending' && (p.status === 'unpaid' || p.status === 'partial'));

    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          // ✅ FIX: Changed back to first_name and last_name for DataContext User
                          (user && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const sortedPayments = [...filteredPayments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // --- Actions ---
  const handleVerify = async (paymentId: string, userId: string, amount: number) => {
    try {
      await updatePayment(paymentId, { status: 'paid' });
      await sendSystemNotification(
        userId,
        'Payment Verified',
        `Your payment of ${formatCurrency(amount)} has been successfully verified.`
      );
      setSelectedPayment(null);
    } catch (error) {
      console.error("Failed to verify payment:", error);
    }
  };

  const handleReject = async (paymentId: string, userId: string, amount: number) => {
    try {
      await updatePayment(paymentId, { status: 'unpaid' });
      await sendSystemNotification(
        userId,
        'Payment Rejected',
        `Your payment of ${formatCurrency(amount)} could not be verified. Please check your details and try again.`
      );
      setSelectedPayment(null);
    } catch (error) {
      console.error("Failed to reject payment:", error);
    }
  };

  const handleExportCSV = () => {
    if (sortedPayments.length === 0) {
      alert("No data to export.");
      return;
    }

    const csvData = sortedPayments.map(payment => {
      const booking = bookings.find(b => b.id === payment.bookingId);
      const user = getUserById(payment.userId);
      return {
        'Payment ID': payment.id,
        'Booking ID': payment.bookingId,
        'Payment Date': new Date(payment.date).toLocaleDateString(),
        // ✅ FIX: Changed back to first_name and last_name
        'Customer Name': user ? `${user.first_name} ${user.last_name}` : 'N/A',
        'Property Name': booking?.propertyName ?? 'N/A',
        'Amount': payment.amount,
        'Payment Method': payment.method.replace('_', ' ').toUpperCase(),
        'Status': payment.status.toUpperCase(),
        'Notes': payment.notes || 'None',
        'Proof of Payment URL': payment.proofOfPayment ?? 'N/A'
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().split('T')[0];
    link.download = `payments_export_${date}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const payment = selectedPayment ? payments.find(p => p.id === selectedPayment) : null;
  const paymentBooking = payment ? bookings.find(b => b.id === payment.bookingId) : null;
  const paymentUser = payment ? getUserById(payment.userId) : null;

  const statusColors = {
    paid: 'bg-green-50 text-green-700 border-green-200',
    unpaid: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    partial: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Management</h1>
          <p className="text-gray-600">Verify and manage customer payments</p>
        </div>
        <div>
          <button
            onClick={() => setIsActionModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="size-5" />
            Create Payment
          </button>
        </div>
      </div>

      {isActionModalOpen && (
        <AdminActionModal
          actionType="payment"
          onClose={() => setIsActionModalOpen(false)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-gray-600 font-medium">Total Verified Revenue</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">{payments.filter(p => p.status === 'paid').length} verified payments</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-gray-600 font-medium">Pending Verification</span>
          </div>
          <p className="text-gray-900 text-2xl font-bold">{formatCurrency(pendingAmount)}</p>
          <p className="text-sm text-gray-500 mt-1">{payments.filter(p => p.status === 'unpaid' || p.status === 'partial').length} payments awaiting review</p>
        </div>
      </div>

      {/* Filters and Export */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Payment ID, Booking ID, or Customer Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 pt-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'paid', 'pending'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status === 'paid' ? 'Verified' : 'Pending'}
                {status !== 'all' && (
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-md ${filterStatus === status ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {status === 'pending' 
                      ? payments.filter(p => p.status === 'unpaid' || p.status === 'partial').length
                      : payments.filter(p => p.status === 'paid').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            disabled={sortedPayments.length === 0}
            title="Export current view to CSV"
          >
            <FileDown className="size-4" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Booking / User</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Proof</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No payments found matching your criteria.</td>
                </tr>
              ) : (
                sortedPayments.map((p) => {
                   const user = getUserById(p.userId);
                   
                   return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                       {p.id.split('-')[0]}...
                    </td>
                    <td className="px-6 py-4 text-sm">
                        <div className="text-gray-900 font-medium">Res: {p.bookingId.split('-')[0]}...</div>
                        {/* ✅ FIX: Changed back to first_name and last_name */}
                        <div className="text-xs text-gray-500 mt-0.5">{user ? `${user.first_name} ${user.last_name}` : 'Unknown User'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                       {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                       {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded-full border ${statusColors[p.status]}`}>
                        {p.status === 'paid' ? 'VERIFIED' : p.status === 'partial' ? 'PARTIAL' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {p.proofOfPayment ? (
                        <button
                          onClick={() => setProofImageUrl(p.proofOfPayment || null)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          View Proof
                        </button>
                      ) : (
                        <span className="text-gray-400 font-medium text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedPayment(p.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </button>
                        {(p.status === 'unpaid' || p.status === 'partial') && (
                          <>
                            <button
                              onClick={() => handleVerify(p.id, p.userId, p.amount)}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                              title="Verify Payment"
                            >
                              <CheckCircle className="size-4" />
                            </button>
                            <button
                              onClick={() => handleReject(p.id, p.userId, p.amount)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              title="Reject Payment"
                            >
                              <XCircle className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Details Modal */}
      {payment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
                {paymentUser && (
                  <p className="text-sm text-gray-500 mt-1">
                    {/* ✅ FIX: Changed back to first_name and last_name */}
                    Client: <span className="font-semibold text-gray-800">{paymentUser.first_name} {paymentUser.last_name}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="size-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto bg-gray-50">
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                 <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Payment ID</span> <span className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{payment.id}</span></div>
                    <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Reservation ID</span> <span className="text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{payment.bookingId}</span></div>
                    <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Property</span> <span className="text-gray-900 font-medium">{paymentBooking ? paymentBooking.propertyName : <span className="text-red-500">Not Found</span>}</span></div>
                    <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Amount</span> <span className="text-green-700 font-bold text-lg">{formatCurrency(payment.amount)}</span></div>
                    <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Method</span> <span className="text-gray-900 font-medium capitalize">{payment.method.replace('_', ' ')}</span></div>
                    <div><span className="text-gray-500 block mb-1 uppercase text-xs font-semibold">Date Received</span> <span className="text-gray-900 font-medium">{new Date(payment.date).toLocaleDateString()}</span></div>
                    
                    <div className="col-span-2 pt-2 border-t border-gray-100 mt-2">
                       <span className="text-gray-500 block mb-2 uppercase text-xs font-semibold">Current Status</span> 
                       <span className={`px-3 py-1 text-xs font-bold tracking-wider rounded-full border inline-block ${statusColors[payment.status]}`}>
                         {payment.status === 'paid' ? 'VERIFIED' : payment.status === 'partial' ? 'PARTIAL' : 'PENDING'}
                       </span>
                    </div>
                 </div>
              </div>

              {payment.notes && (
                <div>
                  <h3 className="mb-2 font-bold text-gray-900">Notes</h3>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-sm text-gray-700 shadow-sm">
                     {payment.notes}
                  </div>
                </div>
              )}

              {(payment.status === 'unpaid' || payment.status === 'partial') && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleReject(payment.id, payment.userId, payment.amount)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <XCircle className="size-5" />
                    Reject Payment
                  </button>
                  <button
                    onClick={() => handleVerify(payment.id, payment.userId, payment.amount)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors shadow-md"
                  >
                    <CheckCircle className="size-5" />
                    Verify Payment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal for Proof of Payment */}
      {proofImageUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setProofImageUrl(null)}>
          <button onClick={() => setProofImageUrl(null)} className="absolute top-6 right-6 bg-white/10 text-white rounded-full p-2 hover:bg-white/20 transition-colors" title="Close">
            <X className="size-6" />
          </button>
          <div className="p-4 relative">
            <img src={proofImageUrl} alt="Proof of Payment" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-white/20" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}