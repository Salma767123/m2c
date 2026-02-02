'use client'

import { useState } from 'react'
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

interface InventoryItem {
  id: number
  name: string
  sku: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  lastRestocked: string
  price: number
  costPrice: number
}

const mockInventoryItems: InventoryItem[] = [
  {
    id: 1,
    name: 'Cotton Kitchen Towel',
    sku: 'CKT-001',
    category: 'Kitchen Linen',
    currentStock: 45,
    minStock: 10,
    maxStock: 100,
    status: 'in_stock',
    lastRestocked: '2024-01-15',
    price: 12.99,
    costPrice: 6.50,
  },
  {
    id: 2,
    name: 'Handwoven Bath Towel',
    sku: 'HBT-002',
    category: 'Bath Linen',
    currentStock: 8,
    minStock: 15,
    maxStock: 80,
    status: 'low_stock',
    lastRestocked: '2024-01-14',
    price: 24.99,
    costPrice: 12.00,
  },
  {
    id: 3,
    name: 'Artisan Apron',
    sku: 'AA-003',
    category: 'Aprons',
    currentStock: 0,
    minStock: 5,
    maxStock: 50,
    status: 'out_of_stock',
    lastRestocked: '2024-01-13',
    price: 18.99,
    costPrice: 9.50,
  },
  {
    id: 4,
    name: 'Luxury Bed Sheet Set',
    sku: 'LBS-004',
    category: 'Bed Linen',
    currentStock: 25,
    minStock: 5,
    maxStock: 30,
    status: 'in_stock',
    lastRestocked: '2024-01-16',
    price: 89.99,
    costPrice: 45.00,
  },
  {
    id: 5,
    name: 'Table Runner',
    sku: 'TR-005',
    category: 'Table Linen',
    currentStock: 12,
    minStock: 20,
    maxStock: 60,
    status: 'low_stock',
    lastRestocked: '2024-01-12',
    price: 34.99,
    costPrice: 17.50,
  },
]

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
  const [inventoryItems] = useState<InventoryItem[]>(mockInventoryItems)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Calculate stats
  const totalItems = inventoryItems.length
  const lowStockItems = inventoryItems.filter(item => item.currentStock <= item.minStock && item.currentStock > 0).length
  const outOfStockItems = inventoryItems.filter(item => item.currentStock === 0).length
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.currentStock * item.costPrice), 0)

  // Get unique categories for filter
  const categories = ['all', ...Array.from(new Set(inventoryItems.map(item => item.category)))]

  // Filter items
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'out_of_stock' && item.currentStock === 0) ||
                         (statusFilter === 'low_stock' && item.currentStock <= item.minStock && item.currentStock > 0) ||
                         (statusFilter === 'in_stock' && item.currentStock > item.minStock)
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const handleRestock = (itemId: number) => {
    console.log('Restocking item:', itemId)
    // Implement restock logic here
  }

  const handleEdit = (itemId: number) => {
    console.log('Editing item:', itemId)
    // Navigate to edit page or open modal
  }

  const handleDelete = (itemId: number) => {
    console.log('Deleting item:', itemId)
    // Implement delete logic here
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
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-[#222222]">{item.name}</div>
                        <div className="text-sm text-slate-500">{item.category}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-600">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-slate-600">Product Linked</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={item.currentStock <= item.minStock ? 'text-red-600 font-bold' : 'text-[#222222] font-semibold'}>
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {item.minStock} / {item.maxStock}
                    </TableCell>
                    <TableCell className="font-medium text-[#222222]">
                      ${item.costPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status, item.currentStock, item.minStock)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(item.lastRestocked).toLocaleDateString()}
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