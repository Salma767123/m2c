import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
export { formatPrice } from './currency'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPanCardLabel(businessType?: string | null): string {
  return businessType === "proprietorship" ? "Proprietor PAN Card" : "Company PAN Card"
}

export function getPanNumberLabel(businessType?: string | null): string {
  return businessType === "proprietorship" ? "Proprietor PAN Number" : "Company PAN Number"
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Human-readable elapsed time since `startDate` (e.g. "13 Years / 6 Months /
 * 12 Days"). Returns '' when the date is empty/invalid/in the future so the
 * caller can show a placeholder. Shared by the OwnerProfile form (Total
 * Business Duration field) and the review summaries so both always display
 * the identical value.
 */
export function calculateDuration(startDate: string): string {
  if (!startDate) return '';
  const start = new Date(startDate);
  const now = new Date();
  if (isNaN(start.getTime()) || start > now) return '';

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Borrow the number of days in the month preceding `now`.
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  // Guard against rare month-length edges leaving a negative remainder.
  if (days < 0) days = 0;
  if (months < 0) months = 0;
  if (years < 0) years = 0;

  const part = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return [
    years > 0 ? part(years, 'Year') : '',
    months > 0 ? part(months, 'Month') : '',
    days > 0 ? part(days, 'Day') : '',
  ].filter(Boolean).join(' / ') || '0 Days';
}

export function buildFullName(
  title?: string | null,
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null,
  fallback?: string | null,
): string {
  const parts = [title, firstName, middleName, lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return fallback || '';
}