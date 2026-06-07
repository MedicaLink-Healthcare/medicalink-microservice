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

async function fixHallucinations() {
  const doctorsData = JSON.parse(fs.readFileSync(doctorsPath, 'utf8'));
  const specialtiesData = JSON.parse(fs.readFileSync(specialtiesPath, 'utf8'));

  const specMap = new Map();
  specialtiesData.specialties.forEach((s) => specMap.set(s.id, s));

  console.log(`Bắt đầu làm sạch ${doctorsData.doctors.length} hồ sơ bác sĩ...`);

  let finalDoctors = [];

  const processDoctor = async (doc) => {
    const assignedSpecs = doc.specialty_ids.map((id) => specMap.get(id));
    const specNames = assignedSpecs.map((s) => s.name).join(', ');
    const specExpertise = assignedSpecs
      .flatMap((s) => s.expertise || [])
      .join(', ');

    const prompt = `
Bạn là Giám đốc Chuyên môn của hệ thống y tế. Hệ thống vừa bị lỗi gán nhầm dữ liệu (hallucination): Một số bác sĩ bị gán sai hồ sơ (ví dụ: Chuyên khoa là "Da liễu" nhưng thông tin khám bệnh lại ghi chữa "Suy tim, Mạch vành").

Nhiệm vụ của bạn là SỬA LẠI HOÀN TOÀN hồ sơ của bác sĩ dưới đây sao cho khớp 100% với CHUYÊN KHOA ĐƯỢC GÁN, để dữ liệu RAG chuẩn xác nhất.

THÔNG TIN BẮT BUỘC GIỮ NGUYÊN (Không được thay đổi ID hay Tên):
- id: "${doc.id}"
- full_name: "${doc.full_name}"

CHUYÊN KHOA ĐƯỢC GÁN MỤC TIÊU: [${specNames}]
LĨNH VỰC CHUYÊN SÂU CỦA CHUYÊN KHOA NÀY: [${specExpertise}]

DỮ LIỆU HIỆN TẠI (Có thể đang bị râu ông nọ cắm cằm bà kia):
${JSON.stringify(
  {
    conditions: doc.conditions,
    symptoms: doc.symptoms,
    expertise: doc.expertise,
    procedures: doc.procedures,
    introduction: doc.introduction,
    education: doc.education,
    experience: doc.experience,
  },
  null,
  2,
)}

YÊU CẦU:
Đánh giá dữ liệu hiện tại. Nếu nó chứa thông tin của chuyên khoa khác (sai lệch hoàn toàn với [${specNames}]), hãy VIẾT LẠI MỚI TOÀN BỘ các trường: conditions, symptoms, expertise, procedures, introduction, education, experience để biến họ thành một chuyên gia xuất sắc và thực tế của chuyên khoa [${specNames}]. 
Lưu ý: 
- Đối với chuyên khoa Cận lâm sàng (Chẩn đoán hình ảnh, Xét nghiệm), symptoms để rỗng [].
- Viết introduction thật chuyên nghiệp, khoảng 3-4 câu.
- education và experience hãy tựa theo bác sĩ chuyên khoa [${specNames}] thực tế (giữ lại các chi tiết không vi phạm chuyên khoa nếu được, nếu không thì bịa hợp lý).

ĐẦU RA:
Trả về 1 JSON object chứa ĐẦY ĐỦ các key (conditions, symptoms, expertise, procedures, introduction, education, experience). Không bọc markdown.
`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const fixedData = JSON.parse(
        completion.choices[0].message.content.trim(),
      );

      // Override doc with fixed fields
      doc.conditions = fixedData.conditions || [];
      doc.symptoms = fixedData.symptoms || [];
      doc.expertise = fixedData.expertise || [];
      doc.procedures = fixedData.procedures || [];
      doc.introduction = fixedData.introduction || '';
      doc.education = fixedData.education || [];
      doc.experience = fixedData.experience || [];

      process.stdout.write('✅ ');
    } catch (err) {
      process.stdout.write('❌ ');
      console.error(`\nLỗi ở bác sĩ ${doc.full_name}: ${err.message}`);
    }
    return doc;
  };

  for (let i = 0; i < doctorsData.doctors.length; i += CONCURRENCY_LIMIT) {
    const chunk = doctorsData.doctors.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(chunk.map(processDoctor));
    finalDoctors.push(...results);
  }

  doctorsData.doctors = finalDoctors;
  fs.writeFileSync(doctorsPath, JSON.stringify(doctorsData, null, 2), 'utf8');
  console.log('\n🎉 Hoàn thành làm sạch dữ liệu!');
}

fixHallucinations().catch(console.error);
