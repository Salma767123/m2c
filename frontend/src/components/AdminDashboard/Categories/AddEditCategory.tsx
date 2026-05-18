'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/UI/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import Dropdown from '@/components/UI/Dropdown'
import { ArrowLeft, Save, X, Plus, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { categoryService, Category, CategoryFormData, SubcategoryFormData } from '@/services/categoryService'
import { useToast } from '@/hooks/use-toast'
 
interface AddEditCategoryProps {
  categoryId?: string
  isEdit?: boolean
}

export default function AddEditCategory({ categoryId, isEdit = false }: AddEditCategoryProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(isEdit)
  const [activeTab, setActiveTab] = useState<'category' | 'subcategories'>('category')

  const [categoryData, setCategoryData] = useState<CategoryFormData>({
    name: '',
    description: '',
    slug: '',
    status: 'ACTIVE',
    image: '', // You can test with: '/assets/images/categories/cs1.jpg'
    metaTitle: '',
    metaDescription: '',
    sortOrder: 0
  })

  const [subcategories, setSubcategories] = useState<SubcategoryFormData[]>([])
  const [newSubcategory, setNewSubcategory] = useState<SubcategoryFormData>({
    name: '',
    description: '',
    slug: '',
    status: 'ACTIVE',
    sortOrder: 0
  })

  // Load category data for editing
  useEffect(() => {
    if (isEdit && categoryId) {
      loadCategoryData()
    }
  }, [isEdit, categoryId])

  const loadCategoryData = async () => {
    if (!categoryId) return
    
    setIsLoadingData(true)
    try {
      const response = await categoryService.getCategoryById(categoryId)
      const category = response.data
      
      setCategoryData({
        name: category.name,
        description: category.description,
        slug: category.slug,
        status: category.status,
        image: category.image || '',
        metaTitle: category.metaTitle || '',
        metaDescription: category.metaDescription || '',
        sortOrder: category.sortOrder
      })

      // Set subcategories
      setSubcategories(category.subcategories.map(sub => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        slug: sub.slug,
        status: sub.status,
        image: sub.image,
        sortOrder: sub.sortOrder
      })))
    } catch (error) {
      console.error('Error loading category data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return categoryService.generateSlug(name)
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setCategoryData(prev => ({
      ...prev,
      [name]: name === 'sortOrder' ? parseInt(value) || 0 : value,
      ...(name === 'name' && { slug: generateSlug(value) })
    }))
  }

  const handleNewSubcategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    console.log('Subcategory input changed:', name, value)
    setNewSubcategory(prev => {
      const updated = {
        ...prev,
        [name]: name === 'sortOrder' ? parseInt(value) || 0 : value,
        ...(name === 'name' && { slug: generateSlug(value) })
      }
      console.log('Updated newSubcategory state:', updated)
      return updated
    })
  }

  const addSubcategory = () => {
    console.log('Add subcategory clicked, current newSubcategory:', newSubcategory)
    
    if (newSubcategory.name.trim()) {
      const subcategory: SubcategoryFormData = {
        ...newSubcategory,
        id: Date.now().toString()
      }
      console.log('Adding subcategory:', subcategory)
      setSubcategories(prev => {
        const updated = [...prev, subcategory]
        console.log('Updated subcategories:', updated)
        return updated
      })
      setNewSubcategory({
        name: '',
        description: '',
        slug: '',
        status: 'ACTIVE',
        sortOrder: 0
      })
    } else {
      console.log('Subcategory name is empty or invalid:', newSubcategory.name)
    }
  }

  const removeSubcategory = (subcategoryId: string) => {
    setSubcategories(prev => prev.filter(sub => sub.id !== subcategoryId))
  }

  const updateSubcategory = (subcategoryId: string, field: keyof SubcategoryFormData, value: any) => {
    setSubcategories(prev => prev.map(sub => 
      sub.id === subcategoryId 
        ? { 
            ...sub, 
            [field]: value,
            ...(field === 'name' && { slug: generateSlug(value) })
          } 
        : sub
    ))
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Error',
          description: `File size exceeds 5MB limit. Please upload a smaller image.`,
          variant: 'destructive',
        })
        e.target.value = ''
        return
      }
      try {
        // Show loading state
        setCategoryData(prev => ({ ...prev, image: 'uploading...' }))
        
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'm2c_categories')
        formData.append('folder', 'categories')
        
        // Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`
        
        console.log('Uploading to Cloudinary:', cloudinaryUrl)
        console.log('Upload preset:', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'm2c_categories')
        
        const response = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        console.log('Cloudinary response:', data)
        
        if (data.secure_url) {
          setCategoryData(prev => ({ ...prev, image: data.secure_url }))
          toast({
            title: 'Success',
            description: 'Image uploaded successfully',
          })
        } else {
          // Log the full error response
          console.error('Cloudinary upload failed:', data)
          throw new Error(data.error?.message || 'Upload failed')
        }
      } catch (error) {
        console.error('Image upload error:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
          variant: 'destructive',
        })
        setCategoryData(prev => ({ ...prev, image: '' }))
      }
    }
  }

  const handleSubcategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean = false) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Error',
          description: `File size exceeds 5MB limit. Please upload a smaller image.`,
          variant: 'destructive',
        })
        e.target.value = ''
        return
      }
      try {
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'm2c_categories')
        formData.append('folder', 'categories/subcategories')
        
        // Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`
        
        const response = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        console.log('Cloudinary response:', data)
        
        if (data.secure_url) {
          if (isNew) {
            setNewSubcategory(prev => ({ ...prev, image: data.secure_url }))
          }
          toast({
            title: 'Success',
            description: 'Image uploaded successfully',
          })
        } else {
          console.error('Cloudinary upload failed:', data)
          throw new Error(data.error?.message || 'Upload failed')
        }
      } catch (error) {
        console.error('Image upload error:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleExistingSubcategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, subcategoryId: string) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Error',
          description: `File size exceeds 5MB limit. Please upload a smaller image.`,
          variant: 'destructive',
        })
        e.target.value = ''
        return
      }
      try {
        // Create FormData for file upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'm2c_categories')
        formData.append('folder', 'categories/subcategories')
        
        // Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`
        
        const response = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        console.log('Cloudinary response:', data)
        
        if (data.secure_url) {
          updateSubcategory(subcategoryId, 'image', data.secure_url)
          toast({
            title: 'Success',
            description: 'Image uploaded successfully',
          })
        } else {
          console.error('Cloudinary upload failed:', data)
          throw new Error(data.error?.message || 'Upload failed')
        }
      } catch (error) {
        console.error('Image upload error:', error)
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!categoryData.name.trim()) {
      toast({ title: 'Error', description: 'Category name is required', variant: 'destructive' })
      return
    }

    if (!categoryData.description.trim()) {
      toast({ title: 'Error', description: 'Category description is required', variant: 'destructive' })
      return
    }

    if (!categoryData.slug?.trim()) {
      toast({ title: 'Error', description: 'Category slug is required', variant: 'destructive' })
      return
    }
    
    setIsLoading(true)

    try {
      const payload = {
        ...categoryData,
        subcategories: subcategories
      }

      if (isEdit && categoryId) {
        await categoryService.updateCategory(categoryId, payload)
      } else {
        await categoryService.createCategory(payload)
      }
      
      // Redirect back to categories list
      router.push('/admin/dashboard/categories')
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save category',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading state while fetching data
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard/categories">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Categories
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
              <span className="ml-3 text-gray-600">Loading category data...</span>
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
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Category' : 'Add New Category'}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4">
              {[
                { id: 'category', label: 'Category Details' },
                { id: 'subcategories', label: 'Subcategories' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'category' | 'subcategories')}
                  className={`py-2 px-1 border-b-2 font-medium text-base ${
                    activeTab === tab.id
                      ? 'border-white text-white bg-gray-900 px-4 rounded-t-sm'
                      : 'border-gray-100 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Category Details Tab */}
            {activeTab === 'category' && (
              <Card>
                <CardHeader>
                  <CardTitle>Category Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={categoryData.name}
                      onChange={handleCategoryChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      placeholder="Enter category name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={categoryData.description}
                      onChange={handleCategoryChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      placeholder="Category description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL Slug *
                      </label>
                      <input
                        type="text"
                        name="slug"
                        value={categoryData.slug}
                        onChange={handleCategoryChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="category-url-slug"
                      />
                      <p className="text-xs text-gray-500 mt-1">Auto-generated from name, but can be customized</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        name="sortOrder"
                        value={categoryData.sortOrder}
                        onChange={handleCategoryChange}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* SEO Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        name="metaTitle"
                        value={categoryData.metaTitle}
                        onChange={handleCategoryChange}
                        maxLength={60}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="SEO title for search engines"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {categoryData.metaTitle?.length || 0}/60 characters
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Description
                      </label>
                      <textarea
                        name="metaDescription"
                        value={categoryData.metaDescription}
                        onChange={handleCategoryChange}
                        maxLength={160}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        placeholder="SEO description for search engines"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {categoryData.metaDescription?.length || 0}/160 characters
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Subcategories Tab */}
            {activeTab === 'subcategories' && (
              <Card>
                <CardHeader>
                  <CardTitle>Subcategories Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add New Subcategory */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-3">Add New Subcategory</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <input
                          type="text"
                          name="name"
                          value={newSubcategory.name}
                          onChange={handleNewSubcategoryChange}
                          placeholder="Subcategory name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="slug"
                          value={newSubcategory.slug}
                          onChange={handleNewSubcategoryChange}
                          placeholder="URL slug"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <textarea
                        name="description"
                        value={newSubcategory.description}
                        onChange={handleNewSubcategoryChange}
                        placeholder="Subcategory description"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent"
                      />
                    </div>
                    
                    {/* Image Upload for New Subcategory */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subcategory Image
                      </label>
                      {newSubcategory.image ? (
                        <div className="relative">
                          <img
                            src={newSubcategory.image}
                            alt="Subcategory"
                            className="w-full h-24 object-cover rounded border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/assets/images/categories/cs1.jpg';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setNewSubcategory(prev => ({ ...prev, image: '' }))}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSubcategoryImageUpload(e, true)}
                            className="hidden"
                            id="new-subcategory-image-upload"
                          />
                          <label htmlFor="new-subcategory-image-upload" className="cursor-pointer">
                            <Upload className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="mt-1 text-xs text-gray-600">Click to upload image</p>
                          </label>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <Dropdown
                        value={newSubcategory.status}
                        options={[
                          { value: 'ACTIVE', label: 'Active' },
                          { value: 'INACTIVE', label: 'Inactive' }
                        ]}
                        onChange={(value) => setNewSubcategory(prev => ({ ...prev, status: value as 'ACTIVE' | 'INACTIVE' }))}
                      />
                      <Button type="button" onClick={addSubcategory} className="bg-gray-900 text-white p-4" >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subcategory
                      </Button>
                    </div>
                  </div>

                  {/* Existing Subcategories */}
                  {subcategories.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Current Subcategories</h4>
                      {subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Name</label>
                              <input
                                type="text"
                                value={subcategory.name}
                                onChange={(e) => updateSubcategory(subcategory.id!, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Slug</label>
                              <input
                                type="text"
                                value={subcategory.slug}
                                onChange={(e) => updateSubcategory(subcategory.id!, 'slug', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <textarea
                              value={subcategory.description}
                              onChange={(e) => updateSubcategory(subcategory.id!, 'description', e.target.value)}
                              rows={2}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">Image</label>
                            {subcategory.image ? (
                              <div className="relative">
                                <img
                                  src={subcategory.image}
                                  alt="Subcategory"
                                  className="w-full h-24 object-cover rounded border"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/assets/images/categories/cs1.jpg';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateSubcategory(subcategory.id!, 'image', '')}
                                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleExistingSubcategoryImageUpload(e, subcategory.id!)}
                                  className="hidden"
                                  id={`subcategory-image-upload-${subcategory.id}`}
                                />
                                <label htmlFor={`subcategory-image-upload-${subcategory.id}`} className="cursor-pointer">
                                  <Upload className="mx-auto h-6 w-6 text-gray-400" />
                                  <p className="mt-1 text-xs text-gray-600">Click to upload</p>
                                </label>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Status</label>
                                <Dropdown
                                  value={subcategory.status}
                                  options={[
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'INACTIVE', label: 'Inactive' }
                                  ]}
                                  onChange={(value) => updateSubcategory(subcategory.id!, 'status', value)}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Sort Order</label>
                                <input
                                  type="number"
                                  value={subcategory.sortOrder}
                                  onChange={(e) => updateSubcategory(subcategory.id!, 'sortOrder', parseInt(e.target.value) || 0)}
                                  min="0"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSubcategory(subcategory.id!)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status & Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Status
                  </label>
                  <Dropdown
                    value={categoryData.status}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' }
                    ]}
                    onChange={(value) => setCategoryData(prev => ({ ...prev, status: value as 'ACTIVE' | 'INACTIVE' }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.image ? (
                    <div className="relative">
                      <img
                        src={categoryData.image}
                        alt="Category"
                        className="w-full h-32 object-cover rounded border"
                        onError={(e) => {
                          // Handle broken images
                          const target = e.target as HTMLImageElement;
                          target.src = '/assets/images/categories/cs1.jpg'; // Fallback image
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setCategoryData(prev => ({ ...prev, image: '' }))}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="category-image-upload"
                      />
                      <label htmlFor="category-image-upload" className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Click to upload category image
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG up to 5MB
                        </p>
                      </label>
                    </div>
                  )}
                  
                  {/* URL Input Alternative */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Or paste image URL
                    </label>
                    <input
                      type="url"
                      name="image"
                      value={categoryData.image || ''}
                      onChange={handleCategoryChange}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      You can also paste a direct image URL here
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subcategories:</span>
                  <span className="font-medium">{subcategories.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active Subcategories:</span>
                  <span className="font-medium">
                    {subcategories.filter(sub => sub.status === 'ACTIVE').length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#313131] text-white hover:bg-[#222222]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : (isEdit ? 'Update Category' : 'Create Category')}
                </Button>
                <Link href="/admin/dashboard/categories" className="block">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}