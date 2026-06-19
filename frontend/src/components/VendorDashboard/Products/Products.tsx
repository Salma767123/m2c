'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import { Plus, Edit, Eye, Trash2, ChevronLeft, ChevronRight, Search, Package, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { productService, type Product, type ProductStats } from '@/services/productService'
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'
import Dropdown from '@/components/UI/Dropdown'
import DateRangeCalendar from '@/components/Shared/DateRangeCalendar'

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

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cardFilter, setCardFilter] = useState<'all' | 'active' | 'pending' | 'out'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; product: Product | null; loading: boolean }>({
    show: false, product: null, loading: false
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10
  });

  // Load products
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (page = 1) => {
    setIsLoading(true);
    try {
      const [response, statsResponse] = await Promise.all([
        productService.getProducts({ page, limit: 10 }),
        productService.getProductStats(),
      ]);
      if (response.success) {
        setProducts(response.data.items);
        setPagination(response.data.pagination);
      }
      if (statsResponse.success && statsResponse.data) {
        setProductStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showErrorToast('Load Failed', error instanceof Error ? error.message : 'Unable to load products');
    } finally {
      setIsLoading(false);
    }
  };

  // Stats
  const totalProducts = productStats?.totalProducts ?? products.length;
  const activeProducts = productStats?.activeProducts ?? 0;
  const pendingProducts = productStats?.pendingProducts ?? 0;
  const outOfStockProducts = productStats?.outOfStockProducts ?? 0;

  // Categories for filter (derived from loaded products)
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Client-side filters over the loaded page (card click, search, status, category, date added)
  const displayedProducts = products.filter((p) => {
    if (cardFilter === 'active' && p.status !== 'ACTIVE') return false;
    if (cardFilter === 'pending' && p.approvalStatus !== 'PENDING') return false;
    if (cardFilter === 'out' && p.status !== 'OUT_OF_STOCK') return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!(p.name?.toLowerCase().includes(q) || p.baseSku?.toLowerCase().includes(q))) return false;
    }
    // Date filter: a full range filters between both endpoints; a single
    // selected date (only one endpoint) filters to that exact day.
    if (dateFrom || dateTo) {
      if (!p.createdAt) return false;
      const start = dateFrom || dateTo;
      const end = dateTo || dateFrom;
      const c = new Date(p.createdAt);
      const day = new Date(c.getFullYear(), c.getMonth(), c.getDate());
      if (day < new Date(start + 'T00:00:00')) return false;
      if (day > new Date(end + 'T23:59:59')) return false;
    }
    return true;
  });

  const handleAddProduct = () => {
    router.push('/vendor/dashboard/products/add');
  };

  const handleViewProduct = (product: Product) => {
    router.push(`/vendor/dashboard/products/${product.id}`);
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/vendor/dashboard/products/edit/${product.id}`);
  };

  const handleDeleteProduct = (product: Product) => {
    setDeleteModal({ show: true, product, loading: false });
  };

  const confirmDeleteProduct = async () => {
    if (!deleteModal.product) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      const response = await productService.deleteProduct(deleteModal.product.id);
      if (response.success) {
        showSuccessToast('Product Deleted', 'Product has been deleted successfully');
        loadProducts(pagination.currentPage);
      }
    } catch (error) {
      showErrorToast('Delete Failed', error instanceof Error ? error.message : 'Unable to delete product');
    } finally {
      setDeleteModal({ show: false, product: null, loading: false });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Products</h1>
            <p className="text-slate-600">Manage your product catalog</p>
          </div>
          <Button
            onClick={handleAddProduct}
            className="bg-brand-500 text-white text-base font-semibold hover:bg-[#313131]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
        <Card className="border border-slate-200">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
              <span className="ml-3 text-slate-600">Loading products...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Products</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your product catalog</p>
          </div>
          <Button
            onClick={handleAddProduct}
            className="bg-brand-500 text-white font-semibold hover:bg-brand-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Product Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setCardFilter('all')}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-brand-200 ${cardFilter === 'all' ? 'border-brand-300 ring-1 ring-brand-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Total Products</span>
            <div className="p-2 bg-brand-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Package className="h-4 w-4 text-brand-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalProducts}</p>
          <p className="text-xs text-slate-500 mt-1">All products</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter((f) => (f === 'active' ? 'all' : 'active'))}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-green-200 ${cardFilter === 'active' ? 'border-green-300 ring-1 ring-green-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Active</span>
            <div className="p-2 bg-green-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${activeProducts > 0 ? 'text-green-600' : 'text-slate-900'}`}>{activeProducts}</p>
          <p className="text-xs text-slate-500 mt-1">Live in catalog</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter((f) => (f === 'pending' ? 'all' : 'pending'))}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-yellow-200 ${cardFilter === 'pending' ? 'border-yellow-300 ring-1 ring-yellow-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Pending Approval</span>
            <div className="p-2 bg-yellow-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${pendingProducts > 0 ? 'text-yellow-600' : 'text-slate-900'}`}>{pendingProducts}</p>
          <p className="text-xs text-slate-500 mt-1">Awaiting review</p>
        </button>
        <button
          type="button"
          onClick={() => setCardFilter((f) => (f === 'out' ? 'all' : 'out'))}
          className={`group text-left bg-white rounded-xl border shadow-xs p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-red-200 ${cardFilter === 'out' ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200/80'}`}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-slate-600">Out of Stock</span>
            <div className="p-2 bg-red-50 rounded-xl transition-transform duration-200 group-hover:scale-110">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </div>
          <p className={`text-xl font-bold mt-2 ${outOfStockProducts > 0 ? 'text-red-600' : 'text-slate-900'}`}>{outOfStockProducts}</p>
          <p className="text-xs text-slate-500 mt-1">Need restocking</p>
        </button>
      </div>

      {/* Filters */}
      <div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <Dropdown
              id="statusFilter"
              value={statusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'OUT_OF_STOCK', label: 'Out of Stock' }
              ]}
              onChange={(value) => setStatusFilter(value as 'all' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK')}
            />
            <Dropdown
              id="categoryFilter"
              value={categoryFilter}
              options={categories.map(cat => ({
                value: cat,
                label: cat === 'all' ? 'All Categories' : cat
              }))}
              onChange={(value) => setCategoryFilter(value as string)}
            />
            <DateRangeCalendar
              from={dateFrom}
              to={dateTo}
              placeholder="Date Added"
              onChange={(f, t) => { setDateFrom(f); setDateTo(t) }}
            />
          </div>
        </div>
      </div>

      {/* Results summary */}
      {displayedProducts.length > 0 && (
        <p className="text-sm text-slate-500">
          Showing {displayedProducts.length} product{displayedProducts.length === 1 ? '' : 's'}
          {cardFilter === 'active' ? ' • Active' : cardFilter === 'pending' ? ' • Pending Approval' : cardFilter === 'out' ? ' • Out of Stock' : ''}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {displayedProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">No products found</p>
              <Button onClick={handleAddProduct} className="bg-brand-500 text-white hover:bg-[#313131]">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="!bg-slate-50/80 !border-slate-200/80 [&_tr]:border-b [&_tr]:border-slate-200/80 [&_th]:!text-slate-500 [&_th]:font-bold [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:h-11">
                <TableRow className="!bg-slate-50/80 hover:!bg-slate-50/80">
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedProducts.map((product) => (
                  <TableRow key={product.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{product.baseSku}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-medium">{product.category}</span>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">
                      ₹{product.basePrice.toFixed(2)}
                      {product.hasVariants && product.variants && product.variants.length > 0 && (
                        <div className="text-xs text-slate-500">
                          Range: ₹{Math.min(...product.variants.map(v => v.price)).toFixed(2)} - ₹{Math.max(...product.variants.map(v => v.price)).toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const stock = product.hasVariants && product.variants
                          ? product.variants.reduce((sum, v) => sum + v.stock, 0)
                          : product.totalStock;
                        return (
                          <span className={`font-semibold ${stock === 0 ? 'text-red-600' : stock < 10 ? 'text-orange-600' : 'text-slate-900'}`}>
                            {stock}
                            {stock > 0 && stock < 10 ? <span className="text-xs font-normal text-orange-500 ml-1">Low</span> : null}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap capitalize ${product.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : product.status === 'INACTIVE'
                            ? 'bg-slate-50 text-slate-700 border-slate-200'
                            : product.status === 'OUT_OF_STOCK'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                        {product.status?.toLowerCase().replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap capitalize ${product.approvalStatus === 'APPROVED'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : product.approvalStatus === 'REINSPECTION'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                          {product.approvalStatus === 'REINSPECTION' ? 'Reinspection Required' : product.approvalStatus?.toLowerCase()}
                        </span>
                        {product.approvalStatus === 'REJECTED' && product.rejectionReason && (
                          <div className="text-xs text-red-600 max-w-40 truncate mt-0.5" title={product.rejectionReason}>
                            {product.rejectionReason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {product.hasVariants ? `${product.variants?.length || 0} variants` : 'No variants'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewProduct(product)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (product.approvalStatus === 'APPROVED') {
                              showWarningToast('Edit Restricted', 'This product has been approved. Only admin can edit the product.')
                            } else {
                              handleEditProduct(product)
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${product.approvalStatus === 'APPROVED' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-brand-500 hover:bg-brand-50'}`}
                          title={product.approvalStatus === 'APPROVED' ? 'Approved — admin only' : 'Edit'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (product.approvalStatus === 'APPROVED') {
                              showWarningToast('Delete Restricted', 'This product has been approved. Only admin can delete the product.')
                            } else {
                              handleDeleteProduct(product)
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${product.approvalStatus === 'APPROVED' ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}
                          title={product.approvalStatus === 'APPROVED' ? 'Approved — admin only' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-slate-200">
              <div className="flex items-center gap-1">
                <button onClick={() => loadProducts(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                {getPageRange(pagination.currentPage, pagination.totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => loadProducts(p as number)} aria-current={p === pagination.currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === pagination.currentPage ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                <button onClick={() => loadProducts(pagination.currentPage + 1)} disabled={!pagination.hasNextPage} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        show={deleteModal.show}
        title="Delete Product"
        itemName={deleteModal.product?.name}
        itemDetail={deleteModal.product?.baseSku ? `SKU: ${deleteModal.product.baseSku}` : undefined}
        loading={deleteModal.loading}
        confirmLabel="Delete Permanently"
        onConfirm={confirmDeleteProduct}
        onCancel={() => setDeleteModal({ show: false, product: null, loading: false })}
      />
    </div>
  )
}
