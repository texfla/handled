/**
 * Currency formatting utilities
 */

export const formatCurrency = (amount?: number | null, currency: string = 'USD'): string => {
  if (amount == null) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercent = (value?: number | null): string => {
  if (value == null) return '-';
  return `${value}%`;
};

