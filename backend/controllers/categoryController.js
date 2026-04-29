const { prisma } = require('../config/database');
const { uploadDataUriIfBase64 } = require('../config/cloudinary');

const resolveCategoryImage = (img) => uploadDataUriIfBase64(img, { folder: 'categories' });
const resolveSubcategoryImages = async (subs) => {
  if (!Array.isArray(subs)) return subs;
  return Promise.all(
    subs.map(async (s) => ({ ...s, image: await resolveCategoryImage(s?.image) })),
  );
};

// Helper function to generate slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Helper function to build category tree
const buildCategoryTree = (categories) => {
  const categoryMap = new Map();
  const rootCategories = [];

  // First pass: create map of all categories
  categories.forEach(category => {
    categoryMap.set(category.id, {
      ...category,
      subcategories: []
    });
  });

  // Second pass: build hierarchy
  categories.forEach(category => {
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.subcategories.push(categoryMap.get(category.id));
      }
    } else {
      rootCategories.push(categoryMap.get(category.id));
    }
  });

  return rootCategories;
};

// Get all categories with hierarchy
const getAllCategories = async (req, res) => {
  try {
    const {
      search,
      status,
      parentId,
      includeSubcategories = 'true',
      showRootOnly = 'true', // New parameter to control root-only display
      sortBy = 'sortOrder',
      sortOrder = 'asc'
    } = req.query;

    // Build where clause
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    // Handle parent filtering logic
    if (parentId) {
      // If specific parentId is requested, show only those subcategories
      where.parentId = parentId;
    } else if (showRootOnly === 'true') {
      // Default behavior: show only root categories (no parent)
      where.parentId = null;
    }
    // If showRootOnly is 'false', show all categories (including subcategories as separate items)

    // Build orderBy
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const categories = await prisma.category.findMany({
      where,
      orderBy,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategories: includeSubcategories === 'true' ? {
          orderBy: { sortOrder: 'asc' },
          include: {
            subcategories: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        } : false,
        _count: {
          select: {
            subcategories: true
          }
        }
      }
    });

    // Add real product count
    const categoriesWithStats = await Promise.all(categories.map(async (category) => {
      const productCount = await prisma.product.count({
        where: category.parentId ? { subCategory: category.name } : { category: category.name }
      });
      return {
        ...category,
        productCount,
        subcategoryCount: category._count.subcategories
      };
    }));

    // If building tree structure from flat list
    if (includeSubcategories === 'true' && !parentId && showRootOnly !== 'true') {
      const categoryTree = buildCategoryTree(categoriesWithStats);
      return res.json({
        success: true,
        data: categoryTree,
        total: categories.length
      });
    }

    res.json({
      success: true,
      data: categoriesWithStats,
      total: categories.length
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            subcategories: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        },
        _count: {
          select: {
            subcategories: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Add real product count
    const productCount = await prisma.product.count({
      where: category.parentId ? { subCategory: category.name } : { category: category.name }
    });

    const categoryWithStats = {
      ...category,
      productCount,
      subcategoryCount: category._count.subcategories
    };

    res.json({
      success: true,
      data: categoryWithStats
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category'
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    let {
      name,
      description,
      slug: customSlug,
      parentId,
      status = 'ACTIVE',
      image,
      metaTitle,
      metaDescription,
      sortOrder = 0,
      subcategories = []
    } = req.body;

    image = await resolveCategoryImage(image);
    subcategories = await resolveSubcategoryImages(subcategories);

    // Validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      });
    }

    // Generate slug if not provided
    const slug = customSlug || generateSlug(name);

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'A category with this slug already exists'
      });
    }

    // Validate parent category if provided
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId }
      });

      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          error: 'Parent category not found'
        });
      }
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        description,
        slug,
        parentId: parentId || null,
        status: status.toUpperCase(),
        image,
        metaTitle,
        metaDescription,
        sortOrder: parseInt(sortOrder),
        createdBy: req.user?.id
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    // Create subcategories if provided
    if (subcategories && subcategories.length > 0) {
      const subcategoryData = subcategories.map((sub, index) => ({
        name: sub.name,
        description: sub.description,
        slug: sub.slug || generateSlug(sub.name),
        parentId: category.id,
        status: (sub.status || 'ACTIVE').toUpperCase(),
        image: sub.image || null,
        sortOrder: sub.sortOrder !== undefined ? sub.sortOrder : index + 1,
        createdBy: req.user?.id
      }));

      await prisma.category.createMany({
        data: subcategoryData
      });
    }

    // Fetch complete category with subcategories
    const completeCategory = await prisma.category.findUnique({
      where: { id: category.id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategories: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: completeCategory
    });
  } catch (error) {
    console.error('Create category error:', error);

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'A category with this slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create category'
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      name,
      description,
      slug: customSlug,
      parentId,
      status,
      image,
      metaTitle,
      metaDescription,
      sortOrder,
      subcategories = []
    } = req.body;

    image = await resolveCategoryImage(image);
    subcategories = await resolveSubcategoryImages(subcategories);

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Generate slug if name changed
    const slug = customSlug || (name ? generateSlug(name) : existingCategory.slug);

    // Check if new slug conflicts with other categories
    if (slug !== existingCategory.slug) {
      const slugConflict = await prisma.category.findUnique({
        where: { slug }
      });

      if (slugConflict) {
        return res.status(400).json({
          success: false,
          error: 'A category with this slug already exists'
        });
      }
    }

    // Validate parent category if provided
    if (parentId && parentId !== existingCategory.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId }
      });

      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          error: 'Parent category not found'
        });
      }

      // Prevent circular reference
      if (parentId === id) {
        return res.status(400).json({
          success: false,
          error: 'Category cannot be its own parent'
        });
      }
    }

    // Update category
    const updateData = {
      updatedBy: req.user?.id
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (slug !== existingCategory.slug) updateData.slug = slug;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (status !== undefined) updateData.status = status.toUpperCase();
    if (image !== undefined) updateData.image = image;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    // Handle subcategories update
    if (subcategories.length >= 0) { // Allow empty array to clear subcategories
      // Get existing subcategory IDs
      const existingSubIds = existingCategory.subcategories.map(sub => sub.id);
      const providedSubIds = subcategories.filter(sub => sub.id).map(sub => sub.id);

      // Delete removed subcategories
      const toDelete = existingSubIds.filter(subId => !providedSubIds.includes(subId));
      if (toDelete.length > 0) {
        await prisma.category.deleteMany({
          where: {
            id: { in: toDelete }
          }
        });
      }

      // Update or create subcategories
      for (const [index, sub] of subcategories.entries()) {
        const subData = {
          name: sub.name,
          description: sub.description,
          slug: sub.slug || generateSlug(sub.name),
          parentId: id,
          status: (sub.status || 'ACTIVE').toUpperCase(),
          image: sub.image || null,
          sortOrder: sub.sortOrder !== undefined ? sub.sortOrder : index + 1,
          updatedBy: req.user?.id
        };

        if (sub.id && existingSubIds.includes(sub.id)) {
          // Update existing subcategory
          await prisma.category.update({
            where: { id: sub.id },
            data: subData
          });
        } else {
          // Create new subcategory
          await prisma.category.create({
            data: {
              ...subData,
              createdBy: req.user?.id
            }
          });
        }
      }
    }

    // Fetch complete updated category
    const completeCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategories: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: completeCategory
    });
  } catch (error) {
    console.error('Update category error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'A category with this slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: true
      }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has subcategories
    if (category.subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with subcategories. Please delete subcategories first.'
      });
    }

    // TODO: Check if category has products when Product model exists
    // const productCount = await prisma.product.count({
    //   where: { categoryId: id }
    // });
    // if (productCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Cannot delete category with associated products'
    //   });
    // }

    // Delete category
    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
};

// Get category statistics
const getCategoryStats = async (req, res) => {
  try {
    // Get root categories stats
    const totalRootCategories = await prisma.category.count({
      where: { parentId: null }
    });
    const activeRootCategories = await prisma.category.count({
      where: {
        parentId: null,
        status: 'ACTIVE'
      }
    });
    const inactiveRootCategories = await prisma.category.count({
      where: {
        parentId: null,
        status: 'INACTIVE'
      }
    });

    // Get subcategories stats
    const totalSubcategories = await prisma.category.count({
      where: { parentId: { not: null } }
    });
    const activeSubcategories = await prisma.category.count({
      where: {
        parentId: { not: null },
        status: 'ACTIVE'
      }
    });
    const inactiveSubcategories = await prisma.category.count({
      where: {
        parentId: { not: null },
        status: 'INACTIVE'
      }
    });

    // Overall totals
    const totalCategories = totalRootCategories + totalSubcategories;
    const activeCategories = activeRootCategories + activeSubcategories;
    const inactiveCategories = inactiveRootCategories + inactiveSubcategories;

    res.json({
      success: true,
      data: {
        // Main stats for display
        total: totalRootCategories, // Show root categories as "total" for main display
        active: activeRootCategories, // Show active root categories
        inactive: inactiveRootCategories, // Show inactive root categories
        subcategories: totalSubcategories, // Total subcategories

        // Detailed breakdown
        rootCategories: totalRootCategories,
        activeRootCategories,
        inactiveRootCategories,
        activeSubcategories,
        inactiveSubcategories,

        // Overall totals (including subcategories)
        totalAllCategories: totalCategories,
        activeAllCategories: activeCategories,
        inactiveAllCategories: inactiveCategories
      }
    });
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category statistics'
    });
  }
};

// Bulk update category status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { categoryIds, status } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category IDs array is required'
      });
    }

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (ACTIVE or INACTIVE)'
      });
    }

    const result = await prisma.category.updateMany({
      where: {
        id: { in: categoryIds }
      },
      data: {
        status: status.toUpperCase(),
        updatedBy: req.user?.id
      }
    });

    res.json({
      success: true,
      message: `${result.count} categories updated successfully`,
      data: { updatedCount: result.count }
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update categories'
    });
  }
};

// Get subcategories of a specific category
const getSubcategories = async (req, res) => {
  try {
    const { parentId } = req.params;

    // Verify parent category exists
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: 'Parent category not found'
      });
    }

    const subcategories = await prisma.category.findMany({
      where: { parentId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            subcategories: true
          }
        }
      }
    });

    // Add real product count
    const subcategoriesWithStats = await Promise.all(subcategories.map(async (sub) => {
      const productCount = await prisma.product.count({
        where: { subCategory: sub.name }
      });
      return {
        ...sub,
        productCount,
        subcategoryCount: sub._count.subcategories
      };
    }));

    res.json({
      success: true,
      data: subcategoriesWithStats,
      total: subcategories.length
    });
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subcategories'
    });
  }
};

// Create subcategory
const createSubcategory = async (req, res) => {
  try {
    const { parentId } = req.params;
    let {
      name,
      description,
      slug: customSlug,
      status = 'ACTIVE',
      image,
      sortOrder = 0
    } = req.body;

    image = await resolveCategoryImage(image);

    // Validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        error: 'Name and description are required'
      });
    }

    // Verify parent category exists
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: 'Parent category not found'
      });
    }

    // Generate slug if not provided
    const slug = customSlug || generateSlug(name);

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'A category with this slug already exists'
      });
    }

    // Create subcategory
    const subcategory = await prisma.category.create({
      data: {
        name,
        description,
        slug,
        parentId,
        status: status.toUpperCase(),
        image,
        sortOrder: parseInt(sortOrder),
        createdBy: req.user?.id
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Subcategory created successfully',
      data: subcategory
    });
  } catch (error) {
    console.error('Create subcategory error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'A category with this slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create subcategory'
    });
  }
};

// Update subcategory
const updateSubcategory = async (req, res) => {
  try {
    const { parentId, subcategoryId } = req.params;
    let {
      name,
      description,
      slug: customSlug,
      status,
      image,
      sortOrder
    } = req.body;

    image = await resolveCategoryImage(image);

    // Verify parent category exists
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: 'Parent category not found'
      });
    }

    // Check if subcategory exists and belongs to parent
    const existingSubcategory = await prisma.category.findFirst({
      where: {
        id: subcategoryId,
        parentId: parentId
      }
    });

    if (!existingSubcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found or does not belong to this parent category'
      });
    }

    // Generate slug if name changed
    const slug = customSlug || (name ? generateSlug(name) : existingSubcategory.slug);

    // Check if new slug conflicts with other categories
    if (slug !== existingSubcategory.slug) {
      const slugConflict = await prisma.category.findUnique({
        where: { slug }
      });

      if (slugConflict) {
        return res.status(400).json({
          success: false,
          error: 'A category with this slug already exists'
        });
      }
    }

    // Update subcategory
    const updateData = {
      updatedBy: req.user?.id
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (slug !== existingSubcategory.slug) updateData.slug = slug;
    if (status !== undefined) updateData.status = status.toUpperCase();
    if (image !== undefined) updateData.image = image;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    const updatedSubcategory = await prisma.category.update({
      where: { id: subcategoryId },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Subcategory updated successfully',
      data: updatedSubcategory
    });
  } catch (error) {
    console.error('Update subcategory error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'A category with this slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update subcategory'
    });
  }
};

// Delete subcategory
const deleteSubcategory = async (req, res) => {
  try {
    const { parentId, subcategoryId } = req.params;

    // Verify parent category exists
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: 'Parent category not found'
      });
    }

    // Check if subcategory exists and belongs to parent
    const subcategory = await prisma.category.findFirst({
      where: {
        id: subcategoryId,
        parentId: parentId
      },
      include: {
        subcategories: true
      }
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found or does not belong to this parent category'
      });
    }

    // Check if subcategory has nested subcategories
    if (subcategory.subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete subcategory with nested subcategories. Please delete nested subcategories first.'
      });
    }

    // TODO: Check if subcategory has products when Product model exists
    // const productCount = await prisma.product.count({
    //   where: { categoryId: subcategoryId }
    // });
    // if (productCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Cannot delete subcategory with associated products'
    //   });
    // }

    // Delete subcategory
    await prisma.category.delete({
      where: { id: subcategoryId }
    });

    res.json({
      success: true,
      message: 'Subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subcategory'
    });
  }
};

// Get single subcategory
const getSubcategoryById = async (req, res) => {
  try {
    const { parentId, subcategoryId } = req.params;

    // Verify parent category exists
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: 'Parent category not found'
      });
    }

    const subcategory = await prisma.category.findFirst({
      where: {
        id: subcategoryId,
        parentId: parentId
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategories: {
          orderBy: { sortOrder: 'asc' }
        },
        _count: {
          select: {
            subcategories: true
          }
        }
      }
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found or does not belong to this parent category'
      });
    }

    // Add real product count
    const productCount = await prisma.product.count({
      where: { subCategory: subcategory.name }
    });

    const subcategoryWithStats = {
      ...subcategory,
      productCount,
      subcategoryCount: subcategory._count.subcategories
    };

    res.json({
      success: true,
      data: subcategoryWithStats
    });
  } catch (error) {
    console.error('Get subcategory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subcategory'
    });
  }
};

// Bulk operations for subcategories
const bulkUpdateSubcategoryStatus = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { subcategoryIds, status } = req.body;

    if (!subcategoryIds || !Array.isArray(subcategoryIds) || subcategoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Subcategory IDs array is required'
      });
    }

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (ACTIVE or INACTIVE)'
      });
    }

    // Verify parent category exists
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: 'Parent category not found'
      });
    }

    // Update only subcategories that belong to the parent
    const result = await prisma.category.updateMany({
      where: {
        id: { in: subcategoryIds },
        parentId: parentId
      },
      data: {
        status: status.toUpperCase(),
        updatedBy: req.user?.id
      }
    });

    res.json({
      success: true,
      message: `${result.count} subcategories updated successfully`,
      data: { updatedCount: result.count }
    });
  } catch (error) {
    console.error('Bulk update subcategories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subcategories'
    });
  }
};

// Reorder subcategories
const reorderSubcategories = async (req, res) => {
  try {
    const { parentId } = req.params;
    const { subcategoryOrders } = req.body; // Array of { id, sortOrder }

    if (!subcategoryOrders || !Array.isArray(subcategoryOrders)) {
      return res.status(400).json({
        success: false,
        error: 'Subcategory orders array is required'
      });
    }

    // Verify parent category exists
    const parentCategory = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        error: 'Parent category not found'
      });
    }

    // Update sort orders in a transaction
    await prisma.$transaction(async (tx) => {
      for (const { id, sortOrder } of subcategoryOrders) {
        await tx.category.update({
          where: {
            id,
            parentId: parentId // Ensure subcategory belongs to parent
          },
          data: {
            sortOrder: parseInt(sortOrder),
            updatedBy: req.user?.id
          }
        });
      }
    });

    res.json({
      success: true,
      message: 'Subcategories reordered successfully'
    });
  } catch (error) {
    console.error('Reorder subcategories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder subcategories'
    });
  }
};

// Move subcategory to different parent
const moveSubcategory = async (req, res) => {
  try {
    const { parentId, subcategoryId } = req.params;
    const { newParentId } = req.body;

    if (!newParentId) {
      return res.status(400).json({
        success: false,
        error: 'New parent ID is required'
      });
    }

    // Verify current parent exists
    const currentParent = await prisma.category.findUnique({
      where: { id: parentId }
    });

    if (!currentParent) {
      return res.status(404).json({
        success: false,
        error: 'Current parent category not found'
      });
    }

    // Verify new parent exists
    const newParent = await prisma.category.findUnique({
      where: { id: newParentId }
    });

    if (!newParent) {
      return res.status(404).json({
        success: false,
        error: 'New parent category not found'
      });
    }

    // Check if subcategory exists and belongs to current parent
    const subcategory = await prisma.category.findFirst({
      where: {
        id: subcategoryId,
        parentId: parentId
      }
    });

    if (!subcategory) {
      return res.status(404).json({
        success: false,
        error: 'Subcategory not found or does not belong to current parent category'
      });
    }

    // Prevent moving to itself or creating circular reference
    if (newParentId === subcategoryId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot move subcategory to itself'
      });
    }

    // Move subcategory to new parent
    const movedSubcategory = await prisma.category.update({
      where: { id: subcategoryId },
      data: {
        parentId: newParentId,
        updatedBy: req.user?.id
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Subcategory moved successfully',
      data: movedSubcategory
    });
  } catch (error) {
    console.error('Move subcategory error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to move subcategory'
    });
  }
};

// Helper function to validate category hierarchy depth
const validateHierarchyDepth = async (parentId, maxDepth = 3) => {
  let depth = 0;
  let currentParentId = parentId;

  while (currentParentId && depth < maxDepth) {
    const parent = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentId: true }
    });

    if (!parent) break;

    currentParentId = parent.parentId;
    depth++;
  }

  return depth < maxDepth;
};

// Helper function to get category path (breadcrumb)
const getCategoryPath = async (categoryId) => {
  const path = [];
  let currentId = categoryId;

  while (currentId) {
    const category = await prisma.category.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true
      }
    });

    if (!category) break;

    path.unshift(category);
    currentId = category.parentId;
  }

  return path;
};

// Get category breadcrumb path
const getCategoryBreadcrumb = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const breadcrumb = await getCategoryPath(id);

    res.json({
      success: true,
      data: breadcrumb
    });
  } catch (error) {
    console.error('Get category breadcrumb error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category breadcrumb'
    });
  }
};

// Search categories and subcategories
const searchCategories = async (req, res) => {
  try {
    const {
      q: searchQuery,
      status,
      includeSubcategories = 'true',
      limit = 20
    } = req.query;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const where = {
      OR: [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
        { slug: { contains: searchQuery, mode: 'insensitive' } }
      ]
    };

    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const categories = await prisma.category.findMany({
      where,
      take: parseInt(limit),
      orderBy: [
        { name: 'asc' },
        { sortOrder: 'asc' }
      ],
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategories: includeSubcategories === 'true' ? {
          orderBy: { sortOrder: 'asc' },
          take: 5 // Limit subcategories in search results
        } : false,
        _count: {
          select: {
            subcategories: true
          }
        }
      }
    });

    // Add real product count and category path
    const categoriesWithExtras = await Promise.all(
      categories.map(async (category) => {
        const breadcrumb = await getCategoryPath(category.id);
        const productCount = await prisma.product.count({
          where: category.parentId ? { subCategory: category.name } : { category: category.name }
        });
        return {
          ...category,
          productCount,
          subcategoryCount: category._count.subcategories,
          breadcrumb
        };
      })
    );

    res.json({
      success: true,
      data: categoriesWithExtras,
      total: categories.length,
      query: searchQuery
    });
  } catch (error) {
    console.error('Search categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search categories'
    });
  }
};

// Get category tree with full hierarchy
const getCategoryTree = async (req, res) => {
  try {
    const {
      status = 'ACTIVE',
      includeInactive = 'false',
      maxDepth = 3
    } = req.query;

    const where = {};

    if (includeInactive === 'false') {
      where.status = status.toUpperCase();
    }

    // Get all categories
    const allCategories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            subcategories: true
          }
        }
      }
    });

    // Build tree structure with depth limit (async since we fetch counts)
    const buildTree = async (categories, parentId = null, currentDepth = 0) => {
      if (currentDepth >= parseInt(maxDepth)) {
        return [];
      }

      const filtered = categories.filter(cat => cat.parentId === parentId);
      return Promise.all(filtered.map(async (category) => {
        const productCount = await prisma.product.count({
          where: category.parentId ? { subCategory: category.name } : { category: category.name }
        });
        const subcategories = await buildTree(categories, category.id, currentDepth + 1);
        
        return {
          ...category,
          productCount,
          subcategoryCount: category._count.subcategories,
          depth: currentDepth,
          subcategories
        };
      }));
    };

    const categoryTree = await buildTree(allCategories);

    res.json({
      success: true,
      data: categoryTree,
      total: allCategories.length,
      maxDepth: parseInt(maxDepth)
    });
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category tree'
    });
  }
};

// Duplicate category with all subcategories
const duplicateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName, includeSubcategories = true } = req.body;

    // Get original category
    const originalCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        subcategories: includeSubcategories ? {
          orderBy: { sortOrder: 'asc' },
          include: {
            subcategories: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        } : false
      }
    });

    if (!originalCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const duplicateName = newName || `${originalCategory.name} (Copy)`;
    const duplicateSlug = generateSlug(duplicateName);

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug: duplicateSlug }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'A category with this slug already exists'
      });
    }

    // Create duplicate category
    const duplicateCategory = await prisma.category.create({
      data: {
        name: duplicateName,
        description: originalCategory.description,
        slug: duplicateSlug,
        parentId: originalCategory.parentId,
        status: 'INACTIVE', // Start as inactive
        image: originalCategory.image,
        metaTitle: originalCategory.metaTitle,
        metaDescription: originalCategory.metaDescription,
        sortOrder: originalCategory.sortOrder + 1,
        createdBy: req.user?.id
      }
    });

    // Duplicate subcategories if requested
    if (includeSubcategories && originalCategory.subcategories) {
      const duplicateSubcategories = async (subcategories, newParentId) => {
        for (const sub of subcategories) {
          const duplicatedSub = await prisma.category.create({
            data: {
              name: sub.name,
              description: sub.description,
              slug: generateSlug(`${sub.name}-copy-${Date.now()}`), // Ensure unique slug
              parentId: newParentId,
              status: 'INACTIVE',
              image: sub.image,
              sortOrder: sub.sortOrder,
              createdBy: req.user?.id
            }
          });

          // Recursively duplicate nested subcategories
          if (sub.subcategories && sub.subcategories.length > 0) {
            await duplicateSubcategories(sub.subcategories, duplicatedSub.id);
          }
        }
      };

      await duplicateSubcategories(originalCategory.subcategories, duplicateCategory.id);
    }

    // Fetch complete duplicated category
    const completeDuplicate = await prisma.category.findUnique({
      where: { id: duplicateCategory.id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        subcategories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            subcategories: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Category duplicated successfully',
      data: completeDuplicate
    });
  } catch (error) {
    console.error('Duplicate category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate category'
    });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  bulkUpdateStatus,
  getSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getSubcategoryById,
  bulkUpdateSubcategoryStatus,
  reorderSubcategories,
  moveSubcategory,
  getCategoryBreadcrumb,
  searchCategories,
  getCategoryTree,
  duplicateCategory
};