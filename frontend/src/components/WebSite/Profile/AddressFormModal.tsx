"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Home, Briefcase, MapPin, Loader2 } from "lucide-react";
import {
  NAME_REGEX,
  DEFAULT_COUNTRY_ISO,
  getCountry,
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
  name: string;
  phone: string;
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
  name: "",
  phone: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: DEFAULT_COUNTRY_ISO,
  isDefault: false,
};

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

  const countryIso = (form.country || DEFAULT_COUNTRY_ISO).toUpperCase();
  const country = useMemo(() => getCountry(countryIso), [countryIso]);
  const states = useMemo(() => getStates(countryIso), [countryIso]);
  const hasStateList = states.length > 0;
  const postalRule = useMemo(() => getPostalRule(countryIso), [countryIso]);
  const phoneExample = useMemo(() => getPhoneExample(countryIso), [countryIso]);

  useEffect(() => {
    if (!open) return;
    setTouched({});
    setSubmitError(null);
    if (editing) {
      const editIso = normalizeCountryToIso(editing.country);
      setForm({
        type: editing.type,
        name: editing.name || "",
        phone: formatPhoneAsYouType(editing.phone || "", editIso),
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

  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Full name is required";
  else if (form.name.trim().length < 2 || form.name.trim().length > 80)
    errors.name = "Name must be 2-80 characters";
  else if (!NAME_REGEX.test(form.name.trim()))
    errors.name = "Letters, spaces, hyphens and apostrophes only";

  if (!form.phone.trim()) errors.phone = "Phone number is required";
  else if (!validatePhone(form.phone, countryIso))
    errors.phone = `Enter a valid phone number for ${country?.name ?? "selected country"}`;

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
    setForm((prev) => ({ ...prev, country: newIso, state: "", zipCode: "", phone: "" }));
    setTouched((t) => ({ ...t, state: false, zipCode: false, phone: false }));
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
        name: form.name.trim(),
        phone: toE164(form.phone, countryIso),
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

  if (!open) return null;

  const fieldError = (k: keyof FormState) => (touched[k] && errors[k] ? errors[k] : undefined);
  const inputCls = (k: keyof FormState) =>
    `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-500 outline-none transition-colors disabled:bg-slate-100 ${
      fieldError(k) ? "border-red-500 focus:border-red-500" : "border-slate-300 focus:border-gray-500"
    }`;
  const selectCls = (k: keyof FormState) => `${inputCls(k)} bg-white appearance-none pr-10`;

  const ChevronIcon = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-linear-to-r from-gray-700 to-gray-800 shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-white truncate pr-2">
            {editing ? "Edit Address" : "Add New Address"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-white/80 hover:bg-white/10 rounded transition-colors disabled:opacity-50 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 flex-1">
            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Address Type <span className="text-red-500">*</span>
              </label>
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
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        active
                          ? "border-gray-800 bg-gray-50 text-gray-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <CountrySelect
                value={countryIso}
                onChange={handleCountryChange}
                onBlur={() => handleBlur("country")}
                disabled={submitting}
                invalid={!!fieldError("country")}
              />
              {fieldError("country") && <p className="text-red-500 text-xs mt-1">{fieldError("country")}</p>}
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
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
                {fieldError("name") && <p className="text-red-500 text-xs mt-1">{fieldError("name")}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                  {country && <span className="text-slate-400 font-normal ml-2">({country.phoneCode})</span>}
                </label>
                <input
                  type="tel"
                  maxLength={20}
                  value={form.phone}
                  onChange={(e) => setField("phone", formatPhoneAsYouType(e.target.value, countryIso))}
                  onBlur={() => handleBlur("phone")}
                  disabled={submitting}
                  placeholder={phoneExample || "Phone number"}
                  autoComplete="tel"
                  aria-required="true"
                  aria-invalid={!!fieldError("phone")}
                  className={inputCls("phone")}
                />
                {fieldError("phone") && <p className="text-red-500 text-xs mt-1">{fieldError("phone")}</p>}
              </div>
            </div>

            {/* Address Line 1 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
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
              {fieldError("address") && <p className="text-red-500 text-xs mt-1">{fieldError("address")}</p>}
            </div>

            {/* Address Line 2 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
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
                <p className="text-red-500 text-xs mt-1">{fieldError("addressLine2")}</p>
              )}
            </div>

            {/* City / State / Postal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
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
                {fieldError("city") && <p className="text-red-500 text-xs mt-1">{fieldError("city")}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  State / Province <span className="text-red-500">*</span>
                </label>
                {hasStateList ? (
                  <div className="relative">
                    <select
                      value={form.state}
                      onChange={(e) => setField("state", e.target.value)}
                      onBlur={() => handleBlur("state")}
                      disabled={submitting}
                      autoComplete="address-level1"
                      aria-required="true"
                      aria-invalid={!!fieldError("state")}
                      className={selectCls("state")}
                    >
                      <option value="">Select</option>
                      {states.map((s) => (
                        <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                      ))}
                    </select>
                    {ChevronIcon}
                  </div>
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
                {fieldError("state") && <p className="text-red-500 text-xs mt-1">{fieldError("state")}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {postalRule.label} <span className="text-red-500">*</span>
                </label>
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
                {fieldError("zipCode") && <p className="text-red-500 text-xs mt-1">{fieldError("zipCode")}</p>}
              </div>
            </div>

            {/* Default toggle */}
            {allowDefaultToggle && (() => {
              const editingCurrentDefault = !!editing && editing.isDefault;
              const lockedOn = hasNoAddressesYet || editingCurrentDefault;
              return (
                <div>
                  <label className={`flex items-center gap-3 select-none ${lockedOn ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={lockedOn ? true : form.isDefault}
                      onChange={(e) => setField("isDefault", e.target.checked)}
                      disabled={submitting || lockedOn}
                      className="w-4 h-4 accent-gray-800"
                    />
                    <span className="text-sm text-slate-700">
                      Set as default shipping address
                    </span>
                  </label>
                  {hasNoAddressesYet && (
                    <p className="text-xs text-slate-500 mt-1.5 ml-7">
                      Your first address is always the default.
                    </p>
                  )}
                  {editingCurrentDefault && !hasNoAddressesYet && (
                    <p className="text-xs text-slate-500 mt-1.5 ml-7">
                      This is your current default. To change it, open another address in your Address Book and choose &ldquo;Set as default&rdquo;.
                    </p>
                  )}
                </div>
              );
            })()}

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {submitError}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-2 sm:py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-linear-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-semibold rounded-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-sm sm:text-base"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
