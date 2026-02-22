export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyShort(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}
