'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle, Eye, EyeOff, Upload, FileText, File, Image, X } from 'lucide-react'
import VendorService, { VendorBankDetails, VendorDocument } from '@/services/vendorService'
import Dropdown from '@/components/UI/Dropdown'
import { Button } from '@/components/UI/Button'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'

interface BankDetailsForm {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  accountType: 'savings' | 'current'
  branchName?: string
  // Structured branch-address fields. Composed into the single `branchAddress`
  // string on save (backend stores one column); on load the existing string is
  // placed into addressLine1 so it stays editable without corrupting data.
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

const composeBranchAddress = (f: BankDetailsForm): string =>
  [f.addressLine1, f.addressLine2, f.city, f.state, f.postalCode, f.country]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(', ')

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/

const validateBankDetails = (f: BankDetailsForm): Record<string, string> => {
  const errors: Record<string, string> = {}
  if (!f.accountHolderName?.trim()) errors.accountHolderName = 'Account holder name is required'
  if (!f.bankName?.trim()) errors.bankName = 'Bank name is required'
  if (!f.accountNumber?.trim()) errors.accountNumber = 'Account number is required'
  if (!f.ifscCode?.trim()) {
    errors.ifscCode = 'IFSC code is required'
  } else if (!IFSC_REGEX.test(f.ifscCode.toUpperCase())) {
    errors.ifscCode = 'Invalid IFSC code format (e.g. HDFC0001234)'
  }
  if (!f.accountType) errors.accountType = 'Account type is required'
  return errors
}

const ERROR_INPUT_CLS =
  'w-full px-3.5 py-2.5 border border-red-500 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 bg-red-50/40 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed'
const NORMAL_INPUT_CLS =
  'w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed'

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1.5 text-xs text-red-600">{message}</p> : null

export default function BankDetails() {
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [documents, setDocuments] = useState<VendorDocument[]>([])
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [bankDetails, setBankDetails] = useState<VendorBankDetails | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showFormModal, setShowFormModal] = useState(false)
  const [uploadModal, setUploadModal] = useState<{ show: boolean; type: string; label: string; description: string }>({
    show: false,
    type: '',
    label: '',
    description: '',
  })
  const [uploadResult, setUploadResult] = useState<{ show: boolean; type: 'success' | 'error'; text: string }>({
    show: false,
    type: 'success',
    text: '',
  })

  const [deleteDocModal, setDeleteDocModal] = useState<{
    show: boolean
    documentId: string
    documentType: string
    loading: boolean
  }>({ show: false, documentId: '', documentType: '', loading: false })

  const [formData, setFormData] = useState<BankDetailsForm>({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'savings',
  })

  // Load bank details on component mount
  useEffect(() => {
    loadBankDetails()
    loadDocuments()
  }, [])

  const loadBankDetails = async () => {
    try {
      setIsLoading(true)
      const response = await VendorService.getVendorBankDetails()
      if (response.bankDetails) {
        setBankDetails(response.bankDetails)
        setFormData({
          accountHolderName: response.bankDetails.accountHolderName,
          bankName: response.bankDetails.bankName,
          accountNumber: response.bankDetails.accountNumber,
          ifscCode: response.bankDetails.ifscCode,
          accountType: response.bankDetails.accountType as 'savings' | 'current',
          branchName: response.bankDetails.branchName,
          addressLine1: response.bankDetails.branchAddress || '',
          addressLine2: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        })
      } else {
        // No bank details found, keep form empty for new entry
        setBankDetails(null)
      }
    } catch (error: any) {
      console.error('Failed to load bank details:', error)
      setMessage({ type: 'error', text: 'Failed to load bank details' })
    } finally {
      setIsLoading(false)
    }
  }

  const loadDocuments = async () => {
    try {
      const response = await VendorService.getVendorDocuments()
      const kycDocs = response.documents.filter(doc => 
        ['COMPANY_REGISTRATION', 'GST_CERTIFICATE', 'PAN_CARD', 'TRADE_LICENSE'].includes(doc.type)
      )
      setDocuments(kycDocs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setErrors(prev => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const openFormModal = () => {
    setErrors({})
    setMessage(null)
    setShowFormModal(true)
  }

  const openUploadModal = (type: string, label: string, description: string) => {
    setMessage(null)
    setUploadModal({ show: true, type, label, description })
  }

  const closeFormModal = () => {
    setErrors({})
    setShowFormModal(false)
    // Reset any unsaved edits back to the persisted values
    loadBankDetails()
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const validationErrors = validateBankDetails(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setMessage({ type: 'error', text: 'Please correct the highlighted fields.' })
      return
    }
    setErrors({})

    setIsSaving(true)
    setMessage(null)

    try {
      const { addressLine1, addressLine2, city, state, postalCode, country, ...rest } = formData
      await VendorService.upsertVendorBankDetails({
        ...rest,
        branchAddress: composeBranchAddress(formData),
      })
      setMessage({ type: 'success', text: 'Bank details updated successfully!' })
      setShowFormModal(false)
      // Reload to get updated data
      await loadBankDetails()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update bank details. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingDoc(docType)
    try {
      const docName = `${docType.replace('_', ' ').toLowerCase()} document`
      await VendorService.uploadVendorDocument(file, docType, docName)
      setUploadModal(prev => ({ ...prev, show: false }))
      setUploadResult({ show: true, type: 'success', text: 'Document uploaded successfully!' })
      await loadDocuments()
    } catch (error: any) {
      setUploadModal(prev => ({ ...prev, show: false }))
      setUploadResult({ show: true, type: 'error', text: error.message || 'Failed to upload document' })
    } finally {
      setUploadingDoc(null)
      // Allow re-selecting the same file later
      event.target.value = ''
    }
  }

  const handleDocumentDelete = (documentId: string, documentType: string) => {
    if (!documentId) return
    setDeleteDocModal({ show: true, documentId, documentType, loading: false })
  }

  const confirmDocumentDelete = async () => {
    setDeleteDocModal(prev => ({ ...prev, loading: true }))
    setUploadingDoc('deleting')
    try {
      await VendorService.deleteVendorDocument(deleteDocModal.documentId)
      setMessage({ type: 'success', text: 'Document deleted successfully!' })
      await loadDocuments()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete document' })
    } finally {
      setUploadingDoc(null)
      setDeleteDocModal({ show: false, documentId: '', documentType: '', loading: false })
    }
  }

  const getFileIcon = (url: string) => {
    const extension = getFileExtension(url)
    switch (extension) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600 mr-2" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'webp':
        return <Image className="w-5 h-5 text-blue-600 mr-2" />
      default:
        return <File className="w-5 h-5 text-slate-600 mr-2" />
    }
  }

  const getFileExtension = (url: string) => {
    if (!url) return ''
    const extension = url.split('.').pop()?.toLowerCase()
    return extension || ''
  }

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.type === docType)
    if (doc) return 'verified'
    return 'not_submitted'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bank Details</h1>
          <p className="text-sm text-slate-600 mt-1">Manage your bank account information for payouts</p>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <p className={`text-sm font-medium ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Account summary card / Create prompt */}
      {bankDetails ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card header: title + status + edit */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Bank Account</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                bankDetails.isVerified
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {bankDetails.isVerified ? (
                  <><CheckCircle className="w-3 h-3" /> Verified</>
                ) : (
                  <><AlertCircle className="w-3 h-3" /> Under Review</>
                )}
              </span>
            </div>
            {!bankDetails.isVerified && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFormModal}
              >
                Edit
              </Button>
            )}
          </div>

          {/* Card body: saved details */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
            <div>
              <dt className="text-xs font-medium text-slate-500">Account Holder Name</dt>
              <dd className="text-sm text-slate-900 mt-0.5">{bankDetails.accountHolderName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Bank Name</dt>
              <dd className="text-sm text-slate-900 mt-0.5">{bankDetails.bankName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Account Number</dt>
              <dd className="text-sm text-slate-900 mt-0.5">
                {bankDetails.accountNumber
                  ? `•••• •••• ${bankDetails.accountNumber.slice(-4)}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">IFSC Code</dt>
              <dd className="text-sm text-slate-900 mt-0.5 uppercase">{bankDetails.ifscCode || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Account Type</dt>
              <dd className="text-sm text-slate-900 mt-0.5 capitalize">{bankDetails.accountType || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Branch Name</dt>
              <dd className="text-sm text-slate-900 mt-0.5">{bankDetails.branchName || '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">Branch Address</dt>
              <dd className="text-sm text-slate-900 mt-0.5">{bankDetails.branchAddress || '—'}</dd>
            </div>
          </dl>

          {/* Status note */}
          <div className={`px-6 py-3 text-xs border-t ${
            bankDetails.isVerified
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-yellow-50 border-yellow-100 text-yellow-700'
          }`}>
            {bankDetails.isVerified
              ? 'Verified and active for payouts. Verified details cannot be changed — contact admin for modifications.'
              : 'Your bank details are under review. You will be notified once verified. You can still edit them until then.'}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center">
          <div className="p-3 rounded-full bg-brand-50 mb-3">
            <AlertCircle className="w-6 h-6 text-brand-500" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">No Bank Account Added</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md">
            Add your bank account details to receive payouts for your orders. Details are reviewed and verified by admin.
          </p>
          <Button
            type="button"
            onClick={openFormModal}
            className="mt-4 bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
            size="lg"
          >
            Create Bank Account
          </Button>
        </div>
      )}

      {/* Bank Account Form Modal */}
      {showFormModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {bankDetails ? 'Edit Bank Account' : 'Create Bank Account'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {bankDetails
                  ? 'Update your bank details. Changes return to "Under Review" until re-verified.'
                  : 'Enter your bank details. They will be reviewed and verified by admin before payouts.'}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={closeFormModal}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Modal body: form */}
          <form id="bankDetailsForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* In-modal error message */}
            {message?.type === 'error' && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800">{message.text}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Holder Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Account Holder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="accountHolderName"
              value={formData.accountHolderName || ''}
              onChange={handleChange}
              placeholder="Enter full name"
              className={errors.accountHolderName ? ERROR_INPUT_CLS : NORMAL_INPUT_CLS}
              disabled={bankDetails?.isVerified}
            />
            <FieldError message={errors.accountHolderName} />
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="Enter bank name"
              className={errors.bankName ? ERROR_INPUT_CLS : NORMAL_INPUT_CLS}
              disabled={bankDetails?.isVerified}
            />
            <FieldError message={errors.bankName} />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Account Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showAccountNumber ? 'text' : 'password'}
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Enter account number"
                className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed ${
                  errors.accountNumber
                    ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                    : 'border-slate-300 focus:ring-brand-500/40 focus:border-brand-500'
                }`}
                disabled={bankDetails?.isVerified}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowAccountNumber(!showAccountNumber)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                disabled={bankDetails?.isVerified}
              >
                {showAccountNumber ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <FieldError message={errors.accountNumber} />
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              placeholder="Enter IFSC code"
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 uppercase focus:outline-none focus:ring-2 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed ${
                errors.ifscCode
                  ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                  : 'border-slate-300 focus:ring-brand-500/40 focus:border-brand-500'
              }`}
              disabled={bankDetails?.isVerified}
            />
            <FieldError message={errors.ifscCode} />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Account Type <span className="text-red-500">*</span>
            </label>
            <div className={errors.accountType ? 'rounded-lg ring-2 ring-red-500/40 ring-offset-0' : ''}>
              <Dropdown
                id="accountType"
                value={formData.accountType}
                options={[
                  { value: 'savings', label: 'Savings Account' },
                  { value: 'current', label: 'Current Account' }
                ]}
                placeholder="Select account type"
                onChange={(value) => handleChange({ target: { name: 'accountType', value } } as any)}
                disabled={bankDetails?.isVerified}
              />
            </div>
            <FieldError message={errors.accountType} />
          </div>

          {/* Branch Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Branch Name
            </label>
            <input
              type="text"
              name="branchName"
              value={formData.branchName || ''}
              onChange={handleChange}
              placeholder="Enter branch name"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
              disabled={bankDetails?.isVerified}
            />
          </div>

          {/* Branch Address — structured (two rows of three) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Branch Address
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Row 1: Address Line 1, Address Line 2, City */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Address Line 1
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1 || ''}
                  onChange={handleChange}
                  placeholder="Building / street"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={bankDetails?.isVerified}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2 || ''}
                  onChange={handleChange}
                  placeholder="Area, landmark, etc."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={bankDetails?.isVerified}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  placeholder="City"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={bankDetails?.isVerified}
                />
              </div>

              {/* Row 2: State, Postal Code, Country */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  State / Province
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleChange}
                  placeholder="State / province"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={bankDetails?.isVerified}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Postal Code
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode || ''}
                  onChange={handleChange}
                  placeholder="Postal / ZIP code"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={bankDetails?.isVerified}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleChange}
                  placeholder="Country"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-colors disabled:bg-slate-100 disabled:cursor-not-allowed"
                  disabled={bankDetails?.isVerified}
                />
              </div>
            </div>
          </div>

        </div>

            {/* Note info */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">Important:</span> Once bank details are verified by admin, they cannot be changed.
                Ensure all information is accurate before submission. For any modifications after verification, please contact admin support.
              </p>
            </div>
          </form>

          {/* Modal footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={closeFormModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="bankDetailsForm"
              disabled={isSaving}
              className="bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : bankDetails ? 'Update Bank Details' : 'Save Bank Details'}
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* KYC Documents Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">KYC Documents</h1>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Upload Required
            </span>
          </div>
        </div>
        
        {/* KYC Status — interactive: uploaded cards show View, empty cards open upload modal */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold mb-3">Verification Status</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { type: 'COMPANY_REGISTRATION', label: 'Company Registration', description: 'Certificate of Incorporation / Business Registration' },
              { type: 'GST_CERTIFICATE', label: 'GST Certificate', description: 'Goods and Services Tax Registration' },
              { type: 'PAN_CARD', label: 'PAN Card', description: 'Permanent Account Number Card' },
              { type: 'TRADE_LICENSE', label: 'Trade License', description: 'Business/Trade License from Local Authority' }
            ].map(({ type, label, description }) => {
              const doc = documents.find(d => d.type === type)
              const uploaded = getDocumentStatus(type) === 'verified'
              return uploaded ? (
                <div key={type} className="flex flex-col gap-2 p-3 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-green-500"></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
                      <p className="text-xs text-green-600">Uploaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-green-200">
                    <Button
                      variant="link"
                      size="sm"
                      asChild
                      className="h-auto p-0 text-xs text-brand-600 hover:text-brand-700"
                    >
                      <a href={doc?.documentUrl} target="_blank" rel="noopener noreferrer">View</a>
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => openUploadModal(type, label, description)}
                      className="h-auto p-0 text-xs text-brand-600 hover:text-brand-700"
                    >
                      Replace
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => handleDocumentDelete(doc?.id || '', label)}
                      disabled={uploadingDoc === 'deleting'}
                      className="h-auto p-0 text-xs text-red-600 hover:text-red-700 disabled:text-slate-400"
                    >
                      {uploadingDoc === 'deleting' ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  key={type}
                  type="button"
                  onClick={() => openUploadModal(type, label, description)}
                  className="flex items-center gap-2 p-3 border rounded-lg bg-slate-50 border-slate-200 text-left hover:border-brand-400 hover:bg-brand-50/40 transition-colors group"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-400"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
                    <p className="text-xs text-slate-500 group-hover:text-brand-600">Click to upload</p>
                  </div>
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-brand-500 shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      {uploadModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Upload {uploadModal.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{uploadModal.description}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setUploadModal(prev => ({ ...prev, show: false }))}
                disabled={uploadingDoc === uploadModal.type}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-6 py-5">
              {message && (
                <div className={`flex items-start gap-3 p-3 rounded-lg mb-4 ${
                  message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {message.text}
                  </p>
                </div>
              )}

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                {uploadingDoc === uploadModal.type ? (
                  <div className="space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                    <p className="text-sm text-slate-600">Uploading...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => document.getElementById(`file-${uploadModal.type}`)?.click()}
                        className="h-auto p-0 font-medium text-brand-600 hover:text-brand-700"
                      >
                        Choose a file
                      </Button>
                      <span> to upload</span>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG, PDF up to 10MB</p>
                  </div>
                )}
              </div>

              <input
                id={`file-${uploadModal.type}`}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={(e) => handleDocumentUpload(e, uploadModal.type)}
                className="hidden"
                disabled={uploadingDoc === uploadModal.type}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Popup */}
      {uploadResult.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
              uploadResult.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {uploadResult.type === 'success' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-4">
              {uploadResult.type === 'success' ? 'Upload Successful' : 'Upload Failed'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">{uploadResult.text}</p>
            <Button
              type="button"
              onClick={() => setUploadResult(prev => ({ ...prev, show: false }))}
              className={`mt-5 w-full text-white ${
                uploadResult.type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        show={deleteDocModal.show}
        title="Delete Document"
        itemName={deleteDocModal.documentType}
        itemDetail="This document will be permanently removed"
        loading={deleteDocModal.loading}
        confirmLabel="Delete Permanently"
        onConfirm={confirmDocumentDelete}
        onCancel={() => setDeleteDocModal({ show: false, documentId: '', documentType: '', loading: false })}
      />
    </div>
  )
}
