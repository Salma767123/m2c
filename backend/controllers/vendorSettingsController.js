const bcrypt = require('bcryptjs');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { prisma } = require('../config/database');

// ============================================
// VENDOR PROFILE SETTINGS
// ============================================

// Update vendor basic information
const updateVendorBasicInfo = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      companyName,
      companyDescription,
      businessPhone,
      businessEmail,
      website,
      businessAddress,
      businessCity,
      businessState,
      businessZipCode,
      businessCountry
    } = req.body;

    // Validate required fields
    if (!companyName || !businessPhone || !businessEmail) {
      return res.status(400).json({ 
        error: 'Company name, phone, and email are required' 
      });
    }

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Update vendor information
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        companyName,
        companyDescription,
        businessPhone,
        businessEmail,
        website,
        businessAddress,
        businessCity,
        businessState,
        businessZipCode,
        businessCountry,
        updatedAt: new Date()
      },
      include: {
        certifications: true,
        documents: true,
        bankDetails: true,
        references: true
      }
    });

    res.json({
      message: 'Vendor information updated successfully',
      vendor: {
        ...updatedVendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Update vendor basic info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update vendor owner information
const updateVendorOwnerInfo = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerAddress,
      ownerCity,
      ownerState,
      ownerZipCode,
      ownerCountry
    } = req.body;

    // Validate required fields
    if (!ownerName || !ownerEmail || !ownerPhone) {
      return res.status(400).json({ 
        error: 'Owner name, email, and phone are required' 
      });
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ownerName,
        ownerEmail,
        ownerPhone,
        ownerAddress,
        ownerCity,
        ownerState,
        ownerZipCode,
        ownerCountry,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Owner information updated successfully',
      vendor: {
        ...updatedVendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Update vendor owner info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload vendor logo
const uploadVendorLogo = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    // Get current vendor to delete old logo if exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Upload new logo to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'vendor-logos',
      resource_type: 'image',
      transformation: [
        { width: 300, height: 300, crop: 'limit' },
        { quality: 'auto' }
      ]
    });

    // Delete old logo if exists
    if (vendor.companyLogo) {
      try {
        // Extract public_id from Cloudinary URL
        const publicId = vendor.companyLogo.split('/').pop().split('.')[0];
        await deleteFromCloudinary(`vendor-logos/${publicId}`);
      } catch (deleteError) {
        console.warn('Failed to delete old logo:', deleteError);
      }
    }

    // Update vendor with new logo URL
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        companyLogo: result.secure_url,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Logo uploaded successfully',
      logoUrl: result.secure_url,
      vendor: {
        ...updatedVendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Upload vendor logo error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// BANK DETAILS MANAGEMENT
// ============================================

// Get vendor bank details
const getVendorBankDetails = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const bankDetails = await prisma.vendorBankDetails.findUnique({
      where: { vendorId }
    });

    if (!bankDetails) {
      // Return null instead of 404 - no bank details yet is a valid state
      return res.json({ bankDetails: null });
    }

    res.json({
      bankDetails: {
        ...bankDetails,
        // Mask account number for security
        accountNumber: bankDetails.accountNumber.replace(/\d(?=\d{4})/g, '*')
      }
    });

  } catch (error) {
    console.error('Get vendor bank details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create or update vendor bank details
const upsertVendorBankDetails = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      bankName,
      accountNumber,
      ifscCode,
      accountType,
      accountHolderName,
      branchName,
      branchAddress
    } = req.body;

    // Validate required fields
    if (!bankName || !accountNumber || !ifscCode || !accountType || !accountHolderName) {
      return res.status(400).json({ 
        error: 'Bank name, account number, IFSC code, account type, and account holder name are required' 
      });
    }

    // Validate IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      return res.status(400).json({ 
        error: 'Invalid IFSC code format' 
      });
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if bank details already exist and are verified
    const existingBankDetails = await prisma.vendorBankDetails.findUnique({
      where: { vendorId }
    });

    if (existingBankDetails && existingBankDetails.isVerified) {
      return res.status(400).json({ 
        error: 'Bank details are already verified and cannot be changed. Please contact admin for modifications.' 
      });
    }

    // Upsert bank details
    const bankDetails = await prisma.vendorBankDetails.upsert({
      where: { vendorId },
      update: {
        bankName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        accountType,
        accountHolderName,
        branchName,
        branchAddress,
        updatedAt: new Date()
      },
      create: {
        vendorId,
        bankName,
        accountNumber,
        ifscCode: ifscCode.toUpperCase(),
        accountType,
        accountHolderName,
        branchName,
        branchAddress
      }
    });

    res.json({
      message: 'Bank details saved successfully',
      bankDetails: {
        ...bankDetails,
        // Mask account number for security
        accountNumber: bankDetails.accountNumber.replace(/\d(?=\d{4})/g, '*')
      }
    });

  } catch (error) {
    console.error('Upsert vendor bank details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// DOCUMENT MANAGEMENT
// ============================================

// Get vendor documents
const getVendorDocuments = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const documents = await prisma.vendorDocument.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ documents });

  } catch (error) {
    console.error('Get vendor documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload vendor document
const uploadVendorDocument = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { type, name } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided' });
    }

    if (!type || !name) {
      return res.status(400).json({ error: 'Document type and name are required' });
    }

    // Validate document type
    const validTypes = [
      'COMPANY_REGISTRATION', 'GST_CERTIFICATE', 'PAN_CARD', 'TRADE_LICENSE',
      'EXPORT_LICENSE', 'FACTORY_LICENSE', 'POLLUTION_CERTIFICATE',
      'FIRE_SAFETY_CERTIFICATE', 'BANK_STATEMENT', 'AUDITED_FINANCIALS',
      'PRODUCT_CATALOG', 'QUALITY_CERTIFICATES', 'INSURANCE_CERTIFICATE', 'OTHER'
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Upload document to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'vendor-documents',
      resource_type: 'auto'
    });

    // Save document record
    const document = await prisma.vendorDocument.create({
      data: {
        vendorId,
        type,
        name,
        documentUrl: result.secure_url
      }
    });

    res.json({
      message: 'Document uploaded successfully',
      document
    });

  } catch (error) {
    console.error('Upload vendor document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete vendor document
const deleteVendorDocument = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { documentId } = req.params;

    // Find document
    const document = await prisma.vendorDocument.findFirst({
      where: {
        id: documentId,
        vendorId
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Cloudinary
    try {
      const publicId = document.documentUrl.split('/').pop().split('.')[0];
      await deleteFromCloudinary(`vendor-documents/${publicId}`);
    } catch (deleteError) {
      console.warn('Failed to delete document from Cloudinary:', deleteError);
    }

    // Delete from database
    await prisma.vendorDocument.delete({
      where: { id: documentId }
    });

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete vendor document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// PASSWORD MANAGEMENT
// ============================================

// Change vendor password
const changeVendorPassword = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        error: 'Current password, new password, and confirmation are required' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        error: 'New password and confirmation do not match' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters long' 
      });
    }

    // Get vendor
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (!vendor.password) {
      return res.status(400).json({ 
        error: 'No password set. Please contact admin for password reset.' 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, vendor.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change vendor password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// VENDOR PREFERENCES
// ============================================

// Update vendor preferences
const updateVendorPreferences = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      shippingMethods,
      deliveryTime,
      minimumOrderQuantity,
      paymentTerms,
      productCategories,
      specializations
    } = req.body;

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        shippingMethods: shippingMethods || [],
        deliveryTime,
        minimumOrderQuantity,
        paymentTerms: paymentTerms || [],
        productCategories: productCategories || [],
        specializations: specializations || [],
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Preferences updated successfully',
      vendor: {
        ...updatedVendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Update vendor preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// VENDOR CERTIFICATIONS
// ============================================

// Get vendor certifications
const getVendorCertifications = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const certifications = await prisma.vendorCertification.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ certifications });

  } catch (error) {
    console.error('Get vendor certifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add vendor certification
const addVendorCertification = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const {
      name,
      issuedBy,
      certificateNumber,
      issuedDate,
      expiryDate
    } = req.body;

    if (!name || !issuedBy) {
      return res.status(400).json({ 
        error: 'Certification name and issuing authority are required' 
      });
    }

    let documentUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'vendor-certifications',
        resource_type: 'auto'
      });
      documentUrl = result.secure_url;
    }

    const certification = await prisma.vendorCertification.create({
      data: {
        vendorId,
        name,
        issuedBy,
        certificateNumber,
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        documentUrl
      }
    });

    res.json({
      message: 'Certification added successfully',
      certification
    });

  } catch (error) {
    console.error('Add vendor certification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update vendor certification
const updateVendorCertification = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { certificationId } = req.params;
    const {
      name,
      issuedBy,
      certificateNumber,
      issuedDate,
      expiryDate
    } = req.body;

    // Check if certification belongs to vendor
    const existingCertification = await prisma.vendorCertification.findFirst({
      where: {
        id: certificationId,
        vendorId
      }
    });

    if (!existingCertification) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    let documentUrl = existingCertification.documentUrl;
    if (req.file) {
      // Delete old document if exists
      if (existingCertification.documentUrl) {
        try {
          const publicId = existingCertification.documentUrl.split('/').pop().split('.')[0];
          await deleteFromCloudinary(`vendor-certifications/${publicId}`);
        } catch (deleteError) {
          console.warn('Failed to delete old certification document:', deleteError);
        }
      }

      // Upload new document
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'vendor-certifications',
        resource_type: 'auto'
      });
      documentUrl = result.secure_url;
    }

    const certification = await prisma.vendorCertification.update({
      where: { id: certificationId },
      data: {
        name: name || existingCertification.name,
        issuedBy: issuedBy || existingCertification.issuedBy,
        certificateNumber,
        issuedDate: issuedDate ? new Date(issuedDate) : existingCertification.issuedDate,
        expiryDate: expiryDate ? new Date(expiryDate) : existingCertification.expiryDate,
        documentUrl,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Certification updated successfully',
      certification
    });

  } catch (error) {
    console.error('Update vendor certification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete vendor certification
const deleteVendorCertification = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const { certificationId } = req.params;

    // Find certification
    const certification = await prisma.vendorCertification.findFirst({
      where: {
        id: certificationId,
        vendorId
      }
    });

    if (!certification) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    // Delete document from Cloudinary if exists
    if (certification.documentUrl) {
      try {
        const publicId = certification.documentUrl.split('/').pop().split('.')[0];
        await deleteFromCloudinary(`vendor-certifications/${publicId}`);
      } catch (deleteError) {
        console.warn('Failed to delete certification document:', deleteError);
      }
    }

    // Delete from database
    await prisma.vendorCertification.delete({
      where: { id: certificationId }
    });

    res.json({ message: 'Certification deleted successfully' });

  } catch (error) {
    console.error('Delete vendor certification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  // Profile Settings
  updateVendorBasicInfo,
  updateVendorOwnerInfo,
  uploadVendorLogo,
  
  // Bank Details
  getVendorBankDetails,
  upsertVendorBankDetails,
  
  // Document Management
  getVendorDocuments,
  uploadVendorDocument,
  deleteVendorDocument,
  
  // Password Management
  changeVendorPassword,
  
  // Preferences
  updateVendorPreferences,
  
  // Certifications
  getVendorCertifications,
  addVendorCertification,
  updateVendorCertification,
  deleteVendorCertification
};