'use client'

import { useState } from 'react'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import { 
  X, 
  AlertTriangle, 
  Shield, 
  Clock, 
  User, 
  Building2,
  Mail,
  Phone,
  Ban
} from 'lucide-react'

interface VendorInfo {
  id: string
  companyName: string
  ownerName: string
  email: string
  phone?: string
  status: string
}

interface SuspensionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, category: string, duration?: string) => Promise<void>
  vendor: VendorInfo | null
  isLoading?: boolean
}

const suspensionCategories = [
  {
    id: 'quality',
    label: 'Quality Issues',
    description: 'Poor product quality or service delivery',
    icon: Shield,
    color: 'text-red-600'
  },
  {
    id: 'compliance',
    label: 'Policy Violations',
    description: 'Violation of platform policies or terms',
    icon: Ban,
    color: 'text-orange-600'
  },
  {
    id: 'performance',
    label: 'Performance Issues',
    description: 'Consistent delays or poor performance',
    icon: Clock,
    color: 'text-yellow-600'
  },
  {
    id: 'conduct',
    label: 'Misconduct',
    description: 'Inappropriate behavior or communication',
    icon: User,
    color: 'text-purple-600'
  }
]

const suspensionReasons = {
  quality: [
    'Multiple customer complaints about product quality',
    'Failed quality inspections',
    'Delivery of defective products',
    'Non-compliance with quality standards'
  ],
  compliance: [
    'Violation of platform terms and conditions',
    'Fraudulent activities or misrepresentation',
    'Non-compliance with regulatory requirements',
    'Breach of contract terms'
  ],
  performance: [
    'Consistent late deliveries',
    'Poor order fulfillment rate',
    'Inadequate customer service',
    'Failure to meet agreed timelines'
  ],
  conduct: [
    'Inappropriate communication with customers',
    'Unprofessional behavior',
    'Harassment or discrimination',
    'Violation of business ethics'
  ]
}

const suspensionDurations = [
  { value: '7', label: '7 Days', description: 'Short-term suspension for minor issues' },
  { value: '30', label: '30 Days', description: 'Standard suspension for moderate violations' },
  { value: '90', label: '90 Days', description: 'Extended suspension for serious violations' },
  { value: 'indefinite', label: 'Indefinite', description: 'Until further review and resolution' }
]

export default function SuspensionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  vendor, 
  isLoading = false 
}: SuspensionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [customReason, setCustomReason] = useState<string>('')
  const [selectedDuration, setSelectedDuration] = useState<string>('')
  const [additionalNotes, setAdditionalNotes] = useState<string>('')
  const [step, setStep] = useState<'category' | 'details' | 'review'>('category')

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedReason('')
    setCustomReason('')
    setStep('details')
  }

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason)
    setCustomReason('')
  }

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value)
    setSelectedReason('')
  }

  const handleNext = () => {
    if (step === 'details') {
      setStep('review')
    }
  }

  const handleBack = () => {
    if (step === 'details') {
      setStep('category')
    } else if (step === 'review') {
      setStep('details')
    }
  }

  const handleConfirm = async () => {
    const finalReason = selectedReason || customReason
    const fullReason = additionalNotes 
      ? `${finalReason}\n\nAdditional Notes: ${additionalNotes}`
      : finalReason

    await onConfirm(fullReason, selectedCategory, selectedDuration)
  }

  const handleClose = () => {
    if (!isLoading) {
      setStep('category')
      setSelectedCategory('')
      setSelectedReason('')
      setCustomReason('')
      setSelectedDuration('')
      setAdditionalNotes('')
      onClose()
    }
  }

  const isDetailsValid = (selectedReason || customReason.trim().length >= 10) && selectedDuration
  const selectedCategoryData = suspensionCategories.find(cat => cat.id === selectedCategory)
  const selectedDurationData = suspensionDurations.find(dur => dur.value === selectedDuration)

  if (!isOpen || !vendor) return null

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-slate-100 shrink-0">
          <div className="bg-orange-50/60 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <Ban className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-base font-semibold text-orange-800">Suspend Vendor</p>
                <p className="text-sm text-orange-600 mt-0.5">
                  Step {step === 'category' ? '1' : step === 'details' ? '2' : '3'} of 3
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Vendor Information Header */}
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{vendor.companyName}</h3>
              <div className="flex items-center gap-4 mt-0.5 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>{vendor.ownerName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{vendor.email}</span>
                </div>
                {vendor.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 shrink-0">
              {vendor.status}
            </span>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {/* Step 1: Category Selection */}
            {step === 'category' && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h4 className="text-base font-semibold text-slate-900 mb-1">
                    Select Suspension Category
                  </h4>
                  <p className="text-sm text-slate-500">
                    Choose the primary reason category for suspending this vendor.
                  </p>
                </div>

                <div className="grid gap-3">
                  {suspensionCategories.map((category) => {
                    const Icon = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className="w-full p-3.5 border border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/60 transition-all text-left group"
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className={`w-5 h-5 mt-0.5 ${category.color} group-hover:text-orange-600`} />
                          <div className="flex-1">
                            <h5 className="font-medium text-slate-900 group-hover:text-orange-800">
                              {category.label}
                            </h5>
                            <p className="text-sm text-slate-500 mt-1 group-hover:text-orange-600">
                              {category.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 'details' && selectedCategoryData && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <button
                    onClick={handleBack}
                    className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">
                      {selectedCategoryData.label}
                    </h4>
                    <p className="text-sm text-slate-500">
                      Provide specific details and suspension duration.
                    </p>
                  </div>
                </div>

                {/* Suspension Duration */}
                <div className="space-y-3">
                  <h5 className="font-medium text-slate-900">Suspension Duration:</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {suspensionDurations.map((duration) => (
                      <label
                        key={duration.value}
                        className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="duration"
                          value={duration.value}
                          checked={selectedDuration === duration.value}
                          onChange={(e) => setSelectedDuration(e.target.value)}
                          className="mt-1 w-4 h-4 accent-orange-600"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-900">{duration.label}</span>
                          <p className="text-xs text-slate-500 mt-1">{duration.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Common Reasons */}
                <div className="space-y-3">
                  <h5 className="font-medium text-slate-900">Common Reasons:</h5>
                  {suspensionReasons[selectedCategory as keyof typeof suspensionReasons]?.map((reason, index) => (
                    <label
                      key={index}
                      className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => handleReasonSelect(reason)}
                        className="mt-1 w-4 h-4 accent-orange-600"
                      />
                      <span className="text-sm text-slate-600 flex-1">{reason}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Reason */}
                <div className="space-y-3">
                  <h5 className="font-medium text-slate-900">Custom Reason:</h5>
                  <textarea
                    value={customReason}
                    onChange={(e) => handleCustomReasonChange(e.target.value)}
                    placeholder="Provide a detailed explanation for the suspension (minimum 10 characters)..."
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 resize-none placeholder:text-slate-400 transition"
                    rows={4}
                  />
                </div>

                {/* Additional Notes */}
                <div className="space-y-3">
                  <h5 className="font-medium text-slate-900">Additional Notes (Optional):</h5>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any additional context or steps for resolution..."
                    className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 resize-none placeholder:text-slate-400 transition"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && selectedCategoryData && selectedDurationData && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <button
                    onClick={handleBack}
                    className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">Review Suspension</h4>
                    <p className="text-sm text-slate-500">
                      Please review the suspension details before confirming.
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-orange-800">Category:</h5>
                      <p className="text-sm text-orange-700 mt-1">{selectedCategoryData.label}</p>
                    </div>

                    <div>
                      <h5 className="font-medium text-orange-800">Duration:</h5>
                      <p className="text-sm text-orange-700 mt-1">
                        {selectedDurationData.label} - {selectedDurationData.description}
                      </p>
                    </div>

                    <div>
                      <h5 className="font-medium text-orange-800">Reason:</h5>
                      <p className="text-sm text-orange-700 mt-1 whitespace-pre-wrap">
                        {selectedReason || customReason}
                      </p>
                    </div>

                    {additionalNotes && (
                      <div>
                        <h5 className="font-medium text-orange-800">Additional Notes:</h5>
                        <p className="text-sm text-orange-700 mt-1 whitespace-pre-wrap">
                          {additionalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-800">Important Notice</h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        This action will suspend the vendor's access to the platform. The vendor will be
                        notified via email with the suspension details and duration.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 shrink-0">
          <div className="text-sm text-slate-500">
            {step === 'category' && 'Select a suspension category to continue'}
            {step === 'details' && 'Provide reason and duration details'}
            {step === 'review' && 'Review and confirm the suspension'}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition-colors disabled:opacity-40"
            >
              Cancel
            </button>

            {step === 'details' && (
              <button
                onClick={handleNext}
                disabled={!isDetailsValid}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-40"
              >
                Review Suspension
              </button>
            )}

            {step === 'review' && (
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Suspending...</span>
                  </>
                ) : (
                  'Confirm Suspension'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}