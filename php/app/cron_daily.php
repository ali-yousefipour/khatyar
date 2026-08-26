<?php
// اجرای خودکار کار «daily» — کارهای روزانه: پیامک/پوش انقضا + تبریک تولد + پاکسازی تصاویر (پیشنهاد: روزی یک‌بار، ۸ صبح)
// این فایل را در بخش Cron Jobs هاست (cPanel) تنظیم کنید.
// نمونه دستور Cron (مسیر دقیق را از File Manager بردارید):
//   /usr/local/bin/php /home/h301194/public_html/cron_daily.php
// در حالت اجرای CLI (Cron) نیازی به کلید نیست.
// اگر از مرورگر صدا بزنید، باید ?key=مقدار_cron_key اضافه کنید.
$GLOBALS['CRON_TASK'] = 'daily';
require __DIR__ . '/cron.php';
