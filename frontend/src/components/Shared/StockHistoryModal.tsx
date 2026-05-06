'use client'

import { useState, useEffect } from 'react'
import { X, History, TrendingUp, TrendingDown, User, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/UI/Button'
import { LoadingSpinner } from '@/components/UI/LoadingSpinner'
import inventoryService, { StockChangeHistory } from '@/services/inventoryService'
import { toast } from '@/hooks/use-toast'

interface StockHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  inventoryId: string
  itemName: string
  itemSku: string
  isAdmin?: boolean
}

function getPageRange(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 4) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 3) pages.push('…');
  pages.push(total);
  return pages;
}

export default function StockHistoryModal({
  isOpen,
  onClose,
  inventoryId,
  itemName,
  itemSku,
  isAdmin = false
}: StockHistoryModalProps) {
  const [history, setHistory] = useState<StockChangeHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (isOpen && inventoryId) {
      fetchHistory()
    }
  }, [isOpen, inventoryId, currentPage])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = isAdmin
        ? await inventoryService.adminGetStockHistory(inventoryId, currentPage, 20)
        : await inventoryService.getStockHistory(inventoryId, currentPage, 20)
      
      setHistory(response.history)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error('Error fetching stock history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load stock history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <History className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Stock Change History</h2>
              <p className="text-sm text-gray-600">{itemName} ({itemSku})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No stock changes recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => {
                const isIncrease = record.changeAmount > 0
                const isDecrease = record.changeAmount < 0

                return (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isIncrease ? 'bg-green-100' : isDecrease ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {isIncrease ? (
                            <TrendingUp className={`h-5 w-5 ${
                              isIncrease ? 'text-green-600' : 'text-gray-600'
                            }`} />
                          ) : (
                            <TrendingDown className={`h-5 w-5 ${
                              isDecrease ? 'text-red-600' : 'text-gray-600'
                            }`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">
                              {record.previousStock} → {record.newStock} units
                            </span>
                            <span className={`text-sm font-medium ${
                              isIncrease ? 'text-green-600' : isDecrease ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              ({isIncrease ? '+' : ''}{record.changeAmount})
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(record.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                        <p className="text-sm text-gray-900">{record.reason}</p>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          Changed by: <span className="font-medium text-gray-900">
                            {record.changedByName || 'Unknown'}
                          </span>
                          <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded">
                            {record.changedByType}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 p-4 flex items-center justify-end gap-3 text-sm">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || loading} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || loading} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
