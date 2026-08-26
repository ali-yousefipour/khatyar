<?php
/**
 * اسکریپت Cron برای ارسال Push هشدارهای انقضا.
 * چون هاست فقط اجرای فایل PHP را در Cron مجاز می‌داند، این فایل را مستقیم اجرا کنید.
 *
 * نمونهٔ تنظیم در cPanel → Cron Jobs (روزی یک‌بار، مثلاً ۸ صبح):
 *   php /home/h301194/public_html/cron_push_expiry.php
 *   (مسیر دقیق فایل را از File Manager بردارید؛ این فایل کنار index.php در public قرار دارد)
 *
 * یا اگر مسیر php مشخص است:
 *   /usr/local/bin/php /home/h301194/.../public/cron_push_expiry.php
 *
 * در حالت اجرای CLI (Cron) نیازی به کلید نیست.
 * اگر از مرورگر صدا بزنید، باید ?key=مقدار_cron_key اضافه کنید.
 *
 * توجه امنیتی: این فایل پیش‌تر پیاده‌سازی مستقل و بدون هیچ احراز هویتی داشت
 * (برخلاف cron_daily.php/cron_birthday.php/... که همه از cron.php با چک
 * cron_key عبور می‌کنند)، یعنی هرکسی می‌توانست بدون کلید آن را از مرورگر صدا
 * بزند و برای همهٔ کاربران Push ارسال کند. اکنون مثل بقیهٔ اسکریپت‌های cron،
 * صرفاً یک delegator محافظت‌شده به cron.php است.
 */
$GLOBALS['CRON_TASK'] = 'push-expiry';
require __DIR__ . '/cron.php';
