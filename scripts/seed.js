'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === 'function' ? Iterator : Object).prototype,
      );
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
var client_1 = require('../apps/accounts-service/prisma/generated/client');
var client_2 = require('../apps/provider-directory-service/prisma/generated/client');
var client_3 = require('../apps/content-service/prisma/generated/client');
var fs = __importStar(require('fs'));
var path = __importStar(require('path'));
var bcrypt = __importStar(require('bcrypt'));
var client_4 = require('../apps/content-service/prisma/generated/client');
var ACCOUNTS_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_accounts?connection_limit=5&pool_timeout=20';
var PROVIDER_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_provider?connection_limit=5&pool_timeout=20';
var CONTENT_DB_URL =
  'postgresql://postgres:postgres@127.0.0.1:5432/medicalink_content?connection_limit=5&pool_timeout=20';
var accountsPrisma = new client_1.PrismaClient({
  datasources: { db: { url: ACCOUNTS_DB_URL } },
});
var providerPrisma = new client_2.PrismaClient({
  datasources: { db: { url: PROVIDER_DB_URL } },
});
var contentPrisma = new client_3.PrismaClient({
  datasources: { db: { url: CONTENT_DB_URL } },
});
var CRAWL_DATA_DIR = path.join(__dirname, '../../crawl-data/data');
var NEW_DATA_DIR = path.join(__dirname, '../data');
function slugify(text) {
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
  var prefixes = ['090', '091', '092', '093', '094', '096', '097', '098'];
  var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  var body = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0');
  return ''.concat(prefix).concat(body);
}
function generateFakeDOB() {
  var year = Math.floor(Math.random() * (1995 - 1960 + 1)) + 1960;
  var month = Math.floor(Math.random() * 12);
  var day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}
function cleanNameForEmail(name) {
  var titles = [
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
  var clean = name;
  titles.forEach(function (t) {
    var reg = new RegExp('\\b'.concat(t, '\\.?\\s*'), 'gi');
    clean = clean.replace(reg, '');
  });
  return clean.trim();
}
function normalizeSpecialtyName(name) {
  if (!name) return '';
  var normalized = name.replace(/&amp;/g, '&');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}
var SPECIALTY_MAPPING = {
  'khoa-ung-buou': 'ung-buou',
  'khoa-than-kinh': 'khoa-hoc-than-kinh',
  'phong-kham-kiem-soat-can-nang-va-dieu-tri-beo-phi':
    'kiem-soat-can-nang-va-dieu-tri-beo-phi',
  'trung-tam-viem-gan-va-gan-nhiem-mo': 'viem-gan-va-gan-nhiem-mo',
};
function seedSpecialties() {
  return __awaiter(this, void 0, void 0, function () {
    var dataPath, fileData, data, _i, _a, item, slug;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          console.log('[SEED] Seeding Specialties...');
          dataPath = path.join(NEW_DATA_DIR, 'specialties_cleaned.json');
          if (!fs.existsSync(dataPath)) {
            console.warn('[WARN] Specialties data not found, skipping.');
            return [2 /*return*/];
          }
          fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          data = fileData.specialties || fileData;
          console.log('[SEED] Cleaning up old specialties...');
          return [4 /*yield*/, providerPrisma.doctorSpecialty.deleteMany({})];
        case 1:
          _b.sent(); // Delete relations first to avoid foreign key issues
          return [
            4 /*yield*/,
            providerPrisma.specialtyInfoSection.deleteMany({}),
          ];
        case 2:
          _b.sent();
          return [4 /*yield*/, providerPrisma.specialty.deleteMany({})];
        case 3:
          _b.sent();
          ((_i = 0), (_a = data));
          _b.label = 4;
        case 4:
          if (!(_i < _a.length)) return [3 /*break*/, 7];
          item = _a[_i];
          slug = item.slug || slugify(item.name);
          return [
            4 /*yield*/,
            providerPrisma.specialty.upsert({
              where: { slug: slug },
              update: {
                description: item.description,
                iconUrl: item.icon_url,
                aliases: item.aliases || [],
                commonSymptoms: item.common_symptoms || [],
                commonConditions: item.common_conditions || [],
                keywords: item.keywords || [],
                expertise: item.expertise || [],
              },
              create: {
                id: item.id, // preserve ID for doctor linking
                name: item.name,
                slug: slug,
                description: item.description,
                iconUrl: item.icon_url,
                aliases: item.aliases || [],
                commonSymptoms: item.common_symptoms || [],
                commonConditions: item.common_conditions || [],
                keywords: item.keywords || [],
                expertise: item.expertise || [],
              },
            }),
          ];
        case 5:
          _b.sent();
          _b.label = 6;
        case 6:
          _i++;
          return [3 /*break*/, 4];
        case 7:
          console.log('[SUCCESS] Seeded '.concat(data.length, ' specialties.'));
          return [2 /*return*/];
      }
    });
  });
}
function seedDoctors() {
  return __awaiter(this, void 0, void 0, function () {
    var dataPath,
      fileData,
      data,
      passwordHash,
      workLocation,
      day,
      startTime,
      endTime,
      _i,
      _a,
      item,
      cleanName,
      email,
      phone,
      dob,
      account,
      doctor,
      _b,
      _c,
      specId,
      spec,
      day,
      startTime,
      endTime;
    return __generator(this, function (_d) {
      switch (_d.label) {
        case 0:
          console.log('[SEED] Seeding Doctors and Accounts...');
          dataPath = path.join(NEW_DATA_DIR, 'doctors_cleaned.json');
          if (!fs.existsSync(dataPath)) {
            console.warn('[WARN] Doctors data not found, skipping.');
            return [2 /*return*/];
          }
          fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          data = fileData.doctors || fileData;
          return [4 /*yield*/, bcrypt.hash('Doctor123!', 10)];
        case 1:
          passwordHash = _d.sent();
          // Cleanup old doctor accounts
          console.log('[SEED] Cleaning up old doctor accounts...');
          // Clear old reviews and analyses to avoid 404s on UI
          return [4 /*yield*/, contentPrisma.reviewAnalysis.deleteMany({})];
        case 2:
          // Clear old reviews and analyses to avoid 404s on UI
          _d.sent();
          return [4 /*yield*/, contentPrisma.review.deleteMany({})];
        case 3:
          _d.sent();
          return [4 /*yield*/, providerPrisma.officeHours.deleteMany({})];
        case 4:
          _d.sent();
          return [
            4 /*yield*/,
            providerPrisma.doctorWorkLocation.deleteMany({}),
          ];
        case 5:
          _d.sent();
          return [4 /*yield*/, providerPrisma.doctor.deleteMany({})];
        case 6:
          _d.sent();
          return [
            4 /*yield*/,
            accountsPrisma.staffAccount.deleteMany({
              where: { role: 'DOCTOR' },
            }),
          ];
        case 7:
          _d.sent();
          return [4 /*yield*/, providerPrisma.workLocation.findFirst()];
        case 8:
          workLocation = _d.sent();
          if (!!workLocation) return [3 /*break*/, 9];
          console.warn(
            '[WARN] No WorkLocation found in db. Skipping WorkLocation and OfficeHours seeding.',
          );
          return [3 /*break*/, 13];
        case 9:
          // Seed Global Office Hours for this location (08:00 - 17:00, Mon-Fri)
          console.log('[SEED] Seeding Global Office Hours...');
          day = 1;
          _d.label = 10;
        case 10:
          if (!(day <= 5)) return [3 /*break*/, 13];
          startTime = new Date('1970-01-01T08:00:00.000Z');
          endTime = new Date('1970-01-01T17:00:00.000Z');
          return [
            4 /*yield*/,
            providerPrisma.officeHours.create({
              data: {
                isGlobal: true,
                workLocationId: workLocation.id,
                dayOfWeek: day,
                startTime: startTime,
                endTime: endTime,
              },
            }),
          ];
        case 11:
          _d.sent();
          _d.label = 12;
        case 12:
          day++;
          return [3 /*break*/, 10];
        case 13:
          ((_i = 0), (_a = data));
          _d.label = 14;
        case 14:
          if (!(_i < _a.length)) return [3 /*break*/, 29];
          item = _a[_i];
          cleanName = cleanNameForEmail(item.full_name || item.name);
          email = ''.concat(slugify(cleanName), '@gmail.com');
          phone = generateFakePhone();
          dob = generateFakeDOB();
          return [
            4 /*yield*/,
            accountsPrisma.staffAccount.upsert({
              where: { email: email },
              update: {
                fullName: item.full_name || item.name,
                phone: phone,
                dateOfBirth: dob,
                isMale:
                  item.is_male !== undefined
                    ? item.is_male
                    : Math.random() > 0.3,
              },
              create: {
                id: item.staff_account_id, // reuse id from file if available
                fullName: item.full_name || item.name,
                email: email,
                passwordHash: passwordHash,
                role: 'DOCTOR',
                phone: phone,
                dateOfBirth: dob,
                isMale:
                  item.is_male !== undefined
                    ? item.is_male
                    : Math.random() > 0.3,
              },
            }),
          ];
        case 15:
          account = _d.sent();
          return [
            4 /*yield*/,
            providerPrisma.doctor.upsert({
              where: { staffAccountId: account.id },
              update: {
                fullName: item.full_name || item.name,
                position: item.position ? [item.position] : [],
                introduction:
                  item.introduction || item.biography || item.description,
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
                position: item.position ? [item.position] : [],
                introduction:
                  item.introduction || item.biography || item.description,
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
            }),
          ];
        case 16:
          doctor = _d.sent();
          if (!(item.specialty_ids && item.specialty_ids.length > 0))
            return [3 /*break*/, 21];
          ((_b = 0), (_c = item.specialty_ids));
          _d.label = 17;
        case 17:
          if (!(_b < _c.length)) return [3 /*break*/, 21];
          specId = _c[_b];
          return [
            4 /*yield*/,
            providerPrisma.specialty.findUnique({
              where: { id: specId },
            }),
          ];
        case 18:
          spec = _d.sent();
          if (!spec) return [3 /*break*/, 20];
          return [
            4 /*yield*/,
            providerPrisma.doctorSpecialty.upsert({
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
            }),
          ];
        case 19:
          _d.sent();
          _d.label = 20;
        case 20:
          _b++;
          return [3 /*break*/, 17];
        case 21:
          // 4. Update Staff Account with doctorId link
          return [
            4 /*yield*/,
            accountsPrisma.staffAccount.update({
              where: { id: account.id },
              data: { doctorId: doctor.id },
            }),
          ];
        case 22:
          // 4. Update Staff Account with doctorId link
          _d.sent();
          if (!workLocation) return [3 /*break*/, 28];
          return [
            4 /*yield*/,
            providerPrisma.doctorWorkLocation.upsert({
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
            }),
          ];
        case 23:
          _d.sent();
          // Clear any existing office hours for this doctor to avoid duplicates if JSON has duplicate doctors
          return [
            4 /*yield*/,
            providerPrisma.officeHours.deleteMany({
              where: { doctorId: doctor.id },
            }),
          ];
        case 24:
          // Clear any existing office hours for this doctor to avoid duplicates if JSON has duplicate doctors
          _d.sent();
          day = 1;
          _d.label = 25;
        case 25:
          if (!(day <= 5)) return [3 /*break*/, 28];
          startTime = new Date('1970-01-01T08:00:00.000Z');
          endTime = new Date('1970-01-01T17:00:00.000Z');
          return [
            4 /*yield*/,
            providerPrisma.officeHours.create({
              data: {
                doctorId: doctor.id,
                workLocationId: workLocation.id,
                dayOfWeek: day,
                startTime: startTime,
                endTime: endTime,
                isGlobal: false,
              },
            }),
          ];
        case 26:
          _d.sent();
          _d.label = 27;
        case 27:
          day++;
          return [3 /*break*/, 25];
        case 28:
          _i++;
          return [3 /*break*/, 14];
        case 29:
          console.log(
            '[SUCCESS] Seeded '.concat(data.length, ' doctors and accounts.'),
          );
          return [2 /*return*/];
      }
    });
  });
}
function seedBlogs() {
  return __awaiter(this, void 0, void 0, function () {
    var dataPath,
      data,
      adminAccount,
      authorId,
      _i,
      _a,
      item,
      slug,
      categorySlug,
      categoryName,
      category;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          console.log('[SEED] Seeding Blogs...');
          dataPath = path.join(CRAWL_DATA_DIR, 'blogs-data.json');
          if (!fs.existsSync(dataPath)) {
            console.warn('[WARN] Blogs data not found, skipping.');
            return [2 /*return*/];
          }
          data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
          return [
            4 /*yield*/,
            accountsPrisma.staffAccount.findFirst({
              where: { role: 'SUPER_ADMIN' },
            }),
          ];
        case 1:
          adminAccount = _b.sent();
          authorId =
            (adminAccount === null || adminAccount === void 0
              ? void 0
              : adminAccount.id) || 'default-author';
          ((_i = 0), (_a = data));
          _b.label = 2;
        case 2:
          if (!(_i < _a.length)) return [3 /*break*/, 6];
          item = _a[_i];
          slug = slugify(item.title);
          categorySlug = 'y-khoa';
          categoryName = 'Kiến thức y khoa';
          if (item.tags && item.tags.length > 0) {
            categoryName = item.tags[0];
            categorySlug = slugify(categoryName);
          }
          return [
            4 /*yield*/,
            contentPrisma.blogCategory.upsert({
              where: { slug: categorySlug },
              update: {},
              create: {
                name: categoryName,
                slug: categorySlug,
              },
            }),
          ];
        case 3:
          category = _b.sent();
          return [
            4 /*yield*/,
            contentPrisma.blog.upsert({
              where: { slug: slug },
              update: {
                content: item.content,
                thumbnailUrl: item.imageUrl,
                categoryId: category.id,
                authorId: authorId,
                status: client_4.PostStatus.PUBLISHED,
                publishedAt: new Date(),
              },
              create: {
                title: item.title,
                slug: slug,
                content: item.content,
                thumbnailUrl: item.imageUrl,
                categoryId: category.id,
                authorId: authorId,
                status: client_4.PostStatus.PUBLISHED,
                publishedAt: new Date(),
              },
            }),
          ];
        case 4:
          _b.sent();
          _b.label = 5;
        case 5:
          _i++;
          return [3 /*break*/, 2];
        case 6:
          console.log('[SUCCESS] Seeded '.concat(data.length, ' blogs.'));
          return [2 /*return*/];
      }
    });
  });
}
function seedFaqs() {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          console.log('[SEED] Seeding FAQs...');
          return [4 /*yield*/, contentPrisma.faq.deleteMany({})];
        case 1:
          _a.sent();
          return [
            4 /*yield*/,
            contentPrisma.faq.createMany({
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
            }),
          ];
        case 2:
          _a.sent();
          console.log('[SUCCESS] Seeded FAQs.');
          return [2 /*return*/];
      }
    });
  });
}
function seedTestimonials() {
  return __awaiter(this, void 0, void 0, function () {
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          console.log('[SEED] Seeding Testimonials...');
          return [4 /*yield*/, contentPrisma.testimonial.deleteMany({})];
        case 1:
          _a.sent();
          return [
            4 /*yield*/,
            contentPrisma.testimonial.createMany({
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
            }),
          ];
        case 2:
          _a.sent();
          console.log('[SUCCESS] Seeded Testimonials.');
          return [2 /*return*/];
      }
    });
  });
}
function main() {
  return __awaiter(this, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 6, 7, 11]);
          return [4 /*yield*/, seedSpecialties()];
        case 1:
          _a.sent();
          return [4 /*yield*/, seedDoctors()];
        case 2:
          _a.sent();
          return [4 /*yield*/, seedBlogs()];
        case 3:
          _a.sent();
          return [4 /*yield*/, seedFaqs()];
        case 4:
          _a.sent();
          return [4 /*yield*/, seedTestimonials()];
        case 5:
          _a.sent();
          return [3 /*break*/, 11];
        case 6:
          error_1 = _a.sent();
          console.error('[ERROR] Seeding failed:', error_1);
          return [3 /*break*/, 11];
        case 7:
          return [4 /*yield*/, accountsPrisma.$disconnect()];
        case 8:
          _a.sent();
          return [4 /*yield*/, providerPrisma.$disconnect()];
        case 9:
          _a.sent();
          return [4 /*yield*/, contentPrisma.$disconnect()];
        case 10:
          _a.sent();
          return [7 /*endfinally*/];
        case 11:
          return [2 /*return*/];
      }
    });
  });
}
void main();
