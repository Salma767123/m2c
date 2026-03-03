'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import { Check, X, AlertCircle, FileText } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
import { qcCheckerService } from '@/services/qcCheckerService'
import ProductInspectionForm from './ProductInspectionForm'

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

export default function Products() {
    const [products, setProducts] = useState<AssignedProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [showRejectionModal, setShowRejectionModal] = useState(false)
    const [rejectingProductId, setRejectingProductId] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<AssignedProduct | null>(null)

    useEffect(() => {
        loadProducts()
    }, [])

    const loadProducts = async () => {
        setLoading(true)
        try {
            const response = await qcCheckerService.getAssignedProducts()
            if (response.success) {
                setProducts(response.data)
            }
        } catch (error: any) {
            console.error('Error loading products:', error)
            showErrorToast('Load Failed', error.message || 'Unable to fetch assigned products')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (productId: string) => {
        if (!window.confirm('Are you sure you want to approve this product?')) return

        try {
            const response = await qcCheckerService.approveProduct(productId)
            if (response.success) {
                showSuccessToast('Product Approved', 'You have successfully approved this product.')
                loadProducts()
            }
        } catch (error: any) {
            showErrorToast('Approval Failed', error.message || 'Unable to approve product.')
        }
    }

    const handleRejectClick = (productId: string) => {
        setRejectingProductId(productId)
        setRejectionReason('')
        setShowRejectionModal(true)
    }

    const handleRejectSubmit = async () => {
        if (!rejectingProductId || !rejectionReason.trim()) {
            showErrorToast('Validation Error', 'Please provide a valid reason for rejection.')
            return
        }

        try {
            const response = await qcCheckerService.rejectProduct(rejectingProductId, rejectionReason.trim())
            if (response.success) {
                showSuccessToast('Product Rejected', 'You have rejected this product.')
                setShowRejectionModal(false)
                setRejectingProductId(null)
                loadProducts()
            }
        } catch (error: any) {
            showErrorToast('Rejection Failed', error.message || 'Unable to reject product.')
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800'
            case 'APPROVED': return 'bg-green-100 text-green-800'
            case 'REJECTED': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-3 text-gray-600 font-medium">Loading Assigned Products...</span>
            </div>
        )
    }

    if (selectedProduct) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Product Inspection</h1>
                        <p className="text-gray-600 mt-1">Complete the inspection form for {selectedProduct.name}</p>
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Assigned Products</h1>
                    <p className="text-gray-600 mt-1">Review and approve or reject vendor products</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Products Awaiting Inspection</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500 font-medium">No assigned products at this time</p>
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
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                                    {product.images?.[0]?.url ? (
                                                        <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No Image</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">SKU: {product.baseSku}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium text-gray-900">{product.vendor.companyName}</p>
                                            <p className="text-sm text-gray-500">{product.vendor.ownerName}</p>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-sm text-gray-800">{product.category}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(product.approvalStatus)}>
                                                {product.approvalStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(product.approvalStatus === 'PENDING' || product.approvalStatus === 'UNDER_REVIEW') && (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setSelectedProduct(product)}
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-medium"
                                                    >
                                                        <FileText className="h-4 w-4 mr-2" />
                                                        Start Inspection
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {showRejectionModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Product</h3>
                        <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting this product inspection.</p>

                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all resize-none h-28 mix-blend-multiply"
                            placeholder="Enter rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => setShowRejectionModal(false)}>Cancel</Button>
                            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleRejectSubmit}>
                                Confirm Rejection
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
