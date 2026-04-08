// src/utils/formFields.ts

import {
  isValidEmail,
  isValidPHPhone,
  normalizeAddress,
  normalizeEmail,
  normalizeName,
  normalizePHPhone,
  normalizeText,
} from './DataNormalization';

export type FieldType = 'text' | 'email' | 'tel' | 'password' | 'textarea';

export function normalizeFieldValue(field: string, value: string) {
  switch (field) {
    case 'firstName':
    case 'lastName':
    case 'middleName':
    case 'fullName':
    case 'name':
      return normalizeName(value);

    case 'email':
    case 'newEmail':
    case 'confirmEmail':
      return normalizeEmail(value);

    case 'contactNumber':
    case 'phone':
    case 'mobileNumber':
      return normalizePHPhone(value);

    case 'address':
    case 'streetAddress':
    case 'formattedAddress':
      return normalizeAddress(value);

    default:
      return normalizeText(value);
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
    case 'mobileNumber':
      return isValidPHPhone(value)
        ? ''
        : 'Enter a valid Philippine mobile number.';

    default:
      return '';
  }
}