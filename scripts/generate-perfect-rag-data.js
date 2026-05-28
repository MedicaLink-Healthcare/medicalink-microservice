const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONCURRENCY_LIMIT = 5;

function generateCuid() {
  return 'cmn' + crypto.randomUUID().replace(/-/g, '').substring(0, 22);
}

// 1. DANH MỤC 30 CHUYÊN KHOA VIỆT NAM CHUẨN LÂM SÀNG GỐC (ĐÃ THÊM KHOA CHẨN ĐOÁN HÌNH ẢNH)
const VIETNAMESE_SPECIALTIES_METADATA = [
  { name: 'Bác sĩ gia đình', slug: 'bac-si-gia-dinh' },
  { name: 'Nội tổng quát', slug: 'noi-tong-quat' },
  { name: 'Tim mạch', slug: 'tim-mach' },
  { name: 'Tiêu hóa - Gan mật', slug: 'tieu-hoa-gan-mat' },
  { name: 'Nội tiết', slug: 'noi-tiet' },
  { name: 'Hô hấp', slug: 'ho-hap' },
  { name: 'Thần kinh', slug: 'than-kinh' },
  { name: 'Cơ xương khớp', slug: 'co-xuong-khop' },
  { name: 'Da liễu', slug: 'da-lieu' },
  { name: 'Dị ứng - Miễn dịch lâm sàng', slug: 'di-ung-mien-dich-lam-sang' },
  { name: 'Tiết niệu', slug: 'tiet-nieu' },
  { name: 'Tâm thần', slug: 'tam-than' },
  { name: 'Ung bướu', slug: 'ung-buou' },
  { name: 'Lão khoa', slug: 'lao-khoa' },
  { name: 'Dinh dưỡng', slug: 'dinh-duong' },
  { name: 'Tai Mũi Họng', slug: 'tai-mui-hong' },
  { name: 'Mắt', slug: 'mat' },
  { name: 'Răng Hàm Mặt', slug: 'rang-ham-mat' },
  { name: 'Sản phụ khoa', slug: 'san-phu-khoa' },
  { name: 'Nam khoa', slug: 'nam-khoa' },
  { name: 'Hiếm muộn - Hỗ trợ sinh sản', slug: 'hiem-muon-ho-tro-sinh-san' },
  { name: 'Nhi khoa', slug: 'nhi-khoa' },
  { name: 'Ngoại tổng quát', slug: 'ngoai-tong-quat' },
  { name: 'Chấn thương chỉnh hình', slug: 'chan-thuong-chinh-hinh' },
  { name: 'Ngoại thần kinh', slug: 'ngoai-than-kinh' },
  { name: 'Lồng ngực - Mạch máu', slug: 'long-nguc-mach-mau' },
  {
    name: 'Phẫu thuật tạo hình - Thẩm mỹ',
    slug: 'phau-thuat-tao-hinh-tham-my',
  },
  { name: 'Phục hồi chức năng', slug: 'phuc-hoi-chuc-nang' },
  { name: 'Y học cổ truyền', slug: 'y-hoc-co-truyen' },
  {
    name: 'Chẩn đoán hình ảnh & Điện quang can thiệp',
    slug: 'chan-doan-hinh-anh-dien-quang-can-thiep',
  },
].map((s) => ({ ...s, id: generateCuid() }));

function getLogicalSpecialties(doc, specialties) {
  const c = (
    (doc.full_name || '') +
    ' ' +
    (doc.position || '') +
    ' ' +
    (doc.introduction_text || '') +
    ' ' +
    (doc.introduction || toggle_intro_text || '')
  ).toLowerCase();

  let matched = [];
  if (c.includes('tim mạch') || c.includes('mạch vành'))
    matched.push(specialties.find((s) => s.slug === 'tim-mach'));
  if (c.includes('tiêu hóa') || c.includes('gan mật'))
    matched.push(specialties.find((s) => s.slug === 'tieu-hoa-gan-mat'));
  if (
    c.includes('sản') ||
    c.includes('phụ khoa') ||
    c.includes('thai sản') ||
    c.includes('ivf') ||
    c.includes('sinh sản')
  )
    matched.push(specialties.find((s) => s.slug === 'san-phu-khoa'));
  if (
    c.includes('tiết niệu') ||
    c.includes('nam học') ||
    (c.includes('nam khoa') && !c.includes('nhi khoa'))
  )
    matched.push(specialties.find((s) => s.slug === 'tiet-nieu'));
  if (c.includes('nam khoa') && !c.includes('nhi khoa'))
    matched.push(specialties.find((s) => s.slug === 'nam-khoa'));
  if (c.includes('hô hấp') || c.includes('phổi'))
    matched.push(specialties.find((s) => s.slug === 'ho-hap'));
  if (c.includes('nhi khoa') || c.includes('sơ sinh') || /bnhib|trẻ em/.test(c))
    matched.push(specialties.find((s) => s.slug === 'nhi-khoa'));
  if (c.includes('tai mũi họng'))
    matched.push(specialties.find((s) => s.slug === 'tai-mui-hong'));
  if (c.includes('da liễu'))
    matched.push(specialties.find((s) => s.slug === 'da-lieu'));
  if (c.includes('mắt') || c.includes('nhãn khoa'))
    matched.push(specialties.find((s) => s.slug === 'mat'));
  if (c.includes('ung bướu') || c.includes('ung thư'))
    matched.push(specialties.find((s) => s.slug === 'ung-buou'));

  if (c.includes('tâm thần') || c.includes('tâm lý')) {
    matched.push(specialties.find((s) => s.slug === 'tam-than'));
  }
  if (
    c.includes('thần kinh') &&
    !c.includes('điện quang') &&
    !c.includes('chẩn đoán hình ảnh') &&
    !c.includes('tâm thần')
  ) {
    matched.push(specialties.find((s) => s.slug === 'than-kinh'));
  }

  if (
    c.includes('cơ xương khớp') ||
    c.includes('xương khớp') ||
    c.includes('chỉnh hình')
  )
    matched.push(specialties.find((s) => s.slug === 'co-xuong-khop'));
  if (c.includes('răng hàm mặt') || c.includes('nha khoa'))
    matched.push(specialties.find((s) => s.slug === 'rang-ham-mat'));
  if (c.includes('nội tiết'))
    matched.push(specialties.find((s) => s.slug === 'noi-tiet'));
  if (c.includes('phục hồi chức năng'))
    matched.push(specialties.find((s) => s.slug === 'phuc-hoi-chuc-nang'));
  if (c.includes('y học cổ truyền'))
    matched.push(specialties.find((s) => s.slug === 'y-hoc-co-truyen'));

  if (c.includes('hồi sức') || c.includes('cấp cứu') || c.includes('icu'))
    matched.push(specialties.find((s) => s.slug === 'noi-tong-quat'));

  if (
    c.includes('chẩn đoán hình ảnh') ||
    c.includes('điện quang can thiệp') ||
    c.includes('x-quang') ||
    c.includes('siêu âm') ||
    c.includes('mri') ||
    c.includes('giải phẫu bệnh') ||
    c.includes('tế bào học') ||
    c.includes('xét nghiệm') ||
    c.includes('vi sinh') ||
    c.includes('sinh học phân tử')
  ) {
    matched.push(
      specialties.find(
        (s) => s.slug === 'chan-doan-hinh-anh-dien-quang-can-thiep',
      ),
    );
  }

  matched = matched.filter(Boolean);
  const uniqueMatched = [...new Set(matched)];

  if (uniqueMatched.length === 0) {
    uniqueMatched.push(specialties.find((s) => s.slug === 'noi-tong-quat'));
  }
  return uniqueMatched.slice(0, 2);
}

async function generatePerfectDoctorProfile(doc, targetSpecialties) {
  const randomRating = parseFloat(
    (Math.random() * (5.0 - 4.3) + 4.3).toFixed(2),
  );
  const randomCost = parseInt((Math.random() * (450 - 200) + 200).toFixed(0));

  const oldIntro = (doc.introduction_text || doc.introduction || '').substring(
    0,
    1100,
  );
  const oldTraining = JSON.stringify(doc.training_process || []);
  const oldExperience = JSON.stringify(doc.experience || []);

  const targetSpecialtyNames = targetSpecialties.map((s) => s.name).join(', ');
  const targetSpecialtyIds = targetSpecialties.map((s) => s.id);
  const subspecialties = targetSpecialties.flatMap((s) => s.expertise || []);

  const prompt = `
Bạn là Giám đốc Chuyên môn của Hệ thống Y tế MedicaLink. Hãy sinh mới nội dung chuyên môn cao cấp chuẩn RAG cho bác sĩ dưới dạng JSON dựa trên dữ liệu gốc và danh mục phân khoa sâu (Subspecialty).

RÀNG BUỘC CHUYÊN KHOA MỤC TIÊU: names: "${targetSpecialtyNames}"
DANH MỤC EXPERTISE TIẾNG VIỆT: ${JSON.stringify(subspecialties)}

DỮ LIỆU ĐÀO TẠO GỐC: ${oldTraining}
DỮ LIỆU KINH NGHIỆM GỐC: ${oldExperience}
GIỚI THIỆU LÝ LỊCH GỐC: ${oldIntro}

YÊU CẦU LÀM GIÀU THUỘC TÍNH PHỤC VỤ TRUY VẤN VÀ GỢI Ý MÔ HÌNH RAG:
1. conditions: Mảng chuỗi chứa các tên bệnh lý lâm sàng cụ thể bác sĩ điều trị tốt nhất.
2. symptoms: Mảng chuỗi chứa các triệu chứng thực tế người bệnh hay mô tả bằng ngôn ngữ tự nhiên. ĐỐI VỚI BÁC SĨ LÂM SÀNG, BẮT BUỘC SUY LUẬN logic dựa trên các diện bệnh lý/phẫu thuật của bác sĩ để điền ít nhất 3-5 triệu chứng (KHÔNG ĐƯỢC ĐỂ RỖNG).
3. expertise: Mảng chứa chuyên môn sâu, lĩnh vực điều trị chuyên sâu của bác sĩ (Ví dụ: "Can thiệp mạch vành", "Điều trị suy tim").
4. procedures: Mảng các thủ thuật, phẫu thuật, hoặc quy trình y khoa bác sĩ có thể thực hiện (Ví dụ: "Đặt stent", "Nội soi dạ dày").
5. patient_groups: Mảng đối tượng (Ví dụ: ["người lớn", "trẻ em"]).
6. position: Chuỗi chức danh nghiệp vụ hiện tại sạch rác thương hiệu cũ, gắn liền với cơ sở mới (Ví dụ: "Bác sĩ điều trị cấp cao tại MedicaLink").
7. introduction: ĐOẠN VĂN TIỂU SỬ CHI TIẾT, HẤP DẪN VÀ CHUYÊN NGHIỆP DÀNH CHO GIAO DIỆN NGƯỜI DÙNG (UI). Viết thành một đoạn văn hoàn chỉnh (khoảng 3-5 câu), văn phong trang trọng, đáng tin cậy. Nhấn mạnh thế mạnh chuyên môn, kinh nghiệm nổi bật, nơi từng công tác danh tiếng, và triết lý khám chữa bệnh (nếu có). Nội dung cần được cá nhân hóa cao độ.
8. experience_years: Số nguyên (Integer). Rút trích chính xác số năm thực tế. Nghiêm cấm gán cứng.
9. education: BẮT BUỘC bóc tách mốc học tập/bằng cấp/khóa đào tạo từ DỮ LIỆU ĐÀO TẠO GỐC thành mảng. NẾU RỖNG, BẮT BUỘC tự bóc tách từ GIỚI THIỆU LÝ LỊCH GỐC.
10. experience: BẮT BUỘC bóc tách cơ quan/đơn vị công tác cũ từ DỮ LIỆU KINH NGHIỆM GỐC thành mảng (lấy tên đơn vị y tế). NẾU RỖNG, BẮT BUỘC tự bóc tách từ GIỚI THIỆU LÝ LỊCH GỐC.

RÀNG BUỘC KIỂM TRA ĐỘ CHÍNH XÁC DỮ LIỆU (DATA INTEGRITY):
1. Đối với bác sĩ thuộc cận lâm sàng thuần túy (Xét nghiệm, Giải phẫu bệnh, Vi sinh, Tế bào học): KHÔNG ĐƯỢC tự ý bịa các bệnh lý lâm sàng vào "conditions" hay "symptoms". Nếu làm xét nghiệm/vi sinh, "conditions" chỉ ghi các hạng mục như: "xét nghiệm máu", "tầm soát vi khuẩn", "phân tích tế bào học"... Mảng symptoms để rỗng.
2. ĐỐI VỚI BÁC SĨ ĐIỆN QUANG CAN THIỆP/CHẨN ĐOÁN HÌNH ẢNH: BẮT BUỘC trích xuất các kỹ thuật can thiệp và diện bệnh can thiệp từ "introduction" để đưa vào mảng "conditions". Mảng symptoms có thể để rỗng.
3. ĐỐI VỚI CÁC BÁC SĨ LÂM SÀNG KHÁC (Tim mạch, Nội, Ngoại, Sản, Nhi...): MẢNG SYMPTOMS KHÔNG ĐƯỢC RỖNG. Dựa vào thế mạnh và "conditions", hãy liệt kê các triệu chứng thường gặp.

ĐẦU RA KỸ THUẬT:
Chỉ trả về duy nhất 1 JSON object bao gồm các trường được yêu cầu ở trên. KHÔNG sử dụng ký tự markdown block code.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    let generatedDoc = JSON.parse(completion.choices[0].message.content.trim());
    delete generatedDoc.department;

    generatedDoc.id = doc.id;
    generatedDoc.staff_account_id = doc.staff_account_id;
    generatedDoc.full_name = doc.full_name;
    generatedDoc.is_male = doc.is_male;
    generatedDoc.avatar_url = doc.avatar_url;
    generatedDoc.specialty_ids = targetSpecialtyIds;

    generatedDoc.ratings = randomRating;
    generatedDoc.experience_years =
      generatedDoc.experience_years || doc.experience_years || 10;
    generatedDoc.service_cost = randomCost;
    generatedDoc.is_active = true;
    generatedDoc.degree = doc.degree || 'Bác sĩ';
    generatedDoc.created_at = doc.created_at;
    generatedDoc.updated_at = doc.updated_at;
    generatedDoc.appointment_duration = 30;

    generatedDoc.conditions = Array.isArray(generatedDoc.conditions)
      ? generatedDoc.conditions.map((c) => c.toLowerCase())
      : [];
    generatedDoc.symptoms = Array.isArray(generatedDoc.symptoms)
      ? generatedDoc.symptoms.map((s) => s.toLowerCase())
      : [];
    generatedDoc.patient_groups = Array.isArray(generatedDoc.patient_groups)
      ? generatedDoc.patient_groups.map((p) => p.toLowerCase())
      : [];
    generatedDoc.expertise = Array.isArray(generatedDoc.expertise)
      ? generatedDoc.expertise
      : [];
    generatedDoc.procedures = Array.isArray(generatedDoc.procedures)
      ? generatedDoc.procedures
      : [];
    generatedDoc.education = Array.isArray(generatedDoc.education)
      ? generatedDoc.education
      : [];
    generatedDoc.experience = Array.isArray(generatedDoc.experience)
      ? generatedDoc.experience
      : [];

    // =========================================================================
    // LAYER CHỐT CHẶN TUYỆT ĐỐI TẦNG CUỐI (HARDCODE GUARDRAILS)
    // =========================================================================
    if (generatedDoc.specialty_ids && generatedDoc.specialty_ids.length > 2) {
      generatedDoc.specialty_ids = generatedDoc.specialty_ids.slice(0, 2);
    }

    const tamThanSpec = targetSpecialties.find((s) => s.slug === 'tam-than');
    if (
      tamThanSpec &&
      !oldIntro.toLowerCase().includes('tâm thần') &&
      !oldIntro.toLowerCase().includes('tâm lý')
    ) {
      generatedDoc.specialty_ids = generatedDoc.specialty_ids.filter(
        (id) => id !== tamThanSpec.id,
      );
      if (generatedDoc.specialty_ids.length === 0) {
        const noiTongQuat =
          targetSpecialties.find((s) => s.slug === 'noi-tong-quat') ||
          VIETNAMESE_SPECIALTIES_METADATA.find(
            (s) => s.slug === 'noi-tong-quat',
          );
        if (noiTongQuat) generatedDoc.specialty_ids.push(noiTongQuat.id);
      }
    }

    const PARACLINICAL_KEYWORDS = [
      'xét nghiệm',
      'vi sinh',
      'chẩn đoán hình ảnh',
      'điện quang',
      'giải phẫu bệnh',
      'tế bào học',
      'siêu âm',
      'mri',
      'ct scan',
      'sinh học phân tử',
      'x-quang',
    ];
    const isParaclinicalDoc = PARACLINICAL_KEYWORDS.some((kw) =>
      oldIntro.toLowerCase().includes(kw),
    );
    const isClinicalIntervention =
      oldIntro.toLowerCase().includes('phẫu thuật') ||
      oldIntro.toLowerCase().includes('mổ') ||
      oldIntro.toLowerCase().includes('can thiệp') ||
      oldIntro.toLowerCase().includes('đốt sóng') ||
      oldIntro.toLowerCase().includes('nút mạch');

    // Chữa dứt điểm lỗi mảng rỗng cận lâm sàng, ép chết giá trị dịch vụ
    if (isParaclinicalDoc && !isClinicalIntervention) {
      generatedDoc.symptoms = [];
      generatedDoc.conditions = [
        'chẩn đoán cận lâm sàng nâng cao',
        'xét nghiệm tầm soát y khoa chuyên sâu',
      ];
    }
    // =========================================================================

    return generatedDoc;
  } catch (error) {
    console.error(
      `  ❌ Lỗi xử lý OpenAI cho bác sĩ ${doc.full_name}:`,
      error.message,
    );
    return null;
  }
}

async function generateVietnameseSpecialty(meta) {
  const prompt = `
    Bạn là Giám đốc Tri thức của MedicaLink. Hãy viết mô tả Tiếng Việt học thuật sâu cho chuyên khoa "${meta.name}". Tập trung vào chức năng điều trị và nhóm bệnh lý nền tảng phục vụ RAG.
    Trả về JSON object gồm:
    - description: đoạn văn ngắn
    - aliases: mảng các tên gọi khác hoặc viết tắt phổ biến (VD: TMH, Tai Mũi Họng)
    - common_symptoms: mảng các triệu chứng phổ biến bệnh nhân hay gặp của khoa này
    - common_conditions: mảng các bệnh lý phổ biến của khoa này
    - keywords: mảng các từ khóa tìm kiếm liên quan
    - expertise: mảng các phân khoa sâu hoặc kỹ thuật chuyên môn
    Không bọc markdown.
  `;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
    let data = JSON.parse(completion.choices[0].message.content.trim());
    return {
      id: meta.id,
      name: meta.name,
      slug: meta.slug,
      aliases: data.aliases || [],
      common_symptoms: data.common_symptoms || [],
      common_conditions: data.common_conditions || [],
      keywords: data.keywords || [],
      expertise: data.expertise || [],
      description: data.description,
      icon_url:
        'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(meta.name) +
        '&background=random&color=fff&rounded=true&size=200',
      is_active: true,
      created_at: '2026-03-26T08:26:53.495Z',
      updated_at: '2026-03-26T08:26:53.495Z',
    };
  } catch (e) {
    return null;
  }
}

async function runPerfectDataPipeline() {
  const startTime = Date.now();
  console.log(
    '⚡ Khởi động luồng Super RAG Optimizing Pipeline (ALL DOCTORS)...',
  );

  const doctorsInputPath = path.join(
    __dirname,
    '../data/doctors_202605212219.json',
  );
  let rawDoctors = [];
  try {
    rawDoctors = JSON.parse(fs.readFileSync(doctorsInputPath, 'utf8')).doctors;
  } catch (e) {
    console.error('⚠️ Không tìm thấy doctors_202605212219.json');
    return;
  }

  console.log(
    `\n📊 [BƯỚC 1] Khởi chạy GPT biên soạn tri thức cho các chuyên khoa...`,
  );
  let finalSpecialties = [];
  for (const meta of VIETNAMESE_SPECIALTIES_METADATA) {
    const specialtyObj = await generateVietnameseSpecialty(meta);
    if (specialtyObj) finalSpecialties.push(specialtyObj);
  }

  const doctorSpecialtiesMapping = new Map();
  const specialtyCount = new Map();
  finalSpecialties.forEach((sp) => specialtyCount.set(sp.id, 0));

  let unassignedDoctors = [];

  for (const doc of rawDoctors) {
    const matchedSpecialties = getLogicalSpecialties(doc, finalSpecialties);

    if (!matchedSpecialties || matchedSpecialties.length === 0) {
      unassignedDoctors.push(doc);
    } else {
      doctorSpecialtiesMapping.set(doc.id, matchedSpecialties);
      matchedSpecialties.forEach((sp) => {
        specialtyCount.set(sp.id, specialtyCount.get(sp.id) + 1);
      });
    }
  }

  const emptySpecialties = finalSpecialties.filter(
    (sp) => specialtyCount.get(sp.id) === 0,
  );
  for (const emptySp of emptySpecialties) {
    if (unassignedDoctors.length > 0) {
      const doc = unassignedDoctors.pop();
      doctorSpecialtiesMapping.set(doc.id, [emptySp]);
      specialtyCount.set(emptySp.id, 1);
    } else {
      const randomDoc =
        rawDoctors[Math.floor(Math.random() * rawDoctors.length)];
      const docSps = doctorSpecialtiesMapping.get(randomDoc.id) || [];
      if (!docSps.find((s) => s.id === emptySp.id)) {
        docSps.push(emptySp);
        doctorSpecialtiesMapping.set(randomDoc.id, docSps);
        specialtyCount.set(emptySp.id, 1);
      }
    }
  }

  for (const doc of unassignedDoctors) {
    const randomSp =
      finalSpecialties[Math.floor(Math.random() * finalSpecialties.length)];
    doctorSpecialtiesMapping.set(doc.id, [randomSp]);
  }

  console.log(
    `\n👨‍⚕️ [BƯỚC 3] GPT bóc tách, sinh mảng triệu chứng, bệnh lý cho ${rawDoctors.length} bác sĩ...`,
  );
  let finalDoctors = [];

  for (let i = 0; i < rawDoctors.length; i += CONCURRENCY_LIMIT) {
    const batch = rawDoctors.slice(i, i + CONCURRENCY_LIMIT);
    const batchPromises = batch.map(async (doc) => {
      const targetSpecialties = doctorSpecialtiesMapping.get(doc.id);
      console.log(
        `  🤖 Đang xử lý: ${doc.full_name} -> [${targetSpecialties.map((s) => s.name).join(', ')}]`,
      );
      return await generatePerfectDoctorProfile(doc, targetSpecialties);
    });

    const results = await Promise.all(batchPromises);
    finalDoctors.push(...results.filter(Boolean));
  }

  // CHỐT CHẶN CUỐI CÙNG TRƯỚC KHI GHI FILE
  finalDoctors = finalDoctors.map((doc) => {
    if (doc.specialty_ids && doc.specialty_ids.length > 2) {
      doc.specialty_ids = doc.specialty_ids.slice(0, 2);
    }
    return doc;
  });

  const doctorsOutputPath = path.join(
    __dirname,
    '../data/doctors_cleaned.json',
  );
  const specialtiesOutputPath = path.join(
    __dirname,
    '../data/specialties_cleaned.json',
  );

  fs.writeFileSync(
    doctorsOutputPath,
    JSON.stringify({ doctors: finalDoctors }, null, 2),
    'utf8',
  );
  fs.writeFileSync(
    specialtiesOutputPath,
    JSON.stringify({ specialties: finalSpecialties }, null, 2),
    'utf8',
  );

  console.log(`\n🎉 [TIẾN TRÌNH HOÀN THÀNH HOÀN HẢO]`);
  console.log(
    `⏱️ Thời gian thực thi: ${(Date.now() - startTime) / 1000} giây.`,
  );
  console.log(`📁 File kết quả kiểm tra hồ sơ bác sĩ: ${doctorsOutputPath}`);
  console.log(
    `📁 File 30 chuyên khoa Việt Nam đầy đủ tri thức: ${specialtiesOutputPath}`,
  );
}

runPerfectDataPipeline();
