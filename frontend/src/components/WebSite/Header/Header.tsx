"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import {
  Search,
  ShoppingCart,
  Heart,
  Menu,
  X,
  User,
  Settings,
  ChevronDown,
  Store,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { IconUserFilled } from '@tabler/icons-react';
import DiscoverNav from "./Discover/DiscoverNav";
import CategoryRibbon from "./CategoryRibbon/CategoryRibbon";
import { isAuthenticated } from "@/lib/auth";
import { cartService } from "@/services/cartService";
import { wishlistService } from "@/services/wishlistService";
import { userAuthService } from "@/services/userAuthService";
import { categoryService } from "@/services/categoryService";
import NotificationDropdown from "@/components/Shared/NotificationDropdown";
import { USER_CATEGORIES } from "@/components/Shared/NotificationModal";
import CompanyLogo from "@/components/Shared/CompanyLogo";
import { subscribeToAuthChange, dispatchAuthChange } from "@/lib/authEvents";
import VendorApplicationModal from "@/components/WebSite/Shared/VendorApplicationModal";

// Pages that show the PRIMARY logo. Every other page shows the secondary logo.
// Edit this list to move a page between the two logos.
const PRIMARY_LOGO_ROUTES = ['/', '/contact', '/about', '/terms', '/privacy', '/returns'];

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  // Home + the brand/legal pages use the primary logo; all others the secondary.
  const logoVariant = PRIMARY_LOGO_ROUTES.includes(pathname) ? 'primary' : 'secondary';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  // M2C for Business — opens the existing vendor application form (same modal the
  // homepage seller banner uses). No new form is built here.
  const [showVendorModal, setShowVendorModal] = useState(false);
  const handleVendorEntry = () => setShowVendorModal(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userImage, setUserImage] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [popularSearches, setPopularSearches] = useState<string[]>([
    "Towels",
    "Bath Linen",
    "Kitchen Apron",
    "Table Linen",
    "Cotton Bags",
    "Jute",
  ]);

  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);

  // Listen for global open-search-modal event (e.g. from SubCategories page)
  useEffect(() => {
    const openModal = () => setShowSearchModal(true);
    window.addEventListener('open-search-modal', openModal);
    return () => window.removeEventListener('open-search-modal', openModal);
  }, []);

  // Close the search panel on Escape
  useEffect(() => {
    if (!showSearchModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSearchModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSearchModal]);

  // Close dropdowns when clicking outside. Each panel is checked independently —
  // an unmounted panel must not keep its open sibling from closing.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutside = (ref: React.RefObject<HTMLDivElement | null>) =>
        !ref.current || !ref.current.contains(target);

      if (isOutside(accountDropdownRef)) setShowAccountDropdown(false);
      if (isOutside(searchModalRef)) setShowSearchModal(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Check if admin or user is logged in — event-driven, no polling.
  // Same-tab login/logout dispatches a custom event; other tabs fire the
  // native `storage` event. Both are handled by subscribeToAuthChange.
  useEffect(() => {
    const checkAuth = () => {
      setIsAdminLoggedIn(isAuthenticated())

      const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')
      const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData')

      if (userToken && userData) {
        setIsUserLoggedIn(true)
        try {
          const user = JSON.parse(userData)
          setUserName(user.name || '')
          setUserImage(user.image || '')
        } catch {
          setIsUserLoggedIn(false)
          setUserName('')
          setUserImage('')
        }
      } else {
        setIsUserLoggedIn(false)
        setUserName('')
        setUserImage('')
      }
    }
    checkAuth()
    return subscribeToAuthChange(checkAuth)
  }, [])

  // Load cart and wishlist counts
  useEffect(() => {
    const loadCounts = async () => {
      try {
        if (userAuthService.isAuthenticated()) {
          // Cart + wishlist are independent — fetch in parallel so the header
          // badges resolve in one round trip instead of two.
          const [cartResult, wishlistResult] = await Promise.allSettled([
            cartService.getCart(),
            wishlistService.getWishlist(),
          ]);
          if (cartResult.status === 'fulfilled' && cartResult.value.success && cartResult.value.data) {
            setCartCount(cartResult.value.data.itemCount || 0);
          }
          if (wishlistResult.status === 'fulfilled' && wishlistResult.value.success && wishlistResult.value.data) {
            setWishlistCount(wishlistResult.value.data.count || 0);
          }
        } else {
          // Guest users — show local cart count
          setCartCount(cartService.getLocalCart().length);
          setWishlistCount(0);
        }
      } catch (error) {
        console.error('Error loading counts:', error);
      }
    };

    loadCounts();

    // Listen for instant cart changes (same pattern as wishlist)
    const cartHandler = (e: Event) => {
      setCartCount((e as CustomEvent).detail.count);
    };
    window.addEventListener('cart-changed', cartHandler);

    // Listen for instant wishlist changes
    const wishlistHandler = (e: Event) => {
      setWishlistCount((e as CustomEvent).detail.count);
    };
    window.addEventListener('wishlist-changed', wishlistHandler);

    return () => {
      window.removeEventListener('cart-changed', cartHandler);
      window.removeEventListener('wishlist-changed', wishlistHandler);
    };
  }, [isUserLoggedIn]);

  // Load Popular Searches (Subcategories)
  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          includeSubcategories: 'true'
        });

        if (response.success && response.data) {
          // Extract subcategories
          const subcategories: string[] = [];
          response.data.forEach((cat) => {
            if (cat.subcategories && cat.subcategories.length > 0) {
              cat.subcategories.forEach((sub) => {
                if (sub.status === 'ACTIVE') {
                  subcategories.push(sub.name);
                }
              });
            }
          });

          if (subcategories.length > 0) {
            // Pick up to 6 random or first subcategories 
            // Optional: Shuffle them or just slice the first 6
            setPopularSearches(subcategories.slice(0, 8));
          }
        }
      } catch (error) {
        console.error("Failed to load popular searches:", error);
      }
    };

    fetchPopularSearches();
  }, [])

  const isActiveLink = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      // Import user auth service and toast utils
      const { userAuthService } = await import('@/services/userAuthService')
      const { showSuccessToast } = await import('@/lib/toast-utils')

      // Call logout API
      await userAuthService.logout()

      // Clear auth data
      userAuthService.clearAuthData()

      // Update state
      setIsUserLoggedIn(false)
      setUserName('')
      setShowAccountDropdown(false)

      // Show success toast
      showSuccessToast('Logged Out', 'You have been successfully logged out.')

      // Redirect to home after a short delay to show toast
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    } catch (error) {
      console.error('Logout error:', error)
      const { showSuccessToast } = await import('@/lib/toast-utils')

      // Clear data anyway
      localStorage.removeItem('userToken')
      sessionStorage.removeItem('userToken')
      localStorage.removeItem('userData')
      sessionStorage.removeItem('userData')
      dispatchAuthChange()
      setIsUserLoggedIn(false)
      setUserName('')

      // Show success toast even on error since we're clearing locally
      showSuccessToast('Logged Out', 'You have been logged out.')

      setTimeout(() => {
        window.location.href = '/'
      }, 1000)
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchModal(false);
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(""); // Clear it after sending
    }
  };

  const handleSearchShortcut = (term: string) => {
    setShowSearchModal(false);
    router.push(`/products?search=${encodeURIComponent(term)}`);
    setSearchQuery("");
  }

  return (
    <div className="sticky top-0 z-50 font-sans isolate">
      {/* Main Header — no heavy shadow: it used to cast over the category nav
          below and make it look 'hidden behind'. The nav row carries the one
          subtle shadow at the bottom of the sticky header stack. */}
      {/* No divider between this row and the category ribbon below — the two rows
          read as one continuous header surface; the ribbon carries the single
          bottom edge. Same container/max-width as the ribbon so both align. */}
      <header className="relative z-30 bg-white transition-all duration-300">
        <div className="max-w-7xl xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-[68px] gap-3 sm:gap-4">

            {/* Logo — sized to sit comfortably in the row without dominating it. */}
            <Link href="/" className="flex items-center shrink-0">
              <CompanyLogo
                variant={logoVariant}
                className="h-11 sm:h-12 lg:h-14 w-auto object-contain"
                skeletonClassName="h-11 sm:h-12 lg:h-14 aspect-square bg-gray-100"
                fallbackSizes="(max-width: 640px) 44px, (max-width: 1024px) 48px, 56px"
                priority
              />
            </Link>

            {/* Prominent inline search — the primary way to find products
                (Amazon/Flipkart/Myntra pattern). Fills the header on md+; on
                mobile the compact search icon in the actions opens the modal. */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 min-w-0 max-w-lg lg:max-w-xl mx-4 lg:mx-6">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, categories & more"
                  aria-label="Search products"
                  className="w-full pl-10 pr-28 py-2 lg:py-2.5 rounded-full bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:bg-white focus:border-[#e01a1b] focus:ring-4 focus:ring-[#e01a1b]/10 outline-none transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 bg-[#e01a1b] hover:bg-[#c41617] text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden 2xl:inline">Search</span>
                </button>
              </div>
            </form>

            {/* Action Icons */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
              {/* DISCOVER ✦ — the marketplace exploration entry point (complements search) */}
              <DiscoverNav />

              {/* Notifications (logged-in users only) */}
              {isUserLoggedIn && (
                <NotificationDropdown categories={USER_CATEGORIES} colorScheme="brand" />
              )}

              {/* Wishlist — same format as Account & Cart */}
              <Link
                href="/wishlist"
                className="order-3 flex items-center gap-1.5 px-2.5 lg:px-3 py-2 rounded-lg text-gray-700 hover:text-[#e01a1b] hover:bg-[#fff1f1] text-sm font-medium transition-colors"
              >
                <span className="relative">
                  <Heart className="w-5 h-5 text-[#e01a1b]" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#e01a1b] text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-semibold text-[10px] ring-2 ring-white">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
                </span>
                <span className="hidden 2xl:inline">Wishlist</span>
              </Link>

              {/* Cart — same format as Account & Wishlist */}
              <Link
                href="/cart"
                className="order-2 flex items-center gap-1.5 px-2.5 lg:px-3 py-2 rounded-lg text-gray-700 hover:text-[#e01a1b] hover:bg-[#fff1f1] text-sm font-medium transition-colors"
              >
                <span className="relative">
                  <ShoppingCart className="w-5 h-5 text-[#e01a1b]" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-[#e01a1b] text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-semibold text-[10px] ring-2 ring-white">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
                <span className="hidden 2xl:inline">Cart</span>
              </Link>

              {/* Search Icon — mobile only (desktop uses the inline bar) */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="order-5 md:hidden p-2 text-[#222222] hover:text-white hover:bg-[#e01a1b] rounded-lg transition-all duration-200 transform hover:scale-110"
                aria-label="Search"
              >
                <Search className="w-5 h-5 md:w-6 md:h-6" />
              </button>

              {/* ── SELL ON M2C — premium animated CTA pill (charcoal→gold→red) ──
                  Vertically centred like the rest of the cluster. On hover: a light
                  shine sweeps across, the storefront lifts with a sparkle pop, the
                  arrow flies up-right, and the pill lifts with a brand glow. Opens the
                  existing vendor application form on click. */}
              <div className="order-5 hidden lg:flex items-center self-center">
                <span className="mx-1.5 h-6 w-px bg-[#EFE8DB]" aria-hidden="true" />
                <button
                  type="button"
                  onClick={handleVendorEntry}
                  aria-label="Sell on M2C"
                  className="group/sell relative inline-flex items-center gap-2 overflow-hidden rounded-full px-3.5 xl:px-4 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/45"
                  style={{ backgroundImage: 'linear-gradient(120deg,#e01a1b 0%,#ff5a36 100%)' }}
                >
                  {/* diagonal shine sweep on hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -translate-x-[130%] skew-x-[20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-[900ms] ease-out group-hover/sell:translate-x-[130%] motion-reduce:hidden"
                  />
                  {/* storefront glyph + sparkle pop */}
                  <span className="relative flex items-center justify-center">
                    <Store
                      className="w-4 h-4 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover/sell:-translate-y-0.5 group-hover/sell:scale-110"
                      strokeWidth={2}
                    />
                    <Sparkles
                      className="absolute -top-2 -right-2 w-2.5 h-2.5 text-amber-200 opacity-0 scale-50 transition-all duration-300 ease-out motion-reduce:transition-none group-hover/sell:opacity-100 group-hover/sell:scale-100"
                      strokeWidth={2.5}
                    />
                  </span>
                  <span className="relative hidden xl:inline">Sell on M2C</span>
                  <span className="relative xl:hidden">Sell</span>
                  <ArrowUpRight
                    className="relative w-3.5 h-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover/sell:translate-x-0.5 group-hover/sell:-translate-y-0.5"
                    strokeWidth={2.5}
                  />
                </button>
              </div>

              {/* User Account Dropdown — bordered pill, first in the cluster */}
              <div
                className="order-4 hidden lg:block relative"
                ref={accountDropdownRef}
              >
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-1.5 px-2.5 lg:px-3 py-2 rounded-lg text-gray-700 hover:text-[#e01a1b] hover:bg-[#fff1f1] text-sm font-medium transition-colors"
                >
                  {isUserLoggedIn && userImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userImage} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-[#e01a1b]/25 shrink-0" />
                  ) : (
                    <User className="w-5 h-5 text-[#e01a1b] shrink-0" />
                  )}
                  <span className="max-w-[90px] truncate">
                    {isUserLoggedIn && userName ? userName.split(' ')[0].slice(0, 10) : 'Sign In'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showAccountDropdown ? 'rotate-180' : ''}`} />
                  <span className="sr-only">
                    {isUserLoggedIn && userName ? userName.split(' ')[0].slice(0, 10) : 'Account'}
                  </span>
                </button>

                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1">
                      {isUserLoggedIn && userName && (
                        <>
                          <div className="px-3 sm:px-4 py-2 border-b border-slate-100">
                            <p className="text-xs text-slate-500">Signed in as</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                          </div>
                        </>
                      )}
                      {isAdminLoggedIn && (
                        <>
                          <Link
                            href="/admin/dashboard"
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-slate-700 hover:bg-gray-50 hover:text-gray-600 transition-all duration-150 font-medium"
                            onClick={() => setShowAccountDropdown(false)}
                          >
                            <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                            <span>Admin Dashboard</span>
                          </Link>
                          <hr className="my-2 border-slate-100" />
                        </>
                      )}
                      {isUserLoggedIn && (
                        <>
                          <Link
                            href="/profile"
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-slate-700 hover:bg-gray-50 hover:text-gray-600 transition-all duration-150 font-medium"
                            onClick={() => setShowAccountDropdown(false)}
                          >
                            <IconUserFilled className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            href="/order"
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-slate-700 hover:bg-gray-50 hover:text-gray-600 transition-all duration-150 font-medium"
                            onClick={() => setShowAccountDropdown(false)}
                          >
                            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>My Orders</span>
                          </Link>
                          <hr className="my-2 border-slate-100" />
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-all duration-150 text-left font-medium"
                          >
                            <User className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Logout</span>
                          </button>
                        </>
                      )}
                      {!isUserLoggedIn && (
                        <Link
                          href="/login"
                          className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-700 transition-all duration-150 text-left font-medium"
                          onClick={() => setShowAccountDropdown(false)}
                        >
                          <User className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Login</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-slate-700 hover:text-gray-600 hover:bg-slate-100 rounded-lg transition-all duration-200 transform hover:scale-110"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t-2 border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-1 sm:space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
              <Link
                href="/"
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${isActiveLink("/")
                  ? "bg-[#e01a1b] text-white shadow-[0_4px_12px_rgba(224,26,27,0.3)]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-gray-600"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>

              <Link
                href="/products"
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${isActiveLink("/products")
                  ? "bg-[#e01a1b] text-white shadow-[0_4px_12px_rgba(224,26,27,0.3)]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-gray-600"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Products
              </Link>

              <Link
                href="/about"
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${isActiveLink("/about")
                  ? "bg-[#e01a1b] text-white shadow-[0_4px_12px_rgba(224,26,27,0.3)]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-gray-600"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>

              <Link
                href="/contact"
                className={`block px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${isActiveLink("/contact")
                  ? "bg-[#e01a1b] text-white shadow-[0_4px_12px_rgba(224,26,27,0.3)]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-gray-600"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>

              <Link
                href="/order"
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${isActiveLink("/order")
                  ? "bg-[#e01a1b] text-white shadow-[0_4px_12px_rgba(224,26,27,0.3)]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-gray-600"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>My Orders</span>
              </Link>

              {/* Sell on M2C — opens the existing vendor form (mobile). */}
              <button
                type="button"
                onClick={() => { setIsMenuOpen(false); handleVendorEntry(); }}
                aria-label="Sell on M2C"
                className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base text-[#252525] border border-[#C7A66A]/55 bg-[#FAF7F1] hover:border-[#C7A66A] hover:bg-[#FBF5EA]"
              >
                <Store className="w-4 h-4 text-[#C7A66A]" strokeWidth={1.75} />
                <span className="uppercase tracking-[0.07em] text-[13px] font-semibold">Sell on M2C</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#C7A66A] ml-auto" strokeWidth={2} />
              </button>

              <hr className="my-3 sm:my-4 border-slate-200" />

              {isUserLoggedIn && userName && (
                <div className="px-3 sm:px-4 py-2 bg-gray-50 rounded-lg mb-2">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                </div>
              )}

              {isAdminLoggedIn && (
                <>
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 hover:bg-slate-100 hover:text-gray-600 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Admin Dashboard
                  </Link>
                  <hr className="my-3 sm:my-4 border-slate-200" />
                </>
              )}

              {isUserLoggedIn && (
                <>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 hover:bg-slate-100 hover:text-gray-600 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <IconUserFilled className="w-4 h-4" />
                    My Account
                  </Link>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base text-left"
                  >
                    <User className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}

              {!isUserLoggedIn && (
                <Link
                  href="/login"
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-slate-700 hover:bg-slate-100 hover:text-gray-600 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Adaptive Category Ribbon — fast-access category rail below the header.
          Wrapped in Suspense because CategoryRibbon calls useSearchParams(), which
          opts a route out of static pre-rendering unless a boundary is present.
          Without this, `next build` fails while prerendering every page that
          carries the header (/about, /terms, /cart, /categories …).
          fallback={null} is deliberate: the ribbon is client-only today anyway, so
          leaving it out of the prerendered HTML changes nothing visually. */}
      <Suspense fallback={null}>
        <CategoryRibbon />
      </Suspense>

      {/* Search panel — drops down from the header, page stays visible behind */}
      {showSearchModal && (
        <>
          {/* Soft scrim: dims the page below the header without hiding it */}
          <div
            className="fixed inset-0 z-0 bg-slate-900/25 backdrop-blur-[2px] animate-in fade-in duration-200"
            onClick={() => setShowSearchModal(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 right-0 top-full z-10 px-3 sm:px-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div
              ref={searchModalRef}
              className="bg-white rounded-b-2xl shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)] w-full max-w-3xl mx-auto overflow-hidden border border-t-0 border-slate-200"
            >
              <div className="p-4 sm:p-5">
                {/* Search Input Section */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex items-center gap-2 sm:gap-3 bg-slate-50 border border-slate-200 focus-within:border-[#e01a1b] focus-within:ring-2 focus-within:ring-[#e01a1b]/15 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200"
                >
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search for products, categories, brands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-sm sm:text-base font-medium outline-none bg-transparent text-slate-800 placeholder-slate-400"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="submit"
                      className="bg-[#e01a1b] hover:bg-[#c01617] text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors shrink-0"
                    >
                      Search
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSearchModal(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                    aria-label="Close search"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </form>
                {!searchQuery && popularSearches.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-widest">
                      Popular Searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {popularSearches.map((term) => (
                        <button
                          key={term}
                          onClick={() => handleSearchShortcut(term)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-[#e01a1b] hover:border-[#e01a1b] hover:text-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors duration-200"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Existing vendor application form — opened by the Seller Portal control. */}
      <VendorApplicationModal open={showVendorModal} onClose={() => setShowVendorModal(false)} />
    </div>
  );
};

export default Header;
