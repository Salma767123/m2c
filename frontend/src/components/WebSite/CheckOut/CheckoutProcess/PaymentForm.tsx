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
        <label className="block text-sm font-medium text-slate-700 mb-4">Payment Method</label>
        <div className="grid grid-cols-1 gap-4">
          {availablePaymentMethods.map((method) => {
            const Icon = method.icon
            return (
              <label
                key={method.id}
                className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all"
                style={{
                  borderColor: formData.paymentMethod === method.id ? "#374151" : "#cbd5e1",
                  backgroundColor: formData.paymentMethod === method.id ? "#f3f4f6" : "#ffffff"
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={formData.paymentMethod === method.id}
                  onChange={(e) => updateFormData("paymentMethod", e.target.value as any)}
                  className="mr-3"
                />
                <Icon className="w-5 h-5 mr-3 text-slate-600" />
                <div className="flex-1">
                  <span className="font-medium text-slate-900">{method.name}</span>
                  <p className="text-xs text-slate-600">{method.description}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Razorpay Payment Info */}
      {formData.paymentMethod === "razorpay" && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Razorpay Payment</h4>
          <p className="text-sm text-blue-700">
            You will be redirected to Razorpay's secure payment gateway to complete your payment using cards, UPI, net banking, or wallets.
          </p>
        </div>
      )}

      {/* PayU Payment Info */}
      {formData.paymentMethod === "payu" && (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h4 className="font-medium text-purple-900 mb-2">PayU Payment</h4>
          <p className="text-sm text-purple-700">
            You will be redirected to PayU's secure payment gateway to complete your payment using cards, UPI, net banking, or wallets.
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
