'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/UI/Button';
import { Package, Globe, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
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

   const toggleSubCategory = (categoryId: string, subCategory: string) => {
     setFormData(prev => {
       const categorySelections = prev.selectedCategories[categoryId] || [];
       const isSelected = categorySelections.includes(subCategory);
       
       return {
         ...prev,
         selectedCategories: {
           ...prev.selectedCategories,
           [categoryId]: isSelected
             ? categorySelections.filter((item: string) => item !== subCategory)
             : [...categorySelections, subCategory]
         }
       };
     });
     // Clear error when user makes a selection
     if (errors.selectedCategories) {
       setErrors(prev => ({ ...prev, selectedCategories: '' }));
     }
     setTouched(prev => ({ ...prev, selectedCategories: true }));
   };

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
     const hasSelectedCategories = Object.values(formData.selectedCategories).some(
       (subCategories: any) => subCategories && subCategories.length > 0
     );

     if (!hasSelectedCategories) {
       newErrors.selectedCategories = 'Please select at least one product category';
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

     onUpdateData(formData);
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
     <div className="max-w-420 p-4 space-y-4 font-sans">
       {/* Header */}
                <div className="flex p-2 items-center gap-4 mb-4">
             <Package className="w-12 h-12 text-gray-600" />
             <div>
               <h1 className="text-2xl font-bold text-gray-900">Vendor Type & Product Categories</h1>
               <p className="text-gray-600 mt-1">Define your business model and product offerings</p>
             </div>
           </div>

       {/* Vendor Type */}
       <section className="bg-white border border-gray-200 rounded-lg" data-section="vendorType">
         <div className="px-4 py-3">
           <h2 className="text-lg font-semibold text-gray-900">
             Vendor Type <span className="text-red-500 text-lg">*</span>
           </h2>
         </div>
         <div className="px-6 pb-6">
             <div className="flex flex-wrap gap-2">
               {vendorTypes.map((type) => (
                 <div
                   key={type.id}
                   onClick={() => toggleVendorType(type.id)}
                   className={`p-4 rounded-4xl cursor-pointer transition-colors ${
                     (formData.vendorType || []).includes(type.id)
                       ? "border-2 border-blue-600 bg-blue-50 text-blue-700 "
                       : errors.vendorType && touched.vendorType
                       ? "border-2 border-red-500 bg-red-50"
                       : "bg-gray-100 text-gray-500"
                   }`}
                 >
                   <div className="font-semibold text-base">{type.label}</div>
                 </div>
               ))}
             </div>
             {errors.vendorType && touched.vendorType && (
               <p className="text-red-500 text-sm mt-2">{errors.vendorType}</p>
             )}
           </div>
       </section>

       {/* Market Type */}
       <section className="bg-white border border-gray-200 rounded-lg" data-section="marketType">
         <div className="px-4 py-3">
           <h2 className="text-lg font-semibold text-gray-900 flex items-center">
             <Globe className="w-5 h-5 mr-2" />
             Market Focus <span className="text-red-500 text-lg ml-1">*</span>
           </h2>
         </div>
         <div className="px-6 pb-6">
             <div className="flex flex-wrap gap-2">
               {marketTypes.map((type) => (
                 <div
                   key={type.id}
                   onClick={() => toggleMarketType(type.id)}
                   className={`p-4 rounded-4xl cursor-pointer transition-colors ${
                     (formData.marketType || []).includes(type.id)
                       ? "border-2 border-blue-600 bg-blue-50 text-blue-700 "
                       : errors.marketType && touched.marketType
                       ? "border-2 border-red-500 bg-red-50"
                       : "bg-gray-100 text-gray-500"
                   }`}
                 >
                   <div className="font-semibold text-base">{type.label}</div>
                 </div>
               ))}
             </div>
             {errors.marketType && touched.marketType && (
               <p className="text-red-500 text-sm mt-2">{errors.marketType}</p>
             )}
           </div>
       </section>

       {/* Product Categories */}
       <section className="bg-white border border-gray-200 rounded-lg" data-section="selectedCategories">
         <div className="px-4 py-3">
           <h2 className="text-lg font-semibold text-gray-900">
             Product Categories <span className="text-red-500 text-lg">*</span>
           </h2>
           <p className="text-sm text-gray-600">Select the categories that match your products</p>
         </div>
         <div className={`p-4 ${errors.selectedCategories && touched.selectedCategories ? 'bg-red-50 border-2 border-red-500 rounded-lg' : ''}`}>
           <div className="space-y-4">
             {categories.map((category) => (
               <div key={category.id} className="border border-gray-200 rounded-lg">
                 <button
                   onClick={() => toggleCategory(category.id)}
                   className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                 >
                   <div className="flex items-center gap-2">
                     <span className="font-medium text-lg text-gray-900">{category.name}</span>
                     {category.subcategories && category.subcategories.length > 0 && (
                       <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                         {category.subcategories.length} subcategories
                       </span>
                     )}
                   </div>
                   {formData.expandedCategories[category.id] ? (
                     <ChevronDown className="w-5 h-5 text-gray-400" />
                   ) : (
                     <ChevronRight className="w-5 h-5 text-gray-400" />
                   )}
                 </button>

                 {formData.expandedCategories[category.id] && (
                   <div className="px-4 pb-4">
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                       {category.subcategories && category.subcategories.length > 0 ? (
                         category.subcategories.map((subCategory) => (
                           <label
                             key={subCategory.id}
                             className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                           >
                             <input
                               type="checkbox"
                               checked={(formData.selectedCategories[category.id] || []).includes(subCategory.name)}
                               onChange={() => toggleSubCategory(category.id, subCategory.name)}
                               className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                             />
                             <span className="ml-2 text-base font-medium text-gray-700">{subCategory.name}</span>
                           </label>
                         ))
                       ) : (
                         <div className="col-span-full text-gray-500 text-sm italic p-2">
                           No subcategories available for this category.
                         </div>
                       )}
                     </div>
                   </div>
                 )}
               </div>
             ))}
           </div>
           {errors.selectedCategories && touched.selectedCategories && (
             <p className="text-red-500 text-sm mt-2">{errors.selectedCategories}</p>
           )}
         </div>
       </section>

       {/* Selected Categories Summary */}
       {Object.keys(formData.selectedCategories).some(key => formData.selectedCategories[key]?.length > 0) && (
         <section className="bg-white border border-gray-200 rounded-lg">
           <div className="px-4 py-3 border-b">
             <h2 className="text-lg font-semibold text-gray-900">Selected Products Summary</h2>
           </div>
           <div className="p-4">
             <div className="space-y-2">
               {Object.entries(formData.selectedCategories).map(([categoryId, subCategories]) => {
                 if (!subCategories || (subCategories as string[]).length === 0) return null;
                 const category = categories.find(c => c.id === categoryId);
                 return (
                   <div key={categoryId} className="flex flex-wrap gap-2">
                     <span className="font-medium text-gray-900">{category?.name}:</span>
                     {(subCategories as string[]).map((sub) => (
                       <span key={sub} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                         {sub}
                       </span>
                     ))}
                   </div>
                 );
               })}
             </div>
           </div>
         </section>
       )}

       {/* Category Remarks */}
       <section className="bg-white border border-gray-200 rounded-lg">
         <div className="px-4 py-3">
           <h2 className="text-lg font-semibold text-gray-900">Additional Remarks</h2>
           <p className="text-sm text-gray-600">Any additional information about your product categories</p>
         </div>
         <div className="p-4">
           <textarea
             value={formData.categoryRemarks}
             onChange={(e) => handleInputChange('categoryRemarks', e.target.value)}
             placeholder="Enter any additional remarks about your product categories, specializations, or unique offerings..."
             rows={4}
             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
           />
         </div>
       </section>

       {/* Navigation */}
       <div className="flex justify-between text-white ">
         <Button
           onClick={onPrev}
           className="px-8 font-bold bg-green-400 hover:bg-gray-300"
         >
           Previous
         </Button>
         <Button
           onClick={handleNext}
           className="bg-blue-600 hover:bg-blue-700 px-8 font-bold"
         >
           Continue
         </Button>
       </div>
     </div>
   );
}