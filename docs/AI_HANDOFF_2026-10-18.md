# تحویل وضعیت خطیار — ۲۰۲۶/۱۰/۱۸

این سند عکس وضعیت بررسی‌شده در این تاریخ است، نه قانون نسخه یا وضعیت زندهٔ مخزن. پیش از ادامه، Git و remote و اجراهای انتشار را دوباره بررسی کنید. قواعد پایدار در [راهنمای توسعه](AI_DEVELOPMENT_GUIDE.md) و [AGENTS.md](../AGENTS.md) قرار دارند.

## مبنای بررسی

- HEAD محلی و `origin/main` در آغاز این کار و نتیجهٔ `git ls-remote` برابر `06aae30a50ac38351309c4b81896ba3b6107915b` بودند؛ اختلاف جلو/عقب صفر بود.
- محیط محلی Windows/PowerShell، مسیر checkout برابر `F:\taxi-system` است.
- مقادیر مشاهده‌شدهٔ package موبایل: برنامه `1.5.11`، Expo `~57.0.29`، React `19.2.3` و React Native `0.86.3`. این‌ها ثبت تاریخی‌اند، نه دستور pin/upgrade.
- نسخهٔ نمایشی سایت در اصلاحات اخیر تغییر نکرد؛ cache-key پنل به `20261017.work-report-fixes` تغییر کرده بود.

## اصلاحات ثبت‌شده

### `be94e35216bdc25393ad114e85190e2d332a59f4`

پیام: `ci(android-release): fix frozen work reports and explicit shift calculations`

- خواندن snapshot در مسیر واقعی گزارش تردد، بازه جزئی/چندماهه و حفظ metadata تاریخی گزارش سازمان.
- حفاظت نهایی‌سازی در برابر ثبت هم‌زمان/تکراری و پاسخ دیررس وضعیت ماه؛ هشدار برای snapshot قدیمی فاقد جزئیات فرد.
- حذف fallback ضمنی شیفت از مسیرهای مرتبط و کنترل تاریخ تخصیص خودکار فرد غایب برای نیروی جایگزین.
- استقلال پنجره‌های ابتدا/انتهای اضافه‌کار، ادغام زمان همپوشان و اعمال پنجرهٔ تردد شناور در کنترل واقعی check-in.
- حفظ صفر و پیام بدون تخصیص در تایمر Android؛ اصلاح تست قدیمی cache-key سنوات.
- تست‌های رگرسیون و مستند `work-month-finalization.md` اضافه شدند.

### `06aae30a50ac38351309c4b81896ba3b6107915b`

پیام: `fix(work): prevent implicit overtime in unassigned recalculations`

- `ShiftCalc::dayWork(null,...)` در بستن خودکار و بازمحاسبه، حضور واقعی را نگه می‌دارد ولی موظفی و اقلام تخصیصی/مالی ساختگی تولید نمی‌کند.
- نقص پیش از اصلاح با تولید ۲۷ دقیقه اضافه‌کار برای شیفت خالی بازتولید و پس از اصلاح با تست رگرسیون بررسی شد.

## شواهد آزمون و انتشار

در کار قبلی syntax PHP، build رسمی و syntax پنل، تست‌های شیفت/نهایی‌سازی و UI، GPS، سنوات/import/XLSX، منطقه/چارت، حقوق، بی‌سیم، ورود وب و ذخیرهٔ عکس، همچنین تست‌های Android مربوط و Babel بررسی شدند. تست‌های DB عمدتاً mock بودند؛ آزمون روی DB تولیدی یا گوشی واقعی ادعا نشده است.

اجراهای کامیت `be94e3521` موفق بررسی شدند:

- [ساخت پنل 38999195276](https://github.com/ali-yousefipour/khatyar/actions/runs/38999195276)
- [یکپارچگی 38999195247](https://github.com/ali-yousefipour/khatyar/actions/runs/38999195247)
- [انتشار سایت 38999195242](https://github.com/ali-yousefipour/khatyar/actions/runs/38999195242)
- [ساخت و انتشار Android 38999195251](https://github.com/ali-yousefipour/khatyar/actions/runs/38999195251)

در همان بررسی، health و panel و bundle پاسخ ۲۰۰ داشتند و SHA256 bundle زنده با فایل همان commit برابر بود. endpointهای خصوصی بدون نشست پاسخ ۴۰۱ دادند؛ این اثبات عملکرد مجاز کسب‌وکار نیست.

در ۲۰۲۶/۱۰/۱۸، وضعیت انتشار کامیت تکمیلی `06aae30a5` با GitHub API دوباره بررسی شد و ابهام قبلیِ ناشی از محدودیت ابزار برطرف شد:

- [ساخت پنل 39000577220](https://github.com/ali-yousefipour/khatyar/actions/runs/39000577220): `completed/success`
- [یکپارچگی 39000577202](https://github.com/ali-yousefipour/khatyar/actions/runs/39000577202): `completed/success`
- [انتشار سایت 39000577219](https://github.com/ali-yousefipour/khatyar/actions/runs/39000577219): `completed/success`
- [Android 39000577285](https://github.com/ali-yousefipour/khatyar/actions/runs/39000577285): `completed/skipped`؛ APK تازه برای تغییر صرفاً تکمیلی بک‌اند ساخته نشد.

وضعیت موفق workflow دوم را با بررسی مستقیم HTTP یا عملکرد authenticated در این تاریخ یکی ندانید؛ این موارد در کار مستندات دوباره آزمایش نشده‌اند.

متادیتای GitHub برای APK حاصل از انتشار اول دریافت شده بود: `v1.5.11`، اندازهٔ `73481340` بایت و digest برابر `sha256:83d81c3e27ac999aea10a82917fceaf8f7bfa2ce0875fc7f04777687b5ae6ab7`. دانلود محلی، hash مستقل، امضا و نصب روی گوشی همان APK در پایان کار قبلی به علت محدودیت ابزار تأیید نشدند. پیش از نسبت‌دادن این مشخصات به release فعلی دوباره آن را بررسی کنید؛ asset هم‌نسخه می‌تواند جایگزین شود.

## تغییرات محلی محفوظ و کارهای باز

در آغاز این کار ۳۱ مسیر tracked دارای تغییر قبلی بودند؛ آن‌ها وارد کامیت اصلاحات بالا یا کار مستندات نمی‌شوند:

- `mobile/App.js` و اسکرین‌های ImageViewer، Checklist، CompanyRequests/DriverGate، FieldAlerts/Settings، Leaderboard، Login، Messages، Notice، Notifications، OfficialPresence، PersonnelVehicleChecklist، RoleDashboard، Search، Settings، Sms، StationCaptureV5 و TempDrivers.
- فایل‌های Java و منابع Android در مسیر تولیدی `mobile/android/` مربوط به بی‌سیم، notification و رنگ‌ها.
- `php/README.md`، `php/app/.htaccess`، `php/app/sw.js` و حذف محلی `php/آرشیو/README.md`.

فهرست بالا راهنماست؛ `git status` و diff واقعی مرجع‌اند. untrackedها نیز باید جداگانه بررسی شوند و ممکن است شامل hook/component محلی، SDK، node_modules، APK و دادهٔ خصوصی باشند. فایل‌های `web-app.js/css` محلی را صرفاً با مشاهدهٔ نام، فعال یا قابل جایگزینی فرض نکنید.

بررسی کامل همهٔ اسکرین‌های Android، برابری کامل وب‌اپ با Android و رفع تمام گزارش‌های تاریخی دوربین/ورود از این کامیت‌ها اثبات نمی‌شود. ابتدا مصرف‌کننده و وضعیت تغییرات محلی را ردیابی و موارد لازم را بازتولید کنید. این بخش فهرست دستور برای انجام خودکار همهٔ کارهای گذشته نیست؛ دامنهٔ کار جدید را از درخواست مالک بگیرید.

اولویت برای ادامهٔ مرتبط: دریافت درخواست مشخص؛ حفظ تغییرات؛ ردیابی مسیر فعال؛ بررسی DB و نشست آزمایشی مجاز؛ اجرای سناریوهای چندروزه/شبانه/هم‌زمان؛ و تست واقعی گوشی، صوت و چاپ در صورت ارتباط با درخواست. هیچ عملیات برگشت‌ناپذیر مالی یا نهایی‌سازی تولیدی صرفاً برای اثبات عملکرد اجرا نشود.
