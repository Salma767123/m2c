const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateBaseStock() {
  try {
    console.log('Starting base stock migration...');

    // Get all inventory items
    const inventoryItems = await prisma.inventory.findMany({
      include: {
        products: {
          include: {
            variants: true
          }
        }
      }
    });

    console.log(`Found ${inventoryItems.length} inventory items to migrate`);

    for (const item of inventoryItems) {
      let baseStock = item.currentStock; // Default: base stock equals current stock

      // If this inventory item has a product with variants
      if (item.hasProductCreated && item.products.length > 0) {
        const product = item.products[0]; // Assuming one product per inventory item
        
        if (product.hasVariants && product.variants.length > 0) {
          // Calculate base stock = current stock - sum of variant stocks
          const variantStockSum = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
          baseStock = Math.max(0, item.currentStock - variantStockSum);
        }
      }

      // Update the inventory item with the calculated base stock
      await prisma.inventory.update({
        where: { id: item.id },
        data: { baseStock }
      });

      console.log(`Updated inventory ${item.sku}: baseStock=${baseStock}, currentStock=${item.currentStock}`);
    }

    console.log('Base stock migration completed successfully!');
  } catch (error) {
    console.error('Error during base stock migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  migrateBaseStock()
    .then(() => {
      console.log('Migration finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateBaseStock };