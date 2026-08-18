'use client';

import { Mail, Phone, MapPin, Clock, Send, Store, X, Building2, FileText, Globe, Loader2, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import Reveal from '@/components/WebSite/Shared/Reveal';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { enquiryService } from '@/services/enquiryService';
import { contactEnquiryService } from '@/services/contactEnquiryService';
import { HEAR_ABOUT_US_OPTIONS } from '@/lib/enquirySources';
import Dropdown from '@/components/UI/Dropdown';
/**
 * The vendor band's ground - the pale rose panel from the homepage's Best
 * Seller row, copied string for string rather than matched by eye.
 *
 * It was `from-gray-900 to-gray-800`: #111827 to #1f2937, a cool blue-black
 * belonging to no palette on this site, meeting the maroon footer edge to
 * edge with nothing between them.
 *
 * Light maroon instead. Not a new colour - it is brand red pulled right down,
 * already carrying the homepage's Best Seller row and the DownloadApp QR
 * card. Kept identical to BestSeller.tsx so the two stay in step: if that one
 * is ever retuned, this is the same edit twice, not a fresh guess.
 *
 * Contrast on the darkest step (#f7e5e0), measured there and re-checked here:
 * body text #5f5550 is 5.94:1, the 11px eyebrow #c41617 is 4.96:1.
 */
const VENDOR_GROUND =
  'border-y border-[#eedad4] bg-linear-to-b from-[#fdf7f5] via-[#f7e5e0] to-[#fdf8f6]';
/**
 * One definition per control type. The fields used to carry their styling
 * inline, eight times over, which is how one of them ends up with a different
 * border than its neighbours after an edit.
 *
 * White fields on the panel's warm ground, rather than the old transparent
 * fields on grey - an input that is the same colour as the thing behind it
 * does not look like somewhere you can type.
 */
/**
 * The contact details, exactly as this page already carried them.
 *
 * They are placeholders - heritagetextiles.com is not this company, and +1
 * (555) is the number range reserved for fiction - and they are left alone on
 * purpose. Rewriting what a page says is not part of a UI pass, and swapping
 * live contact details is the owner's call, not mine.
 *
 * Lifted into one object rather than typed into the markup so that whenever
 * the real values are settled - by hand here, or by pointing this at
 * companyInfoService.getPublicCompanyInfo(), the admin record the footer
 * already reads - it is a single edit instead of eleven scattered strings.
 */
const CONTACT_DETAILS = {
  emails: ['info@heritagetextiles.com', 'support@heritagetextiles.com'],
  phones: ['+1 (555) 123-4567', '+1 (555) 987-6543'],
  address: ['123 Heritage Lane', 'Artisan District, AD 12345', 'United States'],
  // Was a Monday-to-Saturday counter schedule with Sunday closed. M2C has no
  // shopfront and care is staffed round the clock, so the card states that
  // instead - and the page stops contradicting itself, since the vendor band
  // further down has always advertised 24/7 support.
  support: ['Available 24/7', 'Every day of the week'],
  partnerships: 'partnerships@heritagetextiles.com',
};

/**
 * The four blocks of the directory. Data-driven because they are the same
 * shape four times over - an icon, a caption, and one or more lines, some of
 * which can be acted on.
 */
const DIRECTORY = [
  {
    key: 'email',
    Icon: Mail,
    label: 'Email Us',
    lines: CONTACT_DETAILS.emails.map((value) => ({ text: value, href: `mailto:${value}` })),
  },
  {
    key: 'phone',
    Icon: Phone,
    label: 'Call Us',
    // Strip the formatting out of the href only; the visible text keeps it.
    lines: CONTACT_DETAILS.phones.map((value) => ({
      text: value,
      href: `tel:${value.replace(/[^\d+]/g, '')}`,
    })),
  },
  {
    key: 'address',
    Icon: MapPin,
    label: 'Visit Us',
    lines: CONTACT_DETAILS.address.map((value) => ({ text: value, href: null })),
  },
  {
    key: 'support',
    Icon: Clock,
    label: 'Customer Care',
    lines: CONTACT_DETAILS.support.map((value) => ({ text: value, href: null })),
  },
];

/**
 * One weight, one colour, for every value in the directory.
 *
 * The rows used to style themselves by whether the line happened to be
 * actionable: email and phone came out semibold near-black because they are
 * links, address and hours came out regular in a lighter grey because they are
 * not. Two properties changing at once, for a reason no reader could infer -
 * it just looked like two of the four rows had been missed.
 *
 * Being a link is now carried by behaviour instead: colour and an underline on
 * hover, and the pointer. Nothing that shifts the weight of static text.
 */
const DIRECTORY_LINE_CLASS = 'text-[14.5px] font-medium leading-relaxed text-[#1a1a1a]';

const LABEL_CLASS =
  'mb-2 block text-[13px] font-semibold text-[#3d352f] transition-colors duration-200 ' +
  // The wrapper is a `group`, so the caption picks up brand red the moment the
  // caret lands in its field. Pure CSS - no focus state to track in React.
  'group-focus-within:text-[#e01a1b]';
/**
 * The mark that fades into a field once it holds something usable.
 *
 * Scale as well as opacity: fading alone reads as a rendering glitch at this
 * size, where a thing that grows into place reads as a response.
 */
function FieldTick({ done, align = 'middle' }: { done: boolean; align?: 'middle' | 'top' }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute right-3.5 grid h-6 w-6 place-items-center rounded-full bg-[#e6f5ec] text-[#1f9d57] transition-all duration-300 ${
        align === 'top' ? 'top-3.5' : 'top-1/2 -translate-y-1/2'
      } ${done ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
    >
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}

const FIELD_CLASS =
  'w-full rounded-xl border border-[#e6dcd0] bg-white px-4 py-3 text-[15px] text-[#1a1a1a] outline-none ' +
  'transition-colors placeholder:text-[#a89a8d] focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/15';

/**
 * Tailwind v4 takes important as a SUFFIX (`bg-white!`), not the v3 prefix.
 * The shared Dropdown appends buttonClassName after its own defaults, but
 * source order in the stylesheet decides the winner, not order in the
 * attribute - so the two it already sets have to be forced.
 */
const DROPDOWN_BUTTON_CLASS = 'rounded-xl! border-[#e6dcd0]! px-4! py-3! text-[15px]!';
const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    hearAboutUs: '',
    hearAboutUsOther: ''
  });

  // The custom Dropdown is a button, not a form control, so native `required`
  // can't validate it — this drives the inline error instead.
  const [hearAboutUsError, setHearAboutUsError] = useState(false);
  const [hearAboutUsOtherError, setHearAboutUsOtherError] = useState(false);

  /**
   * The contact form had no in-flight state at all: the button stayed live
   * while the request was out, so a second click sent the same enquiry again.
   * The vendor form below has always guarded this; this one never did.
   */
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    companyName: '',
    gstNumber: '',
    email: '',
    phone: '',
    website: ''
  });
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [gstError, setGstError] = useState('');

  /**
   * Which required answers are actually usable, recomputed on every keystroke.
   *
   * This drives the ticks and the meter at the head of the form, and it is a
   * separate question from whether the browser will let the form submit -
   * native validation only speaks up once you try. The point of showing it is
   * that a five-field form should tell you where you are while you are still
   * in it, rather than after you press the button.
   */
  const filled = useMemo(() => {
    // Deliberately loose. This decides whether to draw a tick, not whether to
    // accept the address - a stricter pattern here would tick "off" on
    // perfectly real addresses and read as the form arguing with you.
    const emailLooksReal = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    const sourceAnswered =
      formData.hearAboutUs !== '' &&
      (formData.hearAboutUs !== 'other' || formData.hearAboutUsOther.trim() !== '');

    return {
      name: formData.name.trim() !== '',
      email: emailLooksReal,
      subject: formData.subject.trim() !== '',
      source: sourceAnswered,
      message: formData.message.trim() !== '',
    };
  }, [formData]);

  const answeredCount = Object.values(filled).filter(Boolean).length;
  const requiredCount = Object.keys(filled).length;
  const readyToSend = answeredCount === requiredCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hearAboutUs) {
      setHearAboutUsError(true);
      document.getElementById('hearAboutUs')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // "Other" is only useful if they say what it was.
    if (formData.hearAboutUs === 'other' && !formData.hearAboutUsOther.trim()) {
      setHearAboutUsOtherError(true);
      document.getElementById('hearAboutUsOther')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsSubmitting(true);
    try {
      await contactEnquiryService.submitEnquiry({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        hearAboutUs: formData.hearAboutUs || undefined,
        hearAboutUsOther: formData.hearAboutUs === 'other' ? formData.hearAboutUsOther.trim() : undefined
      });

      // Reset form
      setFormData({ name: '', email: '', subject: '', message: '', hearAboutUs: '', hearAboutUsOther: '' });
      setHearAboutUsError(false);
      setHearAboutUsOtherError(false);
      showSuccessToast('Message Sent!', 'Thank you for your message! We will get back to you soon.');
    } catch (error: any) {
      console.error('Contact form error:', error);
      showErrorToast('Send Failed', error.message || 'Unable to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleVendorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convert GST number to uppercase
    const updatedValue = name === 'gstNumber' ? value.toUpperCase() : value;
    
    setVendorFormData({
      ...vendorFormData,
      [name]: updatedValue
    });

    // Validate GST number on change
    if (name === 'gstNumber') {
      if (value && !/^[A-Z0-9]{15}$/i.test(value)) {
        setGstError('GST Number must be exactly 15 alphanumeric characters');
      } else {
        setGstError('');
      }
    }
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate GST number before submission
    if (!vendorFormData.gstNumber) {
      setGstError('GST Number is required');
      return;
    }
    
    if (!/^[A-Z0-9]{15}$/i.test(vendorFormData.gstNumber)) {
      setGstError('GST Number must be exactly 15 alphanumeric characters');
      return;
    }
    
    setIsSubmittingVendor(true);
    try {
      await enquiryService.submitEnquiry({
        name: vendorFormData.name,
        companyName: vendorFormData.companyName,
        gstNumber: vendorFormData.gstNumber,
        email: vendorFormData.email,
        phone: vendorFormData.phone,
        website: vendorFormData.website || undefined
      });
      setVendorFormData({ name: '', companyName: '', gstNumber: '', email: '', phone: '', website: '' });
      setGstError('');
      setShowVendorModal(false);
      showSuccessToast('Application Submitted!', 'Thank you for your interest! We will review your application and get back to you soon.');
    } catch (error: any) {
      showErrorToast('Submission Failed', error.message || 'Unable to submit application. Please try again.');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  return (
    <div className="bg-white font-sans" >
      {/* ── Customer care ────────────────────────────────────────────────
          This was a centred paragraph on a tint: an eyebrow reading "Get in
          touch" sitting directly above an h1 reading "Get in Touch", over copy
          inviting you to learn about our artisans, on a page for a discount
          home-textiles shop.

          For a while it carried a live Open now / Closed panel driven by a
          weekly schedule. That was the wrong idea for this business — M2C has
          no shopfront and support does not keep counter hours — so the panel,
          and every piece of clock machinery behind it (a fixed-timezone Intl
          formatter, a minute-aligned timer, a hydration-safe external store),
          came out. None of it is worth keeping for a company that is reachable
          all week.

          Centred rather than a two-column split, because with the panel gone
          there is no second column: text pinned left with nothing on the right
          is the stranded-object problem this page already had once. */}
      <section className="border-b border-[#efe4d8] bg-[#faf7f3] py-12 font-sans sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
              <span aria-hidden className="h-px w-6 bg-[#e01a1b]" />
              Customer care
            </span>

            <h1 className="mb-3 font-playfair text-3xl font-semibold tracking-tight text-[#1a1a1a] sm:text-4xl lg:text-5xl">
              We&apos;re here to help
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#5f5550] sm:text-lg">
              Questions about an order, a return, or when something will arrive
              &mdash; reach us whichever way suits you.
            </p>

            {/* The primary line of each, and the same strings the directory
                below prints — one object feeds both, so the two halves of the
                page cannot end up quoting different numbers. */}
            <div className="mt-7 flex flex-wrap justify-center gap-2.5">
              <a
                href={`tel:${CONTACT_DETAILS.phones[0].replace(/[^\d+]/g, '')}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#e6dcd0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] transition-colors hover:border-[#e01a1b] hover:text-[#e01a1b]"
              >
                <Phone aria-hidden className="h-4 w-4 shrink-0 text-[#e01a1b]" />
                <span className="truncate">{CONTACT_DETAILS.phones[0]}</span>
              </a>
              <a
                href={`mailto:${CONTACT_DETAILS.emails[0]}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#e6dcd0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a1a] transition-colors hover:border-[#e01a1b] hover:text-[#e01a1b]"
              >
                <Mail aria-hidden className="h-4 w-4 shrink-0 text-[#e01a1b]" />
                <span className="truncate">{CONTACT_DETAILS.emails[0]}</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Contact information, and the message form ──────────────────
          Every word and every value in here is the copy the page already
          carried, placeholder emails and +1 (555) numbers included. Those are
          the owner's to change, not a UI pass's.

          What changed is that the section responds now. It used to be two
          still panels: you read the left one, you filled the right one, and
          nothing on screen acknowledged either. A five-field form should tell
          you where you are while you are still inside it, not after you press
          the button — so the head of the form keeps a running count, each
          field marks itself once it holds something usable, and the caption
          above whichever field has the caret turns brand red. The directory
          answers to the pointer the same way. */}
      <section className="bg-white py-12 font-sans sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <Reveal>
                <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
                  <span aria-hidden className="h-px w-6 bg-[#e01a1b]" />
                  Reach Us
                </span>
                <h2 className="mb-5 font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl">
                  Contact Information
                </h2>
              </Reveal>

              <div className="divide-y divide-[#f2e9df] overflow-hidden rounded-2xl border border-[#efe4d8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                {DIRECTORY.map((row, index) => (
                  <Reveal
                    key={row.key}
                    delay={index * 80}
                    className="group relative flex items-start gap-4 overflow-hidden px-5 py-4 transition-colors duration-300 hover:bg-[#faf7f3]"
                  >
                    {/* Wipes down from the top rather than fading in — a bar
                        that draws itself reads as the row answering, where one
                        that simply appears reads as a repaint. */}
                    <span
                      aria-hidden
                      className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-[#e01a1b] transition-transform duration-300 ease-out group-hover:scale-y-100"
                    />

                    <span
                      aria-hidden
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fdf3f0] text-[#e01a1b] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#e01a1b] group-hover:text-white"
                    >
                      <row.Icon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1 transition-transform duration-300 group-hover:translate-x-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">
                        {row.label}
                      </p>
                      <div className="mt-1 space-y-0.5">
                        {row.lines.map((line) =>
                          line.href ? (
                            <a
                              key={line.text}
                              href={line.href}
                              className={`${DIRECTORY_LINE_CLASS} block truncate transition-colors hover:text-[#e01a1b] hover:underline hover:underline-offset-4`}
                            >
                              {line.text}
                            </a>
                          ) : (
                            <p key={line.text} className={DIRECTORY_LINE_CLASS}>
                              {line.text}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal
                delay={320}
                className="mt-6 rounded-2xl border border-[#efe4d8] bg-[#faf7f3] p-5 sm:p-6"
              >
                <h3 className="text-lg font-semibold text-[#1a1a1a]">For Artisan Partnerships</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#5f5550]">
                  Are you a skilled artisan interested in joining our marketplace? We&apos;d love to
                  learn about your craft and explore partnership opportunities.
                </p>
                <p className="mt-3 text-[14.5px] text-[#5f5550]">
                  Email us at:{' '}
                  <a
                    href={`mailto:${CONTACT_DETAILS.partnerships}`}
                    className="font-semibold text-[#e01a1b] transition-colors hover:text-[#c41617]"
                  >
                    {CONTACT_DETAILS.partnerships}
                  </a>
                </p>
              </Reveal>
            </div>

            <div className="lg:col-span-7">
              <Reveal>
                <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
                  <span aria-hidden className="h-px w-6 bg-[#e01a1b]" />
                  Say Hello
                </span>
                <h2 className="mb-5 font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl">
                  Send us a Message
                </h2>
              </Reveal>

              {/* Deliberately NOT inside <Reveal>. `.reveal` sets
                  `will-change: transform`, which opens a stacking context that
                  never closes — and the shared Dropdown positions its list with
                  `absolute z-50`, so inside a Reveal the options open behind
                  whatever follows on the page. */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-[#efe4d8] bg-[#faf7f3] p-5 sm:p-7"
              >
                {/* The meter. It turns green on completion rather than staying
                    brand red: the colour change is the moment worth marking,
                    and it is catchable from the corner of the eye while you are
                    still looking at the last field. */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a89a8d]">
                      Your message
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

                {/* Name and email pair up: two short fields that used to eat
                    two full rows of a very tall form. */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="group">
                    <label htmlFor="name" className={LABEL_CLASS}>
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className={`${FIELD_CLASS} pr-11`}
                        placeholder="Your full name"
                      />
                      <FieldTick done={filled.name} />
                    </div>
                  </div>

                  <div className="group">
                    <label htmlFor="email" className={LABEL_CLASS}>
                      Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={`${FIELD_CLASS} pr-11`}
                        placeholder="your.email@example.com"
                      />
                      <FieldTick done={filled.email} />
                    </div>
                  </div>
                </div>

                <div className="group mt-5">
                  <label htmlFor="subject" className={LABEL_CLASS}>
                    Subject *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className={`${FIELD_CLASS} pr-11`}
                      placeholder="What is this regarding?"
                    />
                    <FieldTick done={filled.subject} />
                  </div>
                </div>

                <div className="group mt-5">
                  <label htmlFor="hearAboutUs" className={LABEL_CLASS}>
                    How Did You Hear About Us? *
                  </label>
                  {/* Shared Dropdown (same control as checkout / admin) — a
                      native <select> renders the OS menu, which ignores the
                      brand theme. It is a button, not a form control, so native
                      `required` cannot validate it; the inline error does.

                      No tick on this one: the panel's own chevron already owns
                      the right-hand end of the control, and the chosen answer
                      is written across the face of it. */}
                  <Dropdown
                    id="hearAboutUs"
                    value={formData.hearAboutUs}
                    options={HEAR_ABOUT_US_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    placeholder="Please select an option"
                    onChange={(val) => {
                      const next = val as string;
                      setFormData((prev) => ({
                        ...prev,
                        hearAboutUs: next,
                        // Drop any stale text when switching away from "Other".
                        hearAboutUsOther: next === 'other' ? prev.hearAboutUsOther : '',
                      }));
                      setHearAboutUsError(false);
                      setHearAboutUsOtherError(false);
                    }}
                    error={hearAboutUsError}
                    buttonClassName={DROPDOWN_BUTTON_CLASS}
                  />
                  {hearAboutUsError && (
                    <p className="mt-1.5 text-sm text-[#e01a1b]">Please select an option.</p>
                  )}

                  {/* "Other" needs the actual answer, otherwise the bucket is
                      meaningless in the source report. */}
                  {formData.hearAboutUs === 'other' && (
                    <div className="mt-4">
                      <label htmlFor="hearAboutUsOther" className={LABEL_CLASS}>
                        Please tell us how *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="hearAboutUsOther"
                          name="hearAboutUsOther"
                          maxLength={200}
                          value={formData.hearAboutUsOther}
                          onChange={(e) => {
                            handleChange(e);
                            if (e.target.value.trim()) setHearAboutUsOtherError(false);
                          }}
                          className={`${FIELD_CLASS} pr-11 ${
                            hearAboutUsOtherError ? 'border-[#e01a1b]! bg-red-50/40!' : ''
                          }`}
                          placeholder="e.g. Saw your stall at a local market"
                        />
                        <FieldTick done={formData.hearAboutUsOther.trim() !== ''} />
                      </div>
                      {hearAboutUsOtherError && (
                        <p className="mt-1.5 text-sm text-[#e01a1b]">
                          Please tell us how you heard about us.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="group mt-5">
                  <label htmlFor="message" className={LABEL_CLASS}>
                    Message *
                  </label>
                  <div className="relative">
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className={`${FIELD_CLASS} resize-y pr-11`}
                      placeholder="Tell us more about your inquiry..."
                    />
                    <FieldTick done={filled.message} align="top" />
                  </div>
                  {/* Always rendered, only sometimes visible, so the button
                      below does not jump the first time you type. */}
                  <div className="mt-1.5 flex justify-end">
                    <span
                      className={`text-[12px] tabular-nums text-[#a89a8d] transition-opacity duration-300 ${
                        formData.message.length ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      {formData.message.length} characters
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn-shine mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#e01a1b] px-6 py-3.5 font-semibold text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 sm:w-auto sm:px-10 ${
                    readyToSend ? 'ring-4 ring-[#e01a1b]/15' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send aria-hidden className="h-5 w-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Vendor Invitation Section */}
      <section className={`py-10 sm:py-12 lg:py-16 ${VENDOR_GROUND}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="text-center">
            {/* `flex` and not `inline-flex`.
                Both this and the eyebrow below it were inline-level inside a
                text-center block, so they shared a line and the eyebrow hung
                off the disc's right shoulder - and the disc's own mb-6 did
                nothing, because there was no line break for it to act across.
                A block-level box pushes the eyebrow onto its own line, which is
                what the margin was always written for. */}
            <div className="mx-auto flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-[#e01a1b] rounded-full mb-4 sm:mb-6 shadow-[0_6px_20px_rgba(224,26,27,0.4)]">
              <Store className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            {/* The deep brand red the Best Seller row uses for the same
                eyebrow, not the #f24344 this carried on the navy - that tone
                was picked to survive a dark ground and is far too pale to hold
                on a light one. */}
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#c41617] mb-3">
              <span aria-hidden className="h-px w-6 bg-[#c41617]" />
              Partner With Us
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-3 sm:mb-4">
              Become a Vendor Partner
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-[#5f5550] max-w-3xl mx-auto mb-6 sm:mb-8">
              Join our marketplace and showcase your products to thousands of customers.
              We're looking for quality vendors who share our commitment to excellence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 max-w-4xl mx-auto mb-8 sm:mb-10">
              <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl ring-1 ring-[#eedad4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-[#e01a1b]/35 hover:shadow-[0_14px_32px_-18px_rgba(196,22,23,0.45)] hover:-translate-y-0.5 transition-all duration-500">
                <div className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] mb-1 sm:mb-2">10K+</div>
                <div className="text-sm sm:text-base text-[#5f5550]">Active Customers</div>
              </div>
              <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl ring-1 ring-[#eedad4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-[#e01a1b]/35 hover:shadow-[0_14px_32px_-18px_rgba(196,22,23,0.45)] hover:-translate-y-0.5 transition-all duration-500">
                <div className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] mb-1 sm:mb-2">500+</div>
                <div className="text-sm sm:text-base text-[#5f5550]">Vendor Partners</div>
              </div>
              {/* Briefly read "2-3 Days · Application Review", swapped in
                  because the live hours panel at the top of this page
                  contradicted a 24/7 claim. Confirmed since that support
                  genuinely is round the clock, and the panel has gone, so this
                  is back to the copy the page always carried. */}
              <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl ring-1 ring-[#eedad4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-[#e01a1b]/35 hover:shadow-[0_14px_32px_-18px_rgba(196,22,23,0.45)] hover:-translate-y-0.5 transition-all duration-500">
                <div className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] mb-1 sm:mb-2">24/7</div>
                <div className="text-sm sm:text-base text-[#5f5550]">Support Available</div>
              </div>
            </div>

            <button
              onClick={() => setShowVendorModal(true)}
              className="btn-shine bg-[#e01a1b] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-[#c41617] transition-all duration-300 transform hover:-translate-y-0.5 shadow-[0_6px_20px_rgba(224,26,27,0.35)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.5)] inline-flex items-center gap-2"
            >
              <Store className="w-5 h-5" />
              Join Us as a Vendor
            </button>
          </Reveal>
        </div>
      </section>

      {/* Vendor Application Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 lg:p-6 border-b border-gray-200 bg-gray-50 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-linear-to-br from-[#e01a1b] to-[#8d1618] rounded-full flex items-center justify-center shrink-0">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">Vendor Application</h2>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Fill in your details to join our marketplace</p>
                </div>
              </div>
              <button
                onClick={() => setShowVendorModal(false)}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 lg:p-6 overflow-y-auto flex-1">
              <form onSubmit={handleVendorSubmit} className="space-y-4 sm:space-y-5">
                {/* Row 1: Full Name | Company Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label htmlFor="vendor-name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="vendor-name"
                      name="name"
                      required
                      value={vendorFormData.name}
                      onChange={handleVendorChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="company-name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        id="company-name"
                        name="companyName"
                        required
                        value={vendorFormData.companyName}
                        onChange={handleVendorChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                        placeholder="Your company name"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 2: GST Number | Email Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="gst-number" className="block text-sm font-semibold text-gray-700 mb-2">
                      GST Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        id="gst-number"
                        name="gstNumber"
                        required
                        maxLength={15}
                        value={vendorFormData.gstNumber}
                        onChange={handleVendorChange}
                        className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all ${
                          gstError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="e.g., 29ABCDE1234F1Z5"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">15 alphanumeric characters (e.g., 22AAAAA0000A1Z5)</p>
                    {gstError && (
                      <p className="text-red-500 text-sm mt-1">{gstError}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="vendor-email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        id="vendor-email"
                        name="email"
                        required
                        value={vendorFormData.email}
                        onChange={handleVendorChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                        placeholder="your.email@company.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Phone Number | Website URL */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="vendor-phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        id="vendor-phone"
                        name="phone"
                        required
                        value={vendorFormData.phone}
                        onChange={handleVendorChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="vendor-website" className="block text-sm font-semibold text-gray-700 mb-2">
                      Website URL <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        id="vendor-website"
                        name="website"
                        value={vendorFormData.website}
                        onChange={handleVendorChange}
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] transition-all"
                        placeholder="https://www.yourcompany.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> After submitting your application, our team will review your details and contact you within 2-3 business days.
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowVendorModal(false)}
                    disabled={isSubmittingVendor}
                    className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingVendor}
                    className="btn-shine flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#e01a1b] text-white rounded-full hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] transition-all duration-300 font-semibold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
                  >
                    {isSubmittingVendor ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contact;
