/**
 * Seed script — adds a test QC Checker, a test Vendor, a test Product,
 * and an IN_PROGRESS Inspection so the digital-signature flow can be tested.
 *
 * Run:  node prisma/seedTestData.js
 * Safe: checks for existing records before inserting.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding test data…\n');

  // ─── 1. QC Checker ────────────────────────────────────────────────────────
  const CHECKER_EMAIL = 'testchecker@m2c.dev';
  const CHECKER_PASSWORD = 'Test@1234';

  let checker = await prisma.qCChecker.findUnique({ where: { email: CHECKER_EMAIL } });

  if (checker) {
    console.log(`✅  QC Checker already exists — ${checker.checkerId} (${checker.email})`);
  } else {
    // Derive the next checker ID
    const last = await prisma.qCChecker.findFirst({ orderBy: { createdAt: 'desc' }, select: { checkerId: true } });
    let num = 1;
    if (last?.checkerId) {
      const m = last.checkerId.match(/QC-(\d+)/);
      if (m) num = parseInt(m[1]) + 1;
    }
    const checkerId = `QC-${num.toString().padStart(3, '0')}`;
    const hashedPw  = await bcrypt.hash(CHECKER_PASSWORD, 10);

    checker = await prisma.qCChecker.create({
      data: {
        checkerId,
        email:         CHECKER_EMAIL,
        password:      hashedPw,
        name:          'Test QC Inspector',
        phone:         '+919876543210',
        address:       '12, MG Road',
        city:          'Chennai',
        state:         'Tamil Nadu',
        zipCode:       '600001',
        country:       'India',
        specialization:'Textile & Garments',
        experience:     5,
        certifications: 'ISO 9001, Six Sigma Green Belt',
        status:        'ACTIVE',
        isActive:       true,
        joiningDate:    new Date(),
      },
    });
    console.log(`✅  QC Checker created — ${checker.checkerId} (${checker.email})  password: ${CHECKER_PASSWORD}`);
  }

  // ─── 2. Vendor ────────────────────────────────────────────────────────────
  const VENDOR_EMAIL = 'testvendor@m2c.dev';

  let vendor = await prisma.vendor.findUnique({ where: { email: VENDOR_EMAIL } });

  if (vendor) {
    console.log(`✅  Vendor already exists — ${vendor.companyName} (${vendor.email})`);
  } else {
    const hashedPw = await bcrypt.hash('Vendor@1234', 10);

    vendor = await prisma.vendor.create({
      data: {
        email:           VENDOR_EMAIL,
        password:        hashedPw,
        // Owner Profile
        ownerName:       'Ravi Kumar',
        ownerEmail:      VENDOR_EMAIL,
        ownerPhone:      '+919876543211',
        // Company Details
        companyName:     'Test Fabrics Pvt Ltd',
        companyType:     'MANUFACTURER',
        businessType:    'pvt-ltd',
        gstNumber:       '33AABCT1332L1ZU',
        // Contact & Communication
        businessEmail:   VENDOR_EMAIL,
        businessPhone:   '+914412345678',
        businessAddress: '45 Industrial Estate, Peelamedu',
        businessCity:    'Coimbatore',
        businessState:   'Tamil Nadu',
        businessZipCode: '641001',
        businessCountry: 'India',
        // Vendor Type
        vendorType:      'TEXTILE_MANUFACTURER',
        vendorTypes:     ['TEXTILE_MANUFACTURER'],
        // Status
        status:          'APPROVED',
        assignedQcId:     checker.id,
      },
    });
    console.log(`✅  Vendor created — ${vendor.companyName} (${vendor.email})`);
  }

  // Link checker → vendor if not already
  if (vendor.assignedQcId !== checker.id) {
    await prisma.vendor.update({ where: { id: vendor.id }, data: { assignedQcId: checker.id } });
    console.log('   Linked checker → vendor');
  }

  // ─── 3. Product ───────────────────────────────────────────────────────────
  let product = await prisma.product.findFirst({ where: { vendorId: vendor.id, name: 'Test Cotton Saree' } });

  if (product) {
    console.log(`✅  Product already exists — ${product.name}`);
  } else {
    product = await prisma.product.create({
      data: {
        vendorId:        vendor.id,
        name:            'Test Cotton Saree',
        description:     'Handwoven cotton saree for QC inspection testing.',
        category:        'Sarees',
        subCategory:     'Cotton',
        basePrice:       1500,
        originalPrice:   1800,
        fabricType:      'Cotton',
        material:        '100% Cotton',
        baseSku:         'TST-24-001',
        dispatchTimeline: { standard: '7-10 days', express: '3-5 days' },
        status:          'ACTIVE',
        approvalStatus:  'PENDING',
        assignedQcId:     checker.id,
        hasVariants:      false,
        uom:              'pcs',
        totalStock:       50,
        trackInventory:   true,
      },
    });
    console.log(`✅  Product created — ${product.name}`);
  }

  // ─── 4. Inspection ────────────────────────────────────────────────────────
  let inspection = await prisma.inspection.findFirst({
    where: { vendorId: vendor.id, checkerId: checker.id, status: 'IN_PROGRESS' },
  });

  if (inspection) {
    console.log(`✅  Inspection already exists — ${inspection.id} (IN_PROGRESS)`);
  } else {
    const today  = new Date();
    const ddmmyy = today.toISOString().slice(0, 10); // YYYY-MM-DD

    inspection = await prisma.inspection.create({
      data: {
        vendorId:          vendor.id,
        checkerId:         checker.id,
        poNumber:          'PO-TEST-001',
        clientName:        'M2C Admin',
        scheduledDate:     ddmmyy,
        scheduledTime:     '10:00 AM',
        priority:          'medium',
        estimatedDuration: '2 hours',
        status:            'IN_PROGRESS',
        startedAt:          today,
        locationVerified:   true,
        itemsToInspect:     [
          {
            id:          'item-1',
            itemName:    'Test Cotton Saree',
            category:    'Sarees',
            subCategory: 'Cotton',
            quantity:    50,
            unit:        'pcs',
          },
        ],
      },
    });
    console.log(`✅  Inspection created — ${inspection.id} (IN_PROGRESS)`);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log('🔑  QC Checker login credentials:');
  console.log(`    Checker ID : ${checker.checkerId}`);
  console.log(`    Email      : ${checker.email}`);
  console.log(`    Password   : ${CHECKER_PASSWORD}`);
  console.log('─────────────────────────────────────────');
  console.log('🔗  Inspection ID  :', inspection.id);
  console.log('🏭  Vendor         :', vendor.companyName);
  console.log('📦  Product        :', product.name);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
