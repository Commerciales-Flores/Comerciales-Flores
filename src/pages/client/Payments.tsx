import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import type { LedgerEntry } from '../../data/types';
import { usePaymentMethods } from '../../contexts/PaymentMethodsContext';
import { formatDate, formatDateTime } from '../../utils/date';
import {
  CreditCard,
  CheckCircle2,
  Clock3,
  Plus,
  FileDown,
  X,
  XCircle,
  Trash2,
  Eye,
  Search,
  Wallet,
  Landmark,
  Image as ImageIcon,
  ReceiptText,
  CircleDollarSign,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { getUnitTypeLabel } from '../../utils/propertyHelpers';
import Papa from 'papaparse';
import { formatCurrency } from '../../utils/currency';
import { uiTypography } from '../../styles/uiTypography';
import EmptyState from '../../components/common/EmptyState';

const PAYMENT_STATUS_COLORS = {
  paid: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  unpaid: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  partial: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
} as const;

const PAYMENT_STATUS_ICONS = {
  paid: CheckCircle2,
  unpaid: Clock3,
  partial: Clock3,
} as const;

const buildInitialPaymentForm = (defaultMethod = 'gcash') => ({
  amount: '',
  method: defaultMethod,
  proofOfPayment: '',
  notes: '',
});

const UNIT_TYPE_COLORS: Record<string, string> = {
  rental_space: 'text-indigo-600',
  function_hall: 'text-purple-600',
  parking_slot: 'text-orange-600',
};

function formatPaymentMethod(method?: string | null) {
  if (!method) return 'N/A';

  return method
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSafeDate(value?: string | Date | null) {
  if (!value) return new Date(0);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getReservationProgress(totalAmount?: number, paidAmount?: number) {
  if (!totalAmount || totalAmount <= 0) return 0;
  return clampPercentage((Number(paidAmount || 0) / Number(totalAmount)) * 100);
}

export default function ClientPayments() {
  const { user } = useAuth();
  const {
    getReservationsByUserId,
    getPaymentsByUserId,
    getLedgerByUserId,
    addPayment,
  } = useData();
  const { sendSystemNotification } = useNotifications();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState(buildInitialPaymentForm());

  const { activePaymentMethods, getPaymentMethodByCode } = usePaymentMethods();

  const defaultPaymentMethod = useMemo(() => {
    return activePaymentMethods[0]?.methodCode ?? 'gcash';
  }, [activePaymentMethods]);

  const selectedPaymentMethodConfig = useMemo(() => {
    return getPaymentMethodByCode(paymentForm.method) ?? null;
  }, [getPaymentMethodByCode, paymentForm.method]);

  const fullName = useMemo(
    () => `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
    [user?.firstName, user?.lastName]
  );

  const userReservations = useMemo(
    () => getReservationsByUserId(user?.id || ''),
    [getReservationsByUserId, user?.id]
  );

  const userPayments = useMemo(
    () => getPaymentsByUserId(user?.id || ''),
    [getPaymentsByUserId, user?.id]
  );

  const userLedger = useMemo(
    () => getLedgerByUserId(user?.id || ''),
    [getLedgerByUserId, user?.id]
  );

  const reservationMap = useMemo(() => {
    return new Map(userReservations.map((reservation) => [reservation.id, reservation]));
  }, [userReservations]);

  const ledgerByPaymentId = useMemo(() => {
    const map = new Map<string, LedgerEntry>();

    userLedger.forEach((entry: LedgerEntry) => {
      if (entry.paymentId) {
        map.set(entry.paymentId, entry);
      }
    });

    return map;
  }, [userLedger]);

  const hasPayments = userPayments.length > 0;

  const eligibleReservations = useMemo(() => {
    return userReservations.filter(
      (reservation) =>
        ['approved', 'confirmed', 'completed'].includes(reservation.status) &&
        reservation.paidAmount < reservation.totalAmount
    );
  }, [userReservations]);

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const list = userPayments.filter((payment) => {
      if (!query) return true;

      const reservation = reservationMap.get(payment.reservationId);
      const ledgerEntry = ledgerByPaymentId.get(payment.id);

      return (
        payment.id.toLowerCase().includes(query) ||
        String(payment.method).toLowerCase().includes(query) ||
        payment.notes?.toLowerCase().includes(query) ||
        payment.amount.toString().includes(query) ||
        payment.status?.toLowerCase().includes(query) ||
        reservation?.unitName?.toLowerCase().includes(query) ||
        reservation?.publicId?.toLowerCase().includes(query) ||
        reservation?.id?.toLowerCase().includes(query) ||
        ledgerEntry?.referenceNo?.toLowerCase().includes(query) ||
        ledgerEntry?.description?.toLowerCase().includes(query)
      );
    });

    return [...list].sort(
      (a, b) => getSafeDate(b.date).getTime() - getSafeDate(a.date).getTime()
    );
  }, [userPayments, reservationMap, ledgerByPaymentId, searchQuery]);

  const paymentOverview = useMemo(() => {
  const totalPaid = userLedger
    .filter((e) =>
      ['payment', 'deposit', 'balance'].includes(e.entryType)
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const refunds = userLedger
    .filter((e) => e.entryType === 'refund')
    .reduce((sum, e) => sum + e.amount, 0);

  const discounts = userLedger
    .filter((e) => e.entryType === 'discount')
    .reduce((sum, e) => sum + e.amount, 0);

  const penalties = userLedger
    .filter((e) => e.entryType === 'penalty')
    .reduce((sum, e) => sum + e.amount, 0);

  const netPaid = totalPaid - refunds - discounts + penalties;

  const grandTotal = userReservations.reduce(
    (sum, r) => sum + Number(r.totalAmount || 0),
    0
  );

  const totalPaidAcrossReservations = userReservations.reduce(
    (sum, r) => sum + Number(r.paidAmount || 0),
    0
  );

  const overallProgress = getReservationProgress(
    grandTotal,
    totalPaidAcrossReservations
  );

  const pendingAmount = userPayments
  .filter((p) => p.status === 'unpaid')
  .reduce((sum, p) => sum + p.amount, 0);

  const partialAmount = userPayments
  .filter((p) => p.status === 'partial')
  .reduce((sum, p) => sum + p.amount, 0);

  return {
    totalPaid: netPaid,
    pendingAmount: pendingAmount, // optional (can remove entirely)
    partialAmount: partialAmount,
    transactions: userPayments.length,
    grandTotal,
    totalPaidAcrossReservations,
    overallProgress,
  };
}, [userLedger, userReservations, userPayments]);

  const outstandingTotal = useMemo(() => {
    return eligibleReservations.reduce((sum, reservation) => {
      return sum + (reservation.totalAmount - reservation.paidAmount);
    }, 0);
  }, [eligibleReservations]);

  const clearProofPreview = useCallback(() => {
    setProofFile(null);
    setProofPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const resetPaymentModalState = useCallback(() => {
    setShowPaymentModal(false);
    setSelectedReservation(null);
    setPaymentForm(buildInitialPaymentForm(defaultPaymentMethod));
    setPaymentSuccess(false);
    setIsSubmitting(false);
    clearProofPreview();
  }, [clearProofPreview, defaultPaymentMethod]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isValidType = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type);
      if (!isValidType) {
        alert('Please upload a PNG, JPG, or JPEG image.');
        return;
      }

      setProofFile(file);

      setProofPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    []
  );

  const handleRemoveImage = useCallback(() => {
    clearProofPreview();
  }, [clearProofPreview, defaultPaymentMethod]);

  const handleMakePayment = useCallback(
    (reservationId: string) => {
      setSelectedReservation(reservationId);
      setPaymentForm(buildInitialPaymentForm(defaultPaymentMethod));
      setPaymentSuccess(false);
      setIsSubmitting(false);
      clearProofPreview();
      setShowPaymentModal(true);
    },
    [clearProofPreview]
  );

  const selectedReservationData = useMemo(() => {
    if (!selectedReservation) return null;
    return reservationMap.get(selectedReservation) ?? null;
  }, [selectedReservation, reservationMap]);

  const selectedReservationBalance = useMemo(() => {
    if (!selectedReservationData) return 0;
    return selectedReservationData.totalAmount - selectedReservationData.paidAmount;
  }, [selectedReservationData]);

  const handlePaymentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedReservation || !user || isSubmitting) return;

      const reservation = reservationMap.get(selectedReservation);
      if (!reservation) return;

      const amount = parseFloat(paymentForm.amount);
      const balance = reservation.totalAmount - reservation.paidAmount;

      if (Number.isNaN(amount) || amount <= 0 || amount > balance) {
        alert('Please enter a valid payment amount.');
        return;
      }

      try {
        setIsSubmitting(true);

        await Promise.resolve(
          addPayment({
            reservationId: selectedReservation,
            userId: user.id,
            amount,
            method: paymentForm.method as any,
            paymentMethodId: selectedPaymentMethodConfig?.id ?? null,
            paymentMethodSnapshot: selectedPaymentMethodConfig
              ? {
                  method_code: selectedPaymentMethodConfig.methodCode,
                  display_name: selectedPaymentMethodConfig.displayName,
                  account_name: selectedPaymentMethodConfig.accountName,
                  account_number: selectedPaymentMethodConfig.accountNumber,
                  mobile_number: selectedPaymentMethodConfig.mobileNumber,
                  bank_name: selectedPaymentMethodConfig.bankName,
                  branch_name: selectedPaymentMethodConfig.branchName,
                  qr_image_path: selectedPaymentMethodConfig.qrImagePath,
                  instructions: selectedPaymentMethodConfig.instructions,
                }
              : null,
            status: 'unpaid',
            proofOfPayment: proofPreviewUrl || '',
            notes: paymentForm.notes,
          })
        );

        sendSystemNotification(
          user.id,
          'Payment Submitted',
          `Your payment of ${formatCurrency(amount)} for ${reservation.unitName} is pending verification.`
        );

        setPaymentSuccess(true);

        setTimeout(() => {
          resetPaymentModalState();
        }, 1800);
      } catch (error) {
        console.error('Failed to submit payment:', error);
        alert('Failed to submit payment. Please try again.');
        setIsSubmitting(false);
      }
    },
    [
      selectedReservation,
      user,
      isSubmitting,
      reservationMap,
      paymentForm.amount,
      paymentForm.method,
      paymentForm.notes,
      addPayment,
      selectedPaymentMethodConfig,
      proofPreviewUrl,
      sendSystemNotification,
      resetPaymentModalState,
    ]
  );

  const handleDownloadInvoice = useCallback(
    (payment: any) => {
      const reservation = reservationMap.get(payment.reservationId);
      const ledgerEntry = ledgerByPaymentId.get(payment.id);

      if (!ledgerEntry) {
        alert(
          'Invoice is not available yet. It can be downloaded once this payment has been verified and posted to the ledger.'
        );
        return;
      }

      const invoiceNumber = ledgerEntry.id || payment.id;
      const invoiceDate = ledgerEntry.recordedAt || payment.date;
      const amount = Number(ledgerEntry.amount ?? payment.amount) || 0;
      const remaining =
        Number(reservation?.totalAmount || 0) - Number(reservation?.paidAmount || 0);

      const invoiceContent = `
========================================
INVOICE
========================================

INVOICE NO:      ${invoiceNumber}
INVOICE DATE:    ${formatDate(invoiceDate)}

----------------------------------------
CUSTOMER
----------------------------------------
Name:            ${fullName || 'N/A'}
Email:           ${user?.email ?? 'N/A'}

----------------------------------------
PAYMENT
----------------------------------------
Payment ID:      ${payment.id}
Method:          ${formatPaymentMethod(ledgerEntry.method || payment.method)}
Status:          ${String(ledgerEntry.status || payment.status || 'N/A').toUpperCase()}
Submitted On:    ${formatDate(payment.date)}
Reference No:    ${ledgerEntry.referenceNo || 'N/A'}

----------------------------------------
LEDGER ENTRY
----------------------------------------
Ledger ID:       ${ledgerEntry.id}
Entry Type:      ${formatPaymentMethod(ledgerEntry.entryType)}
Recorded Date:   ${formatDate(ledgerEntry.recordedAt)}
Amount:          ${formatCurrency(amount)}

----------------------------------------
RESERVATION
----------------------------------------
Reservation ID:  ${reservation?.publicId ?? reservation?.id ?? 'N/A'}
Unit:            ${reservation?.unitName ?? 'N/A'}
Unit Type:       ${reservation ? getUnitTypeLabel(reservation.unitType) : 'N/A'}
Total Bill:      ${formatCurrency(reservation?.totalAmount || 0)}
Paid To Date:    ${formatCurrency(reservation?.paidAmount || 0)}
Remaining:       ${formatCurrency(remaining)}

----------------------------------------
DESCRIPTION
----------------------------------------
${ledgerEntry.description?.trim() || 'No description provided.'}

----------------------------------------
NOTES
----------------------------------------
${ledgerEntry.notes?.trim() || payment.notes?.trim() || 'No notes provided.'}

Thank you for your payment.
      `.trim();

      const blob = new Blob([invoiceContent], {
        type: 'text/plain;charset=utf-8',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoiceNumber}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [ledgerByPaymentId, reservationMap, fullName, user?.email]
  );

  const handleExportCSV = useCallback(() => {
    const csvData = userPayments.map((payment) => {
      const reservation = reservationMap.get(payment.reservationId);
      const ledgerEntry = ledgerByPaymentId.get(payment.id);

      return {
        'Payment ID': payment.id,
        'Payment Date': formatDate(payment.date),
        'Reservation ID': reservation?.publicId ?? payment.reservationId,
        'Unit Name': reservation?.unitName ?? 'N/A',
        'Unit Type': reservation ? getUnitTypeLabel(reservation.unitType) : 'N/A',
        Amount: payment.amount,
        'Payment Method': formatPaymentMethod(payment.method),
        'Payment Status': payment.status,
        'Ledger ID': ledgerEntry?.id ?? '',
        'Ledger Entry Type': ledgerEntry?.entryType ?? '',
        'Ledger Status': ledgerEntry?.status ?? '',
        'Reference No': ledgerEntry?.referenceNo ?? '',
        Notes: payment.notes ?? '',
      };
    });


    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `payment_history_${fullName.replace(/\s+/g, '_') || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [userPayments, reservationMap, ledgerByPaymentId, fullName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingImage) {
          setViewingImage(null);
          return;
        }

        if (showPaymentModal) {
          resetPaymentModalState();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingImage, showPaymentModal, resetPaymentModalState]);

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }
    };
  }, [proofPreviewUrl]);

  const shouldShowOverview = hasPayments || eligibleReservations.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header>
          <h1 className={uiTypography.pageTitle}>Payments</h1>
          <p className={uiTypography.pageDescription}>
            View balances, track progress, submit payments, and download invoices.
          </p>
        </header>
        

        {shouldShowOverview && (
  <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
    <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
      <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className={`${uiTypography.miniStatLabel} text-emerald-700/80`}>
              Total Paid
            </p>
            <p className={`${uiTypography.cardTitle} mt-2 text-slate-900`}>
              {formatCurrency(paymentOverview.totalPaid)}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
            <CheckCircle2 className="size-5" />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className={`${uiTypography.miniStatLabel} text-amber-700/80`}>
              Pending
            </p>
            <p className={`${uiTypography.cardTitle} mt-2 text-slate-900`}>
              {formatCurrency(paymentOverview.pendingAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-700">
            <Clock3 className="size-5" />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className={`${uiTypography.miniStatLabel} text-rose-700/80`}>
              Outstanding
            </p>
            <p className={`${uiTypography.cardTitle} mt-2 text-slate-900`}>
              {formatCurrency(outstandingTotal)}
            </p>
          </div>
          <div className="rounded-2xl bg-rose-100 p-2.5 text-rose-700">
            <AlertCircle className="size-5" />
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className={`${uiTypography.miniStatLabel} text-sky-700/80`}>
              Transactions
            </p>
            <p className={`${uiTypography.cardTitle} mt-2 text-slate-900`}>
              {paymentOverview.transactions}
            </p>
          </div>
          <div className="rounded-2xl bg-sky-100 p-2.5 text-sky-700">
            <CircleDollarSign className="size-5" />
          </div>
        </div>
      </div>
    </div>
  </section>
)}

        {eligibleReservations.length > 0 && (
          <section className="rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={uiTypography.sectionTitle}>Balance due</h2>
                  <p className={uiTypography.sectionDescription}>
                    You have {eligibleReservations.length}{' '}
                    {eligibleReservations.length === 1 ? 'reservation' : 'reservations'} with
                    remaining balances.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-2">
              {eligibleReservations.map((reservation) => {
                const balance = reservation.totalAmount - reservation.paidAmount;
                const progress = getReservationProgress(
                  reservation.totalAmount,
                  reservation.paidAmount
                );

                return (
                  <div
                    key={reservation.id}
                    className="rounded-[26px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className={`${uiTypography.sectionTitle} truncate`}>
                          {reservation.unitName}
                        </h3>
                        <p className={uiTypography.cardSubtitle}>
                          Reservation ID: {reservation.publicId || reservation.id}
                        </p>
                        <p
                          className={`${uiTypography.badgeLabel} mt-1 ${
                            UNIT_TYPE_COLORS[reservation.unitType] || 'text-slate-400'
                          }`}
                        >
                          {getUnitTypeLabel(reservation.unitType)}
                        </p>
                      </div>

                      <button
                        onClick={() => handleMakePayment(reservation.id)}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-2.5 text-white transition hover:opacity-95 ${uiTypography.buttonText}`}
                      >
                        <Plus className="size-4" />
                        Pay
                      </button>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className={`${uiTypography.miniStatLabel} text-slate-500`}>
                          Payment Progress
                        </p>
                        <p className={`${uiTypography.miniStatValue} text-slate-700`}>
                          {progress.toFixed(0)}%
                        </p>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                        <p className={`${uiTypography.infoBlockLabel} text-slate-400`}>Total</p>
                        <p className={`${uiTypography.infoBlockValue} text-slate-900`}>
                          {formatCurrency(reservation.totalAmount)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                        <p className={`${uiTypography.infoBlockLabel} text-slate-400`}>Paid</p>
                        <p className={`${uiTypography.infoBlockValue} text-emerald-600`}>
                          {formatCurrency(reservation.paidAmount)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                        <p className={`${uiTypography.infoBlockLabel} text-slate-400`}>
                          Balance
                        </p>
                        <p className={`${uiTypography.infoBlockValue} text-rose-600`}>
                          {formatCurrency(balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {hasPayments ? (
          <section className="rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className={`${uiTypography.sectionTitle} flex items-center gap-2`}>
                    <Clock3 className="size-5 text-slate-500" />
                    Payment history
                  </h2>
                  <p className={uiTypography.sectionDescription}>
                    Review submitted payments and download invoice copies once verified.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                  <div className="relative w-full lg:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by reservation, amount, method..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${uiTypography.inputText}`}
                    />
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 text-white transition hover:opacity-95 ${uiTypography.buttonText}`}
                  >
                    <FileDown className="size-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {filteredPayments.length > 0 ? (
              <div className="grid gap-4 p-5 sm:p-6">
                {filteredPayments.map((payment) => {
                  const reservation = reservationMap.get(payment.reservationId);
                  const ledgerEntry = ledgerByPaymentId.get(payment.id);
                  const progress = getReservationProgress(
                    reservation?.totalAmount || 0,
                    reservation?.paidAmount || 0
                  );
                  const StatusIcon =
                    PAYMENT_STATUS_ICONS[
                      payment.status as keyof typeof PAYMENT_STATUS_ICONS
                    ];

                  return (
                    <div
                      key={payment.id}
                      className="overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-5 py-4 sm:px-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${uiTypography.badgeLabel} ${
                                  PAYMENT_STATUS_COLORS[
                                    payment.status as keyof typeof PAYMENT_STATUS_COLORS
                                  ]
                                }`}
                              >
                                <StatusIcon className="size-3.5" />
                                {String(payment.status)}
                              </span>

                              <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200 ${uiTypography.helperText} font-medium text-slate-600`}>
                                <Landmark className="size-3.5" />
                                {formatPaymentMethod(payment.method)}
                              </span>

                              {ledgerEntry ? (
                                <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 ring-1 ring-emerald-200 ${uiTypography.helperText} font-medium text-emerald-700`}>
                                  <ReceiptText className="size-3.5" />
                                  Posted to ledger
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 ring-1 ring-amber-200 ${uiTypography.helperText} font-medium text-amber-700`}>
                                  <Clock3 className="size-3.5" />
                                  Awaiting posting
                                </span>
                              )}
                            </div>

                            <div className="mt-3">
                              <h3 className={`${uiTypography.cardTitle} text-slate-900`}>
                                {formatCurrency(payment.amount)}
                              </h3>
                              <p className={uiTypography.cardSubtitle}>
                                Paid on {formatDate(payment.date)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadInvoice(payment)}
                            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition ${
                              ledgerEntry
                                ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                            title={
                              ledgerEntry
                                ? 'Download invoice'
                                : 'Invoice available after ledger posting'
                            }
                            aria-label="Download invoice"
                          >
                            <FileDown className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className={`${uiTypography.sectionTitle} truncate`}>
                                {reservation?.unitName ?? 'Unknown Unit'}
                              </h4>
                              <p className={`${uiTypography.badgeLabel} mt-1 text-slate-400`}>
                                {reservation ? getUnitTypeLabel(reservation.unitType) : 'N/A'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {payment.proofOfPayment && (
                                <button
                                  onClick={() => setViewingImage(payment.proofOfPayment || null)}
                                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 ${uiTypography.buttonText}`}
                                >
                                  <Eye className="size-3.5" />
                                  Proof
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDownloadInvoice(payment)}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 transition ${uiTypography.buttonText} ${
                                  ledgerEntry
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'cursor-not-allowed bg-slate-200 text-slate-500'
                                }`}
                              >
                                <FileDown className="size-3.5" />
                                Invoice
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-white bg-white p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <p className={`${uiTypography.miniStatLabel} text-slate-400`}>
                                Reservation Payment Progress
                              </p>
                              <div className={`inline-flex items-center gap-1 ${uiTypography.miniStatValue} text-slate-700`}>
                                {progress.toFixed(0)}%
                                <ArrowUpRight className="size-4 text-slate-400" />
                              </div>
                            </div>

                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <span className={`block ${uiTypography.infoBlockLabel}`}>
                                Reservation ID
                              </span>
                              <span className={`block ${uiTypography.infoBlockValue}`}>
                                {reservation?.publicId ?? reservation?.id ?? 'N/A'}
                              </span>
                            </div>

                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <span className={`block ${uiTypography.infoBlockLabel}`}>
                                Total Bill
                              </span>
                              <span className={`block ${uiTypography.infoBlockValue}`}>
                                {formatCurrency(reservation?.totalAmount || 0)}
                              </span>
                            </div>

                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <span className={`block ${uiTypography.infoBlockLabel}`}>
                                Paid To Date
                              </span>
                              <span className={`block ${uiTypography.infoBlockValue} text-emerald-600`}>
                                {formatCurrency(reservation?.paidAmount || 0)}
                              </span>
                            </div>

                            <div className="rounded-2xl border border-white bg-white px-3 py-3">
                              <span className={`block ${uiTypography.infoBlockLabel}`}>
                                Remaining
                              </span>
                              <span className={`block ${uiTypography.infoBlockValue} text-rose-600`}>
                                {formatCurrency(
                                  Number(reservation?.totalAmount || 0) -
                                    Number(reservation?.paidAmount || 0)
                                )}
                              </span>
                            </div>
                          </div>

                          {ledgerEntry && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl border border-white bg-white p-4">
                                <p className={uiTypography.infoBlockLabel}>Ledger Entry</p>
                                <p className={`${uiTypography.infoBlockValue} text-slate-900`}>
                                  {ledgerEntry.publicId || ledgerEntry.id}
                                </p>
                                <p className={uiTypography.helperText}>
                                  {formatPaymentMethod(ledgerEntry.entryType)} ·{' '}
                                  {formatPaymentMethod(ledgerEntry.status)}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white bg-white p-4">
                                <p className={uiTypography.infoBlockLabel}>Reference No</p>
                                <p className={`${uiTypography.infoBlockValue} text-slate-900`}>
                                  {ledgerEntry.referenceNo || 'N/A'}
                                </p>
                                <p className={uiTypography.helperText}>
                                  Recorded {formatDate(ledgerEntry.recordedAt)}
                                </p>
                              </div>
                            </div>
                          )}

                          {payment.notes && (
                            <div className="mt-4 rounded-2xl border border-white bg-white p-4">
                              <p className={uiTypography.infoBlockLabel}>Notes</p>
                              <p className={`${uiTypography.bodyText} mt-2 text-slate-600`}>
                                {payment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 sm:p-8">
                <EmptyState
                  icon={<Search className="size-10 text-blue-500" />}
                  title="No matching payments found"
                  description="Try searching by reservation ID, unit name, amount, payment method, or status."
                />

                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => setSearchQuery('')}
                    className={`inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-slate-700 transition hover:bg-slate-50 ${uiTypography.buttonText}`}
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : eligibleReservations.length === 0 ? (
          <EmptyState
  icon={<CreditCard className="size-10 text-blue-500" />}
  title="No payments yet"
  description="Your payment history will appear here once you make a payment for an approved reservation."
/>
        ) : null}

        {showPaymentModal && selectedReservation && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={resetPaymentModalState}
          >
            <div
              className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-slate-100 bg-white px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={uiTypography.modalTitle}>Make Payment</h2>
                    <p className={uiTypography.modalBody}>
                      Submit your payment and upload proof for verification.
                    </p>
                  </div>

                  <button
                    onClick={resetPaymentModalState}
                    className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <XCircle className="size-6" />
                  </button>
                </div>
              </div>

              {paymentSuccess ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-50 text-emerald-500">
                    <CheckCircle2 className="size-10" />
                  </div>
                  <h3 className={uiTypography.cardTitle}>Payment Submitted</h3>
                  <p className={uiTypography.modalBody}>
                    Your payment is now pending admin verification.
                  </p>
                </div>
              ) : (
                <form
                  id="payment-form"
                  onSubmit={handlePaymentSubmit}
                  className="space-y-5 overflow-y-auto p-6"
                >
                  <div className="grid gap-5">
                    <div>
                      <label className={`${uiTypography.formLabel} mb-2 ml-0`}>
                        Payment Amount (₱)
                      </label>
                      <div className="relative">
                        <Wallet className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          max={selectedReservationBalance}
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              amount: e.target.value,
                            }))
                          }
                          className={`w-full rounded-2xl border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${uiTypography.inputText}`}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`${uiTypography.formLabel} mb-2 ml-0`}>
                        Payment Method
                      </label>
                      <select
                        value={paymentForm.method}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            method: e.target.value,
                          }))
                        }
                        className={`w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${uiTypography.inputText}`}
                      >
                        {activePaymentMethods.map((method) => (
                          <option key={method.id} value={method.methodCode}>
                            {method.displayName}
                          </option>
                        ))}
                      </select>
                      {selectedPaymentMethodConfig && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h3 className={`${uiTypography.formLabel} mb-2 ml-0`}>
                          Send payment to {selectedPaymentMethodConfig.displayName}
                        </h3>

                        <div className={`space-y-2 ${uiTypography.bodyText} text-slate-600`}>
                          {selectedPaymentMethodConfig.bankName && (
                            <p>Bank: {selectedPaymentMethodConfig.bankName}</p>
                          )}
                          {selectedPaymentMethodConfig.branchName && (
                            <p>Branch: {selectedPaymentMethodConfig.branchName}</p>
                          )}
                          {selectedPaymentMethodConfig.accountName && (
                            <p>Account Name: {selectedPaymentMethodConfig.accountName}</p>
                          )}
                          {selectedPaymentMethodConfig.accountNumber && (
                            <p>Account Number: {selectedPaymentMethodConfig.accountNumber}</p>
                          )}
                          {selectedPaymentMethodConfig.mobileNumber && (
                            <p>Mobile Number: {selectedPaymentMethodConfig.mobileNumber}</p>
                          )}
                        </div>

                        {selectedPaymentMethodConfig.qrImageUrl && (
                          <img
                            src={selectedPaymentMethodConfig.qrImageUrl}
                            alt={`${selectedPaymentMethodConfig.displayName} QR`}
                            className="mt-4 h-56 w-56 rounded-xl border border-slate-200 bg-white object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        )}

                        {selectedPaymentMethodConfig.instructions && (
                          <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-600">
                            {selectedPaymentMethodConfig.instructions}
                          </div>
                        )}
                      </div>
                    )}
                    </div>

                    <div>
                      <label className={`${uiTypography.formLabel} mb-2 ml-0`}>
                        Proof of Payment
                      </label>

                      {!proofPreviewUrl ? (
                        <label
                          htmlFor="file-upload"
                          className="flex min-h-[172px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-sky-400 hover:bg-sky-50/50"
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm ring-1 ring-slate-200">
                            <ImageIcon className="size-6" />
                          </div>

                          <div>
                            <p className={`${uiTypography.buttonTextBold} text-slate-800`}>
                              Upload receipt or screenshot
                            </p>
                            <p className={`${uiTypography.helperText} mt-1`}>
                              PNG, JPG, or JPEG supported
                            </p>
                          </div>

                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg, image/jpg"
                          />
                        </label>
                      ) : (
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={proofPreviewUrl}
                              alt="Proof preview"
                              className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-sm"
                            />

                            <div className="min-w-0 flex-1">
                              <p className={`${uiTypography.buttonTextBold} truncate text-slate-900`}>
                                {proofFile?.name || 'Uploaded receipt'}
                              </p>
                              <p className={`${uiTypography.helperText} mt-1`}>
                                Make sure the amount and date are visible.
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingImage(proofPreviewUrl)}
                                  className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 ${uiTypography.buttonText}`}
                                >
                                  <Eye className="size-3.5" />
                                  Preview
                                </button>

                                <button
                                  type="button"
                                  onClick={handleRemoveImage}
                                  className={`inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-white transition hover:bg-rose-700 ${uiTypography.buttonText}`}
                                >
                                  <Trash2 className="size-3.5" />
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <p className={`${uiTypography.helperText} mt-2`}>
                        Uploading proof helps speed up admin verification.
                      </p>
                    </div>

                    <div>
                      <label className={`${uiTypography.formLabel} mb-2 ml-0`}>
                        Notes (Optional)
                      </label>
                      <textarea
                        value={paymentForm.notes}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        rows={4}
                        className={`w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${uiTypography.inputText}`}
                        placeholder="Add reference numbers or extra payment details"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={resetPaymentModalState}
                      className={`flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-700 transition hover:bg-slate-50 ${uiTypography.buttonText}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="payment-form"
                      disabled={isSubmitting}
                      className={`flex-1 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 ${uiTypography.buttonText}`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {viewingImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
            onClick={() => setViewingImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Proof of payment viewer"
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute right-6 top-6 rounded-xl p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Close (Esc)"
            >
              <X className="size-8" />
            </button>

            <div
              className="relative max-h-screen max-w-full p-2 sm:max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewingImage}
                alt="Proof of Payment Receipt"
                className="max-h-[85vh] max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl"
              />
              <p className={`mt-4 text-center text-white/60 ${uiTypography.helperText}`}>
                Click outside to close
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}