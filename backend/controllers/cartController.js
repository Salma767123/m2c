const { prisma } = require('../config/database');
const { isVisibleInRegion, normalizeRegion } = require('../utils/regionVisibility');
const { isCourierAvailable } = require('../utils/couriers');
const { resolveUsdRate, resolveUnitPrice } = require('../utils/orderCurrency');
const { buildActiveOffer, qualifyingThresholdIds } = require('../utils/offers');

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variantId, currency = 'INR', transportType, courier } = req.body;
    const userId = req.userId;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    // Verify product exists and get its price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        basePrice: true,
        adminFixedPrice: true,
        priceINR: true,
        priceUSD: true,
        inStock: true,
        totalStock: true,
        priceVisibility: true,
        logisticsConfig: true,
        variants: variantId ? {
          where: { id: variantId },
          select: {
            id: true,
            price: true,
            adminFixedPrice: true,
            priceINR: true,
            priceUSD: true,
            stock: true,
            priceVisibility: true,
          }
        } : false
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    if (variantId && (!product.variants || product.variants.length === 0)) {
      return res.status(404).json({
        success: false,
        error: 'Product variant not found'
      });
    }

    // Region gate: the specific SKU (variant if chosen, else the product) must be
    // visible in the caller's storefront. `currency` maps 1:1 to region (INR=.in,
    // USD=.com). Stops an out-of-region product being added by a crafted request.
    const skuVisibility = variantId ? product.variants[0].priceVisibility : product.priceVisibility;
    if (!isVisibleInRegion(skuVisibility, currency)) {
      return res.status(400).json({
        success: false,
        error: 'This product is not available in your region'
      });
    }

    const checkStock = variantId ? product.variants[0].stock : product.totalStock;

    if (!product.inStock || checkStock < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Product or variant is out of stock or insufficient quantity available'
      });
    }

    // Shipping selection (optional at add time, validated when supplied). The
    // product page sends the chosen transport + courier so the line arrives in the
    // cart ready to check out; both are re-validated at order time regardless.
    const allowedTransports = Array.isArray(product?.logisticsConfig?.transportTypes)
      ? product.logisticsConfig.transportTypes
      : [];
    if (transportType != null && !allowedTransports.includes(transportType)) {
      return res.status(400).json({
        success: false,
        error: 'Selected shipping method is not available for this product'
      });
    }
    // The courier list is region- and mode-specific, so a courier only makes sense
    // alongside a transport the product offers.
    const shippingMode = transportType != null ? transportType : (allowedTransports.length === 1 ? allowedTransports[0] : null);
    if (courier != null && !(await isCourierAvailable(courier, currency, shippingMode))) {
      return res.status(400).json({
        success: false,
        error: 'Selected courier is not available for this shipping method'
      });
    }
    const shippingFields = {
      ...(transportType !== undefined ? { transportType } : {}),
      ...(courier !== undefined ? { courier } : {}),
    };

    // Get or create cart for user
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: true }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: true }
      });
    }

    // Check if item already exists in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        variantId: variantId || null
      }
    });

    // Resolve price based on currency (INR or USD)
    let price;
    if (currency === 'USD') {
      price = product.priceUSD || product.adminFixedPrice || product.basePrice;
    } else {
      price = product.priceINR || product.adminFixedPrice || product.basePrice;
    }
    if (variantId && product.variants && product.variants.length > 0) {
      const v = product.variants[0];
      if (currency === 'USD') {
        price = v.priceUSD || v.adminFixedPrice || v.price;
      } else {
        price = v.priceINR || v.adminFixedPrice || v.price;
      }
    }

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          price, // Update price in case it changed
          currency,
          // Re-adding from the product page carries a fresh shipping choice; apply it.
          ...shippingFields,
        }
      });
    } else {
      // Add new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variantId || null,
          quantity,
          price,
          currency,
          ...shippingFields,
        }
      });
    }

    // Get updated cart with items
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            cart: false
          }
        }
      }
    });

    // Calculate total
    const total = updatedCart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      success: true,
      message: 'Item added to cart',
      data: {
        items: updatedCart.items,
        total,
        itemCount: updatedCart.items.length
      }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart'
    });
  }
};

// Get cart
const getCart = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.json({
        success: true,
        data: {
          items: [],
          total: 0,
          itemCount: 0
        }
      });
    }

    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: true
      }
    });

    if (!cart) {
      return res.json({
        success: true,
        data: {
          items: [],
          total: 0,
          itemCount: 0
        }
      });
    }

    // Get product details for each item
    const itemsWithProducts = await Promise.all(
      cart.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
            adminFixedPrice: true,
            priceINR: true,
            priceUSD: true,
            originalPrice: true,
            originalPriceINR: true,
            originalPriceUSD: true,
            discount: true,
            inStock: true,
            totalStock: true,
            hasVariants: true,
            gstPercentage: true,
            category: true,
            material: true,
            rating: true,
            reviews: true,
            singleUnitSize: true,
            singleUnitColor: true,
            singleUnitColorHex: true,
            baseSku: true,
            logisticsConfig: true,
            inventory: {
              select: {
                baseStock: true,
                currentStock: true,
              }
            },
            images: {
              select: {
                url: true,
                isPrimary: true
              },
              orderBy: {
                isPrimary: 'desc'
              }
            },
            variants: item.variantId ? {
              where: { id: item.variantId },
              select: {
                id: true,
                size: true,
                color: true,
                colorHex: true,
                sku: true,
                price: true,
                adminFixedPrice: true,
                priceINR: true,
                priceUSD: true,
                originalPrice: true,
                originalPriceINR: true,
                originalPriceUSD: true,
                discount: true,
                stock: true,
                images: true,
              }
            } : false
          }
        });

        let variantDetails = null;
        if (item.variantId && product && product.variants && product.variants.length > 0) {
          variantDetails = product.variants[0];
        }

        return {
          ...item,
          variant: variantDetails,
          product: product ? {
            id: product.id,
            name: product.name,
            description: product.description,
            images: product.images.map(img => ({ url: img.url, isPrimary: img.isPrimary })),
            basePrice: product.basePrice,
            adminFixedPrice: product.adminFixedPrice,
            priceINR: product.priceINR,
            priceUSD: product.priceUSD,
            originalPrice: product.originalPrice,
            originalPriceINR: product.originalPriceINR,
            originalPriceUSD: product.originalPriceUSD,
            discount: product.discount,
            inStock: product.inStock,
            totalStock: product.totalStock,
            hasVariants: product.hasVariants,
            // For variant products without a specific variant selected (base unit),
            // use inventory.baseStock instead of totalStock (which sums all variants)
            availableStock: !item.variantId && product.hasVariants
              ? (product.inventory?.baseStock ?? 0)
              : product.totalStock,
            gstPercentage: product.gstPercentage,
            category: product.category,
            material: product.material,
            rating: product.rating,
            reviews: product.reviews,
            singleUnitSize: product.singleUnitSize,
            singleUnitColor: product.singleUnitColor,
            singleUnitColorHex: product.singleUnitColorHex,
            baseSku: product.baseSku,
            // Selected above but previously dropped here, so the storefront's
            // shipping calculator never had a config to work with and quoted ₹0 on
            // every order. The server now charges shipping from this same config,
            // so the client must receive it to show the customer the same number.
            logisticsConfig: product.logisticsConfig
          } : null
        };
      })
    );

    // Attach the live offer to each line so the cart/checkout shows exactly what
    // checkout will charge (offers apply on the selling price at order time). Uses the
    // same resolver as createOrder, including whole-cart THRESHOLD qualification.
    // Additive + fail-open: no live offers, or any error, leaves items untouched.
    try {
      const now = new Date();
      const offers = await prisma.offer.findMany({
        where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      });
      if (offers.length > 0) {
        const currency = normalizeRegion(req.query.region) === 'US' ? 'USD' : 'INR';
        const rate = currency === 'USD' ? await resolveUsdRate(prisma) : null;

        // Whole-cart INR subtotal (pre-offer selling price) to test THRESHOLD offers.
        let preSubtotalINR = 0;
        for (const it of itemsWithProducts) {
          const sku = it.variant || it.product;
          if (sku) preSubtotalINR += resolveUnitPrice(sku, 'INR', null) * it.quantity;
        }
        const thresholdIds = qualifyingThresholdIds(offers, preSubtotalINR, currency, now);

        for (const it of itemsWithProducts) {
          if (!it.product) continue;
          // Resolve against the chosen SKU's price but keep the product's id/category
          // so scope matching (product/category) stays correct for variants.
          const priced = it.variant
            ? { ...it.product, priceINR: it.variant.priceINR, priceUSD: it.variant.priceUSD, adminFixedPrice: it.variant.adminFixedPrice, basePrice: it.variant.price }
            : it.product;
          const activeOffer = buildActiveOffer(priced, offers, currency, rate, now, it.quantity, thresholdIds);
          if (activeOffer) it.product.activeOffer = activeOffer;
        }
      }
    } catch (e) {
      console.warn('[cart] offer enrichment skipped:', e.message);
    }

    const total = itemsWithProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      success: true,
      data: {
        items: itemsWithProducts,
        total,
        itemCount: itemsWithProducts.length
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, transportType, courier } = req.body;
    const userId = req.userId;

    // Any field may be updated independently — the cart's transport selector changes
    // transportType (+ courier), the +/- steppers change only quantity.
    const wantsQuantity = quantity !== undefined;
    const wantsTransport = transportType !== undefined;
    const wantsCourier = courier !== undefined;
    if (!wantsQuantity && !wantsTransport && !wantsCourier) {
      return res.status(400).json({
        success: false,
        error: 'Nothing to update'
      });
    }
    if (wantsQuantity && (!quantity || quantity < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      });
    }

    // Verify item belongs to user's cart
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true
      }
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    // Verify product stock — check variant stock if applicable
    const product = await prisma.product.findUnique({
      where: { id: cartItem.productId },
      select: {
        totalStock: true,
        inStock: true,
        logisticsConfig: true,
        variants: cartItem.variantId ? {
          where: { id: cartItem.variantId },
          select: { stock: true }
        } : false,
      }
    });

    const availableStock = cartItem.variantId && product?.variants?.length > 0
      ? product.variants[0].stock
      : product?.totalStock;

    if (wantsQuantity && (!product || !product.inStock || availableStock < quantity)) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock available${availableStock != null ? ` (${availableStock} left)` : ''}`
      });
    }

    // Only accept a transport the product actually offers — otherwise the order
    // would be priced with a rate the vendor never configured.
    const allowed = Array.isArray(product?.logisticsConfig?.transportTypes)
      ? product.logisticsConfig.transportTypes
      : [];
    if (wantsTransport && transportType !== null && !allowed.includes(transportType)) {
      return res.status(400).json({
        success: false,
        error: 'Selected shipping method is not available for this product'
      });
    }
    // Validate the courier against the region (from the line's currency) and the
    // resolved transport mode (the new choice if supplied, else the stored one).
    if (wantsCourier && courier !== null) {
      const mode = wantsTransport ? transportType : (cartItem.transportType || (allowed.length === 1 ? allowed[0] : null));
      if (!(await isCourierAvailable(courier, cartItem.currency, mode))) {
        return res.status(400).json({
          success: false,
          error: 'Selected courier is not available for this shipping method'
        });
      }
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        ...(wantsQuantity ? { quantity } : {}),
        ...(wantsTransport ? { transportType } : {}),
        ...(wantsCourier ? { courier } : {}),
      }
    });

    // Get updated cart
    const cart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: { items: true }
    });

    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      success: true,
      message: 'Cart item updated',
      data: {
        items: cart.items,
        total,
        itemCount: cart.items.length
      }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cart item'
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.userId;

    // Verify item belongs to user's cart
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true }
    });

    if (!cartItem || cartItem.cart.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    // Delete item
    await prisma.cartItem.delete({
      where: { id: itemId }
    });

    // Get updated cart
    const cart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: { items: true }
    });

    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: {
        items: cart.items,
        total,
        itemCount: cart.items.length
      }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.userId;

    const cart = await prisma.cart.findFirst({
      where: { userId }
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id }
      });
    }

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart'
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
