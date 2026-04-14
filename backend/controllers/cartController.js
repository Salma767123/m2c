const { prisma } = require('../config/database');

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variantId } = req.body;
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
        inStock: true,
        totalStock: true,
        variants: {
          where: variantId ? { id: variantId } : {}
        }
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

    const checkStock = variantId ? product.variants[0].stock : product.totalStock;

    if (!product.inStock || checkStock < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Product or variant is out of stock or insufficient quantity available'
      });
    }

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

    let price = product.adminFixedPrice || product.basePrice;
    if (variantId && product.variants && product.variants.length > 0) {
      price = product.variants[0].price;
    }

    if (existingItem) {
      // Update quantity
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          price // Update price in case it changed
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
          price
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
            originalPrice: true,
            discount: true,
            inStock: true,
            totalStock: true,
            gstPercentage: true,
            category: true,
            material: true,
            rating: true,
            reviews: true,
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
              select: { id: true, size: true, color: true, colorHex: true, images: true, stock: true }
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
            basePrice: product.adminFixedPrice || product.basePrice,
            originalPrice: product.originalPrice,
            discount: product.discount,
            inStock: product.inStock,
            availableStock: product.totalStock,
            gstPercentage: product.gstPercentage,
            category: product.category,
            material: product.material,
            rating: product.rating,
            reviews: product.reviews
          } : null
        };
      })
    );

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
    const { quantity } = req.body;
    const userId = req.userId;

    if (!quantity || quantity < 1) {
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

    // Verify product stock
    const product = await prisma.product.findUnique({
      where: { id: cartItem.productId },
      select: { totalStock: true, inStock: true }
    });

    if (!product || !product.inStock || product.totalStock < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient stock available'
      });
    }

    // Update quantity
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
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
