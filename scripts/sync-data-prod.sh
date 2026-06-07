#!/bin/bash
# Script to automate data restore and synchronization on the Production server
# Assumes medicalink_*.dump files have been copied to the current directory
# Usage: ./sync-data-prod.sh

set -e

echo "============================================================"
echo "🚀 Bắt đầu quá trình đồng bộ dữ liệu vào Production..."
echo "============================================================"

# Kiểm tra file dump có tồn tại không
if ! ls medicalink_*.dump 1> /dev/null 2>&1; then
    echo "❌ LỖI: Không tìm thấy file medicalink_*.dump trong thư mục hiện tại."
    echo "Vui lòng copy file từ local lên server trước khi chạy lệnh này."
    exit 1
fi

echo "✅ Đã tìm thấy các file dump."

echo "------------------------------------------------------------"
echo "🛠️ 1 & 2 & 3. Xóa, Copy và Restore Database (Từng Service)..."
echo "------------------------------------------------------------"
declare -a services=("accounts" "booking" "content" "notification" "provider")

for service in "${services[@]}"; do
    db_name="medicalink_${service}"
    dump_name="${db_name}.dump"
    
    if [ -f "$dump_name" ]; then
        echo "   ========================================="
        echo "   🟢 Đang xử lý database: $db_name"
        echo "   ========================================="
        
        # Ngắt kết nối và xóa DB cũ
        docker exec medicalink-postgres psql -U postgres -c "REVOKE CONNECT ON DATABASE $db_name FROM public;" || true
        docker exec medicalink-postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db_name' AND pid <> pg_backend_pid();" || true
        docker exec medicalink-postgres psql -U postgres -c "DROP DATABASE IF EXISTS $db_name;"
        docker exec medicalink-postgres psql -U postgres -c "CREATE DATABASE $db_name;"
        
        # Copy file dump vào container
        echo "   - Copying $dump_name vào container Postgres..."
        docker cp "$dump_name" "medicalink-postgres:/$dump_name"
        
        # Restore dữ liệu
        echo "   - Restoring $dump_name..."
        docker exec -t medicalink-postgres pg_restore -U postgres -d "$db_name" "/$dump_name" || true
    else
        echo "   ⚠️ Bỏ qua $db_name vì không tìm thấy file $dump_name"
    fi
done

echo "------------------------------------------------------------"
echo "🤖 4. Đồng bộ Vector AI & Xóa toàn bộ Cache cũ..."
echo "------------------------------------------------------------"
echo "   - Đồng bộ chuyên khoa..."
docker exec medicalink-ai-service-medicalink-ai-1 python -m medicalink_ai.scripts.sync_specialties_qdrant || true

echo "   - Đồng bộ hồ sơ bác sĩ..."
docker exec medicalink-ai-service-medicalink-ai-1 python -m medicalink_ai.scripts.batch_sync || true

echo "   - Xóa cache Redis..."
docker exec medicalink-redis redis-cli FLUSHALL || true

echo "   - Xóa cache Qdrant..."
docker exec medicalink-nginx curl -s -X DELETE "http://medicalink-qdrant:6333/collections/query_cache" > /dev/null || true

echo "------------------------------------------------------------"
echo "🧹 5. Xóa file tạm & Giải phóng dung lượng ổ cứng Server..."
echo "------------------------------------------------------------"
echo "   - Xóa file dump trong container Postgres..."
docker exec -t medicalink-postgres rm -f /medicalink_accounts.dump /medicalink_booking.dump /medicalink_content.dump /medicalink_notification.dump /medicalink_provider.dump || true

echo "   - Xóa file dump ngoài host..."
rm -f medicalink_*.dump

echo "   - Prune giải phóng các layer docker thừa..."
docker system prune -f

echo "============================================================"
echo "🎉 HOÀN TẤT ĐỒNG BỘ DỮ LIỆU!"
echo "Truy cập hệ thống và nhấn Ctrl + F5 để kiểm tra."
echo "============================================================"
