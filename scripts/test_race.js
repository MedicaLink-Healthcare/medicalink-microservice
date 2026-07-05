const BOOKING_URL = 'https://api.medicalink.online/api/appointments/hold';
const NUM_REQUESTS = 20;

const payload = {
  doctorId: 'cmnb8quh200ahvky0vh0y949h',
  locationId: 'cm0hq6rxg000008mf3x0c6w4b',
  serviceDate: '2026-07-01',
  timeStart: '09:30',
  timeEnd: '10:00',
};

console.log(
  `Bắt đầu Stress Test Race Condition với ${NUM_REQUESTS} requests đồng thời...`,
);
console.log(`Endpoint: ${BOOKING_URL}`);

async function runTest() {
  const promises = [];
  console.log(
    `\n--- BẮT ĐẦU GỬI 20 REQUESTS TẠI: ${new Date().toISOString()} ---\n`,
  );

  // Tạo 20 requests bắn đi cùng lúc (cùng 1 mili-giây)
  for (let i = 0; i < NUM_REQUESTS; i++) {
    // Mỗi request giả lập một người dùng (session) khác nhau
    const sessionId = `session_${Math.random().toString(36).substring(2, 9)}`;
    const requestPayload = { ...payload, sessionId };
    const reqSendTime = new Date().toISOString();

    promises.push(
      fetch(BOOKING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          const reqEndTime = new Date().toISOString();
          return {
            status: res.status,
            body,
            sessionId,
            reqSendTime,
            reqEndTime,
          };
        })
        .catch((err) => {
          const reqEndTime = new Date().toISOString();
          return {
            status: 500,
            error: err.message,
            sessionId,
            reqSendTime,
            reqEndTime,
          };
        }),
    );
  }

  // Chờ tất cả requests hoàn thành
  const results = await Promise.all(promises);

  let successCount = 0;
  let failCount = 0;

  results.forEach((r, idx) => {
    // Lấy chuỗi thời gian chi tiết tới mili-giây (VD: 01:38:14.123Z)
    const timeInfo = `[Send: ${r.reqSendTime.split('T')[1]} | Recv: ${r.reqEndTime.split('T')[1]}]`;
    const reqNum = String(idx + 1).padStart(2, '0');

    if (r.status >= 200 && r.status < 300) {
      successCount++;
      console.log(
        `[Request ${reqNum}] ${timeInfo} ✅ THÀNH CÔNG - Session [${r.sessionId}] đã lấy được Lock!`,
      );
    } else {
      failCount++;
      console.log(
        `[Request ${reqNum}] ${timeInfo} ❌ THẤT BẠI - Status: ${r.status}, Lỗi: ${r.body?.message || r.error || 'Blocked'}`,
      );
    }
  });

  console.log('\n--- KẾT QUẢ TỔNG QUAN (SUMMARY) ---');
  console.log(`Tổng số Requests: ${NUM_REQUESTS}`);
  console.log(`Số requests thành công (Lấy được Lock): ${successCount}`);
  console.log(`Số requests bị chặn (Blocked by Redis): ${failCount}`);

  if (successCount === 1) {
    console.log(
      '✅ TEST PASSED: Cơ chế chống Race Condition hoạt động hoàn hảo! Chỉ duy nhất 1 request được phép đi qua.',
    );
  } else {
    console.log('❌ TEST FAILED: Có lỗi xảy ra, kết quả không như mong muốn.');
  }

  // Release the hold after test so it can be run again easily
  console.log(
    '\nĐang giải phóng (release) Lock để chuẩn bị cho lần test tiếp theo...',
  );
  try {
    const successSession = results.find(
      (r) => r.status >= 200 && r.status < 300,
    )?.sessionId;
    await fetch(BOOKING_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, sessionId: successSession || 'none' }),
    });
    console.log('Đã giải phóng Lock thành công!');
  } catch (e) {
    console.log('Lỗi khi giải phóng Lock:', e.message);
  }
}

runTest();
