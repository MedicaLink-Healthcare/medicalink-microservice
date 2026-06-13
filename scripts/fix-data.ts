import { PrismaClient as ProviderClient } from '../libs/prisma-clients/provider';
import { PrismaClient as ContentClient } from '../libs/prisma-clients/content';

async function main() {
  console.log('Starting data fix...');

  const providerPrisma = new ProviderClient();
  const contentPrisma = new ContentClient();

  try {
    // 1. Clear old reviews that cause 404
    console.log('Clearing old reviews and analyses...');
    await contentPrisma.reviewAnalysis.deleteMany({});
    await contentPrisma.review.deleteMany({});
    console.log('Cleared content DB.');

    // 2. Create Global Office Hours if missing
    const workLocation = await providerPrisma.workLocation.findFirst();
    if (workLocation) {
      const existingGlobal = await providerPrisma.officeHours.findFirst({
        where: { isGlobal: true, workLocationId: workLocation.id },
      });

      if (!existingGlobal) {
        console.log(
          'Creating global office hours for location:',
          workLocation.id,
        );
        for (let day = 1; day <= 7; day++) {
          const morningStart = new Date('1970-01-01T08:00:00.000Z');
          const morningEnd = new Date('1970-01-01T12:00:00.000Z');
          const afternoonStart = new Date('1970-01-01T13:00:00.000Z');
          const afternoonEnd = new Date('1970-01-01T17:00:00.000Z');

          await providerPrisma.officeHours.createMany({
            data: [
              {
                isGlobal: true,
                workLocationId: workLocation.id,
                dayOfWeek: day,
                startTime: morningStart,
                endTime: morningEnd,
              },
              {
                isGlobal: true,
                workLocationId: workLocation.id,
                dayOfWeek: day,
                startTime: afternoonStart,
                endTime: afternoonEnd,
              },
            ],
          });
        }
        console.log(
          'Global office hours created for all 7 days (morning & afternoon).',
        );
      } else {
        console.log('Global office hours already exist.');
      }
    } else {
      console.log('No work location found to create global office hours.');
    }

    console.log('Data fix completed successfully.');
  } catch (error) {
    console.error('Error during data fix:', error);
  } finally {
    await providerPrisma.$disconnect();
    await contentPrisma.$disconnect();
  }
}

main();
