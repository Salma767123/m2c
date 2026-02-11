'use client'

import { useState } from 'react'
import { X, Package, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/UI/Button'
import { toast } from '@/hooks/use-toast'

interface StockUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newStock: number, reason: string, notes?: string) => Promise<void>
  currentStock: number
  itemName: string
  itemSku: string
  isLoading?: boolean
}

export default function StockUpdateModal({
  isOpen,
  onClose,
  onConfirm,
  currentStock,
  itemName,
  itemSku,
  isLoading = false
}: StockUpdateModalProps) {
  const [newStock, setNewStock] = useState(currentStock.toString())
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ newStock?: string; reason?: string }>({})

  if (!isOpen) return null

  const stockDifference = parseInt(newStock || '0') - currentStock
  const isIncrease = stockDifference > 0
  const isDecrease = stockDifference < 0

  const validate = () => {
    const newErrors: { newStock?: string; reason?: string } = {}

    if (!newStock || newStock.trim() === '') {
      newErrors.newStock = 'Stock quantity is required'
    } else if (parseInt(newStock) < 0) {
      newErrors.newStock = 'Stock cannot be negative'
    } else if (isNaN(parseInt(newStock))) {
      newErrors.newStock = 'Please enter a valid number'
    }

    if (!reason || reason.trim() === '') {
      newErrors.reason = 'Reason is required'
    } else if (reason.trim().length < 5) {
      newErrors.reason = 'Reason must be at least 5 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      await onConfirm(parseInt(newStock), reason.trim(), notes.trim() || undefined)
      
      // Reset form
      setNewStock(currentStock.toString())
      setReason('')
      setNotes('')
      setErrors({})
      
      toast({
        title: 'Success',
        description: 'Stock updated successfully'
      })
      
      onClose()
    } catch (error) {
      console.error('Error updating stock:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update stock',
        variant: 'destructive'
      })
    }
  }

  const handleClose = () => {
    setNewStock(currentStock.toString())
    setReason('')
    setNotes('')
    setErrors({})
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Update Stock</h2>
              <p className="text-sm text-gray-600">{itemName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Stock Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">SKU:</span>
              <span className="font-medium text-gray-900">{itemSku}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Stock:</span>
              <span className="font-bold text-gray-900">{currentStock} units</span>
            </div>
          </div>

          {/* New Stock Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Stock Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={newStock}
              onChange={(e) => {
                setNewStock(e.target.value)
                setErrors({ ...errors, newStock: undefined })
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.newStock ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter new stock quantity"
              min="0"
              disabled={isLoading}
            />
            {errors.newStock && (
              <p className="mt-1 text-sm text-red-600">{errors.newStock}</p>
            )}
          </div>

          {/* Stock Change Indicator */}
          {stockDifference !== 0 && !isNaN(stockDifference) && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              isIncrease ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {isIncrease ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <span className="font-medium">
                {isIncrease ? '+' : ''}{stockDifference} units
              </span>
              <span className="text-sm">
                ({isIncrease ? 'Increase' : 'Decrease'})
              </span>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Change <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setErrors({ ...errors, reason: undefined })
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.reason ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., New shipment received, Damaged items removed, Inventory correction"
              rows={3}
              disabled={isLoading}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Minimum 5 characters required
            </p>
          </div>

          {/* Additional Notes (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Any additional information..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Stock'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
