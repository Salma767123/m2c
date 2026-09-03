'use client'

import { useState, useEffect, Fragment } from 'react'
import { Card, CardContent } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/Table'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'
import { Package, AlertTriangle, TrendingDown, TrendingUp, Plus, Search, Filter, Loader2, History, Edit, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar'
import axiosInstance from '@/lib/axios'
import inventoryService from '@/services/inventoryService'
import { hasPermission } from '@/lib/auth'
import StockHistoryModal from '@/components/Shared/StockHistoryModal'

interface InventoryVariant {
  id: string
  variantName?: string | null
  size?: string | null
  color?: string | null
  sku: string
  stock: number
  lowStockThreshold?: number | null
  effectiveThreshold: number
}

interface InventoryItem {
  id: string
  name: string
  sku: string
  category: string
  subcategory?: string
  currentStock: number
  lowStockAlert: number
  status: string
  lastRestocked: string | null
  vendor: {
    id: string
    companyName: string
    email: string
  }
  createdAt: string
  updatedAt: string
  hasProductCreated: boolean
  productApprovalStatus?: 'PENDING' | 'QC_SUBMITTED' | 'QC_APPROVED' | 'APPROVED' | 'REJECTED' | 'REINSPECTION' | 'NEGOTIATION' | null
  hasVariants?: boolean
  variants?: InventoryVariant[]
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

const getStatusBadge = (currentStock: number, lowStockAlert: number) => {
  if (currentStock === 0) {
    return <Badge className="bg-red-50 text-red-700 border border-red-200">Out of Stock</Badge>
  }
  if (currentStock <= lowStockAlert) {
    return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Low Stock</Badge>
  }
  return <Badge className="bg-green-50 text-green-700 border border-green-200">In Stock</Badge>
}

// Stock level for a single stock/min pair.
type StockLevel = 'out' | 'low' | 'in'
const levelOf = (stock: number, min: number): StockLevel =>
  stock <= 0 ? 'out' : stock <= min ? 'low' : 'in'

// Roll the base stock together with every variant into one parent status,
// checking each variant's OWN stock vs its OWN minimum:
//   · "Out of Stock" only when nothing is sellable — base and every variant at 0.
//   · "Low Stock" when the base OR any variant is at/below its minimum, or a
//     variant is out while others still have stock (partial out-of-stock).
//   · "In Stock" otherwise.
// A product without variants falls back to its aggregate stock vs minimum.
const rollupLevel = (item: InventoryItem): StockLevel => {
  const variants = item.variants || []
  if (variants.length === 0) return levelOf(item.currentStock, item.lowStockAlert)
  const allOut = (item.currentStock || 0) <= 0 && variants.every((v) => (v.stock || 0) <= 0)
  if (allOut) return 'out'
  const anyIssue =
    (item.currentStock || 0) <= item.lowStockAlert ||
    variants.some((v) => (v.stock || 0) <= v.effectiveThreshold)
  return anyIssue ? 'low' : 'in'
}

const getRollupBadge = (item: InventoryItem) => {
  const level = rollupLevel(item)
  const hasVariants = (item.variants?.length || 0) > 0
  // When the aggregate looks fine but a variant dragged the status down, hint why.
  const fromVariant = hasVariants && level !== levelOf(item.currentStock, item.lowStockAlert)
  const badge =
    level === 'out'
      ? <Badge className="bg-red-50 text-red-700 border border-red-200">Out of Stock</Badge>
      : level === 'low'
        ? <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Low Stock</Badge>
        : <Badge className="bg-green-50 text-green-700 border border-green-200">In Stock</Badge>
  if (!fromVariant) return badge
  return (
    <span className="inline-flex items-center gap-1">
      {badge}
      <span className="text-[10px] font-medium text-slate-400">variant</span>
    </span>
  )
}

const getApprovalBadge = (item: InventoryItem) => {
  if (!item.hasProductCreated) return <Badge className="bg-slate-100 text-slate-600">No Product</Badge>
  switch (item.productApprovalStatus) {
    case 'APPROVED': return <Badge className="bg-green-50 text-green-700 border border-green-200">Approved</Badge>
    case 'PENDING': return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200">Pending Approval</Badge>
    case 'QC_SUBMITTED': return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">Pending Review</Badge>
    case 'QC_APPROVED': return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">QC Approved</Badge>
    case 'REJECTED': return <Badge className="bg-red-50 text-red-700 border border-red-200">Rejected</Badge>
    case 'REINSPECTION': return <Badge className="bg-orange-50 text-orange-700 border border-orange-200">Reinspection</Badge>
    default: return <Badge className="bg-slate-100 text-slate-600">Unknown</Badge>
  }
}

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const toggleExpanded = (id: string) => setExpandedItems(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  // Last-Restocked date-range filter (client-side, inclusive).
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  // Stock status + Last-Restocked are variant-aware, client-side filters, so the
  // whole (search/category-scoped) set is fetched and then filtered + paginated
  // on the client — otherwise server pagination would slice BEFORE the filter and
  // hide matching rows on other pages (e.g. an out-of-stock item on page 2 while
  // page 1 shows "none found"). PAGE_SIZE is the display page; FETCH_LIMIT pulls
  // the full set (admin inventory is modest).
  const PAGE_SIZE = 10
  const FETCH_LIMIT = 5000

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockUnits: 0
  })

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; item: InventoryItem } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Stock history modal state
  const [stockHistoryModal, setStockHistoryModal] = useState<{
    isOpen: boolean
    item: InventoryItem | null
  }>({ isOpen: false, item: null })

  // Fetch inventory stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axiosInstance.get('/inventory/admin/stats')
        if (response.data.success) {
          setStats(response.data.data)
        }
      } catch (error: any) {
        console.error('Error fetching inventory stats:', error)
      }
    }

    fetchStats()
  }, [])

  // Fetch inventory items
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setIsLoading(true)
        // Fetch the FULL set (status/date filters + pagination happen client-side).
        const params: any = {
          page: 1,
          limit: FETCH_LIMIT
        }

        if (searchTerm) params.search = searchTerm
        if (categoryFilter !== 'all') params.category = categoryFilter

        const response = await axiosInstance.get('/inventory/admin/all', { params })

        if (response.data.success) {
          setInventoryItems(response.data.data.items)
          setTotalItems(response.data.data.pagination.totalItems)
        }
      } catch (error: any) {
        console.error('Error fetching inventory:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInventory()
  }, [searchTerm, categoryFilter])

  // Get unique categories for filter
  const categories = ['all', ...Array.from(new Set(inventoryItems.map(item => item.category)))]

  // Keep a row when its Last Restocked date falls within the selected range.
  const inDateRange = (d?: string | null) => {
    if (!dateFrom && !dateTo) return true
    if (!d) return false
    const day = new Date(d).toLocaleDateString('en-CA') // local YYYY-MM-DD
    if (dateFrom && day < dateFrom) return false
    if (dateTo && day > dateTo) return false
    return true
  }

  // Filter items by status + Last-Restocked date range (client-side for now)
  const filteredItems = inventoryItems.filter(item => {
    if (!inDateRange(item.lastRestocked)) return false
    if (statusFilter === 'all') return true
    // Filter on the rolled-up level (base + variants) so it matches the badge shown.
    const level = rollupLevel(item)
    if (statusFilter === 'out_of_stock') return level === 'out'
    if (statusFilter === 'low_stock') return level === 'low'
    if (statusFilter === 'in_stock') return level === 'in'
    return true
  })

  // Client-side pagination over the FILTERED set, so pages reflect what's shown.
  const clientTotalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Any filter/search change resets to page 1 (so a match on a later page isn't
  // hidden behind an out-of-range current page).
  useEffect(() => { setCurrentPage(1) }, [searchTerm, categoryFilter, statusFilter, dateFrom, dateTo])
  // If filtering shrinks the result below the current page, snap back into range.
  useEffect(() => { if (currentPage > clientTotalPages) setCurrentPage(clientTotalPages) }, [currentPage, clientTotalPages])

  const handleUpdateStock = (item: InventoryItem) => {
    // Navigate to separate stock update page
    window.location.href = `/admin/dashboard/inventory/update-stock/${item.id}`
  }

  const handleViewHistory = (item: InventoryItem) => {
    setStockHistoryModal({ isOpen: true, item })
  }

  const handleDeleteClick = (item: InventoryItem) => {
    if (item.hasProductCreated) {
      alert('Cannot delete this inventory item because it has been used to create a product.')
      return
    }
    setDeleteModal({ show: true, item })
  }

  const confirmDelete = async () => {
    if (!deleteModal) return
    setIsDeleting(true)
    try {
      await inventoryService.adminDeleteItem(deleteModal.item.id)

      // Reload the full set (client handles filtering + pagination).
      const params: any = {
        page: 1,
        limit: FETCH_LIMIT
      }
      if (searchTerm) params.search = searchTerm
      if (categoryFilter !== 'all') params.category = categoryFilter

      const [inventoryResponse, statsResponse] = await Promise.all([
        axiosInstance.get('/inventory/admin/all', { params }),
        axiosInstance.get('/inventory/admin/stats')
      ])

      if (inventoryResponse.data.success) {
        setInventoryItems(inventoryResponse.data.data.items)
      }
      if (statsResponse.data.success) {
        setStats(statsResponse.data.data)
      }
    } catch (error: any) {
      console.error('Error deleting item:', error)
      const errorMessage = error.message || error.response?.data?.message || 'Failed to delete item'
      alert(errorMessage)
    } finally {
      setIsDeleting(false)
      setDeleteModal(null)
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-sm text-slate-500">Track and manage your product inventory</p>
        </div>
        {hasPermission('inventory:create') && (
          <Link href="/admin/dashboard/inventory/add">
            <Button className="bg-brand-500 text-white hover:bg-brand-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory Item
            </Button>
          </Link>
        )}
      </div>

      {/* Inventory Stats — click the first three to filter the table by stock status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { key: 'all',          label: 'Total Items',       subtitle: 'Unique products',  value: stats.totalItems,                       Icon: Package,       iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900',   activeClass: 'border-brand-400 bg-brand-50/50' },
          { key: 'low_stock',    label: 'Low Stock',         subtitle: 'Need restocking',  value: stats.lowStockItems,                    Icon: AlertTriangle, iconBg: 'bg-amber-50',   iconColor: 'text-amber-500',   countColor: 'text-amber-700',   activeClass: 'border-amber-400 bg-amber-50/60' },
          { key: 'out_of_stock', label: 'Out of Stock',      subtitle: 'Urgent attention', value: stats.outOfStockItems,                  Icon: TrendingDown,  iconBg: 'bg-red-50',     iconColor: 'text-red-500',     countColor: 'text-red-700',     activeClass: 'border-red-400 bg-red-50/60' },
          { key: null,           label: 'Total Stock Units', subtitle: 'Total units',      value: stats.totalStockUnits.toLocaleString(), Icon: TrendingUp,    iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700', activeClass: '' },
        ].map(({ key, label, subtitle, value, Icon, iconBg, iconColor, countColor, activeClass }) => {
          const clickable = key !== null
          const isActive = clickable && statusFilter === key
          const body = (
            <>
              <div className="flex flex-row items-center justify-between px-3.5 pt-3 pb-1">
                <span className="text-[13px] font-medium text-slate-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${isActive ? iconBg.replace('50', '100') : iconBg} transition-transform duration-150 ${clickable ? 'group-hover:scale-110' : ''}`}>
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
              </div>
              <div className="px-3.5 pb-3">
                <div className={`text-xl font-bold ${countColor}`}>{value}</div>
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              </div>
            </>
          )
          return clickable ? (
            <button
              key={label}
              type="button"
              onClick={() => setStatusFilter((prev) => (prev === key ? 'all' : (key as typeof statusFilter)))}
              className={`text-left bg-white border rounded-2xl shadow-xs transition-all duration-200 hover:shadow-sm group ${isActive ? activeClass : 'border-slate-200/80 hover:border-slate-300'}`}
            >
              {body}
            </button>
          ) : (
            <div key={label} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              {body}
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <DateRangeCalendar
                from={dateFrom}
                to={dateTo}
                placeholder="Last Restocked"
                onChange={(f, t) => { setDateFrom(f); setDateTo(t); setCurrentPage(1) }}
              />
              <div className="flex items-center gap-2">
                <Dropdown
                  id="statusFilter"
                  value={statusFilter}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'in_stock', label: 'In Stock' },
                    { value: 'low_stock', label: 'Low Stock' },
                    { value: 'out_of_stock', label: 'Out of Stock' }
                  ]}
                  onChange={(value) => setStatusFilter(value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')}
                />
              </div>
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
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <span className="ml-3 text-slate-600">Loading inventory...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table className="min-w-[1040px] [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:px-4">
                <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
                  <TableRow>
                    <TableHead className="min-w-[220px]">Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Product Status</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Min Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Restocked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="text-slate-500">
                          <p className="text-lg font-medium">No inventory items found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedItems.map((item) => {
                      const variants = item.variants || []
                      const canExpand = variants.length > 0
                      const isExpanded = expandedItems.has(item.id)
                      return (
                      <Fragment key={item.id}>
                      <TableRow className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors duration-150">
                        <TableCell>
                          <div className="flex items-start gap-2">
                            {canExpand ? (
                              <button
                                onClick={() => toggleExpanded(item.id)}
                                className="mt-0.5 p-0.5 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors shrink-0"
                                aria-label={isExpanded ? 'Collapse variants' : 'Expand variants'}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            ) : <span className="w-5 shrink-0" />}
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {item.name}
                                {canExpand && (
                                  <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded-full">
                                    {variants.length} variants
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500">
                                {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">{item.sku}</TableCell>
                        <TableCell>
                          <div className="min-w-[160px]">
                            <div className="font-medium text-slate-900 truncate max-w-[220px]">{item.vendor.companyName}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[220px]">{item.vendor.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getApprovalBadge(item)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${rollupLevel(item) !== 'in' ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 text-center">
                          {item.lowStockAlert}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{getRollupBadge(item)}</TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                            {hasPermission('inventory:update_stock') && (
                              item.hasProductCreated && item.productApprovalStatus === 'APPROVED' ? (
                                <button
                                  onClick={() => handleUpdateStock(item)}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 transition-colors whitespace-nowrap"
                                >
                                  Update Stock
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 border border-slate-200 opacity-60 cursor-not-allowed whitespace-nowrap"
                                  title={!item.hasProductCreated ? 'Create a product first' : `Product status: ${item.productApprovalStatus}`}
                                >
                                  Update Stock
                                </button>
                              )
                            )}
                            {hasPermission('inventory:view') && (
                              <button
                                onClick={() => handleViewHistory(item)}
                                title="Stock History"
                                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}
                            {hasPermission('inventory:edit') && (
                              <Link href={`/admin/dashboard/inventory/edit/${item.id}`}>
                                <button
                                  title="Edit Item"
                                  className="p-2 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              </Link>
                            )}
                            {hasPermission('inventory:delete') && (
                              <button
                                onClick={() => handleDeleteClick(item)}
                                title={item.hasProductCreated ? "Cannot delete: Product created from this item" : "Delete item"}
                                className={`p-2 rounded-lg transition-colors ${item.hasProductCreated ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {canExpand && isExpanded && (
                        <TableRow className="bg-slate-50/40 hover:bg-slate-50/40">
                          <TableCell colSpan={9} className="!py-0">
                            <div className="px-6 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500/70 mb-2">
                                Variants ({variants.length})
                              </p>
                              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                                      <th className="text-left px-4 py-2 font-semibold">Variant</th>
                                      <th className="text-left px-4 py-2 font-semibold">SKU</th>
                                      <th className="text-left px-4 py-2 font-semibold">Stock</th>
                                      <th className="text-left px-4 py-2 font-semibold">Min Stock</th>
                                      <th className="text-left px-4 py-2 font-semibold">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {variants.map((v) => {
                                      const vName = [v.variantName, v.size, v.color].filter(Boolean).join(' · ') || 'Variant'
                                      return (
                                        <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                                          <td className="px-4 py-2 font-medium text-slate-800">{vName}</td>
                                          <td className="px-4 py-2 font-mono text-xs text-slate-500">{v.sku}</td>
                                          <td className="px-4 py-2">
                                            <span className={v.stock <= v.effectiveThreshold ? 'text-red-600 font-bold' : 'text-slate-900'}>{v.stock}</span>
                                          </td>
                                          <td className="px-4 py-2 text-slate-600">{v.effectiveThreshold}</td>
                                          <td className="px-4 py-2">{getStatusBadge(v.stock, v.effectiveThreshold)}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
                      )
                    })
                  )}
                </TableBody>
              </Table>
              </div>

              {/* Pagination */}
              {clientTotalPages > 1 && (
                <div className="flex items-center justify-end gap-3 text-sm px-4 py-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                    {getPageRange(currentPage, clientTotalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white shadow-xs shadow-brand-500/20' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                    <button onClick={() => setCurrentPage(prev => Math.min(clientTotalPages, prev + 1))} disabled={currentPage === clientTotalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        show={!!deleteModal?.show}
        title="Delete Inventory Item"
        itemName={deleteModal?.item.name}
        itemDetail={`SKU: ${deleteModal?.item.sku}`}
        loading={isDeleting}
        confirmLabel="Delete Permanently"
        loadingLabel="Deleting..."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal(null)}
      />

      {/* Stock History Modal */}
      {stockHistoryModal.item && (
        <StockHistoryModal
          isOpen={stockHistoryModal.isOpen}
          onClose={() => setStockHistoryModal({ isOpen: false, item: null })}
          inventoryId={stockHistoryModal.item.id}
          itemName={stockHistoryModal.item.name}
          itemSku={stockHistoryModal.item.sku}
          isAdmin={true}
        />
      )}
    </div>
  )
}