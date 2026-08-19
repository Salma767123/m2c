"use client"

import { Shield, CreditCard, Wallet } from "lucide-react"
import { CheckoutFormData } from "../Checkout"
import { PublicPaymentSettings } from "@/services/paymentSettingsService"

interface PaymentFormProps {
  formData: CheckoutFormData
  updateFormData: (field: keyof CheckoutFormData, value: string | boolean) => void
  paymentSettings: PublicPaymentSettings | null
}

export default function PaymentForm({ formData, updateFormData, paymentSettings }: PaymentFormProps) {
  // Determine available payment methods
  const availablePaymentMethods = []
  
  if (paymentSettings?.razorpayEnabled) {
    availablePaymentMethods.push({
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Cards, UPI, Wallets',
      icon: CreditCard
    })
  }
  
  if (paymentSettings?.payuEnabled) {
    availablePaymentMethods.push({
      id: 'payu',
      name: 'PayU',
      description: 'Cards, UPI, Wallets',
      icon: Wallet
    })
  }
  
  // Show error if no payment gateway is available
  if (availablePaymentMethods.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <h4 className="font-medium text-red-900 mb-2">No Payment Gateway Available</h4>
          <p className="text-sm text-red-700">
            Payment gateway is not configured. Please contact support to complete your order.
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-medium text-[#4a423c] mb-4">Payment Method</label>
        <div className="grid grid-cols-1 gap-4">
          {availablePaymentMethods.map((method) => {
            const Icon = method.icon
            return (
              <label
                key={method.id}
                className="flex items-center p-4 border-2 rounded-2xl cursor-pointer transition-all"
                style={{
                  borderColor: formData.paymentMethod === method.id ? "#e01a1b" : "#cbd5e1",
                  backgroundColor: formData.paymentMethod === method.id ? "#fef2f2" : "#ffffff"
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={formData.paymentMethod === method.id}
                  onChange={(e) => updateFormData("paymentMethod", e.target.value)}
                  className="mr-3 accent-[#e01a1b]"
                />
                <Icon className="w-5 h-5 mr-3 text-[#6b625b]" />
                <div className="flex-1">
                  <span className="font-semibold text-[#1a1a1a]">{method.name}</span>
                  <p className="text-xs text-[#6b625b]">{method.description}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Razorpay Payment Info */}
      {formData.paymentMethod === "razorpay" && (
        <div className="rounded-xl border-l-2 border-[#e01a1b] bg-[#fdf6f4] p-4 ring-1 ring-[#f4e2de]">
          <h4 className="mb-2 font-semibold text-[#1a1a1a]">Razorpay Payment</h4>
          <p className="text-sm text-[#5a524b]">
            You will be redirected to Razorpay&apos;s secure payment gateway to complete your payment using cards, UPI, net banking, or wallets.
          </p>
        </div>
      )}

      {/* PayU Payment Info */}
      {formData.paymentMethod === "payu" && (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h4 className="font-medium text-purple-900 mb-2">PayU Payment</h4>
          <p className="text-sm text-purple-700">
            You will be redirected to PayU&apos;s secure payment gateway to complete your payment using cards, UPI, net banking, or wallets.
          </p>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <h4 className="font-medium text-green-900">Secure Payment</h4>
            <p className="text-sm text-green-700">
              Your payment information is encrypted and secure
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
