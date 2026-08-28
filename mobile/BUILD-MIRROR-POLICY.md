# خط‌یار — سیاست پایدار دانلود و Build در ایران

این فایل قرارداد Build پروژه است. در توسعه‌ها و اصلاحات بعدی، این سیاست نباید بدون دلیل فنی نقض یا دوباره طراحی شود.

## هدف

به‌دلیل محدودیت دسترسی به برخی سرویس‌ها و مخازن خارجی از داخل ایران، فرآیند Build باید تا حد ممکن از کش محلی و Mirrorهای داخلی استفاده کند و فقط در صورت نبودن/عدم دسترسی، به سرویس‌های عمومی fallback کند.

## ترتیب کلی

برای dependencyهای Maven/Gradle:

1. کش/مخزن محلی
2. Maven Repository مایکت
3. Mirrorهای رانفلر
4. مخازن رسمی Google / Maven Central / Gradle Plugin Portal

Gradle ترتیب repositoryها را هنگام resolution رعایت می‌کند؛ بنابراین ترتیب declaration عمداً به همین شکل نگه داشته می‌شود.

## Maven Repository — مایکت

در `build.gradle`:

```gradle
buildscript {
  repositories {
    maven { url 'https://maven.myket.ir/' }
  }
}
allprojects {
  repositories {
    maven { url 'https://maven.myket.ir/' }
  }
}
```

در `settings.gradle` یا `settings.gradle.kts`:

```gradle
pluginManagement {
  repositories {
    maven { url = uri("https://maven.myket.ir/") }
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    maven { url = uri("https://maven.myket.ir/") }
  }
}
```

در پروژه خط‌یار، این تنظیمات نباید با یک `init.gradle` سراسری روی Settings یا Included Buildهای Expo/React Native اعمال شوند؛ زیرا Expo SDK 57 و React Native 0.86 دارای Included Build مستقل هستند.

## Mirrorهای Runflare

Mirrorهای Runflare:

```text
https://mirror-maven.runflare.com/android/maven2/
https://mirror-maven.runflare.com/maven2/
https://mirror-maven.runflare.com/gradle-plugins/
```

این‌ها بعد از مایکت و قبل از Google/Maven Central به‌عنوان fallback عمومی داخلی استفاده می‌شوند.

### نکته مهم درباره Gradle Module Metadata

برخی endpointهای Runflare ممکن است برای فایل‌های Gradle Module Metadata با پسوند `.module` پاسخ HTTP 500 برگردانند، درحالی‌که POM و artifact همان dependency قابل دریافت است. به همین دلیل در کانفیگ خط‌یار:

- مایکت با `gradleMetadata()`, `mavenPom()` و `artifact()` استفاده می‌شود.
- Runflare فقط با `mavenPom()` و `artifact()` استفاده می‌شود.

این محدودسازی فقط نحوه metadata lookup در Runflare را تغییر می‌دهد و ترتیب fallback را عوض نمی‌کند: `local -> Myket -> Runflare -> official`.

منبع راهنمای Mirrorهای Runflare: https://runflare.com/mirrors/mirror-gradle/

## Gradle Wrapper

نسخه Gradle پروژه باید از نسخه‌ای که توسط سیاست فعلی Expo/React Native پروژه تعیین شده پیروی کند. برای وضعیت فعلی KhatYar:

```text
Expo SDK       57
React Native   0.86.0
Gradle         8.13
JDK            17
```

ترتیب دریافت Wrapper:

1. `F:\gradle-cache\gradle-8.13-bin.zip` در Windows، اگر فایل معتبر وجود داشته باشد.
2. مایکت:

```text
https://maven.myket.ir/gradle/distributions/gradle-8.13-bin.zip
```

3. در صورت عدم دسترسی، Mirror رانفلر:

```text
https://mirror-maven.runflare.com/distributions/gradle-8.13-bin.zip
```

4. در نهایت سرویس رسمی Gradle:

```text
https://services.gradle.org/distributions/gradle-8.13-bin.zip
```

اسکریپت `scripts/configure-gradle-wrapper.js` مسئول اعمال نسخه و انتخاب منبع است. Wrapper تولیدشده نباید به Gradle 9.x یا نسخه دیگری مهاجرت داده شود مگر اینکه ماتریس سازگاری پروژه عمداً تغییر کند.

## Android SDK

برای دریافت/بررسی آرشیوهای Android SDK از فهرست مایکت استفاده شود:

```text
https://maven.myket.ir/sdk-archives.csv
```

این CSV مرجع دانلود archiveهای SDK برای محیط‌های محدودشده است. در Windows ابتدا SDK موجود در `ANDROID_HOME`/`ANDROID_SDK_ROOT` و cacheهای محلی بررسی شود و فقط اجزای مفقود از mirror داخلی دریافت شوند.

## Flutter mirror

این پروژه React Native/Expo است و Flutter در Build فعلی دخالتی ندارد؛ بااین‌حال برای توسعه‌های جانبی Flutter، Mirror مایکت به شکل زیر است:

Environment Variables:

```powershell
$env:PUB_HOSTED_URL="https://pub.myket.ir"
$env:FLUTTER_STORAGE_BASE_URL="https://pub.myket.ir"
```

Windows دائمی:

```powershell
[Environment]::SetEnvironmentVariable("PUB_HOSTED_URL","https://pub.myket.ir","User")
[Environment]::SetEnvironmentVariable("FLUTTER_STORAGE_BASE_URL","https://pub.myket.ir","User")
```

نمونه SDK Windows:

```text
https://pub.myket.ir/flutter_infra_release/releases/stable/windows/flutter_windows_3.44.0-stable.zip
```

نمونه Linux:

```text
https://pub.myket.ir/flutter_infra_release/releases/stable/linux/flutter_linux_3.44.0-stable.tar.xz
```

## قوانین مهم برای Build خط‌یار

- Build استاندارد APK/AAB برای انتشار غیررسمی است و نباید به انتشار Myket وابسته باشد.
- استفاده از `C:\Users\<user>\.gradle\init.d\myket.init.gradle` ممنوع است؛ init script سراسری می‌تواند Included Buildهای Expo/RN را خراب کند.
- repositoryها باید در پروژه تولیدشده Expo و Included Buildهای واقعی آن تنظیم شوند، نه با hook سراسری روی تمام buildها.
- قبل از تغییر نسخه‌های Expo، React Native، Gradle، AGP، Kotlin، compileSdk یا NDK، سازگاری نسخه‌ها باید بررسی شود.
- هر تغییر در Build script باید idempotent باشد؛ اجرای دوباره Build نباید repositoryها یا blockهای Gradle تو در تو ایجاد کند.
- فایل‌های generated داخل `android/` نباید جایگزین source-of-truth پروژه شوند مگر اینکه صریحاً در repository commit شده باشند.
- خطاهای HTTP سرویس‌های Mirror باید تا حد ممکن با محدودکردن metadataهای ناسازگار مدیریت شوند، نه با حذف fallback داخلی یا تغییر بی‌دلیل نسخه‌های toolchain.

## وضعیت فعلی پروژه

```text
Expo             ~57.0.6
React Native     0.86.0
React            19.2.3
Gradle           8.13
JDK              17
compileSdk       36
targetSdk        36
minSdk           24
buildTools       36.0.0
NDK              27.1.12297006
```

این فایل مرجع سیاست Build است؛ هنگام رفع خطاهای آینده ابتدا این سند و سپس فایل‌های `scripts/prepare-android-release.js`، `scripts/configure-gradle-wrapper.js`، `plugins/withAndroidMavenMirrors.js` و `build-release.ps1` بررسی شوند.
