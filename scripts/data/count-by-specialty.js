const fs = require('fs');

const doctorsData = JSON.parse(
  fs.readFileSync('./data/doctors_cleaned.json', 'utf8'),
);

const specialtiesData = JSON.parse(
  fs.readFileSync('./data/specialties_cleaned.json', 'utf8'),
);

// Map specialty id -> tên khoa
const specialtyMap = {};

for (const specialty of specialtiesData.specialties) {
  specialtyMap[specialty.id] =
    specialty.name_vi ||
    specialty.name ||
    specialty.title ||
    specialty.specialty_name;
}

// Đếm
const stats = {};

for (const doctor of doctorsData.doctors) {
  const specialtyName =
    specialtyMap[doctor.specialty_id] || `UNKNOWN (${doctor.specialty_id})`;

  stats[specialtyName] = (stats[specialtyName] || 0) + 1;
}

// Sort giảm dần
const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);

console.table(
  sorted.map(([specialty, count]) => ({
    specialty,
    doctors: count,
  })),
);

console.log('\nTổng số bác sĩ:', doctorsData.doctors.length);
