-- پاک‌سازی پینگ‌های موقعیت قدیمی (روزانه با Cron اجرا کنید)
DELETE FROM location_pings WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- نمونهٔ پاک‌سازی پیوست‌ها (مقدار 30 را با روزهای دلخواه جایگزین کنید؛ یا از دکمهٔ «پاک‌سازی پیوست‌ها» در تنظیمات استفاده کنید)
-- UPDATE messages SET attachment_data=NULL WHERE attachment_data IS NOT NULL AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
-- UPDATE reports  SET attachment_data=NULL WHERE attachment_data IS NOT NULL AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
