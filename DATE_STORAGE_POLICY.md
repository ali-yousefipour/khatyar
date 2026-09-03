# سیاست و قرارداد تاریخ در خطیار

> این فایل مرجع قطعی توسعه‌دهندگان برای همه تاریخ‌ها در Backend، Admin Panel، Web App و Database است. قبل از ایجاد یا تغییر هر قابلیت تاریخی، این قرارداد باید رعایت شود.

## 1. اصل معماری

معماری استاندارد پروژه:

**Gregorian in DB + Jalali in UI**

یعنی کاربر تاریخ را شمسی می‌بیند و انتخاب می‌کند، اما تاریخ‌های زمانی و قابل مرتب‌سازی در Database به صورت میلادی استاندارد ذخیره و در APIهای مربوط به زمان پردازش می‌شوند.

### فرمت‌های استاندارد

- `DATE` → `YYYY-MM-DD`
- `DATETIME` → `YYYY-MM-DD HH:MM:SS`
- `TIMESTAMP` → `YYYY-MM-DD HH:MM:SS`
- Timezone سمت PHP/Backend → `Asia/Tehran`

نمونه:

```text
نمایش کاربر: ۱۴۰۵/۰۶/۱۲
ذخیره در DATE: 2026-09-03
ذخیره در DATETIME: 2026-09-03 15:45:32
```

## 2. قاعده DatePicker

تنها منبع عمومی DatePicker در پنل:

```text
php/app/assets/persian-date-picker.js
```

نسخه فعلی مورد استفاده پنل:

```text
persian-date-picker.js?v=4.0.0
```

این فایل مسئول نمایش تقویم جلالی، انتخاب روز و تبدیل Jalali ↔ Gregorian است.

### ترتیب قطعی هفته

همیشه و بدون استثناء:

```text
شنبه | یکشنبه | دوشنبه | سه‌شنبه | چهارشنبه | پنجشنبه | جمعه
```

روز هفته باید از **تاریخ واقعی** محاسبه شود و هرگز با شماره‌گذاری فرضی یا ترتیب میلادی داخل UI تعیین نشود.

مثال تست مرجع:

```text
۱۴۰۵/۰۶/۱۲ = 2026-09-03 = پنجشنبه
```

بنابراین ۱۲ شهریور ۱۴۰۵ باید در ستون «پنجشنبه» قرار گیرد.

## 3. DatePickerهای ممنوع

ایجاد هر DatePicker مستقل، محلی یا موازی ممنوع است؛ از جمله:

- پیاده‌سازی جداگانه داخل React Component
- استفاده از الگوریتم مستقل جلالی/میلادی برای یک فرم خاص
- ساخت تقویم با `MutationObserver` برای اصلاح DOM تقویم اصلی
- اضافه کردن کتابخانه تقویم دیگری برای همان فیلدها بدون دلیل معماری و ثبت مستندات

هر فرم جدید باید از API/DatePicker سراسری استفاده کند.

## 4. JDate در پنل

در Source پنل:

```text
php/tools/panel_source.jsx
```

کامپوننت `JDate` صرفاً یک سازگارساز/UI wrapper برای اتصال فرم‌های قدیمی به DatePicker سراسری است و نباید دوباره منطق تقویم مستقل داخل آن ایجاد شود.

سازگارساز فعلی:

```text
php/app/assets/persian-date-picker-unifier.js
```

بنابراین توسعه‌دهنده نباید منطق انتخاب ماه، محاسبه روز هفته یا طول ماه را دوباره داخل `JDate` یا Component جدید کپی کند.

## 5. persian-date-fix.js

فایل:

```text
php/app/assets/persian-date-fix.js
```

فقط برای Compatibility مسیر قدیمی باقی مانده و نباید هیچ تقویم یا DOM مربوط به DatePicker را دستکاری کند.

وجود `MutationObserver`، `setInterval` یا اصلاح مستقیم سلول‌های تقویم در این فایل ممنوع است.

## 6. Cache Busting و ترتیب بارگذاری

`panel.html` باید DatePicker سراسری را قبل از Bundle پنل بارگذاری کند.

ترتیب مورد انتظار:

```html
<script defer src="assets/persian-date-picker.js?v=4.0.0"></script>
<script defer src="assets/persian-date-picker-unifier.js?v=1.0.0"></script>
<script defer src="assets/panel.bundle.js?..."></script>
```

هر تغییر در DatePicker یا Bundle باید با تغییر query-string نسخه Asset همراه باشد تا Browser/CDN نسخه قدیمی را اجرا نکند.

## 7. تاریخ‌های سیستمی در Database

تاریخ/زمان‌های زیر باید میلادی بمانند:

- `staff_attendance.check_in`
- `staff_attendance.check_out`
- `attendances.exit_at`
- `created_at`
- `updated_at`
- سایر ستون‌های `DATE`, `DATETIME`, `TIMESTAMP` که معنای timestamp یا تاریخ واقعی سیستم دارند.

نمونه واقعی:

```text
staff_attendance.check_in = 2026-09-03 15:45:32
```

این مقدار صحیح است و نباید به `1405-06-12` در Database تبدیل شود.

## 8. استثناهای کنترل‌شده: تاریخ شمسی دامنه‌ای

برخی فیلدها «زمان سیستم» نیستند؛ بلکه **شناسه یک روز در تقویم شمسی** هستند. این فیلدها می‌توانند عمداً شمسی ذخیره شوند.

نمونه‌های شناخته‌شده پروژه:

```text
holidays.jdate
attendance_ot_adjustments.jdate
attendance_recalculate_logs.from_jdate
attendance_recalculate_logs.to_jdate
user_shifts.from_jdate
user_shifts.to_jdate
```

این فیلدها معمولاً `VARCHAR` هستند و فرمت قراردادی آن‌ها:

```text
YYYY-MM-DD
```

مثال:

```text
1404-01-01
```

این فیلدها را نباید با `DATE/DATETIME/TIMESTAMP` میلادی مخلوط کرد.

## 9. استثنای مهم: bills.pay_date

فیلد:

```text
bills.pay_date
```

در دیتابیس فعلی از نوع `VARCHAR(20)` است و داده واقعی آن به‌صورت شمسی ثبت شده است، مانند:

```text
1405/01/01
1405/02/01
1404/12/01
```

بنابراین تا زمانی که Migration مشخص و هماهنگ برای تبدیل این فیلد نوشته و همه مصرف‌کنندگان آن بررسی نشده‌اند، **نباید فرمت `bills.pay_date` تغییر کند**.

در UI می‌توان برای انتخاب/نمایش از DatePicker شمسی استفاده کرد و مقدار مورد نیاز API را مطابق قرارداد فعلی همین Feature ارسال کرد.

## 10. تبدیل در لایه UI و API

برای تاریخ‌های Gregorian در Database، UI شمسی باید فقط نقش Presentation/Input داشته باشد:

```text
Jalali UI
   ↓
Jalali → Gregorian
   ↓
API
   ↓
DATE / DATETIME در DB
```

برای فیلدهای `jdate` یا تاریخ‌های دامنه‌ای که عمداً شمسی هستند:

```text
Jalali UI
   ↓
Jalali string
   ↓
API
   ↓
VARCHAR jdate
```

هیچ API نباید یک رشته تاریخ شمسی را مستقیماً با ستون `DATE/DATETIME/TIMESTAMP` میلادی مقایسه کند.

## 11. گزارش‌ها و محاسبات حضور

گزارش تردد باید تاریخ‌های `staff_attendance.check_in/check_out` را به صورت میلادی از Database بخواند.

برای گروه‌بندی، نمایش روز، تشخیص روز هفته و محاسبات تقویمی می‌توان آن‌ها را در لایه Backend به جلالی تبدیل کرد.

به طور مشخص:

```text
DB timestamp → Gregorian date → Jalali display/grouping
```

و نه:

```text
Jalali string → مقایسه مستقیم با DATETIME
```

## 12. ثبت تاریخ‌های جدید

هنگام اضافه کردن Feature جدید، قبل از ایجاد ستون تاریخ مشخص کنید که آن فیلد کدام یک است:

### A) تاریخ/زمان واقعی سیستم

از:

```text
DATE / DATETIME / TIMESTAMP
```

با مقدار Gregorian استفاده شود.

### B) شناسه روز شمسی کسب‌وکار

فقط در صورتی که Feature واقعاً به «روز تقویم شمسی» به عنوان داده دامنه‌ای نیاز دارد، از قرارداد `jdate` استفاده شود و نام فیلد ترجیحاً با `jdate` / `from_jdate` / `to_jdate` مشخص باشد.

ایجاد `VARCHAR` مبهم با نام‌هایی مانند `date` برای یک تاریخ دامنه‌ای جدید توصیه نمی‌شود.

## 13. ممنوعیت‌های قطعی

- ذخیره تاریخ شمسی در ستون‌های `DATE/DATETIME/TIMESTAMP`.
- تبدیل عمومی همه تاریخ‌های دیتابیس به شمسی.
- مقایسه رشته `1405-06-12` با `2026-09-03` بدون تبدیل.
- اضافه کردن DatePicker موازی.
- کپی کردن الگوریتم تبدیل جلالی/میلادی در چند فایل.
- اصلاح DOM تقویم با Observer یا Timer.
- تغییر `bills.pay_date` بدون بررسی تمام APIها، گزارش‌ها و داده‌های قبلی.

## 14. چک‌لیست توسعه‌دهنده

قبل از Commit هر Feature مربوط به تاریخ:

```text
[ ] آیا فیلد جدید Gregorian است یا Jalali Domain Date؟
[ ] اگر Gregorian است، DATE/DATETIME/TIMESTAMP استفاده شده؟
[ ] اگر Jalali Domain Date است، نام فیلد با jdate مشخص شده؟
[ ] فرم از DatePicker سراسری استفاده می‌کند؟
[ ] DatePicker دیگری به صفحه اضافه نشده؟
[ ] تبدیل تاریخ در یک نقطه مشخص انجام می‌شود؟
[ ] API تاریخ را با نوع ستون DB تطبیق می‌دهد؟
[ ] گزارش‌ها و مرتب‌سازی بر اساس نوع واقعی تاریخ انجام می‌شوند؟
[ ] Asset version بعد از تغییر JS به‌روز شده؟
[ ] تست ۱۴۰۵/۰۶/۱۲ = پنجشنبه انجام شده؟
```

## 15. منابع اجرایی فعلی

```text
DatePicker اصلی:
php/app/assets/persian-date-picker.js

Unifier پنل:
php/app/assets/persian-date-picker-unifier.js

Compatibility stub:
php/app/assets/persian-date-fix.js

پنل Host:
php/app/panel.html

Source اصلی پنل:
php/tools/panel_source.jsx

Bundle پنل:
php/app/assets/panel.bundle.js
```

این قرارداد باید هنگام هر تغییر در تقویم، فیلتر تاریخ، گزارش تاریخی، شیفت، حضور، قبض، تعطیلات یا هر Feature دارای تاریخ بررسی شود.