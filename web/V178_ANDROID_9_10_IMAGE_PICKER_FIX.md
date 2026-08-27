# اصلاح کرش شروع برنامه در Android 9 و 10

## علت اصلاح‌شده
در نسخه قبلی، فایل `mobile/src/imagePickerGuard.js` هنگام بارگذاری `App.js` توابع
`expo-image-picker` را به‌صورت مستقیم بازنویسی (monkey patch) می‌کرد. namespace حاصل از
`import * as ImagePicker` در برخی نسخه‌های Hermes/React Native می‌تواند فقط‌خواندنی باشد و
بازنویسی آن پیش از نصب ErrorBoundary باعث بسته‌شدن برنامه در شروع شود.

## تغییرات
- حذف اجرای `installImagePickerLockGuard()` از `mobile/App.js`.
- حذف بازنویسی مستقیم توابع `expo-image-picker`.
- تبدیل `imagePickerGuard.js` به no-op سازگار با ارجاع‌های قدیمی.
- بازنویسی `cameraLock.js` به‌عنوان wrapper امن با شمارنده فراخوانی، مدیریت خطا و آزادسازی کنترل‌شده قفل.
- انتقال همه فراخوانی‌های دوربین و گالری به wrapper مشترک در:
  - CompanyRequestsScreen
  - OfficialPresenceScreen
  - ChecklistScreen
  - NoticeScreen
  - ReportsScreen
  - RequestsScreen
- عدم تغییر نسخه Expo، React Native، Gradle، پلاگین‌ها، package.json و package-lock.json.

## بررسی‌ها
- هیچ فراخوانی مستقیم `ImagePicker.launchCameraAsync` یا `ImagePicker.launchImageLibraryAsync` در App/screens باقی نمانده است.
- فایل‌های wrapper با `node --check` بررسی شدند.
- ساختار ZIP پس از بسته‌بندی بررسی شد.

## تست پیشنهادی روی دستگاه
پس از ساخت APK، روی Android 9 و 10 موارد زیر بررسی شود:
1. اجرای سرد برنامه پس از Force Stop.
2. ورود به صفحه تذکر و باز کردن دوربین و گالری.
3. پیوست تصویر گزارش.
4. ثبت چک‌لیست با تصویر.
5. درخواست شرکت و بارگذاری رسید.
6. بازگشت از دوربین بدون قفل ناخواسته برنامه.
