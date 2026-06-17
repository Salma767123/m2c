'use client'

import { useState } from 'react'
import { ArrowLeft, Send, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Dropdown from '@/components/UI/Dropdown'
import supportService from '@/services/supportService'
import { useRouter } from 'next/navigation'
import ResultModal from '@/components/UI/ResultModal'

export default function CreateSupport() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    description: '',
    attachments: [] as File[]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadResult, setUploadResult] = useState<{ show: boolean; type: 'success' | 'error'; text: string }>({ show: false, type: 'success', text: '' })

  const clearError = (name: string) => {
    setErrors(prev => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.subject.trim()) e.subject = 'Subject is required'
    if (!formData.description.trim()) e.description = 'Description is required'
    else if (formData.description.trim().length < 20) e.description = 'Description must be at least 20 characters'
    return e
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    clearError(name)
  }

  const handleCategoryChange = (value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      category: value as string
    }))
  }

  const handlePriorityChange = (value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      priority: value as string
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    const oversized = files.filter(f => f.size > 10 * 1024 * 1024)
    if (oversized.length > 0) {
      setUploadResult({ show: true, type: 'error', text: `The following file(s) exceed the 10MB limit: ${oversized.map(f => f.name).join(', ')}` })
      e.target.value = ''
      return
    }

    if (formData.attachments.length + files.length > 5) {
      setUploadResult({ show: true, type: 'error', text: 'You can attach a maximum of 5 files.' })
      e.target.value = ''
      return
    }

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files].slice(0, 5) // Max 5 files
    }))
    setUploadResult({ show: true, type: 'success', text: `${files.length > 1 ? `${files.length} files` : 'File'} attached successfully.` })
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      showErrorToast('Validation Error', 'Please correct the highlighted fields.')
      return
    }
    setErrors({})
    setIsSubmitting(true)

    try {
      const payload = {
        subject: formData.subject,
        category: formData.category,
        priority: formData.priority,
        description: formData.description,
      }

      const res = await supportService.createTicket(payload)

      if (res.success) {
        showSuccessToast('Ticket Created!', 'Your support ticket has been submitted successfully.')
        router.push('/vendor/dashboard/support')
      }
    } catch (error: any) {
      showErrorToast('Submission Failed', error.message || 'Failed to create ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-420 mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/vendor/dashboard/support" className="text-white bg-brand-500 p-2 rounded">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Support Ticket</h1>
          <p className="text-slate-600 mt-1">Report an issue and get help from our support team</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Subject */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="Brief description of your issue"
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.subject
                ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                : 'border-slate-300 focus:ring-blue-500'
            }`}
          />
          {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject}</p>}
        </div>

        {/* Category & Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <Dropdown
              label="Category"
              value={formData.category}
              options={[
                { value: 'technical', label: 'Technical Issue' },
                { value: 'billing', label: 'Billing & Payments' },
                { value: 'account', label: 'Account Management' },
                { value: 'product', label: 'Product Listing' },
                { value: 'shipping', label: 'Shipping & Returns' },
                { value: 'other', label: 'Other' }
              ]}
              onChange={handleCategoryChange}
              placeholder="Select category"
            />
          </div>

          {/* Priority */}
          <div>
            <Dropdown
              label="Priority"
              value={formData.priority}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
              onChange={handlePriorityChange}
              placeholder="Select priority"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide detailed information about your issue..."
            rows={6}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.description
                ? 'border-red-500 bg-red-50/40 focus:ring-red-500/40 focus:border-red-500'
                : 'border-slate-300 focus:ring-blue-500'
            }`}
          />
          {errors.description ? (
            <p className="text-xs text-red-600 mt-1">{errors.description}</p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">Minimum 20 characters</p>
          )}
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Attachments (Optional)
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 mb-2">Drag and drop files here, or</p>
            <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
              click to browse
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </label>
            <p className="text-xs text-slate-500 mt-2">Max 5 files, 10MB each</p>
          </div>

          {/* Attached Files */}
          {formData.attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-slate-700">Attached Files:</h4>
              <ul className="space-y-1">
                {formData.attachments.map((file, index) => (
                  <li key={index} className="flex items-center justify-between text-sm text-slate-600 bg-slate-50 p-2 rounded">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
          <Link
            href="/vendor/dashboard/support"
            className="flex items-center justify-center px-6 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">Response Time:</span> We typically respond to tickets within 24-48 hours. For urgent issues, please mark as "Urgent" priority.
        </p>
      </div>

      <ResultModal
        show={uploadResult.show}
        type={uploadResult.type}
        text={uploadResult.text}
        onClose={() => setUploadResult(prev => ({ ...prev, show: false }))}
      />
    </div>
  )
}
