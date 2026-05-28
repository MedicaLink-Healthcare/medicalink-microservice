const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../data/specialties_cleaned.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const icons = {
  'tim-mach':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-timmach.png',
  'san-phu-khoa':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-san.png',
  'nhi-khoa':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-nhi.png',
  'noi-tong-quat':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-noitonghop.png',
  'chan-doan-hinh-anh-dien-quang-can-thiep':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-chandoanhinhanh.png',
  'tiet-nieu':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-tietnieu.png',
  'ung-buou':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-ungbuou.png',
  'ho-hap':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-hohap.png',
  'noi-tiet':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-noitiet.png',
  'tieu-hoa-gan-mat':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-tieuhoa.png',
  'co-xuong-khop':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-coxuongkhop.png',
  'nam-khoa':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-namhoc.png',
  'than-kinh':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-noithankinh.png',
  'tam-than':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-tamly.png',
  'tai-mui-hong':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-taimuihong.png',
  'da-lieu':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-dalieu.png',
  'phuc-hoi-chuc-nang':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-phuchoichucnang.png',
  'bac-si-gia-dinh':
    'https://tamanhhospital.vn/wp-content/uploads/2020/12/khoa-khamsuckhoetongquat.png',
};

data.specialties.forEach((sp) => {
  sp.icon_url =
    icons[sp.slug] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(sp.name)}&background=random&color=fff&rounded=true&size=200`;
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Successfully patched specialty icons in specialties_cleaned.json');
