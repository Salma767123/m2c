/**
 * seedQAVendor.js — Creates a fully-populated QA test vendor.
 *
 * Every registration field is set to a realistic dummy value so the record
 * looks 100% complete across every panel.
 *
 * The vendor is intentionally left in APPROVAL_PENDING status — all 8
 * registration steps are complete and submitted, but no Admin Approval has
 * been performed and no QC Checker has been assigned. This is the correct
 * starting state for testing the full inspection workflow.
 *
 * Run:   node prisma/seedQAVendor.js
 * Safe:  idempotent — re-running resets status to APPROVAL_PENDING if the
 *        vendor already exists in a later state (e.g. from a previous seed).
 *
 * Credentials written to stdout after the run.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ── Demo Cloudinary URLs (Cloudinary public demo account — always resolves) ──
const IMG = {
  logo:          'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/sample',
  ownerPhoto:    'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/woman',
  contactPhoto1: 'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/man',
  contactPhoto2: 'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/woman',
  factory1:      'https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_fill/manufacturing',
  factory2:      'https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_fill/factory',
  product1a:     'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/sample',
  product1b:     'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-2',
  product2a:     'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-3',
  product2b:     'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-4',
  product3a:     'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-5',
  product4a:     'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/sample',
  cert1:         'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/sample',
  cert2:         'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-2',
  cert3:         'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-3',
  doc1:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/sample',
  doc2:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-2',
  doc3:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-3',
  doc4:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-4',
  doc5:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-5',
};

// ── Constants ────────────────────────────────────────────────────────────────
const VENDOR_EMAIL    = 'qa-vendor@m2c.dev';
const VENDOR_PASSWORD = 'Vendor@1234';

async function main() {
  console.log('🌱  Seeding QA Vendor…\n');

  // ── 1. Vendor ─────────────────────────────────────────────────────────────
  let vendor = await prisma.vendor.findUnique({ where: { email: VENDOR_EMAIL } });

  if (vendor) {
    // Reset to pre-approval state so the full workflow can be tested from scratch
    vendor = await prisma.vendor.update({
      where: { email: VENDOR_EMAIL },
      data: {
        status:       'APPROVAL_PENDING',
        approvedAt:   null,
        assignedQcId: null,
      },
    });
    console.log(`✅  QA Vendor already exists — reset to APPROVAL_PENDING (${vendor.email})`);
  } else {
    const hashedPw = await bcrypt.hash(VENDOR_PASSWORD, 10);

    // Derive next vendor code
    const lastVendor = await prisma.vendor.findFirst({
      where:   { vendorCode: { not: null } },
      orderBy: { createdAt: 'desc' },
      select:  { vendorCode: true },
    });
    const year = new Date().getFullYear();
    let seq = 1;
    if (lastVendor?.vendorCode) {
      const m = lastVendor.vendorCode.match(/VND-\d{4}-(\d+)/);
      if (m) seq = parseInt(m[1]) + 1;
    }
    const vendorCode = `VND-${year}-${seq.toString().padStart(4, '0')}`;

    vendor = await prisma.vendor.create({
      data: {
        // ── Identity ───────────────────────────────────────────────────────
        vendorCode,
        email:    VENDOR_EMAIL,
        password: hashedPw,

        // ── Status — submitted, awaiting admin action ───────────────────────
        // All 8 steps are complete and the vendor has submitted their application.
        // Admin Approval has NOT been performed; no QC Checker has been assigned.
        status:          'APPROVAL_PENDING',
        applicationStep: 8,
        completedSteps:  [1, 2, 3, 4, 5, 6, 7, 8],
        submittedAt:     new Date('2024-11-10T09:30:00.000Z'),
        // approvedAt is intentionally omitted — not yet approved
        // assignedQcId is intentionally omitted — not yet assigned

        // ── Company Details ────────────────────────────────────────────────
        companyName:          'Elite Textiles Manufacturing Pvt Ltd',
        companyType:          'MANUFACTURER',
        businessType:         'pvt-ltd',
        companyDescription:   'Premium textile manufacturer specialising in handloom and power loom sarees, dress materials, bed linen, and fabric by the metre. Established in 2010 with state-of-the-art facilities in Bhiwandi, Maharashtra.',
        companyLogo:          IMG.logo,
        gstNumber:            '27AABCE5602R1Z5',
        companyIdNumber:      'U52100MH2010PTC201234',
        iecCode:              '0310085452',
        panNumber:            'AABCE5602R',
        factoryOwnershipType: 'owned',
        establishedYear:      2010,
        businessStartDate:    new Date('2010-03-15'),
        employeeCount:        '100+',

        // ── Owner Profile ──────────────────────────────────────────────────
        ownerName:             'Arjun Mehta',
        designation:           'Managing Director',
        ownerEmail:            'arjun.mehta@elitetextiles.qa',
        ownerEmail2:           'arjun.personal@gmail.com',
        ownerPhone:            '+919876543250',
        ownerPhone2:           '+919876543251',
        ownerLocalLandlineStd: '022',
        ownerLandline:         '02228901234',
        ownerIntlLandline:     '+44-20-71234567',
        ownerPhoto:            IMG.ownerPhoto,

        // ── Additional Owners (Step 2) ─────────────────────────────────────
        additionalOwners: [
          {
            firstName:   'Priya',
            middleName:  'A',
            lastName:    'Mehta',
            designation: 'Director',
            email:       'priya.mehta@elitetextiles.qa',
            email2:      'priya.backup@elitetextiles.qa',
            phone:       '+919876543252',
            phone2:      '+919876543253',
            localLandlineStd:        '022',
            localLandlineNumber:     '28901235',
            intlLandlineCountryCode: '+44',
            intlLandlineStd:         '20',
            intlLandlineNumber:      '71234568',
          },
        ],

        // ── Business Contact ───────────────────────────────────────────────
        businessEmail:   'info@elitetextiles.qa',
        businessEmail2:  'accounts@elitetextiles.qa',
        businessPhone:   '+912240123456',
        phoneNumber2:    '+912240123457',
        localLandlineStd: '022',
        landlineNumber:  '02240123456',
        intlLandline:    '+44-20-71234569',
        website:         'https://www.elitetextiles.qa',

        // ── Business Address ───────────────────────────────────────────────
        businessAddress: 'Plot No. 123, MIDC Industrial Estate',
        addressLine2:    'Bhiwandi–Kalyan Road, Phase 2',
        addressLine3:    'M.I.D.C. Bhiwandi Industrial Area',
        landmark:        'Near State Bank of India ATM',
        businessCity:    'Bhiwandi',
        businessState:   'Maharashtra',
        businessZipCode: '421302',
        businessCountry: 'India',

        // ── Factory Address ────────────────────────────────────────────────
        factoryAddress: 'Plot No. 123, MIDC Industrial Estate, Phase 2',
        factoryCity:    'Bhiwandi',
        factoryState:   'Maharashtra',
        factoryZipCode: '421302',
        factoryCountry: 'India',
        factorySize:    '25000 sq ft',

        // ── Warehouse Details ──────────────────────────────────────────────
        ownershipType:         'owned',
        warehouseAddress:      'Plot No. 123, MIDC Industrial Estate, Phase 2',
        warehouseAddressLine2: 'Building B, Ground Floor',
        warehouseAddressLine3: 'MIDC Bhiwandi Industrial Area',
        warehouseLandmark:     'Opposite Bhiwandi Railway Station',
        warehouseCity:         'Bhiwandi',
        warehouseState:        'Maharashtra',
        warehouseZipCode:      '421302',
        warehouseCountry:      'India',
        warehouseSize:         '15000 sq ft',
        storageCapacity:       '50000 sq ft',
        mapLink:               'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3767.0!2d73.0519!3d19.2998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0!2zMTnCsDE3JzU5LjMiTiA3M8KwMDMnMDYuOCJF!5e0!3m2!1sen!2sin!4v1234567890',
        factoryLatitude:        19.2998,
        factoryLongitude:       73.0519,

        // ── Manufacturing Facilities ───────────────────────────────────────
        enabledFacilities: {
          spinning:  true,
          weaving:   true,
          dyeing:    true,
          printing:  false,
          stitching: true,
          finishing: true,
        },
        facilityDetails: {
          spinning: {
            spinningMachines:  '25',
            spinningCapacity:  '5000.0',
            remarks:           'High-speed ring spinning machines with automatic doffing systems. ISO-certified maintenance schedule.',
          },
          weaving: {
            loomCount:       '40',
            weavingCapacity: '8000.0',
            remarks:         'Air-jet and rapier looms supporting plain, twill, and dobby constructions up to 200 threads/cm.',
          },
          dyeing: {
            dyeingMachines:  '12',
            dyeingCapacity:  '6000.0',
            remarks:         'Reactive and VAT dyeing with in-house ETP (effluent treatment plant) and water recycling.',
          },
          stitching: {
            stitchingMachines:  '60',
            stitchingCapacity:  '12000.0',
            remarks:            'Flatlock, overlock, and bartack machines. Computerised stitch-length control.',
          },
          finishing: {
            finishingCapacity: '15000.0',
            remarks:           'Calendering, sanforizing, compacting, and heat-setting lines with online quality checks.',
          },
        },
        productionCapacity: '50000 meters/month, 12000 pieces/month',

        // ── Vendor Type & Products ─────────────────────────────────────────
        vendorType:        'TEXTILE_MANUFACTURER',
        vendorTypes:       ['manufacturer', 'exporter'],
        productCategories: ['Sarees', 'Fabrics', 'Bed Linen', 'Dress Materials'],
        productTypes:      ['Cotton', 'Silk', 'Polyester', 'Blended'],
        specializations:   ['Handloom Weaving', 'Power Loom', 'Banarasi Weaves', 'Jacquard Designs'],
        categoryRemarks:   'Specialising in premium handloom and power loom textiles for the domestic and export market. Our saree range covers Banarasi, Kanjivaram, Chanderi, and Maheshwari styles. Fabric division handles greige goods and finished cloth in cotton, silk, and blended yarns.',

        // ── Category Products (Step 5 JSON) ───────────────────────────────
        categoryProducts: {
          Sarees: [
            { id: 'cp-001', name: 'Premium Banarasi Silk Saree',  photos: [{ preview: IMG.product1a }] },
            { id: 'cp-002', name: 'Handloom Cotton Saree',        photos: [{ preview: IMG.product2a }] },
            { id: 'cp-003', name: 'Chanderi Silk Cotton Saree',   photos: [{ preview: IMG.product1b }] },
          ],
          'Fabrics': [
            { id: 'cp-004', name: 'Pure Cotton Shirting Fabric',  photos: [{ preview: IMG.product3a }] },
            { id: 'cp-005', name: 'Polyester Blend Suiting',      photos: [{ preview: IMG.product4a }] },
          ],
          'Bed Linen': [
            { id: 'cp-006', name: 'King Size Cotton Bedsheet Set', photos: [{ preview: IMG.product2b }] },
          ],
        },
        additionalCategories: [
          {
            id:   'ac-001',
            name: 'Home Furnishings',
            products: [
              { id: 'ac-p-001', name: 'Cotton Cushion Cover Set (5 pcs)', photos: [{ preview: IMG.product1b }] },
              { id: 'ac-p-002', name: 'Jacquard Table Runner',            photos: [{ preview: IMG.product2b }] },
            ],
          },
        ],

        // ── Trade Information ──────────────────────────────────────────────
        importExperience: true,
        exportExperience: true,
        importCountries:  ['China', 'Bangladesh', 'Vietnam', 'Indonesia'],
        exportCountries:  ['United States', 'United Kingdom', 'Germany', 'UAE', 'Australia'],
        primaryMarkets:   ['India', 'United States', 'United Kingdom', 'Germany'],

        // ── Logistics ─────────────────────────────────────────────────────
        shippingMethods:      ['road', 'rail', 'sea', 'air'],
        deliveryTime:         '7–15 business days (domestic); 21–30 days (international)',
        minimumOrderQuantity: '500 metres / 100 pieces',
        paymentTerms:         ['30% advance', '70% before dispatch', 'LC at sight for export orders'],
        packagingCapabilities:
          'Eco-friendly packaging using recycled cardboard boxes and biodegradable poly-bags. ' +
          'Garments are individually poly-bagged with size sticker, then packed in master cartons of 12/24 pcs. ' +
          'Sarees are wrapped in tissue paper and sleeved before boxing. ' +
          'Custom branding and hangtag insertion available for B2B buyers. ' +
          'Export packing per IATA/ISPM-15 wood-packaging standards.',
        logisticsPartners:
          'FedEx (international express), DHL (international economy), Blue Dart (domestic express), ' +
          'DTDC (domestic economy), Indian Post EMS (small parcels). ' +
          'Sea freight via Nhava Sheva (JNPT) through Crown Shipping Pvt Ltd for FCL/LCL orders. ' +
          'Air freight through Mumbai International Airport cargo terminal.',
        qualityControl:
          'Five-stage quality management system:\n' +
          '1. Incoming Raw Material Inspection — yarn lot testing, colour fastness check, shrinkage test.\n' +
          '2. In-Process Quality Check — loom tension, weft density, defect mapping every 2 hours.\n' +
          '3. Grey Fabric Inspection — 4-point system per ASTM D5430; maximum 28 penalty points per 100 linear metres.\n' +
          '4. Finishing QC — handle, lustre, GSM ±5%, dimensional stability after wash.\n' +
          '5. Pre-Shipment Inspection — random AQL 2.5 sampling; third-party lab report for export orders.',
        complianceStandards:
          'OEKO-TEX Standard 100 (Class II) | GOTS v6.0 | ISO 9001:2015 | BIS IS 1943 for cotton fabrics | ' +
          'REACH Regulation (EU) 1907/2006 compliance for export to EU | RoHS compliance for accessories.',

        // ── Contact & Trade (Step 3) ───────────────────────────────────────
        mainContact: {
          title:       'Mr.',
          firstName:   'Vikram',
          middleName:  'S.',
          lastName:    'Reddy',
          designation: 'CEO',
          department:  'Operations',
          email1:      'vikram.reddy@elitetextiles.qa',
          email2:      'vikram.backup@elitetextiles.qa',
          phone1:      '+919876543254',
          phone2:      '+919876543255',
          photo:       IMG.contactPhoto1,
          localLandlineStd:        '022',
          localLandlineNumber:     '40123458',
          intlLandlineCountryCode: '+44',
          intlLandlineStd:         '20',
          intlLandlineNumber:      '71234560',
        },
        alternateContacts: [
          {
            title:       'Ms.',
            firstName:   'Ananya',
            middleName:  'R.',
            lastName:    'Kapoor',
            designation: 'Export Manager',
            department:  'Export',
            email1:      'ananya.kapoor@elitetextiles.qa',
            email2:      'ananya.backup@elitetextiles.qa',
            phone1:      '+919876543256',
            phone2:      '+919876543257',
            photo:       IMG.contactPhoto2,
            localLandlineStd:    '022',
            localLandlineNumber: '40123459',
          },
          {
            title:       'Mr.',
            firstName:   'Sanjay',
            middleName:  'K.',
            lastName:    'Joshi',
            designation: 'Production Manager',
            department:  'Operations',
            email1:      'sanjay.joshi@elitetextiles.qa',
            phone1:      '+919876543258',
            photo:       IMG.contactPhoto1,
            localLandlineStd:    '022',
            localLandlineNumber: '40123460',
          },
        ],

        // ── Additional IDs ─────────────────────────────────────────────────
        tradeLicenseNumber:         'MH/TRADE/2010/45678',
        businessRegistrationNumber: 'U52100MH2010PTC201234',
        taxIdentificationNumber:    'AABCE5602R',
        annualTurnover:             '₹15–20 Crore',
      },
    });

    console.log(`✅  QA Vendor created — ${vendor.companyName} (${vendor.email})  [${vendorCode}]`);
  }

  // ── 2. VendorCertifications ───────────────────────────────────────────────
  const existingCerts = await prisma.vendorCertification.findMany({ where: { vendorId: vendor.id } });

  if (existingCerts.length > 0) {
    console.log(`✅  Certifications already exist (${existingCerts.length} records)`);
  } else {
    const certData = [
      {
        name:              'OEKO-TEX Standard 100',
        issuedBy:          'TESTEX Swiss Textile Testing Institute',
        certificateNumber: 'OT-2024-MH-056789',
        issuedDate:        new Date('2024-01-15'),
        expiryDate:        new Date('2026-01-14'),
        documentUrl:       IMG.cert1,
        isCustom:          false,
      },
      {
        name:              'GOTS (Global Organic Textile Standard)',
        issuedBy:          'Control Union Certifications',
        certificateNumber: 'GOTS-CU-2024-IN-3421',
        issuedDate:        new Date('2024-03-01'),
        expiryDate:        new Date('2027-02-28'),
        documentUrl:       IMG.cert2,
        isCustom:          false,
      },
      {
        name:              'ISO 9001:2015',
        issuedBy:          'Bureau Veritas India Pvt Ltd',
        certificateNumber: 'BV-ISO9001-2024-IN-78234',
        issuedDate:        new Date('2022-06-10'),
        expiryDate:        new Date('2025-06-09'),
        documentUrl:       IMG.cert3,
        isCustom:          false,
      },
      {
        name:              'SMETA (Sedex Members Ethical Trade Audit)',
        issuedBy:          'SGS India Pvt Ltd',
        certificateNumber: 'SMETA-SGS-IN-2024-1102',
        issuedDate:        new Date('2024-04-20'),
        expiryDate:        new Date('2026-04-19'),
        documentUrl:       IMG.cert1,
        isCustom:          false,
      },
      {
        name:              'BSCI (Business Social Compliance Initiative)',
        issuedBy:          'Intertek India Pvt Ltd',
        certificateNumber: 'BSCI-INT-IN-2024-5678',
        issuedDate:        new Date('2023-09-01'),
        expiryDate:        new Date('2025-08-31'),
        documentUrl:       IMG.cert2,
        isCustom:          false,
      },
      {
        name:              'Green Factory Certification — CII-Godrej GBC',
        issuedBy:          'Confederation of Indian Industry — Green Business Centre',
        certificateNumber: 'CII-GBC-2024-MH-GREEN-0342',
        issuedDate:        new Date('2024-02-01'),
        expiryDate:        new Date('2027-01-31'),
        documentUrl:       IMG.cert3,
        description:       '3-star green factory rating awarded for energy efficiency, water conservation, and waste reduction initiatives.',
        isCustom:          true,
      },
    ];

    await prisma.vendorCertification.createMany({
      data: certData.map(c => ({ ...c, vendorId: vendor.id })),
    });
    console.log(`✅  Created ${certData.length} certifications`);
  }

  // ── 3. VendorDocuments ────────────────────────────────────────────────────
  const existingDocs = await prisma.vendorDocument.findMany({ where: { vendorId: vendor.id } });

  if (existingDocs.length > 0) {
    console.log(`✅  Documents already exist (${existingDocs.length} records)`);
  } else {
    const docData = [
      { type: 'GST_CERTIFICATE',      name: 'GST Certificate — 27AABCE5602R1Z5',                   documentUrl: IMG.doc1 },
      { type: 'PAN_CARD',             name: 'PAN Card — AABCE5602R',                                documentUrl: IMG.doc2 },
      { type: 'COMPANY_REGISTRATION', name: 'Certificate of Incorporation — U52100MH2010PTC201234', documentUrl: IMG.doc3 },
      { type: 'EXPORT_LICENSE',       name: 'IEC Certificate — 0310085452',                         documentUrl: IMG.doc4 },
      { type: 'FACTORY_LICENSE',      name: 'Factory License — MH/FLR/2010/BHW-4521',               documentUrl: IMG.doc5 },
      { type: 'POLLUTION_CERTIFICATE', name: 'Pollution NOC — MPCB/NOC/2024/BHW-789',              documentUrl: IMG.doc1 },
    ];

    await prisma.vendorDocument.createMany({
      data: docData.map(d => ({ ...d, vendorId: vendor.id })),
    });
    console.log(`✅  Created ${docData.length} documents`);
  }

  // ── 4. VendorBankDetails ──────────────────────────────────────────────────
  const existingBank = await prisma.vendorBankDetails.findUnique({ where: { vendorId: vendor.id } });

  if (existingBank) {
    console.log(`✅  Bank details already exist`);
  } else {
    await prisma.vendorBankDetails.create({
      data: {
        vendorId:          vendor.id,
        bankName:          'HDFC Bank Ltd',
        accountNumber:     '50200012345678',
        ifscCode:          'HDFC0001234',
        swiftCode:         'HDFCINBBMUM',
        iban:              'IN29HDFC0001234502000123456789',
        accountType:       'Current',
        accountHolderName: 'Elite Textiles Manufacturing Pvt Ltd',
        branchName:        'Bhiwandi Industrial Branch',
        branchAddress:     '12, Purna Industrial Estate, Bhiwandi, Maharashtra 421302',
        // Not yet verified — admin verifies as part of the approval process
        isVerified:        false,
      },
    });
    console.log(`✅  Bank details created`);
  }

  // ── 5. VendorReferences ───────────────────────────────────────────────────
  const existingRefs = await prisma.vendorReference.findMany({ where: { vendorId: vendor.id } });

  if (existingRefs.length > 0) {
    console.log(`✅  References already exist (${existingRefs.length} records)`);
  } else {
    await prisma.vendorReference.createMany({
      data: [
        {
          vendorId:      vendor.id,
          companyName:   'Bombay Merchandise Exports Pvt Ltd',
          contactPerson: 'Mr. Rohit Agarwal',
          email:         'rohit@bombaymerchandise.com',
          phone:         '+912222334455',
          relationship:  'Client',
        },
        {
          vendorId:      vendor.id,
          companyName:   'IndoGulf Trading Co.',
          contactPerson: 'Ms. Sara Al-Hassan',
          email:         'sara@indogulftrade.com',
          phone:         '+97143456789',
          relationship:  'Export Partner',
        },
      ],
    });
    console.log(`✅  Created 2 vendor references`);
  }

  // ── 6. Products ───────────────────────────────────────────────────────────

  // Helper: idempotent product + variants + images creation
  async function ensureProduct({ name, slug, description, category, subCategory, basePrice, originalPrice,
    discount, gstPercentage, fabricType, material, fabricSpecifications, hasVariants,
    baseSku, uom, tags, dimensions, weight, weightUnit, totalStock, lowStockThreshold,
    dispatchTimeline, logisticsConfig, variants, images }) {

    let product = await prisma.product.findFirst({ where: { vendorId: vendor.id, baseSku } });
    if (product) {
      console.log(`✅  Product already exists — ${name}`);
      return product;
    }

    product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name, slug, description, category, subCategory,
        basePrice, originalPrice, discount, gstPercentage,
        fabricType, material, fabricSpecifications,
        hasVariants, baseSku, uom, tags,
        dimensions, weight, weightUnit,
        totalStock, lowStockThreshold, trackInventory: true,
        dispatchTimeline, logisticsConfig,
        inStock: true,
        status:         'ACTIVE',
        // Products are pending admin review — no QC checker assigned yet
        approvalStatus: 'PENDING',
        // approvedAt and assignedQcId intentionally omitted
      },
    });

    // Variants
    if (variants && variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map(v => ({ ...v, productId: product.id })),
      });
    }

    // Images
    if (images && images.length > 0) {
      await prisma.productImage.createMany({
        data: images.map((img, idx) => ({
          ...img,
          productId: product.id,
          sortOrder:  idx,
        })),
      });
    }

    console.log(
      `✅  Product created — ${name}  (${variants?.length ?? 0} variants, ${images?.length ?? 0} images)`
    );
    return product;
  }

  // ── Product 1: Premium Banarasi Silk Saree ──────────────────────────────
  await ensureProduct({
    name:        'Premium Banarasi Silk Saree',
    slug:        'elite-premium-banarasi-silk-saree-qa',
    description:
      'Handwoven Banarasi silk saree with intricate zari work and traditional brocade motifs. ' +
      'Each saree is crafted on a jacquard loom by master weavers in the Banarasi tradition. ' +
      'Features a 1.25 m blouse piece. Dry-clean recommended. Perfect for weddings and festivities.',
    category:    'Sarees',
    subCategory: 'Banarasi Silk',
    basePrice:      8500,
    originalPrice:  10500,
    discount:       19.05,
    gstPercentage:  5,
    fabricType:  'Silk',
    material:    '70% Pure Silk, 30% Zari (Metallic Yarn)',
    fabricSpecifications: {
      count:        '2/120s',
      construction: '62 × 48',
      gsm:          '180',
      width:        '47 inches (120 cm)',
      finish:       'Soft hand feel with natural lustre',
    },
    hasVariants: true,
    baseSku:     'ETM-24-001',
    uom:         'pcs',
    tags:        ['saree', 'silk', 'banarasi', 'wedding', 'zari', 'handloom'],
    dimensions:  '6.5 metres × 47 inches',
    weight:      '850 g',
    weightUnit:  'g',
    totalStock:  120,
    lowStockThreshold: 10,
    dispatchTimeline: { standard: '5–7 business days', express: '2–3 business days' },
    logisticsConfig: {
      mode:         'road',
      weightKg:     0.9,
      dimensionsCm: '40 × 30 × 5',
      fragile:      false,
    },
    variants: [
      {
        variantName:   'Red Gold',
        size:          'Standard (6.5 m)',
        color:         'Deep Red',
        colorHex:      '#8B0000',
        sku:           'ETM-24-001-A',
        price:         8500,
        originalPrice: 10500,
        discount:      19.05,
        stock:         30,
        lowStockThreshold: 5,
        images: [IMG.product1a, IMG.product1b],
      },
      {
        variantName:   'Royal Blue Gold',
        size:          'Standard (6.5 m)',
        color:         'Royal Blue',
        colorHex:      '#002366',
        sku:           'ETM-24-001-B',
        price:         8500,
        originalPrice: 10500,
        discount:      19.05,
        stock:         25,
        lowStockThreshold: 5,
        images: [IMG.product1b, IMG.product1a],
      },
      {
        variantName:   'Emerald Green Gold',
        size:          'Standard (6.5 m)',
        color:         'Emerald Green',
        colorHex:      '#50C878',
        sku:           'ETM-24-001-C',
        price:         8800,
        originalPrice: 10800,
        discount:      18.52,
        stock:         20,
        lowStockThreshold: 5,
        images: [IMG.product1a],
      },
      {
        variantName:   'Ivory Gold',
        size:          'Standard (6.5 m)',
        color:         'Ivory',
        colorHex:      '#FFFFF0',
        sku:           'ETM-24-001-D',
        price:         8200,
        originalPrice: 10200,
        discount:      19.61,
        stock:         25,
        lowStockThreshold: 5,
        images: [IMG.product1b],
      },
      {
        variantName:   'Magenta Gold',
        size:          'Standard (6.5 m)',
        color:         'Magenta',
        colorHex:      '#FF00FF',
        sku:           'ETM-24-001-E',
        price:         8500,
        originalPrice: 10500,
        discount:      19.05,
        stock:         20,
        lowStockThreshold: 5,
        images: [IMG.product1a],
      },
    ],
    images: [
      { url: IMG.product1a, alt: 'Premium Banarasi Silk Saree — Red Gold variant', isPrimary: true,  imageType: 'cover' },
      { url: IMG.product1b, alt: 'Zari work detail — Banarasi Silk Saree',          isPrimary: false, imageType: 'gallery' },
      { url: IMG.product2a, alt: 'Banarasi Silk Saree — blouse piece',               isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 2: Handloom Cotton Saree ────────────────────────────────────
  await ensureProduct({
    name:        'Handloom Cotton Saree',
    slug:        'elite-handloom-cotton-saree-qa',
    description:
      'Pure handloom cotton saree woven on traditional pit looms. Features geometric border ' +
      'patterns in contrasting thread. Lightweight and breathable — ideal for daily wear and office. ' +
      '5.5 m saree with 0.8 m blouse piece. Machine washable at 30°C.',
    category:    'Sarees',
    subCategory: 'Handloom Cotton',
    basePrice:      1450,
    originalPrice:  1800,
    discount:       19.44,
    gstPercentage:  5,
    fabricType:  'Cotton',
    material:    '100% Hand-Spun Cotton Yarn (40s count)',
    fabricSpecifications: {
      count:        '40s × 40s',
      construction: '68 × 68',
      gsm:          '110',
      width:        '44 inches (112 cm)',
      finish:       'Soft mercerised finish',
    },
    hasVariants: true,
    baseSku:     'ETM-24-002',
    uom:         'pcs',
    tags:        ['saree', 'cotton', 'handloom', 'daily wear', 'office', 'lightweight'],
    dimensions:  '6.3 metres × 44 inches',
    weight:      '350 g',
    weightUnit:  'g',
    totalStock:  250,
    lowStockThreshold: 20,
    dispatchTimeline: { standard: '3–5 business days', express: '1–2 business days' },
    logisticsConfig: {
      mode:         'road',
      weightKg:     0.4,
      dimensionsCm: '30 × 25 × 4',
      fragile:      false,
    },
    variants: [
      {
        variantName:   'Off-White Navy',
        size:          'Standard (6.3 m)',
        color:         'Off-White',
        colorHex:      '#FAF9F6',
        sku:           'ETM-24-002-A',
        price:         1450,
        originalPrice: 1800,
        discount:      19.44,
        stock:         60,
        lowStockThreshold: 10,
        images: [IMG.product2a],
      },
      {
        variantName:   'Pastel Pink',
        size:          'Standard (6.3 m)',
        color:         'Pastel Pink',
        colorHex:      '#FFD1DC',
        sku:           'ETM-24-002-B',
        price:         1450,
        originalPrice: 1800,
        discount:      19.44,
        stock:         55,
        lowStockThreshold: 10,
        images: [IMG.product2a, IMG.product2b],
      },
      {
        variantName:   'Sky Blue',
        size:          'Standard (6.3 m)',
        color:         'Sky Blue',
        colorHex:      '#87CEEB',
        sku:           'ETM-24-002-C',
        price:         1450,
        originalPrice: 1800,
        discount:      19.44,
        stock:         50,
        lowStockThreshold: 10,
        images: [IMG.product2b],
      },
      {
        variantName:   'Terracotta',
        size:          'Standard (6.3 m)',
        color:         'Terracotta',
        colorHex:      '#E2725B',
        sku:           'ETM-24-002-D',
        price:         1500,
        originalPrice: 1850,
        discount:      18.92,
        stock:         45,
        lowStockThreshold: 10,
        images: [IMG.product2a],
      },
      {
        variantName:   'Mustard Yellow',
        size:          'Standard (6.3 m)',
        color:         'Mustard',
        colorHex:      '#FFDB58',
        sku:           'ETM-24-002-E',
        price:         1450,
        originalPrice: 1800,
        discount:      19.44,
        stock:         40,
        lowStockThreshold: 10,
        images: [IMG.product2b],
      },
    ],
    images: [
      { url: IMG.product2a, alt: 'Handloom Cotton Saree — Off-White Navy border', isPrimary: true,  imageType: 'cover' },
      { url: IMG.product2b, alt: 'Handloom Cotton Saree — close-up weave detail',  isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 3: King Size Cotton Bedsheet Set ─────────────────────────────
  await ensureProduct({
    name:        'King Size Cotton Bedsheet Set — 400 TC',
    slug:        'elite-king-size-cotton-bedsheet-set-400tc-qa',
    description:
      '400 thread-count 100% long-staple cotton bedsheet set. Set includes: 1 flat sheet ' +
      '(274 cm × 274 cm), 2 pillow covers (50 cm × 75 cm each). Pre-washed for extra softness. ' +
      'Sateen weave with elegant satin stripe border. Machine washable at 40°C. ' +
      'Shrinkage controlled to ±2%. Reactive dyed for colour fastness (Grade 4–5).',
    category:    'Bed Linen',
    subCategory: 'Bedsheet Sets',
    basePrice:      2200,
    originalPrice:  2800,
    discount:       21.43,
    gstPercentage:  12,
    fabricType:  'Cotton',
    material:    '100% Long-Staple Combed Cotton (60s × 60s)',
    fabricSpecifications: {
      threadCount:  '400 TC',
      count:        '60s × 60s',
      construction: '200 × 200',
      gsm:          '130',
      weave:        'Sateen',
      finish:       'Pre-washed, enzyme-softened',
    },
    hasVariants: true,
    baseSku:     'ETM-24-003',
    uom:         'sets',
    tags:        ['bedsheet', 'cotton', '400tc', 'king size', 'sateen', 'bed linen', 'home'],
    dimensions:  'Flat sheet: 274 × 274 cm; Pillow cover: 50 × 75 cm',
    weight:      '1.6 kg (set)',
    weightUnit:  'kg',
    totalStock:  180,
    lowStockThreshold: 15,
    dispatchTimeline: { standard: '4–6 business days', express: '2–3 business days' },
    logisticsConfig: {
      mode:         'road',
      weightKg:     1.8,
      dimensionsCm: '45 × 35 × 10',
      fragile:      false,
    },
    variants: [
      {
        variantName:   'Crisp White',
        color:         'White',
        colorHex:      '#FFFFFF',
        sku:           'ETM-24-003-A',
        price:         2200,
        originalPrice: 2800,
        discount:      21.43,
        stock:         50,
        lowStockThreshold: 8,
        images: [IMG.product3a],
      },
      {
        variantName:   'Pearl Grey',
        color:         'Pearl Grey',
        colorHex:      '#D3D3D3',
        sku:           'ETM-24-003-B',
        price:         2200,
        originalPrice: 2800,
        discount:      21.43,
        stock:         45,
        lowStockThreshold: 8,
        images: [IMG.product3a],
      },
      {
        variantName:   'Navy Blue',
        color:         'Navy Blue',
        colorHex:      '#000080',
        sku:           'ETM-24-003-C',
        price:         2300,
        originalPrice: 2900,
        discount:      20.69,
        stock:         40,
        lowStockThreshold: 8,
        images: [IMG.product3a],
      },
      {
        variantName:   'Sage Green',
        color:         'Sage Green',
        colorHex:      '#9CAF88',
        sku:           'ETM-24-003-D',
        price:         2200,
        originalPrice: 2800,
        discount:      21.43,
        stock:         45,
        lowStockThreshold: 8,
        images: [IMG.product3a],
      },
    ],
    images: [
      { url: IMG.product3a, alt: 'King Size Cotton Bedsheet Set 400TC — Crisp White', isPrimary: true,  imageType: 'cover' },
      { url: IMG.product2b, alt: 'Bedsheet Set — corner fold detail',                  isPrimary: false, imageType: 'gallery' },
      { url: IMG.product1b, alt: 'Pillow cover detail — sateen weave',                  isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 4: Polyester Blend Suiting Fabric ───────────────────────────
  await ensureProduct({
    name:        'Polyester Blend Suiting Fabric',
    slug:        'elite-polyester-blend-suiting-fabric-qa',
    description:
      'Premium polyester–viscose blend suiting fabric. Ideal for formal trousers, blazers, and ' +
      'school/corporate uniforms. Wrinkle resistant with excellent drape. Available in a wide colour range. ' +
      'Sold by the metre. Minimum order: 50 metres per colour. Width: 150 cm.',
    category:    'Fabrics',
    subCategory: 'Suiting Fabric',
    basePrice:      185,
    originalPrice:  220,
    discount:       15.91,
    gstPercentage:  12,
    fabricType:  'Polyester Blend',
    material:    '65% Polyester, 35% Viscose',
    fabricSpecifications: {
      count:        '2/75D Polyester + 40s Viscose',
      construction: '150 × 90',
      gsm:          '280',
      width:        '150 cm (59 inches)',
      finish:       'Anti-wrinkle, easy-care finish',
    },
    hasVariants:       false,
    singleUnitColor:   'Charcoal Grey',
    singleUnitColorHex:'#36454F',
    singleUnitSize:    'Per metre (150 cm width)',
    baseSku:     'ETM-24-004',
    uom:         'meters',
    tags:        ['fabric', 'suiting', 'polyester', 'viscose', 'formal', 'uniform', 'wrinkle-free'],
    dimensions:  'Width: 150 cm; sold per metre',
    weight:      '280 g/m²',
    weightUnit:  'g',
    totalStock:  5000,
    lowStockThreshold: 200,
    dispatchTimeline: { standard: '3–5 business days', express: '1–2 business days' },
    logisticsConfig: {
      mode:         'road',
      weightKg:     0.3,
      dimensionsCm: 'Roll 30 × 30 × varies by length',
      fragile:      false,
    },
    variants: [],
    images: [
      { url: IMG.product4a, alt: 'Polyester Blend Suiting Fabric — Charcoal Grey', isPrimary: true,  imageType: 'cover' },
      { url: IMG.product3a, alt: 'Suiting Fabric — close-up texture',               isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── 7. Summary ────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('🏭  QA VENDOR SEED COMPLETE');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Company    : Elite Textiles Manufacturing Pvt Ltd`);
  console.log(`  Vendor Code: ${vendor.vendorCode ?? 'see DB'}`);
  console.log(`  Email      : ${VENDOR_EMAIL}`);
  console.log(`  Password   : ${VENDOR_PASSWORD}`);
  console.log(`  Status     : APPROVAL_PENDING  ← submitted, not yet approved`);
  console.log(`  Steps      : 8/8 complete (all registration data filled)`);
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Products   : 4 (Banarasi Silk Saree, Cotton Saree,');
  console.log('               Bedsheet Set, Suiting Fabric)');
  console.log('  Variants   : 14 (across all products)');
  console.log('  Certs      : 6 (OEKO-TEX, GOTS, ISO 9001, SMETA, BSCI, Green)');
  console.log('  Documents  : 6 (GST, PAN, CIN, IEC, Factory Lic, Pollution NOC)');
  console.log('  Bank Acct  : HDFC Bank — 50200012345678 (not yet verified)');
  console.log('  References : 2 (Bombay Merchandise, IndoGulf Trading)');
  console.log('  Inspection : none — assign QC Checker from Admin panel to begin');
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Next steps : Admin → assign QC Checker → inspection workflow');
  console.log('══════════════════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
