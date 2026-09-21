'use client';

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Heart, ShoppingCart, Share2, ArrowLeft, ArrowRight, Check, Plus } from 'lucide-react';
import Link from 'next/link';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { cartService } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import Image from 'next/image';
import { formatPrice, getRegionalPrice, getRegionalOriginalPrice } from '@/lib/currency';
import { FaceIcon, positiveFace } from '@/components/WebSite/Shared/FaceRating';
import Reveal from '@/components/WebSite/Shared/Reveal';

/** How long the leave animation runs before the card is dropped from state. */
const LEAVE_MS = 380;
/** How long the "Added" confirmation stays on an Add to Cart button. */
const ADDED_MS = 1800;
/** Gap between one flight and the next when the whole list is added at once. */
const BULK_GAP_MS = 190;

const reduceMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/**
 * A figure that counts up to its value instead of appearing at it. Used on the
 * masthead totals — what the list is worth is the one number on this page worth
 * drawing the eye to, and a number that moves gets read where a number that is
 * simply printed does not.
 *
 * Snaps straight to the value when motion is turned down.
 */
function useCountUp(target: number, ms = 850) {
  const [shown, setShown] = useState(target);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    from.current = target;
    if (reduceMotion() || start === target) {
      setShown(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return shown;
}

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  /** Cards playing their leave animation — still mounted, on their way out. */
  const [leaving, setLeaving] = useState<string[]>([]);
  /** Cards showing the "Added" confirmation on their cart button. */
  const [added, setAdded] = useState<string[]>([]);
  /** Cards with an add-to-cart request in flight. */
  const [pending, setPending] = useState<string[]>([]);
  /** The whole list is being added to the cart, one after another. */
  const [bulkBusy, setBulkBusy] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const authStatus = userAuthService.isAuthenticated();
    setIsAuthenticated(authStatus);

    if (!authStatus) {
      setIsLoading(false);
      return;
    }

    loadWishlist();
  }, []);

  // Timers are held so a page-leave mid-animation can't call setState on an
  // unmounted component.
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // ── What the list is worth ───────────────────────────────────────────────
  // All of it read off prices already on screen — nothing new is fetched or
  // stored. These sit above the early returns further down because the
  // count-up hooks that follow them cannot be called conditionally.
  const priced = useMemo(() => wishlistItems.filter((i) => i.product), [wishlistItems]);
  const totalValue = useMemo(
    () => priced.reduce((sum, i) => sum + getRegionalPrice(i.product!), 0),
    [priced],
  );
  const totalSaving = useMemo(
    () => priced.reduce((sum, i) => {
      const now = getRegionalPrice(i.product!);
      const was = getRegionalOriginalPrice(i.product!) || i.product!.originalPrice || 0;
      return sum + (was > now ? was - now : 0);
    }, 0),
    [priced],
  );
  const outOfStockCount = useMemo(() => priced.filter((i) => !i.product!.inStock).length, [priced]);
  /** What "add everything" can actually act on: in stock, and no variant to pick. */
  const addable = useMemo(
    () => priced.filter((i) => i.product!.inStock && !i.product!.hasVariants),
    [priced],
  );
  const shownValue = useCountUp(totalValue);
  const shownSaving = useCountUp(totalSaving);

  // ── Cards closing the gap ────────────────────────────────────────────────
  // Removing a card used to make the ones after it jump into its place. These
  // two hold the FLIP: every card's position is read just before the removal,
  // and on the very next paint each card is put back where it was and then
  // released, so the grid closes up instead of snapping.
  const cardRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const lastRects = useRef<Map<string, DOMRect>>(new Map());

  const snapshotPositions = () => {
    const map = new Map<string, DOMRect>();
    cardRefs.current.forEach((el, id) => map.set(id, el.getBoundingClientRect()));
    lastRects.current = map;
  };

  useLayoutEffect(() => {
    const before = lastRects.current;
    if (!before.size) return;
    lastRects.current = new Map();
    if (reduceMotion()) return;

    const moved: HTMLLIElement[] = [];
    cardRefs.current.forEach((el, id) => {
      const was = before.get(id);
      if (!was) return;
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (!dx && !dy) return;

      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      moved.push(el);
    });
    if (!moved.length) return;

    // Every card has to be sitting at its old position on screen before any of
    // them is released, or there is nothing to travel from and it snaps.
    // Reading a layout value forces that. Without this line the LAST card was
    // the one that snapped: the others were flushed as a side effect of the
    // next iteration measuring itself, and nothing came after the last one.
    void document.body.offsetHeight;

    requestAnimationFrame(() => {
      moved.forEach((el) => {
        el.style.transition = 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transform = '';
        // Handed back to CSS afterwards, so the hover lift works again. The
        // timer is the backstop: transitionend does not fire if the travel is
        // interrupted, and a card left with an inline transition would never
        // lift on hover again.
        const done = () => { el.style.transition = ''; el.style.transform = ''; };
        el.addEventListener('transitionend', done, { once: true });
        later(done, 560);
      });
    });
  }, [wishlistItems]);

  const loadWishlist = async () => {
    try {
      setIsLoading(true);

      // Load from backend for authenticated users
      const response = await wishlistService.getWishlist();
      if (response.success && response.data) {
        setWishlistItems(response.data.items);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      showErrorToast('Load Failed', 'Unable to load wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (leaving.includes(productId)) return;
    // The card starts leaving straight away and the request runs alongside it,
    // so the tap feels answered. It is only dropped from the list once the
    // server has confirmed — if the call fails the card springs back rather
    // than disappearing from a wishlist it is still in.
    setLeaving((ids) => [...ids, productId]);
    try {
      await Promise.all([
        wishlistService.removeFromWishlist(productId),
        new Promise((r) => later(() => r(null), LEAVE_MS)),
      ]);
      snapshotPositions();
      setWishlistItems((items) => items.filter((item) => item.productId !== productId));
      setLeaving((ids) => ids.filter((id) => id !== productId));
      showSuccessToast('Removed', 'Item removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      setLeaving((ids) => ids.filter((id) => id !== productId));
      showErrorToast('Failed', 'Unable to remove item from wishlist');
    }
  };

  /**
   * A copy of the product image travels from the card up to the cart in the
   * header, so it is obvious where the thing just went. Purely decorative:
   * if the header cart isn't on screen, or motion is turned down, nothing is
   * drawn and the button's own confirmation carries the message.
   */
  const flyToCart = (from: HTMLElement | null, src: string) => {
    if (!from || reduceMotion()) return;
    const cart = document.querySelector('a[href="/cart"]') as HTMLElement | null;
    if (!cart) return;

    const a = from.getBoundingClientRect();
    const b = cart.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.style.cssText = [
      'position:fixed', `left:${a.left}px`, `top:${a.top}px`,
      `width:${a.width}px`, `height:${a.height}px`,
      'border-radius:14px', 'z-index:80', 'pointer-events:none',
      'background-size:cover', 'background-position:center',
      `background-image:url("${src.replace(/"/g, '\\"')}")`,
      'box-shadow:0 18px 40px rgba(0,0,0,0.22)',
    ].join(';');
    document.body.appendChild(ghost);

    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = ghost.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.4 - 40}px) scale(0.6)`, opacity: 0.95, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 },
      ],
      { duration: 760, easing: 'cubic-bezier(0.45, 0, 0.35, 1)' },
    );
    anim.onfinish = () => ghost.remove();
    anim.oncancel = () => ghost.remove();
  };

  /** The photo on a given card, which is the thing that flies to the cart. */
  const photoOf = (itemId: string) =>
    (cardRefs.current.get(itemId)?.querySelector('a.wish-shine') as HTMLElement | null) || null;

  const addToCart = async (productId: string, productName: string, image?: string, from?: HTMLElement | null) => {
    if (pending.includes(productId)) return;
    setPending((ids) => [...ids, productId]);
    if (image) flyToCart(from ?? null, image);
    try {
      await cartService.addToCart(productId, 1);
      setAdded((ids) => [...ids, productId]);
      later(() => setAdded((ids) => ids.filter((id) => id !== productId)), ADDED_MS);
      showSuccessToast('Added to Cart!', `${productName} has been added to your cart.`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      showErrorToast('Failed to Add', 'Unable to add item to cart. Please try again.');
    } finally {
      setPending((ids) => ids.filter((id) => id !== productId));
    }
  };

  /**
   * The whole list, one after another — the thing a wishlist can do that a
   * product page cannot. Out-of-stock items are skipped, and so is anything
   * with variants, because picking a colour or a size is not a decision this
   * page is allowed to make on the customer's behalf.
   *
   * Sequential on purpose: the requests are paced so the photographs leave one
   * at a time and the cart is not hit with a burst.
   */
  const addAllToCart = async () => {
    if (bulkBusy || addable.length === 0) return;
    setBulkBusy(true);
    let done = 0;
    for (const item of addable) {
      const product = item.product!;
      if (product.image) flyToCart(photoOf(item.id), product.image);
      try {
        await cartService.addToCart(item.productId, 1);
        done += 1;
        setAdded((ids) => (ids.includes(item.productId) ? ids : [...ids, item.productId]));
        later(() => setAdded((ids) => ids.filter((id) => id !== item.productId)), ADDED_MS);
      } catch (error) {
        console.error('Error adding to cart:', error);
      }
      await new Promise((r) => later(() => r(null), BULK_GAP_MS));
    }
    setBulkBusy(false);
    if (done > 0) {
      showSuccessToast('Added to Cart!', `${done} item${done === 1 ? '' : 's'} moved to your cart.`);
    }
    if (done < addable.length) {
      const missed = addable.length - done;
      showErrorToast('Some items failed', `${missed} item${missed === 1 ? '' : 's'} could not be added.`);
    }
  };

  const shareWishlist = async () => {
    try {
      setIsSharing(true);
      const shareToken = await wishlistService.getShareToken();
      const url = `${window.location.origin}/wishlist/shared/${shareToken}`;
      const productNames = wishlistItems
        .filter(item => item.product)
        .map(item => item.product!.name)
        .slice(0, 5);
      const text = productNames.length > 0
        ? `Check out my wishlist: ${productNames.join(', ')}${wishlistItems.length > 5 ? ` and ${wishlistItems.length - 5} more` : ''}`
        : 'Check out my wishlist!';

      if (navigator.share) {
        await navigator.share({ title: 'My Wishlist', text, url });
      } else {
        await navigator.clipboard.writeText(url);
        showSuccessToast('Link Copied!', 'Shareable wishlist link has been copied to clipboard.');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        showErrorToast('Share Failed', 'Unable to share wishlist. Please try again.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const shareProduct = (productId: string, productName: string) => {
    try {
      const url = `${window.location.origin}/products/${productId}`;
      if (navigator.share) {
        navigator.share({
          title: productName,
          text: `Check out this amazing product: ${productName}`,
          url: url,
        });
      } else {
        navigator.clipboard.writeText(url);
        showSuccessToast('Link Copied!', 'Product link has been copied to clipboard.');
      }
    } catch (error) {
      showErrorToast('Share Failed', 'Unable to share product. Please try again.');
    }
  };

  /* ── The page's motion ──────────────────────────────────────────────────
     Kept together in one place, and all of it transform/opacity only, so
     nothing here can reflow the grid it is animating.

     Everything is switched off under prefers-reduced-motion at the bottom;
     the page then renders exactly the same, just still.
     (No backticks in here — this is a JS template literal.) */
  const motion = (
    <style>{`
      /* Cards arrive one after another rather than all at once, each one
         turning level as it lands. The delay is inline and capped, so the
         tenth card is not still waiting. The backwards fill (not both)
         matters: the animation must stop applying a transform once it has
         finished, or it would out-rank the inline transform the FLIP uses
         when the grid closes a gap. */
      @keyframes wishIn {
        0%   { opacity: 0; transform: translateY(30px) scale(0.94) rotate(-1.6deg) }
        60%  { opacity: 1 }
        100% { opacity: 1; transform: none }
      }
      .wish-card { animation: wishIn 680ms cubic-bezier(0.22, 1, 0.36, 1) backwards }

      /* Leaving: a small breath outwards, then away. The breath is what makes
         it read as the card being let go of rather than merely fading. */
      @keyframes wishOut {
        0%   { opacity: 1; transform: none }
        35%  { opacity: 1; transform: scale(1.03) }
        100% { opacity: 0; transform: scale(0.82) translateY(-12px) }
      }
      .wish-leaving { animation: wishOut ${LEAVE_MS}ms cubic-bezier(0.4, 0, 0.6, 1) forwards; pointer-events: none }

      /* The heart beats twice, on load and again whenever the count changes —
         a React key remounts it, which is the whole trigger. Not a loop: a
         permanently beating heart is something you end up looking away from. */
      @keyframes wishBeat {
        0%, 100% { transform: scale(1) }
        14%      { transform: scale(1.24) }
        28%      { transform: scale(1) }
        42%      { transform: scale(1.15) }
        58%      { transform: scale(1) }
      }
      .wish-beat { animation: wishBeat 1.5s ease-in-out 300ms both }
      /* Each card's own heart beats once when you come to that card. */
      .group:hover .wish-card-heart { animation: wishBeat 1.5s ease-in-out }

      @keyframes wishCount {
        0%   { transform: translateY(6px) scale(0.6); opacity: 0 }
        60%  { transform: translateY(0) scale(1.12); opacity: 1 }
        100% { transform: none; opacity: 1 }
      }
      .wish-count { animation: wishCount 500ms cubic-bezier(0.22, 1, 0.36, 1) both }

      /* The heart on a card being removed lets go before the card does. */
      @keyframes wishUnheart {
        0%   { transform: scale(1) rotate(0) }
        40%  { transform: scale(1.35) rotate(-10deg) }
        100% { transform: scale(0.65) rotate(8deg); opacity: 0.35 }
      }
      .wish-unheart { animation: wishUnheart 340ms ease-in both }

      @keyframes wishPop {
        0%   { transform: scale(0.4); opacity: 0 }
        55%  { transform: scale(1.18); opacity: 1 }
        100% { transform: scale(1); opacity: 1 }
      }
      .wish-pop { animation: wishPop 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both }

      /* A light crossing the photograph on hover. Sits under the badges. */
      .wish-shine::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.5) 48%, transparent 64%);
        transform: translateX(-130%);
        transition: transform 950ms ease;
      }
      .group:hover .wish-shine::after { transform: translateX(130%) }

      /* One light crossing the masthead as the page settles, so the band
         reads as a surface rather than a coloured rectangle. */
      @keyframes wishBandShine {
        from { transform: translateX(-60%) skewX(-14deg) }
        to   { transform: translateX(340%) skewX(-14deg) }
      }
      .wish-band-shine { animation: wishBandShine 1900ms 500ms cubic-bezier(0.4, 0, 0.2, 1) both }

      /* Rings leaving the heart — on the masthead and on the empty state. */
      @keyframes wishRing {
        0%   { transform: scale(0.9); opacity: 0.5 }
        70%  { transform: scale(1.55); opacity: 0 }
        100% { transform: scale(1.55); opacity: 0 }
      }
      .wish-ring { animation: wishRing 3.4s ease-out infinite }
      .wish-ring-late { animation-delay: 1.7s }

      /* The medallion on each note turns over when you come to it. */
      @keyframes wishTurn {
        0%   { transform: rotate(0) scale(1) }
        35%  { transform: rotate(-12deg) scale(1.12) }
        70%  { transform: rotate(8deg) scale(1.06) }
        100% { transform: rotate(0) scale(1) }
      }
      .group:hover .wish-medallion { animation: wishTurn 720ms cubic-bezier(0.34, 1.56, 0.64, 1) }

      /* Loading: a sheen crossing each placeholder rather than a flat pulse. */
      @keyframes wishSweep {
        from { transform: translateX(-100%) }
        to   { transform: translateX(100%) }
      }
      .wish-sweep { position: relative; overflow: hidden }
      .wish-sweep::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent);
        animation: wishSweep 1.6s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .wish-card, .wish-leaving, .wish-beat, .wish-count, .wish-unheart,
        .wish-pop, .wish-ring, .wish-band-shine, .wish-sweep::after,
        .group:hover .wish-card-heart, .group:hover .wish-medallion {
          animation: none !important;
        }
        .wish-shine::after { display: none }
      }
    `}</style>
  );

  /* ── The three notes at the foot of the page ────────────────────────────
     The same three as before, but as cards worth looking at: a medallion
     that turns over, a numeral behind it, and a warm wash that comes up on
     hover. They reveal on scroll, one after another. */
  const notes = (
    <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:mt-14 lg:gap-6">
      {[
        { icon: Heart, n: '01', title: 'Save for Later', copy: 'Click the heart icon on any product to save it to your wishlist' },
        { icon: Share2, n: '02', title: 'Share with Friends', copy: 'Share your wishlist with family and friends for gift ideas' },
        { icon: ShoppingCart, n: '03', title: 'Quick Add to Cart', copy: 'Easily move items from your wishlist to your shopping cart' },
      ].map(({ icon: Icon, n, title, copy }, i) => (
        <Reveal key={title} delay={i * 110} className="h-full">
          {/* The lift lives on this inner div, not on the Reveal wrapper: the
              reveal's own resting `transform: none` would cancel it. */}
          <div className="group relative h-full overflow-hidden rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.05] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.10)] hover:ring-[#e01a1b]/15 sm:rounded-3xl sm:p-7 lg:p-8">
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,#fff6f2_0%,transparent_58%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="pointer-events-none absolute right-4 top-2 font-playfair text-5xl font-semibold text-[#e01a1b]/[0.07] transition-colors duration-500 group-hover:text-[#e01a1b]/20 sm:text-6xl">
              {n}
            </span>
            <span className="wish-medallion relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fdeeee] text-[#e01a1b] ring-1 ring-[#f7dcdc] sm:h-14 sm:w-14">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <h3 className="relative mt-4 font-playfair text-lg font-semibold tracking-tight text-[#1a1a1a] sm:mt-5 sm:text-xl">
              {title}
            </h3>
            <p className="relative mt-1.5 text-[13px] leading-relaxed text-[#6b625b] sm:text-sm">
              {copy}
            </p>
          </div>
        </Reveal>
      ))}
    </div>
  );

  if (isLoading) {
    /* Placeholders in the same grid the cards land in, so nothing shifts
       sideways when the real thing arrives. */
    return (
      <div className="min-h-screen bg-[#f9f5f2] py-4 font-sans sm:py-6 lg:py-8">
        {motion}
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 xl:max-w-420">
          <div className="wish-sweep mb-5 h-40 rounded-2xl bg-[#f2e9e1] sm:mb-7 sm:h-48 sm:rounded-3xl" />
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05]">
                <div className="wish-sweep aspect-4/3 bg-[#ece5dd]" />
                <div className="space-y-2 p-3 sm:p-4">
                  <div className="wish-sweep h-3 w-20 rounded bg-[#f0eae3]" />
                  <div className="wish-sweep h-4 w-full rounded bg-[#ece5dd]" />
                  <div className="wish-sweep h-4 w-2/3 rounded bg-[#ece5dd]" />
                  <div className="wish-sweep h-6 w-24 rounded bg-[#f0eae3]" />
                  <div className="wish-sweep mt-3 h-9 w-full rounded-full bg-[#ece5dd]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#f9f5f2] py-4 font-sans sm:py-6 lg:py-8">
        {motion}
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 xl:max-w-420">
          <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-[#f2e4da] bg-[linear-gradient(150deg,#fff8f4_0%,#fdf6f0_50%,#ffffff_100%)] p-8 text-center sm:rounded-3xl sm:p-12 lg:p-16">
            <Heart className="animate-float-slow pointer-events-none absolute -right-8 -top-10 h-36 w-36 fill-current text-[#e01a1b]/[0.05]" />
            <Heart className="animate-float-slower pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 fill-current text-[#e01a1b]/[0.04]" />
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
              <span className="wish-ring absolute inset-0 rounded-full bg-[#e01a1b]/10" />
              <span className="wish-ring wish-ring-late absolute inset-0 rounded-full bg-[#e01a1b]/10" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(224,26,27,0.16)] sm:h-20 sm:w-20">
                <Heart className="wish-beat h-8 w-8 text-[#e01a1b] sm:h-9 sm:w-9" strokeWidth={1.75} />
              </span>
            </div>
            <h1 className="relative font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl">
              Nothing saved yet
            </h1>
            <p className="relative mx-auto mt-3 max-w-sm text-sm text-[#6b625b] sm:text-base">
              Tap the heart on anything you like and it will wait for you here — price and all.
            </p>
            <Link
              href="/products"
              className="btn-shine relative mt-7 inline-flex items-center gap-2 rounded-full bg-[#e01a1b] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] sm:text-base"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              Start Shopping
            </Link>
          </div>
          {notes}
        </div>
      </div>
    );
  }

  const bulkAvailable = addable.length >= 2;

  return (
    <div className="min-h-screen bg-[#f9f5f2] py-4 font-sans sm:py-6 lg:py-8">
      {motion}
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8 xl:max-w-420">

        {/* ── Masthead ──────────────────────────────────────────────────────
            A band, not a title row. This is the part that says the page is
            yours rather than a shelf: the collection is named, counted and
            valued, and the one thing you can do to all of it at once sits
            here. The figures count up as they arrive. */}
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-[#f2e4da] bg-[linear-gradient(135deg,#fff8f4_0%,#fdf6f0_45%,#fdf9f5_100%)] p-5 sm:mb-7 sm:rounded-3xl sm:p-7 lg:p-8">
            {/* Two hearts drifting behind the band, and one light crossing it
                as the page settles. Decorative only, and out of the way of
                any pointer. */}
          <Heart className="animate-float-slow pointer-events-none absolute -right-10 -top-12 h-44 w-44 fill-current text-[#e01a1b]/[0.055]" />
          <Heart className="animate-float-slower pointer-events-none absolute right-32 top-20 hidden h-20 w-20 fill-current text-[#e01a1b]/[0.04] lg:block" />
          <span className="wish-band-shine pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.75),transparent)]" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12">
                  <span className="wish-ring absolute inset-0 rounded-full bg-[#e01a1b]/[0.12]" />
                  <span className="wish-ring wish-ring-late absolute inset-0 rounded-full bg-[#e01a1b]/[0.12]" />
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(224,26,27,0.18)] sm:h-12 sm:w-12">
                    <Heart
                      key={`beat-${wishlistItems.length}`}
                      className="wish-beat h-5 w-5 fill-[#e01a1b] text-[#e01a1b] sm:h-6 sm:w-6"
                    />
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b9a99b] sm:text-[11px]">
                    Your saved things
                  </p>
                  <h1 className="font-playfair text-2xl font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:text-3xl lg:text-4xl">
                    My Wishlist
                  </h1>
                </div>
              </div>

              {/* Counted, valued, and flagged if something has sold out. */}
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 sm:mt-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3">
                <div>
                  <p
                    key={`n-${wishlistItems.length}`}
                    className="wish-count text-2xl font-extrabold leading-none tabular-nums text-[#1a1a1a] sm:text-3xl"
                  >
                    {wishlistItems.length}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1948a]">
                    {wishlistItems.length === 1 ? 'Item saved' : 'Items saved'}
                  </p>
                </div>
                <span className="hidden h-9 w-px bg-[#eadfd4] sm:block" />
                <div>
                  <p className="text-2xl font-extrabold leading-none tabular-nums text-[#1a1a1a] sm:text-3xl">
                    {formatPrice(shownValue)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a1948a]">Worth</p>
                </div>
                {totalSaving > 0 && (
                  <>
                    <span className="hidden h-9 w-px bg-[#eadfd4] sm:block" />
                    <div>
                      <p className="text-2xl font-extrabold leading-none tabular-nums text-[#157f4a] sm:text-3xl">
                        {formatPrice(shownSaving)}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8caa9a]">You save</p>
                    </div>
                  </>
                )}
                {outOfStockCount > 0 && (
                  <>
                    <span className="hidden h-9 w-px bg-[#eadfd4] sm:block" />
                    <div>
                      <p className="text-2xl font-extrabold leading-none tabular-nums text-[#c41617] sm:text-3xl">
                        {outOfStockCount}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c9a09f]">Out of stock</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* One solid red here too, and only one: whichever action is the
                real one on this page. Everything else is white. */}
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
              {bulkAvailable && (
                <button
                  onClick={addAllToCart}
                  disabled={bulkBusy}
                  className="btn-shine flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#e01a1b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c41617] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  {bulkBusy ? 'Adding…' : `Add all ${addable.length} to cart`}
                </button>
              )}
              <button
                onClick={shareWishlist}
                disabled={isSharing}
                className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#4a423c] ring-1 ring-[#e6dcd2] transition-all duration-300 hover:-translate-y-0.5 hover:ring-[#d6c8bb] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                {isSharing ? 'Generating…' : 'Share'}
              </button>
              <Link
                href="/products"
                className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 sm:flex-none ${
                  bulkAvailable
                    ? 'bg-white text-[#4a423c] ring-1 ring-[#e6dcd2] hover:ring-[#d6c8bb]'
                    : 'btn-shine bg-[#e01a1b] text-white shadow-[0_6px_20px_rgba(224,26,27,0.3)] hover:bg-[#c41617] hover:shadow-[0_12px_30px_rgba(224,26,27,0.45)]'
                }`}
              >
                Keep shopping
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── The saved items ───────────────────────────────────────────────
            A grid, not a list. As full-width rows every card was mostly empty
            paper: a thumbnail and a short name on the left, and a metre of
            nothing to the right of it. */}
        <ul className="grid list-none grid-cols-1 gap-3 p-0 min-[360px]:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:gap-5 xl:grid-cols-5 2xl:grid-cols-6">
          {wishlistItems.map((item, index) => {
            if (!item.product) return null;
            const product = item.product;
            const inStock = product.inStock;
            const productHref = `/products/${product.slug || item.productId}`;
            const regionalPrice = getRegionalPrice(product);
            const regionalOriginalPrice = getRegionalOriginalPrice(product) || product.originalPrice;
            const hasSaving = !!regionalOriginalPrice && regionalOriginalPrice > regionalPrice;
            const isLeaving = leaving.includes(item.productId);
            const isAdded = added.includes(item.productId);
            const isPending = pending.includes(item.productId);
            const reviewCount = Number(product.reviews) || 0;
            const face = positiveFace(Number(product.rating) || 0);

            return (
              <li
                key={item.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(item.id, el);
                  else cardRefs.current.delete(item.id);
                }}
                // Capped so a long list doesn't keep the last cards waiting.
                style={{ animationDelay: `${Math.min(index, 7) * 70}ms` }}
                className={`wish-card group @container relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.05] transition-[box-shadow,transform,--tw-ring-color] duration-500 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:ring-[#e01a1b]/20 ${isLeaving ? 'wish-leaving' : ''}`}
              >
                {/* Photograph */}
                <Link href={productHref} className="wish-shine relative block aspect-4/3 overflow-hidden bg-[#f3ede7]">
                  <Image
                    src={product.image || '/placeholder.png'}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className={`object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07] ${inStock ? '' : 'opacity-60 saturate-50'}`}
                  />
                  {/* Cream, not solid red. The discount, the heart and the
                      Add to Cart were all the same red, so nothing on the card
                      led — this leaves exactly one solid red per card, and it
                      is the button. */}
                  {product.discount ? (
                    <span className="absolute left-2 top-2 rounded-md bg-[#fff4f0]/95 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[#c41617] shadow-sm ring-1 ring-[#f4dad6] backdrop-blur-[2px] sm:text-[11px]">
                      {product.discount}% OFF
                    </span>
                  ) : null}
                  {!inStock && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#c41617] shadow-sm sm:text-[11px]">
                      Out of stock
                    </span>
                  )}
                </Link>

                {/* Remove. A filled heart on a saved item is the one control
                    everybody already knows how to switch off — which is why
                    it replaces the old red "Remove" button competing with
                    Add to Cart at the foot of every row. Always visible, not
                    hover-only, because a phone has no hover. */}
                <button
                  onClick={() => removeFromWishlist(item.productId)}
                  disabled={isLeaving}
                  aria-label={`Remove ${product.name} from wishlist`}
                  title="Remove from wishlist"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/92 shadow-[0_2px_8px_rgba(0,0,0,0.14)] backdrop-blur-[2px] transition-all duration-300 hover:scale-110 hover:bg-white sm:h-9 sm:w-9"
                >
                  <Heart
                    className={`wish-card-heart h-4 w-4 fill-[#e01a1b] text-[#e01a1b] sm:h-[18px] sm:w-[18px] ${isLeaving ? 'wish-unheart' : ''}`}
                  />
                </button>

                {/* Details. The warm floor is what separates a thing you have
                    kept from a catalogue tile, which is plain white all the
                    way down. */}
                <div className="flex flex-1 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] p-3 sm:p-3.5 lg:p-4">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a1948a] sm:text-[11px]">
                    {product.category}
                  </p>

                  <h3 className="mt-1 text-[13.5px] font-semibold leading-snug text-[#1a1a1a] sm:text-[15px]">
                    <Link href={productHref} className="line-clamp-2 transition-colors hover:text-[#e01a1b]">
                      {product.name}
                    </Link>
                  </h3>

                  {/* Rating, in the same words the rest of the storefront uses. */}
                  <div className="mt-1.5 flex min-h-5 items-center gap-1.5 text-[11px] sm:text-[12px]">
                    {reviewCount === 0 ? (
                      <span className="font-semibold text-[#a1948a]">New</span>
                    ) : face ? (
                      <>
                        <FaceIcon value={face} className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-semibold text-[#4a423c]">
                          <span className="tabular-nums">{reviewCount}</span> loved this
                        </span>
                      </>
                    ) : (
                      <span className="font-semibold text-[#6b625b]">
                        <span className="tabular-nums">{reviewCount}</span> review{reviewCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[17px] font-extrabold tabular-nums text-[#1a1a1a] sm:text-lg">
                      {formatPrice(regionalPrice)}
                    </span>
                    {hasSaving ? (
                      <span className="text-[12px] tabular-nums text-[#a1948a] line-through sm:text-[13px]">
                        {formatPrice(regionalOriginalPrice!)}
                      </span>
                    ) : null}
                  </div>
                  {hasSaving ? (
                    <p className="mt-1 text-[11px] font-semibold tabular-nums text-[#157f4a] sm:text-[12px]">
                      Save {formatPrice(regionalOriginalPrice! - regionalPrice)}
                    </p>
                  ) : null}

                  <p className="mt-1.5 text-[10.5px] text-[#a1948a] sm:text-[11px]">
                    Saved {new Date(item.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </p>

                  {/* Actions. `mt-auto` keeps this row on the same line across
                      the whole grid however long the names above it run. */}
                  <div className="mt-auto flex items-center gap-1.5 pt-3 sm:gap-2 sm:pt-4">
                    {product.hasVariants ? (
                      <Link
                        href={productHref}
                        className="btn-shine flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#e01a1b] px-2.5 py-2 text-[12px] font-semibold text-white shadow-[0_4px_14px_rgba(224,26,27,0.28)] transition-all duration-300 hover:bg-[#c41617] hover:shadow-[0_10px_24px_rgba(224,26,27,0.4)] sm:px-3 sm:text-[13px]"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                        {/* Two words or one, depending on how much card there
                            is. At two columns on a small phone the long label
                            was being cut off mid-word. */}
                        <span className="truncate @min-[12.5rem]:hidden">Options</span>
                        <span className="hidden truncate @min-[12.5rem]:inline">Choose Options</span>
                      </Link>
                    ) : (
                      <button
                        onClick={(e) =>
                          addToCart(
                            item.productId,
                            product.name,
                            product.image,
                            (e.currentTarget.closest('li')?.querySelector('a.wish-shine') as HTMLElement) || null,
                          )
                        }
                        disabled={!inStock || isPending || bulkBusy}
                        className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-[12px] font-semibold transition-all duration-300 sm:px-3 sm:text-[13px] ${
                          !inStock
                            ? 'cursor-not-allowed bg-[#f2ede8] text-[#a1948a]'
                            : isAdded
                              ? 'bg-[#157f4a] text-white shadow-[0_4px_14px_rgba(21,127,74,0.28)]'
                              : 'btn-shine bg-[#e01a1b] text-white shadow-[0_4px_14px_rgba(224,26,27,0.28)] hover:bg-[#c41617] hover:shadow-[0_10px_24px_rgba(224,26,27,0.4)]'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="wish-pop h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                            <span className="truncate">Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate @min-[10.5rem]:hidden">{inStock ? 'Add' : 'Sold out'}</span>
                            <span className="hidden truncate @min-[10.5rem]:inline">{inStock ? 'Add to Cart' : 'Out of Stock'}</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => shareProduct(item.productId, product.name)}
                      aria-label={`Share ${product.name}`}
                      title="Share this product"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f0eb] text-[#6b625b] transition-all duration-300 hover:scale-110 hover:bg-[#ece4db] hover:text-[#1a1a1a] sm:h-9 sm:w-9"
                    >
                      <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}

          {/* One open slot at the end. A catalogue never has room for more —
              a collection always does, and it keeps the last row from ending
              on a ragged edge. */}
          <li
            ref={(el) => {
              if (el) cardRefs.current.set('__more', el);
              else cardRefs.current.delete('__more');
            }}
            style={{ animationDelay: `${Math.min(wishlistItems.length, 8) * 70}ms` }}
            className="wish-card wish-more group min-h-52"
          >
            <Link
              href="/products"
              className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#e6d9cd] bg-white/45 p-5 text-center transition-all duration-500 hover:-translate-y-1.5 hover:border-[#e01a1b]/35 hover:bg-white"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdeeee] text-[#e01a1b] transition-transform duration-500 group-hover:rotate-90 sm:h-14 sm:w-14">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <span className="font-playfair text-base font-semibold text-[#1a1a1a] sm:text-lg">Room for more</span>
              <span className="max-w-56 text-[12px] leading-snug text-[#a1948a] sm:text-[13px]">
                Anything you heart while browsing lands here
              </span>
            </Link>
          </li>
        </ul>

        {notes}
      </div>
    </div>
  );
};

export default Wishlist;
