import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminData } from '../../contexts/AdminDataContext';
import { DataTable, DataCell, ActionCell } from '../../components/common/DataTable';
import { useNotifications } from '../../contexts/NotificationContext';
import { usePayments } from '../../contexts/PaymentsContext';
import { useRecords } from '../../contexts/RecordsContext';
import { formatDate } from '../../utils/date';
import {
  CreditCard,
  CheckCircle,
  FileDown,
  X,
  XCircle,
  Search,
  Eye,
  Plus,
  SlidersHorizontal,
  ReceiptText,
  CalendarDays,
  BadgeDollarSign,
  ImageIcon,
  Settings2,
} from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import Papa from 'papaparse';
import AdminActionModal from '../../components/modals/AdminActionModal';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../../components/common/EmptyState';
import type { Payment } from '../../data/types';

type PaymentFilterStatus = 'all' | 'paid' | 'unpaid' | 'partial';

type PaymentView = {
  id: string;
  publicId?: string;
  reservationId: string;
  reservationPublicId: string;
  category?: Payment['category'];
  amount: number;
  refundedAmount: number;
  remainingRefundableAmount: number;
  derivedStatus: 'paid' | 'partial' | 'unpaid';
  status: 'paid' | 'unpaid' | 'partial';
  date: string;
  dateMs: number;
  dateLabel: string;
  method: Payment['method'];
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

function getReservationPaymentStatus(progress: number): 'paid' | 'partial' | 'unpaid' {
  if (progress >= 100) return 'paid';
  if (progress > 0) return 'partial';
  return 'unpaid';
}

function getStatusLabel(status: PaymentFilterStatus | PaymentView['status']) {
  if (status === 'paid') return 'Verified';
  if (status === 'partial') return 'Partial';
  if (status === 'unpaid') return 'Pending';
  return 'All';
}

function getPaymentCategoryLabel(category?: Payment['category']) {
  if (category === 'advance_deposit') return 'Advance Deposit';
  if (category === 'security_deposit') return 'Security Deposit';
  return 'Payment';
}

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function AdminPayments() {
  const { reservations, getUserById, loadingUnits } = useAdminData();
  const { sendPaymentNotification, sendRefundNotification } = useNotifications();
  const { fetchPaymentsPage, updatePayment, issueRefund, paymentsVersion } = usePayments();
  const { ledgers, ledgerVersion } = useRecords();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState<PaymentFilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const navigate = useNavigate();

  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const [pageInput, setPageInput] = useState('1');

  const [refundPayment, setRefundPayment] = useState<PaymentView | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNotes, setRefundNotes] = useState('');

  const loadPaymentsPage = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) setLoading(true);

      try {
        const result = await fetchPaymentsPage({
          page,
          pageSize,
          status: filterStatus,
          searchTerm: debouncedSearch,
        });

        setPayments(result.data);
        setTotalCount(result.count);
      } catch (error) {
        console.error('Failed to load payments page:', error);
        setPayments([]);
        setTotalCount(0);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchPaymentsPage, page, pageSize, filterStatus, debouncedSearch]
  );

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const handlePageJump = useCallback(() => {
    const parsed = parseInt(pageInput, 10);

    if (Number.isNaN(parsed)) {
      setPageInput(String(page));
      return;
    }

    const nextPage = Math.min(Math.max(parsed, 1), totalPages);
    setPage(nextPage);
    setPageInput(String(nextPage));
  }, [pageInput, page, totalPages]);

  const handlePageInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePageJump();
      }
    },
    [handlePageJump]
  );

  useEffect(() => {
    setPage(1);
  }, [filterStatus, debouncedSearch]);

  useEffect(() => {
    void loadPaymentsPage();
  }, [loadPaymentsPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPaymentsPage({ silent: true });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [paymentsVersion, ledgerVersion, loadPaymentsPage]);

  const ledgerTotalsByReservationId = useMemo(() => {
    const map = new Map<string, number>();

    ledgers.forEach((entry) => {
      if (!entry.reservationId) return;

      const amount = Number(entry.amount || 0);
      const current = map.get(entry.reservationId) ?? 0;

      switch (entry.entryType) {
        case 'payment':
        case 'balance':
          map.set(entry.reservationId, current + amount);
          break;
        case 'deposit':
          if (entry.depositType === 'advance') {
            map.set(entry.reservationId, current + amount);
          }
          break;
        case 'refund':
          map.set(entry.reservationId, current - amount);
          break;
        case 'discount':
          map.set(entry.reservationId, current - amount);
          break;
        case 'penalty':
        case 'adjustment':
          map.set(entry.reservationId, current + amount);
          break;
        default:
          break;
      }
    });

    return map;
  }, [ledgers]);

  const refundedAmountByPaymentId = useMemo(() => {
    const map = new Map<string, number>();

    ledgers.forEach((entry) => {
      if (entry.entryType !== 'refund' || !entry.paymentId) return;

      const current = map.get(entry.paymentId) ?? 0;
      map.set(entry.paymentId, current + Number(entry.amount || 0));
    });

    return map;
  }, [ledgers]);

  const paymentViews = useMemo<PaymentView[]>(() => {
    const reservationMap = new Map(reservations.map((r) => [r.id, r]));

    return payments.map((payment) => {
      const reservation = reservationMap.get(payment.reservationId);
      const user = reservation ? getUserById(reservation.userId) : getUserById(payment.userId);

      const reservationPublicId = reservation?.publicId ?? payment.reservationId;
      const userPublicId = user?.publicId ?? user?.id ?? payment.userId;
      const userFullName = user
        ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
        : 'Unknown User';

      const reservationTotalAmount = Number(reservation?.totalAmount || 0);
      const paidFromLedger = Number(ledgerTotalsByReservationId.get(payment.reservationId) || 0);

      const progress =
        reservationTotalAmount > 0
          ? Math.min((paidFromLedger / reservationTotalAmount) * 100, 100)
          : 0;

      const derivedStatus = getReservationPaymentStatus(progress);
      const refundedAmount = Number(refundedAmountByPaymentId.get(payment.id) || 0);
      const remainingRefundableAmount = Math.max(
        0,
        Number(payment.amount || 0) - refundedAmount
      );

      return {
        id: payment.id,
        publicId: payment.publicId,
        reservationId: payment.reservationId,
        reservationPublicId,
        category: payment.category,
        amount: payment.amount,
        refundedAmount,
        remainingRefundableAmount,
        status: payment.status,
        date: payment.date,
        dateMs: new Date(payment.date).getTime(),
        dateLabel: formatDate(payment.date),
        method: payment.method,
        notes: payment.notes,
        proofOfPayment: payment.proofOfPayment,
        userId: payment.userId,
        userPublicId,
        userFullName,
        unitName: reservation?.unitName ?? 'Not Found',
        reservationTotalAmount,
        reservationPaidAmount: paidFromLedger,
        progress,
        derivedStatus,
        searchableText: [
          payment.publicId ?? payment.id,
          reservationPublicId,
          userPublicId,
          userFullName,
          payment.category ?? 'payment',
        ]
          .join(' ')
          .toLowerCase(),
      };
    });
  }, [payments, reservations, getUserById, ledgerTotalsByReservationId, refundedAmountByPaymentId]);

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

  const selectedPaymentData = useMemo(() => {
    return selectedPayment
      ? paymentViews.find((payment) => payment.id === selectedPayment) ?? null
      : null;
  }, [selectedPayment, paymentViews]);

  const isTableLoading = loading || loadingUnits;
  const trimmedSearch = debouncedSearch.trim();

  

  const hasNoPayments =
    !isTableLoading && totalCount === 0 && trimmedSearch.length === 0;
  const hasNoSearchResults =
    !isTableLoading && totalCount === 0 && trimmedSearch.length > 0;

    const hasActiveFilters =
  trimmedSearch.length > 0 || filterStatus !== 'all';

const shouldShowFilters =
  !isTableLoading && (!hasNoPayments || hasActiveFilters);

  const handleVerify = useCallback(
    async (payment: PaymentView) => {
      try {
        await updatePayment(payment.id, { status: 'paid' });

        await sendPaymentNotification({
          userId: payment.userId,
          paymentPublicId: payment.publicId || payment.id,
          amount: payment.amount,
        });

        setSelectedPayment(null);

        const result = await fetchPaymentsPage({
          page,
          pageSize,
          status: filterStatus,
          searchTerm: debouncedSearch,
        });

        setPayments(result.data);
        setTotalCount(result.count);
      } catch (error) {
        console.error('Failed to verify payment:', error);
        alert(
          error instanceof Error
            ? error.message
            : 'Failed to verify payment. Please review the payment rules and try again.'
        );
      }
    },
    [
      updatePayment,
      sendPaymentNotification,
      fetchPaymentsPage,
      page,
      pageSize,
      filterStatus,
      debouncedSearch,
    ]
  );

  const handleReject = useCallback(
    async (paymentId: string) => {
      await updatePayment(paymentId, { status: 'unpaid' });
      setSelectedPayment(null);

      const result = await fetchPaymentsPage({
        page,
        pageSize,
        status: filterStatus,
        searchTerm: debouncedSearch,
      });

      setPayments(result.data);
      setTotalCount(result.count);
    },
    [updatePayment, fetchPaymentsPage, page, pageSize, filterStatus, debouncedSearch]
  );

  const openRefundModal = useCallback((payment: PaymentView) => {
    setRefundPayment(payment);
    setRefundAmount('');
    setRefundNotes('');
  }, []);

  const handleRefund = async () => {
    if (!refundPayment) return;

    const parsedAmount = Number(refundAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid refund amount.');
      return;
    }

    if (parsedAmount > refundPayment.remainingRefundableAmount) {
      alert(
        `Refund cannot exceed ${formatCurrency(refundPayment.remainingRefundableAmount)}.`
      );
      return;
    }

    if (!refundNotes.trim()) {
      alert('Please provide a refund reason.');
      return;
    }

    try {
      await issueRefund({
        reservationId: refundPayment.reservationId,
        paymentId: refundPayment.id,
        amount: parsedAmount,
        method: refundPayment.method,
        notes: refundNotes.trim(),
      });

      try {
        await sendRefundNotification({
          userId: refundPayment.userId,
          reservationPublicId: refundPayment.reservationPublicId,
          paymentPublicId: refundPayment.publicId ?? refundPayment.id,
          amount: parsedAmount,
          notes: refundNotes.trim(),
        });
      } catch (notificationError) {
        console.error('Refund notification failed:', notificationError);
      }

      setRefundPayment(null);
      setRefundAmount('');
      setRefundNotes('');

      const result = await fetchPaymentsPage({
        page,
        pageSize,
        status: filterStatus,
        searchTerm: debouncedSearch,
      });

      setPayments(result.data);
      setTotalCount(result.count);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Refund failed');
    }
  };

  const handleExportCSV = useCallback(() => {
    if (paymentViews.length === 0) {
      alert('No data to export.');
      return;
    }

    const csvData = paymentViews.map((payment) => ({
      'Payment ID': payment.publicId ?? payment.id,
      'Reservation ID': payment.reservationPublicId,
      Category: getPaymentCategoryLabel(payment.category),
      Amount: payment.amount,
      Refunded: payment.refundedAmount,
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
    link.download = `payments_page_${page}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(objectUrl);
  }, [paymentViews, page]);

  const filterOptions: PaymentFilterStatus[] = ['all', 'paid', 'partial', 'unpaid'];

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="hidden items-center justify-between lg:flex">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-sm text-gray-500">
              Verify and manage customer payments
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/payment-methods')}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <Settings2 className="size-4.5" />
              Manage Methods
            </button>

            <button
              onClick={() => setIsActionModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
            >
              <Plus className="size-5" />
              <span className="hidden font-medium sm:inline">Create Payments</span>
            </button>
          </div>
        </div>

        {shouldShowFilters && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by payment ID, reservation ID, user ID, customer, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex gap-2 lg:hidden">
                  <button
                    onClick={() => setShowMobileFilters((prev) => !prev)}
                    className={`rounded-xl border p-2.5 transition ${
                      showMobileFilters
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    <SlidersHorizontal className="size-5" />
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="rounded-xl bg-gray-800 p-2.5 text-white transition hover:bg-gray-900"
                  >
                    <FileDown className="size-5" />
                  </button>
                </div>
              </div>

              {!hasNoSearchResults && (
                <div className="hidden items-center justify-between gap-4 border-t border-gray-100 pt-4 lg:flex">
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                          filterStatus === status
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getStatusLabel(status)}
                        {status !== 'all' && (
                          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                            {paymentCounts[status]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-900"
                  >
                    <FileDown className="size-4" />
                    Export CSV
                  </button>
                </div>
              )}

              <AnimatePresence>
                {showMobileFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid grid-cols-2 gap-2 pt-1 lg:hidden"
                  >
                    {filterOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          filterStatus === status
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {getStatusLabel(status)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsActionModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition-transform active:scale-90 sm:hidden"
        >
          <Plus className="size-8" />
        </button>

        <div className="grid grid-cols-1 gap-4 lg:hidden">
          {isTableLoading ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }
              title="Loading payments..."
              description="Please wait while payment records are being retrieved."
            />
          ) : hasNoPayments ? (
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
              className="rounded-2xl border border-gray-200 bg-white px-6 py-16 shadow-sm"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-3xl bg-gray-50 p-5 shadow-sm">
                  <Search className="size-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  No matching payments found
                </h3>
                <p className="mt-1 max-w-sm text-sm text-gray-500">
                  Try adjusting your search term or payment status filter.
                </p>
              </div>
            </motion.div>
          ) : (
            paymentViews.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-gray-400">
                      {payment.publicId ?? payment.id}
                    </p>
                    <h3 className="mt-1 truncate text-sm font-semibold text-gray-900">
                      {payment.userFullName}
                    </h3>

                    {payment.category && payment.category !== 'payment' && (
                      <div className="mt-2">
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                          {getPaymentCategoryLabel(payment.category).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusColors[payment.derivedStatus]}`}
                  >
                    {payment.derivedStatus === 'paid'
                      ? 'VERIFIED'
                      : payment.derivedStatus === 'partial'
                      ? 'PARTIAL'
                      : 'PENDING'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ReceiptText className="size-4 text-gray-400" />
                    <span className="truncate">
                      Reservation: {payment.reservationPublicId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarDays className="size-4 text-gray-400" />
                    <span>{payment.dateLabel}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-900">
                    <BadgeDollarSign className="size-4 text-gray-400" />
                    <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                  </div>

                  {payment.refundedAmount > 0 && (
                    <div className="text-xs font-medium text-amber-600">
                      Refunded: {formatCurrency(payment.refundedAmount)}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setSelectedPayment(payment.id)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                  >
                    <Eye className="size-4" />
                    View
                  </button>

                  {payment.status === 'unpaid' && (
                    <>
                      <button
                        onClick={() => handleVerify(payment)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100"
                      >
                        <CheckCircle className="size-4" />
                        Verify
                      </button>

                      <button
                        onClick={() => handleReject(payment.id)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                      >
                        <XCircle className="size-4" />
                        Reject
                      </button>
                    </>
                  )}

                  {payment.status === 'paid' && payment.remainingRefundableAmount > 0 && (
                    <button
                      onClick={() => openRefundModal(payment)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-600 transition hover:bg-amber-100"
                    >
                      Refund
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden lg:block">
          {isTableLoading ? (
            <EmptyState
              icon={
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                </div>
              }
              title="Loading payments..."
              description="Please wait while payment records are being retrieved."
            />
          ) : hasNoPayments ? (
            <EmptyState
              icon={<CreditCard className="size-10 text-blue-500" />}
              title="No payments yet"
              description="Payment records will appear here once customers submit payments or an administrator creates one."
            />
          ) : hasNoSearchResults ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-20 shadow-sm">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center text-center"
              >
                <div className="mb-4 rounded-3xl bg-gray-50 p-5 shadow-sm">
                  <Search className="size-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  No matching payments found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search term or payment status filter.
                </p>
              </motion.div>
            </div>
          ) : (
            <DataTable
              headers={[
                'User ID',
                'Payment ID',
                'Reservation ID',
                'Amount Progress',
                'Date',
                'Status',
                'Proof',
                'Actions',
              ]}
            >
              {paymentViews.map((payment) => (
                <tr key={payment.id} className="transition-colors hover:bg-blue-50/30">
                  <DataCell
                    value={payment.userPublicId}
                    mono
                    nowrap
                    className="w-[180px]"
                  />

                  <td className="w-[200px] px-4 py-2.5 align-middle">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-sm text-gray-900">
                        {payment.publicId ?? payment.id}
                      </div>

                      {payment.category && payment.category !== 'payment' && (
                        <div className="mt-1">
                          <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                            {getPaymentCategoryLabel(payment.category).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  <DataCell
                    value={payment.reservationPublicId}
                    mono
                    nowrap
                    className="w-[200px]"
                  />

                  <td className="w-[260px] px-4 py-2.5 align-middle">
                    <div className="min-w-0">
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-all"
                          style={{
                            width: `${
                              payment.progress > 0
                                ? Math.max(Math.min(payment.progress, 100), 2)
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-gray-600">
                        <span>
                          {formatCurrency(payment.reservationPaidAmount)} /{' '}
                          {formatCurrency(payment.reservationTotalAmount)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {payment.progress < 1
                            ? payment.progress.toFixed(2)
                            : payment.progress.toFixed(0)}
                          %
                        </span>
                      </div>

                      {payment.refundedAmount > 0 && (
                        <div className="mt-1 text-[11px] font-medium text-amber-600">
                          Refunded: {formatCurrency(payment.refundedAmount)}
                        </div>
                      )}
                    </div>
                  </td>

                  <DataCell
                    value={payment.dateLabel}
                    muted
                    nowrap
                    className="w-[150px]"
                  />

                  <td className="w-[120px] px-4 py-2.5 align-middle">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusColors[payment.derivedStatus]}`}
                    >
                      {payment.derivedStatus === 'paid'
                        ? 'VERIFIED'
                        : payment.derivedStatus === 'partial'
                        ? 'PARTIAL'
                        : 'PENDING'}
                    </span>
                  </td>

                  <td className="w-[120px] px-4 py-2.5 align-middle">
                    {payment.proofOfPayment ? (
                      <button
                        onClick={() => setProofImageUrl(payment.proofOfPayment || null)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
                      >
                        <ImageIcon className="size-4" />
                        View Proof
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>

                  <ActionCell className="w-[140px]">
                    <button
                      onClick={() => setSelectedPayment(payment.id)}
                      className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-100"
                      title="View"
                    >
                      <Eye className="size-4" />
                    </button>

                    {payment.status === 'unpaid' && (
                      <>
                        <button
                          onClick={() => handleVerify(payment)}
                          className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-50"
                          title="Verify"
                        >
                          <CheckCircle className="size-4" />
                        </button>

                        <button
                          onClick={() => handleReject(payment.id)}
                          className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                          title="Reject"
                        >
                          <XCircle className="size-4" />
                        </button>
                      </>
                    )}

                    {payment.status === 'paid' && payment.remainingRefundableAmount > 0 && (
                      <button
                        onClick={() => openRefundModal(payment)}
                        className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50"
                        title="Refund"
                      >
                        💸
                      </button>
                    )}
                  </ActionCell>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        {!isTableLoading && !hasNoPayments && totalPages > 1 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} • {totalCount} total payments
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Go to</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={handlePageInputKeyDown}
                  className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handlePageJump}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Go
                </button>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {isActionModalOpen && (
          <AdminActionModal
            actionType="payment"
            onClose={() => setIsActionModalOpen(false)}
          />
        )}

        <AnimatePresence>
          {selectedPaymentData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 "
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      User:{' '}
                      <span className="font-medium text-gray-700">
                        {selectedPaymentData.userFullName}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="space-y-5 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-gray-500">Payment ID</div>
                    <div className="font-mono text-gray-900">
                      {selectedPaymentData.publicId ?? selectedPaymentData.id}
                    </div>

                    <div className="text-gray-500">Reservation ID</div>
                    <div className="font-mono text-gray-900">
                      {selectedPaymentData.reservationPublicId}
                    </div>

                    <div className="text-gray-500">User ID</div>
                    <div className="font-mono text-gray-900">
                      {selectedPaymentData.userPublicId}
                    </div>

                    <div className="text-gray-500">Unit</div>
                    <div className="text-gray-900">{selectedPaymentData.unitName}</div>

                    <div className="text-gray-500">Category</div>
                    <div className="text-gray-900">
                      {getPaymentCategoryLabel(selectedPaymentData.category)}
                    </div>

                    <div className="text-gray-500">Amount</div>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(selectedPaymentData.amount)}
                    </div>

                    <div className="text-gray-500">Refunded</div>
                    <div className="text-gray-900">
                      {formatCurrency(selectedPaymentData.refundedAmount)}
                    </div>

                    <div className="text-gray-500">Refundable Left</div>
                    <div className="text-gray-900">
                      {formatCurrency(selectedPaymentData.remainingRefundableAmount)}
                    </div>

                    <div className="text-gray-500">Method</div>
                    <div className="capitalize text-gray-900">
                      {selectedPaymentData.method.replace('_', ' ')}
                    </div>

                    <div className="text-gray-500">Date</div>
                    <div className="text-gray-900">{selectedPaymentData.dateLabel}</div>

                    <div className="text-gray-500">Status</div>
                    <div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[selectedPaymentData.derivedStatus]}`}
                      >
                        {selectedPaymentData.derivedStatus === 'paid'
                          ? 'VERIFIED'
                          : selectedPaymentData.derivedStatus === 'partial'
                          ? 'PARTIAL'
                          : 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {selectedPaymentData.notes && (
                    <div>
                      <p className="mb-1 text-sm text-gray-600">Notes</p>
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
                        {selectedPaymentData.notes}
                      </div>
                    </div>
                  )}

                  {selectedPaymentData.proofOfPayment && (
                    <div>
                      <p className="mb-2 text-sm text-gray-600">Proof of Payment</p>
                      <button
                        onClick={() =>
                          setProofImageUrl(selectedPaymentData.proofOfPayment || null)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100"
                      >
                        <ImageIcon className="size-4" />
                        View Proof
                      </button>
                    </div>
                  )}

                  {selectedPaymentData.status === 'unpaid' && (
                    <div className="flex gap-3 border-t border-gray-200 pt-4">
                      <button
                        onClick={() => handleReject(selectedPaymentData.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-white transition hover:bg-rose-700"
                      >
                        <XCircle className="size-5" />
                        Reject
                      </button>

                      <button
                        onClick={() => handleVerify(selectedPaymentData)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-white transition hover:bg-emerald-700"
                      >
                        <CheckCircle className="size-5" />
                        Verify Payment
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {refundPayment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setRefundPayment(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Issue Refund</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Payment:{' '}
                      <span className="font-medium text-gray-700">
                        {refundPayment.publicId ?? refundPayment.id}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => setRefundPayment(null)}
                    className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <div className="space-y-4 p-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Refund Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={refundPayment.remainingRefundableAmount}
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      placeholder="Enter refund amount"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Refundable amount left:{' '}
                      {formatCurrency(refundPayment.remainingRefundableAmount)}
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Reason / Notes
                    </label>
                    <textarea
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      placeholder="Enter refund reason"
                    />
                  </div>

                  <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {refundPayment.category === 'security_deposit'
                      ? 'This will create a security deposit refund ledger entry.'
                      : refundPayment.category === 'advance_deposit'
                      ? 'This will create an advance deposit refund ledger entry and update the reservation payment totals.'
                      : 'This will create a refund ledger entry and update the reservation payment totals.'}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setRefundPayment(null)}
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleRefund}
                      disabled={
                        !refundAmount ||
                        Number(refundAmount) <= 0 ||
                        Number(refundAmount) > refundPayment.remainingRefundableAmount ||
                        !refundNotes.trim()
                      }
                      className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirm Refund
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {proofImageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg"
              onClick={() => setProofImageUrl(null)}
            >
              <button
                onClick={() => setProofImageUrl(null)}
                className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                title="Close"
              >
                <X className="size-7" />
              </button>

              <div className="p-4">
                <img
                  src={proofImageUrl}
                  alt="Proof of Payment"
                  className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}