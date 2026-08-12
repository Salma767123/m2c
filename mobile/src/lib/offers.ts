// Shared Offer types + display helpers for the storefront.
//
// Ported from frontend/src/lib/offers.ts so the app renders offers exactly like
// the web does. Keep the two in step.
//
// The backend (utils/offers.js) is the single source of truth for how an offer
// reduces a price and what the customer is actually charged. The public product
// endpoints attach a precomputed `activeOffer` (offerPrice/originalPrice already
// in the storefront currency), so the client just renders those numbers rather
// than re-deriving them — that is what keeps the badge and the checkout price in
// agreement.

export type OfferType = 'PERCENTAGE' | 'FLAT' | 'QUANTITY' | 'BOGO' | 'THRESHOLD';
export type OfferScope = 'PRODUCT' | 'CATEGORY' | 'STORE';
export type OfferRegion = 'IN_ONLY' | 'COM_ONLY' | 'BOTH';

/** The offer badge attached to a public product by the backend enrichment. */
export interface ActiveOffer {
  offerId: string;
  title: string;
  description?: string | null;
  type: OfferType;
  scope?: OfferScope | null;
  badge: string;
  discountPercent?: number | null;
  discountFlatINR?: number | null;
  minQty?: number | null;
  getQty?: number | null;
  endsAt?: string | null;
  /** qty=1 preview, already in the storefront currency. */
  originalPrice: number;
  offerPrice: number;
  savingPerUnit: number;
  currency: 'INR' | 'USD';
}

/** A live offer from GET /offers/active (offers landing screen + campaign strips). */
export interface PublicOffer {
  id: string;
  title: string;
  description?: string | null;
  bannerImage?: string | null;
  type: OfferType;
  scope: OfferScope;
  badge: string;
  discountPercent?: number | null;
  discountFlatINR?: number | null;
  minQty?: number | null;
  getQty?: number | null;
  minCartValueINR?: number | null;
  categoryNames?: string[];
  productIds?: string[];
  endsAt?: string | null;
}

/** Whole-number percent saved, for a compact "X% OFF" pill when the badge isn't enough. */
export function offerSavingPercent(offer: ActiveOffer): number {
  if (offer.originalPrice > 0) {
    return Math.round(((offer.originalPrice - offer.offerPrice) / offer.originalPrice) * 100);
  }
  return offer.discountPercent ? Math.round(offer.discountPercent) : 0;
}

/**
 * Apply an offer to a base unit price for DISPLAY. Mirrors offerSavingPerUnit in
 * backend/utils/offers.js for the per-line types (%, flat, quantity, BOGO). Used on
 * the product detail screen where the price can be a variant's, so the backend's
 * product-level preview can't be reused directly. Checkout re-resolves server-side
 * — this is advisory.
 *
 * @param convertINRtoUSD converter passed in to avoid an import cycle with currency.ts.
 */
export function applyOfferToPrice(
  basePrice: number,
  offer: ActiveOffer,
  currency: 'INR' | 'USD',
  quantity: number,
  convertINRtoUSD: (inr: number) => number,
): number {
  if (!(basePrice > 0)) return basePrice;
  let saving = 0;
  switch (offer.type) {
    case 'PERCENTAGE':
    // THRESHOLD is only ever attached to a line by the backend once the cart
    // qualifies, so by the time it reaches the client it behaves as a straight
    // percentage off.
    case 'THRESHOLD':
      saving = (basePrice * (offer.discountPercent || 0)) / 100;
      break;
    case 'QUANTITY':
      if (offer.minQty && quantity < offer.minQty) return basePrice;
      saving = (basePrice * (offer.discountPercent || 0)) / 100;
      break;
    case 'FLAT': {
      const inr = offer.discountFlatINR || 0;
      saving = currency === 'USD' ? convertINRtoUSD(inr) : inr;
      break;
    }
    case 'BOGO': {
      const buy = Math.max(1, offer.minQty || 1);
      const free = Math.max(0, offer.getQty || 0);
      const group = buy + free;
      const freeUnits = Math.floor(quantity / group) * free;
      saving = quantity > 0 ? (freeUnits * basePrice) / quantity : 0;
      break;
    }
    default:
      return basePrice;
  }
  const discounted = basePrice - Math.min(saving, basePrice);
  return Math.round((discounted + Number.EPSILON) * 100) / 100;
}

/** Human countdown-ish label, e.g. "Ends in 3 days" / "Ends today". Null if no end. */
export function offerEndsLabel(endsAt?: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  const ms = end - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 2) return `Ends in ${days} days`;
  if (days === 1) return 'Ends tomorrow';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `Ends in ${hours}h`;
  return 'Ending soon';
}
