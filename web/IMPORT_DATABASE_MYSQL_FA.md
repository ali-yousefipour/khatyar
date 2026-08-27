# راهنمای صحیح ارتقای دیتابیس v191 و v192 در MySQL/MariaDB

برای phpMyAdmin فقط فایل زیر را Import کنید:

`db/mysql/upgrade_v191_v192_all_mysql.sql`

این فایل:

- با MySQL و MariaDB سازگار است.
- از `JSONB`، `::jsonb`، `TIMESTAMPTZ`، `BIGSERIAL`، `DO $$` و `ON CONFLICT` استفاده نمی‌کند.
- برای جلوگیری از خطای ناسازگاری نوع کلیدهای جداول موجود، در مرحله ایجاد جدول‌ها Foreign Key اجباری ایجاد نمی‌کند.
- چندبار قابل اجرا است و اطلاعات الگوهای مأموریت را تکراری نمی‌کند.
- ابتدا جداول v191 و سپس جداول v192 را ایجاد می‌کند.

فایل‌های PostgreSQL قبلی برای نصب‌هایی که واقعاً PostgreSQL دارند در مسیر اصلی `db` حفظ شده‌اند. فایل‌های داخل `db/mysql` مخصوص phpMyAdmin هستند.

## ترتیب اجرا

1. از دیتابیس نسخه پشتیبان بگیرید.
2. در phpMyAdmin دیتابیس اصلی سامانه را انتخاب کنید.
3. به بخش Import بروید.
4. فایل `db/mysql/upgrade_v191_v192_all_mysql.sql` را انتخاب و اجرا کنید.
5. وجود جداول زیر را بررسی کنید:
   - `mission_metric_catalog`
   - `mission_templates`
   - `mission_template_targets`
   - `user_mission_overrides`
   - `user_mission_override_targets`
   - `inspector_modes`
   - `subordinate_daily_reviews`
   - `mission_visit_sessions`
   - `mission_daily_progress`
   - `mission_timeline_events`
   - `mission_execution_settings`

## نکته مهم سازگاری

بک‌اند فعلی این بسته در فایل `backend/src/db.js` از درایور PostgreSQL (`pg`) استفاده می‌کند. بنابراین فایل‌های MySQL مشکل Import در phpMyAdmin را حل می‌کنند، اما برای اجرای کامل بک‌اند روی MySQL لازم است لایه اتصال و Queryهای بک‌اند نیز به MySQL منتقل شوند. از این پس Migrationها فقط پس از تشخیص قطعی موتور دیتابیس نسخه عملیاتی تولید خواهند شد.
