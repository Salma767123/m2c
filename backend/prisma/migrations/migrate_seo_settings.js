const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateSEOSettings() {
    try {
        console.log('Starting SEO settings migration...');

        // First, let's clean up any existing settings with null page values
        console.log('Cleaning up invalid SEO settings...');
        await prisma.$runCommandRaw({
            delete: "seo_settings",
            deletes: [
                {
                    q: { page: null },
                    limit: 0
                }
            ]
        });

        // Check if there are any existing SEO settings
        const existingSettings = await prisma.sEOSettings.findMany();
        console.log(`Found ${existingSettings.length} existing SEO settings`);

        // Create default page settings if none exist
        if (existingSettings.length === 0) {
            console.log('Creating default page-based SEO settings...');
            
            const defaultPages = ['home', 'about', 'products', 'categories', 'contact', 'privacy', 'terms', 'shipping', 'returns'];
            
            for (const page of defaultPages) {
                await prisma.sEOSettings.create({
                    data: { page }
                });
                console.log(`Created default SEO settings for ${page} page`);
            }
        } else {
            console.log('Page-based SEO settings already exist');
        }

        console.log('SEO settings migration completed successfully!');
    } catch (error) {
        console.error('SEO settings migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateSEOSettings()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateSEOSettings };