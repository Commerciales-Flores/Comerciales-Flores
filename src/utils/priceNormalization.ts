export function normalizeAmountInput(
  value: string,
  options?: {
    max?: number;
    decimals?: number;
    allowEmpty?: boolean;
  }
) {
  const {
    max = 999_999_999.99,
    decimals = 2,
    allowEmpty = true,
  } = options || {};

  if (value.trim() === '') {
    return allowEmpty ? '' : '0';
  }

  // Keep only digits and decimal point
  let cleaned = value.replace(/[^\d.]/g, '');

  // Keep only first decimal point
  const firstDotIndex = cleaned.indexOf('.');
  if (firstDotIndex !== -1) {
    cleaned =
      cleaned.slice(0, firstDotIndex + 1) +
      cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
  }

  const hasDot = cleaned.includes('.');
  let [whole = '', decimal = ''] = cleaned.split('.');

  // Keep one leading zero only when appropriate
  if (whole.length > 1) {
    whole = whole.replace(/^0+(?=\d)/, '');
  }

  // Limit decimal places
  decimal = decimal.slice(0, decimals);

  // Limit integer digits based on max, but do NOT clamp to max
  const maxWholeDigits = Math.floor(max).toString().length;
  whole = whole.slice(0, maxWholeDigits);

  // Preserve in-progress states
  if (whole === '' && hasDot) {
    return '0.';
  }

  if (hasDot) {
    return `${whole || '0'}.${decimal}`;
  }

  return whole;
}

export function finalizeAmountInput(
  value: string,
  options?: {
    min?: number;
    max?: number;
    decimals?: number;
    allowEmpty?: boolean;
  }
) {
  const {
    min = 0,
    max = 999_999_999.99,
    decimals = 2,
    allowEmpty = true,
  } = options || {};

  if (value.trim() === '') {
    return allowEmpty ? '' : min.toFixed(decimals);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return allowEmpty ? '' : min.toFixed(decimals);
  }

  if (parsed < min) return min.toFixed(decimals);
  if (parsed > max) return max.toFixed(decimals);

  return parsed.toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
}