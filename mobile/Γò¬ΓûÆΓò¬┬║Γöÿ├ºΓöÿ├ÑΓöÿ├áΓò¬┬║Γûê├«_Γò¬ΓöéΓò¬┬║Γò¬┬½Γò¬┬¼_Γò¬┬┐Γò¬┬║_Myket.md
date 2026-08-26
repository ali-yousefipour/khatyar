# ساخت APK روی ویندوز با آینهٔ Myket (مخصوص ایران)

پروژه طوری تنظیم شد که هنگام ساخت، وابستگی‌ها و خودِ Gradle از آینهٔ داخلی **Myket** دانلود شوند.
این تنظیم به‌صورت یک «پلاگین Expo» (`plugins/withMyketMirror.js`) اعمال می‌شود و بعد از هر
`expo prebuild` به‌طور خودکار داخل فایل‌های Gradle تزریق می‌گردد. پس نیازی به ویرایش دستی نیست.

چه چیزی تزریق می‌شود:
- مخزن `https://maven.myket.ir` به build.gradle و settings.gradle
- آدرس دانلود Gradle در gradle-wrapper.properties به نسخهٔ Myket (gradle 8.13)

---

## ترتیب درست کارها (در PowerShell یا CMD ویندوز — نه WSL)

> اگر قبلاً build ناموفق داشته‌اید، حتماً اول «پاک‌سازی» زیر را انجام دهید،
> چون دانلود ناقص Gradle، کش را خراب می‌کند (خطای `Could not read workspace metadata`).

```powershell
cd C:\Users\Administrator\Desktop\taxi-system\mobile

REM 0) توقف Daemonها و پاک‌سازی کش خراب Gradle
android\gradlew --stop
rmdir /s /q "%USERPROFILE%\.gradle\caches"
rmdir /s /q android

REM 1) نصب وابستگی‌ها در خودِ ویندوز (مهم! نه در WSL)
npm install

REM 2) ساخت دوبارهٔ پوشهٔ android با اعمال خودکار آینهٔ Myket و Gradle 8.8
npx expo prebuild --platform android --clean

REM 3) ساخت APK
cd android
gradlew assembleRelease
```

فایل خروجی:
```
mobile\android\app\build\outputs\apk\release\app-release.apk
```

> نکتهٔ مهم دربارهٔ نسخهٔ Gradle: این پروژه React Native 0.74.5 است که **فقط با Gradle 8.8 سازگار**
> است. Gradle 8.13 تابع `serviceOf` را تغییر داده و باعث خطای
> `Unresolved reference: serviceOf` می‌شود. پلاگین به‌صورت خودکار نسخهٔ 8.8 را تنظیم می‌کند؛
> آن را به نسخهٔ بالاتر تغییر ندهید.

> برای APK دیباگ (تست سریع، بدون امضا):
> ```
> gradlew assembleDebug
> ```
> خروجی: `mobile\android\app\build\outputs\apk\debug\app-debug.apk`

---

## اگر Gradle Sync در Android Studio را ترجیح می‌دهید
1. اول در PowerShell: `npm install` و سپس `npx expo prebuild --platform android --clean`.
2. در Android Studio: **File → Open** و پوشهٔ **`mobile\android`** را باز کنید (نه کل پروژه).
3. صبر کنید تا Gradle Sync تمام شود.
4. **Build → Generate Signed Bundle / APK → APK** برای ساخت نسخهٔ امضاشده.

---

## بررسی اینکه آینهٔ Myket اعمال شده
بعد از `prebuild`، این فایل‌ها را باز کنید و وجود `maven.myket.ir` را ببینید:
- `mobile\android\build.gradle`
- `mobile\android\settings.gradle`
- `mobile\android\gradle\wrapper\gradle-wrapper.properties`  → باید distributionUrl به myket اشاره کند.

اگر به هر دلیلی تزریق خودکار کامل نبود، این مقادیر را دستی اضافه کنید:

**در `gradle-wrapper.properties`:**
```
distributionUrl=https\://maven.myket.ir/gradle/distributions/gradle-8.13-bin.zip
```

**در `build.gradle` (هر دو بلوک repositories):**
```gradle
maven { url 'https://maven.myket.ir' }
```

**در `settings.gradle` داخل `pluginManagement { repositories { ... } }`:**
```gradle
maven { url 'https://maven.myket.ir' }
```

---

## نکات مهم و صادقانه
- **node_modules را حتماً در ویندوز نصب کنید**، نه WSL. خطای قبلی شما
  (`autolinking.gradle does not exist`) دقیقاً به‌خاطر نبودِ node_modules در محیط ویندوز بود.
- **ترتیب مهم است:** اول `npm install`، بعد `prebuild`، بعد `gradlew`.
- اگر android قدیمی با تنظیمات دستی دارید، حتماً با `--clean` دوباره بسازید تا پلاگین Myket اعمال شود.
- **سازگاری نسخه‌ها:** این پروژه Expo SDK 51 و AGP حدود 8.2 است که با Gradle 8.13 سازگار است.
  اگر Myket نسخهٔ دیگری از Gradle داشت، فقط شمارهٔ نسخه را در `plugins/withMyketMirror.js`
  (متغیر `GRADLE_DIST`) و در gradle-wrapper.properties عوض کنید.
- **فونت فارسی:** فایل‌های `assets/fonts/Vazirmatn-Regular.ttf` و `-Bold.ttf` باید باشند.
- قابلیت‌های اسکن دوربین، موقعیت پس‌زمینه و Push فقط در همین APK واقعی کار می‌کنند (نه Expo Go).
