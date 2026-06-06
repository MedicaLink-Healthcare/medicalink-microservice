import { PrismaClient } from './prisma/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Office Hours demo data...');

  // 1. Get location
  const locationId = 'cm0hq6rxg000008mf3x0c6w4b';
  const location = await prisma.workLocation.findUnique({
    where: { id: locationId },
  });
  if (!location) {
    console.error('Work location not found!');
    return;
  }

  // 2. Get doctors
  const doctors = await prisma.doctor.findMany({
    take: 5,
    orderBy: { createdAt: 'asc' },
  });
  if (doctors.length < 2) {
    console.error('Not enough doctors found!');
    return;
  }

  console.log(`Found ${doctors.length} doctors. Using them for seeding.`);

  // 3. Clear existing scheduling data
  await prisma.officeHours.deleteMany({});
  await prisma.specialShift.deleteMany({});
  await prisma.clinicException.deleteMany({});
  await prisma.doctorException.deleteMany({});

  console.log('Cleared old scheduling data.');

  // Helper to create time
  const createTime = (hour: number, minute: number) => {
    const d = new Date();
    d.setUTCHours(hour, minute, 0, 0);
    return d;
  };

  // 4. Create Clinic Hours (Global) - Mon to Fri (1-5), 08:00-12:00 and 13:00-17:00
  const clinicHours: any[] = [];
  for (let day = 1; day <= 5; day++) {
    clinicHours.push({
      workLocationId: locationId,
      dayOfWeek: day,
      startTime: createTime(8, 0),
      endTime: createTime(12, 0),
      isGlobal: true,
    });
    clinicHours.push({
      workLocationId: locationId,
      dayOfWeek: day,
      startTime: createTime(13, 0),
      endTime: createTime(17, 0),
      isGlobal: true,
    });
  }
  // Saturday morning
  clinicHours.push({
    workLocationId: locationId,
    dayOfWeek: 6,
    startTime: createTime(8, 0),
    endTime: createTime(12, 0),
    isGlobal: true,
  });

  await prisma.officeHours.createMany({ data: clinicHours });
  console.log('Created Clinic Hours (Global).');

  // 5. Create Doctor Hours (Specific shifts)
  const drA = doctors[0];
  const drB = doctors[1];

  // Dr A only works Mon, Wed, Fri afternoons
  const drAHours = [1, 3, 5].map((day) => ({
    doctorId: drA.id,
    workLocationId: locationId,
    dayOfWeek: day,
    startTime: createTime(13, 0),
    endTime: createTime(17, 0),
    isGlobal: false,
  }));
  await prisma.officeHours.createMany({ data: drAHours });

  // Dr B works Tue, Thu mornings
  const drBHours = [2, 4].map((day) => ({
    doctorId: drB.id,
    workLocationId: locationId,
    dayOfWeek: day,
    startTime: createTime(8, 0),
    endTime: createTime(12, 0),
    isGlobal: false,
  }));
  await prisma.officeHours.createMany({ data: drBHours });

  console.log(`Created Doctor Hours for ${drA.fullName} and ${drB.fullName}.`);

  // 6. Create Clinic Exception (Holiday)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  await prisma.clinicException.create({
    data: {
      workLocationId: null, // Global holiday
      date: nextWeek,
      isFullDay: true,
      reason: 'National Holiday (Company Anniversary)',
    },
  });
  console.log('Created Clinic Exception (Holiday).');

  // 7. Create Doctor Exception (Sick Leave)
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  await prisma.doctorException.create({
    data: {
      doctorId: drA.id,
      date: tomorrow,
      isFullDay: true,
      reason: 'Personal Leave',
    },
  });
  console.log(`Created Doctor Exception for ${drA.fullName}.`);

  // 8. Create Special Shift (On-call during holiday)
  await prisma.specialShift.create({
    data: {
      doctorId: drB.id,
      workLocationId: locationId,
      date: nextWeek,
      startTime: createTime(8, 0),
      endTime: createTime(17, 0),
      reason: 'Holiday On-call Duty',
    },
  });
  console.log(`Created Special Shift for ${drB.fullName}.`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
