const { prisma } = require('../config/database');
const { resolveBase64InValue } = require('../config/cloudinary');

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        title: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        address: true,
        addressLine2: true,
        addressLine3: true,
        landmark: true,
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
      title,
      firstName,
      middleName,
      lastName,
      phoneNumber,
      address,
      addressLine2,
      addressLine3,
      landmark,
      city,
      state,
      zipCode,
      country,
      image
    } = req.body;

    // Compose the display `name` from the structured parts when they are sent,
    // so the header / sidebar / everywhere that reads `name` stays in sync.
    const composedName = [title, firstName, middleName, lastName]
      .map((p) => (p || '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    const finalName = composedName || name;

    // Validation
    if (!finalName) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    // Upload a freshly-cropped profile photo (base64 data URI) to Cloudinary;
    // an existing URL passes through untouched. `undefined` leaves it unchanged.
    let resolvedImage;
    if (image !== undefined) {
      resolvedImage = image ? await resolveBase64InValue(image, { folder: 'admin-profiles' }) : null;
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        name: finalName,
        title,
        firstName,
        middleName,
        lastName,
        phoneNumber,
        address,
        addressLine2,
        addressLine3,
        landmark,
        city,
        state,
        zipCode,
        country,
        ...(image !== undefined && { image: resolvedImage })
      },
      select: {
        id: true,
        name: true,
        title: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        address: true,
        addressLine2: true,
        addressLine3: true,
        landmark: true,
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
