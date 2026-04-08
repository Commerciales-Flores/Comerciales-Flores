import type { ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getFieldError, normalizeFieldValue, type FieldType } from '../../utils/formFields';

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

export default function FormField({
  field,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder = '',
  icon,
  disabled = false,
  rows = 4,
  error,
  autoComplete,
  visible = false,
  onToggleVisibility,
  maxLength,
}: FormFieldProps) {
  const derivedError = error ?? getFieldError(field, value);
  const inputPadding = icon ? 'pl-10 pr-4' : 'px-4';

  const sharedClassName = `w-full rounded-xl border bg-slate-50 text-sm font-medium outline-none transition-all ${
    derivedError
      ? 'border-rose-300 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-100'
      : 'border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50'
  }`;

  const actualType =
    type === 'password' ? (visible ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <label className="ml-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>

      <div className="relative">
        {icon && type !== 'textarea' && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        {type === 'textarea' ? (
          <textarea
            value={value}
            rows={rows}
            disabled={disabled}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onBlur?.(normalizeFieldValue(field, value))}
            placeholder={placeholder}
            className={`${sharedClassName} resize-none px-4 py-3`}
          />
        ) : (
          <input
            type={actualType}
            value={value}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => onBlur?.(normalizeFieldValue(field, value))}
            placeholder={placeholder}
            className={`${sharedClassName} py-3 ${
              type === 'password' ? 'pl-4 pr-10' : inputPadding
            }`}
          />
        )}

        {type === 'password' && onToggleVisibility && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>

      {derivedError ? (
        <p className="ml-1 text-xs font-medium text-rose-600">{derivedError}</p>
      ) : null}
    </div>
  );
}