# وضعیت پروژه — نسخه 1.0.17

## وضعیت
نسخه `1.0.17` برای حذف Babel مرورگر از پنل سایت آماده شد.

## نسخه‌ها
- نسخه اپ: `1.0.17`
- نسخه سایت: `105`
- نسخه اندروید: `10017`

## تکمیل‌شده
- پنل اصلی سایت از حالت JSX/Babel مرورگر خارج شد.
- فایل `bundle.js` تولید شد.
- CSS پنل از HTML جدا شد.
- دانلود و استفاده از Babel Runtime از فایل‌های اجرایی حذف شد.
- Health Dashboard اکنون وجود Bundle پنل و نبود Babel Runtime را کنترل می‌کند.

## فایل‌های کلیدی
- `php/public/panel.html`
- `php/public/assets/panel.bundle.js`
- `php/public/assets/panel.bundle.css`
- `php/tools/panel_source.jsx`
- `php/tools/build_panel_bundle.sh`
- `php/lib/routes.php`
- `php/public/upgrade.php`

## باقی‌مانده عملیاتی
- تست پنل روی دامنه نهایی سازمان.
- اطمینان از دانلود/موجود بودن کتابخانه‌های Vendor مانند React، Leaflet، Chart.js و XLSX روی هاست.
- تست مرورگرهای Chrome، Edge و مرورگر داخلی گوشی.
