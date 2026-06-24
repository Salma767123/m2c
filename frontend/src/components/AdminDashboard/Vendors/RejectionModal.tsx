'use client'

import { useState } from 'react'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import {
  X,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Building2,
  Mail,
  ChevronLeft,
  CheckCircle2,
  Circle,
} from 'lucide-react'

interface VendorInfo {
  id: string
  companyName: string
  ownerName: string
  email: string
  phone?: string
  submittedAt?: string
}

interface RejectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, category: string) => Promise<void>
  vendor: VendorInfo | null
  isLoading?: boolean
}

const rejectionCategories = [
  {
    id: 'documentation',
    label: 'Documentation Issues',
    description: 'Missing or invalid documents, certifications, or licenses',
    icon: FileText,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-50',
  },
  {
    id: 'compliance',
    label: 'Compliance Issues',
    description: 'Does not meet regulatory or quality standards',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50',
  },
  {
    id: 'business',
    label: 'Business Requirements',
    description: 'Does not meet minimum business criteria or capacity',
    icon: Building2,
    color: 'text-violet-500',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    selectedBorder: 'border-violet-500',
    selectedBg: 'bg-violet-50',
  },
  {
    id: 'verification',
    label: 'Verification Failed',
    description: 'Unable to verify provided information or references',
    icon: User,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    selectedBorder: 'border-red-500',
    selectedBg: 'bg-red-50',
  },
  {
    id: 'other',
    label: 'Other Reasons',
    description: 'Specify a custom reason for rejection',
    icon: Clock,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    selectedBorder: 'border-slate-500',
    selectedBg: 'bg-slate-50',
  },
]

const commonReasons = {
  documentation: [
    'Missing GST certificate',
    'Invalid business registration documents',
    'Expired certifications',
    'Incomplete company profile',
    'Missing owner identification documents',
  ],
  compliance: [
    'Does not meet quality standards',
    'Missing required certifications',
    'Non-compliance with industry regulations',
    'Failed background verification',
    'Inadequate quality control processes',
  ],
  business: [
    'Insufficient production capacity',
    'Limited product range',
    'Inadequate warehouse facilities',
    'Poor financial standing',
    'Limited market experience',
  ],
  verification: [
    'Unable to verify business address',
    'Invalid contact information',
    'References could not be verified',
    'Suspicious business activities',
    'Conflicting information provided',
  ],
  other: [
    'Application submitted multiple times',
    'Incomplete application form',
    'Does not align with business requirements',
    'Geographic location restrictions',
  ],
}

const steps = [
  { key: 'category', label: 'Category' },
  { key: 'reason', label: 'Reason' },
  { key: 'review', label: 'Review' },
]

export default function RejectionModal({
  isOpen,
  onClose,
  onConfirm,
  vendor,
  isLoading = false,
}: RejectionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')
  const [selectedCommonReason, setSelectedCommonReason] = useState<string>('')
  const [additionalNotes, setAdditionalNotes] = useState<string>('')
  const [step, setStep] = useState<'category' | 'reason' | 'review'>('category')

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedCommonReason('')
    setCustomReason('')
    setStep('reason')
  }

  const handleReasonSelect = (reason: string) => {
    setSelectedCommonReason(reason)
    setCustomReason('')
  }

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value)
    setSelectedCommonReason('')
  }

  const handleNext = () => {
    if (step === 'reason') setStep('review')
  }

  const handleBack = () => {
    if (step === 'reason') setStep('category')
    else if (step === 'review') setStep('reason')
  }

  const handleConfirm = async () => {
    const finalReason = selectedCommonReason || customReason
    const fullReason = additionalNotes
      ? `${finalReason}\n\nAdditional Notes: ${additionalNotes}`
      : finalReason
    await onConfirm(fullReason, selectedCategory)
  }

  const handleClose = () => {
    if (!isLoading) {
      setStep('category')
      setSelectedCategory('')
      setSelectedCommonReason('')
      setCustomReason('')
      setAdditionalNotes('')
      onClose()
    }
  }

  const isReasonValid = selectedCommonReason || customReason.trim().length >= 10
  const selectedCategoryData = rejectionCategories.find(cat => cat.id === selectedCategory)
  const currentStepIndex = steps.findIndex(s => s.key === step)

  if (!isOpen || !vendor) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reject Vendor Application</h2>
                {/* Step indicator */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        {i < currentStepIndex ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                        ) : i === currentStepIndex ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-600 bg-brand-600" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                        )}
                        <span className={`text-xs font-medium ${i === currentStepIndex ? 'text-brand-600' : i < currentStepIndex ? 'text-brand-500' : 'text-slate-400'}`}>
                          {s.label}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`w-5 h-px ${i < currentStepIndex ? 'bg-brand-400' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vendor info bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{vendor.companyName}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <User className="w-3 h-3 shrink-0" />{vendor.ownerName}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Mail className="w-3 h-3 shrink-0" />{vendor.email}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Step 1 — Category */}
          {step === 'category' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Select Rejection Category</h3>
                <p className="text-sm text-slate-500 mt-0.5">Choose the primary reason category for this rejection.</p>
              </div>
              <div className="grid gap-2.5">
                {rejectionCategories.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/60 transition-all text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center shrink-0 group-hover:bg-red-100`}>
                        <Icon className={`w-4 h-4 ${cat.color} group-hover:text-red-600`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-red-800">{cat.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5 group-hover:text-red-600">{cat.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Reason */}
          {step === 'reason' && selectedCategoryData && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{selectedCategoryData.label}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Select a reason or write a custom explanation.</p>
                </div>
              </div>

              {/* Common reasons */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Common Reasons</p>
                {commonReasons[selectedCategory as keyof typeof commonReasons]?.map((reason, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedCommonReason === reason
                        ? 'border-red-400 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedCommonReason === reason ? 'border-red-500' : 'border-slate-300'
                    }`}>
                      {selectedCommonReason === reason && (
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={selectedCommonReason === reason}
                      onChange={() => handleReasonSelect(reason)}
                      className="sr-only"
                    />
                    <span className={`text-sm flex-1 ${selectedCommonReason === reason ? 'text-red-800 font-medium' : 'text-slate-700'}`}>{reason}</span>
                  </label>
                ))}
              </div>

              {/* Custom reason */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custom Reason</p>
                <textarea
                  value={customReason}
                  onChange={(e) => handleCustomReasonChange(e.target.value)}
                  placeholder="Provide a detailed explanation (minimum 10 characters)…"
                  rows={3}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none placeholder:text-slate-400 transition"
                />
                {customReason && customReason.length < 10 && (
                  <p className="text-xs text-red-500">Minimum 10 characters required.</p>
                )}
              </div>

              {/* Additional notes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Additional Notes <span className="normal-case font-normal text-slate-400">(optional)</span></p>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any additional context or suggestions for the vendor…"
                  rows={2}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none placeholder:text-slate-400 transition"
                />
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 'review' && selectedCategoryData && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Review Rejection</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Confirm the details before submitting.</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Category</p>
                  <p className="text-sm font-medium text-slate-800">{selectedCategoryData.label}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Reason</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedCommonReason || customReason}</p>
                </div>
                {additionalNotes && (
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Additional Notes</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{additionalNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">
                  This will permanently reject the application. The vendor will be notified by email. <strong>This action cannot be undone.</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {step === 'category' && 'Select a category to continue'}
            {step === 'reason' && 'Choose or write a reason to continue'}
            {step === 'review' && 'Review details and confirm'}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            {step === 'reason' && (
              <button
                onClick={handleNext}
                disabled={!isReasonValid}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review Rejection
              </button>
            )}

            {step === 'review' && (
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Rejecting…
                  </>
                ) : (
                  'Confirm Rejection'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
