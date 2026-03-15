import { useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  CreditCard,
  CheckCircle,
  FileDown,
  X,
  XCircle,
  Search,
  Eye,
  Plus,
  Filter,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import Papa from 'papaparse';
import AdminActionModal from '../../pages/admin/AdminActionModal';
import { motion } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';

type PaymentFilterStatus = 'all' | 'paid' | 'unpaid' | 'partial';

type PaymentView = {
  id: string;
  publicId?: string;
  reservationId: string;
  reservationPublicId: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'partial';
  date: string;
  dateMs: number;
  dateLabel: string;
  method: string;
  notes?: string;
  proofOfPayment?: string;
  userId: string;
  userPublicId: string;
  userFullName: string;
  unitName: string;
  reservationTotalAmount: number;
  reservationPaidAmount: number;
  progress: number;
  searchableText: string;
};

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unpaid: 'bg-amber-100 text-amber-700 border-amber-200',
  partial: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function AdminPayments() {
  const { payments, reservations, updatePayment, getUserById } = useData();
  const { sendPaymentNotification } = useNotifications();

  const [filterStatus, setFilterStatus] = useState<PaymentFilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const normalizedSearch = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);

  const paymentViews = useMemo<PaymentView[]>(() => {
    const reservationMap = new Map(reservations.map((r) => [r.id, r]));

    return payments.map((payment) => {
      const reservation = reservationMap.get(payment.reservationId);
      const user = reservation ? getUserById(reservation.userId) : null;

      const reservationPublicId = reservation?.publicId ?? payment.reservationId;
      const userPublicId = user?.publicId ?? user?.id ?? payment.userId;
      const userFullName = user
        ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
        : 'Unknown User';

      const reservationPaidAmount = reservation?.paidAmount ?? 0;
      const reservationTotalAmount = reservation?.totalAmount ?? 0;
      const progress =
        reservationTotalAmount > 0
          ? Math.min((reservationPaidAmount / reservationTotalAmount) * 100, 100)
          : 0;

      return {
        id: payment.id,
        publicId: payment.publicId,
        reservationId: payment.reservationId,
        reservationPublicId,
        amount: payment.amount,
        status: payment.status,
        date: payment.date,
        dateMs: new Date(payment.date).getTime(),
        dateLabel: new Date(payment.date).toLocaleDateString(),
        method: payment.method,
        notes: payment.notes,
        proofOfPayment: payment.proofOfPayment,
        userId: payment.userId,
        userPublicId,
        userFullName,
        unitName: reservation?.unitName ?? 'Not Found',
        reservationTotalAmount,
        reservationPaidAmount,
        progress,
        searchableText: [
          payment.publicId ?? payment.id,
          reservationPublicId,
          userPublicId,
          userFullName,
        ]
          .join(' ')
          .toLowerCase(),
      };
    });
  }, [payments, reservations, getUserById]);

  const paymentCounts = useMemo(() => {
    return paymentViews.reduce(
      (acc, payment) => {
        acc.all += 1;
        acc[payment.status] += 1;
        return acc;
      },
      {
        all: 0,
        paid: 0,
        unpaid: 0,
        partial: 0,
      }
    );
  }, [paymentViews]);

  const sortedPayments = useMemo(() => {
    return paymentViews
      .filter((payment) => {
        const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
        const matchesSearch =
          !normalizedSearch || payment.searchableText.includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => b.dateMs - a.dateMs);
  }, [paymentViews, filterStatus, normalizedSearch]);

  const selectedPaymentData = useMemo(() => {
    return selectedPayment
      ? paymentViews.find((payment) => payment.id === selectedPayment) ?? null
      : null;
  }, [selectedPayment, paymentViews]);

  const hasNoPayments = payments.length === 0;
  const hasNoSearchResults = payments.length > 0 && sortedPayments.length === 0;

  const handleVerify = useCallback(
    (paymentId: string, userId: string, amount: number) => {
      updatePayment(paymentId, { status: 'paid' });
      sendPaymentNotification(userId, paymentId, amount);
      setSelectedPayment(null);
    },
    [updatePayment, sendPaymentNotification]
  );

  const handleReject = useCallback(
    (paymentId: string) => {
      updatePayment(paymentId, { status: 'unpaid' });
      setSelectedPayment(null);
    },
    [updatePayment]
  );

  const handleExportCSV = useCallback(() => {
    if (sortedPayments.length === 0) {
      alert('No data to export.');
      return;
    }

    const csvData = sortedPayments.map((payment) => ({
      'Payment ID': payment.publicId ?? payment.id,
      'Reservation ID': payment.reservationPublicId,
      Amount: payment.amount,
      Status: payment.status.toUpperCase(),
      Customer: payment.userFullName,
      'User ID': payment.userPublicId,
      Unit: payment.unitName,
      Date: payment.dateLabel,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(objectUrl);
  }, [sortedPayments]);

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col gap-6 relative pb-24 lg:pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Payment Management</h1>
          <p className="text-gray-600 text-sm">Verify and manage customer payments</p>
        </div>

        <button
          onClick={() => setIsActionModalOpen(true)}
          className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="size-5" />
          Create Payment
        </button>
      </div>

      {!hasNoPayments && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4 shadow-sm">
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

            <div className="flex lg:hidden gap-2">
              <button
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`p-2 border rounded-lg ${
                  showMobileFilters
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                <Filter className="size-5" />
              </button>

              <button
                onClick={handleExportCSV}
                className="p-2 bg-gray-700 text-white rounded-lg"
              >
                <FileDown className="size-5" />
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
            <div className="flex gap-2">
              {(['all', 'paid', 'partial', 'unpaid'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all'
                    ? 'All'
                    : status === 'paid'
                    ? 'Verified'
                    : status === 'partial'
                    ? 'Partial'
                    : 'Pending'}
                  {status !== 'all' && (
                    <span className="ml-2 bg-black/10 text-xs px-2 py-0.5 rounded-full">
                      {paymentCounts[status]}
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

          {showMobileFilters && (
            <div className="flex lg:hidden gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
              {(['all', 'paid', 'partial', 'unpaid'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex-1 py-2 text-xs rounded-lg font-bold ${
                    filterStatus === status
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {status === 'all'
                    ? 'All'
                    : status === 'paid'
                    ? 'Verified'
                    : status === 'partial'
                    ? 'Partial'
                    : 'Pending'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setIsActionModalOpen(true)}
        className="fixed lg:hidden bottom-6 right-6 z-40 size-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
      >
        <Plus className="size-8" />
      </button>

      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {hasNoPayments ? (
          <EmptyState
            icon={<CreditCard className="size-10 text-blue-500" />}
            title="No payments yet"
            description="Payment records will appear here once customers submit payments or an administrator creates one."
          />
        ) : hasNoSearchResults ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm py-16 px-6"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className="bg-gray-50 p-5 rounded-3xl shadow-sm mb-4">
                <Search className="size-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">No matching payments found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Try adjusting your search term or payment status filter.
              </p>
            </div>
          </motion.div>
        ) : (
          sortedPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-gray-400">
                  {payment.publicId ?? payment.id}
                </span>
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${statusColors[payment.status]}`}
                >
                  {payment.status === 'paid'
                    ? 'VERIFIED'
                    : payment.status === 'partial'
                    ? 'PARTIAL'
                    : 'PENDING'}
                </span>
              </div>

              <div className="text-sm font-semibold text-gray-900 truncate">
                {payment.userFullName}
              </div>

              <div className="text-sm text-gray-600 truncate">
                Reservation: {payment.reservationPublicId}
              </div>

              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(payment.amount)}
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setSelectedPayment(payment.id)}
                  className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex justify-center items-center gap-1"
                >
                  <Eye className="size-4" /> View
                </button>

                {payment.status === 'unpaid' && (
                  <>
                    <button
                      onClick={() =>
                        handleVerify(payment.id, payment.userId, payment.amount)
                      }
                      className="flex-1 p-2 text-green-600 hover:bg-green-50 rounded-lg flex justify-center items-center gap-1"
                    >
                      <CheckCircle className="size-4" /> Verify
                    </button>

                    <button
                      onClick={() => handleReject(payment.id)}
                      className="flex-1 p-2 text-red-600 hover:bg-red-50 rounded-lg flex justify-center items-center gap-1"
                    >
                      <XCircle className="size-4" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {hasNoPayments ? (
          <EmptyState
            icon={<CreditCard className="size-10 text-blue-500" />}
            title="No payments yet"
            description="Payment records will appear here once customers submit payments or an administrator creates one."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    'User ID',
                    'Payment ID',
                    'Reservation ID',
                    'Amount',
                    'Date',
                    'Status',
                    'Proof',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {hasNoSearchResults ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col items-center justify-center text-center"
                      >
                        <div className="bg-gray-50 p-5 rounded-3xl shadow-sm mb-4">
                          <Search className="size-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                          No matching payments found
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Try adjusting your search term or payment status filter.
                        </p>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  sortedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-gray-400 w-[140px]">
                        {payment.userPublicId}
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-gray-400 w-[140px]">
                        {payment.publicId ?? payment.id}
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-gray-400 w-[140px]">
                        {payment.reservationPublicId}
                      </td>

                      <td className="px-6 py-4 w-[150px]">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>
                            {formatCurrency(payment.reservationPaidAmount)} /{' '}
                            {formatCurrency(payment.reservationTotalAmount)}
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              payment.status === 'paid'
                                ? 'bg-emerald-500'
                                : payment.status === 'partial'
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{
                              width: `${
                                payment.progress > 0
                                  ? Math.max(Math.min(payment.progress, 100), 2)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <div className="text-[10px] text-gray-400 mt-1 text-right">
                          {payment.progress < 1
                            ? payment.progress.toFixed(2)
                            : payment.progress.toFixed(0)}
                          %
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-500 w-[140px]">
                        {payment.dateLabel}
                      </td>

                      <td className="px-6 py-4 w-[120px]">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${statusColors[payment.status]}`}
                        >
                          {payment.status === 'paid'
                            ? 'VERIFIED'
                            : payment.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm w-[120px]">
                        {payment.proofOfPayment ? (
                          <button
                            onClick={() => setProofImageUrl(payment.proofOfPayment || null)}
                            className="text-blue-600 hover:underline"
                          >
                            View Proof
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 w-[120px]">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedPayment(payment.id)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                          >
                            <Eye className="size-4" />
                          </button>

                          {payment.status === 'unpaid' && (
                            <>
                              <button
                                onClick={() =>
                                  handleVerify(payment.id, payment.userId, payment.amount)
                                }
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              >
                                <CheckCircle className="size-4" />
                              </button>

                              <button
                                onClick={() => handleReject(payment.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <XCircle className="size-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isActionModalOpen && (
        <AdminActionModal actionType="payment" onClose={() => setIsActionModalOpen(false)} />
      )}

      {selectedPaymentData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Payment Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  User:{' '}
                  <span className="font-medium text-gray-700">
                    {selectedPaymentData.userFullName}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="size-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-600">Payment ID:</span></div>
                <div className="text-gray-900 font-mono">
                  {selectedPaymentData.publicId ?? selectedPaymentData.id}
                </div>

                <div><span className="text-gray-600">Reservation ID:</span></div>
                <div className="text-gray-900 font-mono">
                  {selectedPaymentData.reservationPublicId}
                </div>

                <div><span className="text-gray-600">Unit:</span></div>
                <div className="text-gray-900">{selectedPaymentData.unitName}</div>

                <div><span className="text-gray-600">Amount:</span></div>
                <div className="text-gray-900 font-semibold">
                  {formatCurrency(selectedPaymentData.amount)}
                </div>

                <div><span className="text-gray-600">Method:</span></div>
                <div className="text-gray-900 capitalize">
                  {selectedPaymentData.method.replace('_', ' ')}
                </div>

                <div><span className="text-gray-600">Date:</span></div>
                <div className="text-gray-900">{selectedPaymentData.dateLabel}</div>

                <div><span className="text-gray-600">Status:</span></div>
                <div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-semibold ${statusColors[selectedPaymentData.status]}`}
                  >
                    {selectedPaymentData.status === 'paid'
                      ? 'VERIFIED'
                      : selectedPaymentData.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedPaymentData.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes:</p>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700">
                    {selectedPaymentData.notes}
                  </div>
                </div>
              )}

              {selectedPaymentData.status === 'unpaid' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleReject(selectedPaymentData.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <XCircle className="size-5" />
                    Reject
                  </button>

                  <button
                    onClick={() =>
                      handleVerify(
                        selectedPaymentData.id,
                        selectedPaymentData.userId,
                        selectedPaymentData.amount
                      )
                    }
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

      {proofImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50"
          onClick={() => setProofImageUrl(null)}
        >
          <button
            onClick={() => setProofImageUrl(null)}
            className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
            title="Close"
          >
            <X className="size-7" />
          </button>

          <div className="p-4">
            <img
              src={proofImageUrl}
              alt="Proof of Payment"
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}