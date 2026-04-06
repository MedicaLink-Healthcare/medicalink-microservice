import { PrismaClient as AccountsClient } from '../apps/accounts-service/prisma/generated/client';
import { PrismaClient as ProviderClient } from '../apps/provider-directory-service/prisma/generated/client';
import { PrismaClient as ContentClient } from '../apps/content-service/prisma/generated/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { PostStatus } from '../apps/content-service/prisma/generated/client';

const ACCOUNTS_DB_URL =
  'postgresql://postgres:postgres@localhost:5432/medicalink_accounts?connection_limit=5&pool_timeout=20';
const PROVIDER_DB_URL =
  'postgresql://postgres:postgres@localhost:5432/medicalink_provider?connection_limit=5&pool_timeout=20';
const CONTENT_DB_URL =
  'postgresql://postgres:postgres@localhost:5432/medicalink_content?connection_limit=5&pool_timeout=20';

const accountsPrisma = new AccountsClient({
  datasources: { db: { url: ACCOUNTS_DB_URL } },
});
const providerPrisma = new ProviderClient({
  datasources: { db: { url: PROVIDER_DB_URL } },
});
const contentPrisma = new ContentClient({
  datasources: { db: { url: CONTENT_DB_URL } },
});

const CRAWL_DATA_DIR = path.join(__dirname, '../../crawl-data/data');

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

function generateFakePhone() {
  const prefixes = ['090', '091', '092', '093', '094', '096', '097', '098'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const body = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0');
  return `${prefix}${body}`;
}

function generateFakeDOB() {
  const year = Math.floor(Math.random() * (1995 - 1960 + 1)) + 1960;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}

function cleanNameForEmail(name: string) {
  const titles = [
    'TTƯT',
    'PGS',
    'TS',
    'BS',
    'CKII',
    'CKI',
    'NGND',
    'GS',
    'ThS',
    'GĐ',
    'PGĐ',
  ];
  let clean = name;
  titles.forEach((t) => {
    const reg = new RegExp(`\\b${t}\\.?\\s*`, 'gi');
    clean = clean.replace(reg, '');
  });
  return clean.trim();
}

function normalizeSpecialtyName(name: string) {
  if (!name) return '';
  let normalized = name.replace(/&amp;/g, '&');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

const SPECIALTY_MAPPING: Record<string, string> = {
  'khoa-ung-buou': 'ung-buou',
  'khoa-than-kinh': 'khoa-hoc-than-kinh',
  'phong-kham-kiem-soat-can-nang-va-dieu-tri-beo-phi':
    'kiem-soat-can-nang-va-dieu-tri-beo-phi',
  'trung-tam-viem-gan-va-gan-nhiem-mo': 'viem-gan-va-gan-nhiem-mo',
};

async function seedSpecialties() {
  console.log('[SEED] Seeding Specialties...');
  const dataPath = path.join(CRAWL_DATA_DIR, 'specialties-data.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('[WARN] Specialties data not found, skipping.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  for (const item of data as any[]) {
    const slug = slugify(item.name as string);
    await providerPrisma.specialty.upsert({
      where: { slug },
      update: {
        description: item.introduction as string,
        iconUrl: item.imageUrl as string,
      },
      create: {
        name: item.name as string,
        slug,
        description: item.introduction as string,
        iconUrl: item.imageUrl as string,
      },
    });
  }
  console.log(`[SUCCESS] Seeded ${data.length} specialties.`);
}

async function seedDoctors() {
  console.log('[SEED] Seeding Doctors and Accounts...');
  const dataPath = path.join(CRAWL_DATA_DIR, 'doctors-data.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('[WARN] Doctors data not found, skipping.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const passwordHash = await bcrypt.hash('Doctor123!', 10);

  // Cleanup old doctor accounts
  console.log('[SEED] Cleaning up old doctor accounts...');
  await providerPrisma.officeHours.deleteMany({});
  await accountsPrisma.staffAccount.deleteMany({
    where: { role: 'DOCTOR' },
  });
  await providerPrisma.doctor.deleteMany({});

  // 0. Fetch the existing WorkLocation
  const workLocation = await providerPrisma.workLocation.findFirst();
  if (!workLocation) {
    console.warn(
      '[WARN] No WorkLocation found in db. Skipping WorkLocation and OfficeHours seeding.',
    );
  }

  for (const item of data as any[]) {
    const cleanName = cleanNameForEmail(item.name as string);
    const email = `${slugify(cleanName)}@gmail.com`;
    const phone = generateFakePhone();
    const dob = generateFakeDOB();

    // 1. Create Staff Account
    const account = await accountsPrisma.staffAccount.upsert({
      where: { email },
      update: {
        fullName: item.name,
        phone,
        dateOfBirth: dob,
        isMale: Math.random() > 0.3,
      },
      create: {
        fullName: item.name,
        email,
        passwordHash,
        role: 'DOCTOR',
        phone,
        dateOfBirth: dob,
        isMale: Math.random() > 0.3,
      },
    });

    // 2. Create Doctor Profile
    const doctor = await providerPrisma.doctor.upsert({
      where: { staffAccountId: account.id },
      update: {
        fullName: item.name,
        degree: item.title,
        position: [item.position].filter(Boolean),
        introduction: item.biography || item.description,
        memberships: item.memberships || [],
        awards: item.awards || [],
        experience: item.workExperience || [],
        avatarUrl: item.imageUrl,
        research: JSON.stringify(item.research),
      },
      create: {
        staffAccountId: account.id,
        fullName: item.name,
        degree: item.title,
        position: [item.position].filter(Boolean),
        introduction: item.biography || item.description,
        memberships: item.memberships || [],
        awards: item.awards || [],
        experience: item.workExperience || [],
        avatarUrl: item.imageUrl,
        research: JSON.stringify(item.research),
      },
    });

    // 3. Link Specialties
    if (item.specialties && (item.specialties as any[]).length > 0) {
      for (const specName of item.specialties as string[]) {
        const normalizedName = normalizeSpecialtyName(specName);
        let slug = slugify(normalizedName);

        // Apply manual mapping if exists
        if (SPECIALTY_MAPPING[slug]) {
          slug = SPECIALTY_MAPPING[slug];
        }

        const spec = await providerPrisma.specialty.findUnique({
          where: { slug },
        });
        if (spec) {
          await providerPrisma.doctorSpecialty.upsert({
            where: {
              doctorId_specialtyId: {
                doctorId: doctor.id,
                specialtyId: spec.id,
              },
            },
            update: {},
            create: {
              doctorId: doctor.id,
              specialtyId: spec.id,
            },
          });
        }
      }
    }

    // 4. Update Staff Account with doctorId link
    await accountsPrisma.staffAccount.update({
      where: { id: account.id },
      data: { doctorId: doctor.id },
    });

    // 5. Link Doctor to WorkLocation and create OfficeHours
    if (workLocation) {
      await providerPrisma.doctorWorkLocation.upsert({
        where: {
          doctorId_locationId: {
            doctorId: doctor.id,
            locationId: workLocation.id,
          },
        },
        update: {},
        create: {
          doctorId: doctor.id,
          locationId: workLocation.id,
        },
      });

      // Clear any existing office hours for this doctor to avoid duplicates if JSON has duplicate doctors
      await providerPrisma.officeHours.deleteMany({
        where: { doctorId: doctor.id },
      });

      // Mon-Fri (1-5), 08:00 to 17:00
      for (let day = 1; day <= 5; day++) {
        const startTime = new Date('1970-01-01T08:00:00.000Z');
        const endTime = new Date('1970-01-01T17:00:00.000Z');

        await providerPrisma.officeHours.create({
          data: {
            doctorId: doctor.id,
            workLocationId: workLocation.id,
            dayOfWeek: day,
            startTime,
            endTime,
            isGlobal: false,
          },
        });
      }
    }
  }
  console.log(`[SUCCESS] Seeded ${data.length} doctors and accounts.`);
}

async function seedBlogs() {
  console.log('[SEED] Seeding Blogs...');
  const dataPath = path.join(CRAWL_DATA_DIR, 'blogs-data.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('[WARN] Blogs data not found, skipping.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const adminAccount = await accountsPrisma.staffAccount.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });
  const authorId = adminAccount?.id || 'default-author';

  for (const item of data as any[]) {
    const slug = slugify(item.title as string);

    // Dynamic category assignment
    let categorySlug = 'y-khoa';
    let categoryName: string = 'Kiến thức y khoa';

    if (item.tags && (item.tags as any[]).length > 0) {
      categoryName = (item.tags as string[])[0];
      categorySlug = slugify(categoryName);
    }

    const category = await contentPrisma.blogCategory.upsert({
      where: { slug: categorySlug },
      update: {},
      create: {
        name: categoryName,
        slug: categorySlug,
      },
    });

    await contentPrisma.blog.upsert({
      where: { slug },
      update: {
        content: item.content,
        thumbnailUrl: item.imageUrl,
        categoryId: category.id,
        authorId,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      create: {
        title: item.title,
        slug,
        content: item.content,
        thumbnailUrl: item.imageUrl,
        categoryId: category.id,
        authorId,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }
  console.log(`[SUCCESS] Seeded ${data.length} blogs.`);
}

async function main() {
  try {
    await seedSpecialties();
    await seedDoctors();
    await seedBlogs();
  } catch (error) {
    console.error('[ERROR] Seeding failed:', error);
  } finally {
    await accountsPrisma.$disconnect();
    await providerPrisma.$disconnect();
    await contentPrisma.$disconnect();
  }
}

void main();
