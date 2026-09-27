-- 2026-09-28: قرارداد واحد ناحیه در سرویس مدارس
-- قرارداد canonical: ۱..۷ و تبادکان. ورودی‌های «ناحیه 7»، «ناحیه ۷»، «7»، «۷»
-- و ارقام عربی به مقدار canonical تبدیل می‌شوند. مقادیر ناشناخته حذف نمی‌شوند.

SET NAMES utf8mb4;

UPDATE school_service_schools
SET educational_district = CASE
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='1' THEN '۱'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='2' THEN '۲'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='3' THEN '۳'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='4' THEN '۴'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='5' THEN '۵'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='6' THEN '۶'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='7' THEN '۷'
WHEN TRIM(educational_district)='تبادکان' THEN 'تبادکان'
ELSE educational_district END
WHERE educational_district IS NOT NULL AND TRIM(educational_district)<>'';

UPDATE school_service_inspections
SET educational_district = CASE
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='1' THEN '۱'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='2' THEN '۲'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='3' THEN '۳'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='4' THEN '۴'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='5' THEN '۵'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='6' THEN '۶'
WHEN TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(educational_district,'ناحیه',''),'منطقه',''),' ',''),'۰','0'),'۱','1'),'۲','2'),'۳','3'),'۴','4'),'۵','5'),'۶','6'),'۷','7'),'۸','8'),'۹','9'),'٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'))='7' THEN '۷'
WHEN TRIM(educational_district)='تبادکان' THEN 'تبادکان'
ELSE educational_district END
WHERE educational_district IS NOT NULL AND TRIM(educational_district)<>'';

DELETE FROM school_service_districts WHERE title IN (
 '1','2','3','4','5','6','7','١','٢','٣','٤','٥','٦','٧',
 'ناحیه 1','ناحیه 2','ناحیه 3','ناحیه 4','ناحیه 5','ناحیه 6','ناحیه 7',
 'ناحیه ۱','ناحیه ۲','ناحیه ۳','ناحیه ۴','ناحیه ۵','ناحیه ۶','ناحیه ۷',
 'منطقه 1','منطقه 2','منطقه 3','منطقه 4','منطقه 5','منطقه 6','منطقه 7',
 'منطقه ۱','منطقه ۲','منطقه ۳','منطقه ۴','منطقه ۵','منطقه ۶','منطقه ۷'
);
INSERT IGNORE INTO school_service_districts(title,sort_order,is_active) VALUES ('۱',1,1),('۲',2,1),('۳',3,1),('۴',4,1),('۵',5,1),('۶',6,1),('۷',7,1),('تبادکان',8,1);
