'use client'

import { useState } from 'react'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-200 bg-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Ban className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-orange-800">Suspend Vendor</CardTitle>
                <p className="text-sm text-orange-600 mt-1">
                  Step {step === 'category' ? '1' : step === 'details' ? '2' : '3'} of 3
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Vendor Information Header */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{vendor.companyName}</h3>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{vendor.ownerName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{vendor.email}</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="w-4 h-4" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Current Status: {vendor.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Category Selection */}
            {step === 'category' && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Select Suspension Category
                  </h4>
                  <p className="text-sm text-gray-600">
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
                        className="w-full p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 text-left group"
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className={`w-5 h-5 mt-0.5 ${category.color} group-hover:text-orange-600`} />
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 group-hover:text-orange-800">
                              {category.label}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1 group-hover:text-orange-600">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    ← Back
                  </Button>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedCategoryData.label}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Provide specific details and suspension duration.
                    </p>
                  </div>
                </div>

                {/* Suspension Duration */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Suspension Duration:</h5>
                  <div className="grid grid-cols-2 gap-3">
                    {suspensionDurations.map((duration) => (
                      <label
                        key={duration.value}
                        className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="duration"
                          value={duration.value}
                          checked={selectedDuration === duration.value}
                          onChange={(e) => setSelectedDuration(e.target.value)}
                          className="mt-1 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{duration.label}</span>
                          <p className="text-xs text-gray-600 mt-1">{duration.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Common Reasons */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Common Reasons:</h5>
                  {suspensionReasons[selectedCategory as keyof typeof suspensionReasons]?.map((reason, index) => (
                    <label
                      key={index}
                      className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={() => handleReasonSelect(reason)}
                        className="mt-1 w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700 flex-1">{reason}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Reason */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Custom Reason:</h5>
                  <textarea
                    value={customReason}
                    onChange={(e) => handleCustomReasonChange(e.target.value)}
                    placeholder="Provide a detailed explanation for the suspension (minimum 10 characters)..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                {/* Additional Notes */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Additional Notes (Optional):</h5>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any additional context or steps for resolution..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && selectedCategoryData && selectedDurationData && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    ← Back
                  </Button>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Review Suspension</h4>
                    <p className="text-sm text-gray-600">
                      Please review the suspension details before confirming.
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
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

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {step === 'category' && 'Select a suspension category to continue'}
              {step === 'details' && 'Provide reason and duration details'}
              {step === 'review' && 'Review and confirm the suspension'}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              
              {step === 'details' && (
                <Button
                  onClick={handleNext}
                  disabled={!isDetailsValid}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  Review Suspension
                </Button>
              )}
              
              {step === 'review' && (
                <Button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Suspending...</span>
                    </>
                  ) : (
                    'Confirm Suspension'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}