const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get company info
const getCompanyInfo = async (req, res) => {
  try {
    // Get the first (and only) company info document
    let companyInfo = await prisma.companyInfo.findFirst();
    
    // If no company info exists, create default
    if (!companyInfo) {
      companyInfo = await prisma.companyInfo.create({
        data: {
          companyName: 'M2C Marketplace Pvt Ltd'
        }
      });
    }
    
    res.json({
      success: true,
      data: companyInfo
    });
  } catch (error) {
    console.error('Get company info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch company info'
    });
  }
};

// Update basic company information
const updateBasicInfo = async (req, res) => {
  try {
    const {
      companyName,
      companyEmail,
      companyPhone,
      companyWebsite
    } = req.body;
    
    // Validation
    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }
    
    // Get existing company info or create new
    let companyInfo = await prisma.companyInfo.findFirst();
    
    const updateData = {
      companyName,
      companyEmail,
      companyPhone,
      companyWebsite,
      updatedBy: req.user?.id
    };
    
    if (companyInfo) {
      companyInfo = await prisma.companyInfo.update({
        where: { id: companyInfo.id },
        data: updateData
      });
    } else {
      companyInfo = await prisma.companyInfo.create({
        data: updateData
      });
    }
    
    res.json({
      success: true,
      message: 'Basic information updated successfully',
      data: companyInfo
    });
  } catch (error) {
    console.error('Update basic info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update basic information'
    });
  }
};

// Update legal & tax information
const updateLegalInfo = async (req, res) => {
  try {
    const {
      gstNumber,
      panNumber,
      cinNumber,
      businessRegistrationNumber,
      taxId
    } = req.body;
    
    // Get existing company info
    let companyInfo = await prisma.companyInfo.findFirst();
    
    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        error: 'Company info not found. Please update basic information first.'
      });
    }
    
    companyInfo = await prisma.companyInfo.update({
      where: { id: companyInfo.id },
      data: {
        gstNumber,
        panNumber,
        cinNumber,
        businessRegistrationNumber,
        taxId,
        updatedBy: req.user?.id
      }
    });
    
    res.json({
      success: true,
      message: 'Legal information updated successfully',
      data: companyInfo
    });
  } catch (error) {
    console.error('Update legal info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update legal information'
    });
  }
};

// Update registered address
const updateAddress = async (req, res) => {
  try {
    const {
      registeredAddress,
      city,
      state,
      country,
      zipCode
    } = req.body;
    
    // Get existing company info
    let companyInfo = await prisma.companyInfo.findFirst();
    
    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        error: 'Company info not found. Please update basic information first.'
      });
    }
    
    companyInfo = await prisma.companyInfo.update({
      where: { id: companyInfo.id },
      data: {
        registeredAddress,
        city,
        state,
        country,
        zipCode,
        updatedBy: req.user?.id
      }
    });
    
    res.json({
      success: true,
      message: 'Address updated successfully',
      data: companyInfo
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update address'
    });
  }
};

// Update bank details
const updateBankDetails = async (req, res) => {
  try {
    const {
      bankName,
      bankAccountNumber,
      bankIfscCode,
      bankBranch
    } = req.body;
    
    // Get existing company info
    let companyInfo = await prisma.companyInfo.findFirst();
    
    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        error: 'Company info not found. Please update basic information first.'
      });
    }
    
    companyInfo = await prisma.companyInfo.update({
      where: { id: companyInfo.id },
      data: {
        bankName,
        bankAccountNumber,
        bankIfscCode,
        bankBranch,
        updatedBy: req.user?.id
      }
    });
    
    res.json({
      success: true,
      message: 'Bank details updated successfully',
      data: companyInfo
    });
  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bank details'
    });
  }
};

// Update company logo
const updateLogo = async (req, res) => {
  try {
    const { companyLogo } = req.body;
    
    // Get existing company info
    let companyInfo = await prisma.companyInfo.findFirst();
    
    if (!companyInfo) {
      return res.status(404).json({
        success: false,
        error: 'Company info not found. Please update basic information first.'
      });
    }
    
    companyInfo = await prisma.companyInfo.update({
      where: { id: companyInfo.id },
      data: {
        companyLogo,
        updatedBy: req.user?.id
      }
    });
    
    res.json({
      success: true,
      message: 'Company logo updated successfully',
      data: companyInfo
    });
  } catch (error) {
    console.error('Update logo error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update company logo'
    });
  }
};

module.exports = {
  getCompanyInfo,
  updateBasicInfo,
  updateLegalInfo,
  updateAddress,
  updateBankDetails,
  updateLogo
};
