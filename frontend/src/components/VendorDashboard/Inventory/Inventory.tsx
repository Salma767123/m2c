'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table'
import { Package, AlertTriangle, TrendingDown, TrendingUp, Plus, Search, Edit, Trash2, History, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'
import inventoryService, { InventoryItem as APIInventoryItem, InventoryStats } from '@/services/inventoryService'
import StockHistoryModal from '@/components/Shared/StockHistoryModal'
import { showWarningToast, showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'

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

const pill = 'px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap'

const getStatusBadge = (status: string, currentStock: number, lowStockAlert: number) => {
  if (currentStock === 0) {
    return <span className={`${pill} bg-red-50 text-red-700 border-red-200`}>Out of Stock</span>
  }
  if (currentStock <= lowStockAlert) {
    return <span className={`${pill} bg-yellow-50 text-yellow-700 border-yellow-200`}>Low Stock</span>
  }
  return <span className={`${pill} bg-green-50 text-green-700 border-green-200`}>In Stock</span>
}

const getApprovalBadge = (item: APIInventoryItem) => {
  if (!item.hasProductCreated) return <span className={`${pill} bg-slate-50 text-slate-600 border-slate-200`}>No Product</span>
  switch (item.productApprovalStatus) {
    case 'APPROVED': return <span className={`${pill} bg-green-50 text-green-700 border-green-200`}>Approved</span>
    case 'PENDING': return <span className={`${pill} bg-yellow-50 text-yellow-700 border-yellow-200`}>Pending Approval</span>
    case 'QC_APPROVED': return <span className={`${pill} bg-brand-50 text-brand-600 border-brand-200`}>QC Approved</span>
    case 'REJECTED': return <span className={`${pill} bg-red-50 text-red-700 border-red-200`}>Rejected</span>
    case 'REINSPECTION': return <span className={`${pill} bg-orange-50 text-orange-700 border-orange-200`}>Reinspection</span>
    default: return <span className={`${pill} bg-slate-50 text-slate-600 border-slate-200`}>Unknown</span>
  }
}

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState<APIInventoryItem[]>([])
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null)
  const [vendorCategories, setVendorCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean
    item: APIInventoryItem | null
    loading: boolean
  }>({ show: false, item: null, loading: false })

  // Stock history modal state
  const [stockHistoryModal, setStockHistoryModal] = useState<{
    isOpen: boolean
    item: APIInventoryItem | null
  }>({ isOpen: false, item: null })

  // View details modal state
  const [viewItem, setViewItem] = useState<APIInventoryItem | null>(null)

  // Calculate stats
  const totalItems = inventoryStats?.totalItems || 0
  const lowStockItems = inventoryStats?.lowStockItems || 0
  const outOfStockItems = inventoryStats?.outOfStockItems || 0
  const totalValue = inventoryStats?.totalStockUnits || 0

  // Get categories for filter (vendor categories + 'all')
  const categories = ['all', ...vendorCategories]

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Check if vendor is logged in
        if (typeof window === 'undefined') return;

        const vendorToken = localStorage.getItem('vendorToken')
        if (!vendorToken) {
          console.log('No vendor token found, redirecting to login')
          window.location.href = '/vendor'
          return
        }

        // Load vendor categories and stats in parallel
        const [categoriesData, statsData] = await Promise.all([
          inventoryService.getVendorCategories(),
          inventoryService.getStats()
        ])

        setVendorCategories(categoriesData.categories.map(cat => cat.name))
        setInventoryStats(statsData)

        // Load inventory items
        await loadInventoryItems()

      } catch (error: any) {
        console.error('Error loading data:', error)
        if (error.response?.status === 401) {
          showErrorToast('Authentication Required', 'Please login again.')
          window.location.href = '/vendor'
        } else {
          showErrorToast('Load Failed', 'Failed to load inventory data')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Load inventory items with current filters
  const loadInventoryItems = async () => {
    try {
      const filters = {
        page: currentPage,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      }

      const data = await inventoryService.getItems(filters)
      setInventoryItems(data.items)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error('Error loading inventory items:', error)
    }
  }

  // Reload items when filters change
  useEffect(() => {
    if (!isLoading) {
      loadInventoryItems()
    }
  }, [searchTerm, statusFilter, categoryFilter, currentPage])

  const handleRestock = (item: APIInventoryItem) => {
    // Navigate to separate stock update page
    window.location.href = `/vendor/dashboard/inventory/update-stock/${item.id}`
  }

  const handleViewHistory = (item: APIInventoryItem) => {
    setStockHistoryModal({ isOpen: true, item })
  }

  const handleEdit = (itemId: string) => {
    console.log('Editing item:', itemId)
    // Navigation is handled by the Link component
  }

  const handleDelete = (item: APIInventoryItem) => {
    setDeleteModal({ show: true, item, loading: false })
  }

  const confirmDelete = async () => {
    if (!deleteModal.item) return
    setDeleteModal(prev => ({ ...prev, loading: true }))
    try {
      await inventoryService.deleteItem(deleteModal.item.id)
      showSuccessToast('Item Deleted', 'Inventory item deleted successfully')
      loadInventoryItems()
    } catch (error: any) {
      console.error('Error deleting item:', error)
      if (error.response?.status === 400) {
        showErrorToast('Delete Failed', error.response.data.message || 'Cannot delete this item')
      } else {
        showErrorToast('Delete Failed', 'Failed to delete item')
      }
    } finally {
      setDeleteModal({ show: false, item: null, loading: false })
    }
  }

  const handleCreateProduct = (item: APIInventoryItem) => {
    // Navigate to product creation with inventory pre-selected
    window.location.href = `/vendor/dashboard/products/add?inventoryId=${item.id}`
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Inventory Management</h1>
            <p className="text-slate-600">Loading your inventory...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center jusbnmtify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <span className="ml-3 text-slate-600">Loading inventory data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Inventory Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your product inventory and stock levels</p>
          </div>
          <Link href="/vendor/dashboard/inventory/add">
            <Button className="bg-brand-500 text-white hover:bg-brand-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Items</span>
            <div className="p-1.5 bg-brand-50 rounded-lg"><Package className="h-4 w-4 text-brand-600" /></div>
          </div>
          <p className="text-xl font-bold text-slate-900">{totalItems}</p>
          <p className="text-xs text-slate-500 mt-0.5">Unique products</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Low Stock</span>
            <div className="p-1.5 bg-yellow-50 rounded-lg"><AlertTriangle className="h-4 w-4 text-yellow-600" /></div>
          </div>
          <p className={`text-xl font-bold ${lowStockItems > 0 ? 'text-yellow-600' : 'text-slate-900'}`}>{lowStockItems}</p>
          <p className="text-xs text-slate-500 mt-0.5">Need restocking</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Out of Stock</span>
            <div className="p-1.5 bg-red-50 rounded-lg"><TrendingDown className="h-4 w-4 text-red-600" /></div>
          </div>
          <p className={`text-xl font-bold ${outOfStockItems > 0 ? 'text-red-600' : 'text-slate-900'}`}>{outOfStockItems}</p>
          <p className="text-xs text-slate-500 mt-0.5">Urgent attention</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Stock</span>
            <div className="p-1.5 bg-green-50 rounded-lg"><TrendingUp className="h-4 w-4 text-green-600" /></div>
          </div>
          <p className="text-xl font-bold text-slate-900">{totalValue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total units</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <Dropdown
              id="statusFilter"
              value={statusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' }
              ]}
              onChange={(value) => setStatusFilter(value as 'all' | 'ACTIVE' | 'INACTIVE')}
            />
            <Dropdown
              id="categoryFilter"
              value={categoryFilter}
              options={categories.map(cat => ({
                value: cat,
                label: cat === 'all' ? 'All Categories' : cat
              }))}
              onChange={(value) => setCategoryFilter(value as string)}
            />
          </div>
        </div>
      </div>

      {/* Results summary */}
      {inventoryItems.length > 0 && (
        <p className="text-sm text-slate-500">
          Showing {inventoryItems.length} item{inventoryItems.length === 1 ? '' : 's'}
        </p>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200/80">
          <h2 className="text-sm font-semibold text-slate-900">Inventory Items</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="!bg-slate-50/80 !border-slate-200/80 [&_tr]:border-b [&_tr]:border-slate-200/80 [&_th]:!text-slate-500 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
              <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product Status</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Base Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Restocked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventoryItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="text-slate-500">
                      <p className="text-lg font-medium">No inventory items found</p>
                      <p className="text-sm">Try adjusting your search or filter criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventoryItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-sm text-slate-500">
                          {item.category}{item.subcategory ? ` > ${item.subcategory}` : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{item.sku}</TableCell>
                    <TableCell>
                      {getApprovalBadge(item)}
                    </TableCell>
                    <TableCell>
                      <span className={item.currentStock <= item.lowStockAlert ? 'text-red-600 font-bold' : 'text-slate-900 font-semibold'}>
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-900 font-medium">
                        {item.baseStock || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.lowStockAlert}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status, item.currentStock, item.lowStockAlert)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewItem(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (item.hasProductCreated && item.productApprovalStatus === 'APPROVED') {
                              handleRestock(item)
                            } else if (!item.hasProductCreated) {
                              showWarningToast('Stock Update Not Available', 'Create a product first before updating stock.')
                            } else {
                              showWarningToast('Stock Update Not Available', `Product approval status: ${item.productApprovalStatus}. Stock can only be updated after admin approval.`)
                            }
                          }}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                            item.hasProductCreated && item.productApprovalStatus === 'APPROVED'
                              ? 'border-brand-200 text-brand-600 hover:bg-brand-50'
                              : 'border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          Update Stock
                        </button>
                        <button
                          onClick={() => handleViewHistory(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Stock History"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        {item.hasProductCreated && item.productApprovalStatus === 'APPROVED' ? (
                          <button
                            onClick={() => showWarningToast('Edit Restricted', 'This product has been approved. Only admin can edit the inventory.')}
                            className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed"
                            title="Approved — admin only"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        ) : (
                          <Link href={`/vendor/dashboard/inventory/edit/${item.id}`}>
                            <span className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors inline-flex" title="Edit">
                              <Edit className="h-4 w-4" />
                            </span>
                          </Link>
                        )}
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={item.hasProductCreated}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.hasProductCreated
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={item.hasProductCreated ? 'Has linked product' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock History Modal */}
      {stockHistoryModal.item && (
        <StockHistoryModal
          isOpen={stockHistoryModal.isOpen}
          onClose={() => setStockHistoryModal({ isOpen: false, item: null })}
          inventoryId={stockHistoryModal.item.id}
          itemName={stockHistoryModal.item.name}
          itemSku={stockHistoryModal.item.sku}
          isAdmin={false}
        />
      )}

      <DeleteConfirmModal
        show={deleteModal.show}
        title="Delete Inventory Item"
        itemName={deleteModal.item?.name}
        itemDetail={deleteModal.item?.sku ? `SKU: ${deleteModal.item.sku}` : undefined}
        loading={deleteModal.loading}
        confirmLabel="Delete Permanently"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ show: false, item: null, loading: false })}
      />

      {/* View Details Modal */}
      {viewItem && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          style={{ zIndex: 'var(--z-modal-backdrop)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-view-title"
          onClick={() => setViewItem(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full animate-in zoom-in-95 fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-brand-500 rounded-t-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Package className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 id="inventory-view-title" className="text-base font-bold text-white truncate">{viewItem.name}</h3>
                  <p className="text-xs text-white/80 truncate">{viewItem.category}{viewItem.subcategory ? ` > ${viewItem.subcategory}` : ''}</p>
                </div>
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getApprovalBadge(viewItem)}
                {getStatusBadge(viewItem.status, viewItem.currentStock, viewItem.lowStockAlert)}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">SKU</p>
                  <p className="font-mono text-slate-800 mt-0.5">{viewItem.sku}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Last Restocked</p>
                  <p className="text-slate-800 mt-0.5">{viewItem.lastRestocked ? new Date(viewItem.lastRestocked).toLocaleDateString() : 'Never'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Current Stock</p>
                  <p className={`font-semibold mt-0.5 ${viewItem.currentStock <= viewItem.lowStockAlert ? 'text-red-600' : 'text-slate-900'}`}>{viewItem.currentStock}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Base Stock</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewItem.baseStock || 0}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Min Stock</p>
                  <p className="text-slate-800 mt-0.5">{viewItem.lowStockAlert}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Category</p>
                  <p className="text-slate-800 mt-0.5">{viewItem.category}{viewItem.subcategory ? ` > ${viewItem.subcategory}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button
                onClick={() => setViewItem(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { handleViewHistory(viewItem); setViewItem(null); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors inline-flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                Stock History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}