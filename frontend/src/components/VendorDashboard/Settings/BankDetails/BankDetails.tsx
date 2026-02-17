'use client'

import { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle, Eye, EyeOff, Upload, FileText, File, Image } from 'lucide-react'
import VendorService, { VendorBankDetails, VendorDocument } from '@/services/vendorService'
import Dropdown from '@/components/UI/Dropdown'
import { Button } from '@/components/UI/Button'

interface BankDetailsForm {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  accountType: 'savings' | 'current'
  branchName?: string
  branchAddress?: string
}

export default function BankDetails() {
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [documents, setDocuments] = useState<VendorDocument[]>([])
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [bankDetails, setBankDetails] = useState<VendorBankDetails | null>(null)

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
          branchAddress: response.bankDetails.branchAddress,
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
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      await VendorService.upsertVendorBankDetails(formData)
      setMessage({ type: 'success', text: 'Bank details updated successfully!' })
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
      setMessage({ type: 'success', text: 'Document uploaded successfully!' })
      await loadDocuments()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload document' })
    } finally {
      setUploadingDoc(null)
    }
  }

  const handleDocumentDelete = async (documentId: string) => {
    if (!documentId) return
    
    if (!confirm('Are you sure you want to delete this document?')) return

    setUploadingDoc('deleting')
    try {
      await VendorService.deleteVendorDocument(documentId)
      setMessage({ type: 'success', text: 'Document deleted successfully!' })
      await loadDocuments()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete document' })
    } finally {
      setUploadingDoc(null)
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
        return <File className="w-5 h-5 text-gray-600 mr-2" />
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Details</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your bank account information for payouts</p>
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

      {/* Verification Status */}
      {bankDetails ? (
        <div className={`border rounded-lg p-4 flex items-start gap-3 ${
          bankDetails.isVerified 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
            bankDetails.isVerified ? 'text-green-600' : 'text-yellow-600'
          }`} />
          <div>
            <p className={`text-sm font-semibold ${
              bankDetails.isVerified ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {bankDetails.isVerified ? 'Bank Details Verified' : 'Bank Details Submitted'}
            </p>
            <p className={`text-xs mt-1 ${
              bankDetails.isVerified ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {bankDetails.isVerified 
                ? 'Your bank details have been verified and are active for payouts.'
                : 'Your bank details are under review. You will be notified once verified.'
              }
            </p>
            {bankDetails.isVerified && (
              <p className="text-xs text-gray-600 mt-2">
                <strong>Note:</strong> Verified bank details cannot be changed. Contact admin for modifications.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Bank Details Required</p>
            <p className="text-xs text-blue-700 mt-1">Please provide your bank details to receive payouts for your orders.</p>
          </div>
        </div>
      )}

      {/* Bank Details Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Holder Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Account Holder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="accountHolderName"
              value={formData.accountHolderName || ''}
              onChange={handleChange}
              placeholder="Enter full name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={bankDetails?.isVerified}
            />
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="bankName"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="Enter bank name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={bankDetails?.isVerified}
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Account Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showAccountNumber ? 'text' : 'password'}
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Enter account number"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
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
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="ifscCode"
              value={formData.ifscCode}
              onChange={handleChange}
              placeholder="Enter IFSC code"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition uppercase disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
              disabled={bankDetails?.isVerified}
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type <span className="text-red-500">*</span>
            </label>
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

          {/* Branch Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Branch Name
            </label>
            <input
              type="text"
              name="branchName"
              value={formData.branchName || ''}
              onChange={handleChange}
              placeholder="Enter branch name"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={bankDetails?.isVerified}
            />
          </div>

          {/* Branch Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Branch Address
            </label>
            <input
              type="text"
              name="branchAddress"
              value={formData.branchAddress || ''}
              onChange={handleChange}
              placeholder="Enter branch address"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={bankDetails?.isVerified}
            />
          </div>

        </div>

        {/* Submit Button */}
        {(!bankDetails || !bankDetails.isVerified) && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 text-white hover:bg-blue-700"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : bankDetails ? 'Update Bank Details' : 'Save Bank Details'}
            </Button>
          </div>
        )}
      </form>

      {/* Important Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">Important:</span> Once bank details are verified by admin, they cannot be changed. 
          Ensure all information is accurate before submission. For any modifications after verification, please contact admin support.
        </p>
      </div>
      {/* KYC Documents Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">KYC Documents</h1>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Upload Required
            </span>
          </div>
        </div>
        
        {/* KYC Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Verification Status</h2>
          <div className="space-y-4">
            {[
              { type: 'COMPANY_REGISTRATION', label: 'Company Registration' },
              { type: 'GST_CERTIFICATE', label: 'GST Certificate' },
              { type: 'PAN_CARD', label: 'PAN Card' },
              { type: 'TRADE_LICENSE', label: 'Trade License' }
            ].map(({ type, label }) => {
              const status = getDocumentStatus(type)
              return (
                <div key={type} className={`flex items-center justify-between p-4 border rounded-lg ${
                  status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      status === 'verified' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="font-medium">{label}</span>
                  </div>
                  <span className={`font-medium ${
                    status === 'verified' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {status === 'verified' ? 'Uploaded' : 'Not Submitted'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upload Documents */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>
          
          <div className="space-y-6">
            {[
              { type: 'COMPANY_REGISTRATION', label: 'Company Registration Certificate', description: 'Certificate of Incorporation or Business Registration' },
              { type: 'GST_CERTIFICATE', label: 'GST Registration Certificate', description: 'Goods and Services Tax Registration Certificate' },
              { type: 'PAN_CARD', label: 'PAN Card', description: 'Permanent Account Number Card' },
              { type: 'TRADE_LICENSE', label: 'Trade License', description: 'Business/Trade License from Local Authority' }
            ].map(({ type, label, description }) => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <p className="text-xs text-gray-500 mb-2">{description}</p>
                
                {getDocumentStatus(type) === 'verified' ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex items-center mr-3">
                        {getFileIcon(documents.find(d => d.type === type)?.documentUrl || '')}
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <span className="text-sm text-green-800 font-medium">Document uploaded</span>
                        <p className="text-xs text-green-600 mt-1">
                          {documents.find(d => d.type === type)?.name || `${label} document`} 
                          <span className="ml-1 text-gray-500">
                            (.{getFileExtension(documents.find(d => d.type === type)?.documentUrl || '')})
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded: {new Date(documents.find(d => d.type === type)?.uploadedAt || '').toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="sm"
                        asChild
                        className="h-auto p-0 text-blue-600 hover:text-blue-700"
                      >
                        <a
                          href={documents.find(d => d.type === type)?.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => document.getElementById(`file-${type}`)?.click()}
                        className="h-auto p-0 text-blue-600 hover:text-blue-700"
                      >
                        Replace
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleDocumentDelete(documents.find(d => d.type === type)?.id || '')}
                        disabled={uploadingDoc === 'deleting'}
                        className="h-auto p-0 text-red-600 hover:text-red-700 disabled:text-gray-400"
                      >
                        {uploadingDoc === 'deleting' ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    {uploadingDoc === type ? (
                      <div className="space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="text-sm text-gray-600">
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => document.getElementById(`file-${type}`)?.click()}
                            className="h-auto p-0 font-medium text-blue-600 hover:text-blue-500"
                          >
                            Upload a file
                          </Button>
                          <span> or drag and drop</span>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                      </div>
                    )}
                  </div>
                )}
                
                <input
                  id={`file-${type}`}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={(e) => handleDocumentUpload(e, type)}
                  className="hidden"
                  disabled={uploadingDoc === type}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
