const { prisma } = require('../config/database');

// Add item to wishlist
const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.userId;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Get or create wishlist for user
    let wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: { items: true }
    });

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId },
        include: { items: true }
      });
    }

    // Check if item already exists in wishlist
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId
      }
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: 'Product already in wishlist'
      });
    }

    // Add new item
    await prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId
      }
    });

    // Get updated wishlist with items
    const updatedWishlist = await prisma.wishlist.findUnique({
      where: { id: wishlist.id },
      include: {
        items: true
      }
    });

    res.json({
      success: true,
      message: 'Item added to wishlist',
      data: {
        items: updatedWishlist.items,
        count: updatedWishlist.items.length
      }
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to wishlist'
    });
  }
};

// Get wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.json({
        success: true,
        data: {
          items: [],
          count: 0
        }
      });
    }

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: true
      }
    });

    if (!wishlist) {
      return res.json({
        success: true,
        data: {
          items: [],
          count: 0
        }
      });
    }

    // Get product details for each item
    const itemsWithProducts = await Promise.all(
      wishlist.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            basePrice: true,
            adminFixedPrice: true,
            originalPrice: true,
            discount: true,
            inStock: true,
            totalStock: true,
            rating: true,
            reviews: true,
            category: true,
            images: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true }
            }
          }
        });

        return {
          ...item,
          product: product ? {
            id: product.id,
            name: product.name,
            image: product.images[0]?.url || '',
            basePrice: product.adminFixedPrice || product.basePrice,
            originalPrice: product.originalPrice,
            discount: product.discount,
            inStock: product.inStock,
            rating: product.rating,
            reviews: product.reviews,
            category: product.category
          } : null
        };
      })
    );

    // Filter out items where product no longer exists
    const validItems = itemsWithProducts.filter(item => item.product !== null);

    res.json({
      success: true,
      data: {
        items: validItems,
        count: validItems.length
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wishlist'
    });
  }
};

// Remove item from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.userId;

    // Get user's wishlist
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId }
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: 'Wishlist not found'
      });
    }

    // Find and delete the item
    const item = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId
      }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in wishlist'
      });
    }

    await prisma.wishlistItem.delete({
      where: { id: item.id }
    });

    // Get updated wishlist
    const updatedWishlist = await prisma.wishlist.findUnique({
      where: { id: wishlist.id },
      include: { items: true }
    });

    res.json({
      success: true,
      message: 'Item removed from wishlist',
      data: {
        items: updatedWishlist.items,
        count: updatedWishlist.items.length
      }
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from wishlist'
    });
  }
};

// Check if product is in wishlist
const checkInWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.userId;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId }
    });

    if (!wishlist) {
      return res.json({
        success: true,
        inWishlist: false
      });
    }

    const item = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId
      }
    });

    res.json({
      success: true,
      inWishlist: !!item
    });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check wishlist'
    });
  }
};

// Clear wishlist
const clearWishlist = async (req, res) => {
  try {
    const userId = req.userId;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId }
    });

    if (wishlist) {
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id }
      });
    }

    res.json({
      success: true,
      message: 'Wishlist cleared successfully'
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear wishlist'
    });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  checkInWishlist,
  clearWishlist
};
