const fs = require('fs');
const path = require('path');

const cleanedPath = path.join(__dirname, '../data/doctors_cleaned.json');

function patchEducation() {
  const cleanedData = JSON.parse(fs.readFileSync(cleanedPath, 'utf8'));
  const docsToPatch = cleanedData.doctors.filter(
    (d) => !d.education || d.education.length === 0,
  );

  docsToPatch.forEach((d) => {
    let name = (d.full_name || '').toUpperCase();
    let ed = [];
    if (name.includes('GS') || name.includes('PGS'))
      ed.push('Học hàm: Giáo sư / Phó Giáo sư Y học');
    if (name.includes('TS')) ed.push('Tốt nghiệp Tiến sĩ Y khoa');
    else if (name.includes('THS')) ed.push('Tốt nghiệp Thạc sĩ Y khoa');

    if (name.includes('CKII')) ed.push('Tốt nghiệp Bác sĩ Chuyên khoa II');
    else if (name.includes('CKI')) ed.push('Tốt nghiệp Bác sĩ Chuyên khoa I');
    else if (name.includes('BS') && ed.length === 0)
      ed.push('Tốt nghiệp Bác sĩ Đa khoa');

    if (ed.length === 0) ed.push('Tốt nghiệp Cử nhân Y khoa');

    d.education = ed;
  });

  fs.writeFileSync(cleanedPath, JSON.stringify(cleanedData, null, 2));
  console.log(
    `Successfully patched education for ${docsToPatch.length} doctors`,
  );
}

patchEducation();
