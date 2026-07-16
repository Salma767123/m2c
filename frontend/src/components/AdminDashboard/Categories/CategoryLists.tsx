'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar, { fmtDate } from '@/components/Shared/DateRangeCalendar'
import { Plus, Edit, Trash2, Eye, Search, Filter, ChevronLeft, ChevronRight, GripVertical, Folders, CheckCircle, XCircle, GitMerge, Layers, Package } from 'lucide-react'
import Link from 'next/link'
import { categoryService, Category, CategoryStats } from '@/services/categoryService'
import { hasPermission } from '@/lib/auth'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'
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

// Vendor-proposed categories sit in PENDING until an admin approves or merges
// them (they are never shown on the website), so they get their own badge.
function getCategoryStatusBadge(status: Category['status']) {
  if (status === 'PENDING') {
    return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Pending Review</Badge>
  }
  if (status === 'ACTIVE') {
    return <Badge className="bg-green-50 text-green-700 border border-green-200">active</Badge>
  }
  return <Badge variant="secondary">inactive</Badge>
}

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'ACTIVE' | 'INACTIVE'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
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

  // Date filtering is client-side, so just reset the page (no server reload).
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFrom, dateTo])

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

  // Filter categories based on search, status and last-updated date
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || category.status === statusFilter

    let matchesDate = true
    if (dateFrom || dateTo) {
      const d = category.updatedAt ? fmtDate(new Date(category.updatedAt)) : ''
      if (!d) matchesDate = false
      else if (dateFrom && d < dateFrom) matchesDate = false
      else if (dateTo && d > dateTo) matchesDate = false
    }
    return matchesSearch && matchesStatus && matchesDate
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

  // ── Vendor-proposed (PENDING) category review ────────────────────────────
  const [pendingBusyId, setPendingBusyId] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState<Category | null>(null)
  const [mergeIntoId, setMergeIntoId] = useState('')

  const refresh = async () => { await loadCategories(); await loadStats() }

  const handleApprovePending = async (category: Category) => {
    try {
      setPendingBusyId(category.id)
      const res = await categoryService.approvePendingCategory(category.id)
      showSuccessToast('Category Approved', res.message)
      await refresh()
    } catch (error: any) {
      showErrorToast('Approve Failed', error?.response?.data?.error || error?.message || 'Failed to approve category')
    } finally {
      setPendingBusyId(null)
    }
  }

  const handleRejectPending = async (category: Category) => {
    try {
      setPendingBusyId(category.id)
      const res = await categoryService.rejectPendingCategory(category.id)
      showSuccessToast('Category Rejected', res.message)
      await refresh()
    } catch (error: any) {
      showErrorToast('Reject Failed', error?.response?.data?.error || error?.message || 'Failed to reject category')
    } finally {
      setPendingBusyId(null)
    }
  }

  const confirmMerge = async () => {
    if (!mergeTarget || !mergeIntoId) return
    try {
      setPendingBusyId(mergeTarget.id)
      const res = await categoryService.mergePendingCategory(mergeTarget.id, mergeIntoId)
      showSuccessToast('Category Merged', res.message)
      setMergeTarget(null)
      setMergeIntoId('')
      await refresh()
    } catch (error: any) {
      showErrorToast('Merge Failed', error?.response?.data?.error || error?.message || 'Failed to merge category')
    } finally {
      setPendingBusyId(null)
    }
  }

  // Merge targets: any live (ACTIVE) category other than the one being merged.
  const mergeOptions = categories
    .filter((c) => c.status === 'ACTIVE' && c.id !== mergeTarget?.id)
    .map((c) => ({ value: c.id, label: c.name }))

  // Rendered inside both row variants (plain + drag-sortable) so the review
  // actions only ever exist in one place.
  const renderPendingActions = (category: Category) => {
    if (category.status !== 'PENDING') return null
    const busy = pendingBusyId === category.id
    return (
      <>
        {hasPermission('categories:edit') && (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              title="Approve — publish this vendor-proposed category"
              onClick={() => handleApprovePending(category)}
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              title="Merge into an existing category"
              onClick={() => { setMergeTarget(category); setMergeIntoId('') }}
              className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 transition-colors"
            >
              <GitMerge className="h-4 w-4" />
            </Button>
          </>
        )}
        {hasPermission('categories:delete') && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            title="Reject this vendor-proposed category"
            onClick={() => handleRejectPending(category)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </>
    )
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
        <TableRow key={category.id} className={isSubcategory ? 'bg-slate-50' : ''}>
          <TableCell className="text-center">
            <span className="text-sm font-medium text-slate-500">{category.sortOrder}</span>
          </TableCell>
          <TableCell>
            <div className="flex items-center">
              {!isSubcategory && category.subcategories.length > 0 && (
                <button
                  onClick={() => toggleExpanded(category.id)}
                  className="mr-2 p-1 hover:bg-slate-200 rounded"
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
                <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0">
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
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <div className="w-4 h-4 bg-slate-300 rounded"></div>
                    </div>
                  )}
                </div>
                
                <div className={isSubcategory ? 'ml-6' : ''}>
                  <div className="text-sm font-medium text-slate-900">{category.name}</div>
                  <div className="text-sm text-slate-500">{category.slug}</div>
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div className="text-sm text-slate-900 max-w-xs truncate" title={category.description}>
              {category.description}
            </div>
          </TableCell>
          <TableCell className="text-center">
            <span className="text-sm font-medium text-slate-900">{category.productCount}</span>
          </TableCell>
          <TableCell>
            {getCategoryStatusBadge(category.status)}
          </TableCell>
          <TableCell className="text-sm text-slate-500">
            {new Date(category.updatedAt).toLocaleDateString()}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end space-x-2">
              {renderPendingActions(category)}
              {hasPermission('categories:view') && (
                <Link href={`/admin/dashboard/categories/view/${category.id}`}>
                  <Button variant="ghost" size="sm" title="View Details" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {hasPermission('categories:edit') && (
                <Link href={`/admin/dashboard/categories/edit/${category.id}`}>
                  <Button variant="ghost" size="sm" title="Edit Category" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {hasPermission('categories:delete') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(category)}
                  title="Delete Category"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      )
    }

    return <SortableCategoryRow key={category.id} category={category} toggleExpanded={toggleExpanded} expandedCategories={expandedCategories} handleDeleteClick={handleDeleteClick} renderPendingActions={renderPendingActions} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-600">Manage your product categories and subcategories</p>
        </div>
        {hasPermission('categories:create') && (
          <Link href="/admin/dashboard/categories/add">
            <Button className="bg-brand-500 text-white hover:bg-brand-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </Link>
        )}
      </div>

      {/* Summary Stats — styled like the Vendor Product Requests metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Main Categories',     subtitle: 'Root level categories',        value: stats?.total || 0,        Icon: Folders,     iconBg: 'bg-brand-50',   iconColor: 'text-brand-500',   countColor: 'text-slate-900' },
          { label: 'Active Categories',   subtitle: 'Currently visible',            value: stats?.active || 0,       Icon: CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', countColor: 'text-emerald-700' },
          { label: 'Total Subcategories', subtitle: 'Nested under main categories',  value: stats?.subcategories || 0, Icon: Layers,      iconBg: 'bg-blue-50',    iconColor: 'text-blue-500',    countColor: 'text-blue-700' },
          { label: 'Total Products',      subtitle: 'Across all categories',        value: categories.reduce((sum, c) => sum + c.productCount, 0), Icon: Package, iconBg: 'bg-purple-50', iconColor: 'text-purple-500', countColor: 'text-purple-700' },
        ].map(({ label, subtitle, value, Icon, iconBg, iconColor, countColor }) => (
          <div key={label} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="flex flex-row items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <div className={`p-1.5 rounded-lg ${iconBg}`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className={`text-2xl font-bold ${countColor}`}>{value}</div>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DateRangeCalendar
                from={dateFrom}
                to={dateTo}
                placeholder="Last Updated"
                onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
              />
              <Dropdown
                value={statusFilter}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'PENDING', label: 'Pending Review' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' }
                ]}
                onChange={(value) => setStatusFilter(value as 'all' | 'PENDING' | 'ACTIVE' | 'INACTIVE')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
              <span className="ml-3 text-slate-600">Loading categories...</span>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader className="!bg-brand-500/[0.06] !border-0 [&_tr]:border-b [&_tr]:border-brand-100/50 [&_th]:!text-brand-500/60 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
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
                        <div className="text-slate-500">
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
          <div className="flex items-center justify-end gap-3 text-sm p-4 border-t border-slate-200">
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
              {getPageRange(currentPage, totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => setCurrentPage(p as number)} aria-current={p === currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
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

      {/* Merge a vendor-proposed category into an existing one — every product
          on the pending name is repointed at the target, then it is dropped. */}
      {mergeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setMergeTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Merge Category</h3>
            <p className="mt-1 text-sm text-slate-500">
              Move <span className="font-semibold text-slate-700">&quot;{mergeTarget.name}&quot;</span> into an existing
              category. Its {mergeTarget.productCount} product(s) will be re-assigned and the proposed
              category removed.
            </p>

            <label className="mt-4 block text-sm font-medium text-slate-700 mb-2">Merge into</label>
            <Dropdown
              value={mergeIntoId}
              options={mergeOptions}
              placeholder={mergeOptions.length ? 'Select a category' : 'No active categories available'}
              onChange={(v) => setMergeIntoId((Array.isArray(v) ? v[0] : v) || '')}
            />

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setMergeTarget(null)}
                className="border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-colors"
              >
                Cancel
              </Button>
              <Button
                disabled={!mergeIntoId || pendingBusyId === mergeTarget.id}
                onClick={confirmMerge}
                className="bg-brand-500 text-white hover:bg-brand-600 hover:shadow-md hover:shadow-brand-500/30 active:bg-brand-700 transition-all"
              >
                <GitMerge className="h-4 w-4 mr-2" />
                {pendingBusyId === mergeTarget.id ? 'Merging…' : 'Merge'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SortableCategoryRow({ category, toggleExpanded, expandedCategories, handleDeleteClick, renderPendingActions }: any) {
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
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1.5 bg-white border border-slate-300 shadow-sm hover:bg-slate-50 rounded-md text-slate-700 transition-colors" title="Drag to reorder">
            <GripVertical size={16} />
          </div>
          <span className="text-sm font-semibold text-slate-700 min-w-[20px] text-center">{category.sortOrder}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center">
          {category.subcategories && category.subcategories.length > 0 && (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="mr-2 p-1 hover:bg-slate-200 rounded"
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
            <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden shrink-0">
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
                <div className="w-full h-full flex items-center justify-center bg-slate-50">
                  <div className="w-4 h-4 bg-slate-300 rounded"></div>
                </div>
              )}
            </div>
            
            <div>
              <div className="text-sm font-medium text-slate-900">{category.name}</div>
              <div className="text-sm text-slate-500">{category.slug}</div>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-slate-900 max-w-xs truncate" title={category.description}>
          {category.description}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-sm font-medium text-slate-900">{category.productCount}</span>
      </TableCell>
      <TableCell>
        {getCategoryStatusBadge(category.status)}
      </TableCell>
      <TableCell className="text-sm text-slate-500">
        {new Date(category.updatedAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          {renderPendingActions?.(category)}
          {hasPermission('categories:view') && (
            <Link href={`/admin/dashboard/categories/view/${category.id}`}>
              <Button variant="ghost" size="sm" title="View Details" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {hasPermission('categories:edit') && (
            <Link href={`/admin/dashboard/categories/edit/${category.id}`}>
              <Button variant="ghost" size="sm" title="Edit Category" className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {hasPermission('categories:delete') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(category)}
              title="Delete Category"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}