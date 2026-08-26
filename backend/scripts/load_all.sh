#!/usr/bin/env bash
# بارگذاری کامل دادهٔ اکسل به دیتابیس + پیوند رکوردها
# استفاده:  DATABASE_URL=postgres://... ./scripts/load_all.sh /path/to/excel-folder
set -e
DIR="${1:?مسیر پوشهٔ فایل‌های اکسل را بدهید}"

find_file(){ ls "$DIR" | grep -F "$1" | head -1; }

echo "→ خطوط"
python3 scripts/import_excel.py lines    "$DIR/$(find_file 'اطلاعات_خط')"
echo "→ رانندگان"
python3 scripts/import_excel.py drivers  "$DIR/$(find_file 'جامع_کاربران')"
echo "→ پروانهٔ بهره‌برداری (+خودروها)"
python3 scripts/import_excel.py oplic    "$DIR/$(find_file 'بهره_برداری')"
echo "→ پروانهٔ تاکسیرانی"
python3 scripts/import_excel.py taxilic  "$DIR/$(find_file 'پروانه_های_تاکسیرانی')"
echo "→ فیش‌های آبونمان (ممکن است طول بکشد)"
python3 scripts/import_excel.py bills    "$DIR/$(find_file 'پرداخت_فیش')"

echo "→ پیوند رکوردها"
psql "${DATABASE_URL}" -f scripts/link_data.sql

echo "✓ بارگذاری کامل شد."
