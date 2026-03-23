import { useMemo, useState, useCallback } from 'react';
import { CreditCard, Landmark, Plus, QrCode, Wallet } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import {
  usePaymentMethods,
  type PaymentMethodConfig,
} from '../../contexts/PaymentMethodsContext';
import PaymentMethodModal from '../../components/admin/payment/PaymentMethodModal';
import PaymentMethodCard from '../../components/admin/payment/PaymentMethodCard';


export default function AdminPaymentMethods() {
  const {
    paymentMethods,
    loadingPaymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    uploadPaymentMethodQr,
  } = usePaymentMethods();

  const [showModal, setShowModal] = useState(false);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editingMethod = useMemo(
    () => paymentMethods.find((item) => item.id === editingMethodId) ?? null,
    [paymentMethods, editingMethodId]
  );

  const handleOpenAdd = useCallback(() => {
    setEditingMethodId(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((methodId: string) => {
    setEditingMethodId(methodId);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingMethodId(null);
  }, []);

  const handleSave = useCallback(
    async (payload: any, id?: string) => {
      if (id) {
        await updatePaymentMethod(id, payload);
      } else {
        await addPaymentMethod(payload);
      }
    },
    [addPaymentMethod, updatePaymentMethod]
  );

  const handleToggleActive = useCallback(
    async (method: PaymentMethodConfig) => {
      await updatePaymentMethod(method.id, {
        methodCode: method.methodCode,
        displayName: method.displayName,
        accountName: method.accountName,
        accountNumber: method.accountNumber,
        mobileNumber: method.mobileNumber,
        bankName: method.bankName,
        branchName: method.branchName,
        qrImagePath: method.qrImagePath,
        instructions: method.instructions,
        isActive: !method.isActive,
        sortOrder: method.sortOrder,
      });
    },
    [updatePaymentMethod]
  );

  const handleDelete = useCallback(
    async (methodId: string) => {
      if (deletingId) return;
      setDeletingId(methodId);

      try {
        await deletePaymentMethod(methodId);
      } catch (error) {
        console.error('Failed to delete payment method:', error);
      } finally {
        setDeletingId(null);
      }
    },
    [deletePaymentMethod, deletingId]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 md:text-2xl">Payment Methods</h1>
            <p className="text-sm text-gray-500">
              Manage receiving details for GCash, Maya, bank transfer, cash, and cheque.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
          >
            <Plus className="size-5" />
            Add Method
          </button>
        </div>

        {!loadingPaymentMethods && paymentMethods.length > 0 && (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
          <Wallet className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Methods
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {paymentMethods.filter((m) => m.isActive).length}
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
          <CreditCard className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Configured
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {paymentMethods.length}
          </p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-violet-100 p-3 text-violet-600">
          <QrCode className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            With QR Upload
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {paymentMethods.filter((m) => Boolean(m.qrImagePath)).length}
          </p>
        </div>
      </div>
    </div>
  </div>
)}

        {loadingPaymentMethods ? (
  <EmptyState
    icon={
      <div className="flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    }
    title="Loading payment methods..."
    description="Please wait while payment method settings are being retrieved."
  />
) : paymentMethods.length === 0 ? (
  <EmptyState
    icon={<Landmark className="size-10 text-blue-500" />}
    title="No payment methods configured"
    description="Clients will not see any receiving details until a payment method is added."
  />
) : (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
    {paymentMethods.map((method) => (
      <PaymentMethodCard
        key={method.id}
        method={method}
        isDeleting={deletingId === method.id}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />
    ))}
  </div>
)}

        <PaymentMethodModal
          open={showModal}
          method={editingMethod}
          onClose={handleCloseModal}
          onSave={handleSave}
          uploadQr={uploadPaymentMethodQr}
        />
      </div>
    </div>
  );
}