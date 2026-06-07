Dưới đây là file hướng dẫn định dạng Markdown (`.md`) đã được chắt lọc, tổng hợp ngắn gọn và chuẩn hóa theo đúng cấu trúc thực tế hệ thống **MedicaLink** của bạn.

Bạn có thể lưu nội dung này thành file `DONG_BO_DATA.md` để sử dụng làm tài liệu kỹ thuật cho dự án.

---

```markdown
# Hướng Dẫn Đồng Bộ Dữ Liệu Từ Local Lên Server Production (MedicaLink)

Tài liệu này hướng dẫn quy trình chuyển cấu trúc **Multi-Database (Local)** lên **Multi-Database (Production)** tương ứng, đồng thời tự động tái đồng bộ hệ thống **AI Vector Store (Qdrant)** thông qua API Gateway.

> ⚠️ **LƯU Ý QUAN TRỌNG:**
> - Ổ cứng Server hiện tại thường cấu hình dung lượng hẹp (~86% usage), bắt buộc phải dọn dẹp file `.dump` ngay sau khi sử dụng để tránh treo Server (Script đã tự động hóa việc này).
> - Đảm bảo rằng file `.env` của AI Service đã cấu hình đúng `API_GATEWAY_BASE_URL=http://medicalink-gateway:3000` để AI Worker giao tiếp được với Gateway.

---

## 🔄 BƯỚC 1: BACKUP DỮ LIỆU TẠI MÁY LOCAL (WINDOWS)

Thực hiện tại thư mục `D:\>` trên máy tính cá nhân (Sử dụng **CMD** hoặc **PowerShell**):

1. Tạo thư mục chứa file dump để quản lý gọn gàng:
```bash
   mkdir D:\db_dumps
```

2. Chạy lần lượt các lệnh trích xuất dữ liệu từ container `medicalink-db` về máy:

```bash
   # 1. Backup Accounts Service
   docker exec -it medicalink-db pg_dump -U postgres -d medicalink_accounts -F c -f /tmp/accounts.dump
   docker cp medicalink-db:/tmp/accounts.dump D:\db_dumps\medicalink_accounts.dump

   # 2. Backup Booking Service
   docker exec -it medicalink-db pg_dump -U postgres -d medicalink_booking -F c -f /tmp/booking.dump
   docker cp medicalink-db:/tmp/booking.dump D:\db_dumps\medicalink_booking.dump

   # 3. Backup Content Service
   docker exec -it medicalink-db pg_dump -U postgres -d medicalink_content -F c -f /tmp/content.dump
   docker cp medicalink-db:/tmp/content.dump D:\db_dumps\medicalink_content.dump

   # 4. Backup Notification Service
   docker exec -it medicalink-db pg_dump -U postgres -d medicalink_notification -F c -f /tmp/notification.dump
   docker cp medicalink-db:/tmp/notification.dump D:\db_dumps\medicalink_notification.dump

   # 5. Backup Provider Service
   docker exec -it medicalink-db pg_dump -U postgres -d medicalink_provider -F c -f /tmp/provider.dump
   docker cp medicalink-db:/tmp/provider.dump D:\db_dumps\medicalink_provider.dump

   # Dọn dẹp file tạm trong container local
   docker exec -it medicalink-db rm -f /tmp/*.dump
```

---

## 🚀 BƯỚC 2: ĐẨY FILE BACKUP LÊN SERVER PRODUCTION

Vẫn tại Terminal máy Local (`D:\>`), sử dụng giao thức `scp` qua file Key để đẩy toàn bộ file lên Server:

```bash
scp -i "medicalink-prod-01_key.pem" D:\db_dumps\medicalink_*.dump azureuser@74.226.217.46:/home/azureuser/
```

---

## 🚀 BƯỚC 3: CHẠY SCRIPT TỰ ĐỘNG ĐỒNG BỘ TRÊN SERVER

Mở cửa sổ **SSH Server** (`azureuser@medicalink-prod-01`) và thực hiện chạy script đã được viết sẵn (script này được deploy tự động khi bạn push code lên repo `medicalink-microservice`).

Script sẽ tự động:
1. Quét tìm các file dump trong thư mục hiện tại.
2. Xóa và khởi tạo lại các Database riêng biệt (Accounts, Booking, Content, Notification, Provider).
3. Restore từng file dump vào đúng Database tương ứng.
4. Tự động kích hoạt AI Worker đồng bộ dữ liệu (Chuyên khoa & Bác sĩ) lên Qdrant thông qua mạng nội bộ Docker.
5. Xóa toàn bộ Cache (Redis, Qdrant query_cache) để dữ liệu hiển thị realtime.
6. Xóa file dump tạm để giải phóng dung lượng ổ cứng.

**Chạy lệnh sau:**

```bash
cd /home/azureuser
chmod +x /home/azureuser/medicalink-microservice/scripts/sync-data-prod.sh
/home/azureuser/medicalink-microservice/scripts/sync-data-prod.sh
```

*(Lưu ý: Log có thể xuất hiện cảnh báo trùng bảng `_prisma_migrations`, điều này hoàn toàn bình thường và script sẽ tự động bỏ qua an toàn).*

---

## 🔧 XỬ LÝ SỰ CỐ (TROUBLESHOOTING)

**Lỗi 502 Bad Gateway khi truy cập Website/API**
Nếu sau khi đồng bộ hoặc sau khi build lại code, bạn bị lỗi 502 Bad Gateway trên production.
**Nguyên nhân:** Nginx đang lưu trữ (cache) địa chỉ IP nội bộ cũ của container `medicalink-gateway` (hoặc các container khác vừa được cấp lại IP mới).
**Khắc phục:** Chạy lệnh sau trên server để Nginx khởi động lại và nhận IP mới:
```bash
docker restart medicalink-nginx
```

---

💡 **Kết quả:** Truy cập hệ thống bằng **Trình duyệt ẩn danh** hoặc dùng tổ hợp phím **`Ctrl + F5`** để kiểm tra giao diện và dữ liệu mới hoạt động mượt mà.
```

```
