'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/UI/Button';
import { Package, Globe, ChevronDown, ChevronRight, Loader2, Upload, X, ArrowLeft, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { categoryService, Category } from '@/services/categoryService';

interface VendorTypeProductsProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

const vendorTypes = [
  { id: 'manufacturer', label: 'Manufacturer', description: 'You produce the goods' },
  { id: 'importer', label: 'Importer', description: 'You import goods for resale' },
  { id: 'exporter', label: 'Exporter', description: 'You export goods internationally' }
];

const marketTypes = [
  { id: 'domestic', label: 'Domestic', description: 'Local market only' },
  { id: 'international', label: 'International', description: 'Global markets' }
];

export default function VendorTypeProducts({ onNext, onPrev, onUpdateData, data }: VendorTypeProductsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // allow multiple selections; accept legacy single-value strings
    vendorType: Array.isArray(data.vendorType) ? data.vendorType : (data.vendorType ? [data.vendorType] : []),
    marketType: Array.isArray(data.marketType) ? data.marketType : (data.marketType ? [data.marketType] : []),
    selectedCategories: data.selectedCategories || {},
    expandedCategories: data.expandedCategories || {},
    categoryRemarks: data.categoryRemarks || ''
  });

  // Product photo uploads & manual product entries
  type ProductItem = { id: string, name: string, photos: Array<{ file?: File; preview: string }> };
  const [categoryProducts, setCategoryProducts] = useState<Record<string, ProductItem[]>>(
    data.categoryProducts || {}
  );

  const addProduct = (categoryId: string) => {
    setCategoryProducts(prev => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: '', photos: [] }]
    }));
  };

  const removeProduct = (categoryId: string, productId: string) => {
    setCategoryProducts(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].filter(p => p.id !== productId)
    }));
  };

  const updateProductName = (categoryId: string, productId: string, name: string) => {
    setCategoryProducts(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].map(p => p.id === productId ? { ...p, name } : p)
    }));
  };

  const handleProductPhotoUpload = (categoryId: string, productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCategoryProducts(prev => {
          const categoryList = prev[categoryId] || [];
          return {
            ...prev,
            [categoryId]: categoryList.map(p => {
              if (p.id === productId) {
                if (p.photos.length >= 5) return p;
                return { ...p, photos: [...p.photos, { file, preview: reader.result as string }] };
              }
              return p;
            })
          };
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeProductPhoto = (categoryId: string, productId: string, photoIndex: number) => {
    setCategoryProducts(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].map(p => p.id === productId ? { ...p, photos: p.photos.filter((_, i) => i !== photoIndex) } : p)
    }));
  };

  // Additional Categories & Products
  type AdditionalCategory = { id: string; name: string; products: ProductItem[] };
  const [additionalCategories, setAdditionalCategories] = useState<AdditionalCategory[]>(
    data.additionalCategories || []
  );

  const addAdditionalCategory = () => {
    setAdditionalCategories(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name: '',
        products: [{ id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: '', photos: [] }]
      }
    ]);
  };

  const removeAdditionalCategory = (categoryId: string) => {
    setAdditionalCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  const updateAdditionalCategoryName = (categoryId: string, name: string) => {
    setAdditionalCategories(prev => prev.map(c => c.id === categoryId ? { ...c, name } : c));
  };

  const addAdditionalProduct = (categoryId: string) => {
    setAdditionalCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          products: [...c.products, { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), name: '', photos: [] }]
        };
      }
      return c;
    }));
  };

  const removeAdditionalProduct = (categoryId: string, productId: string) => {
    setAdditionalCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          products: c.products.filter(p => p.id !== productId)
        };
      }
      return c;
    }));
  };

  const updateAdditionalProductName = (categoryId: string, productId: string, name: string) => {
    setAdditionalCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          products: c.products.map(p => p.id === productId ? { ...p, name } : p)
        };
      }
      return c;
    }));
  };

  const handleAdditionalProductPhotoUpload = (categoryId: string, productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024 && ['image/jpeg', 'image/png', 'image/webp'].includes(f.type));
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdditionalCategories(prev => prev.map(c => {
          if (c.id === categoryId) {
            return {
              ...c,
              products: c.products.map(p => {
                if (p.id === productId) {
                  if (p.photos.length >= 5) return p;
                  return { ...p, photos: [...p.photos, { file, preview: reader.result as string }] };
                }
                return p;
              })
            };
          }
          return c;
        }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAdditionalProductPhoto = (categoryId: string, productId: string, photoIndex: number) => {
    setAdditionalCategories(prev => prev.map(c => {
      if (c.id === categoryId) {
        return {
          ...c,
          products: c.products.map(p => {
            if (p.id === productId) {
              return { ...p, photos: p.photos.filter((_, i) => i !== photoIndex) };
            }
            return p;
          })
        };
      }
      return c;
    }));
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Sync formData with data prop when it changes (for edit mode)
  useEffect(() => {
    console.log('VendorTypeProducts: data prop changed', data)
    setFormData({
      vendorType: Array.isArray(data.vendorType) ? data.vendorType : (data.vendorType ? [data.vendorType] : []),
      marketType: Array.isArray(data.marketType) ? data.marketType : (data.marketType ? [data.marketType] : []),
      selectedCategories: data.selectedCategories || {},
      expandedCategories: data.expandedCategories || {},
      categoryRemarks: data.categoryRemarks || ''
    })
  }, [data]);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch categories with subcategories
        const response = await categoryService.getCategoryTree({
          status: 'ACTIVE',
          includeInactive: false
        });

        setCategories(response.data);

        // If no categories are returned, show a helpful message
        if (!response.data || response.data.length === 0) {
          setError('No categories available. Please contact support.');
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories. Please try again.');

        // Fallback: Set some basic categories if API fails
        setCategories([
          {
            id: 'textiles',
            name: 'Textiles',
            description: 'General textile products',
            slug: 'textiles',
            status: 'ACTIVE',
            sortOrder: 0,
            subcategories: [
              {
                id: 'bedding',
                name: 'Bedding',
                description: 'Bed linens and accessories',
                slug: 'bedding',
                status: 'ACTIVE',
                sortOrder: 0,
                subcategories: [],
                productCount: 0,
                subcategoryCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                id: 'towels',
                name: 'Towels',
                description: 'Bath and kitchen towels',
                slug: 'towels',
                status: 'ACTIVE',
                sortOrder: 1,
                subcategories: [],
                productCount: 0,
                subcategoryCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              {
                id: 'curtains',
                name: 'Curtains',
                description: 'Window treatments',
                slug: 'curtains',
                status: 'ACTIVE',
                sortOrder: 2,
                subcategories: [],
                productCount: 0,
                subcategoryCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            productCount: 0,
            subcategoryCount: 3
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const toggleVendorType = (typeId: string) => {
    setFormData(prev => {
      const current: string[] = prev.vendorType || [];
      const exists = current.includes(typeId);
      return {
        ...prev,
        vendorType: exists ? current.filter(t => t !== typeId) : [...current, typeId]
      };
    });
    // Clear error when user makes a selection
    if (errors.vendorType) {
      setErrors(prev => ({ ...prev, vendorType: '' }));
    }
    setTouched(prev => ({ ...prev, vendorType: true }));
  };

  const toggleMarketType = (typeId: string) => {
    setFormData(prev => {
      const current: string[] = prev.marketType || [];
      const exists = current.includes(typeId);
      return {
        ...prev,
        marketType: exists ? current.filter(t => t !== typeId) : [...current, typeId]
      };
    });
    // Clear error when user makes a selection
    if (errors.marketType) {
      setErrors(prev => ({ ...prev, marketType: '' }));
    }
    setTouched(prev => ({ ...prev, marketType: true }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      expandedCategories: {
        ...prev.expandedCategories,
        [categoryId]: !prev.expandedCategories[categoryId]
      }
    }));
  };

  // toggleSubCategory removed in favor of manual product entry

  const handleNext = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};

    if (!formData.vendorType || formData.vendorType.length === 0) {
      newErrors.vendorType = 'Please select at least one Vendor Type';
    }

    if (!formData.marketType || formData.marketType.length === 0) {
      newErrors.marketType = 'Please select at least one Market Focus option';
    }

    // Check if at least one product category is selected
    const hasSelectedCategories = Object.keys(formData.selectedCategories).some(
      (catId) => formData.selectedCategories[catId]
    );

    if (!hasSelectedCategories) {
      newErrors.selectedCategories = 'Please select at least one product category';
    } else {
      // Validate that selected categories have at least one product with a name
      const hasEmptyProducts = Object.keys(formData.selectedCategories).some(catId => {
        if (formData.selectedCategories[catId]) {
          const prods = categoryProducts[catId];
          if (!prods || prods.length === 0) return true;
          return prods.some(p => !p.name.trim());
        }
        return false;
      });
      if (hasEmptyProducts) {
        newErrors.selectedCategories = 'Please ensure all added products have a name';
      }
    }

    // Validate additional categories
    if (additionalCategories.length > 0) {
      const hasInvalidCustomCategories = additionalCategories.some(c => !c.name.trim());
      if (hasInvalidCustomCategories) {
        newErrors.additionalCategories = 'Please provide a name for all custom categories';
      } else {
        const hasInvalidCustomProducts = additionalCategories.some(c => c.products.some(p => !p.name.trim()));
        if (hasInvalidCustomProducts) {
          newErrors.additionalCategories = 'Please ensure all custom products have a name';
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // Scroll to first error section
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.querySelector(`[data-section="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    onUpdateData({ ...formData, categoryProducts, additionalCategories });
    onNext();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-420 p-4 space-y-4 font-sans">
        <div className="flex p-2 items-center gap-4 mb-4">
          <Package className="w-12 h-12 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Type & Product Categories</h1>
            <p className="text-gray-600 mt-1">Define your business model and product offerings</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading categories...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-420 p-4 space-y-4 font-sans">
        <div className="flex p-2 items-center gap-4 mb-4">
          <Package className="w-12 h-12 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendor Type & Product Categories</h1>
            <p className="text-gray-600 mt-1">Define your business model and product offerings</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <Package className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-md text-gray-900 leading-tight" style={{ textWrap: "balance" as any }}>
            Vendor Type & Product Categories
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Define your business model and product offerings
          </p>
        </div>
      </div>

      {/* Vendor Type */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-section="vendorType">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Vendor Type <span className="text-red-500">*</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1">What is your primary business model?</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vendorTypes.map((type) => {
              const isSelected = (formData.vendorType || []).includes(type.id);
              const hasError = errors.vendorType && touched.vendorType;
              
              return (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => toggleVendorType(type.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 active:scale-[0.98] ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10'
                      : hasError
                      ? 'border-red-500 bg-red-50 hover:bg-red-100 hover:border-red-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`font-semibold text-base ${isSelected ? 'text-brand-900' : 'text-slate-900'}`}>{type.label}</div>
                  <div className={`text-sm mt-1 ${isSelected ? 'text-brand-700' : 'text-slate-500'}`}>{type.description}</div>
                </button>
              );
            })}
          </div>
          {errors.vendorType && touched.vendorType && (
            <p className="text-red-500 text-sm mt-3">{errors.vendorType}</p>
          )}
        </div>
      </section>

      {/* Market Type */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-section="marketType">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Market Focus <span className="text-red-500 ml-1">*</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1">Which markets do you primarily serve?</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketTypes.map((type) => {
              const isSelected = (formData.marketType || []).includes(type.id);
              const hasError = errors.marketType && touched.marketType;
              
              return (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => toggleMarketType(type.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 active:scale-[0.98] ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 shadow-sm shadow-brand-500/10'
                      : hasError
                      ? 'border-red-500 bg-red-50 hover:bg-red-100 hover:border-red-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`font-semibold text-base ${isSelected ? 'text-brand-900' : 'text-slate-900'}`}>{type.label}</div>
                  <div className={`text-sm mt-1 ${isSelected ? 'text-brand-700' : 'text-slate-500'}`}>{type.description}</div>
                </button>
              );
            })}
          </div>
          {errors.marketType && touched.marketType && (
            <p className="text-red-500 text-sm mt-3">{errors.marketType}</p>
          )}
        </div>
      </section>

      {/* Product Categories */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-section="selectedCategories">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            Product Categories & Offerings <span className="text-red-500">*</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1">Select your categories and manually add your products with photos.</p>
        </div>
        
        <div className={`p-6 ${errors.selectedCategories && touched.selectedCategories ? 'bg-red-50/50' : ''}`}>
          <div className="space-y-4">
            {categories.map((category) => {
              const isCategorySelected = !!formData.selectedCategories[category.id];
              const isExpanded = formData.expandedCategories[category.id];
              const products = categoryProducts[category.id] || [];

              return (
                <div key={category.id} className={`border rounded-lg overflow-hidden transition-colors ${isCategorySelected ? 'border-brand-300 bg-brand-50/10' : 'border-slate-200 bg-white'}`}>
                  <div className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isCategorySelected}
                        onChange={() => {
                           // Toggle category selection
                           setFormData(prev => {
                             const newSelected = { ...prev.selectedCategories };
                             if (isCategorySelected) {
                               delete newSelected[category.id];
                             } else {
                               newSelected[category.id] = true;
                             }
                             return { ...prev, selectedCategories: newSelected };
                           });
                           
                           // If selecting, auto expand
                           if (!isCategorySelected) {
                             setFormData(prev => ({ ...prev, expandedCategories: { ...prev.expandedCategories, [category.id]: true } }));
                             // Auto add first product row if empty
                             setCategoryProducts(prev => {
                               if (!prev[category.id] || prev[category.id].length === 0) {
                                 return { ...prev, [category.id]: [{ id: Date.now().toString(), name: '', photos: [] }] };
                               }
                               return prev;
                             });
                           }
                           
                           if (errors.selectedCategories) setErrors(prev => ({ ...prev, selectedCategories: '' }));
                        }}
                        className="w-5 h-5 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                      />
                      <span className={`font-semibold text-lg ${isCategorySelected ? 'text-brand-900' : 'text-slate-900'}`}>{category.name}</span>
                    </label>
                    <button type="button" onClick={() => toggleCategory(category.id)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>

                  {isExpanded && isCategorySelected && (
                    <div className="px-4 pb-6 pt-2 border-t border-slate-100 bg-white">
                      <div className="space-y-4">
                        {products.map((product) => (
                          <div key={product.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                            <div className="flex items-start justify-between gap-4 mb-4">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  value={product.name}
                                  onChange={(e) => updateProductName(category.id, product.id, e.target.value)}
                                  placeholder="e.g. Cotton Towel, Bath Mat..."
                                  className="w-full px-4 py-2 border border-slate-300 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 bg-white"
                                />
                              </div>
                              <button type="button" onClick={() => removeProduct(category.id, product.id)} className="mt-7 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors" title="Remove Product">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Product Photos */}
                            <div>
                               <label className="block text-sm font-medium text-slate-700 mb-2">Product Photos (Max 5)</label>
                               <div className="flex flex-wrap gap-3">
                                 {product.photos.map((photo, photoIndex) => (
                                   <div key={photoIndex} className="relative group w-20 h-20 rounded-md overflow-hidden border border-slate-200 bg-white">
                                     <Image src={photo.preview} alt="Product" fill className="object-cover" />
                                     <button type="button" onClick={() => removeProductPhoto(category.id, product.id, photoIndex)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <X className="w-3 h-3" />
                                     </button>
                                   </div>
                                 ))}
                                 
                                 {product.photos.length < 5 && (
                                   <label className="w-20 h-20 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors bg-white">
                                     <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                     <input
                                       type="file"
                                       accept="image/jpeg,image/png,image/webp"
                                       multiple
                                       onChange={(e) => handleProductPhotoUpload(category.id, product.id, e)}
                                       className="hidden"
                                     />
                                   </label>
                                 )}
                               </div>
                            </div>
                          </div>
                        ))}
                        
                        <button type="button" onClick={() => addProduct(category.id)} className="inline-flex items-center px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors border border-brand-200">
                          + Add Another Product
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {isExpanded && !isCategorySelected && (
                    <div className="px-4 py-4 border-t border-slate-100 bg-slate-50 text-slate-500 text-sm italic">
                      Please select this category to add products.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {errors.selectedCategories && touched.selectedCategories && (
            <p className="text-red-500 text-sm mt-3">{errors.selectedCategories}</p>
          )}
        </div>
      </section>

      {/* Additional Categories & Remarks */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Additional Categories & Remarks</h2>
            <p className="text-sm text-slate-600 mt-1">If your products don't fit into the standard categories above, add them here.</p>
          </div>
          <button
            type="button"
            onClick={addAdditionalCategory}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors border border-brand-200 whitespace-nowrap"
          >
            + Add Custom Category
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {errors.additionalCategories && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
              {errors.additionalCategories}
            </div>
          )}
          
          {/* Additional Categories List */}
          {additionalCategories.length > 0 && (
            <div className="space-y-6">
              {additionalCategories.map((category) => (
                <div key={category.id} className="border border-brand-200 rounded-lg overflow-hidden bg-white shadow-sm shadow-brand-500/5">
                  <div className="px-4 py-3 bg-brand-50 border-b border-brand-100 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="sr-only">Custom Category Name</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => updateAdditionalCategoryName(category.id, e.target.value)}
                        placeholder="e.g. Custom Textile Products"
                        className="w-full bg-white px-3 py-2 border border-brand-200 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-brand-500 font-semibold text-brand-900 placeholder:text-brand-300 placeholder:font-normal"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAdditionalCategory(category.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove Custom Category"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {category.products.map((product) => (
                      <div key={product.id} className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={product.name}
                              onChange={(e) => updateAdditionalProductName(category.id, product.id, e.target.value)}
                              placeholder="e.g. Organic Cotton Towels..."
                              className="w-full px-4 py-2 border border-slate-300 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-brand-500 bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAdditionalProduct(category.id, product.id)}
                            className="mt-7 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Product Photos */}
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2">Product Photos (Max 5)</label>
                           <div className="flex flex-wrap gap-3">
                             {product.photos.map((photo, photoIndex) => (
                               <div key={photoIndex} className="relative group w-20 h-20 rounded-md overflow-hidden border border-slate-200 bg-slate-50">
                                 <Image src={photo.preview} alt="Product" fill className="object-cover" />
                                 <button
                                   type="button"
                                   onClick={() => removeAdditionalProductPhoto(category.id, product.id, photoIndex)}
                                   className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                 >
                                   <X className="w-3 h-3" />
                                 </button>
                               </div>
                             ))}
                             
                             {product.photos.length < 5 && (
                               <label className="w-20 h-20 rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors bg-white">
                                 <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                 <input
                                   type="file"
                                   accept="image/jpeg,image/png,image/webp"
                                   multiple
                                   onChange={(e) => handleAdditionalProductPhotoUpload(category.id, product.id, e)}
                                   className="hidden"
                                 />
                               </label>
                             )}
                           </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addAdditionalProduct(category.id)}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                    >
                      + Add Another Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fallback to simple remarks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">General Remarks</label>
            <textarea
              value={formData.categoryRemarks}
              onChange={(e) => handleInputChange('categoryRemarks', e.target.value)}
              placeholder="Enter any additional remarks, specializations, or unique offerings..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 outline-none resize-none transition-colors text-slate-900"
            />
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <Button
          onClick={onPrev}
          className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="inline-flex items-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          Save & Continue
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}