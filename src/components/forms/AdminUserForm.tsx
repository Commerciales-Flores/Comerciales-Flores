import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  User as UserIcon,
} from 'lucide-react';
import { useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import type { FieldType } from '../../utils/formFields';

export type NewCustomerForm = {
  first_name: string;
  last_name: string;
  email: string;
  contactNumber: string;
  address: string;
  latitude: string;
  longitude: string;
  password: string;
  confirmPassword: string;
  role: 'client';
  is_active: boolean;
};

export type NewCustomerErrors = Partial<Record<string, string>>;

type FormFieldProps = {
  field: string;
  label: string;
  type?: FieldType;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
  rows?: number;
  error?: string;
  autoComplete?: string;
  visible?: boolean;
  onToggleVisibility?: () => void;
  maxLength?: number;
};

type AddressPickerProps = {
  value: string;
  latitude?: string;
  longitude?: string;
  onChange: (payload: {
    address: string;
    latitude: string;
    longitude: string;
  }) => void;
};

interface PasswordStrengthIndicatorProps {
  password: string;
  confirmPassword: string;
  showChecklist?: boolean;
  showMatchStatus?: boolean;
  compact?: boolean;
}

interface AdminUserFormProps {
  newCustomer: NewCustomerForm;
  newCustomerErrors: NewCustomerErrors;
  canSubmitNewCustomer: boolean;
  updateNewCustomerField: (
    field: keyof NewCustomerForm,
    value: string | number | null | undefined
  ) => void;
  setNewCustomer: Dispatch<SetStateAction<NewCustomerForm>>;
  setNewCustomerErrors: Dispatch<SetStateAction<NewCustomerErrors>>;
  normalizeName: (value: string) => string;
  normalizeEmail: (value: string) => string;
  normalizePHPhone: (value: string) => string;
  isPasswordPolicyValid: (password: string) => boolean;
  handleSubmit: () => void;
  onCancel: () => void;
  FormField: React.ComponentType<FormFieldProps>;
  AddressPicker: React.ComponentType<AddressPickerProps>;
  PasswordStrengthIndicator: React.ComponentType<PasswordStrengthIndicatorProps>;
  submitLabel?: string;
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-gray-100 p-2 text-gray-700">{icon}</div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AdminUserForm({
  newCustomer,
  newCustomerErrors,
  canSubmitNewCustomer,
  updateNewCustomerField,
  setNewCustomer,
  setNewCustomerErrors,
  normalizeName,
  normalizeEmail,
  normalizePHPhone,
  isPasswordPolicyValid,
  handleSubmit,
  onCancel,
  FormField,
  AddressPicker,
  PasswordStrengthIndicator,
  submitLabel = 'Create Customer',
}: AdminUserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const errorList = Object.values(newCustomerErrors).filter(Boolean);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-5 rounded-[2rem] bg-gray-50 p-4 sm:p-6"
    >
      {errorList.length > 0 && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          <div className="space-y-2">
            {errorList.map((err, i) => (
              <div key={i} className="flex items-center gap-3">
                <AlertCircle className="size-4 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SectionCard
        title="Personal Information"
        subtitle="Enter the customer's account details."
        icon={<UserIcon className="size-4" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            field="first_name"
            label="First Name"
            value={newCustomer.first_name}
            onChange={(value) => updateNewCustomerField('first_name', value)}
            onBlur={(value) =>
              updateNewCustomerField('first_name', normalizeName(value))
            }
            placeholder="Juan"
            error={newCustomerErrors.first_name}
            autoComplete="given-name"
            maxLength={100}
          />

          <FormField
            field="last_name"
            label="Last Name"
            value={newCustomer.last_name}
            onChange={(value) => updateNewCustomerField('last_name', value)}
            onBlur={(value) =>
              updateNewCustomerField('last_name', normalizeName(value))
            }
            placeholder="Dela Cruz"
            error={newCustomerErrors.last_name}
            autoComplete="family-name"
            maxLength={100}
          />
        </div>

        <div className="mt-4">
          <FormField
            field="email"
            label="Email Address"
            type="email"
            value={newCustomer.email}
            onChange={(value) => updateNewCustomerField('email', value)}
            onBlur={(value) => updateNewCustomerField('email', normalizeEmail(value))}
            placeholder="john@example.com"
            error={newCustomerErrors.email}
            autoComplete="email"
            maxLength={150}
          />
        </div>

        <div className="mt-4">
          <FormField
            field="contactNumber"
            label="Contact Number"
            type="tel"
            value={newCustomer.contactNumber}
            onChange={(value) => updateNewCustomerField('contactNumber', value)}
            onBlur={(value) =>
              updateNewCustomerField('contactNumber', normalizePHPhone(value))
            }
            placeholder="+63 9xx... (Optional)"
            error={newCustomerErrors.contactNumber}
            autoComplete="tel"
            maxLength={20}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Address"
        subtitle="Confirm the customer location before creating the account."
        icon={<MapPin className="size-4" />}
      >
        <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Address Status
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  newCustomer.address &&
                  newCustomer.latitude &&
                  newCustomer.longitude
                    ? 'text-green-700'
                    : 'text-gray-500'
                }`}
              >
                {newCustomer.address &&
                newCustomer.latitude &&
                newCustomer.longitude
                  ? 'Confirmed on map'
                  : 'Not confirmed yet'}
              </p>
            </div>

            <div
              className={
                newCustomer.address &&
                newCustomer.latitude &&
                newCustomer.longitude
                  ? 'text-green-600'
                  : 'text-red-500'
              }
            >
              <CheckCircle2 className="size-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4">
          <AddressPicker
            value={newCustomer.address}
            latitude={newCustomer.latitude}
            longitude={newCustomer.longitude}
            onChange={({ address, latitude, longitude }) => {
              setNewCustomer((prev) => ({
                ...prev,
                address,
                latitude,
                longitude,
              }));

              setNewCustomerErrors((prev) => {
                if (!prev.address) return prev;
                const next = { ...prev };
                delete next.address;
                return next;
              });
            }}
          />

          {newCustomerErrors.address ? (
            <p className="ml-1 mt-2 text-xs font-medium text-red-600">
              {newCustomerErrors.address}
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Security"
        subtitle="Set a password that follows the same registration rules."
        icon={<Lock className="size-4" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              <span>Password</span>
            </label>

            <div className="relative">
              <input
                name="new-password"
                maxLength={100}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newCustomer.password}
                onChange={(e) =>
                  updateNewCustomerField('password', e.target.value)
                }
                onBlur={(e) =>
                  updateNewCustomerField('password', e.target.value.trim())
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 outline-none transition focus:ring-4 ${
                  newCustomerErrors.password
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
                    : 'border-gray-300 focus:border-blue-300 focus:ring-blue-50'
                }`}
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            {newCustomerErrors.password ? (
              <p className="ml-1 mt-2 text-xs font-medium text-red-600">
                {newCustomerErrors.password}
              </p>
            ) : null}

            <div className="mt-3">
              <PasswordStrengthIndicator
                password={newCustomer.password}
                confirmPassword={newCustomer.confirmPassword}
                showChecklist
                showMatchStatus={false}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
              <span>Confirm Password</span>
            </label>

            <div className="relative">
              <input
                name="confirm-password"
                maxLength={100}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newCustomer.confirmPassword}
                onChange={(e) =>
                  updateNewCustomerField('confirmPassword', e.target.value)
                }
                onBlur={(e) =>
                  updateNewCustomerField('confirmPassword', e.target.value.trim())
                }
                className={`w-full rounded-2xl border bg-white px-4 py-3 pr-10 text-sm font-medium text-gray-900 outline-none transition focus:ring-4 ${
                  newCustomerErrors.confirmPassword
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
                    : 'border-gray-300 focus:border-blue-300 focus:ring-blue-50'
                }`}
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            {newCustomerErrors.confirmPassword ? (
              <p className="ml-1 mt-2 text-xs font-medium text-red-600">
                {newCustomerErrors.confirmPassword}
              </p>
            ) : null}

            <div className="mt-3">
              <PasswordStrengthIndicator
                password={newCustomer.password}
                confirmPassword={newCustomer.confirmPassword}
                showChecklist={false}
                showMatchStatus
                compact
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="rounded-[1.75rem] border border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-green-600" />
          <div>
            <p className="text-sm font-bold text-green-900">Admin-created customer</p>
            <p className="mt-1 text-sm text-green-800">
              This account will be created immediately once all fields are valid.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            !canSubmitNewCustomer ||
            !isPasswordPolicyValid(newCustomer.password) ||
            !newCustomer.confirmPassword ||
            newCustomer.password !== newCustomer.confirmPassword
          }
          className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}