import {
  CreditCard,
  Edit,
  Landmark,
  QrCode,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { PaymentMethodConfig } from '../../../contexts/PaymentMethodsContext';

type PaymentMethodCardProps = {
  method: PaymentMethodConfig;
  isDeleting?: boolean;
  onEdit: (methodId: string) => void;
  onDelete: (methodId: string) => void;
  onToggleActive: (method: PaymentMethodConfig) => void;
};

function getMethodIcon(methodCode: string) {
  if (methodCode === 'bank_transfer') return <Landmark className="size-5" />;
  if (methodCode === 'gcash' || methodCode === 'paymaya') return <Wallet className="size-5" />;
  return <CreditCard className="size-5" />;
}

function formatMethodCode(value?: string | null) {
  if (!value) return 'N/A';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function PaymentMethodCard({
  method,
  isDeleting = false,
  onEdit,
  onDelete,
  onToggleActive,
}: PaymentMethodCardProps) {
  const detailLines = [
    method.bankName ? `Bank: ${method.bankName}` : null,
    method.branchName ? `Branch: ${method.branchName}` : null,
    method.accountName ? `Account Name: ${method.accountName}` : null,
    method.accountNumber ? `Account Number: ${method.accountNumber}` : null,
    method.mobileNumber ? `Mobile Number: ${method.mobileNumber}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
            {getMethodIcon(method.methodCode)}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900">{method.displayName}</h3>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                {formatMethodCode(method.methodCode)}
              </span>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  method.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {method.isActive ? 'Active' : 'Inactive'}
              </span>

              {method.qrImagePath ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                  <QrCode className="size-3" />
                  QR Uploaded
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          #{method.sortOrder}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {detailLines.length > 0 ? (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {detailLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
            No receiving details added yet.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Instructions
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {method.instructions?.trim() || 'No instructions added.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onEdit(method.id)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            <Edit className="size-4" />
            Edit
          </button>

          <button
            type="button"
            onClick={() => onToggleActive(method)}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all
              ${
                method.isActive
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }
            `}
          >
            {method.isActive ? (
              <ToggleRight className="size-4" />
            ) : (
              <ToggleLeft className="size-4" />
            )}
            {method.isActive ? 'Deactivate' : 'Activate'}
          </button>

          <button
            type="button"
            onClick={() => onDelete(method.id)}
            disabled={isDeleting}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}