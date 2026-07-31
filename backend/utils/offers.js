/**
 * Offer resolution — the single source of truth for how an automatic Offer reduces a
 * product's SELLING price. Used in two places so display and checkout can never drift:
 *   - productController enrichment  → the `activeOffer` badge on the storefront
 *   - orderController createOrder   → the actual price the customer is charged
 *
 * An offer only ever touches the customer's selling price. The vendor settlement in
 * orderController is computed separately from Product.basePrice, so nothing here can
 * change a vendor payout — M2C's margin absorbs every offer. See prisma Offer model.
 *
 * All money is handled in the order/display currency. The INR chain is the source of
 * truth (mirrors utils/orderCurrency.js): a FLAT discount is entered in rupees and
 * converted to USD with the same rate snapshot the order already uses.
 */

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** First candidate that is actually set (0 counts as set; null/undefined do not). */
function firstSet(...values) {
  for (const v of values) if (v != null) return v;
  return null;
}

/** Deepest scope wins ties: a product-specific offer beats a store-wide one. */
function scopeRank(scope) {
  return scope === 'PRODUCT' ? 3 : scope === 'CATEGORY' ? 2 : 1;
}

/** Live right now: active flag on, and inside [startsAt, endsAt]. */
function isOfferLive(offer, now = new Date()) {
  if (!offer || offer.isActive === false) return false;
  if (offer.startsAt && now < new Date(offer.startsAt)) return false;
  if (offer.endsAt && now > new Date(offer.endsAt)) return false;
  return true;
}

/**
 * Region gate. An IN_ONLY offer must never apply to a .com (USD) order, nor a COM_ONLY
 * offer to a .in (INR) order — otherwise the badge shown and the price charged would
 * disagree with the storefront the shopper is on.
 */
function offerMatchesCurrency(offer, currency) {
  if (!offer.region || offer.region === 'BOTH') return true;
  if (offer.region === 'IN_ONLY') return currency === 'INR';
  if (offer.region === 'COM_ONLY') return currency === 'USD';
  return true;
}

/** Does this offer target this product, by scope? */
function offerAppliesToProduct(offer, product) {
  switch (offer.scope) {
    case 'STORE':
      return true;
    case 'CATEGORY':
      return (
        Array.isArray(offer.categoryNames) &&
        !!product.category &&
        offer.categoryNames.some(
          (c) => c && String(c).toLowerCase() === String(product.category).toLowerCase()
        )
      );
    case 'PRODUCT':
      return Array.isArray(offer.productIds) && offer.productIds.includes(product.id);
    default:
      return false;
  }
}

/**
 * Per-unit saving in `currency` for one offer against one line. Returns 0 when the
 * offer does not actually reduce this line (e.g. a QUANTITY deal whose minimum isn't
 * met). THRESHOLD is cart-level and is skipped here — the caller handles it once the
 * subtotal is known.
 *
 * @param rate INR-per-USD snapshot; needed only to convert a FLAT (rupee) discount and
 *             the percentage cap to USD.
 */
function offerSavingPerUnit(offer, sellingUnitPrice, quantity, currency, rate) {
  if (!(sellingUnitPrice > 0)) return 0;
  let saving = 0;

  switch (offer.type) {
    case 'PERCENTAGE':
    // THRESHOLD behaves as a percentage off the line ONCE the cart qualifies. That
    // cart-level check happens in applyBestOffer (via thresholdEligibleIds); by the
    // time we get here the offer is already known to be eligible.
    case 'THRESHOLD': {
      saving = (sellingUnitPrice * (Number(offer.discountPercent) || 0)) / 100;
      break;
    }
    case 'QUANTITY': {
      if (offer.minQty && quantity < offer.minQty) return 0;
      saving = (sellingUnitPrice * (Number(offer.discountPercent) || 0)) / 100;
      break;
    }
    case 'FLAT': {
      const inr = Number(offer.discountFlatINR) || 0;
      saving = currency === 'USD' ? (rate && rate > 0 ? inr / rate : 0) : inr;
      break;
    }
    case 'BOGO': {
      // Buy `minQty`, get `getQty` cheapest units free. Same SKU here, so spread the
      // free units' value across the whole line as an equivalent per-unit saving.
      const buy = Math.max(1, offer.minQty || 1);
      const free = Math.max(0, offer.getQty || 0);
      const group = buy + free;
      const freeUnits = Math.floor(quantity / group) * free;
      saving = quantity > 0 ? (freeUnits * sellingUnitPrice) / quantity : 0;
      break;
    }
    default:
      return 0; // THRESHOLD and anything unknown: not a per-line saving
  }

  // Percentage cap (maxDiscountINR), rupees off per unit — convert for USD.
  if (offer.maxDiscountINR != null && (offer.type === 'PERCENTAGE' || offer.type === 'QUANTITY' || offer.type === 'THRESHOLD')) {
    const cap = currency === 'USD' ? (rate && rate > 0 ? offer.maxDiscountINR / rate : Infinity) : offer.maxDiscountINR;
    saving = Math.min(saving, cap);
  }

  return round2(Math.min(saving, sellingUnitPrice)); // never below zero
}

/**
 * Pick the single best per-line offer for a product and return the discounted unit
 * price. Best = largest per-unit saving, tie-broken by priority then deepest scope.
 * Only ever reduces the price; returns the base price and a null offer when nothing
 * applies — so a product with no offers is byte-identical to the pre-offer behaviour.
 *
 * @returns { unitPrice, originalUnitPrice, offer } where offer is
 *          { offerId, title, type, savingPerUnit } or null.
 */
function applyBestOffer({ product, sellingUnitPrice, quantity = 1, currency = 'INR', rate = null, offers = [], now = new Date(), thresholdEligibleIds = null }) {
  const base = round2(sellingUnitPrice);
  if (!(base > 0) || !Array.isArray(offers) || offers.length === 0) {
    return { unitPrice: base, originalUnitPrice: base, offer: null };
  }

  let best = null;
  for (const offer of offers) {
    // THRESHOLD is cart-level: it only competes for this line once the caller has
    // confirmed the cart subtotal qualifies (its id is in thresholdEligibleIds).
    if (offer.type === 'THRESHOLD' && !(thresholdEligibleIds && thresholdEligibleIds.has(offer.id))) continue;
    if (!isOfferLive(offer, now)) continue;
    if (!offerMatchesCurrency(offer, currency)) continue;
    if (!offerAppliesToProduct(offer, product)) continue;
    const saving = offerSavingPerUnit(offer, base, quantity, currency, rate);
    if (saving <= 0) continue;
    if (
      !best ||
      saving > best.saving ||
      (saving === best.saving && (offer.priority || 0) > (best.offer.priority || 0)) ||
      (saving === best.saving && (offer.priority || 0) === (best.offer.priority || 0) && scopeRank(offer.scope) > scopeRank(best.offer.scope))
    ) {
      best = { offer, saving };
    }
  }

  if (!best) return { unitPrice: base, originalUnitPrice: base, offer: null };
  return {
    unitPrice: round2(base - best.saving),
    originalUnitPrice: base,
    offer: {
      offerId: best.offer.id,
      title: best.offer.title,
      type: best.offer.type,
      savingPerUnit: best.saving,
    },
  };
}

/**
 * Which THRESHOLD offers does this cart qualify for? A THRESHOLD offer fires when the
 * goods subtotal (in INR) reaches its minCartValueINR, on a matching-region cart. Returns
 * a Set of offer ids to hand to applyBestOffer as `thresholdEligibleIds`.
 */
function qualifyingThresholdIds(offers, cartSubtotalINR, currency, now = new Date()) {
  const ids = new Set();
  if (!Array.isArray(offers) || !(cartSubtotalINR > 0)) return ids;
  for (const o of offers) {
    if (o.type !== 'THRESHOLD') continue;
    if (!isOfferLive(o, now)) continue;
    if (!offerMatchesCurrency(o, currency)) continue;
    if (o.minCartValueINR != null && cartSubtotalINR >= o.minCartValueINR) ids.add(o.id);
  }
  return ids;
}

/** Short human badge for the storefront, e.g. "20% OFF" / "Buy 2 Get 1 Free". */
function offerBadgeLabel(offer, currency = 'INR', rate = null) {
  switch (offer.type) {
    case 'PERCENTAGE':
      return `${Math.round(offer.discountPercent || 0)}% OFF`;
    case 'QUANTITY':
      return `Buy ${offer.minQty || 2}+ · ${Math.round(offer.discountPercent || 0)}% OFF`;
    case 'BOGO':
      return `Buy ${offer.minQty || 1} Get ${offer.getQty || 1} Free`;
    case 'FLAT': {
      const sym = currency === 'USD' ? '$' : '₹';
      const amt =
        currency === 'USD' && rate && rate > 0
          ? Math.round((offer.discountFlatINR || 0) / rate)
          : Math.round(offer.discountFlatINR || 0);
      return `${sym}${amt} OFF`;
    }
    case 'THRESHOLD':
      return `Spend ₹${Math.round(offer.minCartValueINR || 0)} · ${Math.round(offer.discountPercent || 0)}% OFF`;
    default:
      return 'OFFER';
  }
}

/**
 * Build the `activeOffer` display object attached to a public product. Computes a qty=1
 * preview in the storefront currency so the badge can show "was ₹X → ₹Y". Returns null
 * when no per-line offer applies (THRESHOLD offers are store-wide banners, not product
 * badges, so they never attach here). Pure — no DB access.
 *
 * @param product  a product row carrying priceINR/adminFixedPrice/basePrice/priceUSD,
 *                 category and id.
 * @param currency 'INR' | 'USD' — the storefront the request came from.
 * @param rate     INR-per-USD snapshot for FLAT/USD conversion (may be null for INR).
 */
function buildActiveOffer(product, offers, currency = 'INR', rate = null, now = new Date(), quantity = 1, thresholdEligibleIds = null) {
  const sellingINR = firstSet(product.priceINR, product.adminFixedPrice, product.basePrice, product.price) ?? 0;
  if (!(sellingINR > 0)) return null;

  const sellingCur =
    currency === 'USD'
      ? (product.priceUSD != null ? Number(product.priceUSD) : rate && rate > 0 ? round2(sellingINR / rate) : null)
      : round2(sellingINR);
  if (sellingCur == null || !(sellingCur > 0)) return null;

  const { unitPrice, originalUnitPrice, offer } = applyBestOffer({
    product,
    sellingUnitPrice: sellingCur,
    quantity,
    currency,
    rate,
    offers,
    now,
    thresholdEligibleIds,
  });
  if (!offer) return null;

  const full = offers.find((o) => o.id === offer.offerId) || {};
  return {
    offerId: offer.offerId,
    title: offer.title,
    description: full.description || null,
    type: offer.type,
    scope: full.scope || null,
    badge: offerBadgeLabel(full, currency, rate),
    discountPercent: full.discountPercent ?? null,
    discountFlatINR: full.discountFlatINR ?? null,
    minQty: full.minQty ?? null,
    getQty: full.getQty ?? null,
    endsAt: full.endsAt || null,
    // qty=1 preview in the storefront currency (for %/FLAT badges). Quantity/BOGO
    // deals realise their full saving at checkout; the badge communicates the deal.
    originalPrice: originalUnitPrice,
    offerPrice: unitPrice,
    savingPerUnit: offer.savingPerUnit,
    currency,
  };
}

module.exports = {
  isOfferLive,
  offerMatchesCurrency,
  offerAppliesToProduct,
  offerSavingPerUnit,
  applyBestOffer,
  qualifyingThresholdIds,
  offerBadgeLabel,
  buildActiveOffer,
  firstSet,
};
