"use client"

import { useState, useEffect, useRef } from "react"
import { CheckoutFormData } from "../Checkout"
import { US_STATES, EMAIL_REGEX, ZIP_REGEX, NAME_REGEX, formatUSPhone, validateUSPhone, formatZipCode } from "./constants"

interface ShippingFormProps {
  formData: CheckoutFormData
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void
  disabled?: boolean
  onValidityChange?: (isValid: boolean) => void
}

type Errors = Partial<Record<keyof CheckoutFormData, string>>
type Touched = Partial<Record<keyof CheckoutFormData, boolean>>

export default function ShippingForm({ formData, updateFormData, disabled = false, onValidityChange }: ShippingFormProps) {
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Touched>({})

  // Create a list of filled fields for the banner
  const preFilledFields: string[] = []
  if (formData.firstName || formData.lastName) preFilledFields.push("name")
  if (formData.email) preFilledFields.push("email")
  if (formData.phone) preFilledFields.push("phone")
  if (formData.address) preFilledFields.push("address")
  if (formData.addressLine2) preFilledFields.push("address line 2")
  if (formData.city) preFilledFields.push("city")
  if (formData.state) preFilledFields.push("state")
  if (formData.zipCode) preFilledFields.push("ZIP")

  const isPreFilled = preFilledFields.length > 0

  const validate = (data: CheckoutFormData): Errors => {
    const newErrors: Errors = {}

    // First Name
    if (!data.firstName.trim()) {
      newErrors.firstName = "First name is required"
    } else if (data.firstName.trim().length < 2 || data.firstName.trim().length > 50) {
      newErrors.firstName = "First name must be 2-50 characters"
    } else if (!NAME_REGEX.test(data.firstName)) {
      newErrors.firstName = "Letters, spaces, hyphens and apostrophes only"
    }

    // Last Name
    if (!data.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    } else if (data.lastName.trim().length < 2 || data.lastName.trim().length > 50) {
      newErrors.lastName = "Last name must be 2-50 characters"
    } else if (!NAME_REGEX.test(data.lastName)) {
      newErrors.lastName = "Letters, spaces, hyphens and apostrophes only"
    }

    // Email
    if (!data.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      newErrors.email = "Enter a valid email"
    }

    // Phone
    if (!data.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!validateUSPhone(data.phone)) {
      newErrors.phone = "Enter a valid US phone number"
    }

    // Address Line 1
    if (!data.address.trim()) {
      newErrors.address = "Address is required"
    } else if (data.address.trim().length < 3 || data.address.trim().length > 100) {
      newErrors.address = "Address must be 3-100 characters"
    }

    // Address Line 2
    if (data.addressLine2 && data.addressLine2.trim().length > 100) {
      newErrors.addressLine2 = "Address Line 2 must be 100 characters or less"
    }

    // City
    if (!data.city.trim()) {
      newErrors.city = "City is required"
    } else if (data.city.trim().length < 2 || data.city.trim().length > 50) {
      newErrors.city = "City must be 2-50 characters"
    }

    // State
    if (!data.state) {
      newErrors.state = "Select a state"
    }

    // ZIP Code
    if (!data.zipCode.trim()) {
      newErrors.zipCode = "ZIP Code is required"
    } else if (!ZIP_REGEX.test(data.zipCode.trim())) {
      newErrors.zipCode = "Enter a valid ZIP (12345 or 12345-6789)"
    }

    return newErrors
  }

  // Run validation effect
  useEffect(() => {
    const currentErrors = validate(formData)
    setErrors(currentErrors)
    
    const isValid = Object.keys(currentErrors).length === 0
    if (onValidityChange) {
      onValidityChange(isValid)
    }
  }, [formData, onValidityChange])

  // Helpers for inputs
  const handleBlur = (field: keyof CheckoutFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // Auto-trim values on blur
    if (typeof formData[field] === 'string') {
      const val = formData[field] as string;
      if (field === 'email') {
        updateFormData(field, val.trim().toLowerCase())
      } else if (field === 'state') {
        updateFormData(field, val.trim().toUpperCase())
      } else {
        updateFormData(field, val.trim())
      }
    }
  }

  const handleChange = (field: keyof CheckoutFormData, value: string) => {
    if (field === 'phone') {
      updateFormData(field, formatUSPhone(value))
    } else if (field === 'zipCode') {
      updateFormData(field, formatZipCode(value))
    } else {
      updateFormData(field, value)
    }
  }

  const renderError = (field: keyof CheckoutFormData) => {
    if (touched[field] && errors[field]) {
      return (
        <p className="text-red-500 text-xs mt-1" id={`${field}-error`}>
          {errors[field]}
        </p>
      )
    }
    return null
  }

  const getInputStyle = (field: keyof CheckoutFormData) => {
    const baseStyle = "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed outline-none transition-colors"
    if (touched[field] && errors[field]) {
      return `${baseStyle} border-red-500 focus:border-red-500`
    }
    return `${baseStyle} border-slate-300 focus:border-gray-500`
  }

  return (
    <div className="space-y-6">
      {isPreFilled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold text-blue-900">Address auto-filled from your profile</p>
            <p className="text-blue-600 mt-1">Filled: {preFilledFields.join(', ')}. You can edit any field if needed.</p>
          </div>
        </div>
      )}

      {/* Country banner - read only */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
        <span className="text-sm font-medium text-slate-700">Shipping to:</span>
        <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          United States 🇺🇸
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">First Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            onBlur={() => handleBlur("firstName")}
            className={getInputStyle("firstName")}
            placeholder="John"
            disabled={disabled}
            autoComplete="given-name"
            aria-required="true"
            aria-invalid={!!(touched.firstName && errors.firstName)}
            aria-describedby={errors.firstName ? `firstName-error` : undefined}
          />
          {renderError("firstName")}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            onBlur={() => handleBlur("lastName")}
            className={getInputStyle("lastName")}
            placeholder="Doe"
            disabled={disabled}
            autoComplete="family-name"
            aria-required="true"
            aria-invalid={!!(touched.lastName && errors.lastName)}
            aria-describedby={errors.lastName ? `lastName-error` : undefined}
          />
          {renderError("lastName")}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address <span className="text-red-500">*</span></label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          className={getInputStyle("email")}
          placeholder="john.doe@example.com"
          disabled={disabled}
          autoComplete="email"
          aria-required="true"
          aria-invalid={!!(touched.email && errors.email)}
          aria-describedby={errors.email ? `email-error` : undefined}
        />
        {renderError("email")}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          onBlur={() => handleBlur("phone")}
          className={getInputStyle("phone")}
          placeholder="(555) 123-4567"
          disabled={disabled}
          autoComplete="tel"
          aria-required="true"
          aria-invalid={!!(touched.phone && errors.phone)}
          aria-describedby={errors.phone ? `phone-error` : undefined}
        />
        {renderError("phone")}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 1 <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
          onBlur={() => handleBlur("address")}
          className={getInputStyle("address")}
          placeholder="123 Main Street"
          disabled={disabled}
          autoComplete="address-line1"
          aria-required="true"
          aria-invalid={!!(touched.address && errors.address)}
          aria-describedby={errors.address ? `address-error` : undefined}
        />
        {renderError("address")}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 2 (Optional)</label>
        <input
          type="text"
          value={formData.addressLine2 || ''}
          onChange={(e) => handleChange("addressLine2", e.target.value)}
          onBlur={() => handleBlur("addressLine2")}
          className={getInputStyle("addressLine2")}
          placeholder="Apt, Suite, Unit, etc."
          disabled={disabled}
          autoComplete="address-line2"
          aria-invalid={!!(touched.addressLine2 && errors.addressLine2)}
          aria-describedby={errors.addressLine2 ? `addressLine2-error` : undefined}
        />
        {renderError("addressLine2")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleChange("city", e.target.value)}
            onBlur={() => handleBlur("city")}
            className={getInputStyle("city")}
            placeholder="New York"
            disabled={disabled}
            autoComplete="address-level2"
            aria-required="true"
            aria-invalid={!!(touched.city && errors.city)}
            aria-describedby={errors.city ? `city-error` : undefined}
          />
          {renderError("city")}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">State <span className="text-red-500">*</span></label>
          <div className="relative">
            <select
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
              onBlur={() => handleBlur("state")}
              className={`${getInputStyle("state")} bg-white appearance-none pr-10`}
              disabled={disabled}
              autoComplete="address-level1"
              aria-required="true"
              aria-invalid={!!(touched.state && errors.state)}
              aria-describedby={errors.state ? `state-error` : undefined}
            >
              <option value="">Select State</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {renderError("state")}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">ZIP Code <span className="text-red-500">*</span></label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            value={formData.zipCode}
            onChange={(e) => handleChange("zipCode", e.target.value)}
            onBlur={() => handleBlur("zipCode")}
            className={getInputStyle("zipCode")}
            placeholder="10001 or 10001-1234"
            disabled={disabled}
            autoComplete="postal-code"
            aria-required="true"
            aria-invalid={!!(touched.zipCode && errors.zipCode)}
            aria-describedby={errors.zipCode ? `zipCode-error` : undefined}
          />
          {renderError("zipCode")}
        </div>
      </div>
    </div>
  )
}
