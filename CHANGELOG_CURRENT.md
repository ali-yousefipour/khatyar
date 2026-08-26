# تغییرات جاری — 2026-08-26

## نسخه 1.3.69 — تکمیل خروجی خطوط و گردش گزارشات
- خروجی واقعی Excel خطوط تاکسیرانی به رابط پنل متصل شد؛ اطلاعات خط، مبدأ/مقصد، وضعیت، ایستگاه، مختصات، دقت، تاریخ، ثبت‌کننده، لینک نقشه و تصاویر در خروجی لحاظ می‌شوند.
- خروجی Excel همچنان بدون PhpSpreadsheet و با ZipArchive تولید می‌شود.
- مرتب‌سازی گردش گزارشات در Android به‌صورت پیش‌فرض جدیدترین و با امکان انتخاب قدیمی‌ترین/جدیدترین اضافه شد.
- API گزارشات امکان Sort صریح `asc/desc` دارد.
- endpoint `/reports/print-data` برای دریافت داده و قالب PDF تنظیم‌شده توسط مدیر اضافه شد.
- خروجی PDF گردش گزارشات در Android با `expo-print` و `expo-sharing` اضافه شد.
- runtime خروجی PDF گردش گزارشات برای Web App اضافه و در workflow تزریق خودکار شد؛ fallback چاپ مرورگر نیز وجود دارد.
- endpoint `report-bot-notify.php` برای ارسال نام فرستنده، موضوع، متن و حداکثر پنج پیوست به ربات‌های فعال Bale/Telegram/Eitaa اضافه شد.
- نسخه Android و badge وب/Admin به `1.3.69` افزایش یافت؛ نسخه‌های Expo/React Native/Gradle/NDK تغییر داده نشدند.
- Migrationها و مسیر ثبت موقعیت خطوط بدون تغییر در الزام MySQL/MariaDB و idempotent باقی ماندند.

## وضعیت تست کدنویسی
- ساختار Android/Web/Admin و APIهای جدید بررسی شد.
- وجود `expo-print` و `expo-sharing` در `mobile/package.json` تأیید شد.
- JSON ساختاری `mobile/package.json` اصلاح و duplicate dependency حذف شد.
- تست واقعی Build Android، Migration روی DB واقعی، مرورگر Production، دستگاه Android و ارسال واقعی فایل به ربات‌ها هنوز انجام نشده و به محیط واقعی وابسته است.
- اتصال خودکار endpoint ربات گزارش به مسیر ارسال Web/Android هنوز نیازمند تست End-to-End است و تا آن زمان انجام‌شدهٔ قطعی اعلام نمی‌شود.

## اسناد مرجع
- `PROJECT_DOCUMENTATION.md`
- `PROJECT_REMAINING_WORK.md`
- `CHANGELOG.md` (سوابق تاریخی)
