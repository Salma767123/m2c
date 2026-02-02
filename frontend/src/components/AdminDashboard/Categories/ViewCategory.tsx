'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Badge } from '@/components/UI/Badge'
import { Button } from '@/components/UI/Button'
import { Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { categoryService, Category } from '@/services/categoryService'

interface ViewCategoryProps {
  categoryId: string
}

export default function ViewCategory({ categoryId }: ViewCategoryProps) {
  const router = useRouter()
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCategory()
  }, [categoryId])

  const loadCategory = async () => {
    try {
      setLoading(true)
      const response = await categoryService.getCategoryById(categoryId)
      setCategory(response.data)
    } catch (err) {
      console.error('Failed to load category:', err)
      setError(err instanceof Error ? err.message : 'Failed to load category')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!category) return
    
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await categoryService.deleteCategory(category.id)
        router.push('/admin/dashboard/categories')
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete category')
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
            <span className="ml-3 text-gray-600">Loading category...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !category) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error ? 'Error Loading Category' : 'Category Not Found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "The category you're looking for doesn't exist or has been removed."}
          </p>
          <Button onClick={() => router.push('/admin/dashboard/categories')}>
            Back to Categories
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Link href={`/admin/dashboard/categories/edit/${category.id}`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Category
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-800">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                  <p className="text-gray-900">{category.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug</label>
                  <p className="text-gray-900 font-mono text-sm">{category.slug}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900">{category.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Badge 
                    variant={category.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={category.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                  >
                    {category.status.toLowerCase()}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <p className="text-gray-900">{category.sortOrder}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Count</label>
                  <p className="text-gray-900 font-semibold">{category.productCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO Information */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                <p className="text-gray-900">{category.metaTitle || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                <p className="text-gray-900">{category.metaDescription || 'Not set'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subcategories */}
          <Card>
            <CardHeader>
              <CardTitle>Subcategories ({category.subcategories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {category.subcategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col space-y-3">
                        {/* Subcategory Image */}
                        <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                          {subcategory.image ? (
                            <img
                              src={subcategory.image}
                              alt={subcategory.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Handle broken images
                                const target = e.target as HTMLImageElement;
                                target.src = '/assets/images/categories/cs1.jpg'; // Fallback image
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50">
                              <div className="text-center">
                                <div className="w-8 h-8 mx-auto mb-2 bg-gray-300 rounded"></div>
                                <p className="text-xs text-gray-500">No image</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Subcategory Info */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 truncate">{subcategory.name}</h4>
                            <Badge 
                              variant={subcategory.status === 'ACTIVE' ? 'default' : 'secondary'}
                              className={subcategory.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                            >
                              {subcategory.status.toLowerCase()}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical' as const,
                            lineHeight: '1.4em',
                            maxHeight: '2.8em'
                          }}>{subcategory.description}</p>
                          
                          <div className="space-y-1 text-xs text-gray-500">
                            <div className="flex justify-between">
                              <span>Slug:</span>
                              <span className="font-mono">{subcategory.slug}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Products:</span>
                              <span className="font-medium">{subcategory.productCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Sort Order:</span>
                              <span>{subcategory.sortOrder}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Updated:</span>
                              <span>{new Date(subcategory.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <Link href={`/admin/dashboard/categories/view/${subcategory.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                              View Details
                            </Button>
                          </Link>
                          <Link href={`/admin/dashboard/categories/edit/${subcategory.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No subcategories found</p>
                  <p className="text-gray-400 text-sm mt-1">Add subcategories to organize your products better</p>
                  <Link href={`/admin/dashboard/categories/edit/${category.id}`} className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      Add Subcategories
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category Image */}
          <Card>
            <CardHeader>
              <CardTitle>Category Image</CardTitle>
            </CardHeader>
            <CardContent>
              {category.image ? (
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-48 object-cover rounded-lg border"
                  onError={(e) => {
                    // Handle broken images
                    const target = e.target as HTMLImageElement;
                    target.src = '/assets/images/categories/cs1.jpg'; // Fallback image
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                  <p className="text-gray-500">No image uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Products:</span>
                <span className="font-medium">{category.productCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subcategories:</span>
                <span className="font-medium">{category.subcategories.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Subcategories:</span>
                <span className="font-medium">
                  {category.subcategories.filter(sub => sub.status === 'ACTIVE').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">{new Date(category.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium">{new Date(category.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}