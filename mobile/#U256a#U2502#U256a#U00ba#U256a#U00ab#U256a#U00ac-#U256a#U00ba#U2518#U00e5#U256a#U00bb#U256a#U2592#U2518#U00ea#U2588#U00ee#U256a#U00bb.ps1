# ============================================================================
#  اسکریپت خودکار ساخت APK تاکسیرانی (مخصوص ایران - آینهٔ Myket)
#  این اسکریپت اجزای Android SDK را از Myket دانلود و درست نصب می‌کند،
#  مسیرها و نام پروژه را تنظیم می‌کند و در پایان APK می‌سازد.
#
#  نحوهٔ اجرا (در PowerShell):
#    cd C:\Users\Administrator\Desktop\taxi-system\mobile
#    powershell -ExecutionPolicy Bypass -File .\ساخت-اندروید.ps1
# ============================================================================

$ErrorActionPreference = 'Stop'

# ----- مسیرها (در صورت نیاز ویرایش کنید) -----
$ProjectDir = "C:\Users\Administrator\Desktop\taxi-system\mobile"
$SdkDir     = "$env:LOCALAPPDATA\Android\Sdk"
$TempDir    = "$env:TEMP\taxi-sdk-dl"

# ----- اجزای موردنیاز از Myket (نسخهٔ ویندوز) -----
# format: نام | آدرس Myket | مسیر مقصد نهایی | فایل شاخص برای بررسی صحت
$Components = @(
  @{ Name='Platform 34';     Url='https://maven.myket.ir/android-sdk/platform-34-ext7_r03.zip'; Dest="$SdkDir\platforms\android-34";        Marker='android.jar' },
  @{ Name='Build-Tools 34';  Url='https://maven.myket.ir/android-sdk/build-tools_r34-windows.zip'; Dest="$SdkDir\build-tools\34.0.0";       Marker='aapt2.exe' },
  @{ Name='Platform-Tools';  Url='https://maven.myket.ir/android-sdk/platform-tools_r37.0.0-win.zip'; Dest="$SdkDir\platform-tools";        Marker='adb.exe' },
  @{ Name='NDK 26.1';        Url='https://maven.myket.ir/android-sdk/android-ndk-r26b-windows.zip'; Dest="$SdkDir\ndk\26.1.10909125";        Marker='source.properties' },
  @{ Name='CMake 3.22.1';    Url='https://maven.myket.ir/android-sdk/cmake-3.22.1-windows.zip'; Dest="$SdkDir\cmake\3.22.1";                 Marker='bin\cmake.exe' }
)

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [!] $msg" -ForegroundColor Yellow }

# ============================================================================
# تابع: دانلود و extract یک جزء در مسیر درست (با حذف سطح تودرتوی اضافه)
# ============================================================================
function Install-Component($comp) {
  Write-Step "نصب $($comp.Name)"

  # اگر از قبل سالم نصب است، رد شو
  $markerPath = Join-Path $comp.Dest $comp.Marker
  if (Test-Path $markerPath) {
    Write-Ok "از قبل نصب است ($($comp.Marker) موجود است) - رد شد"
    return
  }

  # پاک‌سازی مقصد ناقص/خراب
  if (Test-Path $comp.Dest) {
    Write-Warn "مقصد موجود ولی ناقص است - پاک‌سازی می‌شود"
    Remove-Item -Recurse -Force $comp.Dest
  }

  # دانلود
  $zipPath = Join-Path $TempDir ("{0}.zip" -f ($comp.Name -replace '[^\w]','_'))
  Write-Host "    دانلود از Myket ..." -ForegroundColor Gray
  $tries = 0
  while ($true) {
    $tries++
    try {
      Invoke-WebRequest -Uri $comp.Url -OutFile $zipPath -TimeoutSec 600 -UseBasicParsing
      break
    } catch {
      if ($tries -ge 3) { throw "دانلود $($comp.Name) بعد از ۳ تلاش ناموفق بود: $_" }
      Write-Warn "تلاش $tries ناموفق بود، تلاش مجدد ..."
      Start-Sleep -Seconds 3
    }
  }
  Write-Ok "دانلود کامل شد"

  # extract در پوشهٔ موقت
  $extractTmp = Join-Path $TempDir ("ex_" + [System.IO.Path]::GetFileNameWithoutExtension($zipPath))
  if (Test-Path $extractTmp) { Remove-Item -Recurse -Force $extractTmp }
  Expand-Archive -Path $zipPath -DestinationPath $extractTmp -Force

  # پیدا کردن پوشه‌ای که فایل شاخص (Marker) را دارد، تا سطح تودرتوی اضافه حذف شود
  $markerLeaf = Split-Path $comp.Marker -Leaf
  $found = Get-ChildItem -Path $extractTmp -Recurse -Filter $markerLeaf -ErrorAction SilentlyContinue | Select-Object -First 1

  if ($null -eq $found) {
    # بعضی بسته‌ها مثل platform زیرپوشهٔ متفاوت دارند؛ ریشهٔ extract را مبنا بگیر
    $sourceRoot = $extractTmp
    # اگر فقط یک پوشه داخلش هست، همان را بگیر
    $kids = Get-ChildItem $extractTmp
    if ($kids.Count -eq 1 -and $kids[0].PSIsContainer) { $sourceRoot = $kids[0].FullName }
  } else {
    # ریشه = پوشه‌ای که فایل شاخص مستقیم در آن است (یا بالاتر اگر marker مسیر دارد)
    $depth = ($comp.Marker -split '[\\/]').Count - 1
    $sourceRoot = Split-Path $found.FullName -Parent
    for ($i=0; $i -lt $depth; $i++) { $sourceRoot = Split-Path $sourceRoot -Parent }
  }

  # انتقال به مقصد نهایی
  New-Item -ItemType Directory -Force -Path (Split-Path $comp.Dest -Parent) | Out-Null
  Move-Item -Path $sourceRoot -Destination $comp.Dest -Force

  # بررسی نهایی
  if (Test-Path (Join-Path $comp.Dest $comp.Marker)) {
    Write-Ok "نصب شد در: $($comp.Dest)"
  } else {
    throw "نصب $($comp.Name) ناقص است - فایل $($comp.Marker) پیدا نشد"
  }

  # پاک‌سازی موقت
  Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $extractTmp -ErrorAction SilentlyContinue
}

# ============================================================================
#  شروع
# ============================================================================
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "   ساخت خودکار APK تاکسیرانی - آینهٔ Myket" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta

# 0) بررسی پیش‌نیازها
Write-Step "بررسی پیش‌نیازها"
if (-not (Test-Path $ProjectDir)) { throw "پوشهٔ پروژه پیدا نشد: $ProjectDir" }
Set-Location $ProjectDir
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
New-Item -ItemType Directory -Force -Path $SdkDir  | Out-Null

# بررسی VPN: Myket داخلی است؛ هشدار اگر کاربر VPN روشن دارد
Write-Warn "توجه: Myket سرویس داخلی است. اگر VPN روشن است، آن را خاموش کنید تا دانلود از Myket کار کند."

# 1) نصب همهٔ اجزای SDK از Myket
foreach ($c in $Components) { Install-Component $c }

# 2) ساخت local.properties با مسیر درست SDK (بدون کاراکتر اضافه)
Write-Step "تنظیم مسیر SDK"
$androidDir = Join-Path $ProjectDir 'android'
if (-not (Test-Path $androidDir)) {
  Write-Warn "پوشهٔ android نیست؛ ابتدا prebuild اجرا می‌شود"
} else {
  $sdkEsc = $SdkDir -replace '\\','\\'
  Set-Content -Path (Join-Path $androidDir 'local.properties') -Value "sdk.dir=$sdkEsc" -Encoding ASCII -NoNewline
  Write-Ok "local.properties ساخته شد"
}
# تنظیم دائمی ANDROID_HOME
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $SdkDir, 'User')
$env:ANDROID_HOME = $SdkDir
Write-Ok "ANDROID_HOME تنظیم شد: $SdkDir"

# 3) نصب وابستگی‌های npm (در صورت نبود node_modules)
Write-Step "بررسی node_modules"
if (-not (Test-Path (Join-Path $ProjectDir 'node_modules\expo'))) {
  Write-Host "    اجرای npm install ..." -ForegroundColor Gray
  npm install
  Write-Ok "npm install کامل شد"
} else {
  Write-Ok "node_modules موجود است"
}

# 4) نوشتن init script سراسری Myket (برای بیلدهای جداگانه مثل react-native-gradle-plugin)
Write-Step "نوشتن init script سراسری Myket"
$initDir = Join-Path $env:USERPROFILE '.gradle\init.d'
New-Item -ItemType Directory -Force -Path $initDir | Out-Null
$initContent = @'
def myketUrl = 'https://maven.myket.ir'
settingsEvaluated { settings ->
    settings.pluginManagement { repositories { maven { url = myketUrl } } }
    try { settings.dependencyResolutionManagement { repositories { maven { url = myketUrl } } } } catch (ignored) {}
}
allprojects {
    buildscript { repositories { maven { url = myketUrl } } }
    repositories { maven { url = myketUrl } }
}
'@
Set-Content -Path (Join-Path $initDir 'myket.init.gradle') -Value $initContent -Encoding ASCII
Write-Ok "init script نوشته شد"

# 5) prebuild (بازسازی android با تنظیمات درست: نام لاتین، NDK، Myket)
Write-Step "اجرای expo prebuild (بازسازی پوشهٔ android)"
npx expo prebuild --platform android --clean
Write-Ok "prebuild کامل شد"

# 5b) دوباره local.properties (چون prebuild --clean آن را پاک می‌کند)
$sdkEsc = $SdkDir -replace '\\','\\'
Set-Content -Path (Join-Path $androidDir 'local.properties') -Value "sdk.dir=$sdkEsc" -Encoding ASCII -NoNewline
Write-Ok "local.properties بازسازی شد"

# 5c) اطمینان از لاتین بودن نام پروژهٔ Gradle (پشتیبان، اگر پلاگین اعمال نشده باشد)
$settingsPath = Join-Path $androidDir 'settings.gradle'
if (Test-Path $settingsPath) {
  $sg = Get-Content $settingsPath -Raw -Encoding UTF8
  if ($sg -match "rootProject\.name\s*=") {
    $sg = [regex]::Replace($sg, "rootProject\.name\s*=\s*['""][^'""]*['""]", "rootProject.name = 'taxi-control'")
    Set-Content -Path $settingsPath -Value $sg -Encoding UTF8
    Write-Ok "نام پروژهٔ Gradle لاتین شد"
  }
}

# 6) ساخت APK
Write-Step "ساخت APK (gradlew assembleRelease)"
Set-Location $androidDir
.\gradlew.bat assembleRelease --no-daemon

# 7) پیدا کردن خروجی
$apk = Get-ChildItem -Path (Join-Path $androidDir 'app\build\outputs\apk') -Recurse -Filter '*.apk' -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host "`n============================================================" -ForegroundColor Magenta
if ($apk) {
  Write-Host "   ✅ ساخت با موفقیت انجام شد!" -ForegroundColor Green
  Write-Host "   فایل APK: $($apk.FullName)" -ForegroundColor Green
} else {
  Write-Host "   ⚠️ build اجرا شد ولی APK پیدا نشد. لاگ بالا را بررسی کنید." -ForegroundColor Yellow
}
Write-Host "============================================================" -ForegroundColor Magenta
