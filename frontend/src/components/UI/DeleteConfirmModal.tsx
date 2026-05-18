'use client';

import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

type Variant = 'danger' | 'warning' | 'confirm';

interface ConfirmModalProps {
  show: boolean;
  variant?: Variant;
  title?: string;
  subtitle?: string;
  itemName?: string;
  itemDetail?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const variantStyles: Record<Variant, { iconBg: string; iconColor: string; btnBg: string; btnHover: string }> = {
  danger:  { iconBg: 'bg-red-100',    iconColor: 'text-red-600',    btnBg: 'bg-red-600',    btnHover: 'hover:bg-red-700' },
  warning: { iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  btnBg: 'bg-amber-600',  btnHover: 'hover:bg-amber-700' },
  confirm: { iconBg: 'bg-green-100',  iconColor: 'text-green-600',  btnBg: 'bg-green-600',  btnHover: 'hover:bg-green-700' },
};

const variantIcons: Record<Variant, typeof AlertCircle> = {
  danger: AlertCircle,
  warning: AlertTriangle,
  confirm: CheckCircle,
};

export default function DeleteConfirmModal({
  show,
  variant = 'danger',
  title = 'Delete Item',
  subtitle = 'This action cannot be undone',
  itemName,
  itemDetail,
  confirmLabel = 'Delete Permanently',
  loadingLabel,
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  if (!show) return null;

  const style = variantStyles[variant];
  const Icon = variantIcons[variant];
  const defaultLoadingLabel = variant === 'danger' ? 'Deleting...' : 'Processing...';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${style.iconBg}`}>
              <Icon className={`w-6 h-6 ${style.iconColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>

          {(itemName || children) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              {children || (
                <div>
                  <p className="font-medium text-gray-900">{itemName}</p>
                  {itemDetail && <p className="text-sm text-gray-500 mt-1">{itemDetail}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 ${style.btnBg} ${style.btnHover}`}
            >
              {loading ? (loadingLabel || defaultLoadingLabel) : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
