# خطیار — کارهای باقی‌مانده و در دست اقدام

> آخرین بررسی: 2026-08-27 — نسخه 1.3.75

## 1. Android / Mobile
- 🟢 بی‌سیم PTT در Android اضافه و به Provider سراسری متصل شد.
- 🟢 روشن/خاموش کردن بی‌سیم و دریافت صوتی در تمام Screenهای برنامه.
- 🟢 کانال‌های مجاز از Backend دریافت می‌شوند.
- 🟢 PTT تک‌گوینده، chirp شروع/پایان، حداکثر زمان صحبت و قفل هنگام صحبت.
- 🟢 نمایش گوینده فعلی و سمت/هویت او در وضعیت کانال.
- 🟢 version = 1.3.75 و versionCode = 10375.
- 🟡 تست واقعی میکروفون و پخش صدا روی Android 9/10 و نسخه‌های جدید.
- 🟡 تست دو دستگاه همزمان و رقابت PTT.
- ⚪ Build نهایی APK/AAB و نصب روی دستگاه واقعی.
- ⚪ تأیید انتشار Myket.

## 2. Web App
- 🟢 Web App مکالمه بی‌سیم ندارد؛ طبق معماری نهایی، بی‌سیم فقط Android است.
- 🟡 تست سایر امکانات Web App و حذف Mock/Placeholderهای باقی‌مانده.
- 🟡 تست Offline/Online و خطاهای API.

## 3. Admin / Site
- 🟢 صفحه «مدیریت کانال‌های بی‌سیم» ایجاد شد.
- 🟢 ایجاد، ویرایش، حذف و فعال/غیرفعال‌سازی کانال.
- 🟢 انتخاب منطقه، اعضای انتخابی و سمت‌ها.
- 🟢 ترکیب شروط با AND/OR.
- 🟢 حداکثر زمان صحبت و اولویت کانال.
- 🟢 مشاهده اعضای فعلی، آنلاین‌ها، گوینده فعلی و Log ارتباطات.
- 🟢 دسترسی Admin در Backend enforce شده است.
- 🟢 نسخه Site/Admin = 1.3.75.
- 🟡 تست نقش‌های مختلف و تأیید داده منطقه در Production.

## 4. Backend / Database — بی‌سیم
- 🟢 API v2 با authorization سمت سرور برای channels/state/settings/presence/take/send/poll/audio.
- 🟢 عضویت منطقه‌ای، کاربری، سمت‌محور و ترکیبی.
- 🟢 قفل اتمیک گوینده با transaction و FOR UPDATE.
- 🟢 محدودیت زمان صحبت در Backend.
- 🟢 محافظت فایل صوتی در برابر دسترسی کاربر خارج از کانال.
- 🟢 جدول Presence و Log.
- 🟢 Migrationهای radio و radio_v2 اضافه شدند و v2 برای MySQL/MariaDB idempotent است.
- 🟡 اجرای Migration روی DB واقعی Production.
- 🟡 تست CORS/Security Headers و HTTP 500های Production.
- 🟡 تست مصرف فضا و پاک‌سازی دوره‌ای فایل‌های صوتی قدیمی.

## 5. تست End-to-End بی‌سیم
- 🟡 ایجاد کانال «منطقه ثامن» و اتصال به منطقه واقعی.
- 🟡 ایجاد کانال «اعضای انتخابی» با چند کاربر واقعی.
- 🟡 ایجاد کانال «سمت‌محور» با چند سمت واقعی.
- 🟡 تست «منطقه ثامن AND مسئول خط».
- 🟡 تست «منطقه ثامن OR افراد انتخاب‌شده».
- 🟡 تغییر منطقه/سمت کاربر و بررسی تغییر فوری عضویت.
- 🟡 تست اینکه کاربر با دستکاری channel_id یا URL نتواند وارد کانال غیرمجاز شود.
- 🟡 تست همزمانی دو کاربر در take و آزاد شدن خودکار lease.

## 6. سایر قابلیت‌های پروژه
- 🟡 تست Startup روی Android 9 و دستگاه‌های قدیمی.
- 🟡 تست Camera/Location و Background Location.
- 🟡 تست Login/Refresh Token/Device Binding/Logout.
- 🟡 تست Offline Queue و همگام‌سازی.
- 🟡 تست واقعی ثبت موقعیت/تصویر خطوط و MySQL/MariaDB.
- 🟡 تست گردش گزارشات، PDF و ارسال ربات‌ها در Production.

## 7. Versioning
- 🟢 Android = 1.3.75 / versionCode 10375.
- 🟢 Web/Admin badge = 1.3.75.
- 🟢 Cache-busting پنل به r1 برای نسخه جدید.

## 8. Production
- ⚪ تست `https://app.yousefipour.ir/` و `/app` پس از deploy.
- ⚪ تست Login واقعی با چند نقش.
- ⚪ تست HTTPS/Camera/Geolocation Permission.
- ⚪ Backup قبل از Migration Production.
- ⚪ تست واقعی ارسال فایل ربات‌ها.
- ⚪ تست واقعی بی‌سیم با حداقل دو Android.

## فرآیند اجباری ثبت تغییرات
هر قابلیت جدید یا اصلاح مرتبط باید در صورت ارتباط در Android، Web App، Site/Admin، Backend/API، Database/Migration و مستندات پروژه ثبت و فقط پس از تست واقعی به وضعیت 🟢 منتقل شود.
