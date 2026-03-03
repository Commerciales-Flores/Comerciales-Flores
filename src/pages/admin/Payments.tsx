import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { CreditCard, CheckCircle, Clock, Download, FileDown, X, XCircle, Search, Eye, Plus, Filter } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import Papa from 'papaparse';
import AdminActionModal from '../../pages/admin/AdminActionModal';

export default function AdminPayments() {
  const { payments, reservations, updatePayment, getUserById } = useData();
  const { sendPaymentNotification } = useNotifications();
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const filteredPayments = payments.filter(p => {
    const reservation = reservations.find(r => r.id === p.reservationId);
    const user = reservation ? getUserById(reservation.userId) : null;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.reservationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleVerify = (paymentId: string, userId: string, amount: number) => {
    updatePayment(paymentId, { status: 'paid' });
    sendPaymentNotification(userId, paymentId, amount);
    setSelectedPayment(null);
  };

  const handleReject = (paymentId: string) => {
    updatePayment(paymentId, { status: 'unpaid' });
    setSelectedPayment(null);
  };

  const handleExportCSV = () => {
    if (sortedPayments.length === 0) return alert("No data to export.");
    const csvData = sortedPayments.map(payment => {
      const reservation = reservations.find(r => r.id === payment.reservationId);
      const user = reservation ? getUserById(reservation.userId) : null;
      return {
        'Payment ID': payment.id,
        'Reservation ID': payment.reservationId,
        'Amount': payment.amount,
        'Status': payment.status.toUpperCase(),
        'Customer': user ? `${user.first_name} ${user.last_name}` : 'N/A'
      };
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const payment = selectedPayment ? payments.find(p => p.id === selectedPayment) : null;
  const paymentReservation = payment ? reservations.find(r => r.id === payment.reservationId) : null;
  const paymentUser = paymentReservation ? getUserById(paymentReservation.userId) : null;

  const statusColors = {
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800'
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative pb-24 lg:pb-8">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payment Management</h1>
          <p className="text-gray-600 text-sm">Verify and manage customer payments</p>
        </div>
        {/* DESKTOP ONLY ADD BUTTON */}
        <button
          onClick={() => setIsActionModalOpen(true)}
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="size-5" />
          Create Payment
        </button>
      </div>

      {/* SEARCH & FILTERS BOX */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4 shadow-sm">
        
        {/* TOP ROW: Search Bar (Mobile gets icons beside it) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Payment ID, Reservation ID, or Customer Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* MOBILE ONLY ICONS */}
          <div className="flex lg:hidden gap-2">
            <button 
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`p-2 border rounded-lg ${showMobileFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              <Filter className="size-5" />
            </button>
            <button onClick={handleExportCSV} className="p-2 bg-gray-700 text-white rounded-lg">
              <FileDown className="size-5" />
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: DESKTOP ONLY (Original Style) */}
        <div className="hidden lg:flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
          <div className="flex gap-2">
            {(['all', 'paid', 'unpaid'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status === 'paid' ? 'Verified' : 'Pending'}
                {status !== 'all' && (
                  <span className="ml-2 bg-black/10 text-xs px-2 py-0.5 rounded-full">
                    {payments.filter(p => p.status === status).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <FileDown className="size-4" />
            Export CSV
          </button>
        </div>

        {/* MOBILE COLLAPSIBLE FILTERS */}
        {showMobileFilters && (
          <div className="flex lg:hidden gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
             {(['all', 'paid', 'unpaid'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 py-2 text-xs rounded-lg font-bold ${filterStatus === status ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500'}`}
              >
                {status === 'all' ? 'All' : status === 'paid' ? 'Verified' : 'Pending'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MOBILE ONLY FLOATING ADD BUTTON */}
      <button
        onClick={() => setIsActionModalOpen(true)}
        className="fixed lg:hidden bottom-6 right-6 z-40 size-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus className="size-8" />
      </button>

      {/* MOBILE CARD VIEW */}
<div className="grid grid-cols-1 gap-4 lg:hidden">
  {sortedPayments.length === 0 ? (
    <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
      <X className="size-10 mx-auto mb-3" />
      No payments found
    </div>
  ) : (
    sortedPayments.map((p) => {
      const reservation = reservations.find(r => r.id === p.reservationId);
      const user = reservation ? getUserById(reservation.userId) : null;
      return (
        <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs text-gray-400">{p.id}</span>
            <span className={`px-2 py-1 text-[10px] font-semibold rounded-full ${statusColors[p.status]}`}>
              {p.status === 'paid' ? 'VERIFIED' : 'PENDING'}
            </span>
          </div>
          <div className="text-sm font-semibold text-gray-900 truncate">{user ? `${user.first_name} ${user.last_name}` : 'Unknown User'}</div>
          <div className="text-sm text-gray-600 truncate">Reservation: {p.reservationId}</div>
          <div className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setSelectedPayment(p.id)} className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex justify-center items-center gap-1">
              <Eye className="size-4" /> View
            </button>
            {p.status === 'unpaid' && (
              <>
                <button onClick={() => handleVerify(p.id, p.userId, p.amount)} className="flex-1 p-2 text-green-600 hover:bg-green-50 rounded-lg flex justify-center items-center gap-1">
                  <CheckCircle className="size-4" /> Verify
                </button>
                <button onClick={() => handleReject(p.id)} className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded-lg flex justify-center items-center gap-1">
                  <XCircle className="size-4" /> Reject
                </button>
              </>
            )}
          </div>
        </div>
      );
    })
  )}
</div>

      {/* TABLE SECTION (Remains the same for all columns) */}
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="whitespace-nowrap">
                {['User ID', 'Payment ID', 'Reservation ID', 'Amount', 'Date', 'Status', 'Proof', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.userId}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{p.reservationId}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(p.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-semibold ${statusColors[p.status]}`}>
                      {p.status === 'paid' ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {p.proofOfPayment ? (
                      <button onClick={() => setProofImageUrl(p.proofOfPayment || null)} className="text-blue-600 hover:underline">View Proof</button>
                    ) : <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedPayment(p.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="size-4" /></button>
                      {p.status === 'unpaid' && (
                        <>
                          <button onClick={() => handleVerify(p.id, p.userId, p.amount)} className="p-1 text-green-600 hover:bg-green-50 rounded"><CheckCircle className="size-4" /></button>
                          <button onClick={() => handleReject(p.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><XCircle className="size-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      {isActionModalOpen && <AdminActionModal actionType="payment" onClose={() => setIsActionModalOpen(false)} />}
      {/* ✅ Payment Details Modal with Blur and User Info */}
      {payment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Payment Details</h2>
                {paymentUser && (
                  <p className="text-sm text-gray-500 mt-1">
                    User: <span className="font-medium text-gray-700">{paymentUser.first_name} {paymentUser.last_name}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-gray-600">
                <X className="size-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Payment ID:</span></div>
                <div className="text-gray-900 font-mono">{payment.id}</div>
                <div><span className="text-gray-600">Reservation ID:</span></div>
                <div className="text-gray-900 font-mono">{payment.reservationId}</div>
                <div><span className="text-gray-600">Property:</span></div>
                <div className="text-gray-900">{paymentReservation?.propertyName ?? <span className="text-red-500">Not Found</span>}</div>
                <div><span className="text-gray-600">Amount:</span></div>
                <div className="text-gray-900 font-semibold">{formatCurrency(payment.amount)}</div>
                <div><span className="text-gray-600">Method:</span></div>
                <div className="text-gray-900 capitalize">{payment.method.replace('_', ' ')}</div>
                <div><span className="text-gray-600">Date:</span></div>
                <div className="text-gray-900">{new Date(payment.date).toLocaleDateString()}</div>
                <div><span className="text-gray-600">Status:</span></div>
                <div>
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${statusColors[payment.status]}`}>
                    {payment.status === 'paid' ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>

              </div>
              {payment.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes:</p>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">{payment.notes}</div>
                </div>
              )}
              {payment.status === 'unpaid' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleReject(payment.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="size-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(payment.id, payment.userId, payment.amount)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50" onClick={() => setProofImageUrl(null)}>
          <button onClick={() => setProofImageUrl(null)} className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30" title="Close">
            <X className="size-7" />
          </button>
          <div className="p-4">
            <img src={proofImageUrl} alt="Proof of Payment" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </div>
  );
}