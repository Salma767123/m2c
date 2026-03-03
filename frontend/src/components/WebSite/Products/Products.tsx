'use client';

import ProductCard from '../ProductCard/ProductCard';
import Category from '@/components/WebSite/CategoryCopy/Category';
import { Search, Filter, Grid, List, ChevronDown, Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { productService, Product } from '@/services/productService';
import { categoryService } from '@/services/categoryService';

const Products = () => {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const subcategoryParam = searchParams.get('subcategory');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 1000 });
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
              (cat: any) => cat.slug === categoryParam
            );

            if (foundCategory) {
              setCategoryName(foundCategory.name);
              setSelectedCategory(foundCategory.name);

              if (subcategoryParam && foundCategory.subcategories) {
                const foundSubcategory = foundCategory.subcategories.find(
                  (sub: any) => sub.slug === subcategoryParam
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
        const response = await productService.getPublicProducts({
          page: currentPage,
          limit: 12,
          search: searchTerm || undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          subCategory: selectedSubcategory || undefined,
          minPrice: priceRange.min > 0 ? priceRange.min : undefined,
          maxPrice: priceRange.max < 1000 ? priceRange.max : undefined,
          sortBy: sortBy === 'price-low' || sortBy === 'price-high' ? 'basePrice' : sortBy,
          sortOrder: sortBy === 'price-low' ? 'asc' : 'desc',
          inStock: inStockOnly || undefined
        });

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
  }, [currentPage, searchTerm, selectedCategory, selectedSubcategory, priceRange, sortBy, inStockOnly]);

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

  // Extract unique values for filters
  const availableColors = ['Red', 'Blue', 'Green', 'Yellow', 'White', 'Black', 'Multi'];

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedColors([]);
    setPriceRange({ min: 0, max: 1000 });
    setSelectedRating(0);
    setSelectedCategory('All');
    setCategoryName('');
    setSelectedSubcategory('');
    setSubcategoryName('');
    setSearchTerm('');
    setInStockOnly(false);
    setCurrentPage(1);
  };

  // Filter products locally (for color and rating which aren't in API)
  const filteredProducts = products.filter(product => {
    const matchesColor = selectedColors.length === 0 || selectedColors.some(color =>
      product.tags?.some(tag => tag.toLowerCase().includes(color.toLowerCase()))
    );

    const matchesRating = selectedRating === 0 || (product.rating && product.rating >= selectedRating);

    return matchesColor && matchesRating;
  });

  const activeFiltersCount = selectedColors.length +
    (selectedRating > 0 ? 1 : 0) +
    (priceRange.min > 0 || priceRange.max < 1000 ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  return (
    <div className='font-sans'>
      {/* Hero Section */}
      <section className="relative bg-gray-100 py-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
              Our Product Collection
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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

              {/* Category Filter */}
              <div className="relative" ref={categoryDropdownRef}>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="inline-flex items-center justify-between min-w-[160px] px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <span className="truncate">{selectedCategory === 'All' ? 'All Categories' : selectedCategory}</span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute right-0 z-10 w-56 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setSelectedCategory('All');
                          setCategoryName('');
                          setSelectedSubcategory('');
                          setSubcategoryName('');
                          setShowCategoryDropdown(false);
                          setCurrentPage(1);
                        }}
                        className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                      >
                        All Categories
                      </button>
                      {categoriesList.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.name);
                            setCategoryName(cat.name);
                            setSelectedSubcategory('');
                            setSubcategoryName('');
                            setShowCategoryDropdown(false);
                            setCurrentPage(1);
                          }}
                          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="inline-flex items-center justify-between min-w-[180px] px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                  <div className="absolute right-0 z-10 w-56 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
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

              {/* View Mode */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title="Grid View"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
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
      <section className="bg-white py-12">
        <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Left Sidebar Filters */}
            {showFilters && (
              <div className="w-80 shrink-0">
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
                            value={priceRange.min}
                            onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="number"
                            placeholder="Max"
                            value={priceRange.max}
                            onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        <button
                          onClick={() => setCurrentPage(1)}
                          className="w-full bg-amber-600 text-white px-4 py-2 rounded text-sm hover:bg-amber-700"
                        >
                          Apply Price Filter
                        </button>
                      </div>
                    </div>

                    {/* Color Filter */}
                    <div>
                      <h4 className="text-base font-medium text-gray-900 mb-3">Color</h4>
                      <div className="space-y-2">
                        {availableColors.map((color) => (
                          <label key={color} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedColors.includes(color)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColors([...selectedColors, color]);
                                } else {
                                  setSelectedColors(selectedColors.filter(c => c !== color));
                                }
                              }}
                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{color}</span>
                          </label>
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
                              name="rating"
                              value={rating}
                              checked={selectedRating === rating}
                              onChange={(e) => setSelectedRating(Number(e.target.value))}
                              className="border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                            <div className="ml-2 flex items-center">
                              <div className="flex">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                      }`}
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
                            name="rating"
                            value={0}
                            checked={selectedRating === 0}
                            onChange={(e) => setSelectedRating(Number(e.target.value))}
                            className="border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">All Ratings</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Products Grid */}
            <div className="flex-1">
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
                    <Search className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your search terms or filters to find what you're looking for.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className={`${viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                    }`}>
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
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
