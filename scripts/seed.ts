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
const NEW_DATA_DIR = path.join(__dirname, '../data');

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
  const dataPath = path.join(NEW_DATA_DIR, 'specialties_cleaned.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('[WARN] Specialties data not found, skipping.');
    return;
  }

  const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const data = fileData.specialties || fileData;

  console.log('[SEED] Cleaning up old specialties...');
  await providerPrisma.doctorSpecialty.deleteMany({}); // Delete relations first to avoid foreign key issues
  await providerPrisma.specialtyInfoSection.deleteMany({});
  await providerPrisma.specialty.deleteMany({});

  for (const item of data as any[]) {
    const slug = item.slug || slugify(item.name as string);
    await providerPrisma.specialty.upsert({
      where: { slug },
      update: {
        description: item.description as string,
        iconUrl: item.icon_url as string,
        aliases: item.aliases || [],
        commonSymptoms: item.common_symptoms || [],
        commonConditions: item.common_conditions || [],
        keywords: item.keywords || [],
        expertise: item.expertise || [],
      },
      create: {
        id: item.id, // preserve ID for doctor linking
        name: item.name as string,
        slug,
        description: item.description as string,
        iconUrl: item.icon_url as string,
        aliases: item.aliases || [],
        commonSymptoms: item.common_symptoms || [],
        commonConditions: item.common_conditions || [],
        keywords: item.keywords || [],
        expertise: item.expertise || [],
      },
    });
  }
  console.log(`[SUCCESS] Seeded ${data.length} specialties.`);
}

async function seedDoctors() {
  console.log('[SEED] Seeding Doctors and Accounts...');
  const dataPath = path.join(NEW_DATA_DIR, 'doctors_cleaned.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('[WARN] Doctors data not found, skipping.');
    return;
  }

  const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const data = fileData.doctors || fileData;
  const passwordHash = await bcrypt.hash('Doctor123!', 10);

  // Cleanup old doctor accounts
  console.log('[SEED] Cleaning up old doctor accounts...');
  await providerPrisma.officeHours.deleteMany({});
  await providerPrisma.doctorWorkLocation.deleteMany({});
  await providerPrisma.doctor.deleteMany({});
  await accountsPrisma.staffAccount.deleteMany({
    where: { role: 'DOCTOR' },
  });

  // 0. Fetch the existing WorkLocation
  const workLocation = await providerPrisma.workLocation.findFirst();
  if (!workLocation) {
    console.warn(
      '[WARN] No WorkLocation found in db. Skipping WorkLocation and OfficeHours seeding.',
    );
  }

  for (const item of data as any[]) {
    const cleanName = cleanNameForEmail(
      item.full_name || (item.name as string),
    );
    const email = `${slugify(cleanName)}@gmail.com`;
    const phone = generateFakePhone();
    const dob = generateFakeDOB();

    // 1. Create Staff Account
    const account = await accountsPrisma.staffAccount.upsert({
      where: { email },
      update: {
        fullName: item.full_name || item.name,
        phone,
        dateOfBirth: dob,
        isMale: item.is_male !== undefined ? item.is_male : Math.random() > 0.3,
      },
      create: {
        id: item.staff_account_id, // reuse id from file if available
        fullName: item.full_name || item.name,
        email,
        passwordHash,
        role: 'DOCTOR',
        phone,
        dateOfBirth: dob,
        isMale: item.is_male !== undefined ? item.is_male : Math.random() > 0.3,
      },
    });

    // 2. Create Doctor Profile
    const doctor = await providerPrisma.doctor.upsert({
      where: { staffAccountId: account.id },
      update: {
        fullName: item.full_name || item.name,
        degree: item.degree || item.title,
        position: item.position ? [item.position] : [],
        introduction: item.introduction || item.biography || item.description,
        experience: item.experience || item.workExperience || [],
        avatarUrl: item.avatar_url || item.imageUrl,
        education: item.education || [],
        ratings: item.ratings || null,
        serviceCost: item.service_cost || null,
        experienceYears: item.experience_years || null,
        conditions: item.conditions || [],
        symptoms: item.symptoms || [],
        expertise: item.expertise || [],
        procedures: item.procedures || [],
        patientGroups: item.patient_groups || [],
        specialtyIds: item.specialty_ids || [],
      },
      create: {
        id: item.id, // reuse id from file
        staffAccountId: account.id,
        fullName: item.full_name || item.name,
        degree: item.degree || item.title,
        position: item.position ? [item.position] : [],
        introduction: item.introduction || item.biography || item.description,
        experience: item.experience || item.workExperience || [],
        avatarUrl: item.avatar_url || item.imageUrl,
        education: item.education || [],
        ratings: item.ratings || null,
        serviceCost: item.service_cost || null,
        experienceYears: item.experience_years || null,
        conditions: item.conditions || [],
        symptoms: item.symptoms || [],
        expertise: item.expertise || [],
        procedures: item.procedures || [],
        patientGroups: item.patient_groups || [],
        specialtyIds: item.specialty_ids || [],
      },
    });

    // 3. Link Specialties
    if (item.specialty_ids && (item.specialty_ids as string[]).length > 0) {
      for (const specId of item.specialty_ids as string[]) {
        const spec = await providerPrisma.specialty.findUnique({
          where: { id: specId },
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

async function seedFaqs() {
  console.log('[SEED] Seeding FAQs...');
  await contentPrisma.faq.deleteMany({});
  await contentPrisma.faq.createMany({
    data: [
      {
        question: 'How do I book an appointment?',
        answer:
          'You can book an appointment via our website by navigating to the "Book Appointment" page. Select your preferred doctor and available time slot, fill in your details, and confirm the booking instantly.',
        order: 1,
      },
      {
        question: 'Do you offer telemedicine services?',
        answer:
          'Yes! We offer virtual consultations for selective specialties. You will get a Zoom link upon booking confirmation.',
        order: 2,
      },
      {
        question: 'How to retrieve my patient records?',
        answer:
          'You can use the Patient Lookup function in our navigation bar. Just enter your registered phone number to view your history.',
        order: 3,
      },
      {
        question: 'Can I cancel or reschedule my appointment?',
        answer:
          'Absolutely. Please refer to your booking confirmation email for a direct link to reschedule or call our support line at least 24 hours in advance.',
        order: 4,
      },
    ],
  });
  console.log('[SUCCESS] Seeded FAQs.');
}

async function seedTestimonials() {
  console.log('[SEED] Seeding Testimonials...');
  await contentPrisma.testimonial.deleteMany({});
  await contentPrisma.testimonial.createMany({
    data: [
      {
        authorName: 'Sarah Jenkins',
        authorTitle: 'Patient',
        content:
          'The doctors at Medicalink were incredibly professional and empathetic. Using this platform to book was completely frictionless!',
        rating: 5,
        isFeatured: true,
      },
      {
        authorName: 'David Lee',
        authorTitle: 'Patient',
        content:
          'AI Doctor Finder really helped me figure out which specialist I needed. Outstanding technical capabilities mixed with excellent healthcare.',
        rating: 5,
        isFeatured: true,
      },
      {
        authorName: 'Emily Clark',
        authorTitle: 'Parent',
        content:
          'I booked an appointment for my son in under 2 minutes. The clinic wait time was almost zero because everything was perfectly scheduled.',
        rating: 5,
        isFeatured: false,
      },
    ],
  });
  console.log('[SUCCESS] Seeded Testimonials.');
}

async function main() {
  try {
    await seedSpecialties();
    await seedDoctors();
    await seedBlogs();
    await seedFaqs();
    await seedTestimonials();
  } catch (error) {
    console.error('[ERROR] Seeding failed:', error);
  } finally {
    await accountsPrisma.$disconnect();
    await providerPrisma.$disconnect();
    await contentPrisma.$disconnect();
  }
}

void main();
