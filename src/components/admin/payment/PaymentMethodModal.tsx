import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, Landmark, QrCode, Wallet, X } from 'lucide-react';
import type {
  PaymentMethodCode,
  PaymentMethodConfig,
  PaymentMethodPayload,
} from '../../../contexts/PaymentMethodsContext';
import supabase from '../../../supabaseClient';

type PaymentMethodModalProps = {
  open: boolean;
  method: PaymentMethodConfig | null;
  onClose: () => void;
  onSave: (payload: PaymentMethodPayload, id?: string) => Promise<void>;
  uploadQr: (file: File) => Promise<string | null>;
};

const INITIAL_FORM: PaymentMethodPayload = {
  methodCode: 'gcash',
  displayName: '',
  accountName: '',
  accountNumber: '',
  mobileNumber: '',
  bankName: '',
  branchName: '',
  qrImagePath: '',
  instructions: '',
  isActive: true,
  sortOrder: 0,
};

const PAYMENT_METHODS_BUCKET = 'property_images';

function getPublicImageUrl(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
    return path;
  }

  const { data } = supabase.storage.from(PAYMENT_METHODS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function normalizePaymentMethodCode(
  value?: string | null
): PaymentMethodCode {
  switch (value) {
    case "gcash":
      return "gcash";
    case "bank_transfer":
      return "bank_transfer";
    case "card":
      return "card";
    default:
      return "bank_transfer";
  }
}

function getMethodLabel(methodCode: PaymentMethodCode) {
  switch (methodCode) {
    case 'gcash':
      return 'GCash';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'card':
      return 'Credit / Debit Card';
    default:
      return methodCode;
  }
}

export default function PaymentMethodModal({
  open,
  method,
  onClose,
  onSave,
  uploadQr,
}: PaymentMethodModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<PaymentMethodPayload>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrPreviewUrl, setQrPreviewUrl] = useState('');

  useEffect(() => {
    if (!open) return;

    if (method) {
      setForm({
        methodCode: method.methodCode,
        displayName: method.displayName,
        accountName: method.accountName || '',
        accountNumber: method.accountNumber || '',
        mobileNumber: method.mobileNumber || '',
        bankName: method.bankName || '',
        branchName: method.branchName || '',
        qrImagePath: method.qrImagePath || '',
        instructions: method.instructions || '',
        isActive: method.isActive,
        sortOrder: method.sortOrder,
      });
      setQrPreviewUrl(method.qrImageUrl || '');
    } else {
      setForm(INITIAL_FORM);
      setQrPreviewUrl('');
    }

    setIsSubmitting(false);
    setIsUploadingQr(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [open, method]);

  const updateField = useCallback(
    <K extends keyof PaymentMethodPayload>(key: K, value: PaymentMethodPayload[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const requiresWalletFields = form.methodCode === 'gcash';
const requiresBankFields = form.methodCode === 'bank_transfer';
const requiresCardFields = form.methodCode === 'card';
const requiresQr = requiresWalletFields || requiresBankFields;

  const handleUploadQr = useCallback(async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;

    setIsUploadingQr(true);

    try {
      const previewUrl = URL.createObjectURL(file);
      const uploadedPath = await uploadQr(file);

      if (!uploadedPath) {
        URL.revokeObjectURL(previewUrl);
        return;
      }

      setQrPreviewUrl((prev) => {
        if (prev.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(prev);
          } catch {
            // ignore
          }
        }
        return previewUrl;
      });

      setForm((prev) => ({
        ...prev,
        qrImagePath: uploadedPath,
      }));
    } catch (error) {
      console.error('Failed to upload QR:', error);
    } finally {
      setIsUploadingQr(false);
    }
  }, [uploadQr]);

  const handleRemoveQr = useCallback(() => {
    if (qrPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(qrPreviewUrl);
      } catch {
        // ignore
      }
    }

    setQrPreviewUrl('');
    setForm((prev) => ({
      ...prev,
      qrImagePath: '',
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [qrPreviewUrl]);

  const previewLines = useMemo(() => {
    const lines: string[] = [];

    if (form.bankName) lines.push(`Bank: ${form.bankName}`);
    if (form.branchName) lines.push(`Branch: ${form.branchName}`);
    if (form.accountName) lines.push(`Account Name: ${form.accountName}`);
    if (form.accountNumber) lines.push(`Account Number: ${form.accountNumber}`);
    if (form.mobileNumber) lines.push(`Mobile Number: ${form.mobileNumber}`);

    return lines;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting || isUploadingQr) return;

      setIsSubmitting(true);

      try {
        await onSave(
          {
            methodCode: form.methodCode,
            displayName: form.displayName.trim(),
            accountName: form.accountName?.trim() || null,
            accountNumber: form.accountNumber?.trim() || null,
            mobileNumber: form.mobileNumber?.trim() || null,
            bankName: form.bankName?.trim() || null,
            branchName: form.branchName?.trim() || null,
            qrImagePath: form.qrImagePath?.trim() || null,
            instructions: form.instructions?.trim() || null,
            isActive: form.isActive,
            sortOrder: Number(form.sortOrder || 0),
          },
          method?.id
        );

        onClose();
      } catch (error) {
        console.error('Failed to save payment method:', error);
        setIsSubmitting(false);
      }
    },
    [form, isSubmitting, isUploadingQr, method?.id, onClose, onSave]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-slate-900 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {method ? 'Edit Payment Method' : 'Add Payment Method'}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-400">
              Configure receiving details that clients will see during payment.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/5 p-2 text-slate-400 transition-all hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Method Type
                </label>
                <select
                  value={form.methodCode}
                  onChange={(e) =>
                    updateField('methodCode', normalizePaymentMethodCode(e.target.value))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Credit / Debit Card</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={form.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  placeholder="e.g. GCash, BDO Bank Transfer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            {requiresWalletFields && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Account Name
                  </label>
                  <input
                    type="text"
                    maxLength={150}
                    value={form.accountName || ''}
                    onChange={(e) => updateField('accountName', e.target.value)}
                    placeholder="Account holder name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={form.mobileNumber || ''}
                    onChange={(e) => updateField('mobileNumber', e.target.value)}
                    placeholder="e.g. 09171234567"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>
            )}

            {requiresBankFields && (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      value={form.bankName || ''}
                      onChange={(e) => updateField('bankName', e.target.value)}
                      placeholder="e.g. BDO"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      value={form.branchName || ''}
                      onChange={(e) => updateField('branchName', e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Account Name
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      value={form.accountName || ''}
                      onChange={(e) => updateField('accountName', e.target.value)}
                      placeholder="Account holder name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Account Number
                    </label>
                    <input
                      type="text"
                      maxLength={150}
                      value={form.accountNumber || ''}
                      onChange={(e) => updateField('accountNumber', e.target.value)}
                      placeholder="Bank account number"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Instructions
              </label>
              <textarea
                rows={5}
                maxLength={3000}
                value={form.instructions || ''}
                onChange={(e) => updateField('instructions', e.target.value)}
                placeholder="Tell clients what to do after sending payment."
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => updateField('sortOrder', Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all hover:bg-white">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField('isActive', e.target.checked)}
                    className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Active for clients</span>
                </label>
              </div>
            </div>

            {requiresQr && (
              <div className="space-y-1.5">
                <label className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  QR Image
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadQr(e.target.files)}
                  className="hidden"
                />

                {qrPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <img
                        src={qrPreviewUrl || getPublicImageUrl(form.qrImagePath)}
                        alt="QR preview"
                        className="h-full w-full object-contain bg-white"
                      />

                      <button
                        type="button"
                        onClick={handleRemoveQr}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg transition-all hover:bg-red-500 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
                    >
                      {isUploadingQr ? 'Uploading...' : 'Replace QR Image'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <QrCode className="size-5" />
                    <span className="text-sm font-semibold">
                      {isUploadingQr ? 'Uploading...' : 'Upload QR Image'}
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isUploadingQr}
                className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting
                  ? method
                    ? 'Updating...'
                    : 'Adding...'
                  : method
                    ? 'Update Method'
                    : 'Add Method'}
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Client Preview</h3>
                <p className="mt-1 text-xs text-slate-500">
                  This is roughly what clients will see before submitting proof of payment.
                </p>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
                    {requiresBankFields ? (
                      <Landmark className="size-5" />
                    ) : requiresWalletFields ? (
                      <Wallet className="size-5" />
                    ) : (
                      <CreditCard className="size-5" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {form.displayName || getMethodLabel(form.methodCode)}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      {form.methodCode.replaceAll('_', ' ')}
                    </p>
                  </div>
                </div>

                {previewLines.length > 0 ? (
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    {previewLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
                    Receiving details will appear here as you fill out the form.
                  </div>
                )}

                {requiresQr && (qrPreviewUrl || form.qrImagePath) ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <img
                      src={qrPreviewUrl || getPublicImageUrl(form.qrImagePath)}
                      alt="QR preview"
                      className="mx-auto h-56 w-56 rounded-xl border border-slate-200 bg-white object-contain"
                    />
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  {form.instructions?.trim() || 'Instructions for clients will appear here.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}