'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import { Plus, Edit, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { productService, type Product } from '@/services/productService'
import { showSuccessToast, showErrorToast, showWarningToast } from '@/lib/toast-utils'
import DeleteConfirmModal from '@/components/UI/DeleteConfirmModal'

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
  const [isLoading, setIsLoading] = useState(true);
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
      const response = await productService.getProducts({ page, limit: 10 });
      if (response.success) {
        setProducts(response.data.items);
        setPagination(response.data.pagination);
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      showErrorToast('Load Failed', error.message || 'Unable to load products');
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error: any) {
      showErrorToast('Delete Failed', error.message || 'Unable to delete product');
    } finally {
      setDeleteModal({ show: false, product: null, loading: false });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#222222]">My Products</h1>
            <p className="text-slate-600">Manage your product catalog</p>
          </div>
          <Button
            onClick={handleAddProduct}
            className="bg-[#222222] text-white text-base font-semibold hover:bg-[#313131]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
        <Card className="border border-gray-200">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
              <span className="ml-3 text-gray-600">Loading products...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#222222]">My Products</h1>
          <p className="text-slate-600">Manage your product catalog</p>
        </div>
        <Button
          onClick={handleAddProduct}
          className="bg-[#222222] text-white text-base font-semibold hover:bg-[#313131]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Results summary */}
      {products.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
          <span>
            Showing {((pagination.currentPage - 1) * 10) + 1}–{Math.min(pagination.currentPage * 10, pagination.totalItems)} of {pagination.totalItems} product{pagination.totalItems === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <Card className="border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="text-[#222222]">Product Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No products found</p>
              <Button onClick={handleAddProduct} className="bg-[#222222] text-white hover:bg-[#313131]">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Product
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium text-[#222222]">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.baseSku}</div>
                    </TableCell>
                    <TableCell className="text-slate-600">{product.category}</TableCell>
                    <TableCell className="font-medium text-gray-700">
                      ₹{product.basePrice.toFixed(2)}
                      {product.hasVariants && product.variants && product.variants.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Range: ₹{Math.min(...product.variants.map(v => v.price)).toFixed(2)} - ₹{Math.max(...product.variants.map(v => v.price)).toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={product.totalStock === 0 ? 'text-red-600' : 'text-[#222222]'}>
                        {product.hasVariants && product.variants
                          ? product.variants.reduce((sum, v) => sum + v.stock, 0)
                          : product.totalStock
                        }
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${product.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : product.status === 'INACTIVE'
                            ? 'bg-gray-100 text-gray-800'
                            : product.status === 'OUT_OF_STOCK'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                        {product.status?.toLowerCase().replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${product.approvalStatus === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : product.approvalStatus === 'REINSPECTION'
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          {product.approvalStatus === 'REINSPECTION' ? 'Reinspection Required' : product.approvalStatus?.toLowerCase()}
                        </span>
                        {product.approvalStatus === 'REJECTED' && product.rejectionReason && (
                          <div className="text-xs text-red-600 max-w-32 truncate" title={product.rejectionReason}>
                            {product.rejectionReason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {product.hasVariants ? `${product.variants?.length || 0} variants` : 'No variants'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-50 hover:text-[#222222]"
                          onClick={() => handleViewProduct(product)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-gray-50 hover:text-[#222222]"
                          onClick={() => {
                            if (product.approvalStatus === 'APPROVED') {
                              showWarningToast('Edit Restricted', 'This product has been approved. Only admin can edit the product.')
                            } else {
                              handleEditProduct(product)
                            }
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-700 hover:bg-gray-50 hover:text-red-600"
                          onClick={() => {
                            if (product.approvalStatus === 'APPROVED') {
                              showWarningToast('Delete Restricted', 'This product has been approved. Only admin can delete the product.')
                            } else {
                              handleDeleteProduct(product)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-end gap-3 text-sm px-5 py-3 border-t border-gray-200">
              <div className="flex items-center gap-1">
                <button onClick={() => loadProducts(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
                {getPageRange(pagination.currentPage, pagination.totalPages).map((p, i) => p === '…' ? (<span key={`e-${i}`} className="px-2 text-slate-400">…</span>) : (<button key={`p-${p}`} onClick={() => loadProducts(p as number)} aria-current={p === pagination.currentPage ? 'page' : undefined} className={`min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${p === pagination.currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{p}</button>))}
                <button onClick={() => loadProducts(pagination.currentPage + 1)} disabled={!pagination.hasNextPage} className="p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed" aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
