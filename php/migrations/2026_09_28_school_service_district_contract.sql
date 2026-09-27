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

UPDATE school_service_districts SET title='۱' WHERE title IN ('1','۱','ناحیه 1','ناحیه ۱','منطقه 1','منطقه ۱');
UPDATE school_service_districts SET title='۲' WHERE title IN ('2','۲','ناحیه 2','ناحیه ۲','منطقه 2','منطقه ۲');
UPDATE school_service_districts SET title='۳' WHERE title IN ('3','۳','ناحیه 3','ناحیه ۳','منطقه 3','منطقه ۳');
UPDATE school_service_districts SET title='۴' WHERE title IN ('4','۴','ناحیه 4','ناحیه ۴','منطقه 4','منطقه ۴');
UPDATE school_service_districts SET title='۵' WHERE title IN ('5','۵','ناحیه 5','ناحیه ۵','منطقه 5','منطقه ۵');
UPDATE school_service_districts SET title='۶' WHERE title IN ('6','۶','ناحیه 6','ناحیه ۶','منطقه 6','منطقه ۶');
UPDATE school_service_districts SET title='۷' WHERE title IN ('7','۷','ناحیه 7','ناحیه ۷','منطقه 7','منطقه ۷');
INSERT IGNORE INTO school_service_districts(title,sort_order,is_active) VALUES ('۱',1,1),('۲',2,1),('۳',3,1),('۴',4,1),('۵',5,1),('۶',6,1),('۷',7,1),('تبادکان',8,1);
