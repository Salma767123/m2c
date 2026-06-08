'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import {
    AlertCircle,
    Calendar,
    Eye,
    FileText,
    Search,
    RotateCw,
    X,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { showErrorToast } from '@/lib/toast-utils'
import { qcCheckerService } from '@/services/qcCheckerService'
import { useDebounce } from '@/hooks/useDebounce'
import ProductInspectionForm from './ProductInspectionForm'
import ProductDetail from './ProductDetail'

interface AssignedProduct {
    id: string
    name: string
    baseSku: string
    category: string
    basePrice: number
    totalStock: number
    status: string
    approvalStatus: string
    createdAt: string
    images?: Array<{ url: string; isPrimary: boolean }>
    vendor: {
        companyName: string
        ownerName: string
        email: string
    }
}

const PAGE_SIZE = 12
const DEFAULT_SORT = 'createdAt:desc'

// Mirrors the ProductApprovalStatus enum in backend/prisma/schema.prisma.
// Rendered as tabs at the top of the page (same pattern as Vendor Management).
const STATUS_TABS = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'REINSPECTION', label: 'Reinspection' },
    { value: 'QC_APPROVED', label: 'Approved by QC' },
    { value: 'APPROVED', label: 'Approved by Admin' },
    { value: 'REJECTED', label: 'Rejected' },
]

const SORT_OPTIONS = [
    { value: 'createdAt:desc', label: 'Newest first' },
    { value: 'createdAt:asc', label: 'Oldest first' },
    { value: 'basePrice:asc', label: 'Price low–high' },
    { value: 'basePrice:desc', label: 'Price high–low' },
]

// Pill styling — soft tinted background + matching border, mirrors the
// status pills used across the Vendor Management data grid.
const APPROVAL_BADGE: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/85',
    REINSPECTION: 'bg-purple-50 text-purple-700 border-purple-200/85',
    QC_APPROVED: 'bg-blue-50 text-blue-700 border-blue-200/85',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/85',
    REJECTED: 'bg-red-50 text-red-700 border-red-200/85',
}

const APPROVAL_LABELS: Record<string, string> = {
    PENDING: 'Pending',
    REINSPECTION: 'Reinspection',
    QC_APPROVED: 'Approved by QC',
    APPROVED: 'Approved by Admin',
    REJECTED: 'Rejected',
}

export default function Products() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const initialSearch = searchParams.get('search') ?? ''
    const initialStatus = searchParams.get('status') ?? ''
    const initialSort = searchParams.get('sort') ?? DEFAULT_SORT
    const initialDate = searchParams.get('date') ?? ''
    const initialPage = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)

    const [searchInput, setSearchInput] = useState(initialSearch)
    const [status, setStatus] = useState(initialStatus)
    const [sort, setSort] = useState(initialSort)
    const [dateFilter, setDateFilter] = useState(initialDate)
    const [page, setPage] = useState(initialPage)

    const dateInputRef = useRef<HTMLInputElement>(null)

    const debouncedSearch = useDebounce(searchInput, 300)

    const [products, setProducts] = useState<AssignedProduct[]>([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [selectedProduct, setSelectedProduct] = useState<AssignedProduct | null>(null)
    const [viewingProductId, setViewingProductId] = useState<string | null>(null)

    const viewParam = searchParams.get('view')
    const idParam = searchParams.get('id')

    useEffect(() => {
        if (viewParam === 'detail' && idParam) {
            setViewingProductId(idParam)
            setSelectedProduct(null)
        } else if (viewParam === 'inspection' && idParam && products.length > 0) {
            const prod = products.find(p => p.id === idParam)
            if (prod) setSelectedProduct(prod)
            setViewingProductId(null)
        } else if (!viewParam && !idParam) {
            setViewingProductId(null)
            setSelectedProduct(null)
        }
    }, [viewParam, idParam, products])

    const handleViewDetails = (id: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('view', 'detail')
        params.set('id', id)
        router.push(`?${params.toString()}`)
    }

    const handleStartInspection = (product: AssignedProduct) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('view', 'inspection')
        params.set('id', product.id)
        router.push(`?${params.toString()}`)
    }

    const handleBackToList = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('view')
        params.delete('id')
        router.push(`?${params.toString()}`)
    }

    // Reset to page 1 on search change (after first render so deep-linked ?page=N is honoured).
    const didMountRef = useRef(false)
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true
            return
        }
        setPage(1)
    }, [debouncedSearch, dateFilter])

    // Sync URL for shareability + back-button behaviour.
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        
        if (debouncedSearch) params.set('search', debouncedSearch)
        else params.delete('search')
        
        if (status) params.set('status', status)
        else params.delete('status')
        
        if (sort !== DEFAULT_SORT) params.set('sort', sort)
        else params.delete('sort')

        if (dateFilter) params.set('date', dateFilter)
        else params.delete('date')

        if (page !== 1) params.set('page', String(page))
        else params.delete('page')

        const qs = params.toString()
        router.replace(qs ? `?${qs}` : '?', { scroll: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, status, sort, dateFilter, page, router])

    const [sortBy, sortOrder] = useMemo(() => {
        const [by, ord] = sort.split(':')
        return [by || 'createdAt', (ord as 'asc' | 'desc') || 'desc']
    }, [sort])

    // Ignore stale responses when the user rapidly changes filters.
    const requestIdRef = useRef(0)

    const loadProducts = useCallback(async () => {
        const requestId = ++requestIdRef.current
        setLoading(true)
        setError(null)
        try {
            const response = await qcCheckerService.getAssignedProducts({
                page,
                limit: PAGE_SIZE,
                search: debouncedSearch || undefined,
                status: status || undefined,
                sortBy,
                sortOrder,
            })
            if (requestId !== requestIdRef.current) return
            if (response.success) {
                setProducts(response.data.products as unknown as AssignedProduct[])
                setPagination(response.data.pagination)
            }
        } catch (err) {
            if (requestId !== requestIdRef.current) return
            const message = err instanceof Error ? err.message : 'Unable to fetch assigned products'
            console.error('Error loading products:', err)
            setError(message)
            showErrorToast('Load Failed', message)
        } finally {
            if (requestId === requestIdRef.current) setLoading(false)
        }
    }, [page, debouncedSearch, status, sortBy, sortOrder])

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    // Client-side date filter (mirrors the Vendor module): match each
    // product's createdAt against the picked day, formatted as a local
    // YYYY-MM-DD string so the comparison is timezone-safe.
    const filteredProducts = useMemo(() => {
        if (!dateFilter) return products
        return products.filter((p) => {
            if (!p.createdAt) return false
            const d = new Date(p.createdAt)
            if (Number.isNaN(d.getTime())) return false
            const raw = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            return raw === dateFilter
        })
    }, [products, dateFilter])

    const handleClearFilters = () => {
        setSearchInput('')
        setStatus('')
        setSort(DEFAULT_SORT)
        setDateFilter('')
        setPage(1)
    }

    const hasActiveFilters = Boolean(debouncedSearch || status || sort !== DEFAULT_SORT || dateFilter || page !== 1)
    const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
    const rangeEnd = dateFilter
        ? rangeStart + filteredProducts.length - 1
        : Math.min(pagination.page * pagination.limit, pagination.total)

    if (selectedProduct) {
        return (
            <ProductInspectionForm
                productId={selectedProduct.id}
                productName={selectedProduct.name}
                vendorName={selectedProduct.vendor.companyName}
                onComplete={() => {
                    handleBackToList()
                    loadProducts()
                }}
                onCancel={handleBackToList}
            />
        )
    }

    if (viewingProductId) {
        const viewed = products.find((p) => p.id === viewingProductId) || null
        return (
            <ProductDetail
                productId={viewingProductId}
                onBack={handleBackToList}
                onStartInspection={
                    viewed ? () => handleStartInspection(viewed) : undefined
                }
            />
        )
    }

    return (
        <div className="min-h-screen pt-1 pb-6 px-6 font-sans flex flex-col">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Assigned Products</h1>
                <p className="text-slate-500 text-sm">Review and approve or reject vendor products</p>
            </div>

            {/* Status Tabs and Actions */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="overflow-x-auto pb-1 scrollbar-none flex-1">
                    <div className="flex gap-2 min-w-max">
                        {STATUS_TABS.map((tab) => {
                            const isActive = status === tab.value
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => {
                                        setStatus(tab.value)
                                        setPage(1)
                                    }}
                                    className={`px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                                        isActive
                                            ? "border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10 text-brand-700 font-bold"
                                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <button
                    onClick={loadProducts}
                    disabled={loading}
                    title="Refresh"
                    aria-label="Refresh products"
                    className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 shrink-0"
                >
                    <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filter bar */}
            <div className="mb-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-center">
                    <div className="relative flex-1">
                        <label htmlFor="product-search" className="sr-only">Search products</label>
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input
                            id="product-search"
                            type="text"
                            placeholder="Search by product, SKU, category, or vendor..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-12 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all bg-white shadow-xs"
                        />
                        {searchInput && (
                            <button
                                onClick={() => setSearchInput('')}
                                aria-label="Clear search"
                                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="relative min-w-45">
                        <label htmlFor="product-date-filter" className="sr-only">Filter by Assigned Date</label>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                try {
                                    dateInputRef.current?.showPicker()
                                } catch (err) {}
                            }}
                            className="absolute left-3.5 top-3.5 text-slate-400 hover:text-brand-500 cursor-pointer z-10 transition-colors"
                            title="Open calendar picker"
                        >
                            <Calendar className="w-5 h-5" />
                        </button>
                        <input
                            ref={dateInputRef}
                            id="product-date-filter"
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full pl-12 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all bg-white shadow-xs text-sm text-slate-700 [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                        {dateFilter && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setDateFilter('')
                                }}
                                aria-label="Clear date filter"
                                className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700 cursor-pointer z-10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="min-w-45">
                        <Dropdown
                            id="product-sort-filter"
                            value={sort}
                            buttonClassName="py-3 rounded-xl"
                            options={SORT_OPTIONS}
                            onChange={(v) => {
                                setSort(v as string)
                                setPage(1)
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Results summary */}
            <div className="mb-4 flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
                <span>
                    {loading
                        ? 'Loading products...'
                        : filteredProducts.length === 0
                            ? '0 products'
                            : `Showing ${rangeStart}–${rangeEnd} of ${dateFilter ? filteredProducts.length : pagination.total} product${(dateFilter ? filteredProducts.length : pagination.total) === 1 ? '' : 's'}`}
                </span>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-brand-500/10 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500/40 outline-none"
                    >
                        <X className="w-3.5 h-3.5 text-white" />
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Error state */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
                    <span>{error}</span>
                    <button
                        onClick={loadProducts}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <RotateCw className="w-4 h-4" /> Retry
                    </button>
                </div>
            )}

            {/* Skeleton on initial load — mirrors the data-grid table layout below */}
            {loading && products.length === 0 && !error && (
                <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-2xl shadow-xs scrollbar-none mb-6">
                    <Table>
                        <TableHeader className="!bg-slate-50/80 !border-slate-200/80 [&_tr]:border-b-0">
                            <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-5 text-[10px] uppercase tracking-wider">Product</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Category</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Approval</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-5 text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={i} className="hover:!bg-transparent">
                                    <TableCell className="py-4 px-5 align-middle">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0 animate-pulse" />
                                            <div className="space-y-2">
                                                <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse" />
                                                <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-4 align-middle">
                                        <div className="space-y-2">
                                            <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
                                            <div className="h-2.5 w-20 bg-slate-100 rounded animate-pulse" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-4 align-middle">
                                        <div className="h-3.5 w-20 bg-slate-200 rounded animate-pulse" />
                                    </TableCell>
                                    <TableCell className="py-4 px-4 align-middle">
                                        <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse" />
                                    </TableCell>
                                    <TableCell className="py-4 px-5 align-middle">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
                                            <div className="h-8 w-28 bg-slate-200 rounded-lg animate-pulse" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Product data grid */}
            {!error && filteredProducts.length > 0 && (
                <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-2xl shadow-xs scrollbar-none mb-6">
                    <Table>
                        <TableHeader className="!bg-slate-50/80 !border-slate-200/80 [&_tr]:border-b-0">
                            <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-5 text-[10px] uppercase tracking-wider">Product</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Vendor</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Category</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-4 text-[10px] uppercase tracking-wider">Approval</TableHead>
                                <TableHead className="font-bold !text-slate-500 h-12 py-3 px-5 text-[10px] uppercase tracking-wider text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.map((product) => (
                                <TableRow
                                    key={product.id}
                                    onClick={() => handleViewDetails(product.id)}
                                    className="cursor-pointer transition-all duration-150 group select-none hover:bg-slate-50/40"
                                >
                                    {/* Product Column */}
                                    <TableCell className="py-4 px-5 align-middle">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/60">
                                                {product.images?.[0]?.url ? (
                                                    <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">No Image</span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 group-hover:text-brand-500 transition-colors text-sm leading-tight">{product.name}</p>
                                                <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">SKU: {product.baseSku}</p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Vendor Column */}
                                    <TableCell className="py-4 px-4 align-middle text-sm">
                                        <p className="font-semibold text-slate-700">{product.vendor.companyName}</p>
                                        <p className="text-slate-400 font-medium">{product.vendor.ownerName}</p>
                                    </TableCell>

                                    {/* Category Column */}
                                    <TableCell className="py-4 px-4 align-middle text-sm font-semibold text-slate-600">
                                        {product.category}
                                    </TableCell>

                                    {/* Approval Column */}
                                    <TableCell className="py-4 px-4 align-middle">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${APPROVAL_BADGE[product.approvalStatus] || 'bg-slate-50 text-slate-700 border-slate-200/85'}`}>
                                            {APPROVAL_LABELS[product.approvalStatus] || product.approvalStatus}
                                        </span>
                                    </TableCell>

                                    {/* Actions Column */}
                                    <TableCell className="py-4 px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleViewDetails(product.id)}
                                                aria-label={`View details for ${product.name}`}
                                                title="View Details"
                                                className="p-1.5 text-slate-500 hover:text-brand-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {(product.approvalStatus === 'PENDING' || product.approvalStatus === 'REINSPECTION') && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartInspection(product)}
                                                    aria-label={`Start inspection for ${product.name}`}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shadow-brand-500/10 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Inspect
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredProducts.length === 0 && (
                <div className="text-center py-16">
                    <div className="bg-slate-100 p-6 rounded-2xl inline-block mb-4">
                        <AlertCircle className="w-16 h-16 text-slate-400 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        {hasActiveFilters ? 'No products match your filters' : 'No assigned products yet'}
                    </h3>
                    <p className="text-slate-600 mb-4">
                        {hasActiveFilters
                            ? 'Try adjusting or clearing your filters.'
                            : 'Products assigned to you by the admin will appear here.'}
                    </p>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-bold rounded-xl text-sm transition-all shadow-xs shadow-brand-500/10"
                        >
                            <X className="w-4 h-4" /> Clear Filters
                        </button>
                    )}
                </div>
            )}

            {pagination.totalPages > 1 && (
                <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onChange={setPage}
                    disabled={loading}
                />
            )}
        </div>
    )
}

function Pagination({
    page,
    totalPages,
    onChange,
    disabled,
}: {
    page: number
    totalPages: number
    onChange: (p: number) => void
    disabled?: boolean
}) {
    const pages = getPageRange(page, totalPages)
    return (
        <nav aria-label="Pagination" className="mt-2 flex items-center justify-center gap-1 flex-wrap">
            <button
                type="button"
                onClick={() => onChange(page - 1)}
                disabled={disabled || page <= 1}
                aria-label="Previous page"
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            {pages.map((p, i) =>
                p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-slate-400" aria-hidden="true">…</span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onChange(p)}
                        disabled={disabled}
                        aria-current={p === page ? 'page' : undefined}
                        aria-label={`Go to page ${p}`}
                        className={`min-w-9 px-3 py-2 rounded-lg border font-medium ${p === page
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                type="button"
                onClick={() => onChange(page + 1)}
                disabled={disabled || page >= totalPages}
                aria-label="Next page"
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                Next <ChevronRight className="w-4 h-4" />
            </button>
        </nav>
    )
}

function getPageRange(current: number, total: number): Array<number | '…'> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: Array<number | '…'> = [1]
    if (current > 4) pages.push('…')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let p = start; p <= end; p++) pages.push(p)
    if (current < total - 3) pages.push('…')
    pages.push(total)
    return pages
}
