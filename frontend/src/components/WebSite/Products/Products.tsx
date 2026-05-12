'use client';

import ProductCard from '../ProductCard/ProductCard';
import Category from '@/components/WebSite/CategoryCopy/Category';
import { Search, Filter, ChevronDown, Star, ChevronLeft, ChevronRight, X } from 'lucide-react';

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
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { productService, Product } from '@/services/productService';
import { categoryService } from '@/services/categoryService';

const Products = () => {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const subcategoryParam = searchParams.get('subcategory');
  const searchStringParam = searchParams.get('search');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchStringParam || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [selectedRating, setSelectedRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Fetch category and subcategory names from slugs and populate dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesResponse = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true',
          includeSubcategories: 'true'
        });

        if (categoriesResponse.success && categoriesResponse.data) {
          setCategoriesList(categoriesResponse.data);

          if (categoryParam) {
            const foundCategory = categoriesResponse.data.find(
              (cat: any) => cat.slug.toLowerCase() === categoryParam.toLowerCase()
            );

            if (foundCategory) {
              setCategoryName(foundCategory.name);
              setSelectedCategory(foundCategory.name);

              if (subcategoryParam && foundCategory.subcategories) {
                const foundSubcategory = foundCategory.subcategories.find(
                  (sub: any) => sub.slug.toLowerCase() === subcategoryParam.toLowerCase()
                );

                if (foundSubcategory) {
                  setSubcategoryName(foundSubcategory.name);
                  setSelectedSubcategory(foundSubcategory.name);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, [categoryParam, subcategoryParam]);

  // Fetch products from API
  useEffect(() => {
    let ignore = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);

        const params: Record<string, any> = {
          page: currentPage,
          limit: 12,
          search: searchTerm || undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          subCategory: selectedSubcategory || undefined,
          minPrice: priceRange.min > 0 ? priceRange.min : undefined,
          maxPrice: priceRange.max < 100000 ? priceRange.max : undefined,
          sortBy: sortBy === 'price-low' || sortBy === 'price-high' ? 'basePrice' : sortBy,
          sortOrder: sortBy === 'price-low' ? 'asc' : 'desc',
          inStock: inStockOnly || undefined,
          minRating: selectedRating > 0 ? selectedRating : undefined
        };

        const response = await productService.getPublicProducts(params);

        if (!ignore && response.success && response.data) {
          setProducts(response.data.items);
          setTotalPages(response.data.pagination.totalPages);
          setTotalItems(response.data.pagination.totalItems);
        }
      } catch (error) {
        if (!ignore) {
          console.error('Failed to fetch products:', error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      ignore = true;
    };
  }, [currentPage, searchTerm, selectedCategory, selectedSubcategory, priceRange, sortBy, inStockOnly, selectedRating, searchStringParam]);

  // Handle URL change reflecting updated searches
  useEffect(() => {
    if (searchStringParam !== null) {
      setSearchTerm(searchStringParam);
    }
  }, [searchStringParam]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Detect mobile viewport and auto-close filters on resize
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (e.matches) {
        setShowFilters(false);
      }
    };
    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Lock body scroll when mobile filter drawer is open
  useEffect(() => {
    if (isMobile && showFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, showFilters]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFilters) setShowFilters(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showFilters]);

  // Close mobile filter drawer (checks viewport at call time)
  const closeMobileFilters = useCallback(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) setShowFilters(false);
  }, []);

  // Clear all filters
  const clearAllFilters = () => {
    setPriceRange({ min: 0, max: 100000 });
    setSelectedRating(0);
    setSelectedCategory('All');
    setCategoryName('');
    setSelectedSubcategory('');
    setSubcategoryName('');
    setSearchTerm('');
    setInStockOnly(false);
    setCurrentPage(1);
  };

  // All filtering is now done server-side
  const filteredProducts = products;

  const activeFiltersCount = (selectedCategory !== 'All' ? 1 : 0) +
    (selectedSubcategory ? 1 : 0) +
    (selectedRating > 0 ? 1 : 0) +
    (priceRange.min > 0 || priceRange.max < 100000 ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  // Shared filter content renderer to avoid duplication
  const renderFilterContent = (isMobileDrawer: boolean) => (
    <div className="space-y-6">
      {/* In Stock Filter */}
      <div>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setCurrentPage(1);
              if (isMobileDrawer) closeMobileFilters();
            }}
            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">In Stock Only</span>
        </label>
      </div>

      {/* Price Range Filter */}
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-3">Price Range</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={priceRange.min || ''}
              onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) || 0 })}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max < 100000 ? priceRange.max : ''}
              onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 100000 })}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <button
            onClick={() => { setCurrentPage(1); if (isMobileDrawer) closeMobileFilters(); }}
            className="w-full bg-amber-600 text-white px-4 py-2 rounded text-sm hover:bg-amber-700"
          >
            Apply Price Filter
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-3">Categories</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          <label className="flex items-center">
            <input
              type="radio"
              name={isMobileDrawer ? 'category-mobile' : 'category'}
              checked={selectedCategory === 'All'}
              onChange={() => {
                setSelectedCategory('All');
                setCategoryName('');
                setSelectedSubcategory('');
                setSubcategoryName('');
                setCurrentPage(1);
                if (isMobileDrawer) closeMobileFilters();
              }}
              className="rounded-full border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="ml-2 text-sm text-gray-700 font-medium">All Categories</span>
          </label>
          {categoriesList.map((cat) => (
            <div key={cat.id} className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name={isMobileDrawer ? 'category-mobile' : 'category'}
                  checked={selectedCategory === cat.name && !selectedSubcategory}
                  onChange={() => {
                    setSelectedCategory(cat.name);
                    setCategoryName(cat.name);
                    setSelectedSubcategory('');
                    setSubcategoryName('');
                    setCurrentPage(1);
                    if (isMobileDrawer) closeMobileFilters();
                  }}
                  className="rounded-full border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">{cat.name}</span>
              </label>

              {/* Subcategories */}
              {cat.subcategories && cat.subcategories.length > 0 && selectedCategory === cat.name && (
                <div className="ml-6 space-y-2 mt-2 border-l-2 border-gray-200 pl-3">
                  {cat.subcategories.map((sub: any) => (
                    <label key={sub.id} className="flex items-center">
                      <input
                        type="radio"
                        name={isMobileDrawer ? 'subcategory-mobile' : 'subcategory'}
                        checked={selectedSubcategory === sub.name}
                        onChange={() => {
                          setSelectedCategory(cat.name);
                          setCategoryName(cat.name);
                          setSelectedSubcategory(sub.name);
                          setSubcategoryName(sub.name);
                          setCurrentPage(1);
                          if (isMobileDrawer) closeMobileFilters();
                        }}
                        className="rounded-full border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="ml-2 text-sm text-gray-600">{sub.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Review Rating Filter */}
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-3">Customer Reviews</h4>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <label key={rating} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={isMobileDrawer ? 'rating-mobile' : 'rating'}
                value={rating}
                checked={selectedRating === rating}
                onChange={(e) => {
                  setSelectedRating(Number(e.target.value));
                  setCurrentPage(1);
                  if (isMobileDrawer) closeMobileFilters();
                }}
                className="border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <div className="ml-2 flex items-center">
                <div className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="ml-1 text-sm text-gray-700">& Up</span>
              </div>
            </label>
          ))}
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={isMobileDrawer ? 'rating-mobile' : 'rating'}
              value={0}
              checked={selectedRating === 0}
              onChange={(e) => {
                setSelectedRating(Number(e.target.value));
                setCurrentPage(1);
                if (isMobileDrawer) closeMobileFilters();
              }}
              className="border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="ml-2 text-sm text-gray-700">All Ratings</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className='font-sans'>
      {/* Hero Section */}
      <section className="relative bg-gray-100 py-6 sm:py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-800 mb-4 sm:mb-6">
              Our Product Collection
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              Discover authentic, handcrafted textiles made by skilled artisans using traditional techniques
              passed down through generations.
            </p>
          </div>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="py-8 bg-white">
        <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search - Left Side */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Controls - Right Side */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>

              {/* Category Filter Moved to Sidebar */}

              {/* Sort */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="inline-flex items-center justify-between min-w-35 sm:min-w-45 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <span className="truncate">
                    {sortBy === 'createdAt' && 'Newest First'}
                    {sortBy === 'price-low' && 'Price: Low to High'}
                    {sortBy === 'price-high' && 'Price: High to Low'}
                    {sortBy === 'rating' && 'Highest Rated'}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
                </button>
                {showSortDropdown && (
                  <div className="absolute right-0 z-50 w-56 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="py-1">
                      {[
                        { value: 'createdAt', label: 'Newest First' },
                        { value: 'price-low', label: 'Price: Low to High' },
                        { value: 'price-high', label: 'Price: High to Low' },
                        { value: 'rating', label: 'Highest Rated' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setShowSortDropdown(false);
                            setCurrentPage(1);
                          }}
                          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredProducts.length} of {totalItems} products
            {categoryName && ` in ${categoryName}`}
            {subcategoryName && ` > ${subcategoryName}`}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <section className="bg-white py-6 sm:py-8 lg:py-12">
        <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex lg:gap-8">

            {/* Backdrop for mobile filter drawer — CSS-driven via lg:hidden */}
            <div
              className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${
                showFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setShowFilters(false)}
              onKeyDown={(e) => { if (e.key === 'Escape') setShowFilters(false); }}
              role="button"
              tabIndex={-1}
              aria-label="Close filters"
            />

            {/* Mobile Filter Drawer — always in DOM for animation, hidden on lg+ via CSS */}
            <div
              className={`
                lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 bg-white overflow-y-auto shadow-xl
                transform transition-transform duration-300 ease-in-out
                ${showFilters ? 'translate-x-0' : '-translate-x-full'}
              `}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <div className="flex items-center gap-2">
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => { clearAllFilters(); closeMobileFilters(); }}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
                      aria-label="Close filters"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {renderFilterContent(true)}
              </div>
            </div>

            {/* Desktop Sidebar Filters — hidden on mobile via hidden lg:block */}
            {showFilters && (
              <div className="hidden lg:block w-80 shrink-0">
                <div className="bg-gray-100 rounded-lg p-6 sticky top-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {renderFilterContent(false)}
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                  </div>
                  <p className="text-gray-600">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Try adjusting your search terms or filters to find what you're looking for.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm sm:text-base"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6 sm:mt-8 flex justify-center">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 sm:p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        {getPageRange(currentPage, totalPages).map((p, i) =>
                          p === '…' ? (
                            <span key={`e-${i}`} className="px-1.5 sm:px-2 text-slate-400">…</span>
                          ) : (
                            <button
                              key={`p-${p}`}
                              onClick={() => setCurrentPage(p as number)}
                              aria-current={p === currentPage ? 'page' : undefined}
                              className={`min-w-8 h-8 sm:min-w-9 sm:h-9 px-1.5 sm:px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                p === currentPage ? 'bg-[#222222] text-white' : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          )
                        )}
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 sm:p-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Next page"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <Category />
    </div>
  );
};

export default Products;
