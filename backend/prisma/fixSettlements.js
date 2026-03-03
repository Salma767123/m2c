const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function fixSettlements() {
    console.log('Fetching all settlements...');
    // We bypass Prisma strict schema by using raw mongo query or just taking them and updating
    // Actually, since Prisma client is already generated for the old schema, we can just use it.
    const settlements = await prisma.settlement.findMany();
    console.log(`Found ${settlements.length} settlements.`);

    for (let i = 0; i < settlements.length; i++) {
        const s = settlements[i];
        await prisma.settlement.update({
            where: { id: s.id },
            data: { settlementNumber: `SET-${Date.now()}-${uuidv4().substring(0, 4)}` }
        });
    }

    console.log('Fixed settlements.');
}

fixSettlements()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
