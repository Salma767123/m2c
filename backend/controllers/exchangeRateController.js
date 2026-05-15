const { prisma } = require('../config/database');

/**
 * Get the current USD exchange rate.
 * Public endpoint — frontend needs it for price display.
 */
const getExchangeRate = async (req, res) => {
  try {
    const rate = await prisma.exchangeRate.findUnique({
      where: { currency: 'USD' },
    });

    if (!rate) {
      return res.json({
        success: true,
        data: { currency: 'USD', rate: 83.50, isActive: true },
        message: 'Default exchange rate (no custom rate set)',
      });
    }

    res.json({ success: true, data: rate });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchange rate' });
  }
};

/**
 * Update or create the USD exchange rate.
 * When updated, auto-recalculates all product USD prices.
 * Admin only.
 */
const updateExchangeRate = async (req, res) => {
  try {
    const { rate } = req.body;
    const adminId = req.userId;

    if (!rate || parseFloat(rate) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Exchange rate must be a positive number',
      });
    }

    const exchangeRate = parseFloat(rate);

    // Upsert the exchange rate
    const updated = await prisma.exchangeRate.upsert({
      where: { currency: 'USD' },
      update: { rate: exchangeRate, updatedBy: adminId },
      create: { currency: 'USD', rate: exchangeRate, updatedBy: adminId },
    });

    // Auto-recalculate USD prices for ALL approved products
    const recalcResult = await recalculateAllUSDPrices(exchangeRate);

    res.json({
      success: true,
      data: updated,
      recalculated: recalcResult,
      message: `Exchange rate updated to ₹${exchangeRate} per USD. ${recalcResult.productsUpdated} products and ${recalcResult.variantsUpdated} variants recalculated.`,
    });
  } catch (error) {
    console.error('Update exchange rate error:', error);
    res.status(500).json({ success: false, error: 'Failed to update exchange rate' });
  }
};

/**
 * Recalculate USD prices for all products based on the exchange rate.
 * Formula: priceUSD = priceINR / exchangeRate
 * Only updates products that have a priceINR or adminFixedPrice set.
 */
async function recalculateAllUSDPrices(exchangeRate) {
  let productsUpdated = 0;
  let variantsUpdated = 0;

  // Get all products with INR prices
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { priceINR: { not: null } },
        { adminFixedPrice: { not: null } },
        { basePrice: { gt: 0 } },
      ],
    },
    select: {
      id: true,
      basePrice: true,
      adminFixedPrice: true,
      priceINR: true,
      originalPrice: true,
      originalPriceINR: true,
    },
  });

  for (const product of products) {
    // INR price priority: priceINR → adminFixedPrice → basePrice
    const inrPrice = product.priceINR || product.adminFixedPrice || product.basePrice;
    const usdPrice = Math.round((inrPrice / exchangeRate) * 100) / 100; // 2 decimal places

    const updateData = { priceUSD: usdPrice };

    // Also recalculate original price USD if original INR exists
    const originalINR = product.originalPriceINR || product.originalPrice;
    if (originalINR && originalINR > 0) {
      updateData.originalPriceUSD = Math.round((originalINR / exchangeRate) * 100) / 100;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: updateData,
    });
    productsUpdated++;
  }

  // Recalculate variant USD prices
  const variants = await prisma.productVariant.findMany({
    where: {
      OR: [
        { priceINR: { not: null } },
        { adminFixedPrice: { not: null } },
        { price: { gt: 0 } },
      ],
    },
    select: {
      id: true,
      price: true,
      adminFixedPrice: true,
      priceINR: true,
      originalPrice: true,
      originalPriceINR: true,
    },
  });

  for (const variant of variants) {
    const inrPrice = variant.priceINR || variant.adminFixedPrice || variant.price;
    const usdPrice = Math.round((inrPrice / exchangeRate) * 100) / 100;

    const updateData = { priceUSD: usdPrice };

    const originalINR = variant.originalPriceINR || variant.originalPrice;
    if (originalINR && originalINR > 0) {
      updateData.originalPriceUSD = Math.round((originalINR / exchangeRate) * 100) / 100;
    }

    await prisma.productVariant.update({
      where: { id: variant.id },
      data: updateData,
    });
    variantsUpdated++;
  }

  // Also recalculate BagType USD prices
  const bags = await prisma.bagType.findMany({
    where: { price: { gt: 0 } },
    select: { id: true, price: true, priceINR: true },
  });

  for (const bag of bags) {
    const inrPrice = bag.priceINR || bag.price;
    await prisma.bagType.update({
      where: { id: bag.id },
      data: { priceUSD: Math.round((inrPrice / exchangeRate) * 100) / 100 },
    });
  }

  return { productsUpdated, variantsUpdated, bagsUpdated: bags.length };
}

/**
 * Get the current exchange rate value (utility — used by other controllers).
 */
async function getCurrentExchangeRate() {
  const rate = await prisma.exchangeRate.findUnique({ where: { currency: 'USD' } });
  return rate?.rate || 83.50; // Default fallback
}

/**
 * Calculate USD price from INR price using current exchange rate.
 */
async function calculateUSDPrice(inrPrice) {
  const rate = await getCurrentExchangeRate();
  return Math.round((inrPrice / rate) * 100) / 100;
}

module.exports = {
  getExchangeRate,
  updateExchangeRate,
  getCurrentExchangeRate,
  calculateUSDPrice,
  recalculateAllUSDPrices,
};
