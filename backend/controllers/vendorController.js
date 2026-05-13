const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { prisma } = require('../config/database');
const { normalizeCategoryValues } = require('../utils/categoryResolver');
const { generateVendorCode, reconcileAndGenerate } = require('../utils/vendorCodeGenerator');
const {
  sendVendorApprovalEmail,
  sendVendorRejectionEmail,
  sendVendorSuspensionEmail,
  generateSecurePassword
} = require('../utils/email/vendorEmailSender');

// Finalize any pending (SUBMITTED / UNDER_ADMIN_REVIEW) inspections when admin
// makes a direct vendor status decision (approve / reject / suspend). Without
// this, inspections get stuck in SUBMITTED forever if admin bypasses the
// inspection review flow.
//
// Accepts a Prisma transaction client (`tx`) so inspection updates are atomic
// with the vendor-status change that wraps them.
const finalizeInspectionsForVendor = async (tx, vendorId, { decision }) => {
  const pendingInspections = await tx.inspection.findMany({
    where: {
      vendorId,
      status: { in: ['SUBMITTED', 'UNDER_ADMIN_REVIEW'] },
    },
  });

  if (pendingInspections.length === 0) return null;

  const resultMap = { APPROVED: 'PASSED', REJECTED: 'FAILED', SUSPENDED: 'FAILED' };
  const now = new Date();

  await Promise.all(
    pendingInspections.map((insp) =>
      tx.inspection.update({
        where: { id: insp.id },
        data: {
          status: 'COMPLETED',
          result: resultMap[decision] || insp.result,
          completedAt: now,
          reviewedAt: now,
        },
      })
    )
  );

  return pendingInspections;
};

// Write audit logs for finalized inspections. Called OUTSIDE the transaction
// so a log failure never blocks the main operation (matches codebase pattern).
const writeInspectionAuditLogs = (pendingInspections, { decision, adminId, adminName, reason }) => {
  if (!adminId || !pendingInspections || pendingInspections.length === 0) return;

  const actionMap = { APPROVED: 'ADMIN_APPROVED', REJECTED: 'ADMIN_FINAL_REJECTED', SUSPENDED: 'ADMIN_FINAL_REJECTED' };

  pendingInspections.forEach((insp) => {
    prisma.inspectionAuditLog.create({
      data: {
        entityType: 'FACTORY_INSPECTION',
        entityId: insp.id,
        action: actionMap[decision] || 'ADMIN_APPROVED',
        fromStatus: insp.status,
        toStatus: 'COMPLETED',
        performedById: adminId,
        performedByType: 'ADMIN',
        performedByName: adminName || 'Admin',
        rejectionReason: reason || null,
        cycleNumber: insp.cycleNumber || 1,
      },
    }).catch(err => console.error('Audit log write failed:', err));
  });
};

// Helper function to map business type to enum
const getCompanyTypeEnum = (businessType) => {
  const mapping = {
    'sole': 'MANUFACTURER', // Default for sole proprietorship
    'partnership': 'TRADER',
    'corporation': 'MANUFACTURER',
    'llc': 'MANUFACTURER'
  };
  return mapping[businessType] || 'MANUFACTURER';
};

// Helper function to map vendor type to enum
const getVendorTypeEnum = (vendorType) => {
  const mapping = {
    'manufacturer': 'TEXTILE_MANUFACTURER',
    'importer': 'TRADING_COMPANY',
    'exporter': 'TRADING_COMPANY'
  };

  if (Array.isArray(vendorType)) {
    return mapping[vendorType[0]] || 'TEXTILE_MANUFACTURER';
  }
  return mapping[vendorType] || 'TEXTILE_MANUFACTURER';
};

// Helper function to upload files to Cloudinary
const uploadFiles = async (files, folder = 'vendor-documents') => {
  const uploadPromises = files.map(async (file) => {
    try {
      const result = await uploadToCloudinary(file.buffer, {
        folder: folder,
        resource_type: 'auto'
      });
      return {
        originalName: file.originalname,
        cloudinaryUrl: result.secure_url,
        publicId: result.public_id,
        size: file.size,
        mimetype: file.mimetype
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error(`Failed to upload ${file.originalname}`);
    }
  });

  return Promise.all(uploadPromises);
};

// Register new vendor
const registerVendor = async (req, res) => {
  try {
    const {
      // Company Details
      businessType,
      companyName,
      gstNumber,
      email,
      phone,
      website,
      address,
      city,
      state,
      zipCode,
      country,

      // Owner Profile
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerAddress,
      ownerCity,
      ownerState,
      ownerZipCode,
      ownerCountry,
      yearEstablished,
      employeeCount,

      // Warehouse Details
      ownershipType,
      warehouseAddress,
      warehouseCity,
      warehouseState,
      warehouseZip,
      warehouseCountry,
      mapLink,

      // Vendor Type & Products
      vendorType,
      marketType,
      selectedCategories,
      categoryRemarks,

      // Manufacturing Facilities (if manufacturer)
      enabledFacilities,
      facilityDetails,

      // Certifications & Logistics
      selectedCertifications,
      certificationExpiryDates,
      qualityControlProcess,
      complianceStandards,
      packagingCapabilities,
      warehousingCapacity,
      logisticsPartners,
      shippingMethods,

      // Contact & Trade Info
      mainContact,
      alternateContacts,
      hasImportExport,
      importCountries,
      exportCountries,
      tradeLicenseNumber,
      businessRegistrationNumber,
      taxIdentificationNumber,
      bankingDetails,

      // Password for vendor login
      password
    } = req.body;

    // Validate required fields
    if (!companyName || !email || !phone || !ownerName || !ownerEmail || !ownerPhone) {
      return res.status(400).json({
        error: 'Missing required fields: companyName, email, phone, ownerName, ownerEmail, ownerPhone'
      });
    }

    // Check if vendor already exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { email }
    });

    if (existingVendor) {
      return res.status(400).json({
        error: 'Vendor already exists with this email'
      });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Handle file uploads
    let logoUrl = null;
    let gstDocumentUrl = null;
    let ownerPhotoUrl = null;
    let factoryImageUrls = [];
    let certificationFileUrls = {};

    try {
      // Upload company logo
      if (req.files?.logo?.[0]) {
        const logoResult = await uploadFiles([req.files.logo[0]], 'vendor-logos');
        logoUrl = logoResult[0].cloudinaryUrl;
      }

      // Upload GST document
      if (req.files?.gstDocument?.[0]) {
        const gstResult = await uploadFiles([req.files.gstDocument[0]], 'vendor-documents/gst');
        gstDocumentUrl = gstResult[0].cloudinaryUrl;
      }

      // Upload owner photo
      if (req.files?.ownerPhoto?.[0]) {
        const ownerPhotoResult = await uploadFiles([req.files.ownerPhoto[0]], 'vendor-owners');
        ownerPhotoUrl = ownerPhotoResult[0].cloudinaryUrl;
      }

      // Upload factory images
      if (req.files?.factoryImages) {
        const factoryResults = await uploadFiles(req.files.factoryImages, 'vendor-factories');
        factoryImageUrls = factoryResults.map(result => result.cloudinaryUrl);
      }

      // Upload certification files
      if (req.files?.certificationFiles) {
        const certResults = await uploadFiles(req.files.certificationFiles, 'vendor-certifications');
        // Map certification files to their respective certification IDs
        certResults.forEach((result, index) => {
          const certId = req.body[`certificationId_${index}`];
          if (certId) {
            certificationFileUrls[certId] = result.cloudinaryUrl;
          }
        });
      }
    } catch (uploadError) {
      console.error('File upload error:', uploadError);
      return res.status(500).json({
        error: 'Failed to upload files: ' + uploadError.message
      });
    }

    // Parse JSON fields
    const parsedVendorType = typeof vendorType === 'string' ? JSON.parse(vendorType) : vendorType;
    const parsedMarketType = typeof marketType === 'string' ? JSON.parse(marketType) : marketType;
    const parsedSelectedCategories = typeof selectedCategories === 'string' ? JSON.parse(selectedCategories) : selectedCategories;
    const parsedEnabledFacilities = typeof enabledFacilities === 'string' ? JSON.parse(enabledFacilities) : enabledFacilities;
    const parsedFacilityDetails = typeof facilityDetails === 'string' ? JSON.parse(facilityDetails) : facilityDetails;
    const parsedSelectedCertifications = typeof selectedCertifications === 'string' ? JSON.parse(selectedCertifications) : selectedCertifications;
    const parsedCertificationExpiryDates = typeof certificationExpiryDates === 'string' ? JSON.parse(certificationExpiryDates) : certificationExpiryDates;
    const parsedShippingMethods = typeof shippingMethods === 'string' ? JSON.parse(shippingMethods) : shippingMethods;
    const parsedMainContact = typeof mainContact === 'string' ? JSON.parse(mainContact) : mainContact;
    const parsedAlternateContacts = typeof alternateContacts === 'string' ? JSON.parse(alternateContacts) : alternateContacts;
    const parsedImportCountries = typeof importCountries === 'string' ? JSON.parse(importCountries) : importCountries;
    const parsedExportCountries = typeof exportCountries === 'string' ? JSON.parse(exportCountries) : exportCountries;
    const parsedBankingDetails = typeof bankingDetails === 'string' ? JSON.parse(bankingDetails) : bankingDetails;

    // Normalize category values to names (drop unresolvable IDs) so the DB
    // never stores raw ObjectIds that would later leak into the UI.
    const normalizedProductCategories = await normalizeCategoryValues(
      Object.keys(parsedSelectedCategories || {})
    );
    const normalizedProductTypes = await normalizeCategoryValues(
      Object.values(parsedSelectedCategories || {}).flat()
    );

    // Build the vendor data payload once — reused if we need to retry after a
    // unique-index collision on vendorCode (e.g. counter drift).
    const buildVendorData = (vendorCode) => ({
        vendorCode,
        email,
        password: hashedPassword,
        status: 'PENDING',

        // Owner Profile
        ownerName,
        ownerEmail,
        ownerPhone,
        ownerAddress: ownerAddress || address,
        ownerCity: ownerCity || city,
        ownerState: ownerState || state,
        ownerZipCode: ownerZipCode || zipCode,
        ownerCountry: ownerCountry || country || 'India',
        ownerPhoto: ownerPhotoUrl,

        // Company Details
        companyName,
        companyType: getCompanyTypeEnum(businessType),
        establishedYear: yearEstablished ? parseInt(yearEstablished) : null,
        companyDescription: `${companyName} - ${businessType} established in ${yearEstablished}`,
        companyLogo: logoUrl,

        // Contact & Trade Information
        businessPhone: phone,
        businessEmail: email,
        businessAddress: address,
        businessCity: city,
        businessState: state,
        businessZipCode: zipCode,
        businessCountry: country || 'India',
        website,
        gstNumber: gstNumber || null,

        // Trade Information
        annualTurnover: employeeCount, // Using employee count as proxy for now
        exportExperience: hasImportExport === 'yes',
        exportCountries: parsedExportCountries || [],
        primaryMarkets: Array.isArray(parsedMarketType) ? parsedMarketType : (parsedMarketType ? [parsedMarketType] : []),

        // Manufacturing Facilities
        factoryAddress: warehouseAddress,
        factoryCity: warehouseCity,
        factoryState: warehouseState,
        factoryZipCode: warehouseZip,
        factoryCountry: warehouseCountry || 'India',
        factorySize: warehousingCapacity ? `${warehousingCapacity} sq ft` : null,
        productionCapacity: Object.values(parsedFacilityDetails || {}).map(f => f.capacity).filter(Boolean).join(', '),
        qualityControl: qualityControlProcess,

        // Warehouse Details
        warehouseAddress,
        warehouseCity,
        warehouseState,
        warehouseZipCode: warehouseZip,
        warehouseCountry: warehouseCountry || 'India',
        warehouseSize: warehousingCapacity ? `${warehousingCapacity} sq ft` : null,
        storageCapacity: warehousingCapacity,
        mapLink: mapLink || null,

        // Vendor Type & Products
        vendorType: getVendorTypeEnum(parsedVendorType),
        productCategories: normalizedProductCategories,
        productTypes: normalizedProductTypes,
        specializations: parsedSelectedCertifications || [],
        categoryRemarks: categoryRemarks || null,

        // Logistics Information
        shippingMethods: parsedShippingMethods || [],
        deliveryTime: '7-15 days', // Default
        minimumOrderQuantity: '100 pieces', // Default
        paymentTerms: ['30 days', 'LC'], // Default

        // Contact & Trade Information
        mainContact: parsedMainContact || null,
        alternateContacts: parsedAlternateContacts || [],
        tradeLicenseNumber: tradeLicenseNumber || null,
        businessRegistrationNumber: businessRegistrationNumber || null,
        taxIdentificationNumber: taxIdentificationNumber || null,

        // System fields
        applicationStep: 8, // Completed all steps
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
        submittedAt: new Date()
    });

    // Create vendor + generate code atomically. If the unique index on
    // vendorCode rejects our code (counter drifted vs existing rows), self-heal
    // by reconciling the counter to max(existing sequence) + 1 and retry once.
    async function createVendorWithCode() {
      try {
        return await prisma.$transaction(async (tx) => {
          const code = await generateVendorCode(tx);
          return tx.vendor.create({ data: buildVendorData(code) });
        });
      } catch (err) {
        const isDuplicateCode =
          err?.code === 'P2002' &&
          (err.meta?.target === 'vendorCode' ||
            (Array.isArray(err.meta?.target) && err.meta.target.includes('vendorCode')));
        if (!isDuplicateCode) throw err;

        console.warn('vendorCode collision detected — reconciling counter and retrying');
        const code = await reconcileAndGenerate();
        return prisma.vendor.create({ data: buildVendorData(code) });
      }
    }

    const vendor = await createVendorWithCode();

    // Create certifications
    if (parsedSelectedCertifications && parsedSelectedCertifications.length > 0) {
      const certificationData = parsedSelectedCertifications.map(certId => ({
        vendorId: vendor.id,
        name: certId.toUpperCase(),
        issuedBy: 'Certification Authority',
        expiryDate: parsedCertificationExpiryDates?.[certId] ? new Date(parsedCertificationExpiryDates[certId]) : null,
        documentUrl: certificationFileUrls[certId] || null
      }));

      await prisma.vendorCertification.createMany({
        data: certificationData
      });
    }

    // Create documents
    const documents = [];

    if (gstDocumentUrl) {
      documents.push({
        vendorId: vendor.id,
        type: 'GST_CERTIFICATE',
        name: 'GST Certificate',
        documentUrl: gstDocumentUrl
      });
    }

    if (factoryImageUrls.length > 0) {
      factoryImageUrls.forEach((url, index) => {
        documents.push({
          vendorId: vendor.id,
          type: 'OTHER',
          name: `Factory Image ${index + 1}`,
          documentUrl: url
        });
      });
    }

    if (documents.length > 0) {
      await prisma.vendorDocument.createMany({
        data: documents
      });
    }

    // Create bank details if provided
    if (parsedBankingDetails && parsedBankingDetails.bankName) {
      await prisma.vendorBankDetails.create({
        data: {
          vendorId: vendor.id,
          bankName: parsedBankingDetails.bankName,
          accountNumber: parsedBankingDetails.accountNumber,
          ifscCode: parsedBankingDetails.swiftCode || 'SWIFT000',
          accountType: 'Current',
          branchName: parsedBankingDetails.bankName + ' Branch',
          branchAddress: address
        }
      });
    }

    // Create references from alternate contacts
    if (parsedAlternateContacts && parsedAlternateContacts.length > 0) {
      const referenceData = parsedAlternateContacts.map(contact => ({
        vendorId: vendor.id,
        companyName: companyName,
        contactPerson: contact.name,
        email: contact.email1 || contact.email,
        phone: contact.phone1 || contact.phone,
        relationship: contact.department || 'Business Contact'
      }));

      await prisma.vendorReference.createMany({
        data: referenceData
      });
    }

    // Generate JWT token for vendor
    const token = jwt.sign(
      { vendorId: vendor.id, type: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Notify admins about new vendor registration
    const { createNotificationForRole: notifyAdminsReg } = require('./notificationController');
    notifyAdminsReg({
      role: 'ADMIN', type: 'NEW_VENDOR_REGISTRATION',
      title: 'New Vendor Registration',
      message: `${vendor.companyName} has submitted a vendor registration.`,
      data: { vendorId: vendor.id }
    }).catch(() => {});

    res.status(201).json({
      message: 'Vendor registration submitted successfully',
      vendor: {
        id: vendor.id,
        email: vendor.email,
        companyName: vendor.companyName,
        status: vendor.status,
        submittedAt: vendor.submittedAt
      },
      token
    });

  } catch (error) {
    console.error('Vendor registration error:', error);
    res.status(500).json({
      error: 'Internal server error during vendor registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get vendor profile
const getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        certifications: true,
        documents: true,
        bankDetails: true,
        references: true
      }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({
      vendor: {
        ...vendor,
        password: undefined // Don't send password
      }
    });

  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update vendor profile
const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.vendorId || req.user.id;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.password;
    delete updateData.status;
    delete updateData.approvedAt;
    delete updateData.rejectedAt;

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
      include: {
        certifications: true,
        documents: true,
        bankDetails: true,
        references: true
      }
    });

    res.json({
      message: 'Vendor profile updated successfully',
      vendor: {
        ...vendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Update vendor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all vendors (Admin only)
const getAllVendors = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    const where = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        certifications: true,
        documents: true,
        assignedQc: true,
        inspections: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, status: true, result: true, completedAt: true },
        },
        _count: {
          select: {
            certifications: true,
            documents: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.vendor.count({ where });

    // Fetch category names for the IDs in productCategories and productTypes
    const allCategoryIds = [...new Set([
      ...vendors.flatMap(v => v.productCategories || []),
      ...vendors.flatMap(v => v.productTypes || [])
    ])].filter(id => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));

    let categoryMap = {};
    if (allCategoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: allCategoryIds } },
        select: { id: true, name: true }
      });
      categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});
    }

    // Map Category IDs to Category Names, dropping any unresolved ObjectIds so
    // raw 24-hex strings never leak into the API response.
    const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
    const resolveAndClean = (values) =>
      (values || [])
        .map(v => categoryMap[v] || v)
        .filter(v => !OBJECT_ID_RE.test(v));

    const formattedVendors = vendors.map(vendor => {
      const { inspections, ...rest } = vendor;
      return {
        ...rest,
        productCategories: resolveAndClean(vendor.productCategories),
        productTypes: resolveAndClean(vendor.productTypes),
        latestInspection: inspections?.[0] || null,
        password: undefined,
      };
    });

    res.json({
      vendors: formattedVendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single vendor by ID (Admin only)
const getVendorById = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        certifications: true,
        documents: true,
        bankDetails: true,
        _count: {
          select: {
            certifications: true,
            documents: true
          }
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

    const idsToFetch = [...new Set([
      ...(vendor.productCategories || []),
      ...(vendor.productTypes || [])
    ])].filter(id => typeof id === 'string' && OBJECT_ID_RE.test(id));

    let categoryMap = {};
    if (idsToFetch.length > 0) {
      const categories = await prisma.category.findMany({
        where: { id: { in: idsToFetch } },
        select: { id: true, name: true }
      });
      categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
      }, {});
    }

    // Resolve IDs to names and drop any unresolved ObjectIds so raw 24-hex
    // strings never leak into the API response.
    const resolveAndClean = (values) =>
      (values || [])
        .map(v => categoryMap[v] || v)
        .filter(v => !OBJECT_ID_RE.test(v));

    res.json({
      vendor: {
        ...vendor,
        productCategories: resolveAndClean(vendor.productCategories),
        productTypes: resolveAndClean(vendor.productTypes),
        password: undefined
      }
    });

  } catch (error) {
    console.error('Get vendor by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update vendor by ID (Admin only)
const updateVendorById = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const updateData = req.body;

    console.log('Admin updating vendor:', vendorId);
    console.log('Update data received:', updateData);
    console.log('Files received:', req.files);

    // Check if vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        certifications: true
      }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Handle file uploads for certificates
    let certificationFileUrls = {};
    if (req.files?.certificationFiles) {
      try {
        const certResults = await uploadFiles(req.files.certificationFiles, 'vendor-certifications');
        // Map certification files to their respective certification IDs
        certResults.forEach((result, index) => {
          const certId = req.body[`certificationId_${index}`];
          if (certId) {
            certificationFileUrls[certId] = result.cloudinaryUrl;
          }
        });
        console.log('Uploaded certification files:', certificationFileUrls);
      } catch (uploadError) {
        console.error('Certificate file upload error:', uploadError);
        return res.status(500).json({
          error: 'Failed to upload certificate files: ' + uploadError.message
        });
      }
    }

    // Parse JSON fields if they're strings
    const parsedSelectedCertifications = typeof updateData.selectedCertifications === 'string'
      ? JSON.parse(updateData.selectedCertifications)
      : updateData.selectedCertifications;

    const parsedCertificationExpiryDates = typeof updateData.certificationExpiryDates === 'string'
      ? JSON.parse(updateData.certificationExpiryDates)
      : updateData.certificationExpiryDates;

    const parsedSelectedCategories = typeof updateData.selectedCategories === 'string'
      ? JSON.parse(updateData.selectedCategories)
      : updateData.selectedCategories;

    const parsedMarketType = typeof updateData.marketType === 'string'
      ? JSON.parse(updateData.marketType)
      : updateData.marketType;

    const parsedVendorType = typeof updateData.vendorType === 'string'
      ? JSON.parse(updateData.vendorType)
      : updateData.vendorType;

    const parsedShippingMethods = typeof updateData.shippingMethods === 'string'
      ? JSON.parse(updateData.shippingMethods)
      : updateData.shippingMethods;

    const parsedExportCountries = typeof updateData.exportCountries === 'string'
      ? JSON.parse(updateData.exportCountries)
      : updateData.exportCountries;

    // Normalize categories to names so the DB never stores raw ObjectIds.
    const normalizedProductCategories = await normalizeCategoryValues(
      Object.keys(parsedSelectedCategories || {})
    );
    const normalizedProductTypes = await normalizeCategoryValues(
      Object.values(parsedSelectedCategories || {}).flat()
    );

    // Prepare update data - map form fields to database fields
    const vendorUpdateData = {
      // Company Details
      companyName: updateData.companyName,
      gstNumber: updateData.gstNumber || null,
      businessEmail: updateData.email,
      businessPhone: updateData.phone,
      website: updateData.website,
      businessAddress: updateData.address,
      businessCity: updateData.city,
      businessState: updateData.state,
      businessZipCode: updateData.zipCode || null,
      businessCountry: updateData.country || 'India',

      // Owner Profile
      ownerName: updateData.ownerName,
      ownerEmail: updateData.ownerEmail,
      ownerPhone: updateData.ownerPhone,
      establishedYear: updateData.yearEstablished ? parseInt(updateData.yearEstablished) : null,
      annualTurnover: updateData.employeeCount,

      // Warehouse Details
      warehouseAddress: updateData.warehouseAddress,
      warehouseCity: updateData.warehouseCity,
      warehouseState: updateData.warehouseState,
      warehouseZipCode: updateData.warehouseZip || null,
      warehouseCountry: updateData.warehouseCountry || 'India',
      storageCapacity: updateData.warehousingCapacity,
      mapLink: updateData.mapLink || null,

      // Vendor Type & Products
      vendorType: Array.isArray(parsedVendorType) && parsedVendorType.includes('manufacturer')
        ? 'TEXTILE_MANUFACTURER'
        : 'TRADING_COMPANY',
      primaryMarkets: parsedMarketType || [],
      productCategories: normalizedProductCategories,
      productTypes: normalizedProductTypes,

      // Logistics
      shippingMethods: parsedShippingMethods || [],
      qualityControl: updateData.qualityControlProcess,

      // Trade Info
      exportExperience: updateData.hasImportExport === 'yes',
      exportCountries: parsedExportCountries || [],

      // Contact & Trade Information
      mainContact: updateData.mainContact ? (typeof updateData.mainContact === 'string' ? JSON.parse(updateData.mainContact) : updateData.mainContact) : null,
      alternateContacts: updateData.alternateContacts ? (typeof updateData.alternateContacts === 'string' ? JSON.parse(updateData.alternateContacts) : updateData.alternateContacts) : [],
      tradeLicenseNumber: updateData.tradeLicenseNumber || null,
      businessRegistrationNumber: updateData.businessRegistrationNumber || null,
      taxIdentificationNumber: updateData.taxIdentificationNumber || null,

      // Status (admin can update these)
      status: updateData.status?.toUpperCase() || existingVendor.status
    };

    // Update vendor
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: vendorUpdateData
    });

    // Handle certifications update
    if (parsedSelectedCertifications && Array.isArray(parsedSelectedCertifications)) {
      // Get existing certifications to preserve document URLs if no new file uploaded
      const existingCerts = await prisma.vendorCertification.findMany({
        where: { vendorId }
      });

      // Create a map of existing cert URLs
      const existingCertUrls = {};
      existingCerts.forEach(cert => {
        if (cert.documentUrl) {
          existingCertUrls[cert.name.toLowerCase()] = cert.documentUrl;
        }
      });

      // Delete existing certifications
      await prisma.vendorCertification.deleteMany({
        where: { vendorId }
      });

      // Create new certifications
      if (parsedSelectedCertifications.length > 0) {
        const certificationData = parsedSelectedCertifications.map(certId => {
          const certIdUpper = certId.toUpperCase();
          // Use new uploaded file URL, or preserve existing URL, or null
          const documentUrl = certificationFileUrls[certId] || existingCertUrls[certId] || null;

          return {
            vendorId,
            name: certIdUpper,
            issuedBy: 'Certification Authority',
            expiryDate: parsedCertificationExpiryDates?.[certId]
              ? new Date(parsedCertificationExpiryDates[certId])
              : null,
            documentUrl
          };
        });

        await prisma.vendorCertification.createMany({
          data: certificationData
        });
      }
    }

    // Update bank details if provided
    const parsedBankingDetails = typeof updateData.bankingDetails === 'string'
      ? JSON.parse(updateData.bankingDetails)
      : updateData.bankingDetails;

    if (parsedBankingDetails && parsedBankingDetails.bankName) {
      // Check if bank details exist
      const existingBankDetails = await prisma.vendorBankDetails.findFirst({
        where: { vendorId }
      });

      if (existingBankDetails) {
        await prisma.vendorBankDetails.update({
          where: { id: existingBankDetails.id },
          data: {
            bankName: parsedBankingDetails.bankName,
            accountNumber: parsedBankingDetails.accountNumber,
            ifscCode: parsedBankingDetails.swiftCode || 'SWIFT000'
          }
        });
      } else {
        await prisma.vendorBankDetails.create({
          data: {
            vendorId,
            bankName: parsedBankingDetails.bankName,
            accountNumber: parsedBankingDetails.accountNumber,
            ifscCode: parsedBankingDetails.swiftCode || 'SWIFT000',
            accountType: 'Current',
            branchName: parsedBankingDetails.bankName + ' Branch',
            branchAddress: updateData.address
          }
        });
      }
    }

    // Fetch updated vendor with relations
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        certifications: true,
        documents: true,
        bankDetails: true
      }
    });

    res.json({
      message: 'Vendor updated successfully',
      vendor: {
        ...vendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Update vendor by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Approve vendor
const approveVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Get vendor details first
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (existingVendor.status === 'APPROVED') {
      return res.status(400).json({ error: 'Vendor is already approved' });
    }

    // Generate secure password for vendor account
    const temporaryPassword = generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const adminId = req.user?.id || req.userId;
    const adminName = req.user?.name || req.user?.email;

    // Vendor status change + inspection finalization must be atomic
    const { vendor, finalizedInspections } = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
          password: hashedPassword,
        },
      });

      const inspections = await finalizeInspectionsForVendor(tx, vendorId, {
        decision: 'APPROVED',
      });

      return { vendor: updatedVendor, finalizedInspections: inspections };
    });

    // Audit logs: fire-and-forget, outside transaction
    if (finalizedInspections) {
      writeInspectionAuditLogs(finalizedInspections, { decision: 'APPROVED', adminId, adminName });
    }

    // Send approval email with credentials
    try {
      await sendVendorApprovalEmail({
        companyName: vendor.companyName,
        ownerName: vendor.ownerName,
        email: vendor.email,
        password: temporaryPassword // Send the plain password in email
      });

      console.log(`✅ Approval email sent to ${vendor.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send approval email:', emailError);
      // Don't fail the approval process if email fails
      // The vendor is still approved, just log the email error
    }

    // Notify vendor
    const { createNotification: createVendorNotif } = require('./notificationController');
    createVendorNotif({
      userId: vendor.id, role: 'VENDOR', type: 'VENDOR_STATUS_CHANGED',
      title: 'Vendor Application Approved',
      message: `Congratulations! Your vendor application for "${vendor.companyName}" has been approved.`,
    }).catch(() => {});

    res.json({
      message: 'Vendor approved successfully and credentials sent via email',
      vendor: {
        ...vendor,
        password: undefined // Don't send password in response
      }
    });

  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject vendor
const rejectVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get vendor details first
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const adminId = req.user?.id || req.userId;
    const adminName = req.user?.name || req.user?.email;

    // Vendor status change + inspection finalization must be atomic
    const { vendor, finalizedInspections } = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason,
          approvedAt: null,
        },
      });

      const inspections = await finalizeInspectionsForVendor(tx, vendorId, {
        decision: 'REJECTED',
      });

      return { vendor: updatedVendor, finalizedInspections: inspections };
    });

    // Audit logs: fire-and-forget, outside transaction
    if (finalizedInspections) {
      writeInspectionAuditLogs(finalizedInspections, { decision: 'REJECTED', adminId, adminName, reason });
    }

    // Send rejection email
    try {
      await sendVendorRejectionEmail({
        companyName: vendor.companyName,
        ownerName: vendor.ownerName,
        email: vendor.email,
        reason: reason
      });

      console.log(`✅ Rejection email sent to ${vendor.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send rejection email:', emailError);
      // Don't fail the rejection process if email fails
    }

    res.json({
      message: 'Vendor rejected successfully and notification sent via email',
      vendor: {
        ...vendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Suspend vendor
const suspendVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }

    // Get vendor details first
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const adminId = req.user?.id || req.userId;
    const adminName = req.user?.name || req.user?.email;

    // Vendor status change + inspection finalization must be atomic
    const { vendor, finalizedInspections } = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          rejectionReason: reason,
        },
      });

      const inspections = await finalizeInspectionsForVendor(tx, vendorId, {
        decision: 'SUSPENDED',
      });

      return { vendor: updatedVendor, finalizedInspections: inspections };
    });

    // Audit logs: fire-and-forget, outside transaction
    if (finalizedInspections) {
      writeInspectionAuditLogs(finalizedInspections, { decision: 'SUSPENDED', adminId, adminName, reason });
    }

    // Send suspension email
    try {
      await sendVendorSuspensionEmail({
        companyName: vendor.companyName,
        ownerName: vendor.ownerName,
        email: vendor.email,
        reason: reason
      });

      console.log(`✅ Suspension email sent to ${vendor.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send suspension email:', emailError);
      // Don't fail the suspension process if email fails
    }

    // Notify vendor
    const { createNotification: createSuspendNotif } = require('./notificationController');
    createSuspendNotif({
      userId: vendor.id, role: 'VENDOR', type: 'VENDOR_STATUS_CHANGED',
      title: 'Account Suspended',
      message: `Your vendor account has been suspended.${reason ? ` Reason: ${reason}` : ''}`,
    }).catch(() => {});

    res.json({
      message: 'Vendor suspended successfully and notification sent via email',
      vendor: {
        ...vendor,
        password: undefined
      }
    });

  } catch (error) {
    console.error('Suspend vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Vendor login
const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { email }
    });

    if (!vendor) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if vendor has a password (approved vendors should have one)
    if (!vendor.password) {
      return res.status(401).json({
        error: 'Account not activated. Please wait for admin approval.',
        status: vendor.status
      });
    }

    if (vendor.status === 'REJECTED') {
      return res.status(403).json({
        error: 'Your vendor application has been rejected',
        reason: vendor.rejectionReason
      });
    }

    if (vendor.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'Your vendor account has been suspended',
        reason: vendor.rejectionReason
      });
    }

    if (vendor.status === 'PENDING') {
      return res.status(403).json({
        error: 'Your vendor application is still under review. Please wait for approval.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, vendor.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { lastLoginAt: new Date() }
    });

    const token = jwt.sign(
      { vendorId: vendor.id, type: 'vendor' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      vendor: {
        id: vendor.id,
        email: vendor.email,
        companyName: vendor.companyName,
        status: vendor.status,
        ownerName: vendor.ownerName
      },
      token
    });

  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Test email functionality (development only)
const testVendorEmail = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test endpoint not available in production' });
    }

    const { type = 'approval', email = 'test@example.com' } = req.query;

    const testData = {
      companyName: 'Test Company Ltd',
      ownerName: 'John Doe',
      email: email,
      password: 'TempPass123!',
      reason: 'This is a test rejection/suspension reason for development purposes.'
    };

    let result;
    switch (type) {
      case 'approval':
        result = await sendVendorApprovalEmail(testData);
        break;
      case 'rejection':
        result = await sendVendorRejectionEmail(testData);
        break;
      case 'suspension':
        result = await sendVendorSuspensionEmail(testData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid email type. Use: approval, rejection, or suspension' });
    }

    res.json({
      message: `Test ${type} email sent successfully`,
      result: result
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      details: error.message
    });
  }
};

// Assign QC Checker to a Vendor
const assignQc = async (req, res) => {
  try {
    const { vendorId, checkerId } = req.body;

    if (!vendorId || !checkerId) {
      return res.status(400).json({ error: 'vendorId and checkerId are required' });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const checker = await prisma.qCChecker.findUnique({
      where: { id: checkerId }
    });

    if (!checker) {
      return res.status(404).json({ error: 'QC Checker not found' });
    }

    // Update vendor with assigned QC Checker and change status if it was pending
    const statusUpdate = vendor.status === 'PENDING' ? 'UNDER_REVIEW' : vendor.status;

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        assignedQcId: checkerId,
        status: statusUpdate
      },
      include: {
        assignedQc: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Also update the checker's assignedVendors count
    await prisma.qCChecker.update({
      where: { id: checkerId },
      data: {
        assignedVendors: {
          increment: 1
        }
      }
    });

    res.json({
      message: 'QC Checker assigned successfully',
      vendor: updatedVendor
    });

  } catch (error) {
    console.error('Assign QC Checker error:', error);
    res.status(500).json({ error: 'Internal server error while assigning QC Checker' });
  }
};

// Verify vendor bank details (Admin only)
const verifyVendorBankDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const bankDetails = await prisma.vendorBankDetails.findUnique({
      where: { vendorId }
    });

    if (!bankDetails) {
      return res.status(404).json({ error: 'Bank details not found for this vendor' });
    }

    if (bankDetails.isVerified) {
      return res.status(400).json({ error: 'Bank details are already verified' });
    }

    const updatedBankDetails = await prisma.vendorBankDetails.update({
      where: { vendorId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user?.id || req.admin?.id // Using user/admin id if available in token
      }
    });

    res.json({
      message: 'Vendor bank details verified successfully',
      bankDetails: updatedBankDetails
    });

  } catch (error) {
    console.error('Verify vendor bank details error:', error);
    res.status(500).json({ error: 'Internal server error while verifying bank details' });
  }
};


module.exports = {
  registerVendor,
  getVendorProfile,
  updateVendorProfile,
  getAllVendors,
  getVendorById,
  updateVendorById,
  approveVendor,
  rejectVendor,
  suspendVendor,
  vendorLogin,
  testVendorEmail,
  assignQc,
  verifyVendorBankDetails
};