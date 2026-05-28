const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONCURRENCY_LIMIT = 5;

const rawPath = path.join(__dirname, '../data/doctors_202605212219.json');
const cleanedPath = path.join(__dirname, '../data/doctors_cleaned.json');

async function patchMissingData() {
  const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8')).doctors;
  const cleanedData = JSON.parse(fs.readFileSync(cleanedPath, 'utf8'));
  const docsToPatch = cleanedData.doctors.filter(
    (d) =>
      !d.experience ||
      d.experience.length === 0 ||
      !d.education ||
      d.education.length === 0,
  );

  console.log(
    `Found ${docsToPatch.length} doctors missing education or experience. Patching...`,
  );

  let processedCount = 0;

  const processDoctor = async (cleanedDoc) => {
    const rawDoc = rawData.find((r) => r.id === cleanedDoc.id);
    if (!rawDoc || (!rawDoc.introduction_text && !rawDoc.introduction)) return;

    const intro = (
      rawDoc.introduction_text ||
      rawDoc.introduction ||
      ''
    ).substring(0, 1500);

    const prompt = `
Bạn là chuyên gia bóc tách dữ liệu y khoa. Hãy đọc kỹ phần giới thiệu của bác sĩ sau đây và bóc tách thành 2 mảng JSON.
1. "education": Mảng các mốc học tập, bằng cấp, chứng chỉ, khóa đào tạo, trường đại học y (ví dụ: "Tốt nghiệp Bác sĩ đa khoa, ĐH Y Dược TP.HCM", "Tu nghiệp tại Pháp").
2. "experience": Mảng các nơi từng công tác, đơn vị, bệnh viện, chức vụ (ví dụ: "Bác sĩ điều trị tại Bệnh viện Chợ Rẫy", "Trưởng khoa Nội tim mạch Bệnh viện Tâm Anh").

Nếu không tìm thấy thông tin cho một trong 2 mảng, hãy suy luận hoặc trả về mảng rỗng nếu hoàn toàn không có. Nhưng hãy CỐ GẮNG đọc kỹ để tìm thông tin công tác/học tập.
Chỉ trả về JSON object có 2 key "education" và "experience" (giá trị là mảng chuỗi).

Giới thiệu bác sĩ:
${intro}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(response.choices[0].message.content.trim());

      if (!cleanedDoc.education || cleanedDoc.education.length === 0) {
        cleanedDoc.education = Array.isArray(parsed.education)
          ? parsed.education
          : [];
      }

      if (!cleanedDoc.experience || cleanedDoc.experience.length === 0) {
        cleanedDoc.experience = Array.isArray(parsed.experience)
          ? parsed.experience
          : [];
      }

      processedCount++;
      process.stdout.write('.');
    } catch (err) {
      console.error('Error on doctor ' + cleanedDoc.full_name, err.message);
    }
  };

  // Process in chunks to respect concurrency limit
  for (let i = 0; i < docsToPatch.length; i += CONCURRENCY_LIMIT) {
    const chunk = docsToPatch.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(chunk.map(processDoctor));
  }

  console.log('\nFinished patching. Saving to doctors_cleaned.json...');
  fs.writeFileSync(cleanedPath, JSON.stringify(cleanedData, null, 2));
  console.log('Saved successfully!');
}

patchMissingData().catch(console.error);
