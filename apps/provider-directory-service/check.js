const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();
prisma.bookedSlot.findMany().then((slots) => {
  console.log(slots);
  process.exit(0);
});
