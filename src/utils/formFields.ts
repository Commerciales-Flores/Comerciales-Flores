export type FieldType = 'text' | 'email' | 'tel' | 'password' | 'textarea';

export const normalizeName = (value: string) =>
  value.trim().replace(/\s+/g, ' ');

export const normalizeEmail = (value: string) =>
  value.trim().toLowerCase();

export const normalizeAddress = (value: string) =>
  value.trim().replace(/\s+/g, ' ');

export const normalizePHPhone = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('09') && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }

  if (digits.startsWith('9') && digits.length === 10) {
    return `+63${digits}`;
  }

  if (digits.startsWith('639') && digits.length === 12) {
    return `+${digits}`;
  }

  if (trimmed.startsWith('+63') && digits.length === 12) {
    return `+${digits}`;
  }

  return trimmed;
};

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

export const isValidPHPhone = (value: string) =>
  /^\+639\d{9}$/.test(normalizePHPhone(value));

export function normalizeFieldValue(field: string, value: string) {
  switch (field) {
    case 'firstName':
    case 'lastName':
      return normalizeName(value);
    case 'email':
    case 'newEmail':
    case 'confirmEmail':
      return normalizeEmail(value);
    case 'contactNumber':
    case 'phone':
      return normalizePHPhone(value);
    case 'address':
      return normalizeAddress(value);
    default:
      return value.trim();
  }
}

export function getFieldError(field: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) return '';

  switch (field) {
    case 'email':
    case 'newEmail':
    case 'confirmEmail':
      return isValidEmail(value) ? '' : 'Enter a valid email address.';
    case 'contactNumber':
    case 'phone':
      return isValidPHPhone(value)
        ? ''
        : 'Enter a valid Philippine mobile number.';
    default:
      return '';
  }
}