import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const slots = await prisma.bookedSlot.findMany();
  console.log(slots);
}
main();
