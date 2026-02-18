"use client"

import { CheckoutFormData } from "../Checkout"

interface ShippingFormProps {
  formData: CheckoutFormData
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void
}

export default function ShippingForm({ formData, updateFormData }: ShippingFormProps) {
  // Check if form has been pre-filled
  const isPreFilled = formData.firstName || formData.email || formData.address
  
  return (
    <div className="space-y-6">
      {isPreFilled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium">Address auto-filled from your profile</p>
            <p className="text-blue-600 mt-0.5">You can edit any field if needed</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => updateFormData("firstName", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => updateFormData("lastName", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData("email", e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          placeholder="john.doe@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => updateFormData("phone", e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => updateFormData("address", e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          placeholder="123 Main Street"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateFormData("city", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="New York"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
          <select
            value={formData.state}
            onChange={(e) => updateFormData("state", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          >
            <option value="">Select State</option>
            <option value="NY">New York</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
          <input
            type="text"
            value={formData.zipCode}
            onChange={(e) => updateFormData("zipCode", e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="10001"
          />
        </div>
      </div>


    </div>
  )
}
