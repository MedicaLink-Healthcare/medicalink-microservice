import subprocess
import psycopg2

mapping = """
cmn45e60480f0734fbe84de7e|Bác sĩ gia đình                          |https://cdn-pkh.longvan.net/medpro-production/default/avatar/ChuyenKhoa.png
cmnde90369e8b17431587bedd|Nội tổng quát                            |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/noi_tong_quat.png
cmn305ee71e46d24f2396fe68|Tim mạch                                 |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/tim_mach.png
cmna8cf9e42b9c14beca968d2|Tiêu hóa - Gan mật                       |https://cdn-pkh.longvan.net/medpro-production/umc/subjects/1655710722460-TIEU_HOA_GAN_MAT.png
cmn25b8987d232447e8bd9517|Hô hấp                                   |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/ho_hap.png
cmne6870ce72d43457881a7dd|Thần kinh                                |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/than_kinh.png
cmn6f922b051e05454388c512|Cơ xương khớp                            |https://cdn.medpro.vn/medpro-production/medpro/subjects/1759222134922-chiropractic.png
cmn9a464d69a3c64f3f856cd8|Da liễu                                  |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/da_lieu.png
cmn0d8db982b8a74ee1808972|Tiết niệu                                |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/tiet_nieu.png
cmn05e2799db9c54691854315|Ung bướu                                 |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/ung_buou.png
cmn0ea0fd6aea9545a89132be|Dinh dưỡng                               |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/dinh_duong.png
cmn388a64a878494c57b1c0f2|Tai Mũi Họng                             |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/tai_mui_hong.png
cmnd3d0cbae4b8e497c960246|Mắt                                      |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/mat.png
cmn60eafc3e66444b2a851b8d|Răng Hàm Mặt                             |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/rang_ham_mat.png
cmn8e15f11b477a48e2989d59|Nam khoa                                 |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/nam_khoa.png
cmnc6a6270904534d49a4c532|Nhi khoa                                 |https://cdn.medpro.vn/medpro-production/medpro/subjects/1759980664918-20251009_102810.png
cmn7a2680d306b64e7ba6d48f|Ngoại tổng quát                          |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/tong_quat.png
cmncdc7ee40d3cc489da0f185|Ngoại thần kinh                          |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/ngoai_than_kinh.png
cmn7c81420344b546258ba767|Lồng ngực - Mạch máu                     |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/long_nguc_mach_mau.png
cmnef9abf7a191b4506a6c250|Phẫu thuật tạo hình - Thẩm mỹ            |https://cdn.medpro.vn/medpro-production/medpro/subjects/1745302606104-tao_hinh_tham_my.png
cmn25ed0d1f539e45319d5092|Y học cổ truyền                          |https://cdn-pkh.longvan.net/medpro-production/default/avatar/ChuyenKhoa.png
cmn019fb1522ff64f74b7b7c3|Chẩn đoán hình ảnh & Điện quang can thiệp|https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/chan_thuong_chinh_hinh.png
cmn347714c1937b4ebd858bd6|Nội tiết                                 |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/noi_tiet.png
cmnf8af4550a200441282873b|Dị ứng - Miễn dịch lâm sàng              |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/di_ung_mien_dich_lam_sang.png
cmn35469ec3d62449eca8514b|Tâm thần                                 |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/tam_than_kinh.png
cmnce72b05c2816485db33cd8|Lão khoa                                 |https://cdn-pkh.longvan.net/medpro-production/umc/subjects/PW/1651820749478-LAO_KHOA.png
cmn4132816e364b4603a2fed9|Sản phụ khoa                             |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/san_phu_khoa.png
cmn11e42573ffda4079b59e8b|Chấn thương chỉnh hình                   |https://cdn-pkh.longvan.net/medpro-production/default/avatar/subjects/chan_thuong_chinh_hinh.png
cmn258c9a1889e048699dcfda|Phục hồi chức năng                       |https://cdn-pkh.longvan.net/medpro-production/umc/subjects/1655708507374-PHUC_HOI_CHUC_NANG.png
cmna97aefc6f8804547a0d5cb|Hiếm muộn - Hỗ trợ sinh sản              |https://cdn-pkh.longvan.net/medpro-production/umc/subjects/KBTS/1651820887681-SAN_KHOA_CHAN_DOAN_TRUOC_SINH.png
"""

import sys

for line in mapping.strip().split('\n'):
    parts = line.split('|')
    if len(parts) == 3:
        i, n, url = parts
        i = i.strip()
        url = url.strip()
        sql = f"UPDATE specialties SET icon_url='{url}' WHERE id='{i}';"
        subprocess.run(["docker", "exec", "medicalink-db", "psql", "-U", "postgres", "-d", "medicalink_provider", "-c", sql])

# Update Tiêu hóa keywords and symptoms
sql2 = "UPDATE specialties SET keywords = keywords || ARRAY['dạ dày', 'trào ngược', 'ợ chua', 'GERD', 'thực quản', 'đau dạ dày', 'trào ngược dạ dày'], common_symptoms = common_symptoms || ARRAY['ợ chua', 'đau dạ dày', 'đau tức ngực do trào ngược', 'ợ hơi', 'ợ nóng', 'rát nóng thượng vị'], common_conditions = common_conditions || ARRAY['trào ngược dạ dày thực quản', 'viêm loét dạ dày', 'viêm dạ dày'] WHERE id='cmna8cf9e42b9c14beca968d2';"
subprocess.run(["docker", "exec", "medicalink-db", "psql", "-U", "postgres", "-d", "medicalink_provider", "-c", sql2])

print("Done updating DB!")
