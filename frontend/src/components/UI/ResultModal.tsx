'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/UI/Button'

interface ResultModalProps {
  show: boolean
  type: 'success' | 'error'
  title?: string
  text: string
  onClose: () => void
  confirmLabel?: string
}

export default function ResultModal({
  show,
  type,
  title,
  text,
  onClose,
  confirmLabel = 'OK',
}: ResultModalProps) {
  if (!show) return null

  const isSuccess = type === 'success'
  const heading = title || (isSuccess ? 'Success' : 'Failed')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 text-center">
        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
          isSuccess ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {isSuccess ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-600" />
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mt-4">{heading}</h3>
        <p className="text-sm text-slate-600 mt-1">{text}</p>
        <Button
          type="button"
          onClick={onClose}
          className={`mt-5 w-full text-white ${
            isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}
