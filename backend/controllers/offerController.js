/**
 * Offers — automatic, code-less promotions on the selling price.
 *
 * Admin CRUD + a public "active offers" feed for the storefront /offers page and
 * campaign strips. The actual price application happens in orderController (checkout)
 * and productController (badge enrichment) via utils/offers.js — this controller only
 * manages the Offer records and serves the live list.
 *
 * Permissions: reuses the existing `coupons:*` set (offers live in the same promotions
 * area) so no new permission strings need seeding into the roles module.
 */

const { prisma } = require('../config/database');
const { resolveUsdRate } = require('../utils/orderCurrency');
const { normalizeRegion } = require('../utils/regionVisibility');
const { isOfferLive, offerMatchesCurrency, offerBadgeLabel } = require('../utils/offers');

let resolveBase64InValue = null;
try {
  // Optional: only needed when an admin uploads a banner as a data URI.
  ({ resolveBase64InValue } = require('../config/cloudinary'));
} catch (_) {
  /* cloudinary optional in some envs */
}

const OFFER_TYPES = ['PERCENTAGE', 'FLAT', 'QUANTITY', 'BOGO', 'THRESHOLD'];
const OFFER_SCOPES = ['PRODUCT', 'CATEGORY', 'STORE'];
const REGIONS = ['IN_ONLY', 'COM_ONLY', 'BOTH'];

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const isDataUri = (v) => typeof v === 'string' && v.startsWith('data:');

/**
 * Validate + normalise an offer payload into Prisma-ready data. Returns { data } on
 * success or { error } with a message. Keeps every type's own required fields honest so
 * a malformed offer can't silently do nothing (or worse, over-discount) at checkout.
 */
function buildOfferData(body) {
  const {
    title,
    description,
    type,
    scope,
    discountPercent,
    discountFlatINR,
    maxDiscountINR,
    minQty,
    getQty,
    minCartValueINR,
    productIds,
    categoryNames,
    region,
    priority,
    startsAt,
    endsAt,
    isActive,
  } = body;

  if (!title || !String(title).trim()) return { error: 'Title is required' };
  if (!OFFER_TYPES.includes(type)) return { error: `type must be one of ${OFFER_TYPES.join(', ')}` };
  if (!OFFER_SCOPES.includes(scope)) return { error: `scope must be one of ${OFFER_SCOPES.join(', ')}` };
  if (!endsAt) return { error: 'endsAt is required' };

  const reg = REGIONS.includes(region) ? region : 'BOTH';

  // Scope targeting
  const pIds = Array.isArray(productIds) ? productIds.filter(Boolean) : [];
  const cNames = Array.isArray(categoryNames) ? categoryNames.filter(Boolean) : [];
  if (scope === 'PRODUCT' && pIds.length === 0) return { error: 'Select at least one product for a product-scoped offer' };
  if (scope === 'CATEGORY' && cNames.length === 0) return { error: 'Select at least one category for a category-scoped offer' };

  // Per-type required magnitude
  const pct = num(discountPercent);
  const flat = num(discountFlatINR);
  const mQty = num(minQty);
  const gQty = num(getQty);
  const minCart = num(minCartValueINR);

  if (type === 'PERCENTAGE' || type === 'QUANTITY' || type === 'THRESHOLD') {
    if (pct == null || pct <= 0 || pct > 100) return { error: 'discountPercent must be between 1 and 100' };
  }
  if (type === 'FLAT') {
    if (flat == null || flat <= 0) return { error: 'discountFlatINR must be greater than 0' };
  }
  if (type === 'QUANTITY') {
    if (mQty == null || mQty < 2) return { error: 'Quantity deals need minQty of at least 2' };
  }
  if (type === 'BOGO') {
    if (mQty == null || mQty < 1) return { error: 'BOGO needs minQty of at least 1' };
    if (gQty == null || gQty < 1) return { error: 'BOGO needs getQty of at least 1' };
  }
  if (type === 'THRESHOLD') {
    if (minCart == null || minCart <= 0) return { error: 'Threshold offers need a minCartValueINR' };
  }

  const start = startsAt ? new Date(startsAt) : new Date();
  const end = new Date(endsAt);
  if (isNaN(end.getTime())) return { error: 'endsAt is not a valid date' };
  if (end <= start) return { error: 'endsAt must be after startsAt' };

  return {
    data: {
      title: String(title).trim(),
      description: description ? String(description) : null,
      type,
      scope,
      discountPercent: type === 'PERCENTAGE' || type === 'QUANTITY' || type === 'THRESHOLD' ? pct : null,
      discountFlatINR: type === 'FLAT' ? flat : null,
      maxDiscountINR: num(maxDiscountINR),
      minQty: type === 'QUANTITY' || type === 'BOGO' ? mQty : null,
      getQty: type === 'BOGO' ? gQty : null,
      minCartValueINR: type === 'THRESHOLD' ? minCart : null,
      productIds: scope === 'PRODUCT' ? pIds : [],
      categoryNames: scope === 'CATEGORY' ? cNames : [],
      region: reg,
      priority: num(priority) || 0,
      startsAt: start,
      endsAt: end,
      isActive: isActive === undefined ? true : !!isActive,
    },
  };
}

// Derive a live status label without persisting it — status is a function of the clock.
function statusOf(offer, now = new Date()) {
  if (!offer.isActive) return 'PAUSED';
  if (offer.startsAt && now < new Date(offer.startsAt)) return 'SCHEDULED';
  if (offer.endsAt && now > new Date(offer.endsAt)) return 'EXPIRED';
  return 'ACTIVE';
}

async function resolveBanner(bannerImage) {
  if (!bannerImage) return null;
  if (isDataUri(bannerImage) && resolveBase64InValue) {
    try {
      return await resolveBase64InValue(bannerImage, { folder: 'offer-banners' });
    } catch (e) {
      console.warn('[offers] banner upload failed, storing null:', e.message);
      return null;
    }
  }
  return String(bannerImage); // already a URL
}

// ─────────────────────────────── Admin CRUD ────────────────────────────────

const createOffer = async (req, res) => {
  try {
    const built = buildOfferData(req.body);
    if (built.error) return res.status(400).json({ success: false, message: built.error });
    built.data.bannerImage = await resolveBanner(req.body.bannerImage);
    const offer = await prisma.offer.create({ data: built.data });
    res.status(201).json({ success: true, data: { ...offer, status: statusOf(offer) } });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to create offer' });
  }
};

const getOffers = async (req, res) => {
  try {
    const offers = await prisma.offer.findMany({ orderBy: [{ isActive: 'desc' }, { endsAt: 'asc' }] });
    const now = new Date();
    res.json({ success: true, data: offers.map((o) => ({ ...o, status: statusOf(o, now) })) });
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

const getOffer = async (req, res) => {
  try {
    const offer = await prisma.offer.findUnique({ where: { id: req.params.id } });
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    res.json({ success: true, data: { ...offer, status: statusOf(offer) } });
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offer' });
  }
};

const updateOffer = async (req, res) => {
  try {
    const existing = await prisma.offer.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Offer not found' });
    const built = buildOfferData({ ...existing, ...req.body });
    if (built.error) return res.status(400).json({ success: false, message: built.error });
    if (req.body.bannerImage !== undefined) built.data.bannerImage = await resolveBanner(req.body.bannerImage);
    const offer = await prisma.offer.update({ where: { id: req.params.id }, data: built.data });
    res.json({ success: true, data: { ...offer, status: statusOf(offer) } });
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to update offer' });
  }
};

const deleteOffer = async (req, res) => {
  try {
    await prisma.offer.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Offer deleted' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete offer' });
  }
};

// ─────────────────────────────── Public feed ───────────────────────────────

/**
 * Live offers for the current storefront — powers the /offers page and campaign
 * strips. Filters to the region (via ?region=IN|US) and to the active window, and
 * decorates each with a display badge. THRESHOLD offers are included (they're shown as
 * "spend X get Y" banners), unlike the product badge enrichment which skips them.
 */
const getActiveOffers = async (req, res) => {
  try {
    const region = normalizeRegion(req.query.region);
    const currency = region === 'US' ? 'USD' : region === 'IN' ? 'INR' : null;
    const rate = currency === 'USD' ? await resolveUsdRate(prisma) : null;
    const now = new Date();

    const offers = await prisma.offer.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: [{ priority: 'desc' }, { endsAt: 'asc' }],
    });

    const visible = offers
      .filter((o) => (currency ? offerMatchesCurrency(o, currency) : true))
      .filter((o) => isOfferLive(o, now))
      .map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        bannerImage: o.bannerImage,
        type: o.type,
        scope: o.scope,
        badge: offerBadgeLabel(o, currency || 'INR', rate),
        discountPercent: o.discountPercent,
        discountFlatINR: o.discountFlatINR,
        minQty: o.minQty,
        getQty: o.getQty,
        minCartValueINR: o.minCartValueINR,
        categoryNames: o.categoryNames,
        productIds: o.productIds,
        endsAt: o.endsAt,
      }));

    res.json({ success: true, data: visible });
  } catch (error) {
    console.error('Get active offers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

module.exports = {
  createOffer,
  getOffers,
  getOffer,
  updateOffer,
  deleteOffer,
  getActiveOffers,
};
