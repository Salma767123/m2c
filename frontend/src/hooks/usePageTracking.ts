'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/services/analyticsService';

// Pages that should NOT be tracked (admin/vendor/checker dashboards, auth pages, api routes)
const IGNORED_PATTERNS = [
  /^\/admin/,
  /^\/vendor/,
  /^\/checker/,
  /^\/api/,
  /^\/auth/,
];

const shouldTrack = (path: string) => {
  if (!path) return false;
  return !IGNORED_PATTERNS.some((p) => p.test(path));
};

export function usePageTracking() {
  const pathname = usePathname();

  // Holds info for the page the user is currently ON. We send a single record
  // when they leave (or when they unload the tab) — never on entry. This avoids
  // double-counting and ensures each PageView record has a real duration.
  const current = useRef<{ page: string; startTime: number } | null>(null);

  useEffect(() => {
    // Send the previous page's record (if any) with its duration
    if (current.current && shouldTrack(current.current.page)) {
      const duration = Math.round((Date.now() - current.current.startTime) / 1000);
      trackPageView({
        page: current.current.page,
        duration: duration > 0 ? duration : 1,
        referrer: document.referrer || undefined,
      });
    }

    // Start tracking the new page
    current.current = { page: pathname, startTime: Date.now() };
  }, [pathname]);

  // Send the final pageview when the user closes the tab / navigates away
  useEffect(() => {
    const sendOnUnload = () => {
      if (!current.current || !shouldTrack(current.current.page)) return;

      const duration = Math.round((Date.now() - current.current.startTime) / 1000);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

      // sendBeacon is reliable during page unload (fetch/axios isn't)
      try {
        const payload = JSON.stringify({
          page: current.current.page,
          duration: duration > 0 ? duration : 1,
          sessionId: sessionStorage.getItem('m2c_session') || undefined,
          device: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
          browser: navigator.userAgent,
          referrer: document.referrer || undefined,
        });
        navigator.sendBeacon(`${apiUrl}/analytics/track/pageview`, new Blob([payload], { type: 'application/json' }));
        current.current = null;
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeunload', sendOnUnload);
    window.addEventListener('pagehide', sendOnUnload);

    return () => {
      window.removeEventListener('beforeunload', sendOnUnload);
      window.removeEventListener('pagehide', sendOnUnload);
    };
  }, []);
}
