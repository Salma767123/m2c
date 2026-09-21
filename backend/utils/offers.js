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
      // Buy `minQty`, get `getQty` free — ONCE. The deal grants getQty free units as
      // soon as the line reaches buy+get units, and does NOT multiply with more groups
      // (a "buy 2 get 1" line gives exactly 1 free at qty 3, 4, 5, 10 …). The free
      // value is spread across the whole line as an equivalent per-unit saving.
      const buy = Math.max(1, offer.minQty || 1);
      const free = Math.max(0, offer.getQty || 0);
      const group = buy + free;
      const freeUnits = quantity >= group ? free : 0;
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
 * Pick the single winning per-line offer for a product and return the discounted unit
 * price. Winner = highest PRIORITY (the admin explicitly controls which promotion wins),
 * tie-broken by largest per-unit saving, then deepest scope. Only offers that actually
 * reduce the price compete (saving > 0), so a high-priority offer that doesn't apply to
 * this product/currency never blocks a lower-priority one that does. Only ever reduces
 * the price; returns the base price and a null offer when nothing applies — so a product
 * with no offers is byte-identical to the pre-offer behaviour.
 *
 * @returns { unitPrice, originalUnitPrice, offer } where offer is
 *          { offerId, title, type, savingPerUnit } or null.
 */
function applyBestOffer({ product, sellingUnitPrice, quantity = 1, currency = 'INR', rate = null, offers = [], now = new Date(), thresholdEligibleIds = null, crossBogo = null }) {
  const base = round2(sellingUnitPrice);
  if (!(base > 0) || ((!Array.isArray(offers) || offers.length === 0) && !crossBogo)) {
    return { unitPrice: base, originalUnitPrice: base, offer: null };
  }

  let best = null;
  for (const offer of offers) {
    // THRESHOLD is cart-level: it only competes for this line once the caller has
    // confirmed the cart subtotal qualifies (its id is in thresholdEligibleIds).
    if (offer.type === 'THRESHOLD' && !(thresholdEligibleIds && thresholdEligibleIds.has(offer.id))) continue;
    // CROSS BOGO ("buy A get B free") is cart-level: it reaches this line only as the
    // precomputed `crossBogo` candidate below, never as a same-line BOGO.
    if (offer.type === 'BOGO' && offer.bogoMode === 'CROSS') continue;
    if (!isOfferLive(offer, now)) continue;
    if (!offerMatchesCurrency(offer, currency)) continue;
    if (!offerAppliesToProduct(offer, product)) continue;
    const saving = offerSavingPerUnit(offer, base, quantity, currency, rate);
    if (saving <= 0) continue;
    // Priority is the primary decider: the admin sets which promotion wins when several
    // overlap. Saving size only breaks a priority tie, then deepest scope. (This is a
    // deliberate business choice — the platform's margin absorbs the discount, so the
    // admin, not the discount size, controls how deep it goes.)
    const priority = offer.priority || 0;
    const bestPriority = best ? (best.offer.priority || 0) : -Infinity;
    if (
      !best ||
      priority > bestPriority ||
      (priority === bestPriority && saving > best.saving) ||
      (priority === bestPriority && saving === best.saving && scopeRank(offer.scope) > scopeRank(best.offer.scope))
    ) {
      best = { offer, saving };
    }
  }

  // The cross-BOGO free allocation for this line (from resolveCrossBogoAllocations)
  // competes with the per-line offers by the same priority-then-saving rule.
  if (crossBogo && crossBogo.savingPerUnit > 0) {
    const saving = Math.min(round2(crossBogo.savingPerUnit), base);
    const priority = crossBogo.priority || 0;
    const bestPriority = best ? (best.offer.priority || 0) : -Infinity;
    if (!best || priority > bestPriority || (priority === bestPriority && saving > best.saving)) {
      best = { offer: { id: crossBogo.offerId, title: crossBogo.title, type: 'BOGO', priority }, saving };
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

/** Does this product belong to a CROSS BOGO's FREE (get) set? */
function offerAppliesToFreeSet(offer, product) {
  if (offer.freeScope === 'CATEGORY') {
    return (
      Array.isArray(offer.freeCategoryNames) &&
      !!product.category &&
      offer.freeCategoryNames.some(
        (c) => c && String(c).toLowerCase() === String(product.category).toLowerCase()
      )
    );
  }
  if (offer.freeScope === 'PRODUCT') {
    return Array.isArray(offer.freeProductIds) && offer.freeProductIds.includes(product.id);
  }
  return false; // a CROSS BOGO must name its free set explicitly
}

/**
 * Cross-product BOGO ("buy A, get B free"), resolved at CART level. For each live CROSS
 * BOGO offer it counts the qualifying BUY units the customer has in the cart, works out
 * how many FREE units that earns (floor(buyUnits / buyN) * getN), and allocates them to
 * the CHEAPEST matching free-set lines the customer has ALREADY added — the free item is
 * never auto-added, so a customer who buys A but never adds B simply gets no discount.
 *
 * Returns a Map keyed by line.key → { offerId, title, savingPerUnit, priority } for the
 * free lines. Higher-priority offers allocate first; a line keeps its largest saving.
 *
 * @param lines [{ key, product, unitPrice (in `currency`), quantity }]
 */
function resolveCrossBogoAllocations(offers, lines, currency, now = new Date()) {
  const alloc = new Map();
  if (!Array.isArray(offers) || !Array.isArray(lines) || lines.length === 0) return alloc;

  const crossOffers = offers
    .filter((o) => o.type === 'BOGO' && o.bogoMode === 'CROSS' && isOfferLive(o, now) && offerMatchesCurrency(o, currency))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  if (crossOffers.length === 0) return alloc;

  // How many free units each line can still absorb (its quantity minus what a
  // higher-priority offer already claimed).
  const remainingByLine = new Map(lines.map((l) => [l.key, l.quantity]));

  for (const offer of crossOffers) {
    const buyN = Math.max(1, offer.minQty || 1);
    const getN = Math.max(0, offer.getQty || 0);
    if (getN <= 0) continue;

    let buyUnits = 0;
    for (const l of lines) if (offerAppliesToProduct(offer, l.product)) buyUnits += l.quantity;
    // Granted ONCE when the buy threshold is met — getN free units, not multiplied by
    // how many buy-groups are in the cart.
    let freeUnits = buyUnits >= buyN ? getN : 0;
    if (freeUnits <= 0) continue;

    const candidates = lines
      .filter((l) => offerAppliesToFreeSet(offer, l.product) && (remainingByLine.get(l.key) || 0) > 0)
      .sort((a, b) => a.unitPrice - b.unitPrice);

    for (const l of candidates) {
      if (freeUnits <= 0) break;
      const avail = remainingByLine.get(l.key) || 0;
      const take = Math.min(avail, freeUnits);
      if (take <= 0) continue;
      // 100% off the free units, spread across the whole line as a per-unit saving —
      // the same shape the same-item BOGO uses, so downstream code is identical.
      const savingPerUnit = round2((take * l.unitPrice) / l.quantity);
      const existing = alloc.get(l.key);
      if (!existing || savingPerUnit > existing.savingPerUnit) {
        alloc.set(l.key, { offerId: offer.id, title: offer.title, savingPerUnit, priority: offer.priority || 0 });
      }
      remainingByLine.set(l.key, avail - take);
      freeUnits -= take;
    }
  }
  return alloc;
}

/**
 * Which live CROSS BOGO offers has the cart met the BUY condition for? Free-gift lines
 * (isFreeGift) never count toward the buy total. Returns [{ offer, getQty }] — the caller
 * resolves the free candidates (stock/variants) and auto-adds or offers a chooser.
 *
 * @param lines [{ product, quantity, isFreeGift }]
 */
function qualifyingCrossBogo(offers, lines, currency, now = new Date()) {
  const out = [];
  if (!Array.isArray(offers) || !Array.isArray(lines)) return out;
  for (const offer of offers) {
    if (offer.type !== 'BOGO' || offer.bogoMode !== 'CROSS') continue;
    if (!isOfferLive(offer, now) || !offerMatchesCurrency(offer, currency)) continue;
    const buyN = Math.max(1, offer.minQty || 1);
    const getN = Math.max(0, offer.getQty || 0);
    if (getN <= 0) continue;
    let buyUnits = 0;
    for (const l of lines) if (!l.isFreeGift && offerAppliesToProduct(offer, l.product)) buyUnits += l.quantity;
    if (buyUnits >= buyN) out.push({ offer, getQty: getN });
  }
  return out;
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
function buildActiveOffer(product, offers, currency = 'INR', rate = null, now = new Date(), quantity = 1, thresholdEligibleIds = null, crossBogo = null) {
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
    crossBogo,
  });
  if (!offer) return null;

  const full = offers.find((o) => o.id === offer.offerId) || {};
  const isCross = full.type === 'BOGO' && full.bogoMode === 'CROSS';
  return {
    offerId: offer.offerId,
    title: offer.title,
    description: full.description || null,
    type: offer.type,
    scope: full.scope || null,
    // For a cross-BOGO free line the deal is "this item is free", not "buy N get M".
    badge: isCross ? 'FREE' : offerBadgeLabel(full, currency, rate),
    bogoMode: full.bogoMode || (offer.type === 'BOGO' ? 'SAME' : null),
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
  resolveCrossBogoAllocations,
  qualifyingCrossBogo,
  offerAppliesToFreeSet,
  offerBadgeLabel,
  buildActiveOffer,
  firstSet,
};
