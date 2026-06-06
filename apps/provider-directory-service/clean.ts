import { PrismaClient } from './prisma/generated/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.officeHours.deleteMany({});
  console.log(`Deleted ${result.count} old records from OfficeHours.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
