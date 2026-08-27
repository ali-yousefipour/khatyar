# ساخت و انتشار در مایکت

## ساخت در ویندوز
1. Java 17، Node.js 20 LTS و Android SDK 34 را نصب کنید.
2. فایل `signing` را در مسیر `release/myket/signing` نگه دارید و کلید را در `mobile/credentials` قرار دهید.
3. PowerShell را در پوشه `mobile` باز کنید.
4. اجرا کنید:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-myket-release.ps1
```

خروجی در این مسیر ساخته می‌شود (نام فایل خودکار از نسخهٔ واقعی در `.env` ساخته می‌شود):

```text
release/myket/taxi-lines-management-<ANDROID_VERSION_NAME>-myket.apk
# مثال برای نسخهٔ فعلی:
release/myket/taxi-lines-management-1.2.1-myket.apk
```

## کنترل امضا

```powershell
$env:ANDROID_HOME\build-tools\34.0.0\apksigner.bat verify --verbose ..\release\myket\taxi-lines-management-1.2.1-myket.apk
```

## انتشار
در پنل توسعه‌دهندگان مایکت برنامه جدید ایجاد کنید، APK امضاشده را بارگذاری و متن فایل `MYKET_STORE_LISTING_FA.md` را درج کنید. تصاویر واقعی باید از همین APK و روی تلفن واقعی تهیه شوند.

## نکته مهم کلید امضا
برای همه نسخه‌های بعدی باید از همین Keystore استفاده شود. گم‌شدن آن می‌تواند انتشار به‌روزرسانی با همین نام بسته را غیرممکن کند.
