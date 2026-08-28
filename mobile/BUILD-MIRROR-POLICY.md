# خط‌یار — سیاست پایدار دانلود و Build در ایران

این فایل قرارداد Build پروژه است. در توسعه‌ها و اصلاحات بعدی، این سیاست نباید بدون دلیل فنی نقض یا دوباره طراحی شود.

## هدف

به‌دلیل محدودیت دسترسی به برخی سرویس‌ها و مخازن خارجی از داخل ایران، فرآیند Build باید تا حد ممکن از کش محلی و Mirrorهای داخلی استفاده کند و فقط در صورت نبودن/عدم دسترسی، به سرویس‌های عمومی fallback کند.

## اصل مهم fallback

ترتیب repositoryها به‌تنهایی به معنی fallback مطمئن نیست. اگر یک Mirror برای یک coordinate پاسخ HTTP 5xx بدهد، Gradle ممکن است همان repository را در resolution آن dependency شکست‌خورده تلقی کند و Build متوقف شود. بنابراین Mirrorهای ناپایدار باید با **content filtering** از گروه‌های مشکل‌دار کنار گذاشته شوند، نه اینکه فقط ترتیب آن‌ها تغییر کند.

## ترتیب کلی

برای dependencyهای Maven/Gradle:

1. کش/مخزن محلی
2. Maven Repository مایکت
3. Mirrorهای رانفلر، فقط برای گروه‌های قابل اتکا
4. مخازن رسمی Google / Maven Central / Gradle Plugin Portal

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

در پروژه خط‌یار، تنظیمات بالا باید در پروژه تولیدشده Expo و Included Buildهای واقعی آن اعمال شوند. استفاده از `C:\Users\<user>\.gradle\init.d\myket.init.gradle` ممنوع است؛ policy پروژه فقط از init script داخل repository و اجرای صریح `--init-script` استفاده می‌کند.

## Mirrorهای Runflare

Mirrorهای Runflare:

```text
https://mirror-maven.runflare.com/android/maven2/
https://mirror-maven.runflare.com/maven2/
https://mirror-maven.runflare.com/gradle-plugins/
```

این‌ها بعد از مایکت به‌عنوان fallback داخلی استفاده می‌شوند، اما **برای گروه‌های Expo و React Native نباید استفاده شوند** چون در آزمایش واقعی پروژه، Runflare برای dependency معتبر Expo با HTTP 500 پاسخ داده است.

گروه‌های مستثنی از Runflare:

```text
expo.modules.*
host.exp.exponent
com.facebook.react.*
com.facebook.fbjni.*
```

این استثناها باید هم در `gradle-mirror.init.gradle` و هم در plugin تولیدکننده تنظیمات Gradle حفظ شوند.

### Gradle Module Metadata

Runflare فقط با:

```gradle
metadataSources { mavenPom(); artifact() }
```

استفاده می‌شود و `gradleMetadata()` برای Runflare فعال نیست. این کار جلوی درخواست `.module` را می‌گیرد، اما **جلوگیری از HTTP 500 برای POM نیز به content filtering نیاز دارد**؛ بنابراین حذف `gradleMetadata()` به‌تنهایی کافی نیست.

## Gradle Wrapper

وضعیت فعلی:

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

3. Runflare:

```text
https://mirror-maven.runflare.com/distributions/gradle-8.13-bin.zip
```

4. سرویس رسمی Gradle:

```text
https://services.gradle.org/distributions/gradle-8.13-bin.zip
```

اسکریپت `scripts/configure-gradle-wrapper.js` مسئول اعمال نسخه و انتخاب منبع است. Wrapper تولیدشده نباید به Gradle 9.x یا نسخه دیگری مهاجرت داده شود مگر اینکه ماتریس سازگاری پروژه عمداً تغییر کند.

## Android SDK

مرجع archiveهای Android SDK مایکت:

```text
https://maven.myket.ir/sdk-archives.csv
```

در Windows ابتدا `ANDROID_HOME`/`ANDROID_SDK_ROOT` و cache محلی بررسی شود و فقط اجزای مفقود از mirror داخلی دریافت شوند.

## Flutter mirror

این پروژه React Native/Expo است و Flutter در Build فعلی دخالتی ندارد؛ برای توسعه‌های جانبی Flutter:

```powershell
$env:PUB_HOSTED_URL="https://pub.myket.ir"
$env:FLUTTER_STORAGE_BASE_URL="https://pub.myket.ir"
```

Windows دائمی:

```powershell
[Environment]::SetEnvironmentVariable("PUB_HOSTED_URL","https://pub.myket.ir","User")
[Environment]::SetEnvironmentVariable("FLUTTER_STORAGE_BASE_URL","https://pub.myket.ir","User")
```

## قوانین مهم برای Build خط‌یار

- Build استاندارد APK/AAB برای انتشار غیررسمی است و نباید به انتشار Myket وابسته باشد.
- استفاده از init script سراسری در `~/.gradle/init.d` ممنوع است.
- repository policy باید Included Buildهای Expo/RN را نیز پوشش دهد.
- Runflare برای گروه‌های مستعد HTTP 500 نباید query شود.
- در صورت مشاهده HTTP 5xx از یک Mirror، اول content filtering و مسیر resolution بررسی شود؛ تغییر نسخه toolchain راه‌حل پیش‌فرض نیست.
- repository declaration نباید با blockهای تو‌در‌تو یا syntax ناسازگار Kotlin/Groovy تولید شود.
- هر تغییر Build script باید idempotent باشد.
- `android/` تولیدشده توسط Expo باید source-of-truth خود را در `app.config.js` و pluginهای Config Plugins داشته باشد.
- قبل از تغییر Expo، React Native، Gradle، AGP، Kotlin، compileSdk یا NDK، ماتریس سازگاری بررسی شود.
- Build script باید timeout سخت و idle timeout داشته باشد و در failure، علت واقعی آخرین مرحله را در log چاپ کند.

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

این فایل مرجع سیاست Build است؛ در رفع خطاهای آینده ابتدا این سند و سپس فایل‌های `scripts/prepare-android-release.js`، `scripts/configure-gradle-wrapper.js`، `plugins/withAndroidMavenMirrors.js`، `gradle-mirror.init.gradle` و `build-release.ps1` بررسی شوند.
