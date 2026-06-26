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