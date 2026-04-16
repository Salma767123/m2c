'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import {
    AlertCircle,
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
const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
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

const APPROVAL_BADGE: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    REINSPECTION: 'bg-orange-100 text-orange-800',
    QC_APPROVED: 'bg-emerald-100 text-emerald-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
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
    const initialPage = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)

    const [searchInput, setSearchInput] = useState(initialSearch)
    const [status, setStatus] = useState(initialStatus)
    const [sort, setSort] = useState(initialSort)
    const [page, setPage] = useState(initialPage)

    const debouncedSearch = useDebounce(searchInput, 300)

    const [products, setProducts] = useState<AssignedProduct[]>([])
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [selectedProduct, setSelectedProduct] = useState<AssignedProduct | null>(null)
    const [viewingProductId, setViewingProductId] = useState<string | null>(null)

    // Reset to page 1 on search change (after first render so deep-linked ?page=N is honoured).
    const didMountRef = useRef(false)
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true
            return
        }
        setPage(1)
    }, [debouncedSearch])

    // Sync URL for shareability + back-button behaviour.
    useEffect(() => {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('search', debouncedSearch)
        if (status) params.set('status', status)
        if (sort !== DEFAULT_SORT) params.set('sort', sort)
        if (page !== 1) params.set('page', String(page))
        const qs = params.toString()
        router.replace(qs ? `?${qs}` : '?', { scroll: false })
    }, [debouncedSearch, status, sort, page, router])

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

    const handleClearFilters = () => {
        setSearchInput('')
        setStatus('')
        setSort(DEFAULT_SORT)
        setPage(1)
    }

    const hasActiveFilters = Boolean(debouncedSearch || status || sort !== DEFAULT_SORT || page !== 1)
    const rangeStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
    const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total)

    if (selectedProduct) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Product Inspection</h1>
                        <p className="text-slate-600 mt-1">Complete the inspection form for {selectedProduct.name}</p>
                    </div>
                </div>
                <ProductInspectionForm
                    productId={selectedProduct.id}
                    productName={selectedProduct.name}
                    vendorName={selectedProduct.vendor.companyName}
                    onComplete={() => {
                        setSelectedProduct(null)
                        loadProducts()
                    }}
                    onCancel={() => setSelectedProduct(null)}
                />
            </div>
        )
    }

    if (viewingProductId) {
        const viewed = products.find((p) => p.id === viewingProductId) || null
        return (
            <ProductDetail
                productId={viewingProductId}
                onBack={() => setViewingProductId(null)}
                onStartInspection={
                    viewed
                        ? () => {
                            setViewingProductId(null)
                            setSelectedProduct(viewed)
                        }
                        : undefined
                }
            />
        )
    }

    return (
        <div className="p-8 font-sans space-y-6">
            <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Assigned Products</h1>
                    <p className="text-slate-600 text-lg">Review and approve or reject vendor products</p>
                </div>
                <button
                    onClick={loadProducts}
                    disabled={loading}
                    title="Refresh"
                    aria-label="Refresh products"
                    className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                    <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filter bar */}
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-start">
                <div className="relative">
                    <label htmlFor="product-search" className="sr-only">Search products</label>
                    <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        id="product-search"
                        type="text"
                        placeholder="Search by product, SKU, category, or vendor..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full pl-12 pr-10 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white shadow-sm"
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
                <div className="min-w-45">
                    <Dropdown
                        id="product-status-filter"
                        value={status}
                        options={STATUS_OPTIONS}
                        onChange={(v) => {
                            setStatus(v as string)
                            setPage(1)
                        }}
                        placeholder="All statuses"
                    />
                </div>
                <div className="min-w-45">
                    <Dropdown
                        id="product-sort-filter"
                        value={sort}
                        options={SORT_OPTIONS}
                        onChange={(v) => {
                            setSort(v as string)
                            setPage(1)
                        }}
                    />
                </div>
            </div>

            {/* Results summary */}
            <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
                <span>
                    {loading
                        ? 'Loading products...'
                        : pagination.total === 0
                            ? '0 products'
                            : `Showing ${rangeStart}–${rangeEnd} of ${pagination.total} product${pagination.total === 1 ? '' : 's'}`}
                </span>
                {hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Error state */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 flex items-center justify-between gap-4 flex-wrap">
                    <span>{error}</span>
                    <button
                        onClick={loadProducts}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <RotateCw className="w-4 h-4" /> Retry
                    </button>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                    {loading && products.length === 0 ? (
                        <div className="animate-pulse">
                            <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-slate-100">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-4 bg-slate-200 rounded w-20" />
                                ))}
                            </div>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="grid grid-cols-5 gap-4 px-6 py-5 border-b border-slate-50 items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0" />
                                        <div className="space-y-2 flex-1">
                                            <div className="h-4 bg-slate-200 rounded w-32" />
                                            <div className="h-3 bg-slate-100 rounded w-20" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-4 bg-slate-100 rounded w-28" />
                                        <div className="h-3 bg-slate-50 rounded w-20" />
                                    </div>
                                    <div className="h-4 bg-slate-100 rounded w-16" />
                                    <div className="h-6 bg-slate-200 rounded-full w-20" />
                                    <div className="h-8 bg-slate-100 rounded-lg w-20" />
                                </div>
                            ))}
                        </div>
                    ) : !loading && products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">
                                {hasActiveFilters ? 'No products match your filters' : 'No assigned products at this time'}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearFilters}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Approval</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                                    {product.images?.[0]?.url ? (
                                                        <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">No Image</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{product.name}</p>
                                                    <p className="text-xs text-slate-500">SKU: {product.baseSku}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-slate-900">{product.vendor.companyName}</p>
                                            <p className="text-sm text-slate-500">{product.vendor.ownerName}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm text-slate-800">{product.category}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={APPROVAL_BADGE[product.approvalStatus] || 'bg-slate-100 text-slate-800'}>
                                                {APPROVAL_LABELS[product.approvalStatus] || product.approvalStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setViewingProductId(product.id)}
                                                    className="text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
                                                    aria-label={`View details for ${product.name}`}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </Button>
                                                {(product.approvalStatus === 'PENDING' || product.approvalStatus === 'REINSPECTION') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedProduct(product)}
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-medium"
                                                    >
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Start Inspection
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
            </div>

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
                            ? 'bg-blue-600 text-white border-blue-600'
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
