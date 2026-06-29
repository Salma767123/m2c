import { toast } from "@/hooks/use-toast"
import { centerNotice } from "@/components/UI/CenterNotice"

export const showSuccessToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: "success",
  })
}

export const showErrorToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: "destructive",
  })
}

export const showWarningToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: "warning",
  })
}

export const showInfoToast = (title: string, description?: string) => {
  toast({
    title,
    description,
  })
}

// ── File upload feedback ──────────────────────────────────────────────
//
// Shared helpers that every upload flow (logo, certificate, product image,
// inspection photo, etc.) can call to get consistent success/failure toast
// notifications. `validateUpload` keeps the same client-side checks the
// hand-rolled dropzones use today, but routes the outcome through the
// global toast system so the user always sees the result of their click.

export interface UploadValidationOptions {
  /** Human-readable field name, e.g. "Company logo". Used in toast titles. */
  label: string;
  /** Accepted MIME types. */
  allowedTypes: string[];
  /** Plain-English version, e.g. "PNG, JPG, WEBP, or SVG". */
  allowedLabel: string;
  /** Maximum file size in bytes. */
  maxBytes: number;
  /**
   * Plain-English size limit displayed in messages, e.g. "2,048 KB".
   * Project standard (Change 12) is KB across all upload UIs.
   */
  maxLabel: string;
}

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; reason: 'type' | 'size'; message: string };

/** Validate a file against type + size constraints — no side effects. */
export function validateUpload(
  file: File,
  opts: UploadValidationOptions,
): UploadValidationResult {
  if (!opts.allowedTypes.includes(file.type)) {
    const detected = file.type || file.name.split('.').pop() || 'unknown';
    return {
      ok: false,
      reason: 'type',
      message: `${opts.label} must be ${opts.allowedLabel}. You uploaded ${detected}.`,
    };
  }
  if (file.size > opts.maxBytes) {
    // Display the actual size in KB (Change 12 — KB across the product).
    const actualKb = Math.max(1, Math.round(file.size / 1024)).toLocaleString();
    return {
      ok: false,
      reason: 'size',
      message: `${opts.label} must be under ${opts.maxLabel}. Your file is ${actualKb} KB.`,
    };
  }
  return { ok: true };
}

/**
 * Success notice for a completed upload. Shown as a center-screen modal (used by
 * the vendor registration flow) with professional confirmation wording, e.g.
 * "GST Certificate Uploaded Successfully".
 */
export function notifyUploadSuccess(label: string, _fileName: string) {
  centerNotice.success(`${label} Uploaded`, `${label} has been uploaded successfully.`);
}

/** Failure notice — actionable, e.g. "Failed to Upload GST Certificate. Please try again." */
export function notifyUploadError(label: string, message: string) {
  centerNotice.error(`Failed to Upload ${label}`, message || "Please try again.");
}

/**
 * One-shot helper: validate + fire the matching toast + return ok flag.
 * Callers still own the state mutation on success (each form keeps its own
 * preview / blob URL handling), this just centralises the
 * validation+notification half.
 */
export function handleUpload(
  file: File,
  opts: UploadValidationOptions,
): UploadValidationResult {
  const result = validateUpload(file, opts);
  if (result.ok) {
    notifyUploadSuccess(opts.label, file.name);
  } else {
    notifyUploadError(opts.label, result.message);
  }
  return result;
}

// Common toast messages for vendor dashboard
export const vendorToasts = {
  productSaved: () => showSuccessToast("Product Saved", "Your product has been saved successfully."),
  productDeleted: () => showSuccessToast("Product Deleted", "Product has been removed from your catalog."),
  orderUpdated: () => showSuccessToast("Order Updated", "Order status has been updated successfully."),
  settingsSaved: () => showSuccessToast("Settings Saved", "Your settings have been updated."),
  
  saveError: () => showErrorToast("Save Failed", "Unable to save changes. Please try again."),
  deleteError: () => showErrorToast("Delete Failed", "Unable to delete item. Please try again."),
  networkError: () => showErrorToast("Network Error", "Please check your connection and try again."),
  
  unsavedChanges: () => showWarningToast("Unsaved Changes", "You have unsaved changes that will be lost."),
  lowStock: (productName: string) => showWarningToast("Low Stock Alert", `${productName} is running low on stock.`),
}