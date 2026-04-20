'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { hasPermission } from '@/lib/auth';

interface PermissionGuardProps {
  permission: string | string[];
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Renders children only if the current admin has the required permission.
 * Otherwise shows an "Access denied" message and offers a way back to
 * the dashboard. Pair with the backend `requirePermission` middleware so the
 * UI doesn't show a shell that the user cannot actually use.
 */
export default function PermissionGuard({
  permission,
  children,
  fallbackPath = '/admin/dashboard',
}: PermissionGuardProps) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // hasPermission reads from sessionStorage/localStorage so it must run on
    // the client. Using state avoids hydration mismatch warnings.
    setAllowed(hasPermission(permission));
  }, [permission]);

  if (allowed === null) {
    // First client render — render nothing to avoid flashing the wrong state
    return null;
  }

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access denied</h2>
          <p className="text-sm text-gray-600 mb-6">
            You don&apos;t have permission to view this page. Contact a Super Admin if you need access.
          </p>
          <button
            onClick={() => router.replace(fallbackPath)}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
