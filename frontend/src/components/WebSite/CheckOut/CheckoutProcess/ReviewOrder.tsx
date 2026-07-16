"use client"

import { Calendar } from "lucide-react"
import { CheckoutFormData } from "../Checkout"
import { getCountryName, getCountryFlag, getStateName, formatPhoneForDisplay } from "./constants"
import Reveal from "@/components/WebSite/Shared/Reveal"

interface ReviewOrderProps {
  formData: CheckoutFormData
}

export default function ReviewOrder({ formData }: ReviewOrderProps) {
  return (
    <div className="space-y-6">
      <Reveal className="bg-slate-50 rounded-2xl ring-1 ring-black/5 p-6">
        <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] mb-4">Shipping Information</h3>
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-semibold text-gray-900 border-b border-gray-100 pb-1 mb-2">
            {[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" ")}
          </p>
          <div className="space-y-0.5">
            <p>{formData.address}</p>
            {formData.addressLine2 && <p>{formData.addressLine2}</p>}
            {formData.addressLine3 && <p>{formData.addressLine3}</p>}
            {formData.landmark && <p className="text-slate-500">Landmark: {formData.landmark}</p>}
            <p>{formData.city}, {getStateName(formData.state, formData.country)} {formData.zipCode}</p>
            <p className="flex items-center gap-1.5 mt-1 text-slate-500 font-medium italic">
              Shipping to: {getCountryName(formData.country)} {getCountryFlag(formData.country)}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs uppercase tracking-wider text-slate-400">
            <div>
              <p className="font-bold text-slate-500 mb-0.5">Email</p>
              <p className="normal-case tracking-normal text-slate-600 font-medium">{formData.email}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 mb-0.5">Phone</p>
              <p className="normal-case tracking-normal text-slate-600 font-medium">{formatPhoneForDisplay(formData.phone, formData.country)}</p>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={90} className="bg-slate-50 rounded-2xl ring-1 ring-black/5 p-6">
        <h3 className="font-playfair text-lg font-semibold text-[#1a1a1a] mb-4">Payment Method</h3>
        <div className="text-sm text-slate-600">
          {formData.paymentMethod === "razorpay" && (
            <>
              <p className="font-medium">Razorpay</p>
              <p>Pay securely via Razorpay</p>
            </>
          )}
          {formData.paymentMethod === "payu" && (
            <>
              <p className="font-medium">PayU</p>
              <p>Pay securely via PayU</p>
            </>
          )}
        </div>
      </Reveal>

      <Reveal delay={180} className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">Estimated Delivery</h4>
            <p className="text-sm text-blue-700">
              5-7 business days
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
