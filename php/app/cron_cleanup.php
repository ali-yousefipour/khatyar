<?php
// اجرای خودکار کار «cleanup» — فقط پاکسازی تصاویر قدیمی طبق تنظیمات نگهداری (پیشنهاد: روزی یک‌بار، شب)
// این فایل را در بخش Cron Jobs هاست (cPanel) تنظیم کنید.
// نمونه دستور Cron (مسیر دقیق را از File Manager بردارید):
//   /usr/local/bin/php /home/h301194/public_html/cron_cleanup.php
// در حالت اجرای CLI (Cron) نیازی به کلید نیست.
// اگر از مرورگر صدا بزنید، باید ?key=مقدار_cron_key اضافه کنید.
$GLOBALS['CRON_TASK'] = 'cleanup';
require __DIR__ . '/cron.php';
