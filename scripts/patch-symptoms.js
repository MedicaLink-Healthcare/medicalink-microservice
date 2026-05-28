const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONCURRENCY_LIMIT = 5;

const cleanedPath = path.join(__dirname, '../data/doctors_cleaned.json');

async function patchMissingSymptoms() {
  const cleanedData = JSON.parse(fs.readFileSync(cleanedPath, 'utf8'));

  // Lọc ra các bác sĩ không có symptoms VÀ không phải là Chẩn đoán hình ảnh đơn thuần.
  // 38 bác sĩ chẩn đoán hình ảnh thì có thể không có symptoms, nhưng nếu họ có chuyên khoa khác (như tim mạch) thì nên có.
  const docsToPatch = cleanedData.doctors.filter(
    (d) => !d.symptoms || d.symptoms.length === 0,
  );

  console.log(
    `Found ${docsToPatch.length} doctors missing symptoms. Patching...`,
  );

  let processedCount = 0;

  const processDoctor = async (cleanedDoc) => {
    const intro = cleanedDoc.introduction || '';
    const conditions = (cleanedDoc.conditions || []).join(', ');

    // Bỏ qua nếu là chẩn đoán hình ảnh và không có điều trị bệnh lý
    if (
      cleanedDoc.specialty_ids.includes('cmn019fb1522ff64f74b7b7c3') &&
      cleanedDoc.specialty_ids.length === 1 &&
      !conditions.includes('điều trị')
    ) {
      // Cận lâm sàng thuần túy thì bỏ qua
      return;
    }

    const prompt = `
Bạn là bác sĩ lâm sàng. Bác sĩ này chuyên khám và điều trị các bệnh lý: [${conditions}]. 
Thông tin giới thiệu: ${intro}.

Dựa vào danh sách bệnh lý và chuyên môn trên, hãy liệt kê 3-5 TRIỆU CHỨNG LÂM SÀNG PHỔ BIẾN mà bệnh nhân thường gặp (được diễn đạt bằng ngôn ngữ đời thường).
Ví dụ: "Đau ngực", "Khó thở", "Ho kéo dài", "Đau nhức xương khớp", "Mệt mỏi vô cớ".

Chỉ trả về JSON object có 1 key "symptoms" (giá trị là mảng chuỗi).
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(response.choices[0].message.content.trim());

      if (!cleanedDoc.symptoms || cleanedDoc.symptoms.length === 0) {
        cleanedDoc.symptoms = Array.isArray(parsed.symptoms)
          ? parsed.symptoms
          : [];
      }

      processedCount++;
      process.stdout.write('.');
    } catch (err) {
      console.error('Error on doctor ' + cleanedDoc.full_name, err.message);
    }
  };

  for (let i = 0; i < docsToPatch.length; i += CONCURRENCY_LIMIT) {
    const chunk = docsToPatch.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(chunk.map(processDoctor));
  }

  console.log(
    '\\nFinished patching symptoms. Saving to doctors_cleaned.json...',
  );
  fs.writeFileSync(cleanedPath, JSON.stringify(cleanedData, null, 2));
  console.log('Saved successfully!');
}

patchMissingSymptoms().catch(console.error);
