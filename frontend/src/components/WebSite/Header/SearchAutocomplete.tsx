'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Clock, TrendingUp, X, ArrowRight, Package, Loader2 } from 'lucide-react'
import { publicProductService, type SearchSuggestion } from '@/services/publicProductService'
import { getRecentSearches, recordSearch, removeRecentSearch } from '@/lib/browsingHistory'
import { formatPrice, getRegionalPrice } from '@/lib/currency'

/**
 * Smart search-as-you-type for the header. Debounced suggestions from the backend
 * (partial keyword match across name/category/material/colour/size/SKU/tags/…),
 * keyword highlighting, keyboard navigation, recent + popular searches, and a helpful
 * no-results state. Pressing Enter (or "View all results") opens the existing
 * /products?search= results page — the product cards, filters and sorting there are
 * untouched. Used by both the desktop inline bar and the mobile search modal.
 */

export interface SearchAutocompleteProps {
  variant?: 'desktop' | 'mobile'
  popularSearches?: string[]
  autoFocus?: boolean
  /** Called right before navigating away (mobile: close the search modal). */
  onNavigate?: () => void
}

const SUGGEST_FALLBACKS = ['Towels', 'Cotton', 'Terry', 'Bath Towel', 'Bedsheets']

// Bold the matched part of a suggestion so it's clear why it appeared.
function highlight(text: string, q: string) {
  const query = q.trim()
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-[#1a1a1a]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchAutocomplete({
  variant = 'desktop',
  popularSearches = [],
  autoFocus = false,
  onNavigate,
}: SearchAutocompleteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recents, setRecents] = useState<string[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const term = query.trim()
  const typing = term.length >= 2

  // Refresh recent searches whenever the box opens.
  const refreshRecents = useCallback(() => setRecents(getRecentSearches().slice(0, 6)), [])

  // Debounced suggestion fetch — one request settles ~250ms after typing stops.
  useEffect(() => {
    if (!typing) { setSuggestions([]); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      const res = await publicProductService.getSuggestions(term)
      if (!cancelled) { setSuggestions(res); setLoading(false); setActiveIndex(-1) }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [term, typing])

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => { if (autoFocus) inputRef.current?.focus() }, [autoFocus])

  const go = useCallback((url: string) => {
    setOpen(false)
    setActiveIndex(-1)
    onNavigate?.()
    router.push(url)
  }, [onNavigate, router])

  const submitTerm = useCallback((raw: string) => {
    const t = raw.trim()
    if (!t) return
    recordSearch(t)
    go(`/products?search=${encodeURIComponent(t)}`)
    setQuery('')
  }, [go])

  const openProduct = useCallback((id: string) => {
    if (term) recordSearch(term)
    go(`/products/${id}`)
    setQuery('')
  }, [go, term])

  // The keyboard-navigable list depends on what's showing: product rows + "view all"
  // while typing; recent then popular terms when the box is empty.
  const navItems: Array<{ kind: 'product'; id: string } | { kind: 'viewall' } | { kind: 'term'; term: string }> = typing
    ? [...suggestions.map((s) => ({ kind: 'product' as const, id: s.id })), { kind: 'viewall' as const }]
    : [...recents.map((t) => ({ kind: 'term' as const, term: t })), ...popularSearches.map((t) => ({ kind: 'term' as const, term: t }))]

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, navItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = activeIndex >= 0 ? navItems[activeIndex] : null
      if (item?.kind === 'product') openProduct(item.id)
      else if (item?.kind === 'term') submitTerm(item.term)
      else submitTerm(term) // 'viewall' or nothing highlighted → full results
    }
  }

  const showDropdown = open && (typing || recents.length > 0 || popularSearches.length > 0)
  const popularToShow = recents.length === 0 ? popularSearches.slice(0, 8) : []
  const isMobile = variant === 'mobile'

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Input */}
      <div className="relative w-full">
        {isMobile && <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { refreshRecents(); setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder="Search for products, categories & more"
          aria-label="Search products"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className={isMobile
            ? 'w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-24 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-[#e01a1b] focus:bg-white focus:ring-2 focus:ring-[#e01a1b]/15'
            : 'w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-4 pr-28 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-[#e01a1b] focus:bg-white focus:ring-4 focus:ring-[#e01a1b]/10 lg:py-2.5'}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus() }}
            className="absolute right-[6.5rem] top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => submitTerm(term)}
          className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-[#e01a1b] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#c41617]"
        >
          <Search className="h-4 w-4" />
          <span className="hidden 2xl:inline">Search</span>
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-12px_rgba(15,23,42,0.35)]">
          {/* Typing → product suggestions / loading / no results */}
          {typing ? (
            loading && suggestions.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : suggestions.length > 0 ? (
              <>
                <p className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Products</p>
                <ul>
                  {suggestions.map((s, i) => {
                    const price = getRegionalPrice(s as never)
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => openProduct(s.id)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${activeIndex === i ? 'bg-[#fdf1ef]' : 'hover:bg-slate-50'}`}
                        >
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {s.image ? (
                              <Image src={s.image} alt={s.name} fill sizes="44px" className="object-cover" />
                            ) : (
                              <span className="flex h-full items-center justify-center"><Package className="h-5 w-5 text-slate-300" /></span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-slate-700">{highlight(s.name, term)}</span>
                            {s.category && <span className="block truncate text-[11px] text-slate-400">in {s.category}</span>}
                          </span>
                          {price > 0 && <span className="shrink-0 text-sm font-bold text-[#e01a1b]">{formatPrice(price)}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(suggestions.length)}
                  onClick={() => submitTerm(term)}
                  className={`flex w-full items-center justify-between border-t border-slate-100 px-4 py-3 text-sm font-semibold text-[#e01a1b] transition-colors ${activeIndex === suggestions.length ? 'bg-[#fdf1ef]' : 'hover:bg-slate-50'}`}
                >
                  View all results for &ldquo;{term}&rdquo;
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="px-4 py-5 text-sm">
                <p className="text-slate-700">No products found for <span className="font-semibold">&ldquo;{term}&rdquo;</span></p>
                <p className="mt-2 text-[13px] text-slate-500">Try searching for:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SUGGEST_FALLBACKS.map((t) => (
                    <button key={t} type="button" onClick={() => submitTerm(t)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-[#e01a1b] hover:text-[#e01a1b]">{t}</button>
                  ))}
                </div>
                <button type="button" onClick={() => go('/products')} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#e01a1b] hover:underline">
                  View All Products <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )
          ) : (
            /* Empty box → recent searches, else popular searches */
            <div className="py-2">
              {recents.length > 0 && (
                <div className="px-2">
                  <p className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">Recent searches</p>
                  <ul>
                    {recents.map((t, i) => (
                      <li key={t} className={`flex items-center rounded-lg ${activeIndex === i ? 'bg-[#fdf1ef]' : 'hover:bg-slate-50'}`}>
                        <button type="button" onMouseEnter={() => setActiveIndex(i)} onClick={() => submitTerm(t)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-2 text-left text-sm text-slate-700">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{t}</span>
                        </button>
                        <button type="button" aria-label={`Remove ${t}`} onClick={() => { removeRecentSearch(t); refreshRecents() }} className="mr-1 shrink-0 rounded-full p-1.5 text-slate-300 transition-colors hover:text-slate-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {popularToShow.length > 0 && (
                <div className="px-4 pb-2 pt-2">
                  <p className="pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">Popular searches</p>
                  <div className="flex flex-wrap gap-2">
                    {popularToShow.map((t) => (
                      <button key={t} type="button" onClick={() => submitTerm(t)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-[#e01a1b] hover:bg-[#e01a1b] hover:text-white">
                        <TrendingUp className="h-3 w-3" />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
