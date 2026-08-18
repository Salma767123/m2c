'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X, Loader2 } from 'lucide-react';

interface LogoutConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** Keeps the dialog up, and both buttons inert, while the request is in flight. */
  isLoggingOut?: boolean;
  /** Shown above the heading when we know who is signing out. */
  userName?: string;
  /**
   * Which words the dialog uses. Must match the control that opened it — the
   * header calls this action "Logout" and the account sidebar calls it "Sign
   * Out", and a dialog that renames the action mid-flow makes the reader stop
   * and check they pressed the right thing.
   */
  variant?: 'signout' | 'logout';
}

/**
 * The two wordings, kept whole rather than assembled from a verb.
 *
 * Built by interpolation this reads fine in English and breaks the moment the
 * cancel button needs "Stay signed in" against "Stay logged in" — the verb is
 * not the only thing that changes.
 */
const COPY = {
  signout: {
    title: 'Sign out of your account?',
    confirm: 'Sign out',
    busy: 'Signing out…',
    cancel: 'Stay signed in',
    signedInAs: 'Signed in as',
  },
  logout: {
    title: 'Log out of your account?',
    confirm: 'Log out',
    busy: 'Logging out…',
    cancel: 'Stay logged in',
    signedInAs: 'Logged in as',
  },
} as const;

/**
 * "Are you sure you want to sign out?"
 *
 * One dialog for all three places a customer can log out — the header account
 * dropdown, the mobile menu, and the account page sidebar. All three used to
 * sign you out on a single click with no way back, which on a phone is one
 * mis-tap away from losing your session mid-checkout.
 *
 * ── Rendered through a portal ─────────────────────────────────────────────
 *
 * Two of the three triggers live inside the header, which is
 * `sticky top-0 z-50 isolate`. `isolate` opens a stacking context, so a fixed
 * overlay declared inside it can never rise above the header's own z-50 no
 * matter what z-index it asks for — it would sit under anything else on the
 * page at that level. Portalling to document.body takes it out of that
 * context entirely, and is also why the same component can be dropped into
 * Profile without thinking about where it sits in the tree.
 *
 * ── Keyboard and focus ────────────────────────────────────────────────────
 *
 * Escape cancels. Focus moves to Cancel on open — the safe choice, so a
 * stray Enter dismisses rather than signs out — and returns to whatever was
 * focused before when the dialog closes. Tab cycles inside the dialog.
 */
export default function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
  isLoggingOut = false,
  userName,
  variant = 'signout',
}: LogoutConfirmModalProps) {
  const copy = COPY[variant];
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    // After paint, or the element is not focusable yet.
    const raf = requestAnimationFrame(() => cancelRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoggingOut) {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key !== 'Tab') return;

      // Keep Tab inside the dialog. Two buttons, so this is short — but
      // without it, tabbing walks off into the page behind the scrim.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // <body> is the scroll container in this app — globals.css puts
    // overflow-x: hidden on html and body, which forces overflow-y from
    // visible to auto — so locking scroll means locking the body, not the
    // documentElement.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, isLoggingOut, onCancel]);

  // No `mounted` flag needed, and deliberately so: `open` is false on every
  // server render and on hydration at all three call sites, so this returns
  // null before createPortal ever looks for document.body. The typeof guard is
  // belt-and-braces for anyone who later mounts this with open already true.
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="lc-overlay fixed inset-0 z-[200] flex items-end justify-center bg-[#2a1d16]/55 p-4 backdrop-blur-sm sm:items-center"
      // Clicking the scrim cancels, but only the scrim — a click that started
      // inside the panel and drifted out on release must not close it.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isLoggingOut) onCancel();
      }}
    >
      <style>{`
        @keyframes lcFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lcPanel {
          from { opacity: 0; transform: translateY(12px) scale(.97) }
          to   { opacity: 1; transform: none }
        }
        .lc-overlay { animation: lcFade 180ms ease-out both }
        .lc-panel { animation: lcPanel 240ms cubic-bezier(0.22, 0.94, 0.30, 1) both }
        @media (prefers-reduced-motion: reduce) {
          .lc-overlay, .lc-panel { animation: none }
        }
      `}</style>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="lc-panel w-full max-w-md rounded-2xl border border-[#efe4d8] bg-white p-6 shadow-[0_30px_70px_-30px_rgba(42,29,22,0.7)] sm:p-7"
      >
        {/* The icon badge is gone: the heading already says "sign out" and the
            confirm button already carries the same glyph, so the badge was the
            third statement of it and the loudest. `aria-describedby` went with
            the body copy — the heading is the whole question now. */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoggingOut}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-2 text-[#a89a8d] transition-colors hover:bg-[#faf7f3] hover:text-[#1a1a1a] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {userName && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">
            {copy.signedInAs} {userName}
          </p>
        )}

        <h2
          id="logout-title"
          className="mt-1.5 font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl"
        >
          {copy.title}
        </h2>

        {/* Column-reverse on mobile: Cancel is the safe option, so it sits
            under the thumb, while Sign out stays visually first in the
            reading order on desktop's right. */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isLoggingOut}
            className="rounded-full border border-[#e6dcd0] bg-white px-5 py-2.5 text-[13.5px] font-semibold text-[#5f5550] transition-colors hover:bg-[#faf7f3] disabled:opacity-50"
          >
            {copy.cancel}
          </button>
          {/* Oxblood, not brand red. Brand red is the colour of "buy" all over
              this site; the destructive action should not borrow it. */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#7a0f10] px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#5d0b0c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {isLoggingOut ? copy.busy : copy.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
