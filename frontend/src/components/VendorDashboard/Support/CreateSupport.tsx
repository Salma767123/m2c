'use client'

import { useState } from 'react'
import { ArrowLeft, Send, Paperclip } from 'lucide-react'
import Link from 'next/link'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import Dropdown from '@/components/UI/Dropdown'

export default function CreateSupport() {
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    description: '',
    attachments: [] as File[]
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files].slice(0, 5) // Max 5 files
    }))
  }

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Reset form
      setFormData({
        subject: '',
        category: 'technical',
        priority: 'medium',
        description: '',
        attachments: []
      })
      
      showSuccessToast('Ticket Created!', 'Your support ticket has been submitted successfully.')
    } catch (error) {
      showErrorToast('Submission Failed', 'Failed to create ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-420 mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/vendor/dashboard/support" className="text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Support Ticket</h1>
          <p className="text-gray-600 mt-1">Report an issue and get help from our support team</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Subject */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="Brief description of your issue"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
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
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide detailed information about your issue..."
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Attachments (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Drag and drop files here, or</p>
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
            <p className="text-xs text-gray-500 mt-2">Max 5 files, 10MB each</p>
          </div>

          {/* Attached Files */}
          {formData.attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Attached Files:</h4>
              <ul className="space-y-1">
                {formData.attachments.map((file, index) => (
                  <li key={index} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded">
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
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
          <Link
            href="/vendor/dashboard/support"
            className="flex items-center justify-center px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
    </div>
  )
}
