'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Factory, PackageCheck, Eye } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { showErrorToast } from '@/lib/toast-utils'
import reportsService from '@/services/reportsService'

export default function QCReports() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'factory' | 'product'>('factory')
    const [factoryReports, setFactoryReports] = useState<any[]>([])
    const [productReports, setProductReports] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [factoryRes, productRes] = await Promise.all([
                reportsService.getQcFactory(),
                reportsService.getQcProducts()
            ])
            if (factoryRes.success) setFactoryReports(factoryRes.data)
            if (productRes.success) setProductReports(productRes.data)
        } catch (error: any) {
            console.error('Error loading QC reports:', error)
            showErrorToast('Load Failed', error.message || 'Unable to load QC reports')
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PASSED":
            case "APPROVED":
                return <Badge className="bg-green-100 text-green-800">Passed / Approved</Badge>
            case "CONDITIONALLY_APPROVED":
            case "RE_INSPECTION":
                return <Badge className="bg-yellow-100 text-yellow-800">Review Required</Badge>
            case "FAILED":
            case "REJECTED":
                return <Badge className="bg-red-100 text-red-800">Failed / Rejected</Badge>
            case "PENDING":
            case "IN_PROGRESS":
                return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
            default:
                return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
        }
    }

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

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                        </div>
                    ) : activeTab === 'factory' ? (
                        /* ── Factory Inspections ── */
                        <Table>
                            <TableHeader className="bg-[#313131] text-white">
                                <TableRow>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Checker</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {factoryReports.map((report) => (
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
                                        <TableCell>
                                            <div className="text-sm text-gray-900">{report.factoryLocation || '-'}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {formatDate(report.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => router.push(`/admin/dashboard/qc-reports/${report.id}?type=factory`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View Details
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {factoryReports.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No factory inspection reports found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        /* ── Product Inspections ── */
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
                                {productReports.map((product) => {
                                    const qcData = product.qcInspectionData || {}
                                    const decision = qcData.finalDecision || product.approvalStatus
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
                                                    <div className="text-xs text-red-500 max-w-[150px] truncate" title={product.rejectionReason}>
                                                        {product.rejectionReason}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500">
                                                {formatDate(product.updatedAt)}
                                            </TableCell>
                                            <TableCell>
                                                <button
                                                    onClick={() => router.push(`/admin/dashboard/qc-reports/${product.id}?type=product`)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    View Details
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {productReports.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No product inspection reports found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
