const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.officeHours.deleteMany();
  await prisma.clinicException.deleteMany();
  await prisma.specialShift.deleteMany();
  console.log('Data cleared');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
