'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Button } from '@/components/UI/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table'
import { Plus, Edit, Eye, Trash2 } from 'lucide-react'
import { productService, type Product } from '@/services/productService'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const handleEditProduct = (product: Product) => {
    router.push(`/vendor/dashboard/products/edit/${product.id}`);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await productService.deleteProduct(id);
        if (response.success) {
          showSuccessToast('Product Deleted', 'Product has been deleted successfully');
          loadProducts(pagination.currentPage); // Reload current page
        }
      } catch (error: any) {
        showErrorToast('Delete Failed', error.message || 'Unable to delete product');
      }
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
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                        product.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : product.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {product.hasVariants ? `${product.variants?.length || 0} variants` : 'No variants'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="hover:bg-gray-50 hover:text-[#222222]">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:bg-gray-50 hover:text-[#222222]"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-700 hover:bg-gray-50 hover:text-red-600"
                          onClick={() => handleDeleteProduct(product.id)}
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
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} of {pagination.totalItems} products
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadProducts(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadProducts(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
