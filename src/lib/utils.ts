import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'XOF'): string {
  const symbolMap: Record<string, { symbol: string; position: 'before' | 'after'; hideDecimals?: boolean }> = {
    XOF: { symbol: 'F CFA', position: 'after', hideDecimals: true },
    XAF: { symbol: 'FCFA', position: 'after', hideDecimals: true },
    EUR: { symbol: '€', position: 'after' },
    USD: { symbol: '$', position: 'before' },
    CAD: { symbol: 'CA$', position: 'before' },
    CHF: { symbol: 'CHF', position: 'after' },
    GBP: { symbol: '£', position: 'before' },
    JPY: { symbol: '¥', position: 'before', hideDecimals: true },
    MAD: { symbol: 'DH', position: 'after' },
  };

  const config = symbolMap[currency] || { symbol: currency, position: 'after' };
  const hasDecimals = !config.hideDecimals && !Number.isInteger(amount);

  const formattedNumber = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return config.position === 'before'
    ? `${config.symbol} ${formattedNumber}`
    : `${formattedNumber} ${config.symbol}`;
}
