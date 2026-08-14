"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Center-screen, modal-style notification used by the vendor registration flow.
//
// Appears at the center of the viewport over a very light, blurred backdrop
// (no heavy dark overlay) so success/error/warning/info messages for uploads,
// saves, updates, deletes and submissions are clear but unobtrusive.
//
// Behaviour: smooth fade-in, auto-dismiss after 2s with a smooth fade-out, and
// a top-right ✕ for manual dismissal. No action button.
//
// A tiny module-level store backs it so plain (non-React) helpers — e.g. the
// upload utilities in `toast-utils` — can trigger a notice from anywhere.
// ─────────────────────────────────────────────────────────────────────────────

export type NoticeType = "success" | "error" | "warning" | "info";

export interface CenterNotice {
  id: string;
  type: NoticeType;
  title: string;
  message?: string;
  duration: number;
}

// How long the popup stays before it begins fading out.
const AUTO_CLOSE_MS = 2000;
// Fade-out animation length — kept in sync with the `duration-200` classes.
const EXIT_MS = 200;

let notices: CenterNotice[] = [];
const listeners = new Set<(n: CenterNotice[]) => void>();
let counter = 0;

function emit() {
  for (const l of listeners) l(notices);
}

export function dismissCenterNotice(id: string) {
  notices = notices.filter((n) => n.id !== id);
  emit();
}

export function showCenterNotice(
  type: NoticeType,
  title: string,
  message?: string,
  duration = AUTO_CLOSE_MS
): string {
  // Dedupe: if an identical notice (same type/title/message) is already showing,
  // reuse it instead of stacking a duplicate — guards against React StrictMode
  // double-invoking effects and any accidental double-fire.
  const existing = notices.find((n) => n.type === type && n.title === title && n.message === message);
  if (existing) return existing.id;
  counter += 1;
  const id = `cn_${counter}`;
  notices = [...notices, { id, type, title, message, duration }];
  emit();
  return id;
}

// Convenience API mirroring the corner-toast helpers. All types auto-close
// after the same short delay.
export const centerNotice = {
  success: (title: string, message?: string) => showCenterNotice("success", title, message),
  error: (title: string, message?: string) => showCenterNotice("error", title, message),
  warning: (title: string, message?: string) => showCenterNotice("warning", title, message),
  info: (title: string, message?: string) => showCenterNotice("info", title, message),
};

const STYLES: Record<
  NoticeType,
  { ring: string; iconWrap: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  success: { ring: "border-emerald-200", iconWrap: "bg-emerald-100 text-emerald-600", Icon: CheckCircle2 },
  error: { ring: "border-red-200", iconWrap: "bg-red-100 text-red-600", Icon: XCircle },
  warning: { ring: "border-amber-200", iconWrap: "bg-amber-100 text-amber-600", Icon: AlertTriangle },
  info: { ring: "border-blue-200", iconWrap: "bg-blue-100 text-blue-600", Icon: Info },
};

function NoticeCard({ notice }: { notice: CenterNotice }) {
  const { ring, iconWrap, Icon } = STYLES[notice.type];
  const [leaving, setLeaving] = React.useState(false);

  // Begin the fade-out, then remove from the store once the animation ends.
  const close = React.useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => dismissCenterNotice(notice.id), EXIT_MS);
  }, [notice.id]);

  // Auto-dismiss after the configured delay.
  React.useEffect(() => {
    const t = window.setTimeout(close, notice.duration);
    return () => window.clearTimeout(t);
  }, [close, notice.duration]);

  // Rendered via portal so position:fixed is always relative to the viewport,
  // escaping any stacking context created by layout ancestors (transforms,
  // will-change, overflow, etc.). z-[9999] sits above every layout layer.
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Dim + blur the entire page while the popup is visible */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          leaving ? "opacity-0" : "opacity-100"
        }`}
        onClick={close}
      />
      {/* Card */}
      <div
        role="alertdialog"
        aria-live={notice.type === "error" ? "assertive" : "polite"}
        className={`relative w-full max-w-sm bg-white rounded-2xl border ${ring} shadow-2xl p-6 text-center duration-200 ${
          leaving ? "animate-out fade-out zoom-out-95" : "animate-in fade-in zoom-in-95"
        }`}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${iconWrap} animate-in zoom-in-50 duration-300`}>
          <Icon className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mt-4">{notice.title}</h3>
        {notice.message && <p className="text-sm text-slate-600 mt-1.5 leading-relaxed break-words">{notice.message}</p>}
        <button
          type="button"
          onClick={close}
          className="mt-5 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
        >
          OK
        </button>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

// Mount once in any layout. Renders the most recent notice center-screen,
// one at a time, via a portal so it always floats above every UI layer.
export function CenterNoticeHost() {
  const [list, setList] = React.useState<CenterNotice[]>(notices);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  // Avoid SSR mismatch — portal targets document.body which only exists client-side.
  if (!mounted) return null;

  const current = list[list.length - 1];
  if (!current) return null;
  // `key` ensures a fresh card (and fresh timers/animation) per notice.
  return <NoticeCard key={current.id} notice={current} />;
}
