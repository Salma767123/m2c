'use client';

import ProductCard from '../ProductCard/ProductCard';
import Category from '@/components/WebSite/CategoryCopy/Category';
import VendorPartnerCTA from '@/components/WebSite/VendorPartnerCTA/VendorPartnerCTA';
import Reveal from '@/components/WebSite/Shared/Reveal';
import CategoryHero from '@/components/WebSite/Shared/CategoryHero';
import SectionBackdrop from '@/components/WebSite/Shared/SectionBackdrop';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FaceIcon, FACE_FILTER_LABELS, type FaceValue } from '@/components/WebSite/Shared/FaceRating';

/**
 * The banner's fallback, used with nothing selected and for any category whose
 * admin record has no description. Both strings are the page's own original
 * copy, kept word for word.
 */
const DEFAULT_BANNER_TITLE = 'Our Product Collection';
const DEFAULT_BANNER_BLURB =
  'Discover authentic, handcrafted textiles made by skilled artisans using traditional techniques passed down through generations.';

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
import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { productService, Product } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import { isVisibleInRegion } from '@/lib/currency';

// Live filter facets returned by the backend (all computed from real products).
interface ProductFacets {
  colors: Array<{ value: string; hex: string | null; count: number }>;
  sizes: Array<{ value: string; count: number }>;
  materials: Array<{ value: string; count: number }>;
  fabricTypes: Array<{ value: string; count: number }>;
  priceRange: { min: number; max: number };
  maxDiscount: number;
}

// Collapsible filter section (Myntra/Flipkart style), open by default.
function CollapsibleSection({ title, count, defaultOpen = true, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Toggle open/close. Only a genuine user expand nudges the revealed content into
  // view — never on mount/re-render, so the page always loads at the very top.
  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => {
          sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      return next;
    });
  };

  return (
    <div ref={sectionRef} className="border-t border-gray-200 pt-4">
      <button type="button" onClick={handleToggle} className="flex w-full items-center justify-between text-left">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          {title}{count != null && count > 0 ? <span className="ml-1 font-normal normal-case text-gray-400">({count})</span> : null}
        </h4>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// Homepage collections, driven by product tags. The `?collection=` URL param maps a
// clean slug to the exact tag stored on products, so "View All" on each home section
// deep-links here pre-filtered.
const COLLECTIONS = [
  { key: 'featured', label: 'Featured', tag: 'Featured' },
  { key: 'top-selling', label: 'Top Selling', tag: 'Top Selling' },
  { key: 'best-seller', label: 'Best Seller', tag: 'Best Seller' },
];

const Products = () => {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const subcategoryParam = searchParams.get('subcategory');
  const searchStringParam = searchParams.get('search');
  const collectionParam = searchParams.get('collection');

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
  // Open by default on desktop so shoppers see the filters immediately; the
  // mobile media-query effect below force-closes it on small screens.
  const [showFilters, setShowFilters] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [selectedRating, setSelectedRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  // Dynamic facet filters (all driven by real product data)
  const [facets, setFacets] = useState<ProductFacets | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedFabricTypes, setSelectedFabricTypes] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [newArrivals, setNewArrivals] = useState(false);
  // Collection filter (Featured / Top Selling / Best Seller), seeded from ?collection=.
  const [selectedCollection, setSelectedCollection] = useState(
    COLLECTIONS.some((c) => c.key === collectionParam) ? (collectionParam as string) : ''
  );

  const toggleInArray = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((arr) => (arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]));
    setCurrentPage(1);
  };

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

              // A sub-category in the URL is intentionally NOT auto-applied as a
              // filter: landing shows the whole category, and the shopper narrows
              // it via the sidebar if they want. This avoids an empty result when
              // a sub-category has no products yet.
              void subcategoryParam;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, [categoryParam, subcategoryParam]);

  // Fetch available filter facets (live from the catalogue) for the current
  // search/category context. Re-runs when the context changes so the options
  // always reflect what's actually available.
  useEffect(() => {
    let ignore = false;
    productService
      .getPublicProductFacets({
        search: searchTerm || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        subCategory: selectedSubcategory || undefined,
      })
      .then((res) => { if (!ignore && res.success) setFacets(res.data); })
      .catch(() => { /* facets are optional — ignore */ });
    return () => { ignore = true; };
  }, [searchTerm, selectedCategory, selectedSubcategory]);

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
          minRating: selectedRating > 0 ? selectedRating : undefined,
          colors: selectedColors.length ? selectedColors.join(',') : undefined,
          sizes: selectedSizes.length ? selectedSizes.join(',') : undefined,
          materials: selectedMaterials.length ? selectedMaterials.join(',') : undefined,
          fabricTypes: selectedFabricTypes.length ? selectedFabricTypes.join(',') : undefined,
          minDiscount: minDiscount > 0 ? minDiscount : undefined,
          newArrivals: newArrivals || undefined,
          tag: COLLECTIONS.find((c) => c.key === selectedCollection)?.tag || undefined,
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
  }, [currentPage, searchTerm, selectedCategory, selectedSubcategory, priceRange, sortBy, inStockOnly, selectedRating, selectedColors, selectedSizes, selectedMaterials, selectedFabricTypes, minDiscount, newArrivals, selectedCollection, searchStringParam]);

  // Keep the collection filter in sync when the ?collection= param changes while
  // already on this page (e.g. jumping between the home sections' "View All" links).
  useEffect(() => {
    setSelectedCollection(COLLECTIONS.some((c) => c.key === collectionParam) ? (collectionParam as string) : '');
    setCurrentPage(1);
  }, [collectionParam]);

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
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedMaterials([]);
    setSelectedFabricTypes([]);
    setMinDiscount(0);
    setNewArrivals(false);
    setSelectedCollection('');
    setCurrentPage(1);
  };

  // All filtering is now done server-side
  const filteredProducts = products.filter(p => isVisibleInRegion((p as any).priceVisibility));

  // Category / sub-category come from navigation (the URL), not user-applied
  // filters — so they're excluded from the "Filters (N)" badge count.
  const activeFiltersCount =
    (selectedRating > 0 ? 1 : 0) +
    (priceRange.min > 0 || priceRange.max < 100000 ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    selectedColors.length +
    selectedSizes.length +
    selectedMaterials.length +
    selectedFabricTypes.length +
    (minDiscount > 0 ? 1 : 0) +
    (newArrivals ? 1 : 0) +
    (selectedCollection ? 1 : 0);

  // Shared filter content renderer to avoid duplication
  const renderFilterContent = (isMobileDrawer: boolean) => (
    <div className="space-y-6">
      {/* Quick toggles */}
      <div className="space-y-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setCurrentPage(1);
            }}
            className="rounded border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">In Stock Only</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={newArrivals}
            onChange={(e) => {
              setNewArrivals(e.target.checked);
              setCurrentPage(1);
            }}
            className="rounded border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">New Arrivals</span>
        </label>
      </div>

      {/* Collections Filter — Featured / Top Selling / Best Seller (product tags) */}
      <div>
        <h4 className="text-base font-medium text-gray-900 mb-3">Collections</h4>
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name={isMobileDrawer ? 'collection-mobile' : 'collection'}
              checked={selectedCollection === ''}
              onChange={() => { setSelectedCollection(''); setCurrentPage(1); }}
              className="border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">All Products</span>
          </label>
          {COLLECTIONS.map((c) => (
            <label key={c.key} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name={isMobileDrawer ? 'collection-mobile' : 'collection'}
                checked={selectedCollection === c.key}
                onChange={() => { setSelectedCollection(c.key); setCurrentPage(1); }}
                className="border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">{c.label}</span>
            </label>
          ))}
        </div>
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
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#e01a1b] focus:border-[#e01a1b]"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              placeholder="Max"
              value={priceRange.max < 100000 ? priceRange.max : ''}
              onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 100000 })}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#e01a1b] focus:border-[#e01a1b]"
            />
          </div>
          <button
            onClick={() => { setCurrentPage(1); if (isMobileDrawer) closeMobileFilters(); }}
            className="btn-shine w-full bg-[#e01a1b] text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-[#c41617] transition-all duration-300"
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
              className="rounded-full border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
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
                  className="rounded-full border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
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
                        className="rounded-full border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
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
          {/* 5 was absent: the list was inherited from "4 stars & up", where
              nobody offers a 5-star-only filter because it reads as a mistake
              next to four stars. With words it is the most useful rung there
              is -- "Loved it" -- and leaving it out looked like an oversight. */}
          {[5, 4, 3, 2, 1].map((rating) => (
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
                className="border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
              />
              {/* One face and the words, instead of five stars and "& Up".
                  A row of five star glyphs repeated four times was twenty
                  glyphs saying four things; the face is the threshold and the
                  label says it in words. Colour only on the selected row, so
                  the list reads as a set of choices rather than four ratings. */}
              <div className="ml-2 flex items-center gap-2">
                <FaceIcon value={rating as FaceValue} className="h-5 w-5" />
                <span className={`text-sm ${selectedRating === rating ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {FACE_FILTER_LABELS[rating as FaceValue]}
                </span>
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
              className="border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
            />
            <span className={`ml-2 text-sm ${selectedRating === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>Any rating</span>
          </label>
        </div>
      </div>

      {/* ── Dynamic facets (only rendered when the catalogue actually has them) ── */}

      {/* Discount — buckets capped at the real maximum available discount */}
      {facets && facets.maxDiscount >= 10 && (
        <CollapsibleSection title="Discount">
          <div className="space-y-2">
            {[10, 20, 30, 40, 50].filter((d) => d <= facets.maxDiscount).map((d) => (
              <label key={d} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={isMobileDrawer ? 'discount-mobile' : 'discount'}
                  checked={minDiscount === d}
                  onChange={() => { setMinDiscount(d); setCurrentPage(1); }}
                  className="border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]"
                />
                <span className="ml-2 text-sm text-gray-700">{d}% and above</span>
              </label>
            ))}
            {minDiscount > 0 && (
              <button type="button" onClick={() => { setMinDiscount(0); setCurrentPage(1); }} className="text-xs text-[#e01a1b] hover:text-[#c41617] font-medium">Clear</button>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Color — swatches from real variant/single-unit colours */}
      {facets && facets.colors.length > 0 && (
        <CollapsibleSection title="Color" count={facets.colors.length}>
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const active = selectedColors.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleInArray(setSelectedColors, c.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${active ? 'border-[#e01a1b] bg-[#fff1f1] text-[#e01a1b]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  <span className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 shrink-0" style={{ backgroundColor: c.hex || '#cccccc' }} />
                  {c.value}
                  <span className="text-gray-400">{c.count}</span>
                </button>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Size */}
      {facets && facets.sizes.length > 0 && (
        <CollapsibleSection title="Size" count={facets.sizes.length}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => {
              const active = selectedSizes.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleInArray(setSelectedSizes, s.value)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${active ? 'border-[#e01a1b] bg-[#fff1f1] text-[#e01a1b]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}
                >
                  {s.value}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Material */}
      {facets && facets.materials.length > 0 && (
        <CollapsibleSection title="Material" count={facets.materials.length}>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {facets.materials.map((m) => (
              <label key={m.value} className="flex items-center cursor-pointer">
                <input type="checkbox" checked={selectedMaterials.includes(m.value)} onChange={() => toggleInArray(setSelectedMaterials, m.value)} className="rounded border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]" />
                <span className="ml-2 text-sm text-gray-700 flex-1 min-w-0 truncate">{m.value}</span>
                <span className="text-xs text-gray-400 shrink-0">{m.count}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Fabric Type */}
      {facets && facets.fabricTypes.length > 0 && (
        <CollapsibleSection title="Fabric Type" count={facets.fabricTypes.length}>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {facets.fabricTypes.map((f) => (
              <label key={f.value} className="flex items-center cursor-pointer">
                <input type="checkbox" checked={selectedFabricTypes.includes(f.value)} onChange={() => toggleInArray(setSelectedFabricTypes, f.value)} className="rounded border-gray-300 text-[#e01a1b] focus:ring-[#e01a1b]" />
                <span className="ml-2 text-sm text-gray-700 flex-1 min-w-0 truncate">{f.value}</span>
                <span className="text-xs text-gray-400 shrink-0">{f.count}</span>
              </label>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );

  /**
   * Whatever the banner is currently about: the chosen subcategory if there is
   * one, else the chosen category, else nothing.
   *
   * The banner used to be the same on all nine categories - "Our Product
   * Collection" over a paragraph about skilled artisans, whether you were
   * looking at Terry Towels or Cotton Bags. Only the photograph changed. It now
   * takes its name, its description and its photograph from the record the
   * admin already fills in, so every category has its own banner and one added
   * tomorrow gets one without anybody editing this file.
   */
  const bannerSubject = useMemo(() => {
    const category = categoryName
      ? categoriesList.find((c) => c?.name === categoryName)
      : undefined;
    const subcategory =
      subcategoryName && Array.isArray(category?.subcategories)
        ? category.subcategories.find((s: { name?: string }) => s?.name === subcategoryName)
        : undefined;
    return subcategory ?? category;
  }, [categoriesList, categoryName, subcategoryName]);

  const bannerTitle: string = bannerSubject?.name?.trim() || DEFAULT_BANNER_TITLE;

  // A category with the field left blank falls back rather than showing a gap.
  const bannerBlurb: string = bannerSubject?.description?.trim() || DEFAULT_BANNER_BLURB;

  /**
   * Names the parent once a subcategory is selected, so the banner says where
   * you are rather than repeating its own headline.
   */
  const bannerEyebrow: string =
    bannerSubject && subcategoryName && categoryName && categoryName !== bannerSubject.name
      ? categoryName
      : 'Shop';

  // Prefer the subject's own photo, then the parent category's, then any
  // category's, so the header is never left flat when something is available.
  const bannerImage: string | undefined = (
    bannerSubject?.image ||
    (categoryName && categoriesList.find((c) => c?.name === categoryName && c?.image)?.image) ||
    categoriesList.find((c) => c?.image)?.image
  ) as string | undefined;

  return (
    <div className='font-sans'>
      {/* The banner is a shared component now — /categories renders the same
          one. See CategoryHero for what animates and why. */}
      <CategoryHero
        eyebrow={bannerEyebrow}
        title={bannerTitle}
        blurb={bannerBlurb}
        image={bannerImage}
      />

      {/* Filters and Search */}
      <section className="py-3 bg-white">
        <div className="max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Results count — left, in line with the controls */}
            <div className="text-sm text-gray-600">
              Showing {filteredProducts.length} of {totalItems} products
              {categoryName && ` in ${categoryName}`}
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
            {/* Controls - Right Side (inline search removed — the header search is the single entry point) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e01a1b] focus:border-[#e01a1b]"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>

              {/* Category Filter Moved to Sidebar */}

              {/* Sort */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="inline-flex items-center justify-between min-w-35 sm:min-w-45 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#e01a1b] focus:border-[#e01a1b]"
                >
                  <span className="truncate">
                    {sortBy === 'createdAt' && 'Newest First'}
                    {sortBy === 'price-low' && 'Price: Low to High'}
                    {sortBy === 'price-high' && 'Price: High to Low'}
                    {sortBy === 'rating' && 'Most Loved'}
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
                        { value: 'rating', label: 'Most Loved' }
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

        </div>
      </section>

      {/* Main Content with Sidebar */}
      <section className="relative overflow-hidden bg-linear-to-b from-[#faf9f7] via-white to-[#fdf6f6] py-6 sm:py-8 lg:py-10">
        <SectionBackdrop />
        <div className="relative max-w-420 mx-auto px-4 sm:px-6 lg:px-8">
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
                        className="text-sm text-[#e01a1b] hover:text-[#c41617] font-medium"
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
                <div className="bg-gray-100 rounded-lg p-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-sm text-[#e01a1b] hover:text-[#c41617] font-medium"
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
                /* Product grid skeleton — mirrors the 2/2/3-column ProductCard layout below. */
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="h-36 sm:h-40 md:h-48 w-full bg-gray-200 animate-pulse" />
                      <div className="p-4 space-y-3">
                        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                        <div className="h-9 w-full bg-gray-200 rounded animate-pulse mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" />
                  </div>
                  <h3 className="font-playfair text-lg sm:text-xl md:text-2xl font-semibold text-[#1a1a1a] mb-2 tracking-tight">No products found</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    Try adjusting your search terms or filters to find what you're looking for.
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="btn-shine inline-flex items-center justify-center bg-[#e01a1b] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#c41617] shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] hover:-translate-y-0.5 transition-all duration-300 text-sm sm:text-base"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                    {filteredProducts.map((product, index) => (
                      <Reveal key={product.id} delay={index * 90}>
                        <ProductCard product={product} />
                      </Reveal>
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
                                p === currentPage ? 'bg-[#e01a1b] text-white' : 'text-slate-700 hover:bg-slate-100'
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

      {/* Become a Vendor Partner — advertisement CTA */}
      <VendorPartnerCTA />
    </div>
  );
};

export default Products;
