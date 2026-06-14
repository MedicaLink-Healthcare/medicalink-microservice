import { PrismaClient } from './prisma/generated/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRaw`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS uq_appointments_doctor_slot;`;
    console.log('Dropped unique constraint successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
