const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin profile'
    });
  }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      name,
      phoneNumber,
      address,
      city,
      state,
      zipCode,
      country
    } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }
    
    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        name,
        phoneNumber,
        address,
        city,
        state,
        zipCode,
        country
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        image: true,
        updatedAt: true
      }
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedAdmin
    });
  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update admin profile'
    });
  }
};

module.exports = {
  getAdminProfile,
  updateAdminProfile
};
