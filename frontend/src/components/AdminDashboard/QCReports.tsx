'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from "@/components/UI/Card"
import { Badge } from "@/components/UI/Badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/UI/Table"
import {
    Factory, PackageCheck, Eye, Download, Search, X,
    ChevronLeft, ChevronRight, RotateCw,
} from "lucide-react"
import Dropdown from '@/components/UI/Dropdown'
import { formatDate } from "@/lib/utils"
import { showErrorToast } from '@/lib/toast-utils'
import { useDebounce } from '@/hooks/useDebounce'
import reportsService from '@/services/reportsService'
import { hasPermission } from '@/lib/auth'

const PAGE_SIZE = 12
const DEFAULT_SORT = 'desc'
// Reserve vertical space for a full page so pagination/layout doesn't jump when result count shrinks.
const TABLE_MIN_HEIGHT_PX = PAGE_SIZE * 65

const FACTORY_RESULT_OPTIONS = [
    { value: '', label: 'All results' },
    { value: 'PASSED', label: 'Passed' },
    { value: 'FAILED', label: 'Failed' },
]

const PRODUCT_STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'QC_APPROVED', label: 'QC Approved' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'REINSPECTION', label: 'Reinspection' },
    { value: 'PENDING', label: 'Pending' },
]

const SORT_OPTIONS = [
    { value: 'desc', label: 'Latest first' },
    { value: 'asc', label: 'Oldest first' },
]

const toSort = (v: unknown): 'asc' | 'desc' => (v === 'asc' || v === 'desc') ? v : DEFAULT_SORT

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

type PaginationState = { total: number; page: number; limit: number; totalPages: number }

export default function QCReports() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const initialTab = searchParams.get('tab') === 'product' ? 'product' : 'factory'
    const [activeTab, setActiveTab] = useState<'factory' | 'product'>(initialTab)

    // ── Factory tab state ───────────────────────────────────────────────────
    const [factorySearchInput, setFactorySearchInput] = useState(searchParams.get('search') ?? '')
    const [factoryResult, setFactoryResult] = useState(searchParams.get('result') ?? '')
    const [factorySort, setFactorySort] = useState<'asc' | 'desc'>(toSort(searchParams.get('sort')))
    const [factoryPage, setFactoryPage] = useState(Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1))
    const debouncedFactorySearch = useDebounce(factorySearchInput, 300)

    const [factoryReports, setFactoryReports] = useState<any[]>([])
    const [factoryPagination, setFactoryPagination] = useState<PaginationState>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
    const [loadingFactory, setLoadingFactory] = useState(false)
    const [factoryError, setFactoryError] = useState<string | null>(null)
    const factoryRequestId = useRef(0)
    const factoryFirstRender = useRef(true)
    const factorySigRef = useRef<string>('')

    // ── Product tab state ───────────────────────────────────────────────────
    const [productSearchInput, setProductSearchInput] = useState(searchParams.get('psearch') ?? '')
    const [productStatus, setProductStatus] = useState(searchParams.get('pstatus') ?? '')
    const [productSort, setProductSort] = useState<'asc' | 'desc'>(toSort(searchParams.get('psort')))
    const [productPage, setProductPage] = useState(Math.max(parseInt(searchParams.get('ppage') || '1', 10) || 1, 1))
    const debouncedProductSearch = useDebounce(productSearchInput, 300)

    const [productReports, setProductReports] = useState<any[]>([])
    const [productPagination, setProductPagination] = useState<PaginationState>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
    const [loadingProduct, setLoadingProduct] = useState(false)
    const [productError, setProductError] = useState<string | null>(null)
    const productRequestId = useRef(0)
    const productFirstRender = useRef(true)
    const productSigRef = useRef<string>('')

    // Reset page when search/filter/sort changes (skip first render so deep links survive)
    useEffect(() => {
        if (factoryFirstRender.current) { factoryFirstRender.current = false; return }
        setFactoryPage(1)
    }, [debouncedFactorySearch, factoryResult, factorySort])

    useEffect(() => {
        if (productFirstRender.current) { productFirstRender.current = false; return }
        setProductPage(1)
    }, [debouncedProductSearch, productStatus, productSort])

    // URL sync
    useEffect(() => {
        const params = new URLSearchParams()
        if (activeTab !== 'factory') params.set('tab', activeTab)
        if (debouncedFactorySearch) params.set('search', debouncedFactorySearch)
        if (factoryResult) params.set('result', factoryResult)
        if (factorySort !== DEFAULT_SORT) params.set('sort', factorySort)
        if (factoryPage !== 1) params.set('page', String(factoryPage))
        if (debouncedProductSearch) params.set('psearch', debouncedProductSearch)
        if (productStatus) params.set('pstatus', productStatus)
        if (productSort !== DEFAULT_SORT) params.set('psort', productSort)
        if (productPage !== 1) params.set('ppage', String(productPage))
        const qs = params.toString()
        router.replace(qs ? `?${qs}` : '?', { scroll: false })
    }, [activeTab, debouncedFactorySearch, factoryResult, factorySort, factoryPage, debouncedProductSearch, productStatus, productSort, productPage, router])

    const loadFactory = useCallback(async (force = false) => {
        const sig = JSON.stringify([factoryPage, debouncedFactorySearch, factoryResult, factorySort])
        if (!force && sig === factorySigRef.current) return
        factorySigRef.current = sig
        const id = ++factoryRequestId.current
        setLoadingFactory(true)
        setFactoryError(null)
        try {
            const res = await reportsService.getQcFactory({
                page: factoryPage,
                limit: PAGE_SIZE,
                search: debouncedFactorySearch || undefined,
                result: factoryResult || undefined,
                sortBy: 'completedAt',
                sortOrder: factorySort,
            })
            if (id !== factoryRequestId.current) return
            if (res.success) {
                setFactoryReports(res.data || [])
                setFactoryPagination(res.pagination || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
            } else {
                throw new Error(res.message || 'Unable to load factory reports')
            }
        } catch (error: any) {
            if (id !== factoryRequestId.current) return
            const message = error?.message || 'Unable to load factory reports'
            console.error('Error loading factory QC reports:', error)
            setFactoryError(message)
            showErrorToast('Load Failed', message)
            factorySigRef.current = '' // allow retry
        } finally {
            if (id === factoryRequestId.current) setLoadingFactory(false)
        }
    }, [factoryPage, debouncedFactorySearch, factoryResult, factorySort])

    const loadProduct = useCallback(async (force = false) => {
        const sig = JSON.stringify([productPage, debouncedProductSearch, productStatus, productSort])
        if (!force && sig === productSigRef.current) return
        productSigRef.current = sig
        const id = ++productRequestId.current
        setLoadingProduct(true)
        setProductError(null)
        try {
            const res = await reportsService.getQcProducts({
                page: productPage,
                limit: PAGE_SIZE,
                search: debouncedProductSearch || undefined,
                status: productStatus || undefined,
                sortOrder: productSort,
            })
            if (id !== productRequestId.current) return
            if (res.success) {
                setProductReports(res.data || [])
                setProductPagination(res.pagination || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 })
            } else {
                throw new Error(res.message || 'Unable to load product reports')
            }
        } catch (error: any) {
            if (id !== productRequestId.current) return
            const message = error?.message || 'Unable to load product reports'
            console.error('Error loading product QC reports:', error)
            setProductError(message)
            showErrorToast('Load Failed', message)
            productSigRef.current = '' // allow retry
        } finally {
            if (id === productRequestId.current) setLoadingProduct(false)
        }
    }, [productPage, debouncedProductSearch, productStatus, productSort])

    useEffect(() => {
        if (activeTab === 'factory') loadFactory()
    }, [loadFactory, activeTab])

    useEffect(() => {
        if (activeTab === 'product') loadProduct()
    }, [loadProduct, activeTab])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PASSED':
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-800">Passed / Approved</Badge>
            case 'QC_APPROVED':
                return <Badge className="bg-emerald-100 text-emerald-800">QC Approved</Badge>
            case 'REINSPECTION':
            case 'RE_INSPECTION':
                return <Badge className="bg-amber-100 text-amber-800">Re-Inspection</Badge>
            case 'FAILED':
            case 'REJECTED':
                return <Badge className="bg-red-100 text-red-800">Failed / Rejected</Badge>
            case 'PENDING':
            case 'IN_PROGRESS':
                return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
            case 'SUBMITTED':
                return <Badge className="bg-blue-100 text-blue-800">Submitted for Review</Badge>
            case 'UNDER_ADMIN_REVIEW':
                return <Badge className="bg-yellow-100 text-yellow-800">Under Admin Review</Badge>
            case 'COMPLETED':
                return <Badge className="bg-green-100 text-green-800">Completed</Badge>
            default:
                return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
        }
    }

    const clearFactoryFilters = () => {
        setFactorySearchInput('')
        setFactoryResult('')
        setFactorySort(DEFAULT_SORT)
        setFactoryPage(1)
    }

    const clearProductFilters = () => {
        setProductSearchInput('')
        setProductStatus('')
        setProductSort(DEFAULT_SORT)
        setProductPage(1)
    }

    const factoryHasFilters = Boolean(debouncedFactorySearch || factoryResult || factorySort !== DEFAULT_SORT || factoryPage !== 1)
    const productHasFilters = Boolean(debouncedProductSearch || productStatus || productSort !== DEFAULT_SORT || productPage !== 1)

    const factoryRangeStart = factoryPagination.total === 0 ? 0 : (factoryPagination.page - 1) * factoryPagination.limit + 1
    const factoryRangeEnd = Math.min(factoryPagination.page * factoryPagination.limit, factoryPagination.total)
    const productRangeStart = productPagination.total === 0 ? 0 : (productPagination.page - 1) * productPagination.limit + 1
    const productRangeEnd = Math.min(productPagination.page * productPagination.limit, productPagination.total)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">QC Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">Review Factory and Product quality inspection reports</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('factory')}
                    className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'factory' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Factory className="h-4 w-4" />
                        Factory Inspections
                    </div>
                    {activeTab === 'factory' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                </button>
                <button
                    onClick={() => setActiveTab('product')}
                    className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'product' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4" />
                        Product Inspections
                    </div>
                    {activeTab === 'product' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
                </button>
            </div>

            {/* Factory Tab */}
            {activeTab === 'factory' && (
                <div className="space-y-4">
                    {/* Filter bar */}
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-start">
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by vendor, client, or checker..."
                                value={factorySearchInput}
                                onChange={(e) => setFactorySearchInput(e.target.value)}
                                className="w-full pl-11 pr-10 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-all bg-white shadow-sm text-sm"
                            />
                            {factorySearchInput && (
                                <button
                                    onClick={() => setFactorySearchInput('')}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="min-w-37.5">
                            <Dropdown
                                value={factoryResult}
                                onChange={(v) => setFactoryResult(Array.isArray(v) ? v[0] ?? '' : v)}
                                options={FACTORY_RESULT_OPTIONS}
                                placeholder="All results"
                            />
                        </div>
                        <div className="min-w-37.5">
                            <Dropdown
                                value={factorySort}
                                onChange={(v) => setFactorySort(toSort(Array.isArray(v) ? v[0] : v))}
                                options={SORT_OPTIONS}
                            />
                        </div>
                    </div>

                    {/* Results summary + Clear link */}
                    <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
                        <span>
                            {loadingFactory
                                ? 'Loading reports...'
                                : factoryPagination.total === 0
                                    ? '0 reports'
                                    : `Showing ${factoryRangeStart}–${factoryRangeEnd} of ${factoryPagination.total} report${factoryPagination.total === 1 ? '' : 's'}`}
                        </span>
                        {factoryHasFilters && (
                            <button
                                onClick={clearFactoryFilters}
                                className="text-[#222222] hover:text-[#333333] font-medium underline underline-offset-2"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <Card>
                        <CardContent className="p-0" style={{ minHeight: TABLE_MIN_HEIGHT_PX }}>
                            <Table>
                                <TableHeader className="bg-[#313131] text-white">
                                    <TableRow>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Checker</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Result</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingFactory ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell><div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-32" /><div className="h-3 bg-gray-100 rounded w-24" /></div></TableCell>
                                                <TableCell><div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-32" /><div className="h-3 bg-gray-100 rounded w-24" /></div></TableCell>
                                                <TableCell><div className="h-6 bg-gray-200 rounded-full w-24" /></TableCell>
                                                <TableCell><div className="h-6 bg-gray-200 rounded-full w-20" /></TableCell>
                                                <TableCell><div className="h-4 bg-gray-200 rounded w-24" /></TableCell>
                                                <TableCell><div className="h-8 bg-gray-200 rounded-lg w-28" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : factoryError ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-8">
                                                <div className="flex flex-col items-center gap-2">
                                                    <p className="text-sm text-red-600">{factoryError}</p>
                                                    <button
                                                        onClick={() => loadFactory(true)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                                    >
                                                        <RotateCw className="w-3.5 h-3.5" />
                                                        Retry
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : factoryReports.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                {factoryHasFilters ? 'No reports match the current filters.' : 'No factory inspection reports found.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        factoryReports.map((report) => (
                                            <TableRow key={report.id}>
                                                <TableCell>
                                                    <div className="font-medium text-gray-900">{report.vendor?.companyName || 'Unknown Vendor'}</div>
                                                    <div className="text-xs text-gray-500">{report.vendor?.email}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {report.checker ? (
                                                        <>
                                                            <div className="font-medium text-gray-900">{report.checker.name}</div>
                                                            <div className="text-xs text-gray-500">{report.checker.email}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">Unassigned</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(report.status)}</TableCell>
                                                <TableCell>{report.result ? getStatusBadge(report.result) : <span className="text-xs text-gray-400">—</span>}</TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {formatDate(report.completedAt || report.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    {hasPermission('view_reports') && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => router.push(`/admin/dashboard/qc-reports/${report.id}?type=factory&download=true`)}
                                                            className="flex items-center justify-center w-8 h-8 text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
                                                            title="Download PDF"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => router.push(`/admin/dashboard/qc-reports/${report.id}?type=factory`)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View Details
                                                        </button>
                                                    </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    {factoryPagination.totalPages > 1 && (
                        <div className="flex items-center justify-end gap-3 text-sm">
                            {factoryPagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setFactoryPage((p) => Math.max(1, p - 1))}
                                        disabled={factoryPagination.page <= 1}
                                        className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {getPageRange(factoryPagination.page, factoryPagination.totalPages).map((p, i) => (
                                        p === '…' ? (
                                            <span key={`f-e-${i}`} className="px-2 text-slate-400">…</span>
                                        ) : (
                                            <button
                                                key={`f-${p}`}
                                                onClick={() => setFactoryPage(p as number)}
                                                aria-current={p === factoryPagination.page ? 'page' : undefined}
                                                className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === factoryPagination.page ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}
                                    <button
                                        onClick={() => setFactoryPage((p) => Math.min(factoryPagination.totalPages, p + 1))}
                                        disabled={factoryPagination.page >= factoryPagination.totalPages}
                                        className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Product Tab */}
            {activeTab === 'product' && (
                <div className="space-y-4">
                    {/* Filter bar */}
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] items-start">
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by product, SKU, category, or vendor..."
                                value={productSearchInput}
                                onChange={(e) => setProductSearchInput(e.target.value)}
                                className="w-full pl-11 pr-10 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent transition-all bg-white shadow-sm text-sm"
                            />
                            {productSearchInput && (
                                <button
                                    onClick={() => setProductSearchInput('')}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-3 p-1 text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="min-w-42.5">
                            <Dropdown
                                value={productStatus}
                                onChange={(v) => setProductStatus(Array.isArray(v) ? v[0] ?? '' : v)}
                                options={PRODUCT_STATUS_OPTIONS}
                                placeholder="All statuses"
                            />
                        </div>
                        <div className="min-w-37.5">
                            <Dropdown
                                value={productSort}
                                onChange={(v) => setProductSort(toSort(Array.isArray(v) ? v[0] : v))}
                                options={SORT_OPTIONS}
                            />
                        </div>
                    </div>

                    {/* Results summary + Clear link */}
                    <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
                        <span>
                            {loadingProduct
                                ? 'Loading reports...'
                                : productPagination.total === 0
                                    ? '0 reports'
                                    : `Showing ${productRangeStart}–${productRangeEnd} of ${productPagination.total} report${productPagination.total === 1 ? '' : 's'}`}
                        </span>
                        {productHasFilters && (
                            <button
                                onClick={clearProductFilters}
                                className="text-[#222222] hover:text-[#333333] font-medium underline underline-offset-2"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <Card>
                        <CardContent className="p-0" style={{ minHeight: TABLE_MIN_HEIGHT_PX }}>
                            <Table>
                                <TableHeader className="bg-[#313131] text-white">
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Decision</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingProduct ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell><div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-32" /><div className="h-3 bg-gray-100 rounded w-24" /></div></TableCell>
                                                <TableCell><div className="h-4 bg-gray-200 rounded w-32" /></TableCell>
                                                <TableCell><div className="h-4 bg-gray-200 rounded w-20" /></TableCell>
                                                <TableCell><div className="h-6 bg-gray-200 rounded-full w-24" /></TableCell>
                                                <TableCell><div className="h-4 bg-gray-200 rounded w-20" /></TableCell>
                                                <TableCell><div className="h-4 bg-gray-200 rounded w-24" /></TableCell>
                                                <TableCell><div className="h-8 bg-gray-200 rounded-lg w-28" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : productError ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-8">
                                                <div className="flex flex-col items-center gap-2">
                                                    <p className="text-sm text-red-600">{productError}</p>
                                                    <button
                                                        onClick={() => loadProduct(true)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                                                    >
                                                        <RotateCw className="w-3.5 h-3.5" />
                                                        Retry
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : productReports.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                {productHasFilters ? 'No reports match the current filters.' : 'No product inspection reports found.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        productReports.map((product) => {
                                            const decision = product.finalDecision || product.approvalStatus
                                            return (
                                                <TableRow key={product.id}>
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900">{product.name}</div>
                                                        <div className="text-xs text-gray-500">SKU: {product.baseSku}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-gray-900">{product.vendor?.companyName || 'Unknown Vendor'}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-gray-900">{product.category}</span>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(product.approvalStatus)}</TableCell>
                                                    <TableCell>
                                                        <span className={`text-sm font-medium ${decision === 'Approved' ? 'text-green-600' : decision === 'Rejected' ? 'text-red-600' : 'text-yellow-600'}`}>
                                                            {decision}
                                                        </span>
                                                        {product.rejectionReason && (
                                                            <div className="text-xs text-red-500 max-w-37.5 truncate" title={product.rejectionReason}>
                                                                {product.rejectionReason}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {formatDate(product.updatedAt)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {hasPermission('view_reports') && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => router.push(`/admin/dashboard/qc-reports/${product.id}?type=product&download=true`)}
                                                                className="flex items-center justify-center w-8 h-8 text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
                                                                title="Download PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/admin/dashboard/qc-reports/${product.id}?type=product`)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                                View Details
                                                            </button>
                                                        </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    {productPagination.totalPages > 1 && (
                        <div className="flex items-center justify-end gap-3 text-sm">
                            {productPagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                                        disabled={productPagination.page <= 1}
                                        className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {getPageRange(productPagination.page, productPagination.totalPages).map((p, i) => (
                                        p === '…' ? (
                                            <span key={`p-e-${i}`} className="px-2 text-slate-400">…</span>
                                        ) : (
                                            <button
                                                key={`p-${p}`}
                                                onClick={() => setProductPage(p as number)}
                                                aria-current={p === productPagination.page ? 'page' : undefined}
                                                className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === productPagination.page ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    ))}
                                    <button
                                        onClick={() => setProductPage((p) => Math.min(productPagination.totalPages, p + 1))}
                                        disabled={productPagination.page >= productPagination.totalPages}
                                        className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
