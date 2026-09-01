'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, Store, X, Building2, FileText, Globe, Mail, Phone, User, Check, Loader2 } from 'lucide-react';
import { showCenterNotice } from '@/components/UI/CenterNotice';
import { enquiryService } from '@/services/enquiryService';

const EMPTY = {
  vendorType: 'REGISTERED' as 'REGISTERED' | 'UNREGISTERED',
  name: '',
  companyName: '',
  gstNumber: '',
  email: '',
  phone: '',
  website: '',
};

/** Fifteen alphanumerics. The backend's rule; repeated here only to guide. */
const GST_PATTERN = /^[A-Z0-9]{15}$/i;
const GST_LENGTH = 15;

const LABEL_CLASS =
  'mb-2 block text-[13px] font-semibold text-[#3d352f] transition-colors duration-200 ' +
  // The wrapper is a `group`, so the caption picks up brand red the moment the
  // caret lands in its field. Pure CSS — no focus state tracked in React.
  'group-focus-within:text-[#e01a1b]';

const FIELD_CLASS =
  'w-full rounded-xl border border-[#e6dcd0] bg-white py-3 text-[15px] text-[#1a1a1a] outline-none ' +
  'transition-colors placeholder:text-[#a89a8d] focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15';

/**
 * The mark that fades into a field once it holds something usable. Scale as
 * well as opacity: at this size a fade alone reads as a rendering glitch,
 * where a thing that grows into place reads as a response.
 */
function FieldTick({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute right-3.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[#e6f5ec] text-[#1f9d57] transition-all duration-300 ${
        done ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
      }`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}

/**
 * "Join Us as a Vendor" — one application form for all three entry points:
 * the header's SELL ON M2C button, the home page's BrandPromo banner, and the
 * contact page's vendor section.
 *
 * ── Why it is portalled ───────────────────────────────────────────────────
 *
 * The header is `sticky top-0 z-50 isolate`. `isolate` opens a stacking
 * context, so an overlay declared inside it can never rise above the header's
 * own level no matter what z-index it asks for — and one of the three triggers
 * lives in the header. Portalling to document.body takes it out of that
 * context entirely, which is also why the same component can be dropped
 * anywhere without thinking about where it sits in the tree.
 *
 * ── Keyboard and focus ────────────────────────────────────────────────────
 *
 * Escape closes. Focus moves to the first field on open and returns to
 * whatever opened it on close. Tab cycles inside the dialog rather than
 * walking off into the page behind the scrim. None of which it had.
 */
export default function VendorApplicationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gstError, setGstError] = useState('');
  /**
   * The GST field used to complain from the very first character, because it
   * validated a 15-character rule on every keystroke: type "2" and it told you
   * off for not having typed the other fourteen yet. It now waits until you
   * leave the field, or until you have typed enough that the length can no
   * longer be the problem.
   */
  const [gstTouched, setGstTouched] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // GST numbers are written in upper case everywhere else they appear.
    const next = name === 'gstNumber' ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: next }));

    if (name === 'gstNumber') {
      const complete = next.length >= GST_LENGTH;
      if (!next || (!gstTouched && !complete)) setGstError('');
      else if (!GST_PATTERN.test(next)) setGstError(`GST Number must be exactly ${GST_LENGTH} alphanumeric characters`);
      else setGstError('');
    }
  };

  const handleGstBlur = () => {
    setGstTouched(true);
    if (form.gstNumber && !GST_PATTERN.test(form.gstNumber)) {
      setGstError(`GST Number must be exactly ${GST_LENGTH} alphanumeric characters`);
    }
  };

  /**
   * Which required answers are usable, recomputed on every keystroke. Separate
   * from whether the browser will let the form submit — native validation only
   * speaks up once you try, and a six-field form should say where you are
   * while you are still inside it.
   */
  // GST is only a required answer for a REGISTERED vendor; an unregistered vendor
  // can apply without one.
  const isRegistered = form.vendorType === 'REGISTERED';
  const filled = useMemo(() => ({
    name: form.name.trim() !== '',
    companyName: form.companyName.trim() !== '',
    // Deliberately loose: this decides whether to draw a tick, not whether to
    // accept the address.
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
    gstNumber: GST_PATTERN.test(form.gstNumber),
    phone: form.phone.trim() !== '',
  }), [form]);

  // GST counts toward the progress only when a registered vendor is applying.
  const requiredKeys = (isRegistered
    ? ['name', 'companyName', 'email', 'gstNumber', 'phone']
    : ['name', 'companyName', 'email', 'phone']) as (keyof typeof filled)[];
  const answeredCount = requiredKeys.filter((k) => filled[k]).length;
  const requiredCount = requiredKeys.length;
  const readyToSend = answeredCount === requiredCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setGstTouched(true);
    if (isRegistered) {
      // Registered vendor → GST is mandatory and must be valid.
      if (!form.gstNumber) {
        setGstError('GST Number is required');
        return;
      }
      if (!GST_PATTERN.test(form.gstNumber)) {
        setGstError(`GST Number must be exactly ${GST_LENGTH} alphanumeric characters`);
        return;
      }
    } else if (form.gstNumber && !GST_PATTERN.test(form.gstNumber)) {
      // Unregistered vendor → GST optional, but if they typed one it must be valid.
      setGstError(`GST Number must be exactly ${GST_LENGTH} alphanumeric characters`);
      return;
    }

    setIsSubmitting(true);
    try {
      await enquiryService.submitEnquiry({
        name: form.name,
        companyName: form.companyName,
        vendorType: form.vendorType,
        gstNumber: form.gstNumber || undefined,
        email: form.email,
        phone: form.phone,
        website: form.website || undefined,
      });
      setForm(EMPTY);
      setGstError('');
      setGstTouched(false);
      onClose();
      // Centre-screen rather than a corner toast: submitting an application is
      // the end of a task, and the confirmation should stop you rather than
      // slide past in the corner while you are looking at the form.
      //
      // 9s, well past the 2s default: this message is about twice as long as a
      // plain acknowledgement and it carries the one instruction that matters —
      // that the registration link arrives by email — so it has to survive long
      // enough to actually be read.
      showCenterNotice(
        'success',
        'Thank You!',
        'We’ve received your enquiry. The vendor registration link will be sent to your registered email, or our team will contact you shortly.',
        9000,
        'Done',
      );
    } catch (error: unknown) {
      // Logged in full, shown in plain language. The API's own string used to
      // reach the customer whenever it returned one, which is how an internal
      // message ends up in front of a shopper.
      console.error('Vendor application error:', error);
      /**
       * 409 is not a failure, it is an answer.
       *
       * The API refuses a second enquiry from an address that already has one
       * awaiting review (enquiryController: findFirst on email + status
       * 'pending', then 409). Verified against the live endpoint — a fresh
       * address returns 201, the same address again returns 409 with "An
       * enquiry with this email is already pending review."
       *
       * That case must not say "Try Again", because trying again with the same
       * address cannot ever succeed; it would send someone round a loop with no
       * exit. Amber rather than red, and rather than the `info` blue, which is
       * the one colour this storefront has none of: nothing here is broken.
       *
       * enquiryService rethrows with the status attached — it used to collapse
       * the axios error into `new Error(message)`, which kept the text and lost
       * the code, so this case could not be told apart at all.
       */
      const status = (error as { status?: number } | null)?.status;

      if (status === 409) {
        showCenterNotice(
          'warning',
          'Already Applied',
          'We already have an enquiry pending for this email address. Our team will be in touch with you shortly.',
          9000,
          'Close',
        );
        return;
      }

      // The modal is deliberately NOT closed on failure — the form is still
      // behind this, still filled in — so "Try Again" dismisses straight back
      // onto it rather than sending anyone off to start over.
      showCenterNotice(
        'error',
        'Something Went Wrong',
        'We couldn’t submit your enquiry. Please try again, or contact us if the issue continues.',
        7000,
        'Try Again',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    // After paint, or the field is not focusable yet.
    const raf = requestAnimationFrame(() => firstFieldRef.current?.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
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
  }, [open, isSubmitting, onClose]);

  // `open` is false on every server render and on hydration at all three call
  // sites, so this returns null before createPortal ever looks for the body.
  if (!open || typeof document === 'undefined') return null;

  const gstCount = form.gstNumber.length;

  return createPortal(
    <div
      className="va-overlay fixed inset-0 z-[200] flex items-end justify-center bg-[#2a1d16]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      // Only the scrim closes, and only on mousedown — a drag that starts
      // inside the panel and releases outside must not dismiss it.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <style>{`
        @keyframes vaFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vaPanel {
          from { opacity: 0; transform: translateY(16px) scale(.98) }
          to   { opacity: 1; transform: none }
        }
        .va-overlay { animation: vaFade 180ms ease-out both }
        .va-panel { animation: vaPanel 260ms cubic-bezier(0.22, 0.94, 0.30, 1) both }
        @media (prefers-reduced-motion: reduce) {
          .va-overlay, .va-panel { animation: none }
        }
      `}</style>

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-application-title"
        className="va-panel flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#efe4d8] bg-white shadow-[0_30px_70px_-30px_rgba(42,29,22,0.7)] sm:max-h-[90vh] sm:rounded-2xl"
      >
        {/* Header. Warm ground rather than gray-50, and the subtitle no longer
            hides on mobile — it is the one line explaining what this is. */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#efe4d8] bg-[#faf7f3] p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e01a1b] text-white shadow-[0_6px_18px_-6px_rgba(224,26,27,0.7)]"
            >
              <Store className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="vendor-application-title"
                className="font-playfair text-xl font-semibold tracking-tight text-[#1a1a1a] sm:text-2xl"
              >
                Join as a Vendor
              </h2>
              <p className="mt-0.5 text-[13px] text-[#5f5550]">Fill in your details to join our marketplace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 text-[#a89a8d] transition-colors hover:bg-white hover:text-[#1a1a1a] disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <form id="vendor-application-form" onSubmit={handleSubmit}>
            {/* The meter. Green on completion rather than staying brand red:
                the colour change is the moment worth marking, and it is
                catchable from the corner of the eye while you are still
                looking at the last field. */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">
                  Your application
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold tabular-nums transition-colors duration-300 ${
                    readyToSend ? 'text-[#1f9d57]' : 'text-[#7a6d62]'
                  }`}
                >
                  {readyToSend && <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={3} />}
                  {readyToSend ? 'Ready to send' : `${answeredCount} of ${requiredCount} complete`}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={requiredCount}
                aria-valuenow={answeredCount}
                aria-label="Required fields completed"
                className="h-1 overflow-hidden rounded-full bg-[#eee3d7]"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    readyToSend ? 'bg-[#1f9d57]' : 'bg-[#e01a1b]'
                  }`}
                  style={{ width: `${(answeredCount / requiredCount) * 100}%` }}
                />
              </div>
            </div>

            {/* Registered vs unregistered — decides whether GST is mandatory. */}
            <div className="mb-5">
              <label className="mb-2 block text-[13px] font-semibold text-[#3d352f]">
                Vendor type <span className="text-[#e01a1b]">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {([
                  { value: 'REGISTERED', label: 'Registered vendor', hint: 'Has a GST number' },
                  { value: 'UNREGISTERED', label: 'Unregistered vendor', hint: 'No GST number' },
                ] as const).map((opt) => {
                  const active = form.vendorType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, vendorType: opt.value }));
                        if (opt.value === 'UNREGISTERED') { setGstError(''); setGstTouched(false); }
                      }}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all ${
                        active ? 'border-[#e01a1b] bg-[#fdf1ef] ring-1 ring-[#e01a1b]/30' : 'border-[#e6dcd3] bg-white hover:border-[#e01a1b]/40'
                      }`}
                    >
                      <span>
                        <span className={`block text-sm font-semibold ${active ? 'text-[#c41617]' : 'text-[#3d352f]'}`}>{opt.label}</span>
                        <span className="block text-[12px] text-[#a89a8d]">{opt.hint}</span>
                      </span>
                      <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${active ? 'border-[#e01a1b] bg-[#e01a1b]' : 'border-[#cbbfb4]'}`} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[12.5px] text-[#a89a8d]">
                {isRegistered ? 'GST number is required for registered vendors.' : 'GST number is optional for unregistered vendors.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="group">
                <label htmlFor="vendor-name" className={LABEL_CLASS}>
                  Full Name <span className="text-[#e01a1b]">*</span>
                </label>
                <div className="relative">
                  <User aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#c0b3a6]" />
                  <input
                    ref={firstFieldRef}
                    type="text"
                    id="vendor-name"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className={`${FIELD_CLASS} pl-11 pr-11`}
                    placeholder="Enter your full name"
                  />
                  <FieldTick done={filled.name} />
                </div>
              </div>

              <div className="group">
                <label htmlFor="vendor-company" className={LABEL_CLASS}>
                  Company Name <span className="text-[#e01a1b]">*</span>
                </label>
                <div className="relative">
                  <Building2 aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#c0b3a6]" />
                  <input
                    type="text"
                    id="vendor-company"
                    name="companyName"
                    required
                    value={form.companyName}
                    onChange={handleChange}
                    className={`${FIELD_CLASS} pl-11 pr-11`}
                    placeholder="Your company name"
                  />
                  <FieldTick done={filled.companyName} />
                </div>
              </div>

              <div className="group">
                <label htmlFor="vendor-gst" className={LABEL_CLASS}>
                  GST Number {isRegistered
                    ? <span className="text-[#e01a1b]">*</span>
                    : <span className="font-normal text-[#a89a8d]">(optional)</span>}
                </label>
                <div className="relative">
                  <FileText aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#c0b3a6]" />
                  <input
                    type="text"
                    id="vendor-gst"
                    name="gstNumber"
                    required={isRegistered}
                    maxLength={GST_LENGTH}
                    value={form.gstNumber}
                    onChange={handleChange}
                    onBlur={handleGstBlur}
                    className={`${FIELD_CLASS} pl-11 pr-16 font-medium tracking-[0.06em] ${
                      gstError ? 'border-[#e01a1b]! bg-red-50/40!' : ''
                    }`}
                    placeholder="29ABCDE1234F1Z5"
                  />
                  {/* A live count instead of a hint that repeats the rule: it
                      answers "how many more" without being read twice. */}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold tabular-nums transition-colors ${
                      filled.gstNumber ? 'text-[#1f9d57]' : 'text-[#a89a8d]'
                    }`}
                  >
                    {gstCount}/{GST_LENGTH}
                  </span>
                </div>
                <p className={`mt-1.5 text-[12.5px] ${gstError ? 'text-[#e01a1b]' : 'text-[#a89a8d]'}`}>
                  {gstError || 'Fifteen letters and digits, e.g. 22AAAAA0000A1Z5'}
                </p>
              </div>

              <div className="group">
                <label htmlFor="vendor-email" className={LABEL_CLASS}>
                  Email Address <span className="text-[#e01a1b]">*</span>
                </label>
                <div className="relative">
                  <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#c0b3a6]" />
                  <input
                    type="email"
                    id="vendor-email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className={`${FIELD_CLASS} pl-11 pr-11`}
                    placeholder="your.email@company.com"
                  />
                  <FieldTick done={filled.email} />
                </div>
              </div>

              <div className="group">
                <label htmlFor="vendor-phone" className={LABEL_CLASS}>
                  Phone Number <span className="text-[#e01a1b]">*</span>
                </label>
                <div className="relative">
                  <Phone aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#c0b3a6]" />
                  <input
                    type="tel"
                    id="vendor-phone"
                    name="phone"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    className={`${FIELD_CLASS} pl-11 pr-11`}
                    // Was +1 (555) 123-4567 — a US format, and 555 is the range
                    // reserved for fiction — shown to applicants who are being
                    // asked for an Indian GST number in the field above it.
                    placeholder="+91 98765 43210"
                  />
                  <FieldTick done={filled.phone} />
                </div>
              </div>

              <div className="group">
                <label htmlFor="vendor-website" className={LABEL_CLASS}>
                  Website URL <span className="font-normal text-[#a89a8d]">(optional)</span>
                </label>
                <div className="relative">
                  <Globe aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#c0b3a6]" />
                  <input
                    type="url"
                    id="vendor-website"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    className={`${FIELD_CLASS} pl-11 pr-4`}
                    placeholder="https://www.yourcompany.com"
                  />
                </div>
              </div>
            </div>

            {/* Was a blue notice — the only blue anywhere on this site, sitting
                directly above the submit button and pulling attention off it.
                Warm, quieter, and it still says the one thing worth knowing. */}
            <p className="mt-6 rounded-xl border border-[#efe4d8] bg-[#faf7f3] px-4 py-3 text-[13.5px] leading-relaxed text-[#5f5550]">
              <span className="font-semibold text-[#1a1a1a]">What happens next.</span>{' '}
              Our team reviews your details and gets back to you within 2&ndash;3 business days.
            </p>
          </form>
        </div>

        {/* Pinned, so on a phone the buttons are reachable without scrolling to
            the bottom of a six-field form. */}
        <div className="shrink-0 border-t border-[#efe4d8] bg-[#faf7f3] p-4 sm:p-5">
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-[#e6dcd0] bg-white px-6 py-3 text-[14px] font-semibold text-[#5f5550] transition-colors hover:bg-[#faf7f3] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="vendor-application-form"
              disabled={isSubmitting}
              className={`btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-[#e01a1b] px-8 py-3 text-[14px] font-semibold text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 ${
                readyToSend ? 'ring-4 ring-[#e01a1b]/15' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 aria-hidden className="h-4.5 w-4.5 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send aria-hidden className="h-4.5 w-4.5" />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
