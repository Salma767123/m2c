const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.product.findMany({});
    fs.writeFileSync('output.json', JSON.stringify(p.map(x => ({ id: x.id, c: x.category, sc: x.subCategory })), null, 2));
    await prisma.$disconnect();
}

main();
