"use client"

import { useState } from 'react'
import { CreditCard, Plus, Trash2, Edit, Shield, Check } from 'lucide-react'

interface PaymentMethod {
  id: string
  type: 'visa' | 'mastercard' | 'amex' | 'discover' | 'upi'
  last4?: string
  expiryMonth?: string
  expiryYear?: string
  holderName: string
  upiId?: string
  isDefault: boolean
  billingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

export default function PaymentMethods() {
  const [showAddCard, setShowAddCard] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'visa',
      last4: '4242',
      expiryMonth: '12',
      expiryYear: '2025',
      holderName: 'John Doe',
      isDefault: true,
      billingAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'United States'
      }
    },
    {
      id: '2',
      type: 'mastercard',
      last4: '8888',
      expiryMonth: '08',
      expiryYear: '2026',
      holderName: 'John Doe',
      isDefault: false,
      billingAddress: {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'United States'
      }
    },
    {
      id: '3',
      type: 'upi',
      holderName: 'John Doe',
      upiId: 'johndoe@upi',
      isDefault: false
    }
  ])

  const [newCard, setNewCard] = useState({
    paymentType: 'card',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: '',
    upiId: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  })

  const getCardIcon = (type: string) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      upi: '📱'
    }
    return icons[type as keyof typeof icons] || '💳'
  }

  const getCardBrand = (type: string) => {
    const brands = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      upi: 'UPI'
    }
    return brands[type as keyof typeof brands] || 'Payment Method'
  }

  const setAsDefault = (cardId: string) => {
    setPaymentMethods(methods =>
      methods.map(method => ({
        ...method,
        isDefault: method.id === cardId
      }))
    )
  }

  const removeCard = (cardId: string) => {
    setPaymentMethods(methods => methods.filter(method => method.id !== cardId))
  }

  const handleAddCard = () => {
    // Validate and add new payment method
    const methodId = Date.now().toString()
    
    let newPaymentMethod: PaymentMethod
    
    if (newCard.paymentType === 'upi') {
      newPaymentMethod = {
        id: methodId,
        type: 'upi',
        holderName: newCard.holderName,
        upiId: newCard.upiId,
        isDefault: paymentMethods.length === 0
      }
    } else {
      const cardType = 'visa' // This would be determined from card number
      newPaymentMethod = {
        id: methodId,
        type: cardType,
        last4: newCard.cardNumber.slice(-4),
        expiryMonth: newCard.expiryMonth,
        expiryYear: newCard.expiryYear,
        holderName: newCard.holderName,
        isDefault: paymentMethods.length === 0,
        billingAddress: {
          street: newCard.street,
          city: newCard.city,
          state: newCard.state,
          zipCode: newCard.zipCode,
          country: newCard.country
        }
      }
    }

    setPaymentMethods([...paymentMethods, newPaymentMethod])
    setNewCard({
      paymentType: 'card',
      cardNumber: '',
      expiryMonth: '',
      expiryYear: '',
      cvv: '',
      holderName: '',
      upiId: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    })
    setShowAddCard(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Payment Methods</h2>
        </div>
        <button
          onClick={() => setShowAddCard(true)}
          className="flex items-center gap-2 bg-gray-600 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Payment Method</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Existing Payment Methods */}
      <div className="space-y-4 mb-6">
        {paymentMethods.map((method) => (
          <div key={method.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center text-lg">
                  {getCardIcon(method.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">
                      {method.type === 'upi' ? `${getCardBrand(method.type)} - ${method.upiId}` : `${getCardBrand(method.type)} •••• ${method.last4}`}
                    </h3>
                    {method.isDefault && (
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{method.holderName}</p>
                  {method.expiryMonth && method.expiryYear && (
                    <p className="text-sm text-slate-600">Expires {method.expiryMonth}/{method.expiryYear}</p>
                  )}
                  {method.billingAddress && (
                    <p className="text-xs text-slate-500 mt-1">
                      {method.billingAddress.street}, {method.billingAddress.city}, {method.billingAddress.state} {method.billingAddress.zipCode}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <button
                    onClick={() => setAsDefault(method.id)}
                    className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Set as Default
                  </button>
                )}
                <button className="p-2 text-slate-400 hover:text-gray-600 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeCard(method.id)}
                  className="p-2 text-slate-400 hover:text-gray-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Card Form */}
      {showAddCard && (
        <div className="border border-slate-200 rounded-lg p-4 sm:p-5 lg:p-6 bg-slate-50">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Add New Payment Method</h3>
          
          {/* Payment Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Payment Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  value="card"
                  checked={newCard.paymentType === 'card'}
                  onChange={(e) => setNewCard({ ...newCard, paymentType: e.target.value })}
                  className="text-gray-600"
                />
                <span className="text-slate-700">Credit/Debit Card</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  value="upi"
                  checked={newCard.paymentType === 'upi'}
                  onChange={(e) => setNewCard({ ...newCard, paymentType: e.target.value })}
                  className="text-gray-600"
                />
                <span className="text-slate-700">UPI</span>
              </label>
            </div>
          </div>

          {newCard.paymentType === 'card' ? (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Card Number</label>
              <input
                type="text"
                value={newCard.cardNumber}
                onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Month</label>
              <select
                value={newCard.expiryMonth}
                onChange={(e) => setNewCard({ ...newCard, expiryMonth: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              >
                <option value="">Month</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Year</label>
              <select
                value={newCard.expiryYear}
                onChange={(e) => setNewCard({ ...newCard, expiryYear: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              >
                <option value="">Year</option>
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={String(new Date().getFullYear() + i)}>
                    {new Date().getFullYear() + i}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">CVV</label>
              <input
                type="text"
                value={newCard.cvv}
                onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                placeholder="123"
                maxLength={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cardholder Name</label>
              <input
                type="text"
                value={newCard.holderName}
                onChange={(e) => setNewCard({ ...newCard, holderName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            </div>
            </>
          ) : (
            <>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">UPI ID</label>
                <input
                  type="text"
                  value={newCard.upiId}
                  onChange={(e) => setNewCard({ ...newCard, upiId: e.target.value })}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Account Holder Name</label>
                <input
                  type="text"
                  value={newCard.holderName}
                  onChange={(e) => setNewCard({ ...newCard, holderName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
            </div>
            </>
          )}

          {/* Billing Address - Only for Card */}
          {newCard.paymentType === 'card' && (
            <>
          <h4 className="text-md font-semibold text-slate-900 mb-3">Billing Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Street Address</label>
              <input
                type="text"
                value={newCard.street}
                onChange={(e) => setNewCard({ ...newCard, street: e.target.value })}
                placeholder="123 Main Street"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
              <input
                type="text"
                value={newCard.city}
                onChange={(e) => setNewCard({ ...newCard, city: e.target.value })}
                placeholder="New York"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
              <input
                type="text"
                value={newCard.state}
                onChange={(e) => setNewCard({ ...newCard, state: e.target.value })}
                placeholder="NY"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code</label>
              <input
                type="text"
                value={newCard.zipCode}
                onChange={(e) => setNewCard({ ...newCard, zipCode: e.target.value })}
                placeholder="10001"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAddCard}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Add Payment Method
            </button>
            <button
              onClick={() => setShowAddCard(false)}
              className="bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <h4 className="font-medium text-green-900">Secure Payment Processing</h4>
            <p className="text-sm text-green-700">Your payment information is encrypted and secure. We never store your full card details.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
