import { PrismaClient as AccountsClient } from '../apps/accounts-service/prisma/generated/client';
import { PrismaClient as ProviderClient } from '../apps/provider-directory-service/prisma/generated/client';
import { PrismaClient as ContentClient } from '../apps/content-service/prisma/generated/client';
import { PrismaClient as BookingClient } from '../apps/booking-service/prisma/generated/client';

const ACCOUNTS_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_accounts';
const PROVIDER_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_provider';
const CONTENT_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_content';
const BOOKING_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_booking';

const accountsPrisma = new AccountsClient({
  datasources: { db: { url: ACCOUNTS_DB_URL } },
});
const providerPrisma = new ProviderClient({
  datasources: { db: { url: PROVIDER_DB_URL } },
});
const contentPrisma = new ContentClient({
  datasources: { db: { url: CONTENT_DB_URL } },
});
const bookingPrisma = new BookingClient({
  datasources: { db: { url: BOOKING_DB_URL } },
});

async function checkMissingDoctors() {
  const idsToCheck = [
    'cmnb8qucc003avky0zug37yku',
    'cmnb8quga003gvky0va299zqa',
    'cmnb8qugy003hvky0mhdtad4i',
  ];

  for (const id of idsToCheck) {
    console.log(`\n--- Checking ID: ${id} ---`);

    // Check accounts
    const account = await accountsPrisma.staffAccount.findUnique({
      where: { id },
      select: { id: true, role: true, deletedAt: true },
    });
    console.log(
      `Accounts DB: ${account ? (account.deletedAt ? 'DELETED' : 'EXISTS') : 'NOT FOUND'}`,
    );

    // Check provider
    const profile = await providerPrisma.doctor.findUnique({
      where: { staffAccountId: id },
      select: { staffAccountId: true, isActive: true },
    });
    console.log(
      `Provider DB: ${profile ? (profile.isActive ? 'EXISTS & ACTIVE' : 'EXISTS & INACTIVE') : 'NOT FOUND'}`,
    );

    // Check content (reviews)
    const reviews = await contentPrisma.review.count({
      where: { doctorId: id },
    });
    const reviewAnalyses = await contentPrisma.reviewAnalysis.count({
      where: { doctorId: id },
    });
    console.log(
      `Content DB: ${reviews} reviews, ${reviewAnalyses} review analyses`,
    );

    // Check booking (appointments)
    const appointments = await bookingPrisma.appointment.count({
      where: { doctorId: id },
    });
    console.log(`Booking DB: ${appointments} appointments`);
  }
}

async function main() {
  try {
    await checkMissingDoctors();
  } catch (error) {
    console.error(error);
  } finally {
    await accountsPrisma.$disconnect();
    await providerPrisma.$disconnect();
    await contentPrisma.$disconnect();
    await bookingPrisma.$disconnect();
  }
}

main();
