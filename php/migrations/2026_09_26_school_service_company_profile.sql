-- تکمیل پروفایل شرکت‌های سرویس مدارس - MySQL/MariaDB
-- برای نصب‌های قدیمی؛ در برابر اجرای مجدد مقاوم است.
SET @db := DATABASE();

SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='manager_mobile')=0,'ALTER TABLE school_service_companies ADD COLUMN manager_mobile VARCHAR(30) NULL','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='landline_phone')=0,'ALTER TABLE school_service_companies ADD COLUMN landline_phone VARCHAR(30) NULL','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='latitude')=0,'ALTER TABLE school_service_companies ADD COLUMN latitude DECIMAL(10,7) NULL','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='longitude')=0,'ALTER TABLE school_service_companies ADD COLUMN longitude DECIMAL(10,7) NULL','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='registered_school_count')=0,'ALTER TABLE school_service_companies ADD COLUMN registered_school_count INT NOT NULL DEFAULT 0','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='representative_count')=0,'ALTER TABLE school_service_companies ADD COLUMN representative_count INT NOT NULL DEFAULT 0','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='status')=0,'ALTER TABLE school_service_companies ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT ''فعال''','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
SET @sql := IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=@db AND table_name='school_service_companies' AND column_name='profile_complete')=0,'ALTER TABLE school_service_companies ADD COLUMN profile_complete TINYINT(1) NOT NULL DEFAULT 0','SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE school_service_companies
SET landline_phone=COALESCE(NULLIF(landline_phone,''),NULLIF(phone,'')),
    status=CASE WHEN is_active=1 THEN COALESCE(NULLIF(status,''),'فعال') ELSE 'غیرفعال' END
WHERE 1=1;
