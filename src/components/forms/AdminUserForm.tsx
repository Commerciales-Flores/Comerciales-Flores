import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  User as UserIcon,
} from 'lucide-react';
import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
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
  submittingLabel?: string;
  isSubmitting?: boolean;
}

type SectionCardProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
};

function SectionCard({ title, subtitle, icon, children }: SectionCardProps) {
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

type PasswordInputProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  placeholder?: string;
  visible: boolean;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  disabled?: boolean;
  children?: ReactNode;
};

function PasswordInput({
  label,
  name,
  value,
  error,
  placeholder,
  visible,
  onToggleVisibility,
  onChange,
  onBlur,
  disabled,
  children,
}: PasswordInputProps) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
        <span>{label}</span>
      </label>

      <div className="relative">
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          maxLength={100}
          autoComplete="new-password"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur(e.target.value.trim())}
          className={`w-full rounded-2xl border bg-white px-4 py-3 pr-11 text-sm font-medium text-gray-900 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-gray-100 ${
            error
              ? 'border-red-300 focus:border-red-400 focus:ring-red-50'
              : 'border-gray-300 focus:border-blue-300 focus:ring-blue-50'
          }`}
          placeholder={placeholder}
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          disabled={disabled}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {error ? <p className="ml-1 mt-2 text-xs font-medium text-red-600">{error}</p> : null}

      {children ? <div className="mt-3">{children}</div> : null}
    </div>
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
  submittingLabel = 'Creating...',
  isSubmitting = false,
}: AdminUserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const errorList = useMemo(
    () => Object.values(newCustomerErrors).filter(Boolean),
    [newCustomerErrors]
  );

  const hasConfirmedAddress = Boolean(
    newCustomer.address && newCustomer.latitude && newCustomer.longitude
  );

  const isPasswordValid = isPasswordPolicyValid(newCustomer.password);
  const passwordsMatch =
    Boolean(newCustomer.confirmPassword) &&
    newCustomer.password === newCustomer.confirmPassword;

  const isSubmitDisabled =
    isSubmitting ||
    !canSubmitNewCustomer ||
    !isPasswordValid ||
    !newCustomer.confirmPassword ||
    !passwordsMatch;

  const handleAddressChange = ({
    address,
    latitude,
    longitude,
  }: {
    address: string;
    latitude: string;
    longitude: string;
  }) => {
    setNewCustomer((prev) => ({
      ...prev,
      address,
      latitude,
      longitude,
    }));

    setNewCustomerErrors((prev) => {
      const next = { ...prev };
      delete next.address;
      return next;
    });
  };

  const handleFieldChange = (field: string) => {
    setNewCustomerErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFieldBlur = (field: string, value: string) => {
    const trimmedValue = typeof value === 'string' ? value.trim() : String(value);

    if (!trimmedValue) {
      let errorMessage = '';
      switch (field) {
        case 'first_name':
          errorMessage = 'First name is required.';
          break;
        case 'last_name':
          errorMessage = 'Last name is required.';
          break;
        case 'email':
          errorMessage = 'Email is required.';
          break;
        case 'contactNumber':
          errorMessage = 'Contact number is required.';
          break;
        case 'password':
          errorMessage = 'Password is required.';
          break;
        case 'confirmPassword':
          errorMessage = 'Confirm password is required.';
          break;
        default:
          return;
      }

      if (errorMessage) {
        setNewCustomerErrors((prev) => ({
          ...prev,
          [field]: errorMessage,
        }));
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitDisabled) return;
    handleSubmit();
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="space-y-5 rounded-[2rem] bg-gray-50 p-4 sm:p-6"
    >
      {errorList.length > 0 ? (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          <div className="space-y-2">
            {errorList.map((errorMessage, index) => (
              <div key={`${errorMessage}-${index}`} className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <SectionCard
        title="Personal Information"
        subtitle="Enter the customer's basic account details."
        icon={<UserIcon className="size-4" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            field="first_name"
            label="First Name"
            value={newCustomer.first_name}
            onChange={(value) => {
              updateNewCustomerField('first_name', value);
              handleFieldChange('first_name');
            }}
            onBlur={(value) => {
              updateNewCustomerField('first_name', normalizeName(value));
              handleFieldBlur('first_name', value);
            }}
            placeholder="Juan"
            error={newCustomerErrors.first_name}
            autoComplete="given-name"
            maxLength={100}
            disabled={isSubmitting}
          />

          <FormField
            field="last_name"
            label="Last Name"
            value={newCustomer.last_name}
            onChange={(value) => {
              updateNewCustomerField('last_name', value);
              handleFieldChange('last_name');
            }}
            onBlur={(value) => {
              updateNewCustomerField('last_name', normalizeName(value));
              handleFieldBlur('last_name', value);
            }}
            placeholder="Dela Cruz"
            error={newCustomerErrors.last_name}
            autoComplete="family-name"
            maxLength={100}
            disabled={isSubmitting}
          />
        </div>

        <div className="mt-4">
          <FormField
            field="email"
            label="Email Address"
            type="email"
            value={newCustomer.email}
            onChange={(value) => {
              updateNewCustomerField('email', value);
              handleFieldChange('email');
            }}
            onBlur={(value) => {
              updateNewCustomerField('email', normalizeEmail(value));
              handleFieldBlur('email', value);
            }}
            placeholder="juan@example.com"
            error={newCustomerErrors.email}
            autoComplete="email"
            maxLength={150}
            disabled={isSubmitting}
          />
        </div>

        <div className="mt-4">
          <FormField
            field="contactNumber"
            label="Contact Number"
            type="tel"
            value={newCustomer.contactNumber}
            onChange={(value) => {
              updateNewCustomerField('contactNumber', value);
              handleFieldChange('contactNumber');
            }}
            onBlur={(value) => {
              updateNewCustomerField('contactNumber', normalizePHPhone(value));
              handleFieldBlur('contactNumber', value);
            }}
            placeholder="+63 9xx xxx xxxx"
            error={newCustomerErrors.contactNumber}
            autoComplete="tel"
            maxLength={20}
            disabled={isSubmitting}
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
                  hasConfirmedAddress ? 'text-green-700' : 'text-gray-500'
                }`}
              >
                {hasConfirmedAddress ? 'Confirmed on map' : 'Not confirmed yet'}
              </p>
            </div>

            <div className={hasConfirmedAddress ? 'text-green-600' : 'text-red-500'}>
              <CheckCircle2 className="size-5" />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4">
          <AddressPicker
            value={newCustomer.address}
            latitude={newCustomer.latitude}
            longitude={newCustomer.longitude}
            onChange={handleAddressChange}
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
          <PasswordInput
            label="Password"
            name="new-password"
            value={newCustomer.password}
            error={newCustomerErrors.password}
            placeholder="••••••••"
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((prev) => !prev)}
            onChange={(value) => {
              updateNewCustomerField('password', value);
              handleFieldChange('password');
            }}
            onBlur={(value) => {
              updateNewCustomerField('password', value);
              handleFieldBlur('password', value);
            }}
            disabled={isSubmitting}
          >
            <PasswordStrengthIndicator
              password={newCustomer.password}
              confirmPassword={newCustomer.confirmPassword}
              showChecklist
              showMatchStatus={false}
            />
          </PasswordInput>

          <PasswordInput
            label="Confirm Password"
            name="confirm-password"
            value={newCustomer.confirmPassword}
            error={newCustomerErrors.confirmPassword}
            placeholder="••••••••"
            visible={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword((prev) => !prev)}
            onChange={(value) => {
              updateNewCustomerField('confirmPassword', value);
              handleFieldChange('confirmPassword');
            }}
            onBlur={(value) => {
              updateNewCustomerField('confirmPassword', value);
              handleFieldBlur('confirmPassword', value);
            }}
            disabled={isSubmitting}
          >
            <PasswordStrengthIndicator
              password={newCustomer.password}
              confirmPassword={newCustomer.confirmPassword}
              showChecklist={false}
              showMatchStatus
              compact
            />
          </PasswordInput>
        </div>
      </SectionCard>

      <div className="rounded-[1.75rem] border border-blue-200 bg-blue-50 p-4 shadow-sm">
  <div className="flex items-start gap-3">
    <CheckCircle2 className="mt-0.5 size-5 text-blue-600" />
    <div>
      <p className="text-sm font-bold text-blue-900">
        Admin-created customer
      </p>
      <p className="mt-1 text-sm text-blue-800">
        This account will be created immediately once all fields are valid.
        The customer must upload their valid ID later from their profile for
        identity verification.
      </p>
    </div>
  </div>
</div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}