const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { uploadToCloudinary, deleteFromCloudinary, resolveBase64InValue } = require('../config/cloudinary');
const { prisma } = require('../config/database');
const { normalizeCategoryValues } = require('../utils/categoryResolver');
const { generateVendorCode, reconcileAndGenerate } = require('../utils/vendorCodeGenerator');
const { parseMapLinkCoordinates } = require('../utils/locationUtils');
const {
  sendVendorApprovalEmail,
  sendVendorRejectionEmail,
  sendVendorSuspensionEmail,
  sendNewVendorRegistrationEmailToAdmins,
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

// Map the multi-select `vendorType` from Step 4 to the `companyType` enum.
// The previous implementation matched `businessType` (legal entity from
// Step 1: proprietorship / pvt-ltd / partnership-firm / llp) against a
// legacy mapping (sole / partnership / corporation / llc) — none of the
// current FE values matched any key, so every vendor was silently tagged
// MANUFACTURER. Deriving from vendorType (manufacturer / importer /
// exporter) makes the column reflect what the user actually selected.
const getCompanyTypeEnum = (vendorTypes) => {
  const first = Array.isArray(vendorTypes) ? vendorTypes[0] : vendorTypes;
  const mapping = {
    'manufacturer': 'MANUFACTURER',
    'importer': 'IMPORTER',
    'exporter': 'EXPORTER',
  };
  return mapping[first] || 'MANUFACTURER';
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

// Best-effort cleanup for orphaned Cloudinary assets. Called when an
// upload succeeds but a later step (vendor create / cert create / etc.)
// fails — without this, the file lives in Cloudinary forever. Runs as
// fire-and-forget: a delete failure is logged but never thrown, since
// the caller is already in an error path.
const cleanupOrphanedCloudinaryAssets = (publicIds) => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) return;
  publicIds.forEach((publicId) => {
    deleteFromCloudinary(publicId).catch((err) => {
      console.error(`Orphan cleanup failed for ${publicId}:`, err.message);
    });
  });
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
  // Function-scoped so the outer catch can clean up orphans even if the
  // failure happens before/after the inner upload try-block. `const` inside
  // try would be block-scoped and invisible to the outer catch.
  const uploadedPublicIds = [];
  try {
    const {
      // Company Details
      businessType,
      companyName,
      gstNumber,
      companyIdNumber,        // IEC / CIN / Partnership Deed / LLPIN
      panNumber,
      email,
      email2,
      phone,
      landlineNumber,
      phoneNumber2,
      website,
      address,
      addressLine2,
      addressLine3,
      landmark,
      city,
      state,
      zipCode,
      country,
      factoryOwnershipType,   // owned / rented / lease for the factory site

      // Owner Profile
      ownerName,
      designation,             // Proprietor / CEO / Director / Founder / custom
      ownerEmail,
      ownerEmail2,
      ownerPhone,
      ownerPhone2,
      ownerLandline,
      additionalOwners,
      businessStartDate,       // Full date — preferred over legacy yearEstablished
      yearEstablished,         // Legacy year-only fallback
      employeeCount,

      // Warehouse Details
      ownershipType,
      warehouseAddress,
      warehouseAddressLine2,
      warehouseAddressLine3,
      warehouseLandmark,
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
      categoryProducts,        // Per-category products: { catId: [{ name, photos: [{preview: dataURI}] }] }
      additionalCategories,    // User-defined categories: [{ id, name, products: [...] }]

      // Manufacturing Facilities (if manufacturer)
      enabledFacilities,
      facilityDetails,

      // Certifications & Logistics
      selectedCertifications,
      certificationExpiryDates,
      otherCertifications,     // User-defined custom certs: [{ id, name, description }]
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

    // Normalize emails before duplicate check + insert so "JOHN@x.com" and
    // "john@x.com" don't register twice. The schema's @unique index is
    // case-sensitive on MongoDB; normalizing at the application layer is
    // the simplest fix. Same normalization applies in vendorLogin.
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOwnerEmail = ownerEmail ? ownerEmail.trim().toLowerCase() : ownerEmail;

    // Check if vendor already exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { email: normalizedEmail }
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
    let panCardUrl = null;
    let typeCertUrl = null;
    let ownerPhotoUrl = null;
    // Factory images carry slot identity (nameBoard / frontView / etc.) so the
    // resulting VendorDocument rows have human-readable names instead of a
    // generic "Factory Image N". Slot IDs arrive in side-channel body fields
    // (`factoryImageSlot_<index>`) — same pattern as `certificationId_<index>`.
    let factoryImageUploads = [];
    let certificationFileUrls = {};

    try {
      // Upload company logo
      if (req.files?.logo?.[0]) {
        const logoResult = await uploadFiles([req.files.logo[0]], 'vendor-logos');
        logoUrl = logoResult[0].cloudinaryUrl;
        if (logoResult[0].publicId) uploadedPublicIds.push(logoResult[0].publicId);
      }

      // Upload GST document
      if (req.files?.gstDocument?.[0]) {
        const gstResult = await uploadFiles([req.files.gstDocument[0]], 'vendor-documents/gst');
        gstDocumentUrl = gstResult[0].cloudinaryUrl;
        if (gstResult[0].publicId) uploadedPublicIds.push(gstResult[0].publicId);
      }

      // Upload PAN Card document
      if (req.files?.panCardFile?.[0]) {
        const panResult = await uploadFiles([req.files.panCardFile[0]], 'vendor-documents/pan');
        panCardUrl = panResult[0].cloudinaryUrl;
        if (panResult[0].publicId) uploadedPublicIds.push(panResult[0].publicId);
      }

      // Upload type-specific business registration certificate
      // (IEC for Proprietorship / CIN for Pvt Ltd / Deed for Partnership /
      //  LLPIN for LLP). Stored as DocumentType.COMPANY_REGISTRATION.
      if (req.files?.typeCertFile?.[0]) {
        const typeCertResult = await uploadFiles([req.files.typeCertFile[0]], 'vendor-documents/business-cert');
        typeCertUrl = typeCertResult[0].cloudinaryUrl;
        if (typeCertResult[0].publicId) uploadedPublicIds.push(typeCertResult[0].publicId);
      }

      // Upload owner photo
      if (req.files?.ownerPhoto?.[0]) {
        const ownerPhotoResult = await uploadFiles([req.files.ownerPhoto[0]], 'vendor-owners');
        ownerPhotoUrl = ownerPhotoResult[0].cloudinaryUrl;
        if (ownerPhotoResult[0].publicId) uploadedPublicIds.push(ownerPhotoResult[0].publicId);
      }

      // Upload factory images
      if (req.files?.factoryImages) {
        const factoryResults = await uploadFiles(req.files.factoryImages, 'vendor-factories');
        factoryImageUploads = factoryResults.map((result, index) => ({
          url: result.cloudinaryUrl,
          slotId: req.body[`factoryImageSlot_${index}`] || null,
        }));
        factoryResults.forEach((r) => { if (r.publicId) uploadedPublicIds.push(r.publicId); });
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
          if (result.publicId) uploadedPublicIds.push(result.publicId);
        });
      }
    } catch (uploadError) {
      console.error('File upload error:', uploadError);
      // Best-effort cleanup of anything that did upload before the failure.
      cleanupOrphanedCloudinaryAssets(uploadedPublicIds);
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
    const parsedOtherCertifications = typeof otherCertifications === 'string' ? JSON.parse(otherCertifications) : otherCertifications;
    const parsedShippingMethods = typeof shippingMethods === 'string' ? JSON.parse(shippingMethods) : shippingMethods;
    const rawParsedMainContact = typeof mainContact === 'string' ? JSON.parse(mainContact) : mainContact;
    const rawParsedAlternateContacts = typeof alternateContacts === 'string' ? JSON.parse(alternateContacts) : alternateContacts;
    // ── Contact photo upload (Step 7) ─────────────────────────────────────
    // The form stores the main contact's photo as a base64 data URI inside
    // `mainContact.photo` (FileReader.readAsDataURL). Without this resolve,
    // the giant base64 string would be persisted directly into the JSON
    // column and reloaded on every profile view. Deep-walking the object
    // swaps each data URI for a Cloudinary URL while preserving the rest
    // of the contact shape intact.
    const parsedMainContact = await resolveBase64InValue(rawParsedMainContact, {
      folder: 'vendor-contact-photos',
      resource_type: 'image',
    });
    const parsedAlternateContacts = await resolveBase64InValue(rawParsedAlternateContacts, {
      folder: 'vendor-contact-photos',
      resource_type: 'image',
    });
    const parsedImportCountries = typeof importCountries === 'string' ? JSON.parse(importCountries) : importCountries;
    const parsedExportCountries = typeof exportCountries === 'string' ? JSON.parse(exportCountries) : exportCountries;
    const parsedBankingDetails = typeof bankingDetails === 'string' ? JSON.parse(bankingDetails) : bankingDetails;
    const parsedCategoryProducts = typeof categoryProducts === 'string' ? JSON.parse(categoryProducts) : categoryProducts;
    const parsedAdditionalCategories = typeof additionalCategories === 'string' ? JSON.parse(additionalCategories) : additionalCategories;

    // ── Step 4 product photo upload ────────────────────────────────────────
    // Photos arrive as base64 data URIs nested deep inside categoryProducts
    // and additionalCategories (FE uses FileReader.readAsDataURL). Walk the
    // structure once and replace each data URI with its uploaded Cloudinary
    // URL — keeps the rest of the JSON shape (product names, categories,
    // ids) intact so admin UIs can render it as-is.
    const resolvedCategoryProducts = await resolveBase64InValue(
      parsedCategoryProducts,
      { folder: 'vendor-product-photos', resource_type: 'image' },
    );
    const resolvedAdditionalCategories = await resolveBase64InValue(
      parsedAdditionalCategories,
      { folder: 'vendor-product-photos', resource_type: 'image' },
    );

    // ── Vendor type multi-select normalization ───────────────────────────
    // The form lets vendors pick multiple types (manufacturer + importer +
    // exporter). Keep the raw array for `vendorTypes` while the legacy
    // single-enum `vendorType` column gets the first value mapped.
    const vendorTypesArray = Array.isArray(parsedVendorType)
      ? parsedVendorType.filter((v) => typeof v === 'string' && v.length > 0)
      : parsedVendorType
        ? [parsedVendorType]
        : [];

    // ── Production capacity summary (Step 5) ──────────────────────────────
    // Build a human-readable summary string from facilityDetails. The FE
    // stores capacity under prefixed keys (`spinningCapacity`, `weavingCapacity`
    // etc.) — the previous derivation looked for a bare `capacity` key and
    // always produced an empty string. Only enabled facilities are included
    // so a disabled facility with stale data doesn't leak into the summary.
    const buildProductionCapacitySummary = () => {
      if (!parsedFacilityDetails || typeof parsedFacilityDetails !== 'object') return null;
      const enabled = parsedEnabledFacilities || {};
      const parts = [];
      for (const [facilityId, details] of Object.entries(parsedFacilityDetails)) {
        if (!enabled[facilityId]) continue;
        if (!details || typeof details !== 'object') continue;
        const capacityKey = Object.keys(details).find((k) => k.endsWith('Capacity'));
        const capacityValue = capacityKey ? details[capacityKey] : null;
        if (capacityValue) parts.push(`${facilityId}: ${capacityValue} kg/day`);
      }
      return parts.length > 0 ? parts.join(', ') : null;
    };
    const productionCapacitySummary = buildProductionCapacitySummary();

    // Normalize category values to names (drop unresolvable IDs) so the DB
    // never stores raw ObjectIds that would later leak into the UI.
    const normalizedProductCategories = await normalizeCategoryValues(
      Object.keys(parsedSelectedCategories || {})
    );
    const normalizedProductTypes = await normalizeCategoryValues(
      Object.values(parsedSelectedCategories || {}).flat()
    );

    // ── Owner Profile date handling (Step 3) ──────────────────────────────
    // The form sends a full ISO date string (`businessStartDate`); the older
    // `yearEstablished` field is kept as a fallback for legacy clients. We
    // persist the full date AND derive the year so existing code/UI that
    // reads `establishedYear` keeps working without a separate migration.
    const parsedBusinessStartDate = businessStartDate
      ? new Date(businessStartDate)
      : null;
    const businessStartDateValid =
      parsedBusinessStartDate && !isNaN(parsedBusinessStartDate.getTime());
    const derivedEstablishedYear = businessStartDateValid
      ? parsedBusinessStartDate.getFullYear()
      : yearEstablished
        ? parseInt(yearEstablished, 10)
        : null;

    // Build the vendor data payload once — reused if we need to retry after a
    // unique-index collision on vendorCode (e.g. counter drift).
    const buildVendorData = (vendorCode) => ({
      vendorCode,
      email: normalizedEmail,
      password: hashedPassword,
      status: 'PENDING',

      // Owner Profile
      ownerName,
      designation: designation || null,
      ownerEmail: normalizedOwnerEmail,
      ownerEmail2: ownerEmail2 ? ownerEmail2.trim().toLowerCase() : null,
      ownerPhone,
      ownerPhone2: ownerPhone2 || null,
      ownerLandline: ownerLandline || null,
      // Owner address columns dropped from the schema — they always copied
      // the business address. Re-add only when a real owner-address input
      // ships on Step 3.
      ownerPhoto: ownerPhotoUrl,
      additionalOwners: additionalOwners ? (typeof additionalOwners === 'string' ? JSON.parse(additionalOwners) : additionalOwners) : null,
      businessStartDate: businessStartDateValid ? parsedBusinessStartDate : null,

      // Company Details
      companyName,
      companyType: getCompanyTypeEnum(parsedVendorType),
      establishedYear: derivedEstablishedYear,
      companyDescription: derivedEstablishedYear
        ? `${companyName} - ${businessType} established in ${derivedEstablishedYear}`
        : `${companyName} - ${businessType}`,
      companyLogo: logoUrl,
      companyIdNumber: companyIdNumber || null,
      panNumber: panNumber || null,
      factoryOwnershipType: factoryOwnershipType || null,

      // Contact & Trade Information
      businessPhone: phone,
      landlineNumber: landlineNumber || null,
      phoneNumber2: phoneNumber2 || null,
      businessEmail: normalizedEmail,
      businessEmail2: email2 ? email2.trim().toLowerCase() : null,
      businessAddress: address,
      addressLine2: addressLine2 || null,
      addressLine3: addressLine3 || null,
      landmark: landmark || null,
      businessCity: city,
      businessState: state,
      businessZipCode: zipCode,
      businessCountry: country || 'India',
      website,
      gstNumber: gstNumber || null,

      // Trade Information
      // annualTurnover is intentionally not set here — the form doesn't
      // collect it. Schema column is now nullable; left undefined (which
      // Prisma treats as not set, defaulting to null).
      //
      // Derive each experience flag from either the combined "yes" answer
      // OR a non-empty country list — covers the case where a vendor lists
      // countries without explicitly ticking the box.
      importExperience:
        hasImportExport === 'yes' ||
        (Array.isArray(parsedImportCountries) && parsedImportCountries.length > 0),
      exportExperience:
        hasImportExport === 'yes' ||
        (Array.isArray(parsedExportCountries) && parsedExportCountries.length > 0),
      exportCountries: parsedExportCountries || [],
      importCountries: parsedImportCountries || [],
      primaryMarkets: Array.isArray(parsedMarketType) ? parsedMarketType : (parsedMarketType ? [parsedMarketType] : []),

      // Manufacturing Facilities
      enabledFacilities: parsedEnabledFacilities || null,
      facilityDetails: parsedFacilityDetails || null,
      // Factory address mirrors warehouse address — the registration form
      // treats them as the same physical location. The QC checker app
      // (qcCheckerController, checker_app) reads these `factory*` columns
      // directly, so they must be populated even though no separate factory
      // address input exists on the form.
      factoryAddress: warehouseAddress || null,
      factoryCity: warehouseCity || null,
      factoryState: warehouseState || null,
      factoryZipCode: warehouseZip || null,
      factoryCountry: warehouseCountry || 'India',
      factorySize: warehousingCapacity ? `${warehousingCapacity} sq ft` : null,
      productionCapacity: productionCapacitySummary,
      // Quality control measures — collected on Step 6 (Certifications &
      // Logistics) but persisted under Manufacturing since the schema column
      // lives in that semantic group.
      qualityControl: qualityControlProcess || null,

      // Warehouse Details
      ownershipType: ownershipType || null,
      warehouseAddress,
      warehouseAddressLine2: warehouseAddressLine2 || null,
      warehouseAddressLine3: warehouseAddressLine3 || null,
      warehouseLandmark: warehouseLandmark || null,
      warehouseCity,
      warehouseState,
      warehouseZipCode: warehouseZip,
      warehouseCountry: warehouseCountry || 'India',
      warehouseSize: warehousingCapacity ? `${warehousingCapacity} sq ft` : null,
      storageCapacity: warehousingCapacity,
      mapLink: mapLink || null,
      ...(() => {
        const coords = parseMapLinkCoordinates(mapLink);
        return coords
          ? { factoryLatitude: coords.latitude, factoryLongitude: coords.longitude }
          : {};
      })(),

      // Vendor Type & Products
      vendorType: getVendorTypeEnum(parsedVendorType),
      vendorTypes: vendorTypesArray,
      productCategories: normalizedProductCategories,
      productTypes: normalizedProductTypes,
      // specializations is intentionally left empty here — it was previously
      // populated from Step 6's `selectedCertifications`, which is wrong.
      // Step 6 already owns certifications via the VendorCertification rows.
      specializations: [],
      categoryRemarks: categoryRemarks || null,
      categoryProducts: resolvedCategoryProducts || null,
      additionalCategories: resolvedAdditionalCategories || null,

      // Logistics Information
      shippingMethods: parsedShippingMethods || [],
      // deliveryTime / minimumOrderQuantity / paymentTerms previously had
      // hardcoded defaults ("7-15 days" / "100 pieces" / ["30 days", "LC"])
      // even though the form doesn't collect them. Removed — admin or
      // vendor settings UI can fill them later. Schema columns stay
      // nullable / default-empty.
      deliveryTime: null,
      minimumOrderQuantity: null,
      paymentTerms: [],
      // Step 6 free-text fields — collected on Certifications & Logistics
      // step. Previously destructured but never written; now persisted.
      packagingCapabilities: packagingCapabilities || null,
      logisticsPartners: logisticsPartners || null,
      complianceStandards: complianceStandards || null,

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

    // ── Certifications (Step 6) ─────────────────────────────────────────
    // Two sources feed into VendorCertification:
    //  1. Catalog certs selected via checkbox — `parsedSelectedCertifications`
    //     is an array of cert ids (oeko-tex, gots, iso-9001, …). The id is
    //     mapped to a friendly name via CERT_NAME_MAP so the DB stores
    //     "ISO 9001" not "ISO-9001". Unknown ids fall back to ID.toUpperCase().
    //  2. User-defined custom certs — `parsedOtherCertifications` is an
    //     array of { id, name, description }. These get isCustom=true so
    //     admins can distinguish them from catalog entries.
    const CERT_NAME_MAP = {
      'oeko-tex': 'OEKO-TEX',
      'gots': 'GOTS',
      'grs': 'GRS',
      'smeta': 'SMETA / Sedex',
      'iso-9001': 'ISO 9001',
      'iso-14001': 'ISO 14001',
      'bsci': 'BSCI',
      'fsc': 'FSC',
      'fair-trade': 'Fair Trade',
      'wrap': 'WRAP',
      'bci': 'BCI',
    };

    // issuedBy is now nullable — leave it null on both paths. The
    // `isCustom` flag is the proper signal for "vendor-declared vs catalog";
    // the old "Certification Authority" / "Vendor-provided" placeholder
    // strings carried no actual issuer information.
    const catalogCertRows = (parsedSelectedCertifications || []).map((certId) => ({
      vendorId: vendor.id,
      name: CERT_NAME_MAP[certId] || String(certId).toUpperCase(),
      issuedBy: null,
      expiryDate: parsedCertificationExpiryDates?.[certId]
        ? new Date(parsedCertificationExpiryDates[certId])
        : null,
      documentUrl: certificationFileUrls[certId] || null,
      isCustom: false,
    }));

    const customCertRows = Array.isArray(parsedOtherCertifications)
      ? parsedOtherCertifications
          .filter((c) => c && c.name && String(c.name).trim().length > 0)
          .map((c) => ({
            vendorId: vendor.id,
            name: String(c.name).trim(),
            issuedBy: null,
            description: c.description ? String(c.description).trim() : null,
            isCustom: true,
          }))
      : [];

    const allCertRows = [...catalogCertRows, ...customCertRows];
    if (allCertRows.length > 0) {
      await prisma.vendorCertification.createMany({ data: allCertRows });
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

    if (panCardUrl) {
      documents.push({
        vendorId: vendor.id,
        type: 'PAN_CARD',
        name: 'PAN Card',
        documentUrl: panCardUrl
      });
    }

    if (typeCertUrl) {
      // Stored under COMPANY_REGISTRATION since the actual document type
      // varies by businessType (IEC / CIN / Partnership Deed / LLPIN). The
      // `name` field carries the human-readable label for admins.
      const certLabelMap = {
        'proprietorship': 'IEC Certificate',
        'pvt-ltd': 'CIN Certificate',
        'partnership-firm': 'Partnership Deed Certificate',
        'llp': 'LLPIN Certificate',
      };
      documents.push({
        vendorId: vendor.id,
        type: 'COMPANY_REGISTRATION',
        name: certLabelMap[businessType] || 'Business Registration Certificate',
        documentUrl: typeCertUrl
      });
    }

    if (factoryImageUploads.length > 0) {
      // Slot ID → admin-facing label. Mirrors FACTORY_IMAGE_SLOTS in
      // WarehouseDetails.tsx; keep them in sync if new slots are added.
      const slotLabelMap = {
        nameBoard: 'Factory Name Board',
        frontView: 'Factory Front View',
        backView: 'Factory Back View',
        leftView: 'Factory Left View',
        rightView: 'Factory Right View',
        roadView: 'Factory Road View',
        insideFactory: 'Factory Interior',
        others: 'Factory Image (Other)',
      };
      factoryImageUploads.forEach(({ url, slotId }, index) => {
        documents.push({
          vendorId: vendor.id,
          type: 'OTHER',
          name: slotLabelMap[slotId] || `Factory Image ${index + 1}`,
          documentUrl: url,
        });
      });
    }

    if (documents.length > 0) {
      await prisma.vendorDocument.createMany({
        data: documents
      });
    }

    // ── Bank details (Step 7) ───────────────────────────────────────────
    // Persist honestly: the form collects bankName, accountNumber, swiftCode,
    // and iban — everything else stays null until the form (or admin UI)
    // adds the relevant fields. Previously the controller put `swiftCode`
    // into the `ifscCode` column (mislabeled), invented a `branchName`
    // from concatenation, copied the company address into `branchAddress`,
    // hardcoded `accountType: 'Current'`, and left `accountHolderName`
    // unset entirely — which would throw because the column was non-null.
    if (parsedBankingDetails && parsedBankingDetails.bankName) {
      await prisma.vendorBankDetails.create({
        data: {
          vendorId: vendor.id,
          bankName: parsedBankingDetails.bankName,
          accountNumber: parsedBankingDetails.accountNumber || '',
          swiftCode: parsedBankingDetails.swiftCode || null,
          iban: parsedBankingDetails.iban || null,
          ifscCode: parsedBankingDetails.ifscCode || null,
          accountType: parsedBankingDetails.accountType || null,
          accountHolderName: parsedBankingDetails.accountHolderName || null,
          branchName: parsedBankingDetails.branchName || null,
          branchAddress: parsedBankingDetails.branchAddress || null,
        },
      });
    }

    // Note: alternate contacts are NOT duplicated into VendorReference rows.
    // Earlier code created reference rows from `parsedAlternateContacts`, but
    // (a) VendorReference is for *external trade references* (Clients /
    // Suppliers / Partners), not the vendor's own additional contacts, and
    // (b) the alt contact data is already persisted in full on the vendor
    // row's `alternateContacts` Json[] column. Keep the model unused here
    // and reserve it for an actual references feature later.

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
    }).catch(() => { });

    // Send email to all admins about new registration
    sendNewVendorRegistrationEmailToAdmins({
      companyName: vendor.companyName,
      ownerName: vendor.ownerName || ownerName,
      vendorEmail: vendor.email,
      vendorPhone: vendor.businessPhone,
      city: vendor.businessCity,
      state: vendor.businessState
    }).catch(() => { });

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
    // Any failure after files were uploaded leaves orphans in Cloudinary.
    // `uploadedPublicIds` is hoisted to function scope above the try so
    // it's always accessible here, even when the failure happens before
    // the inner upload block runs (in which case the array is empty and
    // cleanup is a no-op).
    cleanupOrphanedCloudinaryAssets(uploadedPublicIds);
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

      // Calculate completion percentage based on actual filled data
      const hasValue = (v) => v !== null && v !== undefined && v !== '' && v !== 0;
      const hasArray = (v) => Array.isArray(v) && v.length > 0;
      const hasObj = (v) => v && typeof v === 'object' && Object.keys(v).length > 0;

      const sections = [
        // 1. Company Details
        {
          fields: [vendor.companyName, vendor.gstNumber, vendor.businessEmail, vendor.businessPhone, vendor.businessAddress, vendor.businessCity, vendor.businessState, vendor.businessCountry],
          check: (f) => f.filter(hasValue).length / f.length
        },
        // 2. Warehouse
        {
          fields: [vendor.warehouseAddress, vendor.warehouseCity, vendor.warehouseState, vendor.warehouseCountry],
          check: (f) => f.filter(hasValue).length / f.length
        },
        // 3. Owner Profile
        {
          fields: [vendor.ownerName, vendor.ownerEmail, vendor.ownerPhone, vendor.establishedYear, vendor.annualTurnover],
          check: (f) => f.filter(hasValue).length / f.length
        },
        // 4. Vendor Type & Products
        {
          fields: [vendor.vendorType, vendor.productCategories],
          check: () => {
            let score = 0, total = 2;
            if (hasValue(vendor.vendorType)) score++;
            if (hasArray(vendor.productCategories)) score++;
            return score / total;
          }
        },
        // 5. Manufacturing Facilities (optional for non-manufacturers)
        {
          fields: [],
          check: () => {
            const isManufacturer = vendor.vendorType === 'manufacturer' || (Array.isArray(vendor.vendorType) && vendor.vendorType.includes('manufacturer'));
            if (!isManufacturer) return 1; // skip = full credit
            return hasObj(vendor.facilityDetails) ? 1 : 0;
          }
        },
        // 6. Certifications & Logistics
        {
          fields: [],
          check: () => {
            let score = 0, total = 2;
            if (vendor.certifications && vendor.certifications.length > 0) score++;
            if (hasArray(vendor.shippingMethods)) score++;
            return score / total;
          }
        },
        // 7. Contact & Trade Info
        {
          fields: [],
          check: () => {
            if (!vendor.mainContact) return 0;
            const mc = typeof vendor.mainContact === 'string' ? JSON.parse(vendor.mainContact) : vendor.mainContact;
            const contactFields = [mc.name, mc.email || mc.email1, mc.phone || mc.phone1, mc.department];
            return contactFields.filter(hasValue).length / contactFields.length;
          }
        },
        // 8. Review & Submit
        {
          fields: [],
          check: () => hasValue(vendor.submittedAt) ? 1 : 0
        }
      ];

      const sectionScores = sections.map(s => typeof s.check === 'function' ? s.check(s.fields) : 0);
      const completionPercentage = Math.round((sectionScores.reduce((sum, s) => sum + s, 0) / sections.length) * 100);

      return {
        ...rest,
        productCategories: resolveAndClean(vendor.productCategories),
        productTypes: resolveAndClean(vendor.productTypes),
        latestInspection: inspections?.[0] || null,
        completionPercentage: vendor.status === 'APPROVED' ? 100 : completionPercentage,
        password: undefined,
      };
    });

    // Resolve employee names for pending approval/rejection requests
    const requestedByIds = [
      ...formattedVendors.map(v => v.approvalRequestedBy),
      ...formattedVendors.map(v => v.rejectionRequestedBy)
    ].filter(Boolean);

    let adminNameMap = {};
    if (requestedByIds.length > 0) {
      const admins = await prisma.admin.findMany({
        where: { id: { in: [...new Set(requestedByIds)] } },
        select: { id: true, name: true, email: true }
      });
      adminNameMap = admins.reduce((acc, a) => { acc[a.id] = a.name || a.email; return acc; }, {});
    }

    const vendorsWithNames = formattedVendors.map(v => ({
      ...v,
      approvalRequestedByName: v.approvalRequestedBy ? (adminNameMap[v.approvalRequestedBy] || 'Unknown') : null,
      rejectionRequestedByName: v.rejectionRequestedBy ? (adminNameMap[v.rejectionRequestedBy] || 'Unknown') : null,
    }));

    res.json({
      vendors: vendorsWithNames,
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

    // Resolve employee names for pending requests
    let approvalRequestedByName = null;
    let rejectionRequestedByName = null;
    const requestIds = [vendor.approvalRequestedBy, vendor.rejectionRequestedBy].filter(Boolean);
    if (requestIds.length > 0) {
      const admins = await prisma.admin.findMany({
        where: { id: { in: requestIds } },
        select: { id: true, name: true, email: true }
      });
      const nameMap = admins.reduce((acc, a) => { acc[a.id] = a.name || a.email; return acc; }, {});
      if (vendor.approvalRequestedBy) approvalRequestedByName = nameMap[vendor.approvalRequestedBy] || 'Unknown';
      if (vendor.rejectionRequestedBy) rejectionRequestedByName = nameMap[vendor.rejectionRequestedBy] || 'Unknown';
    }

    res.json({
      vendor: {
        ...vendor,
        productCategories: resolveAndClean(vendor.productCategories),
        productTypes: resolveAndClean(vendor.productTypes),
        approvalRequestedByName,
        rejectionRequestedByName,
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
    const parsedImportCountries = typeof updateData.importCountries === 'string'
      ? JSON.parse(updateData.importCountries)
      : updateData.importCountries;
    const parsedOtherCertifications = typeof updateData.otherCertifications === 'string'
      ? JSON.parse(updateData.otherCertifications)
      : updateData.otherCertifications;
    const parsedCategoryProducts = typeof updateData.categoryProducts === 'string'
      ? JSON.parse(updateData.categoryProducts)
      : updateData.categoryProducts;
    const parsedAdditionalCategories = typeof updateData.additionalCategories === 'string'
      ? JSON.parse(updateData.additionalCategories)
      : updateData.additionalCategories;
    const parsedBankingDetails = typeof updateData.bankingDetails === 'string'
      ? JSON.parse(updateData.bankingDetails)
      : updateData.bankingDetails;

    // Resolve any base64 product photos to Cloudinary URLs before persist —
    // same pipeline as the registration flow uses for Step 4 photos.
    const resolvedCategoryProducts = await resolveBase64InValue(
      parsedCategoryProducts,
      { folder: 'vendor-product-photos', resource_type: 'image' },
    );
    const resolvedAdditionalCategories = await resolveBase64InValue(
      parsedAdditionalCategories,
      { folder: 'vendor-product-photos', resource_type: 'image' },
    );

    // Mirror registration path: keep the raw multi-select array alongside
    // the legacy single-enum derivation so multi-role vendors aren't lossy.
    const vendorTypesArray = Array.isArray(parsedVendorType)
      ? parsedVendorType.filter((v) => typeof v === 'string' && v.length > 0)
      : parsedVendorType
        ? [parsedVendorType]
        : [];

    // Parse businessStartDate + derive establishedYear (same pattern as
    // registerVendor — full date column preferred, year-only for back-compat).
    const parsedBusinessStartDate = updateData.businessStartDate
      ? new Date(updateData.businessStartDate)
      : null;
    const businessStartDateValid =
      parsedBusinessStartDate && !isNaN(parsedBusinessStartDate.getTime());
    const derivedEstablishedYear = businessStartDateValid
      ? parsedBusinessStartDate.getFullYear()
      : updateData.yearEstablished
        ? parseInt(updateData.yearEstablished, 10)
        : null;

    // Production capacity summary derived from enabled facilities — same
    // helper logic as registerVendor (find *Capacity keys per facility).
    const buildProductionCapacityForUpdate = () => {
      const enabledRaw = typeof updateData.enabledFacilities === 'string'
        ? JSON.parse(updateData.enabledFacilities)
        : updateData.enabledFacilities;
      const detailsRaw = typeof updateData.facilityDetails === 'string'
        ? JSON.parse(updateData.facilityDetails)
        : updateData.facilityDetails;
      if (!detailsRaw || typeof detailsRaw !== 'object') return null;
      const enabled = enabledRaw || {};
      const parts = [];
      for (const [facilityId, details] of Object.entries(detailsRaw)) {
        if (!enabled[facilityId]) continue;
        if (!details || typeof details !== 'object') continue;
        const capacityKey = Object.keys(details).find((k) => k.endsWith('Capacity'));
        const capacityValue = capacityKey ? details[capacityKey] : null;
        if (capacityValue) parts.push(`${facilityId}: ${capacityValue} kg/day`);
      }
      return parts.length > 0 ? parts.join(', ') : null;
    };
    const updateProductionCapacity = buildProductionCapacityForUpdate();

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
      companyIdNumber: updateData.companyIdNumber || null,
      panNumber: updateData.panNumber || null,
      businessEmail: updateData.email,
      businessEmail2: updateData.email2 || null,
      businessPhone: updateData.phone,
      landlineNumber: updateData.landlineNumber || null,
      phoneNumber2: updateData.phoneNumber2 || null,
      website: updateData.website,
      businessAddress: updateData.address,
      addressLine2: updateData.addressLine2 || null,
      addressLine3: updateData.addressLine3 || null,
      landmark: updateData.landmark || null,
      businessCity: updateData.city,
      businessState: updateData.state,
      businessZipCode: updateData.zipCode || null,
      businessCountry: updateData.country || 'India',
      factoryOwnershipType: updateData.factoryOwnershipType || null,

      // Owner Profile
      ownerName: updateData.ownerName,
      designation: updateData.designation || null,
      ownerEmail: updateData.ownerEmail,
      ownerEmail2: updateData.ownerEmail2 || null,
      ownerPhone: updateData.ownerPhone,
      ownerPhone2: updateData.ownerPhone2 || null,
      ownerLandline: updateData.ownerLandline || null,
      ...(updateData.additionalOwners !== undefined && {
        additionalOwners: typeof updateData.additionalOwners === 'string' ? JSON.parse(updateData.additionalOwners) : updateData.additionalOwners
      }),
      businessStartDate: businessStartDateValid ? parsedBusinessStartDate : null,
      establishedYear: derivedEstablishedYear,
      // annualTurnover deliberately not set here — the admin form doesn't
      // collect a real turnover value. The previous `employeeCount` proxy
      // was semantic nonsense ("10-20" is a headcount range, not money).

      // Warehouse Details
      ...(updateData.enabledFacilities !== undefined && {
        enabledFacilities: typeof updateData.enabledFacilities === 'string' ? JSON.parse(updateData.enabledFacilities) : updateData.enabledFacilities
      }),
      ...(updateData.facilityDetails !== undefined && {
        facilityDetails: typeof updateData.facilityDetails === 'string' ? JSON.parse(updateData.facilityDetails) : updateData.facilityDetails
      }),
      ownershipType: updateData.ownershipType || null,
      warehouseAddress: updateData.warehouseAddress,
      warehouseAddressLine2: updateData.warehouseAddressLine2 || null,
      warehouseAddressLine3: updateData.warehouseAddressLine3 || null,
      warehouseLandmark: updateData.warehouseLandmark || null,
      warehouseCity: updateData.warehouseCity,
      warehouseState: updateData.warehouseState,
      warehouseZipCode: updateData.warehouseZip || null,
      warehouseCountry: updateData.warehouseCountry || 'India',
      warehouseSize: updateData.warehousingCapacity ? `${updateData.warehousingCapacity} sq ft` : null,
      // Mirror to the `factory*` columns the checker app reads from —
      // the CREATE flow mirrors these, the UPDATE flow used to forget,
      // so changing a vendor's address in admin left the checker app
      // showing the old one.
      factoryAddress: updateData.warehouseAddress,
      factoryCity: updateData.warehouseCity,
      factoryState: updateData.warehouseState,
      factoryZipCode: updateData.warehouseZip || null,
      factorySize: updateData.warehousingCapacity ? `${updateData.warehousingCapacity} sq ft` : null,
      productionCapacity: updateProductionCapacity,
      storageCapacity: updateData.warehousingCapacity,
      mapLink: updateData.mapLink || null,
      ...(() => {
        const coords = parseMapLinkCoordinates(updateData.mapLink);
        return coords
          ? { factoryLatitude: coords.latitude, factoryLongitude: coords.longitude }
          : {};
      })(),

      // Vendor Type & Products
      vendorType: getCompanyTypeEnum(parsedVendorType) === 'MANUFACTURER'
        ? 'TEXTILE_MANUFACTURER'
        : 'TRADING_COMPANY',
      vendorTypes: vendorTypesArray,
      primaryMarkets: parsedMarketType || [],
      productCategories: normalizedProductCategories,
      productTypes: normalizedProductTypes,
      categoryRemarks: updateData.categoryRemarks || null,
      categoryProducts: resolvedCategoryProducts || null,
      additionalCategories: resolvedAdditionalCategories || null,

      // Logistics
      shippingMethods: parsedShippingMethods || [],
      qualityControl: updateData.qualityControlProcess,
      packagingCapabilities: updateData.packagingCapabilities || null,
      logisticsPartners: updateData.logisticsPartners || null,
      complianceStandards: updateData.complianceStandards || null,

      // Trade Info — mirror the registration-path derivation: either the
      // combined "yes" answer OR a non-empty country list flips the flag.
      importExperience:
        updateData.hasImportExport === 'yes' ||
        (Array.isArray(parsedImportCountries) && parsedImportCountries.length > 0),
      exportExperience:
        updateData.hasImportExport === 'yes' ||
        (Array.isArray(parsedExportCountries) && parsedExportCountries.length > 0),
      exportCountries: parsedExportCountries || [],
      importCountries: parsedImportCountries || [],

      // Contact & Trade Information
      mainContact: updateData.mainContact ? (typeof updateData.mainContact === 'string' ? JSON.parse(updateData.mainContact) : updateData.mainContact) : null,
      alternateContacts: updateData.alternateContacts ? (typeof updateData.alternateContacts === 'string' ? JSON.parse(updateData.alternateContacts) : updateData.alternateContacts) : [],
      tradeLicenseNumber: updateData.tradeLicenseNumber || null,
      businessRegistrationNumber: updateData.businessRegistrationNumber || null,
      taxIdentificationNumber: updateData.taxIdentificationNumber || null,

      // Status (admin can update these)
      status: updateData.status?.toUpperCase() || existingVendor.status
    };

    // ── Bank details upsert (admin update path) ─────────────────────────
    // The previous version of this controller never touched bank info on
    // update — admin edits to bankName/accountNumber/swiftCode/iban were
    // silently dropped. Use upsert so the row is created on first save
    // and updated thereafter.
    if (parsedBankingDetails && parsedBankingDetails.bankName) {
      await prisma.vendorBankDetails.upsert({
        where: { vendorId },
        create: {
          vendorId,
          bankName: parsedBankingDetails.bankName,
          accountNumber: parsedBankingDetails.accountNumber || '',
          swiftCode: parsedBankingDetails.swiftCode || null,
          iban: parsedBankingDetails.iban || null,
          ifscCode: parsedBankingDetails.ifscCode || null,
          accountType: parsedBankingDetails.accountType || null,
          accountHolderName: parsedBankingDetails.accountHolderName || null,
          branchName: parsedBankingDetails.branchName || null,
          branchAddress: parsedBankingDetails.branchAddress || null,
        },
        update: {
          bankName: parsedBankingDetails.bankName,
          accountNumber: parsedBankingDetails.accountNumber || '',
          swiftCode: parsedBankingDetails.swiftCode || null,
          iban: parsedBankingDetails.iban || null,
          ifscCode: parsedBankingDetails.ifscCode || null,
          accountType: parsedBankingDetails.accountType || null,
          accountHolderName: parsedBankingDetails.accountHolderName || null,
          branchName: parsedBankingDetails.branchName || null,
          branchAddress: parsedBankingDetails.branchAddress || null,
        },
      });
    }

    // Handle factory images update
    // Parse existing factory image URLs the frontend wants to keep
    const existingFactoryImages = updateData.existingFactoryImages
      ? (typeof updateData.existingFactoryImages === 'string'
          ? JSON.parse(updateData.existingFactoryImages)
          : updateData.existingFactoryImages)
      : [];

    // Upload new factory images if provided
    let newFactoryImageUrls = [];
    if (req.files?.factoryImages) {
      try {
        const factoryResults = await uploadFiles(req.files.factoryImages, 'vendor-factories');
        newFactoryImageUrls = factoryResults.map(result => result.cloudinaryUrl);
        console.log('Uploaded new factory images:', newFactoryImageUrls);
      } catch (uploadError) {
        console.error('Factory image upload error:', uploadError);
        return res.status(500).json({
          error: 'Failed to upload factory images: ' + uploadError.message
        });
      }
    }

    // Delete factory image documents that are no longer in the existing list
    const currentFactoryDocs = await prisma.vendorDocument.findMany({
      where: {
        vendorId,
        type: 'OTHER',
        name: { contains: 'Factory' }
      }
    });

    const docsToDelete = currentFactoryDocs.filter(
      doc => !existingFactoryImages.includes(doc.documentUrl)
    );
    if (docsToDelete.length > 0) {
      // Clean up Cloudinary files (non-blocking, best-effort)
      for (const doc of docsToDelete) {
        try {
          const publicId = doc.documentUrl.split('/').pop().split('.')[0];
          await deleteFromCloudinary(`vendor-factories/${publicId}`);
        } catch (deleteError) {
          console.warn('Failed to delete factory image from Cloudinary:', deleteError.message);
        }
      }
      await prisma.vendorDocument.deleteMany({
        where: { id: { in: docsToDelete.map(d => d.id) } }
      });
    }

    // Create new factory image documents
    if (newFactoryImageUrls.length > 0) {
      const existingCount = existingFactoryImages.length;
      const newDocs = newFactoryImageUrls.map((url, index) => ({
        vendorId,
        type: 'OTHER',
        name: `Factory Image ${existingCount + index + 1}`,
        documentUrl: url
      }));
      await prisma.vendorDocument.createMany({ data: newDocs });
    }

    // Handle product photos update (stored as VendorDocument with type 'PRODUCT_PHOTO')
    const existingProductPhotos = updateData.existingProductPhotos
      ? (typeof updateData.existingProductPhotos === 'string'
          ? JSON.parse(updateData.existingProductPhotos)
          : updateData.existingProductPhotos)
      : [];

    let newProductPhotoUrls = [];
    if (req.files?.productPhotos) {
      try {
        const productPhotoResults = await uploadFiles(req.files.productPhotos, 'vendor-product-photos');
        newProductPhotoUrls = productPhotoResults.map(result => result.cloudinaryUrl);
        console.log('Uploaded new product photos:', newProductPhotoUrls);
      } catch (uploadError) {
        console.error('Product photo upload error:', uploadError);
        return res.status(500).json({
          error: 'Failed to upload product photos: ' + uploadError.message
        });
      }
    }

    // Delete product photo documents that are no longer in the existing list
    const currentProductDocs = await prisma.vendorDocument.findMany({
      where: {
        vendorId,
        type: 'OTHER',
        name: { startsWith: 'Product Photo' }
      }
    });

    const productDocsToDelete = currentProductDocs.filter(
      doc => !existingProductPhotos.includes(doc.documentUrl)
    );
    if (productDocsToDelete.length > 0) {
      for (const doc of productDocsToDelete) {
        try {
          const publicId = doc.documentUrl.split('/').pop().split('.')[0];
          await deleteFromCloudinary(`vendor-product-photos/${publicId}`);
        } catch (deleteError) {
          console.warn('Failed to delete product photo from Cloudinary:', deleteError.message);
        }
      }
      await prisma.vendorDocument.deleteMany({
        where: { id: { in: productDocsToDelete.map(d => d.id) } }
      });
    }

    // Create new product photo documents
    if (newProductPhotoUrls.length > 0) {
      const existingCount = existingProductPhotos.length;
      const newDocs = newProductPhotoUrls.map((url, index) => ({
        vendorId,
        type: 'OTHER',
        name: `Product Photo ${existingCount + index + 1}`,
        documentUrl: url
      }));
      await prisma.vendorDocument.createMany({ data: newDocs });
    }

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

      // Same cert-name map used by the registration path — keep them in
      // sync. Falls back to ID.toUpperCase() for unknown / legacy ids.
      const CERT_NAME_MAP = {
        'oeko-tex': 'OEKO-TEX',
        'gots': 'GOTS',
        'grs': 'GRS',
        'smeta': 'SMETA / Sedex',
        'iso-9001': 'ISO 9001',
        'iso-14001': 'ISO 14001',
        'bsci': 'BSCI',
        'fsc': 'FSC',
        'fair-trade': 'Fair Trade',
        'wrap': 'WRAP',
        'bci': 'BCI',
      };

      // Catalog certs
      const catalogRows = parsedSelectedCertifications.map((certId) => ({
        vendorId,
        name: CERT_NAME_MAP[certId] || String(certId).toUpperCase(),
        issuedBy: null, // schema is nullable; isCustom flag distinguishes catalog vs custom
        expiryDate: parsedCertificationExpiryDates?.[certId]
          ? new Date(parsedCertificationExpiryDates[certId])
          : null,
        // Use new uploaded file URL, or preserve existing URL, or null
        documentUrl: certificationFileUrls[certId] || existingCertUrls[certId] || null,
        isCustom: false,
      }));

      // Custom certs (Step 6 "other certifications") — vendor-typed name +
      // description. Created with isCustom=true so admins can distinguish
      // them from catalog entries.
      const customRows = Array.isArray(parsedOtherCertifications)
        ? parsedOtherCertifications
            .filter((c) => c && c.name && String(c.name).trim().length > 0)
            .map((c) => ({
              vendorId,
              name: String(c.name).trim(),
              issuedBy: null,
              description: c.description ? String(c.description).trim() : null,
              isCustom: true,
            }))
        : [];

      const allRows = [...catalogRows, ...customRows];
      if (allRows.length > 0) {
        await prisma.vendorCertification.createMany({ data: allRows });
      }
    }

    // Bank details are upserted earlier in this function (see the
    // `vendorBankDetails.upsert` block right after vendorUpdateData is
    // assembled). The legacy fallback that stuffed swiftCode into ifscCode
    // and invented branch values has been removed.

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
      error: 'Failed to update vendor. Please try again.',
      details: error.message
    });
  }
};

// Approve vendor
const approveVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (existingVendor.status === 'APPROVED') {
      return res.status(400).json({ error: 'Vendor is already approved' });
    }

    // Check if user is Super Admin — direct approve
    const isSuperAdmin = (req.user.roleName || '').toLowerCase().trim() === 'super admin';

    if (isSuperAdmin) {
      // Super Admin: direct approval
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
            rejectionRequestedBy: null,
            rejectionRequestedAt: null,
            approvalRequestedBy: null,
            approvalRequestedAt: null,
            password: hashedPassword
          }
        });

        const inspections = await finalizeInspectionsForVendor(tx, vendorId, { decision: 'APPROVED' });
        return { vendor: updatedVendor, finalizedInspections: inspections };
      });

      // Audit logs: fire-and-forget, outside transaction
      if (finalizedInspections) {
        writeInspectionAuditLogs(finalizedInspections, { decision: 'APPROVED', adminId, adminName });
      }

      try {
        await sendVendorApprovalEmail({
          companyName: vendor.companyName,
          ownerName: vendor.ownerName,
          email: vendor.email,
          password: temporaryPassword
        });
        console.log(`✅ Approval email sent to ${vendor.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send approval email:', emailError);
      }

      const { createNotification: createVendorNotif } = require('./notificationController');
      createVendorNotif({
        userId: vendor.id, role: 'VENDOR', type: 'VENDOR_STATUS_CHANGED',
        title: 'Vendor Application Approved',
        message: `Congratulations! Your vendor application for "${vendor.companyName}" has been approved.`,
      }).catch(() => { });

      res.json({
        message: 'Vendor approved successfully and credentials sent via email',
        vendor: { ...vendor, password: undefined }
      });
    } else {
      // Employee/Admin: approval goes to pending — needs Super Admin confirmation
      const vendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'APPROVAL_PENDING',
          approvalRequestedBy: req.user.id,
          approvalRequestedAt: new Date()
        }
      });

      const { createNotificationForRole } = require('./notificationController');
      createNotificationForRole({
        role: 'ADMIN',
        type: 'VENDOR_APPROVAL_PENDING',
        title: 'Vendor Approval Pending Confirmation',
        message: `Employee requested approval of "${vendor.companyName}". Awaiting Super Admin confirmation.`,
        data: { vendorId: vendor.id }
      }).catch(() => { });

      res.json({
        message: 'Approval request submitted. Awaiting Super Admin confirmation.',
        vendor: { ...vendor, password: undefined }
      });
    }
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Confirm vendor approval (Super Admin only)
const confirmApproval = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const isSuperAdmin = (req.user.roleName || '').toLowerCase().trim() === 'super admin';
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Only Super Admin can confirm vendor approvals' });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (existingVendor.status !== 'APPROVAL_PENDING') {
      return res.status(400).json({ error: 'Vendor is not in approval pending state' });
    }

    const temporaryPassword = generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
    const adminId = req.user?.id || req.userId;
    const adminName = req.user?.name || req.user?.email;

    const { vendor, finalizedInspections } = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
          approvalRequestedBy: null,
          approvalRequestedAt: null,
          password: hashedPassword
        }
      });

      const inspections = await finalizeInspectionsForVendor(tx, vendorId, { decision: 'APPROVED' });
      return { vendor: updatedVendor, finalizedInspections: inspections };
    });

    if (finalizedInspections) {
      writeInspectionAuditLogs(finalizedInspections, { decision: 'APPROVED', adminId, adminName });
    }

    try {
      await sendVendorApprovalEmail({
        companyName: vendor.companyName,
        ownerName: vendor.ownerName,
        email: vendor.email,
        password: temporaryPassword
      });
      console.log(`✅ Approval email sent to ${vendor.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send approval email:', emailError);
    }

    const { createNotification } = require('./notificationController');
    createNotification({
      userId: vendor.id, role: 'VENDOR', type: 'VENDOR_STATUS_CHANGED',
      title: 'Vendor Application Approved',
      message: `Congratulations! Your vendor application for "${vendor.companyName}" has been approved.`,
    }).catch(() => { });

    if (existingVendor.approvalRequestedBy) {
      createNotification({
        userId: existingVendor.approvalRequestedBy,
        role: 'ADMIN',
        type: 'VENDOR_APPROVAL_CONFIRMED',
        title: 'Vendor Approval Confirmed',
        message: `Your approval of "${vendor.companyName}" has been confirmed by Super Admin.`,
        data: { vendorId: vendor.id }
      }).catch(() => { });
    }

    res.json({
      message: 'Vendor approval confirmed. Credentials sent via email.',
      vendor: { ...vendor, password: undefined }
    });
  } catch (error) {
    console.error('Confirm approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel vendor approval (Super Admin only)
const cancelApproval = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const isSuperAdmin = (req.user.roleName || '').toLowerCase().trim() === 'super admin';
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Only Super Admin can cancel vendor approvals' });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (existingVendor.status !== 'APPROVAL_PENDING') {
      return res.status(400).json({ error: 'Vendor is not in approval pending state' });
    }

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'PENDING',
        approvalRequestedBy: null,
        approvalRequestedAt: null
      }
    });

    if (existingVendor.approvalRequestedBy) {
      const { createNotification } = require('./notificationController');
      createNotification({
        userId: existingVendor.approvalRequestedBy,
        role: 'ADMIN',
        type: 'VENDOR_APPROVAL_CANCELLED',
        title: 'Vendor Approval Cancelled',
        message: `Your approval of "${vendor.companyName}" was overturned by Super Admin. Vendor restored to Pending.`,
        data: { vendorId: vendor.id }
      }).catch(() => { });
    }

    res.json({
      message: 'Approval cancelled. Vendor restored to Pending status.',
      vendor: { ...vendor, password: undefined }
    });
  } catch (error) {
    console.error('Cancel approval error:', error);
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

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Check if user is Super Admin — direct reject
    const isSuperAdmin = (req.user.roleName || '').toLowerCase().trim() === 'super admin';

    if (isSuperAdmin) {
      // Super Admin: direct rejection with inspection finalization
      const adminId = req.user?.id || req.userId;
      const adminName = req.user?.name || req.user?.email;

      const { vendor, finalizedInspections } = await prisma.$transaction(async (tx) => {
        const updatedVendor = await tx.vendor.update({
          where: { id: vendorId },
          data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
            rejectionReason: reason,
            rejectionRequestedBy: null,
            rejectionRequestedAt: null,
            approvedAt: null
          }
        });

        const inspections = await finalizeInspectionsForVendor(tx, vendorId, { decision: 'REJECTED' });
        return { vendor: updatedVendor, finalizedInspections: inspections };
      });

      // Audit logs: fire-and-forget, outside transaction
      if (finalizedInspections) {
        writeInspectionAuditLogs(finalizedInspections, { decision: 'REJECTED', adminId, adminName, reason });
      }

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
      }

      res.json({
        message: 'Vendor rejected successfully and notification sent via email',
        vendor: { ...vendor, password: undefined }
      });
    } else {
      // Employee/Admin: rejection goes to pending — needs Super Admin confirmation
      const vendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'REJECTION_PENDING',
          rejectionReason: reason,
          rejectionRequestedBy: req.user.id,
          rejectionRequestedAt: new Date()
        }
      });

      // Notify all admins about pending rejection
      const { createNotificationForRole } = require('./notificationController');
      createNotificationForRole({
        role: 'ADMIN',
        type: 'VENDOR_REJECTION_PENDING',
        title: 'Vendor Rejection Pending Approval',
        message: `Employee requested rejection of "${vendor.companyName}". Reason: ${reason}`,
        data: { vendorId: vendor.id }
      }).catch(() => {});

      res.json({
        message: 'Rejection request submitted. Awaiting Super Admin confirmation.',
        vendor: { ...vendor, password: undefined }
      });
    }
  } catch (error) {
    console.error('Reject vendor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Confirm vendor rejection (Super Admin only)
const confirmRejection = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Only Super Admin can confirm
    const isSuperAdmin = (req.user.roleName || '').toLowerCase().trim() === 'super admin';
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Only Super Admin can confirm vendor rejections' });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (existingVendor.status !== 'REJECTION_PENDING') {
      return res.status(400).json({ error: 'Vendor is not in rejection pending state' });
    }

    const adminId = req.user?.id || req.userId;
    const adminName = req.user?.name || req.user?.email;

    const { vendor, finalizedInspections } = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          approvedAt: null
        }
      });

      const inspections = await finalizeInspectionsForVendor(tx, vendorId, { decision: 'REJECTED' });
      return { vendor: updatedVendor, finalizedInspections: inspections };
    });

    if (finalizedInspections) {
      writeInspectionAuditLogs(finalizedInspections, { decision: 'REJECTED', adminId, adminName, reason: vendor.rejectionReason });
    }

    // Send rejection email to vendor
    try {
      await sendVendorRejectionEmail({
        companyName: vendor.companyName,
        ownerName: vendor.ownerName,
        email: vendor.email,
        reason: vendor.rejectionReason || 'Application rejected'
      });
      console.log(`✅ Rejection email sent to ${vendor.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send rejection email:', emailError);
    }

    // Notify the employee who requested the rejection
    if (vendor.rejectionRequestedBy) {
      const { createNotification } = require('./notificationController');
      createNotification({
        userId: vendor.rejectionRequestedBy,
        role: 'ADMIN',
        type: 'VENDOR_REJECTION_CONFIRMED',
        title: 'Vendor Rejection Confirmed',
        message: `Your rejection of "${vendor.companyName}" has been confirmed by Super Admin.`,
        data: { vendorId: vendor.id }
      }).catch(() => { });
    }

    res.json({
      message: 'Vendor rejection confirmed. Email sent to vendor.',
      vendor: { ...vendor, password: undefined }
    });
  } catch (error) {
    console.error('Confirm rejection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel vendor rejection (Super Admin only)
const cancelRejection = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Only Super Admin can cancel
    const isSuperAdmin = (req.user.roleName || '').toLowerCase().trim() === 'super admin';
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Only Super Admin can cancel vendor rejections' });
    }

    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!existingVendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    if (existingVendor.status !== 'REJECTION_PENDING') {
      return res.status(400).json({ error: 'Vendor is not in rejection pending state' });
    }

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'PENDING',
        rejectionReason: null,
        rejectionRequestedBy: null,
        rejectionRequestedAt: null
      }
    });

    // Notify the employee who requested the rejection
    if (existingVendor.rejectionRequestedBy) {
      const { createNotification } = require('./notificationController');
      createNotification({
        userId: existingVendor.rejectionRequestedBy,
        role: 'ADMIN',
        type: 'VENDOR_REJECTION_CANCELLED',
        title: 'Vendor Rejection Cancelled',
        message: `Your rejection of "${vendor.companyName}" was overturned by Super Admin. Vendor restored to Pending.`,
        data: { vendorId: vendor.id }
      }).catch(() => { });
    }

    res.json({
      message: 'Rejection cancelled. Vendor restored to Pending status.',
      vendor: { ...vendor, password: undefined }
    });
  } catch (error) {
    console.error('Cancel rejection error:', error);
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
    }).catch(() => { });

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

    // Case-insensitive lookup — registration normalizes the email before
    // insert, so we normalize the login attempt the same way.
    const normalizedEmail = email.trim().toLowerCase();
    const vendor = await prisma.vendor.findUnique({
      where: { email: normalizedEmail }
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

    // Notify the QC checker — in-app feed + FCM push
    const { createNotification: createAssignNotif } = require('./notificationController');
    createAssignNotif({
      userId: checkerId, role: 'QC_CHECKER', type: 'VENDOR_ASSIGNED',
      title: 'New Vendor Assigned',
      message: `"${vendor.companyName}" has been assigned to you for inspection.`,
      data: { screen: 'vendors', vendorId }
    }).catch(() => {});

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
  confirmApproval,
  cancelApproval,
  rejectVendor,
  confirmRejection,
  cancelRejection,
  suspendVendor,
  vendorLogin,
  testVendorEmail,
  assignQc,
  verifyVendorBankDetails
};