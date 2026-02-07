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
import { Package, AlertTriangle, TrendingDown, TrendingUp, Plus, Search, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Dropdown from '@/components/UI/Dropdown'
import inventoryService, { InventoryItem as APIInventoryItem, InventoryStats } from '@/services/inventoryService'

const getStatusBadge = (status: string, currentStock: number, minStock: number) => {
  if (currentStock === 0) {
    return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>
  }
  if (currentStock <= minStock) {
    return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>
  }
  return <Badge className="bg-green-100 text-green-800">In Stock</Badge>
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
          alert('Authentication required. Please login again.')
          window.location.href = '/vendor'
        } else {
          alert('Failed to load inventory data')
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

  const handleRestock = (itemId: string) => {
    console.log('Restocking item:', itemId)
    // Navigate to edit page with focus on stock
    // You could also implement a quick restock modal here
  }

  const handleEdit = (itemId: string) => {
    console.log('Editing item:', itemId)
    // Navigation is handled by the Link component
  }

  const handleDelete = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this inventory item?')) {
      try {
        await inventoryService.deleteItem(itemId)
        alert('Item deleted successfully')
        loadInventoryItems() // Reload the list
      } catch (error: any) {
        console.error('Error deleting item:', error)
        if (error.response?.status === 400) {
          alert(error.response.data.message || 'Cannot delete this item')
        } else {
          alert('Failed to delete item')
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#222222]">Inventory Management</h1>
            <p className="text-slate-600">Loading your inventory...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center jusbnmtify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222222]"></div>
              <span className="ml-3 text-slate-600">Loading inventory data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">Inventory Management</h1>
          <p className="text-slate-600">Manage your product inventory and stock levels</p>
        </div>
        <Link href="/vendor/dashboard/inventory/add">
          <Button className="bg-[#222222] text-white hover:bg-[#313131]">
            <Plus className="h-4 w-4 mr-2" />
            Add Inventory Item
          </Button>
        </Link>
      </div>

      {/* Inventory Stats */}
      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="border border-gray-200 hover:border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Items</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#222222]">{totalItems}</div>
            <p className="text-xs text-slate-600">Unique products</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
            <p className="text-xs text-slate-600">Need restocking</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockItems}</div>
            <p className="text-xs text-slate-600">Urgent attention</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 hover:border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#222222]">${totalValue.toLocaleString()}</div>
            <p className="text-xs text-slate-600">Inventory worth</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
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
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' }
                  ]}
                  onChange={(value) => setStatusFilter(value as 'all' | 'ACTIVE' | 'INACTIVE')}
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
      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-[#222222]">Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Linked Product</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min/Max</TableHead>
                <TableHead>Cost Price</TableHead>
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
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-[#222222]">{item.name}</div>
                        <div className="text-sm text-slate-500">
                          {item.category}{item.subcategory ? ` > ${item.subcategory}` : ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.hasProductCreated ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-slate-600">Product Linked</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm text-slate-500">No Product</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={item.currentStock <= item.minStock ? 'text-red-600 font-bold' : 'text-[#222222] font-semibold'}>
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.minStock} / -
                    </TableCell>
                    <TableCell className="font-medium text-[#222222]">
                      -
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status, item.currentStock, item.minStock)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.lastRestocked ? new Date(item.lastRestocked).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="hover:bg-gray-50 hover:border-gray-200"
                          onClick={() => handleRestock(item.id)}
                          disabled={item.currentStock > item.minStock}
                        >
                          Restock
                        </Button>
                        <Link href={`/vendor/dashboard/inventory/edit/${item.id}`}>
                          <Button variant="outline" size="sm" className="hover:bg-gray-50 hover:border-gray-200">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="hover:bg-gray-50 hover:border-gray-200 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}