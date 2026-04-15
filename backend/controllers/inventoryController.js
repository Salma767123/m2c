const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create new inventory item
const createInventoryItem = async (req, res) => {
  try {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const vendorId = isAdmin ? req.body.vendorId : (req.user.vendorId || req.user.id);

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const {
      name,
      sku,
      category,
      subcategory,
      description,
      manufacturingDate,
      lowStockAlert,
      location,
      status,
      sourceType,
      supplier,
      lastRestocked,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !sku || !category || lowStockAlert === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, SKU, category, and low stock alert are required'
      });
    }

    // Check if SKU already exists
    const existingSku = await prisma.inventory.findUnique({
      where: { sku }
    });

    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists. Please use a unique SKU.'
      });
    }

    // Validate source type specific fields
    if (sourceType === 'SUPPLIER' && !supplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required when source type is supplier'
      });
    }

    // Create inventory item
    const inventoryItem = await prisma.inventory.create({
      data: {
        vendorId,
        name,
        sku,
        category,
        subcategory,
        description,
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
        currentStock: 0,
        baseStock: 0, // Initialize base stock
        lowStockAlert: parseInt(lowStockAlert) || 5,
        location,
        status: status || 'ACTIVE',
        sourceType: sourceType || null,
        supplier,
        lastRestocked: lastRestocked ? new Date(lastRestocked) : null,
        notes
      }
    });

    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully',
      data: inventoryItem
    });

  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get all inventory items for a vendor
const getVendorInventory = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { page = 1, limit = 10, search, category, status, sourceType } = req.query;

    // Build filter conditions
    const where = {
      vendorId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(category && { category }),
      ...(status && { status }),
      ...(sourceType && { sourceType })
    };

    // Get total count for pagination
    const totalItems = await prisma.inventory.count({ where });

    // Get inventory items with pagination
    const inventoryItems = await prisma.inventory.findMany({
      where,
      include: {
        products: {
          select: { id: true, approvalStatus: true },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    // Enrich items with product approval status
    const enrichedItems = inventoryItems.map(item => {
      const { products, ...rest } = item;
      return {
        ...rest,
        productApprovalStatus: products?.[0]?.approvalStatus || null
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        items: enrichedItems,
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
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single inventory item
const getInventoryItem = async (req, res) => {
  try {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    const whereClause = isAdmin ? { id } : { id, vendorId };

    const inventoryItem = await prisma.inventory.findFirst({
      where: whereClause,
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true
          }
        },
        products: {
          include: {
            variants: true
          }
        }
      }
    });

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: inventoryItem
    });

  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update inventory item
const updateInventoryItem = async (req, res) => {
  try {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;
    const {
      name,
      sku,
      category,
      subcategory,
      description,
      manufacturingDate,
      lowStockAlert,
      location,
      status,
      sourceType,
      supplier,
      lastRestocked,
      notes,
      vendorId: bodyVendorId
    } = req.body;

    // Check if inventory item exists
    const whereClause = isAdmin ? { id } : { id, vendorId };
    const existingItem = await prisma.inventory.findFirst({
      where: whereClause
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if SKU is being changed and if new SKU already exists
    if (sku && sku !== existingItem.sku) {
      const existingSku = await prisma.inventory.findUnique({
        where: { sku }
      });

      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists. Please use a unique SKU.'
        });
      }
    }

    // Validate source type specific fields
    if (sourceType === 'SUPPLIER' && !supplier) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required when source type is supplier'
      });
    }

    // Build update data
    const updateData = {
      ...(name && { name }),
      ...(sku && { sku }),
      ...(category && { category }),
      ...(subcategory !== undefined && { subcategory }),
      ...(description !== undefined && { description }),
      ...(manufacturingDate !== undefined && {
        manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null
      }),
      ...(lowStockAlert !== undefined && { lowStockAlert: parseInt(lowStockAlert) }),
      ...(location !== undefined && { location }),
      ...(status && { status }),
      ...(sourceType !== undefined && { sourceType }),
      ...(supplier !== undefined && { supplier }),
      ...(lastRestocked !== undefined && {
        lastRestocked: lastRestocked ? new Date(lastRestocked) : null
      }),
      ...(notes !== undefined && { notes })
    };

    // Admin can change vendor
    if (isAdmin && bodyVendorId) {
      updateData.vendorId = bodyVendorId;
    }

    // Update inventory item
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Inventory item updated successfully',
      data: updatedItem
    });

  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete inventory item
const deleteInventoryItem = async (req, res) => {
  try {
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const vendorId = req.user.vendorId || req.user.id;
    const { id } = req.params;

    // Check if inventory item exists
    const whereClause = isAdmin ? { id } : { id, vendorId };
    const existingItem = await prisma.inventory.findFirst({
      where: whereClause
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if item has been used to create a product
    if (existingItem.hasProductCreated) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete inventory item that has been used to create a product'
      });
    }

    // Delete inventory item
    await prisma.inventory.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update stock levels
const updateStock = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const { id } = req.params;
    const { currentStock, reason, notes } = req.body;

    console.log('=== UPDATE STOCK REQUEST ===');
    console.log('User role:', req.user.role);
    console.log('Is Admin:', isAdmin);
    console.log('Inventory ID:', id);
    console.log('Current Stock:', currentStock);
    console.log('Reason:', reason);

    if (currentStock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Current stock is required'
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Reason for stock change is required'
      });
    }

    // Check if inventory item exists
    const whereClause = isAdmin ? { id } : { id, vendorId };
    console.log('Where clause:', whereClause);

    const existingItem = await prisma.inventory.findFirst({
      where: whereClause
    });

    console.log('Existing item found:', !!existingItem);
    if (existingItem) {
      console.log('Item details:', {
        id: existingItem.id,
        name: existingItem.name,
        vendorId: existingItem.vendorId,
        currentStock: existingItem.currentStock
      });
    }

    if (!existingItem) {
      console.log('❌ Inventory item not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Check if product exists and is approved before allowing stock update
    if (!existingItem.hasProductCreated || !existingItem.productId) {
      return res.status(403).json({
        success: false,
        message: 'Stock cannot be updated until a product is created and approved by admin.'
      });
    }

    const linkedProduct = await prisma.product.findUnique({
      where: { id: existingItem.productId },
      select: { approvalStatus: true }
    });

    if (!linkedProduct || linkedProduct.approvalStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: `Stock update is not allowed. Product approval status: ${linkedProduct?.approvalStatus || 'UNKNOWN'}. Only approved products allow stock updates.`
      });
    }

    const newStock = parseInt(currentStock);
    const previousStock = existingItem.currentStock;
    const changeAmount = newStock - previousStock;

    // Get user information
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

    console.log('Updating stock from', previousStock, 'to', newStock);

    // Update stock and create history record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if product has variants - REMOVED BLOCKER to allow base stock updates
      // if (existingItem.hasProductCreated && existingItem.productId) {
      //   const product = await tx.product.findUnique({
      //     where: { id: existingItem.productId },
      //     include: { variants: true }
      //   });
      //   if (product && product.hasVariants && product.variants.length > 0) {
      //      // ALLOW update now
      //   }
      // }

      // 1. First, find linked products to calculate the aggregate stock
      const linkedProducts = await tx.product.findMany({
        where: { inventoryItemId: id },
        include: { variants: true }
      });

      let totalAggregateStock = parseInt(currentStock);
      let baseStockUpdate = parseInt(currentStock);

      if (linkedProducts.length > 0) {
        let variantStockSum = 0;
        // Assume first linked product defines the variants for this inventory item
        // This matches the typical 1:1 relationship
        const mainProduct = linkedProducts[0];
        if (mainProduct.variants && mainProduct.variants.length > 0) {
          variantStockSum = mainProduct.variants.reduce((sum, v) => sum + v.stock, 0);
        }
        // Total stock = base stock + variant stocks
        totalAggregateStock = baseStockUpdate + variantStockSum;
      }

      // 2. Update inventory stock with both base and total stock
      const updatedItem = await tx.inventory.update({
        where: { id },
        data: {
          baseStock: baseStockUpdate, // Store the base stock separately
          currentStock: totalAggregateStock, // Store the total stock
          ...(notes && { notes }),
          lastRestocked: new Date()
        }
      });

      // 3. Sync with all linked products
      if (linkedProducts.length > 0) {
        for (const product of linkedProducts) {
          let variantSum = 0;
          if (product.variants && product.variants.length > 0) {
            variantSum = product.variants.reduce((sum, v) => sum + v.stock, 0);
          }

          await tx.product.update({
            where: { id: product.id },
            data: { totalStock: baseStockUpdate + variantSum }
          });
        }
      }

      // 4. Create stock history record
      const historyRecord = await tx.stockChangeHistory.create({
        data: {
          inventoryId: id,
          previousStock,
          newStock: totalAggregateStock,
          changeAmount: totalAggregateStock - previousStock,
          reason: reason.trim(),
          changedBy: req.user.id,
          changedByType: isAdmin ? 'admin' : 'vendor',
          changedByName
        }
      });

      return { updatedItem, historyRecord };
    });

    const { updatedItem, historyRecord } = result;
    console.log('✅ Stock updated successfully');

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        inventory: updatedItem,
        history: historyRecord
      }
    });

  } catch (error) {
    console.error('❌ Error updating stock:', error);

    // Return 400 for our custom validation error
    if (error.message && error.message.includes('Cannot update stock directly')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get stock change history for an inventory item
const getStockHistory = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const isAdmin = req.user.role?.toUpperCase() === 'ADMIN';
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if inventory item exists and user has access
    const whereClause = isAdmin ? { id } : { id, vendorId };
    const existingItem = await prisma.inventory.findFirst({
      where: whereClause
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Get total count
    const totalItems = await prisma.stockChangeHistory.count({
      where: { inventoryId: id }
    });

    // Get history records with pagination
    const history = await prisma.stockChangeHistory.findMany({
      where: { inventoryId: id },
      orderBy: { createdAt: 'desc' },
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
        history,
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
    console.error('Error fetching stock history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get inventory statistics
const getInventoryStats = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Get total items
    const totalItems = await prisma.inventory.count({
      where: { vendorId }
    });

    // Get active items
    const activeItems = await prisma.inventory.count({
      where: { vendorId, status: 'ACTIVE' }
    });

    // Get low stock items (where current stock <= min stock)
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        vendorId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        currentStock: true,
        lowStockAlert: true
      }
    });

    const lowStockCount = lowStockItems.filter(item => item.currentStock <= item.lowStockAlert).length;

    // Get out of stock items
    const outOfStockItems = await prisma.inventory.count({
      where: {
        vendorId,
        status: 'ACTIVE',
        currentStock: 0
      }
    });

    // Get total stock value (sum of all current stock)
    const totalStockValue = await prisma.inventory.aggregate({
      where: { vendorId, status: 'ACTIVE' },
      _sum: {
        currentStock: true
      }
    });

    res.json({
      success: true,
      data: {
        totalItems,
        activeItems,
        lowStockItems: lowStockCount,
        outOfStockItems,
        totalStockUnits: totalStockValue._sum.currentStock || 0
      }
    });

  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get vendor's selected categories
const getVendorCategories = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    // Get vendor with their selected categories
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        productCategories: true,
        productTypes: true
      }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // If productCategories contains IDs, fetch the actual category data
    let categories = [];
    let subcategories = [];

    if (vendor.productCategories && vendor.productCategories.length > 0) {
      // Find all valid object IDs inside the categories array
      const objectIds = vendor.productCategories.filter(cat => /^[0-9a-fA-F]{24}$/.test(cat));
      const stringNames = vendor.productCategories.filter(cat => !/^[0-9a-fA-F]{24}$/.test(cat));

      if (objectIds.length > 0) {
        // Fetch category details from database
        const categoryData = await prisma.category.findMany({
          where: {
            id: { in: objectIds },
            status: 'ACTIVE'
          },
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            subcategories: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true
              }
            }
          }
        });

        // Separate main categories and collect all subcategories
        const mainCategories = categoryData.filter(cat => !cat.parentId);
        const allSubcategories = categoryData.reduce((acc, cat) => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            acc.push(...cat.subcategories);
          }
          return acc;
        }, []);

        categories = mainCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug
        }));

        subcategories = allSubcategories;
      }

      // Look up string names in the database to resolve them to real categories with subcategories
      if (stringNames.length > 0) {
        const nameMatchedCategories = await prisma.category.findMany({
          where: {
            name: { in: stringNames, mode: 'insensitive' },
            parentId: null,
            status: 'ACTIVE'
          },
          select: {
            id: true,
            name: true,
            slug: true,
            subcategories: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true
              }
            }
          }
        });

        const resolvedNames = new Set(nameMatchedCategories.map(c => c.name.toLowerCase()));

        categories = [
          ...categories,
          ...nameMatchedCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug
          }))
        ];

        // Collect subcategories from name-matched categories
        const nameMatchedSubcategories = nameMatchedCategories.reduce((acc, cat) => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            acc.push(...cat.subcategories);
          }
          return acc;
        }, []);
        subcategories = [...subcategories, ...nameMatchedSubcategories];

        // Append any truly unresolvable names as fallback
        const unresolvedNames = stringNames.filter(name => !resolvedNames.has(name.toLowerCase()));
        if (unresolvedNames.length > 0) {
          categories = [
            ...categories,
            ...unresolvedNames.map(name => ({ id: name, name: name, slug: name }))
          ];
        }
      }
    }

    res.json({
      success: true,
      data: {
        categories,
        subcategories,
        productTypes: vendor.productTypes
      }
    });

  } catch (error) {
    console.error('Error fetching vendor categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createInventoryItem,
  getVendorInventory,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateStock,
  getInventoryStats,
  getVendorCategories
};


// Admin: Get all inventory items across all vendors
const getAllInventory = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status, vendorId } = req.query;

    // Build filter conditions
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(category && { category }),
      ...(status && { status }),
      ...(vendorId && { vendorId })
    };

    // Get total count for pagination
    const totalItems = await prisma.inventory.count({ where });

    // Get inventory items with pagination and vendor info
    const inventoryItems = await prisma.inventory.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true
          }
        },
        products: {
          select: { id: true, approvalStatus: true },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    // Enrich items with product approval status
    const enrichedItems = inventoryItems.map(item => {
      const { products, ...rest } = item;
      return {
        ...rest,
        productApprovalStatus: products?.[0]?.approvalStatus || null
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalItems / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: {
        items: enrichedItems,
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
    console.error('Error fetching all inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Get inventory statistics across all vendors
const getAllInventoryStats = async (req, res) => {
  try {
    // Get total items
    const totalItems = await prisma.inventory.count();

    // Get active items
    const activeItems = await prisma.inventory.count({
      where: { status: 'ACTIVE' }
    });

    // Get low stock items (where current stock <= min stock)
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        currentStock: true,
        lowStockAlert: true
      }
    });

    const lowStockCount = lowStockItems.filter(item => item.currentStock <= item.lowStockAlert).length;

    // Get out of stock items
    const outOfStockItems = await prisma.inventory.count({
      where: {
        status: 'ACTIVE',
        currentStock: 0
      }
    });

    // Get total stock value (sum of all current stock)
    const totalStockValue = await prisma.inventory.aggregate({
      where: { status: 'ACTIVE' },
      _sum: {
        currentStock: true
      }
    });

    res.json({
      success: true,
      data: {
        totalItems,
        activeItems,
        lowStockItems: lowStockCount,
        outOfStockItems,
        totalStockUnits: totalStockValue._sum.currentStock || 0
      }
    });

  } catch (error) {
    console.error('Error fetching all inventory stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
// Admin: Get inventory items by vendor ID (for product creation)
const getInventoryByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { includeUsed = 'false' } = req.query;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    // Build filter conditions
    const where = {
      vendorId,
      status: 'ACTIVE',
      ...(includeUsed === 'false' && { hasProductCreated: false })
    };

    // Get inventory items
    const inventoryItems = await prisma.inventory.findMany({
      where,
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        subcategory: true,
        description: true,
        currentStock: true,
        hasProductCreated: true,
        productId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: inventoryItems
    });

  } catch (error) {
    console.error('Error fetching inventory by vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin: Get vendor's selected categories by vendor ID
const getVendorCategoriesByVendorId = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    // Get vendor with their selected categories
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        productCategories: true,
        productTypes: true
      }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // If productCategories contains IDs, fetch the actual category data
    let categories = [];
    let subcategories = [];

    if (vendor.productCategories && vendor.productCategories.length > 0) {
      // Find all valid object IDs inside the categories array
      const objectIds = vendor.productCategories.filter(cat => /^[0-9a-fA-F]{24}$/.test(cat));
      const stringNames = vendor.productCategories.filter(cat => !/^[0-9a-fA-F]{24}$/.test(cat));

      if (objectIds.length > 0) {
        // Fetch category details from database
        const categoryData = await prisma.category.findMany({
          where: {
            id: { in: objectIds },
            status: 'ACTIVE'
          },
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            subcategories: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true
              }
            }
          }
        });

        // Separate main categories and collect all subcategories
        const mainCategories = categoryData.filter(cat => !cat.parentId);
        const allSubcategories = categoryData.reduce((acc, cat) => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            acc.push(...cat.subcategories);
          }
          return acc;
        }, []);

        categories = mainCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug
        }));

        subcategories = allSubcategories;
      }

      // Look up string names in the database to resolve them to real categories with subcategories
      if (stringNames.length > 0) {
        const nameMatchedCategories = await prisma.category.findMany({
          where: {
            name: { in: stringNames, mode: 'insensitive' },
            parentId: null,
            status: 'ACTIVE'
          },
          select: {
            id: true,
            name: true,
            slug: true,
            subcategories: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                slug: true,
                parentId: true
              }
            }
          }
        });

        const resolvedNames = new Set(nameMatchedCategories.map(c => c.name.toLowerCase()));

        categories = [
          ...categories,
          ...nameMatchedCategories.map(cat => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug
          }))
        ];

        // Collect subcategories from name-matched categories
        const nameMatchedSubcategories = nameMatchedCategories.reduce((acc, cat) => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            acc.push(...cat.subcategories);
          }
          return acc;
        }, []);
        subcategories = [...subcategories, ...nameMatchedSubcategories];

        // Append any truly unresolvable names as fallback
        const unresolvedNames = stringNames.filter(name => !resolvedNames.has(name.toLowerCase()));
        if (unresolvedNames.length > 0) {
          categories = [
            ...categories,
            ...unresolvedNames.map(name => ({ id: name, name: name, slug: name }))
          ];
        }
      }
    }

    res.json({
      success: true,
      data: {
        categories,
        subcategories,
        productTypes: vendor.productTypes
      }
    });

  } catch (error) {
    console.error('Error fetching vendor categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  createInventoryItem,
  getVendorInventory,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateStock,
  getStockHistory,
  getInventoryStats,
  getVendorCategories,
  getAllInventory,
  getAllInventoryStats,
  getInventoryByVendor,
  getVendorCategoriesByVendorId
};
