const fs = require('fs');

const specialtiesData = JSON.parse(
  fs.readFileSync(
    'd:/Personal_Project/medicalink-microservice/data/specialties_cleaned.json',
  ),
);
const doctorsData = JSON.parse(
  fs.readFileSync(
    'd:/Personal_Project/medicalink-microservice/data/doctors_cleaned.json',
  ),
);

// 1. Core 15 specialties names
const targetSpecialtyNames = [
  'Nội tổng quát',
  'Tim mạch',
  'Thần kinh',
  'Cơ xương khớp',
  'Tiêu hóa - Gan mật',
  'Nhi khoa',
  'Sản phụ khoa',
  'Tai Mũi Họng',
  'Mắt',
  'Da liễu',
  'Răng Hàm Mặt',
  'Hô hấp',
  'Nội tiết',
  'Tiết niệu',
  'Ung bướu',
];

// 2. Filter specialties to the top 15
const coreSpecialties = specialtiesData.specialties.filter((s) =>
  targetSpecialtyNames.includes(s.name),
);
// Just in case we didn't find all 15 exactly, pick remaining to make it 15.
if (coreSpecialties.length < 15) {
  const existingIds = new Set(coreSpecialties.map((s) => s.id));
  for (const s of specialtiesData.specialties) {
    if (!existingIds.has(s.id)) {
      coreSpecialties.push(s);
      if (coreSpecialties.length === 15) break;
    }
  }
}
const coreSpecialtiesIds = coreSpecialties.map((s) => s.id);

// 3. Process Doctors
let remainingDoctors = [...doctorsData.doctors];
let finalDoctors = [];
const specialtyDoctorCounts = {};
coreSpecialtiesIds.forEach((id) => (specialtyDoctorCounts[id] = 0));

const MAX_PER_SPECIALTY = 10;

// First pass: try to assign exactly 10 doctors to each specialty based on their existing primary specialty
for (const specId of coreSpecialtiesIds) {
  // Find doctors who have this as their PRIMARY (or at least in their array)
  // To maintain existing data context as much as possible
  const candidates = remainingDoctors.filter((d) =>
    d.specialty_ids.includes(specId),
  );

  let picked = 0;
  for (const d of candidates) {
    if (picked >= MAX_PER_SPECIALTY) break;
    // Assign this doctor to this specialty
    d.specialty_ids = [specId];
    finalDoctors.push(d);
    // Remove from remaining
    remainingDoctors = remainingDoctors.filter((rd) => rd.id !== d.id);
    picked++;
    specialtyDoctorCounts[specId]++;
  }
}

// Second pass: if some specialties still need doctors, forcefully assign random remaining doctors
for (const specId of coreSpecialtiesIds) {
  while (specialtyDoctorCounts[specId] < MAX_PER_SPECIALTY) {
    if (remainingDoctors.length === 0) break;
    const d = remainingDoctors.shift(); // take the first remaining
    d.specialty_ids = [specId]; // forcefully assign
    finalDoctors.push(d);
    specialtyDoctorCounts[specId]++;
  }
}

// Now we have exactly 150 doctors (if there were enough total doctors).
// Let's add a second specialty to 10-20% of them (e.g., 20 doctors).
const doctorsToGetSecondSpec = Math.floor(finalDoctors.length * 0.15); // ~15%
for (let i = 0; i < doctorsToGetSecondSpec; i++) {
  const doc = finalDoctors[i];
  const primarySpecId = doc.specialty_ids[0];

  // Pick a random secondary specialty different from primary
  const secondaryCandidates = coreSpecialtiesIds.filter(
    (id) => id !== primarySpecId,
  );
  const secondarySpecId =
    secondaryCandidates[Math.floor(Math.random() * secondaryCandidates.length)];

  doc.specialty_ids.push(secondarySpecId);
}

// Write back to files
fs.writeFileSync(
  'd:/Personal_Project/medicalink-microservice/data/specialties_cleaned.json',
  JSON.stringify({ specialties: coreSpecialties }, null, 2),
);
fs.writeFileSync(
  'd:/Personal_Project/medicalink-microservice/data/doctors_cleaned.json',
  JSON.stringify({ doctors: finalDoctors }, null, 2),
);

console.log(`Saved ${coreSpecialties.length} specialties.`);
console.log(`Saved ${finalDoctors.length} doctors.`);
console.log(
  'Specialty assignments:',
  coreSpecialties.map((s) => ({
    name: s.name,
    count: specialtyDoctorCounts[s.id],
  })),
);
