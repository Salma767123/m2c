"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Home, Briefcase, MapPin, Loader2, ChevronDown, Check } from "lucide-react";
import {
  NAME_REGEX,
  DEFAULT_COUNTRY_ISO,
  getCountry,
  getCountries,
  getStates,
  getPostalRule,
  validatePostalCode,
  validatePhone,
  formatPhoneAsYouType,
  getPhoneExample,
  normalizeCountryToIso,
  toE164,
} from "@/components/WebSite/CheckOut/CheckoutProcess/constants";
import CountrySelect from "@/components/WebSite/CheckOut/CheckoutProcess/CountrySelect";
import type { SavedAddress, AddressPayload, AddressType } from "@/services/addressService";

interface AddressFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AddressPayload) => Promise<void>;
  editing?: SavedAddress | null;
  allowDefaultToggle: boolean;
  hasNoAddressesYet: boolean;
}

type FormState = {
  type: AddressType;
  // Office/company name when type is "work", or a custom label ("Friend's place",
  // "Warehouse", …) when type is "other". Unused for "home".
  typeLabel: string;
  name: string;
  phone: string;
  phone2: string;
  landline: string;
  // Each phone field carries its own dial-code country (defaults to the
  // address country, but the user can override each independently).
  phoneCountry: string;
  phone2Country: string;
  landlineCountry: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
type Touched = Partial<Record<keyof FormState, boolean>>;

const TYPE_OPTIONS: { value: AddressType; label: string; icon: typeof Home }[] = [
  { value: "home", label: "Home", icon: Home },
  { value: "work", label: "Work", icon: Briefcase },
  { value: "other", label: "Other", icon: MapPin },
];

const emptyForm: FormState = {
  type: "home",
  typeLabel: "",
  name: "",
  phone: "",
  phone2: "",
  landline: "",
  phoneCountry: DEFAULT_COUNTRY_ISO,
  phone2Country: DEFAULT_COUNTRY_ISO,
  landlineCountry: DEFAULT_COUNTRY_ISO,
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: DEFAULT_COUNTRY_ISO,
  isDefault: false,
};

/** Compact boutique-style field label. */
function Label({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="mb-1.5 block text-[12px] font-semibold tracking-wide text-slate-600">
      {children}
      {required && <span className="text-[#e01a1b]"> *</span>}
      {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
    </label>
  );
}

/** Compact, searchable country dial-code (flag + code) selector used as the
 *  prefix of a phone input. Each phone field owns its own instance. */
function DialCodeSelect({
  valueIso,
  onChange,
  disabled,
}: {
  valueIso: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const countries = useMemo(() => getCountries(), []);
  const selected = useMemo(() => getCountry(valueIso), [valueIso]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q) ||
        c.phoneCode.includes(q),
    );
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Select country code"
        className="flex h-full select-none items-center gap-1 rounded-l-xl border-r border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
      >
        <span className="text-base leading-none">{selected?.flag}</span>
        <span className="font-medium">{selected?.phoneCode}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)]">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/10"
            />
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {filtered.map((c) => (
              <button
                key={c.isoCode}
                type="button"
                onClick={() => { onChange(c.isoCode); setOpen(false); setQuery(""); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                  c.isoCode === valueIso ? "bg-[#fff5f5]" : ""
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1 truncate text-slate-700">{c.name}</span>
                <span className="tabular-nums text-slate-500">{c.phoneCode}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Phone input with its own selectable country dial-code prefix. */
function PhoneField({
  label,
  required,
  hint,
  value,
  onChange,
  onBlur,
  placeholder,
  countryIso,
  onCountryChange,
  error,
  disabled,
  autoComplete,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  countryIso: string;
  onCountryChange: (iso: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label required={required} hint={hint}>{label}</Label>
      <div
        className={`flex items-stretch rounded-xl border bg-white transition-all focus-within:ring-4 focus-within:ring-[#e01a1b]/10 ${
          error
            ? "border-red-400 focus-within:border-red-400"
            : "border-slate-200 focus-within:border-[#e01a1b]"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <DialCodeSelect valueIso={countryIso} onChange={onCountryChange} disabled={disabled} />
        <input
          type="tel"
          maxLength={24}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-required={required}
          aria-invalid={!!error}
          className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none disabled:text-slate-400"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/** Styled, searchable State / Province dropdown — replaces the native <select>
 *  so it matches the modal's design language instead of the OS menu. Opens
 *  upward automatically when there isn't room below inside the scroll area. */
function StateSelect({
  value,
  options,
  onChange,
  onBlur,
  disabled,
  invalid,
  placeholder = "Select state",
}: {
  value: string;
  options: { isoCode: string; name: string }[];
  onChange: (iso: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const selected = useMemo(() => options.find((o) => o.isoCode === value), [options, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.isoCode.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); onBlur?.(); }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open, onBlur]);

  const toggle = () => {
    if (disabled) return;
    if (!open && btnRef.current) {
      // Decide open direction against the nearest scroll container (the modal
      // body) so the menu is never clipped by its overflow.
      const r = btnRef.current.getBoundingClientRect();
      let boundBottom = window.innerHeight;
      let el: HTMLElement | null = btnRef.current.parentElement;
      while (el) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === "auto" || oy === "scroll") { boundBottom = el.getBoundingClientRect().bottom; break; }
        el = el.parentElement;
      }
      const spaceBelow = boundBottom - r.bottom;
      setDropUp(spaceBelow < 300 && r.top > spaceBelow);
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition-all focus:ring-4 focus:ring-[#e01a1b]/10 disabled:bg-slate-50 ${
          invalid ? "border-red-400" : "border-slate-200 focus:border-[#e01a1b]"
        }`}
      >
        <span className={`truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute left-0 z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28)] ${
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search state"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#e01a1b] focus:ring-2 focus:ring-[#e01a1b]/10"
            />
          </div>
          <div className="max-h-56 overflow-y-auto pb-1" role="listbox">
            {filtered.map((o) => (
              <button
                key={o.isoCode}
                type="button"
                role="option"
                aria-selected={o.isoCode === value}
                onClick={() => { onChange(o.isoCode); setOpen(false); setQuery(""); onBlur?.(); }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                  o.isoCode === value ? "bg-[#fff5f5] font-semibold text-[#e01a1b]" : "text-slate-700"
                }`}
              >
                <span className="truncate">{o.name}</span>
                {o.isoCode === value && <Check className="h-4 w-4 shrink-0 text-[#e01a1b]" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-slate-400">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddressFormModal({
  open,
  onClose,
  onSubmit,
  editing,
  allowDefaultToggle,
  hasNoAddressesYet,
}: AddressFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState<Touched>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Animation lifecycle: `mounted` keeps the modal in the DOM through its exit
  // transition; `entered` drives the enter/leave states (fade + scale/translate).
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  const countryIso = (form.country || DEFAULT_COUNTRY_ISO).toUpperCase();
  const states = useMemo(() => getStates(countryIso), [countryIso]);
  const hasStateList = states.length > 0;
  const postalRule = useMemo(() => getPostalRule(countryIso), [countryIso]);

  // Per-field dial-code countries (independent of the address country).
  const phoneIso = (form.phoneCountry || DEFAULT_COUNTRY_ISO).toUpperCase();
  const phone2Iso = (form.phone2Country || DEFAULT_COUNTRY_ISO).toUpperCase();
  const landlineIso = (form.landlineCountry || DEFAULT_COUNTRY_ISO).toUpperCase();

  useEffect(() => {
    if (!open) return;
    setTouched({});
    setSubmitError(null);
    if (editing) {
      const editIso = normalizeCountryToIso(editing.country);
      setForm({
        type: editing.type,
        typeLabel: editing.typeLabel || "",
        name: editing.name || "",
        phone: formatPhoneAsYouType(editing.phone || "", editIso),
        phone2: formatPhoneAsYouType(editing.phone2 || "", editIso),
        landline: editing.landline || "",
        phoneCountry: editIso,
        phone2Country: editIso,
        landlineCountry: editIso,
        address: editing.address || "",
        addressLine2: editing.addressLine2 || "",
        city: editing.city || "",
        state: editing.state || "",
        zipCode: editing.zipCode || "",
        country: editIso,
        isDefault: editing.isDefault,
      });
    } else {
      setForm({ ...emptyForm, isDefault: hasNoAddressesYet });
    }
  }, [open, editing, hasNoAddressesYet]);

  // Mount immediately on open and flip `entered` on the next frame so the enter
  // transition runs; on close, play the exit transition then unmount (~220ms).
  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const t = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(t);
  }, [open]);

  // Lock background scroll while the modal is in the DOM; restore on unmount.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  // Close on Escape (never mid-submit).
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, submitting, onClose]);

  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Full name is required";
  else if (form.name.trim().length < 2 || form.name.trim().length > 80)
    errors.name = "Name must be 2-80 characters";
  else if (!NAME_REGEX.test(form.name.trim()))
    errors.name = "Letters, spaces, hyphens and apostrophes only";

  if (!form.phone.trim()) errors.phone = "Phone number is required";
  else if (!validatePhone(form.phone, phoneIso))
    errors.phone = `Enter a valid phone number for ${getCountry(phoneIso)?.name ?? "selected country"}`;

  // Secondary phone — optional, validated only when filled.
  if (form.phone2.trim() && !validatePhone(form.phone2, phone2Iso))
    errors.phone2 = `Enter a valid phone number for ${getCountry(phone2Iso)?.name ?? "selected country"}`;

  // Landline — optional, loose digit check when filled.
  if (form.landline.trim()) {
    const digits = form.landline.replace(/\D/g, "");
    if (digits.length < 6 || digits.length > 15) errors.landline = "Enter a valid landline number";
  }

  if (!form.address.trim()) errors.address = "Address is required";
  else if (form.address.trim().length < 3 || form.address.trim().length > 100)
    errors.address = "Address must be 3-100 characters";

  if (form.addressLine2 && form.addressLine2.length > 100)
    errors.addressLine2 = "Address Line 2 must be 100 characters or less";

  if (!form.city.trim()) errors.city = "City is required";
  else if (form.city.trim().length < 2 || form.city.trim().length > 50)
    errors.city = "City must be 2-50 characters";

  if (!form.country) errors.country = "Select a country";

  if (hasStateList) {
    if (!form.state) errors.state = "Select a state / province";
  } else if (!form.state.trim()) {
    errors.state = "State / region is required";
  }

  if (!form.zipCode.trim()) errors.zipCode = `${postalRule.label} is required`;
  else if (!validatePostalCode(form.zipCode, countryIso))
    errors.zipCode = `Enter a valid ${postalRule.label.toLowerCase()} (e.g. ${postalRule.placeholder})`;

  const isValid = Object.keys(errors).length === 0;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCountryChange = (newIso: string) => {
    // Changing the address country re-syncs each phone field's dial code to it
    // (the "auto from address" default); the user can still override per field.
    setForm((prev) => ({
      ...prev,
      country: newIso,
      state: "",
      zipCode: "",
      phone: "",
      phone2: "",
      phoneCountry: newIso,
      phone2Country: newIso,
      landlineCountry: newIso,
    }));
    setTouched((t) => ({ ...t, state: false, zipCode: false, phone: false, phone2: false }));
  };

  // Switching a single phone field's dial code — reformats that field's value
  // for the newly chosen country so the digits stay grouped correctly.
  const changePhoneCountry = (
    countryKey: "phoneCountry" | "phone2Country" | "landlineCountry",
    valueKey: "phone" | "phone2" | "landline",
    iso: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [countryKey]: iso,
      [valueKey]: valueKey === "landline" ? prev[valueKey] : formatPhoneAsYouType(prev[valueKey], iso),
    }));
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((t) => ({ ...t, [field]: true }));
    // Skip non-text fields managed by their own components (country dropdown, state
    // <select> when a list exists). Reading form[field] here would be stale because
    // the dropdown's onChange + onBlur fire in the same tick, so trimming the "old"
    // value would overwrite the freshly-selected one.
    if (field === "country") return;
    if (field === "state" && hasStateList) return;
    if (typeof form[field] === "string") {
      const v = form[field] as string;
      if (field === "zipCode") setField(field, v.trim().toUpperCase() as FormState[typeof field]);
      else setField(field, v.trim() as FormState[typeof field]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched: Touched = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((k) => { allTouched[k] = true; });
    setTouched(allTouched);
    if (!isValid || submitting) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      const payload: AddressPayload = {
        type: form.type,
        typeLabel: (form.type === "work" || form.type === "other")
          ? (form.typeLabel.trim() || undefined)
          : undefined,
        name: form.name.trim(),
        phone: toE164(form.phone, phoneIso),
        phone2: form.phone2.trim() ? toE164(form.phone2, phone2Iso) : undefined,
        landline: form.landline.trim() ? toE164(form.landline, landlineIso) : undefined,
        address: form.address.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        zipCode: form.zipCode.trim().toUpperCase(),
        country: form.country,
        isDefault: form.isDefault,
      };
      await onSubmit(payload);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save address");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  const fieldError = (k: keyof FormState) => (touched[k] && errors[k] ? errors[k] : undefined);
  const inputCls = (k: keyof FormState) =>
    `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:ring-4 focus:ring-[#e01a1b]/10 disabled:bg-slate-50 disabled:text-slate-400 ${
      fieldError(k) ? "border-red-400 focus:border-red-400" : "border-slate-200 focus:border-[#e01a1b]"
    }`;

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-slate-900/25 backdrop-blur-[6px] transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        entered ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit Address" : "Add New Address"}
        className={`relative z-[101] flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition-all duration-200 ease-out motion-reduce:transition-none ${
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.97] opacity-0"
        }`}
      >
        {/* Brand accent hairline */}
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-[#e01a1b] via-[#ff5a36] to-[#e01a1b]" />

        {/* Header — clean, boutique, not an admin dark bar */}
        <div className="flex shrink-0 items-center gap-3 px-5 py-3.5 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e01a1b]/10 text-[#e01a1b]">
            <MapPin className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold leading-tight text-slate-900">
              {editing ? "Edit Address" : "Add New Address"}
            </h3>
            <p className="text-[12.5px] text-slate-500">Where should we deliver your order?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 pb-4 pt-1 sm:px-6">
            {/* Address Type — refined segmented chips */}
            <div>
              <Label required>Address Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = form.type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField("type", opt.value)}
                      disabled={submitting}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                        active
                          ? "border-[#e01a1b] bg-[#fff5f5] text-[#e01a1b] shadow-[0_2px_10px_rgba(224,26,27,0.12)]"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic label for Work / Other — office name, or what "Other" is. */}
            {(form.type === "work" || form.type === "other") && (
              <div>
                <Label>{form.type === "work" ? "Office / Company Name" : "Address Label"}</Label>
                <input
                  type="text"
                  maxLength={80}
                  value={form.typeLabel}
                  onChange={(e) => setField("typeLabel", e.target.value)}
                  disabled={submitting}
                  placeholder={form.type === "work" ? "e.g. Acme Corp, 3rd floor" : "e.g. Friend's place, Warehouse"}
                  className={inputCls("typeLabel")}
                />
              </div>
            )}

            {/* Full Name + Primary Phone */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div>
                <Label required>Full Name</Label>
                <input
                  type="text"
                  maxLength={80}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  disabled={submitting}
                  placeholder="John Doe"
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={!!fieldError("name")}
                  className={inputCls("name")}
                />
                {fieldError("name") && <p className="mt-1 text-xs text-red-500">{fieldError("name")}</p>}
              </div>
              <PhoneField
                label="Phone"
                required
                value={form.phone}
                onChange={(v) => setField("phone", formatPhoneAsYouType(v, phoneIso))}
                onBlur={() => handleBlur("phone")}
                placeholder={getPhoneExample(phoneIso) || "Phone number"}
                countryIso={phoneIso}
                onCountryChange={(iso) => changePhoneCountry("phoneCountry", "phone", iso)}
                error={fieldError("phone")}
                disabled={submitting}
                autoComplete="tel"
              />
            </div>

            {/* Secondary Phone + Landline */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <PhoneField
                label="Secondary Phone"
                hint="(Optional)"
                value={form.phone2}
                onChange={(v) => setField("phone2", formatPhoneAsYouType(v, phone2Iso))}
                onBlur={() => handleBlur("phone2")}
                placeholder={getPhoneExample(phone2Iso) || "Alternate number"}
                countryIso={phone2Iso}
                onCountryChange={(iso) => changePhoneCountry("phone2Country", "phone2", iso)}
                error={fieldError("phone2")}
                disabled={submitting}
              />
              <PhoneField
                label="Landline"
                hint="(Optional)"
                value={form.landline}
                onChange={(v) => setField("landline", v)}
                onBlur={() => handleBlur("landline")}
                placeholder="STD code + number"
                countryIso={landlineIso}
                onCountryChange={(iso) => changePhoneCountry("landlineCountry", "landline", iso)}
                error={fieldError("landline")}
                disabled={submitting}
              />
            </div>

            {/* Address Line 1 */}
            <div>
              <Label required>Address Line 1</Label>
              <input
                type="text"
                maxLength={100}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                onBlur={() => handleBlur("address")}
                disabled={submitting}
                placeholder="123 Main Street"
                autoComplete="address-line1"
                aria-required="true"
                aria-invalid={!!fieldError("address")}
                className={inputCls("address")}
              />
              {fieldError("address") && <p className="mt-1 text-xs text-red-500">{fieldError("address")}</p>}
            </div>

            {/* Address Line 2 */}
            <div>
              <Label hint="(Optional)">Address Line 2</Label>
              <input
                type="text"
                maxLength={100}
                value={form.addressLine2}
                onChange={(e) => setField("addressLine2", e.target.value)}
                onBlur={() => handleBlur("addressLine2")}
                disabled={submitting}
                placeholder="Apt, Suite, Unit, etc."
                autoComplete="address-line2"
                className={inputCls("addressLine2")}
              />
              {fieldError("addressLine2") && (
                <p className="mt-1 text-xs text-red-500">{fieldError("addressLine2")}</p>
              )}
            </div>

            {/* Country + State (country now sits right beside state) */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div>
                <Label required>Country</Label>
                <CountrySelect
                  value={countryIso}
                  onChange={handleCountryChange}
                  onBlur={() => handleBlur("country")}
                  disabled={submitting}
                  invalid={!!fieldError("country")}
                />
                {fieldError("country") && <p className="mt-1 text-xs text-red-500">{fieldError("country")}</p>}
              </div>
              <div>
                <Label required>State / Province</Label>
                {hasStateList ? (
                  <StateSelect
                    value={form.state}
                    options={states}
                    onChange={(iso) => setField("state", iso)}
                    onBlur={() => handleBlur("state")}
                    disabled={submitting}
                    invalid={!!fieldError("state")}
                  />
                ) : (
                  <input
                    type="text"
                    maxLength={50}
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                    onBlur={() => handleBlur("state")}
                    disabled={submitting}
                    placeholder="State / region"
                    autoComplete="address-level1"
                    aria-required="true"
                    aria-invalid={!!fieldError("state")}
                    className={inputCls("state")}
                  />
                )}
                {fieldError("state") && <p className="mt-1 text-xs text-red-500">{fieldError("state")}</p>}
              </div>
            </div>

            {/* City + Postal */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div>
                <Label required>City</Label>
                <input
                  type="text"
                  maxLength={50}
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                  disabled={submitting}
                  placeholder="City"
                  autoComplete="address-level2"
                  aria-required="true"
                  aria-invalid={!!fieldError("city")}
                  className={inputCls("city")}
                />
                {fieldError("city") && <p className="mt-1 text-xs text-red-500">{fieldError("city")}</p>}
              </div>
              <div>
                <Label required>{postalRule.label}</Label>
                <input
                  type="text"
                  maxLength={12}
                  value={form.zipCode}
                  onChange={(e) => setField("zipCode", e.target.value)}
                  onBlur={() => handleBlur("zipCode")}
                  disabled={submitting}
                  placeholder={postalRule.placeholder}
                  autoComplete="postal-code"
                  aria-required="true"
                  aria-invalid={!!fieldError("zipCode")}
                  className={inputCls("zipCode")}
                />
                {fieldError("zipCode") && <p className="mt-1 text-xs text-red-500">{fieldError("zipCode")}</p>}
              </div>
            </div>

            {/* Default toggle */}
            {allowDefaultToggle && (() => {
              const editingCurrentDefault = !!editing && editing.isDefault;
              const lockedOn = hasNoAddressesYet || editingCurrentDefault;
              return (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <label className={`flex items-center gap-3 select-none ${lockedOn ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={lockedOn ? true : form.isDefault}
                      onChange={(e) => setField("isDefault", e.target.checked)}
                      disabled={submitting || lockedOn}
                      className="h-4 w-4 accent-[#e01a1b]"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Set as default shipping address
                    </span>
                  </label>
                  {hasNoAddressesYet && (
                    <p className="ml-7 mt-1 text-xs text-slate-500">
                      Your first address is always the default.
                    </p>
                  )}
                  {editingCurrentDefault && !hasNoAddressesYet && (
                    <p className="ml-7 mt-1 text-xs text-slate-500">
                      This is your current default. To change it, open another address in your Address Book and choose &ldquo;Set as default&rdquo;.
                    </p>
                  )}
                </div>
              );
            })()}

            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
          </div>

          {/* Pinned footer */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-3 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="btn-shine flex flex-1 items-center justify-center gap-2 rounded-full bg-[#e01a1b] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(224,26,27,0.28)] transition-all duration-300 hover:bg-[#c41617] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Address"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
