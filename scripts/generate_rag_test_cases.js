const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONCURRENCY_LIMIT = 5;

// Paths
const dataDir = path.join(__dirname, '../data');
const inputJson = path.join(dataDir, 'specialties_cleaned.json');
const outputCsv = path.join(dataDir, 'rag_test_cases_ai.csv');

async function generateTestCasesForSpecialty(specialty) {
  const prompt = `
Bạn là một chuyên gia AI chuyên tạo dữ liệu kiểm thử (Test Data Generation) cho hệ thống y tế.
Nhiệm vụ của bạn là tạo ra 25 câu query (câu hỏi/mô tả triệu chứng của bệnh nhân) dành riêng cho chuyên khoa: "${specialty.name}".

Thông tin chuyên khoa để tham khảo:
- Tên chuyên khoa: ${specialty.name}
- Triệu chứng phổ biến: ${specialty.common_symptoms ? specialty.common_symptoms.join(', ') : ''}
- Bệnh lý phổ biến: ${specialty.common_conditions ? specialty.common_conditions.join(', ') : ''}

YÊU CẦU DỮ LIỆU ĐẦU RA:
Tạo 25 test cases đa dạng, bao gồm:
1. Symptoms Only (10 câu): Chỉ mô tả triệu chứng. Cần đa dạng hóa văn phong (than vãn, lo lắng, hỏi đáp), CỐ TÌNH sai lỗi chính tả tự nhiên của người Việt, dùng từ ngữ dân dã, viết tắt.
2. Condition Only (5 câu): Chỉ hỏi về bệnh lý (ví dụ: tôi bị bệnh X thì khám khoa nào, muốn điều trị bệnh Y).
3. Mixed (5 câu): Kết hợp cả triệu chứng và bệnh lý nền.
4. Edge Case / Overlapping (5 câu): Cố tình đưa vào 1-2 triệu chứng dễ nhầm lẫn với khoa khác, nhưng BẮT BUỘC phải có "từ khóa neo (anchor keyword)" quyết định để hệ thống RAG bắt được chính xác về khoa "${specialty.name}".

ĐỊNH DẠNG ĐẦU RA (JSON OBJECT DUY NHẤT, KHÔNG DÙNG MARKDOWN BLOCK CODE):
{
  "test_cases": [
    {
      "Query": "Nội dung câu hỏi của bệnh nhân...",
      "Expected_Specialty": "${specialty.name}",
      "Test_Type": "Symptoms Only | Condition Only | Mixed | Edge Case"
    }
  ]
}`;

  let retries = 3;
  while (retries > 0) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0].message.content.trim();
      const generatedData = JSON.parse(responseContent);

      if (generatedData.test_cases && Array.isArray(generatedData.test_cases)) {
        return generatedData.test_cases;
      } else {
        throw new Error('Invalid JSON structure');
      }
    } catch (error) {
      console.error(
        `[Error] Failed to generate for ${specialty.name}. Retries left: ${retries - 1}`,
      );
      retries--;
      if (retries === 0) return [];
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  // Nếu có dấu phẩy, quote hoặc newline thì phải bọc trong quote
  if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function run() {
  console.log('Bắt đầu quá trình sinh test cases bằng LLM...');

  if (!fs.existsSync(inputJson)) {
    console.error('Không tìm thấy file specialties_cleaned.json!');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputJson, 'utf-8'));
  const specialties = data.specialties || [];

  if (specialties.length === 0) {
    console.error('Không có dữ liệu chuyên khoa!');
    process.exit(1);
  }

  let allTestCases = [];

  // Chạy đồng thời với giới hạn concurrency
  for (let i = 0; i < specialties.length; i += CONCURRENCY_LIMIT) {
    const chunk = specialties.slice(i, i + CONCURRENCY_LIMIT);
    console.log(
      'Đang xử lý batch từ ' +
        i +
        ' đến ' +
        (i + chunk.length - 1) +
        ' / ' +
        (specialties.length - 1) +
        '...',
    );

    const promises = chunk.map((specialty) =>
      generateTestCasesForSpecialty(specialty),
    );
    const results = await Promise.all(promises);

    results.forEach((testCases) => {
      allTestCases = allTestCases.concat(testCases);
    });
  }

  console.log(
    'Đã sinh thành công ' +
      allTestCases.length +
      ' test cases. Đang ghi ra CSV...',
  );

  // Ghi ra file CSV (Tự viết CSV)
  let csvContent = '\\ufeffQuery,Expected_Specialty,Test_Type\\n';
  allTestCases.forEach((tc) => {
    const query = escapeCsvField(tc.Query);
    const expected = escapeCsvField(tc.Expected_Specialty);
    const testType = escapeCsvField(tc.Test_Type);
    csvContent += query + ',' + expected + ',' + testType + '\\n';
  });

  fs.writeFileSync(outputCsv, csvContent, 'utf8');
  console.log('Hoàn tất! File đã được lưu tại: ' + outputCsv);
}

run();
