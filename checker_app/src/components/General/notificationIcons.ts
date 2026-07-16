// Shared notification type → icon → color map.
//
// Mirrors the web reference (frontend/src/components/Shared/NotificationModal.tsx
// ICON_MAP + BG_MAP) with the SAME icon choices and semantic colors, so the
// mobile modal and the foreground banner stay visually consistent with web.
// The two vendor/product ASSIGNED types use brand red (#e01a1b), matching web
// and the app's red theme. Info-style types (QC/enquiry/scheduled) stay blue.

import {
  Bell,
  Factory,
  Package,
  Star,
  Calendar,
  AlertCircle,
  Check,
} from 'lucide-react-native';

export interface NotificationIconStyle {
  Icon: typeof Bell;
  color: string;
  bg: string;
}

// Semantic palettes (hex kept in one place for reuse).
const BLUE: Omit<NotificationIconStyle, 'Icon'> = { color: '#2563eb', bg: '#dbeafe' };
const BRAND: Omit<NotificationIconStyle, 'Icon'> = { color: '#e01a1b', bg: '#fff1f1' };
const ORANGE: Omit<NotificationIconStyle, 'Icon'> = { color: '#ea580c', bg: '#ffedd5' };
const TEAL: Omit<NotificationIconStyle, 'Icon'> = { color: '#0d9488', bg: '#ccfbf1' };
const GREEN: Omit<NotificationIconStyle, 'Icon'> = { color: '#16a34a', bg: '#dcfce7' };
const RED: Omit<NotificationIconStyle, 'Icon'> = { color: '#dc2626', bg: '#fee2e2' };
const GRAY: Omit<NotificationIconStyle, 'Icon'> = { color: '#4b5563', bg: '#f3f4f6' };
const YELLOW: Omit<NotificationIconStyle, 'Icon'> = { color: '#ca8a04', bg: '#fef9c3' };
const INDIGO: Omit<NotificationIconStyle, 'Icon'> = { color: '#4f46e5', bg: '#e0e7ff' };

export const DEFAULT_ICON_STYLE: NotificationIconStyle = {
  Icon: Bell,
  color: '#475569',
  bg: '#e2e8f0',
};

export const TYPE_ICON: Record<string, NotificationIconStyle> = {
  // Assignments / new work — vendor/product assignments use brand red (match
  // web); QC/enquiry/scheduled stay info-blue (web uses blue for those too).
  VENDOR_ASSIGNED: { Icon: Factory, ...BRAND },
  PRODUCT_ASSIGNED: { Icon: Package, ...BRAND },
  QC_ASSIGNED: { Icon: Star, ...BLUE },
  NEW_ENQUIRY: { Icon: Star, ...BLUE },
  INSPECTION_SCHEDULED: { Icon: Calendar, ...BLUE },

  // Re-inspection — orange (RESULT uses a Check)
  REINSPECTION_RAISED: { Icon: AlertCircle, ...ORANGE },
  REINSPECTION_REQUIRED: { Icon: AlertCircle, ...ORANGE },
  REINSPECTION_RESULT: { Icon: Check, ...ORANGE },

  // Submitted — teal
  INSPECTION_SUBMITTED: { Icon: Check, ...TEAL },

  // Completed / approved — green
  INSPECTION_COMPLETED: { Icon: Check, ...GREEN },
  REINSPECTION_COMPLETED: { Icon: Check, ...GREEN },
  PRODUCT_APPROVED: { Icon: Check, ...GREEN },

  // Rejections / hard failures — red
  INSPECTION_FINAL_REJECTED: { Icon: AlertCircle, ...RED },
  PRODUCT_REJECTED: { Icon: AlertCircle, ...RED },
  OUT_OF_STOCK: { Icon: AlertCircle, ...RED },
  PAYMENT_OVERDUE: { Icon: AlertCircle, ...RED },

  // Vendor status — gray
  VENDOR_STATUS_CHANGED: { Icon: Check, ...GRAY },

  // Pending / low stock — yellow
  PRODUCT_PENDING_APPROVAL: { Icon: Package, ...YELLOW },
  LOW_STOCK_ALERT: { Icon: AlertCircle, ...YELLOW },

  // Support — indigo
  SUPPORT_REPLY: { Icon: Bell, ...INDIGO },
  NEW_SUPPORT_TICKET: { Icon: Bell, ...INDIGO },
};

/** Resolve a notification type to its icon + colors, falling back to a slate Bell. */
export function iconFor(type: string): NotificationIconStyle {
  return TYPE_ICON[type] || DEFAULT_ICON_STYLE;
}
