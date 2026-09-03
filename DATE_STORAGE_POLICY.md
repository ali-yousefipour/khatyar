# سیاست و قرارداد تاریخ در خطیار

> مرجع قطعی توسعه‌دهندگان برای Backend، Admin Panel، Web App و Database است. قبل از ایجاد یا تغییر هر قابلیت تاریخی، این قرارداد باید رعایت شود.

## معماری

**Gregorian in DB + Jalali in UI**

تاریخ‌های زمانی و قابل مرتب‌سازی در Database با فرمت میلادی استاندارد نگهداری می‌شوند و کاربر در رابط کاربری تاریخ را به شمسی می‌بیند و انتخاب می‌کند.

- `DATE` → `YYYY-MM-DD`
- `DATETIME` / `TIMESTAMP` → `YYYY-MM-DD HH:MM:SS`
- Timezone سمت Backend → `Asia/Tehran`

نمونه:

```text
نمایش کاربر: ۱۴۰۵/۰۶/۱۲
DATE:       2026-09-03
DATETIME:   2026-09-03 15:45:32
```

## DatePicker پنل

در پنل فقط یک پیاده‌سازی React برای `JDate` در `php/tools/panel_source.jsx` وجود دارد و از طریق `panel.bundle.js` اجرا می‌شود. برای تقویم نباید Runtime Patch، monkey-patch برای `ReactDOM.createRoot`، MutationObserver یا دستکاری DOM تحت مدیریت React اضافه شود.

DatePicker مستقل `php/app/assets/persian-date-picker-safe.js` فقط برای ورودی‌های مستقل خارج از React قابل استفاده است و نباید روی عناصر داخل `#root` اعمال شود.

### قرارداد `JDate`

- `jalali=true` → خروجی `YYYY/MM/DD` شمسی برای منطق‌های دامنه‌ای.
- حالت عادی → خروجی `YYYY-MM-DD` میلادی.
- `yearFrom` و `yearTo` محدوده انتخاب سال را کنترل می‌کنند.
- ترتیب هفته: شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنجشنبه، جمعه.
- جایگاه روز اول ماه از تاریخ واقعی Gregorian محاسبه می‌شود.
- طول ماه نباید با چرخه ۳۳ ساله تقریبی تعیین شود.

## داده‌های شمسی استثنایی

فیلدهای صریح `jdate` برای کلید روز شمسی قابل نگهداری هستند، از جمله `holidays.jdate`، `attendance_ot_adjustments.jdate`، `attendance_recalculate_logs.from_jdate/to_jdate` و `user_shifts.from_jdate/to_jdate`.

`bills.pay_date` در داده فعلی سامانه به صورت شمسی مانند `1405/01/01` نگهداری می‌شود و بدون بررسی منطق قبض نباید تبدیل شود.

## حضور

`staff_attendance.check_in/check_out` Gregorian `DATETIME` هستند و فقط در نمایش/گزارش به شمسی تبدیل می‌شوند.

## ممنوع

- ذخیره تاریخ شمسی در `DATE` / `DATETIME` / `TIMESTAMP`.
- مقایسه رشته شمسی با ستون زمانی Gregorian بدون تبدیل.
- ایجاد DatePicker دوم برای ورودی‌های React.
- patch کردن `ReactDOM.createRoot` یا MutationObserver برای تقویم.
- الگوریتم تقریبی مستقل برای تبدیل جلالی/میلادی.

## تست مرجع

```text
۱۴۰۵/۰۶/۱۲ = 2026-09-03 = پنجشنبه
```
