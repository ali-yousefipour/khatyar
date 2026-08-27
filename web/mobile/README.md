# اپلیکیشن موبایل — کنترل خطوط تاکسیرانی مشهد (Expo / React Native)

## راه‌اندازی
```bash
cd mobile
npm install
# فونت وزیرمتن را در assets/fonts بگذارید (راهنما در همان پوشه)
# آدرس سرور را در src/config.js تنظیم کنید
npx expo start            # اجرا روی Expo Go یا شبیه‌ساز
```

## ساخت فایل APK (روی سیستم شما، نه در این محیط)
```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview   # خروجی: فایل APK قابل نصب
```

## ساختار
- `App.js` — ناوبری، بارگذاری فونت، راست‌به‌چپ، کنترل ورود
- `src/auth.js` — ورود با اتصال تک‌دستگاهی + مرا به خاطر بسپار + ورود خودکار
- `src/device.js` — شناسهٔ دستگاه و سیگنال‌های امنیتی (VPN / GPS / Developer Options)
- `src/api.js` — کلاینت API + تمدید توکن + ارسال آفلاین
- `src/offline.js` — صف آفلاین و همگام‌سازی هنگام اتصال
- `src/location.js` — ارسال موقعیت (نقطهٔ اتصال ردیابی پس‌زمینه)
- `src/screens/*` — ورود، داشبورد، جستجو، راننده، بدهی، چک‌لیست، تذکر، گزارش، حضور، تذکرات قبلی، خودرو

## نقاط اتصال ماژول نیتیو (نیازمند build روی سیستم شما)
1. **تشخیص Developer Options** — `src/device.js` → کتابخانهٔ `react-native-device-info`.
2. **ردیابی موقعیت در پس‌زمینه** — `src/location.js` → `expo-task-manager` + `Location.startLocationUpdatesAsync`.

این سه مورد به سخت‌افزار دستگاه و build بومی نیاز دارند و در محیط چت قابل اجرا نیستند؛ نقاط اتصال آن‌ها در کد مشخص شده است.

## نسخهٔ فعلی — اعلان‌ها و داشبورد زنده

اسکن خودکار پلاک و کارت ملی به علت پایداری ناکافی حذف شده است. جستجوی دستی کد ملی و پلاک همچنان فعال است.

## نسخهٔ ۰.۳ — آیکون تاکسی، اسپلش، ردیابی پس‌زمینه، تنظیمات حرفه‌ای APK
- آیکون اپ و سایت: تاکسی زرد روی زمینهٔ سبز (در `mobile/assets/` و `backend/public/favicon.svg`).
- صفحهٔ اسپلش با همان آیکون و رنگ سازمان.
- ردیابی موقعیت در **پس‌زمینه** با `expo-task-manager` (فعال حتی با بسته‌بودن اپ، با اعلان سرویس فورگراند).
- تشخیص **Developer Options/VPN** واقعی با `react-native-device-info`.
- `eas.json` با پروفایل‌های development / preview (APK) / production (AAB) و افزایش خودکار نسخه.

### ساخت APK نهایی
```bash
cd mobile && cp .env.example .env   # API_BASE و سایر مقادیر را تنظیم کنید
npm install
npx expo install                    # هم‌ترازی نسخه‌های نیتیو
eas login && eas init               # یک‌بار: ساخت projectId
eas build -p android --profile preview     # خروجی APK
# نسخهٔ فروشگاهی (AAB):
eas build -p android --profile production
```


## ساخت مایکت با Expo SDK 57 و مخازن بدون تحریم

نیازمندی: Node.js 22.13 یا جدیدتر. سپس از PowerShell اجرا کنید:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-myket-release.ps1
```

اسکریپت ابتدا مخزن npm در دسترس را انتخاب می‌کند، Expo SDK 57 و نسخه‌های سازگار را نصب می‌کند، `expo-doctor` را اجرا می‌کند، سپس APK و AAB امضاشده می‌سازد.
