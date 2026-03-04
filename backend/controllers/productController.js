const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create new product
const createProduct = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      // Inventory Connection
      inventoryItemId,
      isFromInventory,

      // Basic Information
      name,
      description,
      category,
      subCategory,

      // Pricing Information
      basePrice,
      originalPrice,
      discount,
      gstPercentage,

      // Single Unit Pricing Configuration
      singleUnitSize,
      singleUnitColor,
      singleUnitColorHex,

      // Fabric & Specifications
      fabricType,
      material,
      fabricSpecifications,

      // Variants Management
      variants,
      hasVariants,

      // Base Product Info
      baseSku,

      // Images
      images,

      // Stock Management
      totalStock,
      lowStockThreshold,
      trackInventory,

      // Dispatch & Shipping
      dispatchTimeline,

      // Additional Info
      tags,
      dimensions,
      weight,
      inStock,
      status
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !baseSku) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, category, and base SKU are required'
      });
    }

    if (hasVariants && (!variants || variants.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one variant is required when variants are enabled'
      });
    }

    // Check if base SKU already exists
    const existingSku = await prisma.product.findFirst({
      where: { baseSku }
    });

    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'Base SKU already exists. Please use a unique SKU.'
      });
    }

    // If connecting to inventory, validate and update inventory item
    let inventoryItem = null;
    if (isFromInventory && inventoryItemId) {
      inventoryItem = await prisma.inventory.findFirst({
        where: {
          id: inventoryItemId,
          vendorId,
          hasProductCreated: false
        }
      });

      if (!inventoryItem) {
        return res.status(400).json({
          success: false,
          message: 'Inventory item not found or already has a product created'
        });
      }
    }

    // Validate variant SKUs if variants exist
    if (hasVariants && variants && variants.length > 0) {
      const variantSkus = variants.map(v => v.sku);
      const duplicateSkus = variantSkus.filter((sku, index) => variantSkus.indexOf(sku) !== index);

      if (duplicateSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate variant SKUs found: ${duplicateSkus.join(', ')}`
        });
      }

      // Check if any variant SKU already exists
      const existingVariantSkus = await prisma.productVariant.findMany({
        where: {
          sku: { in: variantSkus }
        }
      });

      if (existingVariantSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Variant SKUs already exist: ${existingVariantSkus.map(v => v.sku).join(', ')}`
        });
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Determine the stock to use
      let productStock = 0;

      if (hasVariants && variants && variants.length > 0) {
        // If has variants, total stock is sum of variant stocks
        productStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      } else if (isFromInventory && inventoryItem) {
        // If from inventory (and no variants), use inventory stock
        productStock = inventoryItem.currentStock;
      } else {
        // Otherwise use provided total stock
        productStock = parseInt(totalStock) || 0;
      }

      // Create product
      const product = await tx.product.create({
        data: {
          vendorId,
          inventoryItemId: isFromInventory ? inventoryItemId : null,
          isFromInventory: isFromInventory || false,
          name,
          description,
          category,
          subCategory,
          basePrice: parseFloat(basePrice) || 0,
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          discount: discount ? parseFloat(discount) : null,
          gstPercentage: gstPercentage !== null && gstPercentage !== undefined && gstPercentage !== '' ? parseFloat(gstPercentage) : null,

          // Single Unit Pricing Configuration
          singleUnitSize: singleUnitSize || null,
          singleUnitColor: singleUnitColor || null,
          singleUnitColorHex: singleUnitColorHex || null,
          fabricType,
          material,
          fabricSpecifications: fabricSpecifications || {},
          hasVariants: hasVariants || false,
          baseSku,
          totalStock: productStock,
          lowStockThreshold: parseInt(lowStockThreshold) || 10,
          trackInventory: trackInventory !== false,
          dispatchTimeline: dispatchTimeline ? {
            processingDays: parseInt(dispatchTimeline.processingDays) || 1,
            shippingDays: parseInt(dispatchTimeline.shippingDays) || 3,
            totalDays: parseInt(dispatchTimeline.totalDays) || 4
          } : {
            processingDays: 1,
            shippingDays: 3,
            totalDays: 4
          },
          tags: tags || [],
          dimensions,
          weight,
          inStock: inStock !== false,
          status: 'ACTIVE', // Default status is ACTIVE
          approvalStatus: 'PENDING' // Default approval status is PENDING
        }
      });

      // Create variants if enabled
      if (hasVariants && variants && variants.length > 0) {
        const variantData = variants.map(variant => ({
          productId: product.id,
          size: variant.size,
          color: variant.color,
          colorHex: variant.colorHex,
          sku: variant.sku,
          price: parseFloat(variant.price),
          stock: parseInt(variant.stock) || 0,
          images: variant.images || []
        }));

        await tx.productVariant.createMany({
          data: variantData
        });
      }

      // Create images if provided
      if (images && images.length > 0) {
        const imageData = images.map((image, index) => ({
          productId: product.id,
          url: image.url,
          alt: image.alt || name,
          isPrimary: image.isPrimary || false,
          imageType: image.imageType || 'gallery',
          sortOrder: index
        }));

        await tx.productImage.createMany({
          data: imageData
        });
      }

      // Update inventory item if connected
      if (isFromInventory && inventoryItemId) {
        let inventoryUpdateData = {
          hasProductCreated: true,
          productId: product.id
        };

        // If has variants, sync calculated stock to inventory
        if (hasVariants && variants && variants.length > 0) {
          inventoryUpdateData.currentStock = productStock;
        }

        await tx.inventory.update({
          where: { id: inventoryItemId },
          data: inventoryUpdateData
        });
      }

      return product;
    });

    // Fetch the complete product with relations
    const completeProduct = await prisma.product.findUnique({
      where: { id: result.id },
      include: {
        variants: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        inventory: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: completeProduct
    });

  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all products for a vendor
const getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      hasVariants,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter conditions
    const where = {
      vendorId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { baseSku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(category && { category }),
      ...(status && { status }),
      ...(hasVariants !== undefined && { hasVariants: hasVariants === 'true' })
    };

    // Get total count for pagination
    const totalItems = await prisma.product.count({ where });

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      include: {
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            price: true,
            stock: true
          }
        },
        images: {
          where: { isPrimary: true },
          select: {
            url: true,
            alt: true
          },
          take: 1
        },
        inventory: {
          select: {
            name: true,
            sku: true,
            currentStock: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        items: products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          hasNextPage,
          hasPrevPage,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        vendorId
      },
      include: {
        variants: {
          orderBy: { createdAt: 'asc' }
        },
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        inventory: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true,
            category: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists and belongs to vendor
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        vendorId
      },
      include: {
        variants: true,
        images: true
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if base SKU is being changed and if new SKU already exists
    if (updateData.baseSku && updateData.baseSku !== existingProduct.baseSku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          baseSku: updateData.baseSku,
          id: { not: id }
        }
      });

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'Base SKU already exists. Please use a unique SKU.'
        });
      }
    }

    // Validate variant SKUs if variants are being updated
    if (updateData.variants && updateData.variants.length > 0) {
      const variantSkus = updateData.variants.map(v => v.sku);
      const duplicateSkus = variantSkus.filter((sku, index) => variantSkus.indexOf(sku) !== index);

      if (duplicateSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate variant SKUs found: ${duplicateSkus.join(', ')}`
        });
      }

      // Check if any variant SKU already exists (excluding current product variants)
      const existingVariantSkus = await prisma.productVariant.findMany({
        where: {
          sku: { in: variantSkus },
          productId: { not: id }
        }
      });

      if (existingVariantSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Variant SKUs already exist: ${existingVariantSkus.map(v => v.sku).join(', ')}`
        });
      }
    }

    // Start transaction for update
    const result = await prisma.$transaction(async (tx) => {
      // Calculate total stock from variants if we are updating variants
      let newTotalStock = undefined;

      if ((updateData.hasVariants === true || (existingProduct.hasVariants && updateData.hasVariants !== false)) && updateData.variants && updateData.variants.length > 0) {
        newTotalStock = updateData.variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      } else if (updateData.totalStock !== undefined) {
        newTotalStock = parseInt(updateData.totalStock);
      }

      // Update product
      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.description && { description: updateData.description }),
          ...(updateData.category && { category: updateData.category }),
          ...(updateData.subCategory !== undefined && { subCategory: updateData.subCategory }),
          ...(updateData.basePrice !== undefined && { basePrice: parseFloat(updateData.basePrice) }),
          ...(updateData.originalPrice !== undefined && {
            originalPrice: updateData.originalPrice ? parseFloat(updateData.originalPrice) : null
          }),
          ...(updateData.discount !== undefined && {
            discount: updateData.discount ? parseFloat(updateData.discount) : null
          }),
          ...(updateData.gstPercentage !== undefined && {
            gstPercentage: updateData.gstPercentage !== null && updateData.gstPercentage !== '' ? parseFloat(updateData.gstPercentage) : null
          }),

          // Single Unit Pricing Configuration
          ...(updateData.singleUnitSize !== undefined && { singleUnitSize: updateData.singleUnitSize }),
          ...(updateData.singleUnitColor !== undefined && { singleUnitColor: updateData.singleUnitColor }),
          ...(updateData.singleUnitColorHex !== undefined && { singleUnitColorHex: updateData.singleUnitColorHex }),
          ...(updateData.fabricType !== undefined && { fabricType: updateData.fabricType }),
          ...(updateData.material !== undefined && { material: updateData.material }),
          ...(updateData.fabricSpecifications !== undefined && {
            fabricSpecifications: updateData.fabricSpecifications
          }),
          ...(updateData.hasVariants !== undefined && { hasVariants: updateData.hasVariants }),
          ...(updateData.baseSku && { baseSku: updateData.baseSku }),

          // Use calculated stock if available, otherwise just update if provided
          ...(newTotalStock !== undefined && { totalStock: newTotalStock }),

          ...(updateData.lowStockThreshold !== undefined && {
            lowStockThreshold: parseInt(updateData.lowStockThreshold)
          }),
          ...(updateData.trackInventory !== undefined && { trackInventory: updateData.trackInventory }),
          ...(updateData.dispatchTimeline !== undefined && {
            dispatchTimeline: updateData.dispatchTimeline ? {
              processingDays: parseInt(updateData.dispatchTimeline.processingDays) || 1,
              shippingDays: parseInt(updateData.dispatchTimeline.shippingDays) || 3,
              totalDays: parseInt(updateData.dispatchTimeline.totalDays) || 4
            } : updateData.dispatchTimeline
          }),
          ...(updateData.tags !== undefined && { tags: updateData.tags }),
          ...(updateData.dimensions !== undefined && { dimensions: updateData.dimensions }),
          ...(updateData.weight !== undefined && { weight: updateData.weight }),
          ...(updateData.inStock !== undefined && { inStock: updateData.inStock }),
          ...(updateData.status && { status: updateData.status.toUpperCase() })
        }
      });

      // Update variants if provided
      if (updateData.variants !== undefined) {
        // Delete existing variants
        await tx.productVariant.deleteMany({
          where: { productId: id }
        });

        // Create new variants
        if (updateData.variants.length > 0) {
          const variantData = updateData.variants.map(variant => ({
            productId: id,
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex,
            sku: variant.sku,
            price: parseFloat(variant.price),
            stock: parseInt(variant.stock) || 0,
            images: variant.images || []
          }));

          await tx.productVariant.createMany({
            data: variantData
          });
        }
      }

      // Update images if provided
      if (updateData.images !== undefined) {
        // Delete existing images
        await tx.productImage.deleteMany({
          where: { productId: id }
        });

        // Create new images
        if (updateData.images.length > 0) {
          const imageData = updateData.images.map((image, index) => ({
            productId: id,
            url: image.url,
            alt: image.alt || updatedProduct.name,
            isPrimary: image.isPrimary || false,
            imageType: image.imageType || 'gallery',
            sortOrder: index
          }));

          await tx.productImage.createMany({
            data: imageData
          });
        }
      }

      return updatedProduct;
    });

    // Fetch the complete updated product
    const completeProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        inventory: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true
          }
        }
      }
    });

    // Sync stock with linked inventory (outside transaction)
    // If has variants, use calculated total stock. If not, use provided totalStock
    let finalStock = 0;
    if (updateData.hasVariants && updateData.variants && updateData.variants.length > 0) {
      finalStock = updateData.variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
    } else if (existingProduct.hasVariants && (!updateData.variants || updateData.variants.length === 0)) {
      // Using existing variants (if not updated) - we need to fetch them if not in existingProduct include
      // But for now, let's assume if variants aren't in updateData, stock isn't changing via variants
      // This might be an edge case, but typically updates include variants if they are being changed.
      // Better approach: calculate final stock trigger.
      finalStock = parseInt(updateData.totalStock) || existingProduct.totalStock; // Fallback
    } else {
      finalStock = parseInt(updateData.totalStock);
    }

    // Special case: If we just calculated stock from variants, we should verify/update the product's totalStock too if it wasn't done in transaction
    // Actually, we should have done it IN the transaction.
    // Let's refactor the update logic above to be safer.

    // RE-FETCH the finalized product to get the true stock
    const finalizedProduct = await prisma.product.findUnique({
      where: { id },
      include: { variants: true }
    });

    if (finalizedProduct) {
      let trueTotalStock = finalizedProduct.totalStock;

      // If it has variants, strictly enforce sum
      if (finalizedProduct.hasVariants && finalizedProduct.variants.length > 0) {
        trueTotalStock = finalizedProduct.variants.reduce((sum, v) => sum + v.stock, 0);

        // If the stored totalStock doesn't match sum of variants, update it
        if (trueTotalStock !== finalizedProduct.totalStock) {
          await prisma.product.update({
            where: { id },
            data: { totalStock: trueTotalStock }
          });
        }
      }

      // Now sync with Inventory
      if (existingProduct.inventoryItemId) {
        await prisma.inventory.update({
          where: { id: existingProduct.inventoryItemId },
          data: { currentStock: trueTotalStock }
        });
        console.log('✅ Synced stock with inventory:', existingProduct.inventoryItemId, 'New Stock:', trueTotalStock);
      }
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: completeProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    // Check if product exists and belongs to vendor
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        vendorId
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Start transaction for deletion
    await prisma.$transaction(async (tx) => {
      // Delete variants
      await tx.productVariant.deleteMany({
        where: { productId: id }
      });

      // Delete images
      await tx.productImage.deleteMany({
        where: { productId: id }
      });

      // Update inventory item if connected
      if (existingProduct.inventoryItemId) {
        await tx.inventory.update({
          where: { id: existingProduct.inventoryItemId },
          data: {
            hasProductCreated: false,
            productId: null
          }
        });
      }

      // Delete product
      await tx.product.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get product statistics
const getProductStats = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Get total products
    const totalProducts = await prisma.product.count({
      where: { vendorId }
    });

    // Get active products
    const activeProducts = await prisma.product.count({
      where: { vendorId, status: 'ACTIVE' }
    });

    // Get pending products
    const pendingProducts = await prisma.product.count({
      where: { vendorId, status: 'PENDING' }
    });

    // Get out of stock products
    const outOfStockProducts = await prisma.product.count({
      where: { vendorId, inStock: false }
    });

    // Get products with variants
    const productsWithVariants = await prisma.product.count({
      where: { vendorId, hasVariants: true }
    });

    // Get total stock across all products
    const productsWithStock = await prisma.product.findMany({
      where: { vendorId, trackInventory: true },
      select: {
        totalStock: true,
        variants: {
          select: {
            stock: true
          }
        },
        hasVariants: true
      }
    });

    const totalStock = productsWithStock.reduce((sum, product) => {
      if (product.hasVariants) {
        return sum + product.variants.reduce((variantSum, variant) => variantSum + variant.stock, 0);
      } else {
        return sum + product.totalStock;
      }
    }, 0);

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        pendingProducts,
        outOfStockProducts,
        productsWithVariants,
        totalStock
      }
    });

  } catch (error) {
    console.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get available inventory items for product creation
const getAvailableInventoryItems = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const availableItems = await prisma.inventory.findMany({
      where: {
        vendorId,
        hasProductCreated: false,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        subcategory: true,
        description: true,
        currentStock: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: availableItems
    });

  } catch (error) {
    console.error('Error fetching available inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Approve product
const approveProduct = async (req, res) => {
  try {
    const { id } = req.params; // Changed from productId to id
    const { adminPrice } = req.body; // Get admin price from request body
    const adminId = req.user.id; // Admin ID from auth middleware

    // Find the product
    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            ownerName: true,
            businessEmail: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.approvalStatus === 'APPROVED') {
      return res.status(400).json({
        success: false,
        message: 'Product is already approved'
      });
    }

    // Prepare update data
    const updateData = {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: adminId,
      rejectionReason: null // Clear any previous rejection reason
    };

    // If admin price is provided, store it in adminFixedPrice field
    if (adminPrice !== undefined && adminPrice !== null) {
      if (adminPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Admin price must be greater than 0'
        });
      }
      updateData.adminFixedPrice = parseFloat(adminPrice);
    }

    // Update product approval status
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: updateData,
      include: {
        vendor: {
          select: {
            companyName: true,
            ownerName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Product approved successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve product'
    });
  }
};

// Admin: Reject product
const rejectProduct = async (req, res) => {
  try {
    const { id } = req.params; // Changed from productId to id
    const { rejectionReason } = req.body;
    const adminId = req.user.id; // Admin ID from auth middleware

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Find the product
    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            ownerName: true,
            businessEmail: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.approvalStatus === 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'Product is already rejected'
      });
    }

    // Update product approval status
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        approvedAt: null,
        approvedBy: null
      },
      include: {
        vendor: {
          select: {
            companyName: true,
            ownerName: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Product rejected successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Reject product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject product'
    });
  }
};

// Admin: Assign QC Checker to Product
const assignQCCheckerToProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { qcCheckerId } = req.body;

    if (!qcCheckerId) {
      return res.status(400).json({ error: 'QC Checker ID is required' });
    }

    const checker = await prisma.qCChecker.findUnique({ where: { id: qcCheckerId } });
    if (!checker) {
      return res.status(404).json({ error: 'QC Checker not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        assignedQcId: qcCheckerId,
      },
      include: {
        assignedQc: {
          select: { name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'QC Checker assigned to product successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Error assigning QC Checker to product:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// Admin: Get single product by ID (no vendor restriction)
const getProductForAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: { createdAt: 'asc' }
        },
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            ownerName: true,
            businessEmail: true,
            status: true
          }
        },
        inventory: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true,
            category: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Error fetching product for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Create new product
const createProductByAdmin = async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      // Vendor Information (REQUIRED for admin)
      vendorId,

      // Inventory Connection
      inventoryItemId,
      isFromInventory,

      // Basic Information
      name,
      description,
      category,
      subCategory,

      // Pricing Information
      basePrice,
      originalPrice,
      discount,
      gstPercentage,
      adminFixedPrice, // Admin can set their own price

      // Single Unit Pricing Configuration
      singleUnitSize,
      singleUnitColor,
      singleUnitColorHex,

      // Fabric & Specifications
      fabricType,
      material,
      fabricSpecifications,

      // Variants Management
      variants,
      hasVariants,

      // Base Product Info
      baseSku,

      // Images
      images,

      // Stock Management
      totalStock,
      lowStockThreshold,
      trackInventory,

      // Dispatch & Shipping
      dispatchTimeline,

      // Additional Info
      tags,
      dimensions,
      weight,
      inStock,
      status,
      approvalStatus // Admin can set approval status directly
    } = req.body;

    // Validate required fields
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required for admin product creation'
      });
    }

    if (!name || !description || !category || !baseSku) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, category, and base SKU are required'
      });
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (hasVariants && (!variants || variants.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one variant is required when variants are enabled'
      });
    }

    // Check if base SKU already exists
    const existingSku = await prisma.product.findFirst({
      where: { baseSku }
    });

    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'Base SKU already exists. Please use a unique SKU.'
      });
    }

    // If connecting to inventory, validate and update inventory item
    let inventoryItem = null;
    if (isFromInventory && inventoryItemId) {
      inventoryItem = await prisma.inventory.findFirst({
        where: {
          id: inventoryItemId,
          vendorId,
          hasProductCreated: false
        }
      });

      if (!inventoryItem) {
        return res.status(400).json({
          success: false,
          message: 'Inventory item not found or already has a product created'
        });
      }
    }

    // Validate variant SKUs if variants exist
    if (hasVariants && variants && variants.length > 0) {
      const variantSkus = variants.map(v => v.sku);
      const duplicateSkus = variantSkus.filter((sku, index) => variantSkus.indexOf(sku) !== index);

      if (duplicateSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate variant SKUs found: ${duplicateSkus.join(', ')}`
        });
      }

      // Check if any variant SKU already exists
      const existingVariantSkus = await prisma.productVariant.findMany({
        where: {
          sku: { in: variantSkus }
        }
      });

      if (existingVariantSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Variant SKUs already exist: ${existingVariantSkus.map(v => v.sku).join(', ')}`
        });
      }
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Determine the stock to use
      let productStock = 0;

      if (hasVariants && variants && variants.length > 0) {
        // If has variants, total stock is sum of variant stocks
        productStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      } else if (isFromInventory && inventoryItem) {
        // If from inventory (and no variants), use inventory stock
        productStock = inventoryItem.currentStock;
      } else {
        // Otherwise use provided total stock
        productStock = parseInt(totalStock) || 0;
      }

      // Create product
      const product = await tx.product.create({
        data: {
          vendorId,
          inventoryItemId: isFromInventory ? inventoryItemId : null,
          isFromInventory: isFromInventory || false,
          name,
          description,
          category,
          subCategory,
          basePrice: parseFloat(basePrice) || 0,
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          discount: discount ? parseFloat(discount) : null,
          gstPercentage: gstPercentage !== null && gstPercentage !== undefined && gstPercentage !== '' ? parseFloat(gstPercentage) : null,
          adminFixedPrice: adminFixedPrice ? parseFloat(adminFixedPrice) : null,

          // Single Unit Pricing Configuration
          singleUnitSize: singleUnitSize || null,
          singleUnitColor: singleUnitColor || null,
          singleUnitColorHex: singleUnitColorHex || null,
          fabricType,
          material,
          fabricSpecifications: fabricSpecifications || {},
          hasVariants: hasVariants || false,
          baseSku,
          totalStock: productStock,
          lowStockThreshold: parseInt(lowStockThreshold) || 10,
          trackInventory: trackInventory !== false,
          dispatchTimeline: dispatchTimeline ? {
            processingDays: parseInt(dispatchTimeline.processingDays) || 1,
            shippingDays: parseInt(dispatchTimeline.shippingDays) || 3,
            totalDays: parseInt(dispatchTimeline.totalDays) || 4
          } : {
            processingDays: 1,
            shippingDays: 3,
            totalDays: 4
          },
          tags: tags || [],
          dimensions,
          weight,
          inStock: inStock !== false,
          status: status ? status.toUpperCase() : 'ACTIVE',
          approvalStatus: approvalStatus ? approvalStatus.toUpperCase() : 'APPROVED', // Admin products auto-approved
          approvedAt: approvalStatus === 'APPROVED' || !approvalStatus ? new Date() : null,
          approvedBy: approvalStatus === 'APPROVED' || !approvalStatus ? adminId : null
        }
      });

      // Create variants if enabled
      if (hasVariants && variants && variants.length > 0) {
        const variantData = variants.map(variant => ({
          productId: product.id,
          size: variant.size,
          color: variant.color,
          colorHex: variant.colorHex,
          sku: variant.sku,
          price: parseFloat(variant.price),
          stock: parseInt(variant.stock) || 0,
          images: variant.images || []
        }));

        await tx.productVariant.createMany({
          data: variantData
        });
      }

      // Create images if provided
      if (images && images.length > 0) {
        const imageData = images.map((image, index) => ({
          productId: product.id,
          url: image.url,
          alt: image.alt || name,
          isPrimary: image.isPrimary || false,
          imageType: image.imageType || 'gallery',
          sortOrder: index
        }));

        await tx.productImage.createMany({
          data: imageData
        });
      }

      // Update inventory item if connected
      if (isFromInventory && inventoryItemId) {
        let inventoryUpdateData = {
          hasProductCreated: true,
          productId: product.id
        };

        // If has variants, sync calculated stock to inventory
        if (hasVariants && variants && variants.length > 0) {
          inventoryUpdateData.currentStock = productStock;
        }

        await tx.inventory.update({
          where: { id: inventoryItemId },
          data: inventoryUpdateData
        });
      }

      return product;
    });

    // Fetch the complete product with relations
    const completeProduct = await prisma.product.findUnique({
      where: { id: result.id },
      include: {
        variants: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            ownerName: true,
            businessEmail: true
          }
        },
        inventory: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully by admin',
      data: completeProduct
    });

  } catch (error) {
    console.error('Error creating product by admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Update product
const updateProductByAdmin = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: true,
        vendor: true
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if base SKU is being changed and if new SKU already exists
    if (updateData.baseSku && updateData.baseSku !== existingProduct.baseSku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          baseSku: updateData.baseSku,
          id: { not: id }
        }
      });

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'Base SKU already exists. Please use a unique SKU.'
        });
      }
    }

    // Validate variant SKUs if variants are being updated
    if (updateData.variants && updateData.variants.length > 0) {
      const variantSkus = updateData.variants.map(v => v.sku);
      const duplicateSkus = variantSkus.filter((sku, index) => variantSkus.indexOf(sku) !== index);

      if (duplicateSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate variant SKUs found: ${duplicateSkus.join(', ')}`
        });
      }

      // Check if any variant SKU already exists (excluding current product variants)
      const existingVariantSkus = await prisma.productVariant.findMany({
        where: {
          sku: { in: variantSkus },
          productId: { not: id }
        }
      });

      if (existingVariantSkus.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Variant SKUs already exist: ${existingVariantSkus.map(v => v.sku).join(', ')}`
        });
      }
    }

    // Start transaction for update
    const result = await prisma.$transaction(async (tx) => {
      // Calculate newTotalStock based on variants or direct totalStock
      let newTotalStock = undefined;
      if (updateData.hasVariants && updateData.variants && updateData.variants.length > 0) {
        newTotalStock = updateData.variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
      } else if (updateData.totalStock !== undefined) {
        newTotalStock = parseInt(updateData.totalStock);
      }

      // Prepare update data
      const productUpdateData = {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.category && { category: updateData.category }),
        ...(updateData.subCategory !== undefined && { subCategory: updateData.subCategory }),
        ...(updateData.basePrice !== undefined && { basePrice: parseFloat(updateData.basePrice) }),
        ...(updateData.originalPrice !== undefined && {
          originalPrice: updateData.originalPrice ? parseFloat(updateData.originalPrice) : null
        }),
        ...(updateData.discount !== undefined && {
          discount: updateData.discount ? parseFloat(updateData.discount) : null
        }),
        ...(updateData.gstPercentage !== undefined && {
          gstPercentage: updateData.gstPercentage !== null && updateData.gstPercentage !== '' ? parseFloat(updateData.gstPercentage) : null
        }),
        ...(updateData.adminFixedPrice !== undefined && {
          adminFixedPrice: updateData.adminFixedPrice ? parseFloat(updateData.adminFixedPrice) : null
        }),

        // Single Unit Pricing Configuration
        ...(updateData.singleUnitSize !== undefined && { singleUnitSize: updateData.singleUnitSize }),
        ...(updateData.singleUnitColor !== undefined && { singleUnitColor: updateData.singleUnitColor }),
        ...(updateData.singleUnitColorHex !== undefined && { singleUnitColorHex: updateData.singleUnitColorHex }),
        ...(updateData.fabricType !== undefined && { fabricType: updateData.fabricType }),
        ...(updateData.material !== undefined && { material: updateData.material }),
        ...(updateData.fabricSpecifications !== undefined && {
          fabricSpecifications: updateData.fabricSpecifications
        }),
        ...(updateData.hasVariants !== undefined && { hasVariants: updateData.hasVariants }),
        ...(updateData.baseSku && { baseSku: updateData.baseSku }),

        // Use calculated stock if available, otherwise just update if provided
        ...(newTotalStock !== undefined && { totalStock: newTotalStock }),


        ...(updateData.lowStockThreshold !== undefined && {
          lowStockThreshold: parseInt(updateData.lowStockThreshold)
        }),
        ...(updateData.trackInventory !== undefined && { trackInventory: updateData.trackInventory }),
        ...(updateData.dispatchTimeline !== undefined && {
          dispatchTimeline: updateData.dispatchTimeline ? {
            processingDays: parseInt(updateData.dispatchTimeline.processingDays) || 1,
            shippingDays: parseInt(updateData.dispatchTimeline.shippingDays) || 3,
            totalDays: parseInt(updateData.dispatchTimeline.totalDays) || 4
          } : updateData.dispatchTimeline
        }),
        ...(updateData.tags !== undefined && { tags: updateData.tags }),
        ...(updateData.dimensions !== undefined && { dimensions: updateData.dimensions }),
        ...(updateData.weight !== undefined && { weight: updateData.weight }),
        ...(updateData.inStock !== undefined && { inStock: updateData.inStock }),
        ...(updateData.status && { status: updateData.status.toUpperCase() }),
        ...(updateData.approvalStatus && {
          approvalStatus: updateData.approvalStatus.toUpperCase(),
          ...(updateData.approvalStatus.toUpperCase() === 'APPROVED' && {
            approvedAt: new Date(),
            approvedBy: adminId,
            rejectionReason: null
          })
        })
      };

      // Update product
      const updatedProduct = await tx.product.update({
        where: { id },
        data: productUpdateData
      });

      // Sync stock with linked inventory (outside transaction logic but here we do it inside if needed, or trigger it)
      // Note: we can't easily access the updated totalStock if we rely on DB return, but we have newTotalStock

      // If we calculated newTotalStock, usage that.
      const stockToSync = newTotalStock !== undefined ? newTotalStock : (updateData.totalStock !== undefined ? parseInt(updateData.totalStock) : undefined);

      if (stockToSync !== undefined && existingProduct.inventoryItemId) {
        await tx.inventory.update({
          where: { id: existingProduct.inventoryItemId },
          data: { currentStock: stockToSync }
        });
        console.log('✅ Synced stock with inventory:', existingProduct.inventoryItemId);
      }
      // Update variants if provided
      if (updateData.variants !== undefined) {
        // Delete existing variants
        await tx.productVariant.deleteMany({
          where: { productId: id }
        });

        // Create new variants
        if (updateData.variants.length > 0) {
          const variantData = updateData.variants.map(variant => ({
            productId: id,
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex,
            sku: variant.sku,
            price: parseFloat(variant.price),
            stock: parseInt(variant.stock) || 0,
            images: variant.images || []
          }));

          await tx.productVariant.createMany({
            data: variantData
          });
        }
      }

      // Update images if provided
      if (updateData.images !== undefined) {
        // Delete existing images
        await tx.productImage.deleteMany({
          where: { productId: id }
        });

        // Create new images
        if (updateData.images.length > 0) {
          const imageData = updateData.images.map((image, index) => ({
            productId: id,
            url: image.url,
            alt: image.alt || updatedProduct.name,
            isPrimary: image.isPrimary || false,
            imageType: image.imageType || 'gallery',
            sortOrder: index
          }));

          await tx.productImage.createMany({
            data: imageData
          });
        }
      }

      return updatedProduct;
    });

    // Fetch the complete updated product
    const completeProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            ownerName: true,
            businessEmail: true
          }
        },
        inventory: {
          select: {
            id: true,
            name: true,
            sku: true,
            currentStock: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Product updated successfully by admin',
      data: completeProduct
    });

  } catch (error) {
    console.error('Error updating product by admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Delete product
const deleteProductByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Start transaction for deletion
    await prisma.$transaction(async (tx) => {
      // Delete variants
      await tx.productVariant.deleteMany({
        where: { productId: id }
      });

      // Delete images
      await tx.productImage.deleteMany({
        where: { productId: id }
      });

      // Update inventory item if connected
      if (existingProduct.inventoryItemId) {
        await tx.inventory.update({
          where: { id: existingProduct.inventoryItemId },
          data: {
            hasProductCreated: false,
            productId: null
          }
        });
      }

      // Delete product
      await tx.product.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'Product deleted successfully by admin'
    });

  } catch (error) {
    console.error('Error deleting product by admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Get all products with approval status filter
const getAllProductsForAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      approvalStatus,
      status,
      search,
      vendorId,
      category
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};

    if (approvalStatus) {
      where.approvalStatus = approvalStatus.toUpperCase();
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { baseSku: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get products with pagination
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          vendor: {
            select: {
              id: true,
              companyName: true,
              ownerName: true,
              businessEmail: true,
              status: true
            }
          },
          images: {
            where: { isPrimary: true },
            take: 1
          },
          variants: {
            select: {
              id: true,
              size: true,
              color: true,
              price: true,
              stock: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all products for admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// Public endpoint: Get all approved products for website
// Public endpoint: Get all approved products for website
const getPublicProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      subCategory,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock,
      tag
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      status: 'ACTIVE',
      approvalStatus: 'APPROVED'
    };

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ];
    }

    if (category) {
      where.category = category;
    }

    if (subCategory) {
      where.subCategory = subCategory;
    }

    // Price filtering should use adminFixedPrice if available, otherwise basePrice
    if (minPrice || maxPrice) {
      where.OR = where.OR || [];
      const priceConditions = [];

      if (minPrice && maxPrice) {
        priceConditions.push({
          adminFixedPrice: { gte: parseFloat(minPrice), lte: parseFloat(maxPrice) }
        });
        priceConditions.push({
          AND: [
            { adminFixedPrice: null },
            { basePrice: { gte: parseFloat(minPrice), lte: parseFloat(maxPrice) } }
          ]
        });
      } else if (minPrice) {
        priceConditions.push({ adminFixedPrice: { gte: parseFloat(minPrice) } });
        priceConditions.push({
          AND: [
            { adminFixedPrice: null },
            { basePrice: { gte: parseFloat(minPrice) } }
          ]
        });
      } else if (maxPrice) {
        priceConditions.push({ adminFixedPrice: { lte: parseFloat(maxPrice) } });
        priceConditions.push({
          AND: [
            { adminFixedPrice: null },
            { basePrice: { lte: parseFloat(maxPrice) } }
          ]
        });
      }

      where.OR = [...(where.OR || []), ...priceConditions];
    }

    if (inStock === 'true') {
      where.inStock = true;
      where.totalStock = { gt: 0 };
    }

    // Get total count
    const totalItems = await prisma.product.count({ where });

    // Get products
    const products = await prisma.product.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        subCategory: true,
        basePrice: true,
        adminFixedPrice: true, // Include admin fixed price
        originalPrice: true,
        discount: true,
        singleUnitSize: true,
        singleUnitColor: true,
        singleUnitColorHex: true,
        rating: true,
        reviews: true,
        images: true,
        tags: true,
        inStock: true,
        totalStock: true,
        hasVariants: true,
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            colorHex: true,
            price: true,
            stock: true,
            images: true
          }
        },
        fabricType: true,
        material: true,
        dimensions: true,
        weight: true,
        createdAt: true
      }
    });

    const totalPages = Math.ceil(totalItems / parseInt(limit));

    res.json({
      success: true,
      data: {
        items: products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get public products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// Public endpoint: Get single product by ID for website
// Public endpoint: Get single product by ID for website
const getPublicProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        status: 'ACTIVE',
        approvalStatus: 'APPROVED'
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        subCategory: true,
        basePrice: true,
        adminFixedPrice: true, // Include admin fixed price
        originalPrice: true,
        discount: true,
        singleUnitSize: true,
        singleUnitColor: true,
        singleUnitColorHex: true,
        rating: true,
        reviews: true,
        images: {
          orderBy: { sortOrder: 'asc' }
        },
        tags: true,
        inStock: true,
        totalStock: true,
        hasVariants: true,
        variants: {
          select: {
            id: true,
            size: true,
            color: true,
            colorHex: true,
            sku: true,
            price: true,
            stock: true,
            images: true
          },
          orderBy: { createdAt: 'asc' }
        },
        fabricType: true,
        material: true,
        fabricSpecifications: true,
        dimensions: true,
        weight: true,
        dispatchTimeline: true,
        createdAt: true,
        updatedAt: true,
        inventory: {
          select: {
            currentStock: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get public product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

module.exports = {
  createProduct,
  getVendorProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getAvailableInventoryItems,
  // Admin functions
  getProductForAdmin,
  createProductByAdmin,
  updateProductByAdmin,
  deleteProductByAdmin,
  approveProduct,
  rejectProduct,
  getAllProductsForAdmin,
  // Public functions
  getPublicProducts,
  getPublicProduct
};

// Update variant stocks (Admin and Vendor)
const updateVariantStocks = async (req, res) => {
  try {
    const { id } = req.params;
    const { variants, reason, notes } = req.body;

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Variants array is required'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reason for stock change is required'
      });
    }

    // Get product with variants
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        inventory: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check authorization
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const vendorId = req.user.vendorId || req.user.id;

    if (!isAdmin && product.vendorId !== vendorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this product'
      });
    }

    if (!product.hasVariants) {
      return res.status(400).json({
        success: false,
        message: 'This product does not have variants'
      });
    }

    // Get user information for history
    let changedByName = '';
    if (isAdmin) {
      const admin = await prisma.admin.findUnique({
        where: { id: req.user.id },
        select: { name: true }
      });
      changedByName = admin?.name || 'Admin';
    } else {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { ownerName: true }
      });
      changedByName = vendor?.ownerName || 'Vendor';
    }

    // Update variants and create history in transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedVariants = [];
      const historyRecords = [];

      for (const variantUpdate of variants) {
        const { variantId, stock } = variantUpdate;

        if (!variantId || stock === undefined) {
          throw new Error('Each variant must have variantId and stock');
        }

        // Find existing variant
        const existingVariant = product.variants.find(v => v.id === variantId);
        if (!existingVariant) {
          throw new Error(`Variant ${variantId} not found`);
        }

        const previousStock = existingVariant.stock;
        const newStock = parseInt(stock);
        const changeAmount = newStock - previousStock;

        // Update variant stock
        const updatedVariant = await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: newStock }
        });

        updatedVariants.push(updatedVariant);

        // Create history record if stock changed
        if (changeAmount !== 0 && product.inventoryItemId) {
          historyRecords.push({
            inventoryId: product.inventoryItemId,
            previousStock,
            newStock,
            changeAmount,
            reason: `${reason.trim()} (Variant: ${existingVariant.size} - ${existingVariant.color})`,
            changedBy: req.user.id,
            changedByType: isAdmin ? 'admin' : 'vendor',
            changedByName
          });
        }
      }

      // Calculate new total stock
      let baseStock = 0;
      if (product.inventory) {
        baseStock = product.inventory.currentStock;
      }
      const totalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0) + baseStock;

      // Update product total stock
      const updatedProduct = await tx.product.update({
        where: { id },
        data: { totalStock }
      });

      // Update inventory stock if linked
      if (product.inventoryItemId) {
        await tx.inventory.update({
          where: { id: product.inventoryItemId },
          data: {
            // currentStock: totalStock, // STOP SYNCING TOTAL STOCK
            lastRestocked: new Date()
          }
        });
      }

      // Create history records
      if (historyRecords.length > 0) {
        await tx.stockChangeHistory.createMany({
          data: historyRecords
        });
      }

      return { updatedProduct, updatedVariants };
    });

    res.json({
      success: true,
      message: 'Variant stocks updated successfully',
      data: result
    });

  } catch (error) {
    console.error('Error updating variant stocks:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

module.exports = {
  createProduct,
  getVendorProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
  getAvailableInventoryItems,
  getProductForAdmin,
  createProductByAdmin,
  updateProductByAdmin,
  deleteProductByAdmin,
  approveProduct,
  rejectProduct,
  assignQCCheckerToProduct,
  getAllProductsForAdmin,
  getPublicProducts,
  getPublicProduct,
  updateVariantStocks
};
