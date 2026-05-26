"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckoutFormData } from "../Checkout"
import {
  EMAIL_REGEX,
  NAME_REGEX,
  DEFAULT_COUNTRY_ISO,
  getCountry,
  getStates,
  getPostalRule,
  validatePostalCode,
  validatePhone,
  formatPhoneAsYouType,
  getPhoneExample,
} from "./constants"
import CountrySelect from "./CountrySelect"

interface ShippingFormProps {
  formData: CheckoutFormData
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void
  disabled?: boolean
  onValidityChange?: (isValid: boolean) => void
}

type Errors = Partial<Record<keyof CheckoutFormData, string>>
type Touched = Partial<Record<keyof CheckoutFormData, boolean>>

export default function ShippingForm({ formData, updateFormData, disabled = false, onValidityChange }: ShippingFormProps) {
  const [touched, setTouched] = useState<Touched>({})

  const countryIso = (formData.country || DEFAULT_COUNTRY_ISO).toUpperCase()
  const country = useMemo(() => getCountry(countryIso), [countryIso])
  const states = useMemo(() => getStates(countryIso), [countryIso])
  const hasStateList = states.length > 0
  const postalRule = useMemo(() => getPostalRule(countryIso), [countryIso])
  const phoneExample = useMemo(() => getPhoneExample(countryIso), [countryIso])

  // Pre-fill banner
  const preFilledFields: string[] = []
  if (formData.firstName || formData.lastName) preFilledFields.push("name")
  if (formData.email) preFilledFields.push("email")
  if (formData.phone) preFilledFields.push("phone")
  if (formData.address) preFilledFields.push("address")
  if (formData.addressLine2) preFilledFields.push("address line 2")
  if (formData.city) preFilledFields.push("city")
  if (formData.state) preFilledFields.push("state")
  if (formData.zipCode) preFilledFields.push(postalRule.label.toLowerCase())
  const isPreFilled = preFilledFields.length > 0

  const validate = (data: CheckoutFormData): Errors => {
    const newErrors: Errors = {}
    const iso = (data.country || DEFAULT_COUNTRY_ISO).toUpperCase()
    const rule = getPostalRule(iso)
    const stateList = getStates(iso)

    if (!data.firstName.trim()) newErrors.firstName = "First name is required"
    else if (data.firstName.trim().length < 2 || data.firstName.trim().length > 50)
      newErrors.firstName = "First name must be 2-50 characters"
    else if (!NAME_REGEX.test(data.firstName.trim()))
      newErrors.firstName = "Letters, spaces, hyphens and apostrophes only"

    if (!data.lastName.trim()) newErrors.lastName = "Last name is required"
    else if (data.lastName.trim().length < 2 || data.lastName.trim().length > 50)
      newErrors.lastName = "Last name must be 2-50 characters"
    else if (!NAME_REGEX.test(data.lastName.trim()))
      newErrors.lastName = "Letters, spaces, hyphens and apostrophes only"

    if (!data.email.trim()) newErrors.email = "Email is required"
    else if (!EMAIL_REGEX.test(data.email.trim())) newErrors.email = "Enter a valid email"

    if (!data.phone.trim()) newErrors.phone = "Phone number is required"
    else if (!validatePhone(data.phone, iso))
      newErrors.phone = `Enter a valid phone number for ${getCountry(iso)?.name ?? "selected country"}`

    if (!data.address.trim()) newErrors.address = "Address is required"
    else if (data.address.trim().length < 3 || data.address.trim().length > 100)
      newErrors.address = "Address must be 3-100 characters"

    if (data.addressLine2 && data.addressLine2.trim().length > 100)
      newErrors.addressLine2 = "Address Line 2 must be 100 characters or less"

    if (!data.city.trim()) newErrors.city = "City is required"
    else if (data.city.trim().length < 2 || data.city.trim().length > 50)
      newErrors.city = "City must be 2-50 characters"

    if (!data.country) newErrors.country = "Select a country"

    if (stateList.length > 0) {
      if (!data.state) newErrors.state = "Select a state / province"
    } else if (!data.state.trim()) {
      newErrors.state = "State / region is required"
    }

    if (!data.zipCode.trim()) newErrors.zipCode = `${rule.label} is required`
    else if (!validatePostalCode(data.zipCode, iso))
      newErrors.zipCode = `Enter a valid ${rule.label.toLowerCase()} (e.g. ${rule.placeholder})`

    return newErrors
  }

  const errors = useMemo(() => validate(formData), [formData])
  const isValid = Object.keys(errors).length === 0

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  // When country changes, clear state if it's no longer valid for the new country
  useEffect(() => {
    if (!formData.state) return
    if (hasStateList && !states.some((s) => s.isoCode === formData.state)) {
      updateFormData("state", "")
    }
  }, [countryIso, hasStateList, states, formData.state, updateFormData])

  const handleBlur = (field: keyof CheckoutFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    // Skip non-text fields managed by their own components (country dropdown, state
    // <select> when a list exists). Reading formData[field] here would be stale because
    // the dropdown's onChange + onBlur fire in the same tick, so trimming the "old" value
    // would overwrite the freshly-selected one.
    if (field === "country") return
    if (field === "state" && hasStateList) return
    if (typeof formData[field] === "string") {
      const val = formData[field] as string
      if (field === "email") updateFormData(field, val.trim().toLowerCase())
      else if (field === "zipCode") updateFormData(field, val.trim().toUpperCase())
      else updateFormData(field, val.trim())
    }
  }

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    if (field === "phone") {
      updateFormData(field, formatPhoneAsYouType(value, countryIso))
    } else {
      updateFormData(field, value)
    }
  }

  const handleCountryChange = (newIso: string) => {
    updateFormData("country", newIso)
    // Reset dependent fields so stale state/postal/phone format don't persist
    updateFormData("state", "")
    updateFormData("zipCode", "")
    updateFormData("phone", "")
    setTouched((prev) => ({ ...prev, state: false, zipCode: false, phone: false }))
  }

  const renderError = (field: keyof CheckoutFormData) =>
    touched[field] && errors[field] ? (
      <p className="text-red-500 text-xs mt-1" id={`${field}-error`}>{errors[field]}</p>
    ) : null

  const describedBy = (field: keyof CheckoutFormData) =>
    touched[field] && errors[field] ? `${field}-error` : undefined

  const inputStyle = (field: keyof CheckoutFormData) => {
    const base = "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed outline-none transition-colors"
    return touched[field] && errors[field]
      ? `${base} border-red-500 focus:border-red-500`
      : `${base} border-slate-300 focus:border-gray-500`
  }

  const selectStyle = (field: keyof CheckoutFormData) =>
    `${inputStyle(field)} bg-white appearance-none pr-10`

  const ChevronIcon = (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )

  return (
    <div className="space-y-6">
      {isPreFilled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold text-blue-900">Address auto-filled from your profile</p>
            <p className="text-blue-600 mt-1">Filled: {preFilledFields.join(", ")}. You can edit any field if needed.</p>
          </div>
        </div>
      )}

      {/* Country */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Country <span className="text-red-500">*</span>
        </label>
        <CountrySelect
          value={countryIso}
          onChange={handleCountryChange}
          onBlur={() => handleBlur("country")}
          disabled={disabled}
          invalid={!!(touched.country && errors.country)}
          ariaDescribedBy={describedBy("country")}
        />
        {country && (
          <p className="text-xs text-slate-500 mt-1.5">
            Shipping to {country.flag} {country.name} · Phone code {country.phoneCode}
          </p>
        )}
        {renderError("country")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">First Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            maxLength={50}
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            onBlur={() => handleBlur("firstName")}
            className={inputStyle("firstName")}
            placeholder="John"
            disabled={disabled}
            autoComplete="given-name"
            aria-required="true"
            aria-invalid={!!(touched.firstName && errors.firstName)}
            aria-describedby={describedBy("firstName")}
          />
          {renderError("firstName")}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            maxLength={50}
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            onBlur={() => handleBlur("lastName")}
            className={inputStyle("lastName")}
            placeholder="Doe"
            disabled={disabled}
            autoComplete="family-name"
            aria-required="true"
            aria-invalid={!!(touched.lastName && errors.lastName)}
            aria-describedby={describedBy("lastName")}
          />
          {renderError("lastName")}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
        <input
          type="email"
          maxLength={254}
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          className={inputStyle("email")}
          placeholder="john.doe@example.com"
          disabled={disabled}
          autoComplete="email"
          aria-required="true"
          aria-invalid={!!(touched.email && errors.email)}
          aria-describedby={describedBy("email")}
        />
        {renderError("email")}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Phone Number <span className="text-red-500">*</span>
          {country && <span className="text-slate-400 font-normal ml-2">({country.phoneCode})</span>}
        </label>
        <input
          type="tel"
          maxLength={20}
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          onBlur={() => handleBlur("phone")}
          className={inputStyle("phone")}
          placeholder={phoneExample || "Phone number"}
          disabled={disabled}
          autoComplete="tel"
          aria-required="true"
          aria-invalid={!!(touched.phone && errors.phone)}
          aria-describedby={describedBy("phone")}
        />
        {renderError("phone")}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 1 <span className="text-red-500">*</span></label>
        <input
          type="text"
          maxLength={100}
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          onBlur={() => handleBlur("address")}
          className={inputStyle("address")}
          placeholder="123 Main Street"
          disabled={disabled}
          autoComplete="address-line1"
          aria-required="true"
          aria-invalid={!!(touched.address && errors.address)}
          aria-describedby={describedBy("address")}
        />
        {renderError("address")}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 2 (Optional)</label>
        <input
          type="text"
          maxLength={100}
          value={formData.addressLine2 || ""}
          onChange={(e) => handleChange("addressLine2", e.target.value)}
          onBlur={() => handleBlur("addressLine2")}
          className={inputStyle("addressLine2")}
          placeholder="Apt, Suite, Unit, etc."
          disabled={disabled}
          autoComplete="address-line2"
          aria-invalid={!!(touched.addressLine2 && errors.addressLine2)}
          aria-describedby={describedBy("addressLine2")}
        />
        {renderError("addressLine2")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
          <input
            type="text"
            maxLength={50}
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            onBlur={() => handleBlur("city")}
            className={inputStyle("city")}
            placeholder="City"
            disabled={disabled}
            autoComplete="address-level2"
            aria-required="true"
            aria-invalid={!!(touched.city && errors.city)}
            aria-describedby={describedBy("city")}
          />
          {renderError("city")}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            State / Province <span className="text-red-500">*</span>
          </label>
          {hasStateList ? (
            <div className="relative">
              <select
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                onBlur={() => handleBlur("state")}
                className={selectStyle("state")}
                disabled={disabled}
                autoComplete="address-level1"
                aria-required="true"
                aria-invalid={!!(touched.state && errors.state)}
                aria-describedby={describedBy("state")}
              >
                <option value="">Select State / Province</option>
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
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
              onBlur={() => handleBlur("state")}
              className={inputStyle("state")}
              placeholder="State / region"
              disabled={disabled}
              autoComplete="address-level1"
              aria-required="true"
              aria-invalid={!!(touched.state && errors.state)}
              aria-describedby={describedBy("state")}
            />
          )}
          {renderError("state")}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {postalRule.label} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            maxLength={12}
            value={formData.zipCode}
            onChange={(e) => handleChange("zipCode", e.target.value)}
            onBlur={() => handleBlur("zipCode")}
            className={inputStyle("zipCode")}
            placeholder={postalRule.placeholder}
            disabled={disabled}
            autoComplete="postal-code"
            aria-required="true"
            aria-invalid={!!(touched.zipCode && errors.zipCode)}
            aria-describedby={describedBy("zipCode")}
          />
          {renderError("zipCode")}
        </div>
      </div>
    </div>
  )
}
