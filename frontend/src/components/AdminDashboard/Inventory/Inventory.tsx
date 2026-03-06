'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
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
import { Breadcrumb } from '@/components/AdminDashboard/Breadcrumb/Breadcrumb'
import { Package, AlertTriangle, TrendingDown, TrendingUp, Plus, Search, Filter, Loader2, History, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'
import axiosInstance from '@/lib/axios'
import inventoryService from '@/services/inventoryService'
import StockHistoryModal from '@/components/Shared/StockHistoryModal'

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
}

const getStatusBadge = (currentStock: number, lowStockAlert: number) => {
  if (currentStock === 0) {
    return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
  }
  if (currentStock <= lowStockAlert) {
    return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>
  }
  return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
}

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalStockUnits: 0
  })

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
        const params: any = {
          page: currentPage,
          limit: 10
        }

        if (searchTerm) params.search = searchTerm
        if (categoryFilter !== 'all') params.category = categoryFilter

        const response = await axiosInstance.get('/inventory/admin/all', { params })

        if (response.data.success) {
          setInventoryItems(response.data.data.items)
          setTotalPages(response.data.data.pagination.totalPages)
          setTotalItems(response.data.data.pagination.totalItems)
        }
      } catch (error: any) {
        console.error('Error fetching inventory:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchInventory()
  }, [currentPage, searchTerm, categoryFilter])

  // Get unique categories for filter
  const categories = ['all', ...Array.from(new Set(inventoryItems.map(item => item.category)))]

  // Filter items by status (client-side for now)
  const filteredItems = inventoryItems.filter(item => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'out_of_stock') return item.currentStock === 0
    if (statusFilter === 'low_stock') return item.currentStock <= item.lowStockAlert && item.currentStock > 0
    if (statusFilter === 'in_stock') return item.currentStock > item.lowStockAlert
    return true
  })

  const handleUpdateStock = (item: InventoryItem) => {
    // Navigate to separate stock update page
    window.location.href = `/admin/dashboard/inventory/update-stock/${item.id}`
  }

  const handleViewHistory = (item: InventoryItem) => {
    setStockHistoryModal({ isOpen: true, item })
  }

  const handleDelete = async (item: InventoryItem) => {
    if (item.hasProductCreated) {
      alert('Cannot delete this inventory item because it has been used to create a product.')
      return
    }

    if (!confirm('Are you sure you want to delete this inventory item? This action cannot be undone.')) {
      return
    }

    try {
      await inventoryService.adminDeleteItem(item.id)

      // Reload data
      const params: any = {
        page: currentPage,
        limit: 10
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
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage your product inventory</p>
        </div>
        <Link href="/admin/dashboard/inventory/add">
          <Button className="bg-[#313131] text-white hover:bg-[#222222]">
            <Plus className="h-4 w-4 mr-2" />
            Add Inventory Item
          </Button>
        </Link>
      </div>

      {/* Inventory Stats */}
      <div className="grid gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-gray-600">Unique products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
            <p className="text-xs text-gray-600">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
            <p className="text-xs text-gray-600">Urgent attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Units</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStockUnits.toLocaleString()}</div>
            <p className="text-xs text-gray-600">Total units</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
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
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({totalItems} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600">Loading inventory...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Restocked</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="text-gray-500">
                          <p className="text-lg font-medium">No inventory items found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-gray-500">
                              {item.category}{item.subcategory ? ` / ${item.subcategory}` : ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.vendor.companyName}</div>
                            <div className="text-xs text-gray-500">{item.vendor.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={item.currentStock <= item.lowStockAlert ? 'text-red-600 font-bold' : 'text-gray-900'}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {item.lowStockAlert}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.currentStock, item.lowStockAlert)}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStock(item)}
                            >
                              Update Stock
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewHistory(item)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Link href={`/admin/dashboard/inventory/edit/${item.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`${item.hasProductCreated ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                              onClick={() => handleDelete(item)}
                              title={item.hasProductCreated ? "Cannot delete: Product created from this item" : "Delete item"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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