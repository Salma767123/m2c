const { prisma } = require('../config/database');

/**
 * Price negotiation between admin and vendor, sitting between QC approval and
 * final product approval.
 *
 * ── Status model ────────────────────────────────────────────────────────────
 * Product.approvalStatus only ever needs to answer "is a negotiation open?":
 *
 *   QC_APPROVED --(admin proposes)--> NEGOTIATION --(closed)--> QC_APPROVED
 *
 * Who moved last, what was offered and why lives on PriceNegotiation rows, so
 * the enum stays at one new value instead of six. On acceptance the agreed
 * figure is written to `agreedPrice` AND to `basePrice`, because the vendor is
 * paid `Product.basePrice` per order line (orderController) — an agreement that
 * did not touch basePrice would be cosmetic and the vendor would still be paid
 * their original asking price.
 *
 * Negotiation is product-level, matching settlement: variant prices are never
 * used to pay the vendor. Variants are scaled by the same ratio so their
 * relative pricing is preserved.
 */

const MAX_ROUNDS = 5;
const EXPIRY_DAYS = 7;

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Offers older than the window are dead — treat them as expired on read. */
const expiryDate = () => new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

/**
 * Lazily expire stale PENDING offers for a product so reads never present an
 * offer the other side can no longer act on. Returns the number expired.
 */
async function expireStaleOffers(productId) {
  const { count } = await prisma.priceNegotiation.updateMany({
    where: { productId, status: 'PENDING', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  // The product stays NEGOTIATION even when the offer lapses. A product only
  // leaves NEGOTIATION on a terminal admin action (final approve → APPROVED,
  // or reject → REJECTED). Reverting to QC_APPROVED here would drop it out of
  // the admin's "Under Negotiation" queue and hide that it still needs a
  // decision — exactly the bug this whole change fixes.
  return count;
}

/** The single open offer for a product, if any. */
async function getOpenOffer(productId) {
  return prisma.priceNegotiation.findFirst({
    where: { productId, status: 'PENDING' },
    orderBy: { round: 'desc' },
  });
}

/**
 * Apply an agreed vendor price to the product and scale its variants.
 *
 * `basePriceOriginal` is written once (first agreement) so the UI can always
 * show "asked X → agreed Y" no matter how many rounds happened.
 */
async function applyAgreedPrice(product, agreed) {
  const original = product.basePriceOriginal ?? product.basePrice;
  const ratio = original > 0 ? agreed / original : 1;

  // Price is agreed, but the product stays NEGOTIATION: it is now waiting on
  // the admin's FINAL approval (set selling price → APPROVED), not back in the
  // plain QC_APPROVED queue. Status only advances on that terminal action.
  await prisma.product.update({
    where: { id: product.id },
    data: {
      basePrice: round2(agreed),
      agreedPrice: round2(agreed),
      basePriceOriginal: original,
    },
  });

  // Scale variant prices by the agreed ratio so their spread is preserved.
  // Variants carry the vendor's own `price`; admin selling prices are set
  // later in the approve modal and are untouched here.
  if (product.hasVariants && ratio !== 1) {
    const variants = await prisma.productVariant.findMany({
      where: { productId: product.id },
      select: { id: true, price: true },
    });
    await Promise.all(
      variants.map((v) =>
        prisma.productVariant.update({
          where: { id: v.id },
          data: { price: round2((v.price || 0) * ratio) },
        })
      )
    );
  }
}

/** Fire-and-forget in-app notification. */
function notify(payload) {
  const { createNotification } = require('./notificationController');
  createNotification(payload).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: propose a price (opens or continues a negotiation)
// ─────────────────────────────────────────────────────────────────────────────
const adminProposePrice = async (req, res) => {
  try {
    const { productId } = req.params;
    const { proposedPrice, reasonCode, message } = req.body;
    const adminId = req.userId;

    const price = parseFloat(proposedPrice);
    if (!price || price <= 0) {
      return res.status(400).json({ success: false, error: 'A valid proposed price is required' });
    }
    if (!reasonCode && !message) {
      return res.status(400).json({ success: false, error: 'A reason or message is required' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    await expireStaleOffers(productId);

    // Only a QC-cleared product can be negotiated; and never one already live.
    if (!['QC_APPROVED', 'NEGOTIATION'].includes(product.approvalStatus)) {
      return res.status(400).json({
        success: false,
        error: `Cannot negotiate a product with status ${product.approvalStatus}. QC approval is required first.`,
      });
    }

    const open = await getOpenOffer(productId);
    // An offer awaiting the VENDOR cannot be replaced by another admin offer —
    // that would let the admin talk over themselves and confuse the timeline.
    if (open && open.proposedBy === 'ADMIN') {
      return res.status(409).json({
        success: false,
        error: 'An offer is already awaiting the vendor’s response.',
      });
    }

    const lastRound = await prisma.priceNegotiation.findFirst({
      where: { productId },
      orderBy: { round: 'desc' },
      select: { round: true },
    });
    const round = (lastRound?.round || 0) + 1;
    if (round > MAX_ROUNDS) {
      return res.status(400).json({
        success: false,
        error: `Negotiation limit of ${MAX_ROUNDS} rounds reached. Approve at the current price or reject the product.`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Responding to the vendor's counter supersedes it.
      if (open && open.proposedBy === 'VENDOR') {
        await tx.priceNegotiation.update({
          where: { id: open.id },
          data: { status: 'COUNTERED', respondedAt: new Date(), respondedById: adminId },
        });
      }

      const previousPrice = open ? open.proposedPrice : product.basePrice;
      const originalAsk = product.basePriceOriginal ?? product.basePrice;

      const offer = await tx.priceNegotiation.create({
        data: {
          productId,
          vendorId: product.vendorId,
          round,
          proposedBy: 'ADMIN',
          proposedById: adminId,
          proposedPrice: round2(price),
          proposedPercent: originalAsk > 0 ? round2((price / originalAsk) * 100) : null,
          previousPrice: previousPrice != null ? round2(previousPrice) : null,
          reasonCode: reasonCode || null,
          message: message || null,
          status: 'PENDING',
          expiresAt: expiryDate(),
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          approvalStatus: 'NEGOTIATION',
          // Preserve the vendor's first asking price before any agreement.
          basePriceOriginal: product.basePriceOriginal ?? product.basePrice,
        },
      });

      return offer;
    });

    notify({
      userId: product.vendorId,
      role: 'VENDOR',
      type: 'PRICE_NEGOTIATION_OFFER',
      title: 'Price Offer Received',
      message: `Admin proposed ₹${round2(price)} for "${product.name}". Please review.`,
      data: { productId, negotiationId: result.id },
    });

    res.json({ success: true, message: 'Offer sent to vendor', data: result });
  } catch (error) {
    console.error('adminProposePrice error:', error);
    res.status(500).json({ success: false, error: 'Failed to send price offer' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared responder: accept / reject / counter an open offer
// ─────────────────────────────────────────────────────────────────────────────
async function respondToOffer({ req, res, actor }) {
  const { productId } = req.params;
  const { action, counterPrice, message, reasonCode } = req.body;
  const actorId = actor === 'VENDOR' ? (req.user?.vendorId || req.user?.id) : req.userId;

  if (!['ACCEPT', 'REJECT', 'COUNTER'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action must be ACCEPT, REJECT or COUNTER' });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

  // A vendor may only act on their own product.
  const actingVendorId = req.user?.vendorId || req.user?.id;
  if (actor === 'VENDOR' && product.vendorId !== actingVendorId) {
    return res.status(403).json({ success: false, error: 'Not your product' });
  }

  await expireStaleOffers(productId);

  const open = await getOpenOffer(productId);
  if (!open) {
    return res.status(404).json({ success: false, error: 'No open offer to respond to' });
  }
  // You cannot answer your own offer.
  if (open.proposedBy === actor) {
    return res.status(409).json({ success: false, error: 'This offer is awaiting the other party' });
  }

  const counterparty = actor === 'VENDOR' ? 'ADMIN' : 'VENDOR';

  // ── ACCEPT ───────────────────────────────────────────────────────────────
  if (action === 'ACCEPT') {
    await prisma.priceNegotiation.update({
      where: { id: open.id },
      data: { status: 'ACCEPTED', respondedAt: new Date(), respondedById: actorId },
    });
    await applyAgreedPrice(product, open.proposedPrice);

    if (counterparty === 'ADMIN') {
      const { createNotificationForRole } = require('./notificationController');
      createNotificationForRole({
        role: 'ADMIN',
        type: 'PRICE_NEGOTIATION_ACCEPTED',
        title: 'Vendor Accepted Price',
        message: `Vendor accepted ₹${open.proposedPrice} for "${product.name}". Ready for final approval.`,
        data: { productId },
      }).catch(() => {});
    } else {
      notify({
        userId: product.vendorId,
        role: 'VENDOR',
        type: 'PRICE_NEGOTIATION_ACCEPTED',
        title: 'Price Agreed',
        message: `Admin accepted ₹${open.proposedPrice} for "${product.name}".`,
        data: { productId },
      });
    }

    return res.json({
      success: true,
      message: `Price agreed at ₹${open.proposedPrice}`,
      data: { agreedPrice: open.proposedPrice },
    });
  }

  // ── REJECT ───────────────────────────────────────────────────────────────
  if (action === 'REJECT') {
    await prisma.priceNegotiation.update({
      where: { id: open.id },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
        respondedById: actorId,
        message: message || open.message,
      },
    });
    // The offer round is REJECTED, but the PRODUCT stays NEGOTIATION so it
    // stays in the admin's "Under Negotiation" queue. With no open offer the
    // admin can now approve it at the current price, re-propose, or reject the
    // product outright — all terminal decisions belong to the admin.

    if (counterparty === 'ADMIN') {
      const { createNotificationForRole } = require('./notificationController');
      createNotificationForRole({
        role: 'ADMIN',
        type: 'PRICE_NEGOTIATION_REJECTED',
        title: 'Vendor Rejected Offer',
        message: `Vendor rejected the price offer for "${product.name}".`,
        data: { productId },
      }).catch(() => {});
    } else {
      notify({
        userId: product.vendorId,
        role: 'VENDOR',
        type: 'PRICE_NEGOTIATION_REJECTED',
        title: 'Price Offer Declined',
        message: `Admin declined your price for "${product.name}".`,
        data: { productId },
      });
    }

    return res.json({ success: true, message: 'Offer rejected' });
  }

  // ── COUNTER ──────────────────────────────────────────────────────────────
  const price = parseFloat(counterPrice);
  if (!price || price <= 0) {
    return res.status(400).json({ success: false, error: 'A valid counter price is required' });
  }

  const round = open.round + 1;
  if (round > MAX_ROUNDS) {
    return res.status(400).json({
      success: false,
      error: `Negotiation limit of ${MAX_ROUNDS} rounds reached.`,
    });
  }

  const originalAsk = product.basePriceOriginal ?? product.basePrice;

  const offer = await prisma.$transaction(async (tx) => {
    await tx.priceNegotiation.update({
      where: { id: open.id },
      data: { status: 'COUNTERED', respondedAt: new Date(), respondedById: actorId },
    });
    return tx.priceNegotiation.create({
      data: {
        productId,
        vendorId: product.vendorId,
        round,
        proposedBy: actor,
        proposedById: actorId,
        proposedPrice: round2(price),
        proposedPercent: originalAsk > 0 ? round2((price / originalAsk) * 100) : null,
        previousPrice: round2(open.proposedPrice),
        reasonCode: reasonCode || null,
        message: message || null,
        status: 'PENDING',
        expiresAt: expiryDate(),
      },
    });
  });

  if (counterparty === 'ADMIN') {
    const { createNotificationForRole } = require('./notificationController');
    createNotificationForRole({
      role: 'ADMIN',
      type: 'PRICE_NEGOTIATION_COUNTER',
      title: 'Vendor Counter Offer',
      message: `Vendor countered with ₹${round2(price)} for "${product.name}".`,
      data: { productId, negotiationId: offer.id },
    }).catch(() => {});
  } else {
    notify({
      userId: product.vendorId,
      role: 'VENDOR',
      type: 'PRICE_NEGOTIATION_COUNTER',
      title: 'New Price Offer',
      message: `Admin countered with ₹${round2(price)} for "${product.name}".`,
      data: { productId, negotiationId: offer.id },
    });
  }

  return res.json({ success: true, message: 'Counter offer sent', data: offer });
}

const vendorRespond = (req, res) =>
  respondToOffer({ req, res, actor: 'VENDOR' }).catch((error) => {
    console.error('vendorRespond error:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to offer' });
  });

const adminRespond = (req, res) =>
  respondToOffer({ req, res, actor: 'ADMIN' }).catch((error) => {
    console.error('adminRespond error:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to offer' });
  });

// ─────────────────────────────────────────────────────────────────────────────
// Timeline for one product (admin + vendor both read this)
// ─────────────────────────────────────────────────────────────────────────────
const getProductNegotiations = async (req, res) => {
  try {
    const { productId } = req.params;
    await expireStaleOffers(productId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true, name: true, baseSku: true, vendorId: true, basePrice: true,
        agreedPrice: true, basePriceOriginal: true, approvalStatus: true,
        hasVariants: true,
        variants: { select: { id: true, size: true, color: true, sku: true, price: true } },
      },
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const viewerVendorId = req.user?.role === 'vendor' ? (req.user?.vendorId || req.user?.id) : null;
    if (viewerVendorId && product.vendorId !== viewerVendorId) {
      return res.status(403).json({ success: false, error: 'Not your product' });
    }

    const rounds = await prisma.priceNegotiation.findMany({
      where: { productId },
      orderBy: { round: 'asc' },
    });

    const openOffer = rounds.find((r) => r.status === 'PENDING') || null;

    res.json({
      success: true,
      data: {
        product,
        rounds,
        openOffer,
        // Whose turn it is, so the UI does not have to derive it.
        awaiting: openOffer ? (openOffer.proposedBy === 'ADMIN' ? 'VENDOR' : 'ADMIN') : null,
        maxRounds: MAX_ROUNDS,
        roundsUsed: rounds.length,
      },
    });
  } catch (error) {
    console.error('getProductNegotiations error:', error);
    res.status(500).json({ success: false, error: 'Failed to load negotiations' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// List view — admin sees all, vendor sees only their own
// ─────────────────────────────────────────────────────────────────────────────
const listNegotiations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const take = Math.min(parseInt(limit) || 20, 100);
    const skip = ((parseInt(page) || 1) - 1) * take;

    await prisma.priceNegotiation.updateMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });

    const where = {};
    // Vendors are scoped to their own rows; admins see everything.
    const scopedVendorId = req.user?.role === 'vendor' ? (req.user?.vendorId || req.user?.id) : null;
    if (scopedVendorId) where.vendorId = scopedVendorId;
    if (status) where.status = status.toUpperCase();

    const [rows, total] = await Promise.all([
      prisma.priceNegotiation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          product: {
            select: {
              id: true, name: true, baseSku: true, basePrice: true,
              agreedPrice: true, basePriceOriginal: true, approvalStatus: true,
              images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            },
          },
          vendor: { select: { id: true, companyName: true, ownerName: true } },
        },
      }),
      prisma.priceNegotiation.count({ where }),
    ]);

    res.json({
      success: true,
      data: rows,
      pagination: { page: parseInt(page) || 1, limit: take, total, pages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error('listNegotiations error:', error);
    res.status(500).json({ success: false, error: 'Failed to load negotiations' });
  }
};

module.exports = {
  adminProposePrice,
  vendorRespond,
  adminRespond,
  getProductNegotiations,
  listNegotiations,
  // exported for the approve-gate check in productController
  getOpenOffer,
  expireStaleOffers,
};
