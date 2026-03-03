const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearSettlements() {
    try {
        const deleted = await prisma.settlement.deleteMany({});
        console.log(`Cleared ${deleted.count} settlements.`);
    } catch (error) {
        console.error('Error clearing settlements:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearSettlements();
