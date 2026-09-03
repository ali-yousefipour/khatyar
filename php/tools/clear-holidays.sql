-- خطیار: جدول holidays فقط برای تعطیلات دستی سازمان است.
-- قبل از اجرای این دستور از دیتابیس نسخه پشتیبان بگیرید.
START TRANSACTION;
DELETE FROM `holidays`;
COMMIT;

-- بررسی نتیجه:
SELECT COUNT(*) AS remaining_manual_holidays FROM `holidays`;
