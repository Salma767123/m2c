/**
 * seedTestVendor2.js — Creates a second fully-populated test vendor.
 *
 * Company  : Prism Garments & Exports Pvt Ltd
 * Focus    : Readymade garments & apparel (distinct from the textile/saree
 *             vendor in seedQAVendor.js which focuses on fabrics & sarees)
 * Location : Tiruppur, Tamil Nadu
 * Products : 6 products (T-shirts, Kurtis, Formal shirts, Joggers,
 *             Kurta-Pyjama sets, Linen shirt fabric)
 *
 * Status   : APPROVAL_PENDING — all 8 registration steps completed and
 *            submitted. NOT approved. No QC Checker assigned. Ready for
 *            full end-to-end QC testing workflow.
 *
 * Run  :  node prisma/seedTestVendor2.js
 * Safe :  idempotent — re-running resets to APPROVAL_PENDING.
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ── Demo Cloudinary URLs ─────────────────────────────────────────────────────
const IMG = {
  logo:          'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/cld-sample',
  ownerPhoto:    'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/man',
  contactPhoto1: 'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/woman',
  contactPhoto2: 'https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill,g_face/man',
  factory1:      'https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_fill/sample',
  factory2:      'https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_fill/cld-sample-2',
  factory3:      'https://res.cloudinary.com/demo/image/upload/w_800,h_600,c_fill/cld-sample-3',
  p1a:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/sample',
  p1b:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-2',
  p2a:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-3',
  p2b:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-4',
  p3a:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-5',
  p3b:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/sample',
  p4a:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-2',
  p5a:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-3',
  p5b:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-4',
  p6a:           'https://res.cloudinary.com/demo/image/upload/w_800,h_800,c_fill/cld-sample-5',
  cert1:         'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/sample',
  cert2:         'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-2',
  cert3:         'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-3',
  cert4:         'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-4',
  doc1:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/sample',
  doc2:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-2',
  doc3:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-3',
  doc4:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-4',
  doc5:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/cld-sample-5',
  doc6:          'https://res.cloudinary.com/demo/image/upload/w_600,h_800,c_fill/sample',
};

const VENDOR_EMAIL    = 'prism-garments@m2c.dev';
const VENDOR_PASSWORD = 'Vendor@5678';

async function main() {
  console.log('🌱  Seeding Test Vendor 2 — Prism Garments & Exports Pvt Ltd…\n');

  // ── 1. Vendor ─────────────────────────────────────────────────────────────
  let vendor = await prisma.vendor.findUnique({ where: { email: VENDOR_EMAIL } });

  if (vendor) {
    vendor = await prisma.vendor.update({
      where: { email: VENDOR_EMAIL },
      data: {
        status:       'APPROVAL_PENDING',
        approvedAt:   null,
        assignedQcId: null,
      },
    });
    console.log(`✅  Vendor already exists — reset to APPROVAL_PENDING (${vendor.email})`);
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

        // ── Application Status ─────────────────────────────────────────────
        status:          'APPROVAL_PENDING',
        applicationStep: 8,
        completedSteps:  [1, 2, 3, 4, 5, 6, 7, 8],
        submittedAt:     new Date('2025-02-14T11:00:00.000Z'),

        // ── Step 1: Company Information ────────────────────────────────────
        companyName:          'Prism Garments & Exports Pvt Ltd',
        companyType:          'MANUFACTURER',
        businessType:         'pvt-ltd',
        companyDescription:
          'Leading readymade garment manufacturer and exporter based in Tiruppur, Tamil Nadu — ' +
          'the knitwear capital of India. Established in 2008, Prism specialises in men\'s and ' +
          'women\'s casual-wear, ethnic wear, and corporate uniforms. We operate 3 production ' +
          'lines with a combined output of 80,000 garments per month. ISO 9001:2015 certified. ' +
          'Exporting to 12 countries across Europe, North America, and the Middle East.',
        companyLogo:          IMG.logo,
        gstNumber:            '33AAGCP8821K1ZQ',
        companyIdNumber:      'U18101TN2008PTC069512',
        iecCode:              '0415089321',
        panNumber:            'AAGCP8821K',
        factoryOwnershipType: 'owned',
        businessStartDate:    new Date('2008-07-01'),
        establishedYear:      2008,
        employeeCount:        '250+',

        // ── Step 2: Business Contact Information ──────────────────────────
        businessPhone:    '+914212345678',
        phoneNumber2:     '+914212345679',
        localLandlineStd: '0421',
        landlineNumber:   '04212345678',
        intlLandline:     '+44-161-1234567',
        businessEmail:    'info@prismgarments.qa',
        businessEmail2:   'export@prismgarments.qa',
        website:          'https://www.prismgarments.qa',

        // ── Business Address ───────────────────────────────────────────────
        businessAddress: 'No. 47/B, Veerapandi Industrial Estate',
        addressLine2:    'Mangalam Road, Phase III',
        addressLine3:    'SIDCO Industrial Area',
        landmark:        'Near Tiruppur Bus Stand — 300 m North',
        businessCity:    'Tiruppur',
        businessState:   'Tamil Nadu',
        businessZipCode: '641607',
        businessCountry: 'India',

        // ── Step 3: Owner Profile ──────────────────────────────────────────
        ownerName:             'Karthik Subramaniam',
        designation:           'Managing Director',
        ownerEmail:            'karthik@prismgarments.qa',
        ownerEmail2:           'karthik.personal@gmail.com',
        ownerPhone:            '+919876012345',
        ownerPhone2:           '+919876012346',
        ownerLocalLandlineStd: '0421',
        ownerLandline:         '04212345680',
        ownerIntlLandline:     '+44-161-1234568',
        ownerPhoto:            IMG.ownerPhoto,

        // Owner's personal address (identity verification)
        ownerAddress: '12, Sri Krishnapuram Colony, Anna Nagar',
        ownerCity:    'Tiruppur',
        ownerState:   'Tamil Nadu',
        ownerZipCode: '641652',
        ownerCountry: 'India',

        // Additional Owners
        additionalOwners: [
          {
            firstName:               'Meena',
            middleName:              'K.',
            lastName:                'Subramaniam',
            designation:             'Director',
            email:                   'meena@prismgarments.qa',
            email2:                  'meena.backup@prismgarments.qa',
            phone:                   '+919876012347',
            phone2:                  '+919876012348',
            localLandlineStd:        '0421',
            localLandlineNumber:     '2345681',
            intlLandlineCountryCode: '+44',
            intlLandlineStd:         '161',
            intlLandlineNumber:      '1234569',
          },
        ],

        // ── Factory Address ────────────────────────────────────────────────
        factoryAddress: 'No. 47/B, Veerapandi Industrial Estate, Phase III',
        factoryCity:    'Tiruppur',
        factoryState:   'Tamil Nadu',
        factoryZipCode: '641607',
        factoryCountry: 'India',
        factorySize:    '35000 sq ft',

        // ── Warehouse Details (Step 5) ─────────────────────────────────────
        ownershipType:         'owned',
        warehouseAddress:      'No. 47/B, Veerapandi Industrial Estate, Unit 2',
        warehouseAddressLine2: 'Mangalam Road, Phase III',
        warehouseAddressLine3: 'SIDCO Industrial Area',
        warehouseLandmark:     'Adjacent to Factory Gate B',
        warehouseCity:         'Tiruppur',
        warehouseState:        'Tamil Nadu',
        warehouseZipCode:      '641607',
        warehouseCountry:      'India',
        warehouseSize:         '18000 sq ft',
        storageCapacity:       '60000 units (garments)',
        mapLink:               'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.0!2d77.3410!3d11.1085!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0!2zMTHCsDA2JzMwLjYiTiA3N8KwMjAnMjcuNiJF!5e0!3m2!1sen!2sin!4v1234567890',
        factoryLatitude:        11.1085,
        factoryLongitude:       77.3410,

        // ── Step 5: Manufacturing Facilities ──────────────────────────────
        enabledFacilities: {
          knitting:  true,
          cutting:   true,
          stitching: true,
          dyeing:    true,
          printing:  true,
          finishing: true,
          embroidery: false,
        },
        facilityDetails: {
          knitting: {
            knittingMachines: '18',
            knittingCapacity: '15000.0',
            remarks: 'Single and double jersey circular knitting machines (24–36 gauge). Capacity: 15,000 kg of grey fabric per month. Auto-striping feeders for multi-colour knit.',
          },
          cutting: {
            cuttingTables:   '8',
            cuttingCapacity: '40000.0',
            remarks: '8 cutting tables with straight-knife and band-knife cutters. CAD-based marker making for fabric optimisation (98% efficiency). Fusing and interlinings pressing station.',
          },
          stitching: {
            stitchingMachines: '180',
            stitchingCapacity: '80000.0',
            remarks: '180 machines: plain lockstitch, overlock, interlock, flatlock, bartack, buttonhole, and button-attaching. Assembly-line layout with WIP tracking boards.',
          },
          dyeing: {
            dyeingMachines:  '6',
            dyeingCapacity:  '8000.0',
            remarks: 'Soft-flow jet dyeing machines (250–500 kg capacity each). Reactive and disperse dyes. In-house colour lab with Datacolor spectrophotometer for shade matching.',
          },
          printing: {
            printingMachines: '4',
            printingCapacity: '30000.0',
            remarks: 'Screen printing (6-colour rotary carousel), digital DTG printing (Epson F3070), heat-transfer press. All inks are Oeko-Tex certified.',
          },
          finishing: {
            finishingCapacity: '80000.0',
            remarks: 'Industrial steam tunnels, needle detectors (all garments), folding & tagging lines, polybag sealing. Pre-shipment measurement and quality audit station.',
          },
        },
        productionCapacity: '80,000 garments per month (all types)',

        // ── Step 4: Vendor Type & Products ────────────────────────────────
        vendorType:        'TEXTILE_MANUFACTURER',
        vendorTypes:       ['manufacturer', 'exporter', 'wholesaler'],
        productCategories: ['T-Shirts', 'Kurtis', 'Shirts', 'Track Pants', 'Ethnic Wear', 'Fabrics'],
        productTypes:      ['Cotton', 'Linen', 'Polyester', 'Blended', 'Knit', 'Woven'],
        specializations:   [
          'Premium Knitwear', 'Woven Garments', 'Ethnic Wear', 'Corporate Uniforms',
          'Sustainable Fabrics', 'Export Packaging',
        ],
        categoryRemarks:
          'Full-package manufacturer (FPP) for knitwear and woven garments. ' +
          'We handle design development, sampling, bulk production, quality inspection, and export documentation. ' +
          'Capabilities include screen printing, digital printing, and embroidery via third-party partner. ' +
          'Minimum Order Quantity: 500 pcs per colour per style. ' +
          'Samples delivered in 7–10 days.',

        categoryProducts: {
          'T-Shirts': [
            { id: 'cp-t-001', name: 'Men\'s Cotton Polo T-Shirt',   photos: [{ preview: IMG.p1a }] },
            { id: 'cp-t-002', name: 'Women\'s Round Neck Crop Top', photos: [{ preview: IMG.p2a }] },
          ],
          'Kurtis': [
            { id: 'cp-k-001', name: 'Women\'s A-Line Printed Kurti Set', photos: [{ preview: IMG.p2a }] },
            { id: 'cp-k-002', name: 'Men\'s Straight Kurta',             photos: [{ preview: IMG.p3a }] },
          ],
          'Shirts': [
            { id: 'cp-s-001', name: 'Men\'s Premium Cotton Formal Shirt', photos: [{ preview: IMG.p3a }] },
          ],
          'Track Pants': [
            { id: 'cp-tp-001', name: 'Unisex Cotton Fleece Joggers',     photos: [{ preview: IMG.p4a }] },
          ],
          'Fabrics': [
            { id: 'cp-f-001', name: 'Premium Irish Linen Shirting Fabric', photos: [{ preview: IMG.p6a }] },
          ],
        },
        additionalCategories: [
          {
            id:   'ac-prism-001',
            name: 'Corporate Uniforms',
            products: [
              { id: 'ac-p-001', name: 'Unisex Polo Uniform Shirt',        photos: [{ preview: IMG.p1b }] },
              { id: 'ac-p-002', name: 'Corporate Trouser (Formal Blend)',  photos: [{ preview: IMG.p3b }] },
            ],
          },
        ],

        // ── Trade & Import/Export ──────────────────────────────────────────
        importExperience: true,
        exportExperience: true,
        importCountries:  ['China', 'Vietnam', 'Bangladesh', 'Sri Lanka'],
        exportCountries:  ['United Kingdom', 'France', 'Germany', 'United States', 'UAE', 'Saudi Arabia', 'Australia', 'Canada'],
        primaryMarkets:   ['United Kingdom', 'United States', 'India', 'UAE'],
        annualTurnover:   '₹22–28 Crore',

        // ── Logistics & Packaging ──────────────────────────────────────────
        shippingMethods:      ['road', 'sea', 'air'],
        deliveryTime:         '10–21 business days (domestic + export); 3–5 days air express',
        minimumOrderQuantity: '500 pieces per colour per style',
        paymentTerms:         ['30% TT advance', '70% against shipping documents', 'LC at sight for orders above USD 50,000'],
        packagingCapabilities:
          'Individual poly-bag packaging with size sticker and barcode label. ' +
          'Inner carton: 12 pcs per colour/size with master carton of 144 pcs. ' +
          'Hangtag and label insertion available (own brand or buyer-supplied). ' +
          'Retail-ready packaging with hanger (hook-in-neck for shirts and kurtis). ' +
          'Export packing per buyer\'s packaging spec. ' +
          'Eco-friendly poly bags available (recycled LDPE) at 5% surcharge. ' +
          'ISPM-15 compliant wooden pallets for FCL shipments.',
        logisticsPartners:
          'DHL Express, FedEx International Priority, UPS Worldwide. ' +
          'Sea freight via Chennai Port (FCL/LCL) through Allied Shipping Pvt Ltd. ' +
          'Domestic: Blue Dart Priority and Delhivery B2B.',
        qualityControl:
          'Six-stage quality management aligned with ISO 9001:2015:\n' +
          '1. Fabric Incoming QC — GSM, shrinkage, pilling, colour fastness (Grade 4 minimum).\n' +
          '2. Pre-cutting Relaxation — All fabric rolled 24 h before spreading to control shrinkage.\n' +
          '3. Cut Panel Inspection — 10% random audit of cut panels; shade grouping before bundling.\n' +
          '4. In-Line SPI Check — Stitch density (14–18 SPI for knitwear), seam strength pull test every 2 h.\n' +
          '5. End-of-Line Inspection — 100% checking: measurements, appearance defects, stitch errors.\n' +
          '6. Pre-Shipment AQL — Random AQL 2.5 (Level II) sampling; third-party SGS inspection for EU buyers.',
        complianceStandards:
          'ISO 9001:2015 | Oeko-Tex Standard 100 (Class II) | REACH Regulation compliance | ' +
          'BIS mark for export garments | SA8000 (Social Accountability) — in progress | ' +
          'Carbon-neutral packaging (CarbonNeutral® certified poly-bag supplier).',

        // ── Step 7: Contact & Trade Information ───────────────────────────
        mainContact: {
          title:       'Mr.',
          firstName:   'Dinesh',
          middleName:  'P.',
          lastName:    'Ramachandran',
          designation: 'General Manager — Operations',
          department:  'Operations',
          email1:      'dinesh@prismgarments.qa',
          email2:      'dinesh.backup@prismgarments.qa',
          phone1:      '+919876012349',
          phone2:      '+919876012350',
          photo:       IMG.contactPhoto1,
          localLandlineStd:        '0421',
          localLandlineNumber:     '2345682',
          intlLandlineCountryCode: '+44',
          intlLandlineStd:         '161',
          intlLandlineNumber:      '1234570',
        },
        alternateContacts: [
          {
            title:       'Ms.',
            firstName:   'Kavitha',
            middleName:  'S.',
            lastName:    'Nair',
            designation: 'Export Manager',
            department:  'Export',
            email1:      'kavitha@prismgarments.qa',
            email2:      'kavitha.backup@prismgarments.qa',
            phone1:      '+919876012351',
            phone2:      '+919876012352',
            photo:       IMG.contactPhoto1,
            localLandlineStd:    '0421',
            localLandlineNumber: '2345683',
          },
          {
            title:       'Mr.',
            firstName:   'Selvam',
            middleName:  'A.',
            lastName:    'Krishnamurthy',
            designation: 'QC Head',
            department:  'Quality Control',
            email1:      'selvam.qc@prismgarments.qa',
            phone1:      '+919876012353',
            photo:       IMG.contactPhoto2,
            localLandlineStd:    '0421',
            localLandlineNumber: '2345684',
          },
          {
            title:       'Mr.',
            firstName:   'Rajan',
            middleName:  'T.',
            lastName:    'Murugan',
            designation: 'Accounts Manager',
            department:  'Finance',
            email1:      'accounts@prismgarments.qa',
            phone1:      '+919876012354',
            photo:       IMG.contactPhoto2,
          },
        ],

        tradeLicenseNumber:         'TN/TRADE/2008/TRP-78901',
        businessRegistrationNumber: 'U18101TN2008PTC069512',
        taxIdentificationNumber:    'AAGCP8821K',
      },
    });

    console.log(`✅  Vendor created — ${vendor.companyName} (${vendor.email})  [${vendorCode}]`);
  }

  // ── 2. Certifications ─────────────────────────────────────────────────────
  const existingCerts = await prisma.vendorCertification.findMany({ where: { vendorId: vendor.id } });

  if (existingCerts.length > 0) {
    console.log(`✅  Certifications already exist (${existingCerts.length} records)`);
  } else {
    await prisma.vendorCertification.createMany({
      data: [
        {
          vendorId:          vendor.id,
          name:              'ISO 9001:2015 — Quality Management System',
          issuedBy:          'Bureau Veritas India Pvt Ltd',
          certificateNumber: 'BV-ISO9001-2023-IN-TRP-44521',
          issuedDate:        new Date('2023-08-01'),
          expiryDate:        new Date('2026-07-31'),
          documentUrl:       IMG.cert1,
          isCustom:          false,
        },
        {
          vendorId:          vendor.id,
          name:              'OEKO-TEX Standard 100',
          issuedBy:          'HOHENSTEIN Institut für Textilinnovation gGmbH',
          certificateNumber: 'OT-2024-TN-HOH-112234',
          issuedDate:        new Date('2024-04-01'),
          expiryDate:        new Date('2025-03-31'),
          documentUrl:       IMG.cert2,
          isCustom:          false,
        },
        {
          vendorId:          vendor.id,
          name:              'GOTS (Global Organic Textile Standard) v6.0',
          issuedBy:          'OneCert India Pvt Ltd',
          certificateNumber: 'GOTS-OC-2024-TN-8834',
          issuedDate:        new Date('2024-01-15'),
          expiryDate:        new Date('2025-01-14'),
          documentUrl:       IMG.cert3,
          isCustom:          false,
        },
        {
          vendorId:          vendor.id,
          name:              'WRAP (Worldwide Responsible Accredited Production)',
          issuedBy:          'Worldwide Responsible Accredited Production',
          certificateNumber: 'WRAP-GOLD-IN-2024-TRP-00782',
          issuedDate:        new Date('2024-06-01'),
          expiryDate:        new Date('2025-05-31'),
          documentUrl:       IMG.cert4,
          isCustom:          false,
        },
        {
          vendorId:          vendor.id,
          name:              'Sedex SMETA 4-Pillar Audit',
          issuedBy:          'Intertek India Pvt Ltd',
          certificateNumber: 'SMETA-INT-TN-2024-3341',
          issuedDate:        new Date('2024-03-10'),
          expiryDate:        new Date('2026-03-09'),
          documentUrl:       IMG.cert1,
          isCustom:          false,
        },
        {
          vendorId:          vendor.id,
          name:              'Zero Liquid Discharge (ZLD) Certification',
          issuedBy:          'Tamil Nadu Pollution Control Board',
          certificateNumber: 'TNPCB/ZLD/TRP/2024/00189',
          issuedDate:        new Date('2024-02-28'),
          expiryDate:        new Date('2025-02-27'),
          documentUrl:       IMG.cert2,
          description:       'Zero liquid discharge facility certification for our dyeing unit — all effluents are treated and recycled with no discharge to external water bodies.',
          isCustom:          true,
        },
        {
          vendorId:          vendor.id,
          name:              'Make in India — Verified Manufacturer Badge',
          issuedBy:          'Department for Promotion of Industry and Internal Trade (DPIIT)',
          certificateNumber: 'DPIIT/MII/TN/2022/GRM/04521',
          issuedDate:        new Date('2022-10-01'),
          expiryDate:        new Date('2027-09-30'),
          documentUrl:       IMG.cert3,
          description:       'Official Make in India verified manufacturer. All products manufactured within India with ≥50% domestic value addition.',
          isCustom:          true,
        },
      ],
    });
    console.log(`✅  Created 7 certifications`);
  }

  // ── 3. Documents ──────────────────────────────────────────────────────────
  const existingDocs = await prisma.vendorDocument.findMany({ where: { vendorId: vendor.id } });

  if (existingDocs.length > 0) {
    console.log(`✅  Documents already exist (${existingDocs.length} records)`);
  } else {
    await prisma.vendorDocument.createMany({
      data: [
        { vendorId: vendor.id, type: 'GST_CERTIFICATE',       name: 'GST Registration Certificate — 33AAGCP8821K1ZQ',             documentUrl: IMG.doc1 },
        { vendorId: vendor.id, type: 'PAN_CARD',              name: 'PAN Card — AAGCP8821K',                                       documentUrl: IMG.doc2 },
        { vendorId: vendor.id, type: 'COMPANY_REGISTRATION',  name: 'Certificate of Incorporation — U18101TN2008PTC069512',         documentUrl: IMG.doc3 },
        { vendorId: vendor.id, type: 'EXPORT_LICENSE',        name: 'IEC Certificate — 0415089321',                                 documentUrl: IMG.doc4 },
        { vendorId: vendor.id, type: 'FACTORY_LICENSE',       name: 'Factory License — TN/FLR/2008/TRP-2209',                      documentUrl: IMG.doc5 },
        { vendorId: vendor.id, type: 'POLLUTION_CERTIFICATE', name: 'Pollution Control Consent to Operate — TNPCB/CTO/2024/0892',  documentUrl: IMG.doc6 },
        { vendorId: vendor.id, type: 'FIRE_SAFETY_CERTIFICATE', name: 'Fire NOC — TRP/Fire/2024/NOC-1145',                         documentUrl: IMG.doc1 },
        { vendorId: vendor.id, type: 'QUALITY_CERTIFICATES',  name: 'ISO 9001:2015 Certificate — BV-ISO9001-2023-IN-TRP-44521',    documentUrl: IMG.doc2 },
      ],
    });
    console.log(`✅  Created 8 documents`);
  }

  // ── 4. Bank Details ───────────────────────────────────────────────────────
  const existingBank = await prisma.vendorBankDetails.findUnique({ where: { vendorId: vendor.id } });

  if (existingBank) {
    console.log(`✅  Bank details already exist`);
  } else {
    await prisma.vendorBankDetails.create({
      data: {
        vendorId:          vendor.id,
        bankName:          'ICICI Bank Ltd',
        accountNumber:     '629001234567',
        ifscCode:          'ICIC0006290',
        swiftCode:         'ICICINBBCTS',
        iban:              'IN29ICIC0006290629001234567',
        accountType:       'Current',
        accountHolderName: 'Prism Garments & Exports Pvt Ltd',
        branchName:        'Tiruppur Avinashi Road Branch',
        branchAddress:     '23, Avinashi Road, Tiruppur, Tamil Nadu 641603',
        isVerified:        false,
      },
    });
    console.log(`✅  Bank details created`);
  }

  // ── 5. Trade References ───────────────────────────────────────────────────
  const existingRefs = await prisma.vendorReference.findMany({ where: { vendorId: vendor.id } });

  if (existingRefs.length > 0) {
    console.log(`✅  References already exist (${existingRefs.length} records)`);
  } else {
    await prisma.vendorReference.createMany({
      data: [
        {
          vendorId:      vendor.id,
          companyName:   'Marks & Spencer Reliance India Pvt Ltd',
          contactPerson: 'Ms. Preethi Sharma',
          email:         'preethi.sharma@marksandspencer.com',
          phone:         '+912244551234',
          relationship:  'Client',
        },
        {
          vendorId:      vendor.id,
          companyName:   'Next Retail India Ltd',
          contactPerson: 'Mr. Oliver Hughes',
          email:         'ohughes@nextretail.co.uk',
          phone:         '+441132001234',
          relationship:  'Export Buyer',
        },
        {
          vendorId:      vendor.id,
          companyName:   'Arvind Mills Ltd',
          contactPerson: 'Mr. Suresh Patel',
          email:         'suresh.patel@arvindmills.com',
          phone:         '+917927501234',
          relationship:  'Fabric Supplier',
        },
      ],
    });
    console.log(`✅  Created 3 vendor references`);
  }

  // ── 6. Products ───────────────────────────────────────────────────────────

  async function ensureProduct({
    name, slug, description, category, subCategory,
    basePrice, originalPrice, discount, gstPercentage,
    fabricType, material, fabricSpecifications,
    hasVariants, singleUnitColor, singleUnitColorHex, singleUnitSize,
    baseSku, uom, tags, dimensions, weight, weightUnit,
    totalStock, lowStockThreshold,
    dispatchTimeline, logisticsConfig,
    variants = [], images = [],
  }) {
    const existing = await prisma.product.findFirst({ where: { vendorId: vendor.id, baseSku } });
    if (existing) {
      console.log(`✅  Product already exists — ${name}`);
      return existing;
    }

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name, slug, description, category, subCategory,
        basePrice, originalPrice, discount, gstPercentage,
        fabricType, material, fabricSpecifications,
        hasVariants,
        ...(singleUnitColor    ? { singleUnitColor }    : {}),
        ...(singleUnitColorHex ? { singleUnitColorHex } : {}),
        ...(singleUnitSize     ? { singleUnitSize }     : {}),
        baseSku, uom, tags,
        dimensions, weight, weightUnit,
        totalStock, lowStockThreshold, trackInventory: true,
        dispatchTimeline, logisticsConfig,
        inStock:        true,
        status:         'ACTIVE',
        approvalStatus: 'PENDING',
      },
    });

    if (variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map(v => ({ ...v, productId: product.id })),
      });
    }

    if (images.length > 0) {
      await prisma.productImage.createMany({
        data: images.map((img, idx) => ({ ...img, productId: product.id, sortOrder: idx })),
      });
    }

    console.log(`✅  Product created — ${name}  (${variants.length} variants, ${images.length} images)`);
    return product;
  }

  // ── Product 1: Men's Cotton Polo T-Shirt ──────────────────────────────────
  await ensureProduct({
    name:        "Men's Premium Cotton Polo T-Shirt",
    slug:        'prism-mens-cotton-polo-tshirt',
    description:
      "Double-mercerised 220 GSM single-jersey knit polo T-shirt. Ribbed collar and cuff with " +
      "3-button placket. Double-needle bottom hem. Silicone-washed for extra softness. " +
      "Reactive-dyed for superior colour fastness (ISO 105-C06: Grade 4–5). " +
      "Side seams for tailored fit. Available in 6 colours and 5 sizes (XS–3XL). " +
      "Care: Machine wash cold, do not bleach, tumble dry low.",
    category:    'T-Shirts',
    subCategory: 'Polo T-Shirts',
    basePrice:      420,
    originalPrice:  550,
    discount:       23.64,
    gstPercentage:  12,
    fabricType:  'Cotton',
    material:    '100% Combed Organic Cotton (BCI Certified)',
    fabricSpecifications: {
      construction:   'Single Jersey — Polo Knit',
      gsm:            '220',
      yarnCount:      '30s Combed Cotton',
      yarnTwist:      'Z-twist',
      dyeType:        'Reactive dye (Huntsman Novacron series)',
      shrinkage:      '±3% after 3 washes (AATCC 135)',
      colourfastness: 'Grade 4–5 (wash); Grade 4 (rubbing)',
      construction2:  '30/1 yarn; 28 courses × 22 wales per 2.54 cm',
      labels:         'Woven care label (chest seam); heat-transfer brand label (left chest)',
      packagingNote:  'Polybag folded with size sticker; tissue-paper wrapped for retail',
    },
    hasVariants: true,
    baseSku:     'PGE-25-001',
    uom:         'pcs',
    tags:        ['polo', 't-shirt', 'cotton', 'men', 'casual', 'mercerised', 'organic'],
    dimensions:  'XS–3XL (standard sizing chart enclosed)',
    weight:      '220',
    weightUnit:  'g',
    totalStock:  2400,
    lowStockThreshold: 50,
    dispatchTimeline: { standard: '5–7 business days', express: '2–3 business days' },
    logisticsConfig: {
      mode:         'road',
      weightKg:     0.25,
      dimensionsCm: '30 × 22 × 3',
      fragile:      false,
    },
    variants: [
      { variantName: 'Navy XS',   size: 'XS', color: 'Navy Blue',    colorHex: '#000080', sku: 'PGE-25-001-A', price: 420, originalPrice: 550, discount: 23.64, stock: 80,  lowStockThreshold: 10, images: [IMG.p1a, IMG.p1b] },
      { variantName: 'Navy S',    size: 'S',  color: 'Navy Blue',    colorHex: '#000080', sku: 'PGE-25-001-B', price: 420, originalPrice: 550, discount: 23.64, stock: 100, lowStockThreshold: 10, images: [IMG.p1a, IMG.p1b] },
      { variantName: 'Navy M',    size: 'M',  color: 'Navy Blue',    colorHex: '#000080', sku: 'PGE-25-001-C', price: 420, originalPrice: 550, discount: 23.64, stock: 120, lowStockThreshold: 10, images: [IMG.p1a] },
      { variantName: 'Navy L',    size: 'L',  color: 'Navy Blue',    colorHex: '#000080', sku: 'PGE-25-001-D', price: 420, originalPrice: 550, discount: 23.64, stock: 110, lowStockThreshold: 10, images: [IMG.p1a] },
      { variantName: 'Navy XL',   size: 'XL', color: 'Navy Blue',    colorHex: '#000080', sku: 'PGE-25-001-E', price: 420, originalPrice: 550, discount: 23.64, stock: 80,  lowStockThreshold: 10, images: [IMG.p1b] },
      { variantName: 'Navy 2XL',  size: '2XL',color: 'Navy Blue',    colorHex: '#000080', sku: 'PGE-25-001-F', price: 450, originalPrice: 580, discount: 22.41, stock: 60,  lowStockThreshold: 8,  images: [IMG.p1b] },
      { variantName: 'White M',   size: 'M',  color: 'White',        colorHex: '#FFFFFF', sku: 'PGE-25-001-G', price: 420, originalPrice: 550, discount: 23.64, stock: 100, lowStockThreshold: 10, images: [IMG.p1a] },
      { variantName: 'White L',   size: 'L',  color: 'White',        colorHex: '#FFFFFF', sku: 'PGE-25-001-H', price: 420, originalPrice: 550, discount: 23.64, stock: 90,  lowStockThreshold: 10, images: [IMG.p1a] },
      { variantName: 'Bottle M',  size: 'M',  color: 'Bottle Green', colorHex: '#006A4E', sku: 'PGE-25-001-I', price: 420, originalPrice: 550, discount: 23.64, stock: 70,  lowStockThreshold: 8,  images: [IMG.p1b] },
      { variantName: 'Maroon M',  size: 'M',  color: 'Maroon',       colorHex: '#800000', sku: 'PGE-25-001-J', price: 420, originalPrice: 550, discount: 23.64, stock: 65,  lowStockThreshold: 8,  images: [IMG.p1b] },
    ],
    images: [
      { url: IMG.p1a, alt: "Men's Cotton Polo T-Shirt — Navy Blue front view", isPrimary: true,  imageType: 'cover' },
      { url: IMG.p1b, alt: "Men's Cotton Polo T-Shirt — collar and placket detail", isPrimary: false, imageType: 'gallery' },
      { url: IMG.p2a, alt: "Men's Cotton Polo T-Shirt — lifestyle shot",         isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 2: Women's A-Line Printed Kurti Set ──────────────────────────
  await ensureProduct({
    name:        "Women's A-Line Printed Kurti Set (Kurti + Dupatta)",
    slug:        'prism-womens-aline-printed-kurti-set',
    description:
      "Elegant A-line kurti with matching dupatta in 100% viscose rayon. " +
      "Digital block-print design inspired by traditional Rajasthani motifs. " +
      "V-neck with knotted tassel tie, 3/4 sleeves, side slits. " +
      "Dupatta: 2.5 m printed viscose with tassels. Machine print with reactive dyes — " +
      "fade-resistant up to 30 washes. Set comes in 3 colour families × 5 sizes. " +
      "Hand wash recommended (30°C). Iron at medium heat.",
    category:    'Kurtis',
    subCategory: 'Kurti Sets',
    basePrice:      850,
    originalPrice:  1100,
    discount:       22.73,
    gstPercentage:  5,
    fabricType:  'Viscose Rayon',
    material:    '100% Viscose Rayon (70 GSM georgette base)',
    fabricSpecifications: {
      gsm:            '70',
      construction:   'Woven — Plain weave with dobby border',
      shrinkage:      '±3% after first wash',
      printType:      'Digital reactive print (Mimaki TX300P-1800)',
      colourfastness: 'Grade 4 (wash), Grade 3–4 (rubbing)',
      dyeType:        'Reactive dye on viscose base',
      labels:         'Printed care label (inner hem); woven brand label (inner neckband)',
      packagingNote:  'Individual OPP bag + hanger; kraft box for premium gift packaging (optional)',
    },
    hasVariants: true,
    baseSku:     'PGE-25-002',
    uom:         'sets',
    tags:        ['kurti', 'women', 'ethnic', 'viscose', 'printed', 'dupatta', 'set', 'casual'],
    dimensions:  'XS (34) – 3XL (46) — standard Indian size chart',
    weight:      '480',
    weightUnit:  'g',
    totalStock:  1200,
    lowStockThreshold: 30,
    dispatchTimeline: { standard: '4–6 business days', express: '2–3 business days' },
    logisticsConfig: { mode: 'road', weightKg: 0.5, dimensionsCm: '35 × 30 × 5', fragile: false },
    variants: [
      { variantName: 'Indigo Floral S',   size: 'S (36)',  color: 'Indigo',       colorHex: '#4B0082', sku: 'PGE-25-002-A', price: 850, originalPrice: 1100, discount: 22.73, stock: 60, lowStockThreshold: 8, images: [IMG.p2a, IMG.p2b] },
      { variantName: 'Indigo Floral M',   size: 'M (38)',  color: 'Indigo',       colorHex: '#4B0082', sku: 'PGE-25-002-B', price: 850, originalPrice: 1100, discount: 22.73, stock: 80, lowStockThreshold: 8, images: [IMG.p2a] },
      { variantName: 'Indigo Floral L',   size: 'L (40)',  color: 'Indigo',       colorHex: '#4B0082', sku: 'PGE-25-002-C', price: 850, originalPrice: 1100, discount: 22.73, stock: 70, lowStockThreshold: 8, images: [IMG.p2a] },
      { variantName: 'Rust Paisley M',    size: 'M (38)',  color: 'Rust Orange',  colorHex: '#B7410E', sku: 'PGE-25-002-D', price: 850, originalPrice: 1100, discount: 22.73, stock: 65, lowStockThreshold: 8, images: [IMG.p2b] },
      { variantName: 'Rust Paisley L',    size: 'L (40)',  color: 'Rust Orange',  colorHex: '#B7410E', sku: 'PGE-25-002-E', price: 850, originalPrice: 1100, discount: 22.73, stock: 55, lowStockThreshold: 8, images: [IMG.p2b] },
      { variantName: 'Teal Block M',      size: 'M (38)',  color: 'Teal',         colorHex: '#008080', sku: 'PGE-25-002-F', price: 850, originalPrice: 1100, discount: 22.73, stock: 50, lowStockThreshold: 6, images: [IMG.p2a] },
      { variantName: 'Teal Block L',      size: 'L (40)',  color: 'Teal',         colorHex: '#008080', sku: 'PGE-25-002-G', price: 850, originalPrice: 1100, discount: 22.73, stock: 45, lowStockThreshold: 6, images: [IMG.p2a] },
      { variantName: 'Teal Block XL',     size: 'XL (42)', color: 'Teal',         colorHex: '#008080', sku: 'PGE-25-002-H', price: 875, originalPrice: 1125, discount: 22.22, stock: 40, lowStockThreshold: 6, images: [IMG.p2b] },
    ],
    images: [
      { url: IMG.p2a, alt: "Women's A-Line Printed Kurti Set — Indigo Floral", isPrimary: true,  imageType: 'cover' },
      { url: IMG.p2b, alt: "Kurti Set — Rust Paisley dupatta detail",          isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 3: Men's Premium Cotton Formal Shirt ─────────────────────────
  await ensureProduct({
    name:        "Men's Premium Cotton Formal Shirt",
    slug:        'prism-mens-premium-cotton-formal-shirt',
    description:
      "Premium 2-ply 60s Egyptian-cotton formal shirt with spread collar. " +
      "Non-iron finish (Easy Care® resin treatment). Fused chest-and-collar interlining for sharp, all-day structure. " +
      "14 SPI lockstitch; bartacked stress points. Mother-of-pearl effect buttons. " +
      "Back box pleat with locker loop. Available in solid and pinstripe versions. " +
      "Machine wash at 40°C; easy iron. Pre-washed to control shrinkage to ±1%.",
    category:    'Shirts',
    subCategory: 'Formal Shirts',
    basePrice:      695,
    originalPrice:  895,
    discount:       22.35,
    gstPercentage:  12,
    fabricType:  'Cotton',
    material:    '100% 2-ply 60s Combed Egyptian Cotton',
    fabricSpecifications: {
      construction:   '130 × 80 (warp × weft per 2.54 cm)',
      gsm:            '115',
      yarnCount:      '60s × 60s — 2-ply',
      finish:         'Easy Care® non-iron resin finish; silicone hand feel',
      shrinkage:      '±1% (AATCC 135 — 5 wash cycles)',
      colourfastness: 'Grade 4–5 (wash, light, crocking)',
      interlining:    'Fused thermobond chest piece and collar stand',
      buttons:        'MOP-effect polyester 4-hole buttons (15L); shanked back button',
      labels:         'Woven brand label (neckband inner); woven care label (left side seam); printed size tab (collar band)',
      packagingNote:  'Collar-stayed on cardboard insert; folded and pinned; polybag; 12 pcs per inner carton',
    },
    hasVariants: true,
    baseSku:     'PGE-25-003',
    uom:         'pcs',
    tags:        ['shirt', 'formal', 'men', 'cotton', 'egyptian-cotton', 'non-iron', 'office'],
    dimensions:  'Collar sizes: 38–46 cm; Chest: 86–116 cm',
    weight:      '280',
    weightUnit:  'g',
    totalStock:  1800,
    lowStockThreshold: 40,
    dispatchTimeline: { standard: '5–7 business days', express: '2–3 business days' },
    logisticsConfig: { mode: 'road', weightKg: 0.3, dimensionsCm: '35 × 28 × 4', fragile: false },
    variants: [
      { variantName: 'White 38',     size: '38',  color: 'White',         colorHex: '#FFFFFF', sku: 'PGE-25-003-A', price: 695, originalPrice: 895, discount: 22.35, stock: 80,  lowStockThreshold: 10, images: [IMG.p3a, IMG.p3b] },
      { variantName: 'White 40',     size: '40',  color: 'White',         colorHex: '#FFFFFF', sku: 'PGE-25-003-B', price: 695, originalPrice: 895, discount: 22.35, stock: 100, lowStockThreshold: 10, images: [IMG.p3a] },
      { variantName: 'White 42',     size: '42',  color: 'White',         colorHex: '#FFFFFF', sku: 'PGE-25-003-C', price: 695, originalPrice: 895, discount: 22.35, stock: 90,  lowStockThreshold: 10, images: [IMG.p3a] },
      { variantName: 'White 44',     size: '44',  color: 'White',         colorHex: '#FFFFFF', sku: 'PGE-25-003-D', price: 695, originalPrice: 895, discount: 22.35, stock: 70,  lowStockThreshold: 8,  images: [IMG.p3b] },
      { variantName: 'Sky Blue 38',  size: '38',  color: 'Sky Blue',      colorHex: '#87CEEB', sku: 'PGE-25-003-E', price: 695, originalPrice: 895, discount: 22.35, stock: 70,  lowStockThreshold: 8,  images: [IMG.p3a] },
      { variantName: 'Sky Blue 40',  size: '40',  color: 'Sky Blue',      colorHex: '#87CEEB', sku: 'PGE-25-003-F', price: 695, originalPrice: 895, discount: 22.35, stock: 85,  lowStockThreshold: 8,  images: [IMG.p3a] },
      { variantName: 'Sky Blue 42',  size: '42',  color: 'Sky Blue',      colorHex: '#87CEEB', sku: 'PGE-25-003-G', price: 695, originalPrice: 895, discount: 22.35, stock: 75,  lowStockThreshold: 8,  images: [IMG.p3b] },
      { variantName: 'Blue Pin 40',  size: '40',  color: 'Blue Pinstripe',colorHex: '#5B92C0', sku: 'PGE-25-003-H', price: 750, originalPrice: 950, discount: 21.05, stock: 60,  lowStockThreshold: 6,  images: [IMG.p3b] },
      { variantName: 'Blue Pin 42',  size: '42',  color: 'Blue Pinstripe',colorHex: '#5B92C0', sku: 'PGE-25-003-I', price: 750, originalPrice: 950, discount: 21.05, stock: 55,  lowStockThreshold: 6,  images: [IMG.p3b] },
    ],
    images: [
      { url: IMG.p3a, alt: "Men's Formal Cotton Shirt — White front view",      isPrimary: true,  imageType: 'cover' },
      { url: IMG.p3b, alt: "Men's Formal Cotton Shirt — collar and button detail", isPrimary: false, imageType: 'gallery' },
      { url: IMG.p1b, alt: "Men's Formal Cotton Shirt — Sky Blue lifestyle",    isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 4: Unisex Cotton Fleece Joggers ───────────────────────────────
  await ensureProduct({
    name:        'Unisex Cotton Fleece Jogger Track Pants',
    slug:        'prism-unisex-cotton-fleece-jogger-track-pants',
    description:
      "Heavyweight 320 GSM cotton-spandex fleece jogger pants. Inner brushed fleece for warmth. " +
      "2.5 cm elastic waistband with internal drawstring (same-fabric covered). " +
      "2 side slash pockets + 1 rear patch pocket with Velcro closure. " +
      "Ribbed knit cuffs (ankle). Drop-crotch tapered fit. " +
      "YKK zippers on rear pocket. Unisex sizing (XS–3XL). " +
      "Care: Machine wash inside-out at 30°C; do not bleach; tumble dry low.",
    category:    'Track Pants',
    subCategory: 'Joggers',
    basePrice:      680,
    originalPrice:  850,
    discount:       20.00,
    gstPercentage:  12,
    fabricType:  'Cotton Fleece',
    material:    '80% Combed Cotton, 18% Polyester, 2% Elastane (Spandex)',
    fabricSpecifications: {
      gsm:            '320',
      construction:   '3-thread fleece with brushed inside',
      yarnCount:      '30s combed cotton + 75D polyester',
      stretch:        '4-way — 35% horizontal, 20% vertical',
      shrinkage:      '±4% after 5 washes',
      colourfastness: 'Grade 4 (wash); Grade 3–4 (crocking)',
      trims:          'YKK 15 cm nylon zipper (rear pocket); YKK drawcord stopper',
      labels:         'Heat-transfer size label (waistband inner); woven care label (left side seam)',
      packagingNote:  'Folded flat with size sticker; polybag sealed; 12 pcs per inner carton',
    },
    hasVariants: true,
    baseSku:     'PGE-25-004',
    uom:         'pcs',
    tags:        ['jogger', 'track pants', 'fleece', 'cotton', 'unisex', 'casual', 'athleisure'],
    dimensions:  'XS–3XL unisex (inseam 76 cm for M)',
    weight:      '520',
    weightUnit:  'g',
    totalStock:  1500,
    lowStockThreshold: 30,
    dispatchTimeline: { standard: '5–7 business days', express: '2–3 business days' },
    logisticsConfig: { mode: 'road', weightKg: 0.55, dimensionsCm: '32 × 28 × 5', fragile: false },
    variants: [
      { variantName: 'Charcoal XS', size: 'XS', color: 'Charcoal',     colorHex: '#36454F', sku: 'PGE-25-004-A', price: 680, originalPrice: 850, discount: 20.00, stock: 60,  lowStockThreshold: 8, images: [IMG.p4a] },
      { variantName: 'Charcoal S',  size: 'S',  color: 'Charcoal',     colorHex: '#36454F', sku: 'PGE-25-004-B', price: 680, originalPrice: 850, discount: 20.00, stock: 80,  lowStockThreshold: 8, images: [IMG.p4a] },
      { variantName: 'Charcoal M',  size: 'M',  color: 'Charcoal',     colorHex: '#36454F', sku: 'PGE-25-004-C', price: 680, originalPrice: 850, discount: 20.00, stock: 100, lowStockThreshold: 8, images: [IMG.p4a] },
      { variantName: 'Charcoal L',  size: 'L',  color: 'Charcoal',     colorHex: '#36454F', sku: 'PGE-25-004-D', price: 680, originalPrice: 850, discount: 20.00, stock: 90,  lowStockThreshold: 8, images: [IMG.p4a] },
      { variantName: 'Charcoal XL', size: 'XL', color: 'Charcoal',     colorHex: '#36454F', sku: 'PGE-25-004-E', price: 680, originalPrice: 850, discount: 20.00, stock: 70,  lowStockThreshold: 8, images: [IMG.p4a] },
      { variantName: 'Black M',     size: 'M',  color: 'Black',         colorHex: '#000000', sku: 'PGE-25-004-F', price: 680, originalPrice: 850, discount: 20.00, stock: 90,  lowStockThreshold: 8, images: [IMG.p4a] },
      { variantName: 'Black L',     size: 'L',  color: 'Black',         colorHex: '#000000', sku: 'PGE-25-004-G', price: 680, originalPrice: 850, discount: 20.00, stock: 80,  lowStockThreshold: 8, images: [IMG.p4a] },
      { variantName: 'Olive M',     size: 'M',  color: 'Olive Green',   colorHex: '#6B7C44', sku: 'PGE-25-004-H', price: 700, originalPrice: 870, discount: 19.54, stock: 60,  lowStockThreshold: 6, images: [IMG.p4a] },
      { variantName: 'Navy M',      size: 'M',  color: 'Navy',          colorHex: '#001F5B', sku: 'PGE-25-004-I', price: 680, originalPrice: 850, discount: 20.00, stock: 55,  lowStockThreshold: 6, images: [IMG.p4a] },
    ],
    images: [
      { url: IMG.p4a, alt: 'Unisex Cotton Fleece Jogger — Charcoal front view', isPrimary: true,  imageType: 'cover' },
      { url: IMG.p3b, alt: 'Jogger — pocket and drawstring detail',              isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 5: Men's Straight Kurta Pyjama Set ───────────────────────────
  await ensureProduct({
    name:        "Men's Straight-Cut Kurta Pyjama Set",
    slug:        'prism-mens-straight-kurta-pyjama-set',
    description:
      "Classic Indian kurta-pyjama set in 100% Khadi-effect cotton. " +
      "Kurta: straight cut with mandarin (band) collar, three-quarter sleeves, side slits. " +
      "Kurta length: 42 inches. Pyjama: straight-cut with 3 cm elastic waistband and nada (drawstring). " +
      "Embellished with pin-tuck detailing at chest (4 rows). Contrast border at hem and cuffs. " +
      "Set available in 4 colours × 4 sizes (S–3XL). Dry clean recommended; " +
      "gentle machine wash at 30°C if necessary.",
    category:    'Ethnic Wear',
    subCategory: 'Kurta Sets',
    basePrice:      1250,
    originalPrice:  1600,
    discount:       21.88,
    gstPercentage:  5,
    fabricType:  'Cotton',
    material:    '100% Handspun Khadi-effect Cotton (khadi-weave simulation on power loom)',
    fabricSpecifications: {
      gsm:            '145',
      construction:   'Plain weave — Khadi texture finish',
      yarnCount:      '40s × 40s hand-spun character yarn',
      shrinkage:      '±4% pre-washed; ±2% after subsequent washes',
      colourfastness: 'Grade 4 (wash); Grade 3–4 (crocking)',
      dyeType:        'Vat dyes (earthy tones); reactive for brights',
      embellishments: 'Pin-tuck chest detailing; 3-button cotton-covered buttons; contrast hem border (2 cm)',
      labels:         'Woven brand label (neck inner); printed care label (left side seam); fabric composition tag',
      packagingNote:  'Set folded together in OPP bag with kurta on top; size sticker and hangtag; gift-box option available',
    },
    hasVariants: true,
    baseSku:     'PGE-25-005',
    uom:         'sets',
    tags:        ['kurta', 'pyjama', 'set', 'ethnic', 'cotton', 'men', 'festive', 'khadi', 'traditional'],
    dimensions:  'Kurta: S (38)–3XL (48); Pyjama: S–3XL (waist 28–42 inches)',
    weight:      '650',
    weightUnit:  'g',
    totalStock:  900,
    lowStockThreshold: 20,
    dispatchTimeline: { standard: '5–7 business days', express: '3–4 business days' },
    logisticsConfig: { mode: 'road', weightKg: 0.7, dimensionsCm: '38 × 32 × 6', fragile: false },
    variants: [
      { variantName: 'Off-White S',      size: 'S (38)',  color: 'Off-White',     colorHex: '#FAF9F6', sku: 'PGE-25-005-A', price: 1250, originalPrice: 1600, discount: 21.88, stock: 40, lowStockThreshold: 5, images: [IMG.p5a, IMG.p5b] },
      { variantName: 'Off-White M',      size: 'M (40)',  color: 'Off-White',     colorHex: '#FAF9F6', sku: 'PGE-25-005-B', price: 1250, originalPrice: 1600, discount: 21.88, stock: 55, lowStockThreshold: 5, images: [IMG.p5a] },
      { variantName: 'Off-White L',      size: 'L (42)',  color: 'Off-White',     colorHex: '#FAF9F6', sku: 'PGE-25-005-C', price: 1250, originalPrice: 1600, discount: 21.88, stock: 50, lowStockThreshold: 5, images: [IMG.p5a] },
      { variantName: 'Sage Green M',     size: 'M (40)',  color: 'Sage Green',    colorHex: '#8A9A5B', sku: 'PGE-25-005-D', price: 1250, originalPrice: 1600, discount: 21.88, stock: 45, lowStockThreshold: 5, images: [IMG.p5b] },
      { variantName: 'Sage Green L',     size: 'L (42)',  color: 'Sage Green',    colorHex: '#8A9A5B', sku: 'PGE-25-005-E', price: 1250, originalPrice: 1600, discount: 21.88, stock: 40, lowStockThreshold: 5, images: [IMG.p5b] },
      { variantName: 'Mustard M',        size: 'M (40)',  color: 'Mustard',       colorHex: '#FFDB58', sku: 'PGE-25-005-F', price: 1250, originalPrice: 1600, discount: 21.88, stock: 35, lowStockThreshold: 5, images: [IMG.p5a] },
      { variantName: 'Terracotta M',     size: 'M (40)',  color: 'Terracotta',    colorHex: '#C0533A', sku: 'PGE-25-005-G', price: 1280, originalPrice: 1630, discount: 21.47, stock: 30, lowStockThreshold: 5, images: [IMG.p5b] },
      { variantName: 'Terracotta L',     size: 'L (42)',  color: 'Terracotta',    colorHex: '#C0533A', sku: 'PGE-25-005-H', price: 1280, originalPrice: 1630, discount: 21.47, stock: 30, lowStockThreshold: 5, images: [IMG.p5b] },
    ],
    images: [
      { url: IMG.p5a, alt: "Men's Kurta Pyjama Set — Off-White front view", isPrimary: true,  imageType: 'cover' },
      { url: IMG.p5b, alt: "Kurta Pyjama Set — collar and button detail",   isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Product 6: Premium Irish Linen Shirting Fabric ────────────────────────
  await ensureProduct({
    name:        'Premium Irish Linen Shirting Fabric',
    slug:        'prism-premium-irish-linen-shirting-fabric',
    description:
      "Pure 100% linen shirting fabric in a herringbone twill weave. " +
      "Natural, breathable and moisture-wicking — ideal for premium formal and casual shirts. " +
      "Enzyme-washed for soft hand feel without sacrificing linen's natural texture. " +
      "Width: 140 cm. Sold per metre (minimum 20 metres per colour). " +
      "Available in 6 natural and pastel colours. Pre-shrunk for easy cutting. " +
      "GOTS certified linen source. Also available in natural (undyed, off-white) for artisan buyers.",
    category:    'Fabrics',
    subCategory: 'Shirting Fabric',
    basePrice:      380,
    originalPrice:  460,
    discount:       17.39,
    gstPercentage:  5,
    fabricType:  'Linen',
    material:    '100% Belgian / Irish Linen (Wet Spinning)',
    fabricSpecifications: {
      construction:   'Herringbone twill (2/1)',
      gsm:            '155',
      yarnCount:      'Nm 20/1 × Nm 20/1 wet-spun linen',
      width:          '140 cm (55 inches)',
      shrinkage:      '±3% pre-washed; enzyme-finished',
      colourfastness: 'Grade 4–5 (wash); Grade 4 (light)',
      dyeType:        'GOTS-certified low-impact reactive dyes',
      certifications: 'GOTS v6.0 (OneCert); Oeko-Tex Standard 100 Class I',
      finish:         'Enzyme-washed, calendered for subtle sheen',
      moq:            '20 metres per colour',
    },
    hasVariants:       false,
    singleUnitColor:   'Natural Ecru',
    singleUnitColorHex:'#F5F0E8',
    singleUnitSize:    'Per metre (140 cm width)',
    baseSku:     'PGE-25-006',
    uom:         'meters',
    tags:        ['linen', 'shirting', 'fabric', 'herringbone', 'premium', 'organic', 'breathable', 'formal'],
    dimensions:  'Width: 140 cm; sold by the metre',
    weight:      '155',
    weightUnit:  'g',
    totalStock:  3000,
    lowStockThreshold: 100,
    dispatchTimeline: { standard: '3–5 business days', express: '1–2 business days' },
    logisticsConfig: {
      mode:         'road',
      weightKg:     0.17,
      dimensionsCm: 'Roll 14 × 14 × varies by length',
      fragile:      false,
    },
    variants: [],
    images: [
      { url: IMG.p6a, alt: 'Premium Irish Linen Shirting Fabric — Natural Ecru, herringbone weave', isPrimary: true,  imageType: 'cover' },
      { url: IMG.p5b, alt: 'Linen fabric — close-up herringbone twill texture',                     isPrimary: false, imageType: 'gallery' },
    ],
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('🏭  TEST VENDOR 2 SEED COMPLETE — Prism Garments & Exports Pvt Ltd');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Vendor Code : ${vendor.vendorCode ?? '(see DB)'}`);
  console.log(`  Email       : ${VENDOR_EMAIL}`);
  console.log(`  Password    : ${VENDOR_PASSWORD}`);
  console.log(`  Status      : APPROVAL_PENDING  ← submitted, NOT yet approved`);
  console.log(`  Steps       : 8/8 complete (all registration fields filled)`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Products    : 6');
  console.log('    1. Men\'s Cotton Polo T-Shirt          (10 variants)');
  console.log('    2. Women\'s A-Line Printed Kurti Set   ( 8 variants)');
  console.log('    3. Men\'s Premium Cotton Formal Shirt  ( 9 variants)');
  console.log('    4. Unisex Cotton Fleece Joggers        ( 9 variants)');
  console.log('    5. Men\'s Straight Kurta Pyjama Set    ( 8 variants)');
  console.log('    6. Premium Irish Linen Shirting Fabric (no variants — sold/metre)');
  console.log('  Variants    : 44 across 5 products');
  console.log('  Certs       : 7 (ISO 9001, Oeko-Tex, GOTS, WRAP, SMETA, ZLD, MII)');
  console.log('  Documents   : 8 (GST, PAN, CIN, IEC, Factory Lic, Pollution, Fire, QC Cert)');
  console.log('  Bank Acct   : ICICI Bank — 629001234567 (not yet verified)');
  console.log('  References  : 3 (M&S Reliance, Next Retail UK, Arvind Mills)');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Owner Addr  : 12, Sri Krishnapuram Colony, Tiruppur 641652');
  console.log('  Contacts    : 4 (Main GM Ops + Export Mgr + QC Head + Accounts Mgr)');
  console.log('  Facilities  : Knitting, Cutting, Stitching, Dyeing, Printing, Finishing');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Next step   : Admin → Assign QC Checker → Factory + Product Inspection');
  console.log('══════════════════════════════════════════════════════════════\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
