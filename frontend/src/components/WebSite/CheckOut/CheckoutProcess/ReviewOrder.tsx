"use client"

import { Calendar } from "lucide-react"
import { CheckoutFormData } from "../Checkout"

interface ReviewOrderProps {
  formData: CheckoutFormData
}

export default function ReviewOrder({ formData }: ReviewOrderProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Shipping Information</h3>
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-medium text-gray-900">{formData.firstName} {formData.lastName}</p>
          <p>{formData.address}</p>
          <p>{formData.city}, {formData.state} {formData.zipCode}</p>
          <p>{formData.country}</p>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p>{formData.email}</p>
            <p>{formData.phone}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Payment Method</h3>
        <div className="text-sm text-slate-600">
          {formData.paymentMethod === "card" && (
            <>
              <p className="font-medium">Credit/Debit Card</p>
              <p>**** **** **** {formData.cardNumber.slice(-4) || "xxxx"}</p>
              <p>{formData.cardName}</p>
            </>
          )}
          {formData.paymentMethod === "upi" && (
            <>
              <p className="font-medium">UPI</p>
              <p>{formData.upiId || "No ID provided"}</p>
            </>
          )}
          {formData.paymentMethod === "COD" && (
            <>
              <p className="font-medium">Cash on Delivery</p>
              <p>Pay upon receipt</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">Estimated Delivery</h4>
            <p className="text-sm text-blue-700">
              5-7 business days
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
