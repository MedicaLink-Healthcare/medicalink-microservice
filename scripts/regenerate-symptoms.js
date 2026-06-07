const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONCURRENCY_LIMIT = 5;

const doctorsPath = path.join(__dirname, '../data/doctors_cleaned.json');
const specialtiesPath = path.join(
  __dirname,
  '../data/specialties_cleaned.json',
);

async function regenerateSymptoms() {
  const doctorsData = JSON.parse(fs.readFileSync(doctorsPath, 'utf8'));
  const specialtiesData = JSON.parse(fs.readFileSync(specialtiesPath, 'utf8'));

  const specMap = new Map();
  specialtiesData.specialties.forEach((s) => specMap.set(s.id, s.name));

  const docsToProcess = doctorsData.doctors.filter((doc) => {
    // Only clinical doctors lacking symptoms
    if (doc.symptoms && doc.symptoms.length > 0) return false;

    const assignedSpecNames = doc.specialty_ids
      .map((id) => specMap.get(id))
      .join(', ');
    // Exclude Pure Paraclinical specialties from symptom generation
    if (
      assignedSpecNames.includes('Chẩn đoán hình ảnh') ||
      assignedSpecNames.includes('Xét nghiệm')
    ) {
      return false;
    }
    return true;
  });

  console.log(
    `Tiến hành sinh 'symptoms' cho ${docsToProcess.length} bác sĩ lâm sàng bị thiếu...`,
  );

  const processDoctor = async (doc) => {
    const assignedSpecNames = doc.specialty_ids
      .map((id) => specMap.get(id))
      .join(', ');

    const prompt = `
Bạn là chuyên gia thiết kế Dữ liệu Y tế cho hệ thống Vector RAG.
Tôi đang có một bác sĩ lâm sàng thuộc chuyên khoa: [${assignedSpecNames}].
Các lĩnh vực điều trị sâu (conditions/expertise) của họ: ${doc.conditions.join(', ')} | ${doc.expertise.join(', ')}
Giới thiệu: ${doc.introduction}

Nhiệm vụ của bạn:
Vì hệ thống RAG cần đối sánh truy vấn bằng ngôn ngữ tự nhiên của bệnh nhân (VD: "bác sĩ ơi dạo này tôi hay bị nhói ngực và khó thở"), bạn hãy sinh ra TỪ 5 ĐẾN 8 TRIỆU CHỨNG LÂM SÀNG đặc thù mà bác sĩ này điều trị tốt nhất.
Yêu cầu:
- Viết bằng ngôn ngữ tự nhiên của người bệnh (VD: "đau rát dạ dày", "tiêu chảy kéo dài", "sưng tấy khớp gối"...).
- Dựa CHÍNH XÁC vào thế mạnh điều trị (conditions/expertise) của bác sĩ này để TẠO SỰ PHÂN HÓA CAO. Đừng dùng các triệu chứng chung chung.
- Trả về 1 mảng JSON chứa các chuỗi triệu chứng.

Output CHỈ LÀ 1 JSON object với duy nhất key "symptoms":
{
  "symptoms": ["triệu chứng 1", "triệu chứng 2", ...]
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(response.choices[0].message.content.trim());

      // Update the original object in the full array by reference
      doc.symptoms = parsed.symptoms || [];
      process.stdout.write('✅ ');
    } catch (err) {
      process.stdout.write('❌ ');
      console.error(`\nLỗi ở bác sĩ ${doc.full_name}: ${err.message}`);
    }
  };

  for (let i = 0; i < docsToProcess.length; i += CONCURRENCY_LIMIT) {
    const chunk = docsToProcess.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(chunk.map(processDoctor));
  }

  // Save changes
  fs.writeFileSync(doctorsPath, JSON.stringify(doctorsData, null, 2), 'utf8');
  console.log('\n🎉 Hoàn thành sinh dữ liệu triệu chứng phân hóa cao!');
}

regenerateSymptoms().catch(console.error);
