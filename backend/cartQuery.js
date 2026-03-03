const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const carts = await prisma.cartItem.findMany({});
    console.log(carts);
    prisma.$disconnect();
}
main();
