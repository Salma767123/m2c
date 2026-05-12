'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import { Plus, Edit, Trash2, Eye, Search, Filter, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { categoryService, Category, CategoryStats } from '@/services/categoryService'
import { hasPermission } from '@/lib/auth'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'
import { useToast } from '@/hooks/use-toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before drag starts, allows clicks to pass through
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const handleDeleteClick = (category: Category) => {
    setDeleteTarget({ id: category.id, name: category.name })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await categoryService.deleteCategory(deleteTarget.id)
      await loadCategories()
      await loadStats()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete category')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Optimistic update
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      
      // Extract the exact sort orders currently in the list
      const currentSortOrders = categories.map(c => c.sortOrder ?? 0).sort((a, b) => a - b);
      
      // Assign these exact sort orders back to the newly arranged items
      const updatedCategories = newCategories.map((c, index) => ({
        ...c,
        sortOrder: currentSortOrders[index]
      }));

      setCategories(updatedCategories);

      const categoryOrders = updatedCategories.map((c) => ({
        id: c.id,
        sortOrder: c.sortOrder
      }));

      try {
        await categoryService.reorderCategories(categoryOrders);
        toast({
          title: "Categories Reordered",
          description: "The sort order has been successfully updated.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reorder categories. Reverting...",
          variant: "destructive"
        });
        loadCategories(); // Revert on failure
      }
    }
  }

  // Can only drag if no search is active and we are sorted by default (all status)
  const canDrag = !searchTerm && statusFilter === 'all';

  const renderCategoryRow = (category: Category, isSubcategory = false) => {
    if (isSubcategory || !canDrag) {
      return (
        <TableRow key={category.id} className={isSubcategory ? 'bg-gray-50' : ''}>
          <TableCell className="text-center">
            <span className="text-sm font-medium text-gray-500">{category.sortOrder}</span>
          </TableCell>
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
                  onClick={() => handleDeleteClick(category)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      )
    }

    return <SortableCategoryRow key={category.id} category={category} toggleExpanded={toggleExpanded} expandedCategories={expandedCategories} handleDeleteClick={handleDeleteClick} />;
  }

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

      {/* Showing */}
      {filteredCategories.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCategories.length)} of {filteredCategories.length}</span>
        </div>
      )}

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
              <span className="ml-3 text-gray-600">Loading categories...</span>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] pl-6">Order</TableHead>
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
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="text-gray-500">
                          <p className="text-lg font-medium">No categories found</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext
                      items={paginatedCategories.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {paginatedCategories.map((category) => (
                        <React.Fragment key={category.id}>
                          {renderCategoryRow(category)}
                          {expandedCategories.has(category.id) &&
                            category.subcategories.map((subcategory) =>
                              renderCategoryRow(subcategory, true)
                            )}
                        </React.Fragment>
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
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

      <DeleteConfirmModal
        show={!!deleteTarget}
        title="Delete Category"
        itemName={deleteTarget?.name || ''}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function SortableCategoryRow({ category, toggleExpanded, expandedCategories, handleDeleteClick }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative' as any, zIndex: 9999, opacity: 0.8, boxShadow: '0 5px 15px rgba(0,0,0,0.1)', background: 'white' } : {}),
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-white' : ''}>
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 rounded-md text-gray-700 transition-colors" title="Drag to reorder">
            <GripVertical size={16} />
          </div>
          <span className="text-sm font-semibold text-gray-700 min-w-[20px] text-center">{category.sortOrder}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          {category.subcategories && category.subcategories.length > 0 && (
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
            
            <div>
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
              onClick={() => handleDeleteClick(category)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}