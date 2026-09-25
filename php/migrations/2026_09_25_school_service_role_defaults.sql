-- دسترسی پیش‌فرض بازدید و بازرسی سرویس مدارس بر اساس سمت کاربر
-- این migration فقط مشاهده و ثبت بازدید در اپ را برای سمت‌های مشخص فعال می‌کند.
INSERT INTO school_service_permissions(role_id,can_view,can_create,can_edit,can_delete,can_import,can_report)
SELECT r.id,1,1,0,0,0,0
FROM roles r
WHERE TRIM(r.title) IN (
 'مدیر کل',
 'معاونت بازرسی',
 'رئیس اداره بازرسی',
 'رییس اداره بازرسی',
 'سربازرس ارشد',
 'نیروی اداری ارشد',
 'سربازرس',
 'بازرس',
 'گشت خودرویی',
 'گشت موتوری'
)
ON DUPLICATE KEY UPDATE can_view=1,can_create=1;
