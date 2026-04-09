// src/utils/DataNormalization.ts

const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0F]/gu;

const stripInvisibleChars = (value: string) =>
  value.replace(/[\u200B-\u200D\uFEFF]/g, '');

const stripEmojis = (value: string) =>
  stripInvisibleChars(value).replace(EMOJI_REGEX, '');

const collapseWhitespace = (value: string) =>
  stripEmojis(value).replace(/\s+/g, ' ').trim();

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const splitCommaSeparated = (value: string) =>
  value
    .split(',')
    .map((item) => collapseWhitespace(item))
    .filter(Boolean);

const isStrictIntegerString = (value: string) => /^-?\d+$/.test(value);
const isStrictDecimalString = (value: string) => /^-?\d+(\.\d+)?$/.test(value);

// ---------- BASIC TEXT ----------

export const normalizeText = (value: string) => collapseWhitespace(value);

export const normalizeOptionalText = (value: string) =>
  collapseWhitespace(value) || '';

export const normalizeEmail = (value: string) =>
  collapseWhitespace(value).toLowerCase();

export const normalizeLowercaseText = (value: string) =>
  collapseWhitespace(value).toLowerCase();

export const normalizeUppercaseText = (value: string) =>
  collapseWhitespace(value).toUpperCase();

// ---------- INPUT SANITIZERS ----------

export const sanitizePlainText = (value: string) =>
  stripEmojis(value).replace(/\s+/g, ' ').trimStart();

export const sanitizeEmailInput = (value: string) =>
  stripEmojis(value).replace(/\s+/g, '');

export const sanitizePasswordInput = (value: string) =>
  value.replace(/[^\x20-\x7E]/g, '');

export const sanitizeNameInput = (value: string) =>
  stripEmojis(value).replace(/[^A-Za-zÀ-ÿ0-9\s'.-]/g, '');

export const sanitizeAddressInput = (value: string) =>
  stripEmojis(value).replace(/[^\p{L}\p{N}\s#.,'\/()-]/gu, '');

export const sanitizePhoneInput = (value: string) =>
  stripEmojis(value).replace(/[^\d+\s()-]/g, '');

// ---------- CASE HELPERS ----------

const TITLE_CASE_EXCEPTIONS = new Set([
  'de',
  'del',
  'dela',
  'di',
  'du',
  'la',
  'van',
  'von',
]);

export const toTitleCase = (value: string) =>
  collapseWhitespace(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const normalizeName = (value: string) => {
  const cleaned = collapseWhitespace(sanitizeNameInput(value)).toLowerCase();
  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((part, index) => {
      if (!part) return part;

      if (index > 0 && TITLE_CASE_EXCEPTIONS.has(part)) {
        return part;
      }

      return part
        .split(/([-'])/)
        .map((segment) => {
          if (segment === '-' || segment === "'") return segment;
          return segment.charAt(0).toUpperCase() + segment.slice(1);
        })
        .join('');
    })
    .join(' ');
};

// ---------- ADDRESS ----------

export const normalizeAddress = (value: string) =>
  collapseWhitespace(sanitizeAddressInput(value))
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*-\s*/g, ' - ');

// ---------- PHONE ----------

export const normalizePHPhone = (value: string) => {
  const trimmed = collapseWhitespace(sanitizePhoneInput(value));
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

// ---------- NUMERIC STRINGS ----------

export const normalizeWholeNumberString = (value: string) => {
  const cleaned = collapseWhitespace(value).replace(/,/g, '');
  if (!cleaned) return '';

  if (!isStrictIntegerString(cleaned)) return cleaned;

  return String(Number(cleaned));
};

export const normalizeDecimalString = (value: string, maxDecimals = 2) => {
  const cleaned = collapseWhitespace(value).replace(/,/g, '');
  if (!cleaned) return '';

  if (!isStrictDecimalString(cleaned)) return cleaned;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return cleaned;

  return parsed.toFixed(maxDecimals).replace(/\.?0+$/, '');
};

export const normalizeMoneyString = (value: string) => {
  const cleaned = collapseWhitespace(value).replace(/[₱,\s]/g, '');
  if (!cleaned) return '';

  if (!isStrictDecimalString(cleaned)) return cleaned;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return cleaned;

  return parsed
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1');
};

export const normalizePercentageString = (value: string) => {
  const cleaned = collapseWhitespace(value).replace(/%/g, '');
  if (!cleaned) return '';

  if (!isStrictDecimalString(cleaned)) return cleaned;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return cleaned;

  return String(parsed);
};

// ---------- IDENTIFIERS ----------

export const normalizePlateNumber = (value: string) =>
  collapseWhitespace(value).toUpperCase().replace(/\s+/g, '');

export const normalizeSlug = (value: string) =>
  collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// ---------- FEATURES ----------

const FEATURE_ALIASES: Record<string, string> = {
  wifi: 'WiFi',
  'wi-fi': 'WiFi',
  'wi fi': 'WiFi',

  aircon: 'Aircon',
  'air con': 'Aircon',
  'air-conditioning': 'Aircon',
  'air conditioning': 'Aircon',

  parking: 'Parking',
  projector: 'Projector',
  stage: 'Stage',

  chairs: 'Chairs',
  chair: 'Chairs',
  tables: 'Tables',
  table: 'Tables',

  cctv: 'CCTV',
  security: 'Security',

  'sound system': 'Sound System',
  speakers: 'Sound System',

  restroom: 'Restroom',
  restrooms: 'Restroom',
  bathroom: 'Restroom',
  bathrooms: 'Restroom',

  kitchen: 'Kitchen',
};

export const normalizeFeatureName = (value: string) => {
  const cleaned = collapseWhitespace(value).toLowerCase();
  if (!cleaned) return '';

  return FEATURE_ALIASES[cleaned] ?? toTitleCase(cleaned);
};

export const normalizeFeatureList = (value: string): string[] => {
  return unique(splitCommaSeparated(value).map(normalizeFeatureName));
};

// ---------- GENERIC LISTS ----------

export const normalizeStringList = (value: string): string[] => {
  return unique(splitCommaSeparated(value));
};

export const normalizeTitleCaseList = (value: string): string[] => {
  return unique(splitCommaSeparated(value).map(toTitleCase));
};

// ---------- PARSED NUMBERS ----------

export const parseNormalizedInteger = (value: string): number | null => {
  const normalized = normalizeWholeNumberString(value);
  if (!normalized || !isStrictIntegerString(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseNormalizedDecimal = (value: string): number | null => {
  const normalized = normalizeDecimalString(value);
  if (!normalized || !isStrictDecimalString(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseNormalizedMoney = (value: string): number | null => {
  const normalized = normalizeMoneyString(value);
  if (!normalized || !isStrictDecimalString(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeUserPayload = (input: {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  address?: string;
}) => ({
  firstName: normalizeName(input.firstName),
  lastName: normalizeName(input.lastName),
  email: normalizeEmail(input.email),
  contactNumber: normalizePHPhone(input.contactNumber ?? ''),
  address: normalizeAddress(input.address ?? ''),
});