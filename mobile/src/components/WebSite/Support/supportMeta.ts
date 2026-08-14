import { Palette, Success, Tertiary, Warning, Error as ErrorTone, Ink } from '@/constants/theme';

/**
 * Ticket status/priority/category vocabulary, kept identical to
 * frontend/src/components/WebSite/Profile/SupportTickets.tsx so a ticket raised
 * on the phone is indistinguishable from one raised on the web.
 */

// Status and priority are free strings on the backend. Normalise here so a value
// written by any portal ("in-progress" from admin, "in_progress" per the schema
// comment) renders consistently for the customer.
export const normStatus = (s?: string) => (s || '').toLowerCase().replace(/_/g, '-');

export const STATUS_META: Record<string, { label: string; fg: string; bg: string }> = {
  open: { label: 'Open', fg: ErrorTone[500], bg: ErrorTone[50] },
  'in-progress': { label: 'In Progress', fg: Tertiary[500], bg: Tertiary[50] },
  resolved: { label: 'Resolved', fg: Success[700], bg: Success[50] },
  closed: { label: 'Closed', fg: Ink.muted, bg: '#f1f5f9' },
};

export const statusMeta = (s?: string) => STATUS_META[normStatus(s)] || STATUS_META.open;

export const PRIORITY_META: Record<string, { label: string; fg: string; bg: string }> = {
  urgent: { label: 'Urgent', fg: ErrorTone[500], bg: ErrorTone[50] },
  high: { label: 'High', fg: '#c2410c', bg: '#fff7ed' },
  medium: { label: 'Medium', fg: Warning[700], bg: Warning[50] },
  low: { label: 'Low', fg: Success[700], bg: Success[50] },
};

export const priorityMeta = (p?: string) =>
  PRIORITY_META[(p || 'medium').toLowerCase()] || PRIORITY_META.medium;

export const CATEGORY_OPTIONS = [
  { value: 'order', label: 'Order Issue' },
  { value: 'delivery', label: 'Delivery & Shipping' },
  { value: 'payment', label: 'Payment & Refund' },
  { value: 'product', label: 'Product Quality' },
  { value: 'account', label: 'Account & Login' },
  { value: 'other', label: 'Other' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 600;

export const categoryLabel = (value: string) =>
  CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;

export const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export const fmtDateTime = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export const BRAND = Palette;
