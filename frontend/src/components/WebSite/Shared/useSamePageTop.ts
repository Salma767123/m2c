'use client';

import { usePathname } from 'next/navigation';
import { useCallback, type MouseEvent } from 'react';
import { scrollPageToTop } from '@/lib/pageScroll';

/**
 * Makes a link to the page you are already on do something.
 *
 * The App Router treats a click on the URL already in the address bar as a
 * no-op: no re-render, no scroll, nothing. Measured on /contact, scrolled to
 * 1312px, clicking the footer's own "Contact Us": still 1312px afterwards.
 * Clicking "About M2C" from the same spot correctly lands at 0, so Next's
 * scroll reset is working — it simply never runs for the identical URL.
 *
 * On any ordinary site a link to the current page reloads it and puts you back
 * at the top, so people expect *something*; a link that swallows the click
 * reads as broken rather than as clever. This returns the page to the top,
 * which is the useful half of what a reload would have done, without the
 * reload.
 *
 * Returns a handler factory: `onClick={samePageTop('/contact')}`.
 */
export function useSamePageTop() {
  const pathname = usePathname();

  return useCallback(
    (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      // Let the browser have modified clicks — new tab, new window, download.
      if (event.defaultPrevented || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      // Compare paths only, so a query string or hash still navigates normally.
      const target = href.split(/[?#]/)[0];
      if (target !== pathname) return;

      event.preventDefault();
      scrollPageToTop();
    },
    [pathname]
  );
}
