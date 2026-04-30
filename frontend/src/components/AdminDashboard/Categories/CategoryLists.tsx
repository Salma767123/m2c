'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import { Plus, Edit, Trash2, Eye, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { categoryService, Category, CategoryStats } from '@/services/categoryService'
import { hasPermission } from '@/lib/auth'

const PAGE_SIZE = 10

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

export default function CategoryLists() {
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<CategoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadCategories()
    loadStats()
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  const loadCategories = async () => {
    try {
      setLoading(true)
      
      let response;
      
      if (searchTerm && searchTerm.trim().length >= 2) {
        // Use dedicated search endpoint for better search results
        response = await categoryService.searchCategories(searchTerm, {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          includeSubcategories: true,
          limit: 50
        })
      } else {
        // Use regular getCategories for normal listing (root categories only)
        response = await categoryService.getCategories({
          status: statusFilter,
          includeSubcategories: true, // Include subcategories in the response
          showRootOnly: true, // Only show root categories as main items
          sortBy: 'sortOrder',
          sortOrder: 'asc'
        })
      }
      
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await categoryService.getCategoryStats()
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  // Filter categories based on search and status
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || category.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE))
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleDelete = async (categoryId: string) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await categoryService.deleteCategory(categoryId)
        await loadCategories()
        await loadStats()
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete category')
      }
    }
  }

  const renderCategoryRow = (category: Category, isSubcategory = false) => (
    <TableRow key={category.id} className={isSubcategory ? 'bg-gray-50' : ''}>
      <TableCell>
        <div className="flex items-center">
          {!isSubcategory && category.subcategories.length > 0 && (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              <svg
                className={`w-4 h-4 transition-transform ${
                  expandedCategories.has(category.id) ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <div className="flex items-center space-x-3">
            {/* Category/Subcategory Image */}
            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/assets/images/categories/cs1.jpg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
              )}
            </div>
            
            <div className={isSubcategory ? 'ml-6' : ''}>
              <div className="text-sm font-medium text-gray-900">{category.name}</div>
              <div className="text-sm text-gray-500">{category.slug}</div>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-900 max-w-xs truncate" title={category.description}>
          {category.description}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-sm font-medium text-gray-900">{category.productCount}</span>
      </TableCell>
      <TableCell>
        <Badge 
          variant={category.status === 'ACTIVE' ? 'default' : 'secondary'}
          className={category.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' : ''}
        >
          {category.status.toLowerCase()}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-gray-500">
        {new Date(category.updatedAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          {hasPermission('view_categories') && (
            <Link href={`/admin/dashboard/categories/view/${category.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {hasPermission('edit_categories') && (
            <Link href={`/admin/dashboard/categories/edit/${category.id}`}>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {hasPermission('delete_categories') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(category.id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600">Manage your product categories and subcategories</p>
        </div>
        {hasPermission('create_categories') && (
          <Link href="/admin/dashboard/categories/add">
            <Button className="bg-[#313131] text-white hover:bg-[#222222]">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </Link>
        )}
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
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dropdown
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' }
                ]}
                onChange={(value) => setStatusFilter(value as 'all' | 'ACTIVE' | 'INACTIVE')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Categories List</CardTitle>
            <span className="text-sm text-slate-500">
              Showing {filteredCategories.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCategories.length)} of {filteredCategories.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
              <span className="ml-3 text-gray-600">Loading categories...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="text-gray-500">
                        <p className="text-lg font-medium">No categories found</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCategories.map((category) => (
                    <React.Fragment key={category.id}>
                      {renderCategoryRow(category)}
                      {expandedCategories.has(category.id) &&
                        category.subcategories.map((subcategory) =>
                          renderCategoryRow(subcategory, true)
                        )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm p-4 border-t border-gray-200">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats?.total || 0}</div>
              <div className="text-sm text-gray-500">Main Categories</div>
              <div className="text-xs text-gray-400 mt-1">Root level categories</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.active || 0}
              </div>
              <div className="text-sm text-gray-500">Active Categories</div>
              <div className="text-xs text-gray-400 mt-1">Currently visible</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.subcategories || 0}
              </div>
              <div className="text-sm text-gray-500">Total Subcategories</div>
              <div className="text-xs text-gray-400 mt-1">Nested under main categories</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {categories.reduce((sum, c) => sum + c.productCount, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Products</div>
              <div className="text-xs text-gray-400 mt-1">Across all categories</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}