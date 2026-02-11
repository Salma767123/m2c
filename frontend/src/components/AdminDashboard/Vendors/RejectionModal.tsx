'use client'

import { useState } from 'react'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import { 
  X, 
  AlertTriangle, 
  FileText, 
  Clock, 
  User, 
  Building2,
  Mail,
  Phone
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
    color: 'text-blue-600'
  },
  {
    id: 'compliance',
    label: 'Compliance Issues',
    description: 'Does not meet regulatory or quality standards',
    icon: AlertTriangle,
    color: 'text-orange-600'
  },
  {
    id: 'business',
    label: 'Business Requirements',
    description: 'Does not meet minimum business criteria or capacity',
    icon: Building2,
    color: 'text-purple-600'
  },
  {
    id: 'verification',
    label: 'Verification Failed',
    description: 'Unable to verify provided information or references',
    icon: User,
    color: 'text-red-600'
  },
  {
    id: 'other',
    label: 'Other Reasons',
    description: 'Specify custom reason for rejection',
    icon: Clock,
    color: 'text-gray-600'
  }
]

const commonReasons = {
  documentation: [
    'Missing GST certificate',
    'Invalid business registration documents',
    'Expired certifications',
    'Incomplete company profile',
    'Missing owner identification documents'
  ],
  compliance: [
    'Does not meet quality standards',
    'Missing required certifications',
    'Non-compliance with industry regulations',
    'Failed background verification',
    'Inadequate quality control processes'
  ],
  business: [
    'Insufficient production capacity',
    'Limited product range',
    'Inadequate warehouse facilities',
    'Poor financial standing',
    'Limited market experience'
  ],
  verification: [
    'Unable to verify business address',
    'Invalid contact information',
    'References could not be verified',
    'Suspicious business activities',
    'Conflicting information provided'
  ],
  other: [
    'Application submitted multiple times',
    'Incomplete application form',
    'Does not align with business requirements',
    'Geographic location restrictions'
  ]
}

export default function RejectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  vendor, 
  isLoading = false 
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
    if (step === 'reason') {
      setStep('review')
    }
  }

  const handleBack = () => {
    if (step === 'reason') {
      setStep('category')
    } else if (step === 'review') {
      setStep('reason')
    }
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

  if (!isOpen || !vendor) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white">
        <CardHeader className="border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-red-800">Reject Vendor Application</CardTitle>
                <p className="text-sm text-red-600 mt-1">
                  Step {step === 'category' ? '1' : step === 'reason' ? '2' : '3'} of 3
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
              </div>
            </div>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Category Selection */}
            {step === 'category' && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Select Rejection Category
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choose the primary reason category for rejecting this vendor application.
                  </p>
                </div>

                <div className="grid gap-3">
                  {rejectionCategories.map((category) => {
                    const Icon = category.icon
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all duration-200 text-left group"
                      >
                        <div className="flex items-start space-x-3">
                          <Icon className={`w-5 h-5 mt-0.5 ${category.color} group-hover:text-red-600`} />
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 group-hover:text-red-800">
                              {category.label}
                            </h5>
                            <p className="text-sm text-gray-600 mt-1 group-hover:text-red-600">
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

            {/* Step 2: Reason Selection */}
            {step === 'reason' && selectedCategoryData && (
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
                      Select a specific reason or provide a custom explanation.
                    </p>
                  </div>
                </div>

                {/* Common Reasons */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Common Reasons:</h5>
                  {commonReasons[selectedCategory as keyof typeof commonReasons]?.map((reason, index) => (
                    <label
                      key={index}
                      className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={selectedCommonReason === reason}
                        onChange={() => handleReasonSelect(reason)}
                        className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
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
                    placeholder="Provide a detailed explanation for the rejection (minimum 10 characters)..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                  {customReason && customReason.length < 10 && (
                    <p className="text-sm text-red-600">
                      Please provide at least 10 characters for a custom reason.
                    </p>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Additional Notes (Optional):</h5>
                  <textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any additional context or suggestions for the vendor..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && selectedCategoryData && (
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
                    <h4 className="text-lg font-semibold text-gray-900">Review Rejection</h4>
                    <p className="text-sm text-gray-600">
                      Please review the rejection details before confirming.
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-red-800">Category:</h5>
                      <p className="text-sm text-red-700 mt-1">{selectedCategoryData.label}</p>
                    </div>

                    <div>
                      <h5 className="font-medium text-red-800">Reason:</h5>
                      <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                        {selectedCommonReason || customReason}
                      </p>
                    </div>

                    {additionalNotes && (
                      <div>
                        <h5 className="font-medium text-red-800">Additional Notes:</h5>
                        <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
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
                        This action will permanently reject the vendor application. The vendor will be 
                        notified via email with the rejection reason. This action cannot be undone.
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
              {step === 'category' && 'Select a rejection category to continue'}
              {step === 'reason' && 'Choose or provide a specific reason'}
              {step === 'review' && 'Review and confirm the rejection'}
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              
              {step === 'reason' && (
                <Button
                  onClick={handleNext}
                  disabled={!isReasonValid}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Review Rejection
                </Button>
              )}
              
              {step === 'review' && (
                <Button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Rejecting...</span>
                    </>
                  ) : (
                    'Confirm Rejection'
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