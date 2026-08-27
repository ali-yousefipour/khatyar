# KHATYAR FINAL BUILD ENGINE
# PowerShell 5.1 compatible
# Expo SDK 57 / React Native 0.86 / AGP 8.12
# Important: AGP 8.12 requires Android Build Tools 35.0.0 or newer.
# Compile SDK and Target SDK may remain 34.

#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$ProjectRoot = "",
  [string]$JavaHome = "",
  [string]$AndroidSdk = "",
  [string]$GradleZip = "",
  [string]$NdkVersion = "27.3.13750724",
  [int]$CompileSdk = 34,
  [int]$TargetSdk = 34,
  [string]$BuildToolsVersion = "",
  [bool]$AutoInstallSdkTools = $true,
  [string]$LogDirectory = "",
  [switch]$PreferNewestBuildTools,
  [switch]$Fresh,
  [switch]$SkipInstall,
  [switch]$SkipDoctor,
  [switch]$Aab
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Text) { Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host $Text -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host $Text -ForegroundColor Yellow }
function Fail([string]$Text) { throw $Text }

function Save-Utf8NoBom([string]$Path, [string]$Content) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Resolve-ExistingDirectory([string]$InputPath, [string]$Name) {
  if ([string]::IsNullOrWhiteSpace($InputPath)) { Fail "$Name path is empty." }
  $clean = $InputPath.Trim().Trim('"')
  $item = Get-Item -LiteralPath $clean -ErrorAction SilentlyContinue
  if (-not $item -or -not $item.PSIsContainer) { Fail "$Name directory was not found: $clean" }
  return $item.FullName
}

function Get-JavaMajorVersion([string]$JdkRoot) {
  if ([string]::IsNullOrWhiteSpace($JdkRoot)) { return $null }
  $root = $JdkRoot.Trim().Trim('"')
  $releaseFile = Join-Path $root 'release'
  if (Test-Path -LiteralPath $releaseFile -PathType Leaf) {
    $releaseText = [System.IO.File]::ReadAllText($releaseFile)
    if ($releaseText -match 'JAVA_VERSION="(?<major>\d+)') { return [int]$Matches['major'] }
  }
  $java = Join-Path $root 'bin\java.exe'
  if (-not (Test-Path -LiteralPath $java -PathType Leaf)) { return $null }
  try {
    $text = (& $java -version 2>&1 | Out-String)
    if ($text -match '(?:java|openjdk) version "(?<major>\d+)') { return [int]$Matches['major'] }
  } catch {}
  return $null
}

function Test-Jdk17([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
  $root = $Path.Trim().Trim('"')
  if (-not (Test-Path -LiteralPath (Join-Path $root 'bin\java.exe') -PathType Leaf)) { return $false }
  if (-not (Test-Path -LiteralPath (Join-Path $root 'bin\javac.exe') -PathType Leaf)) { return $false }
  return ((Get-JavaMajorVersion $root) -eq 17)
}

function Find-Jdk17([string]$Explicit) {
  $candidates = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($Explicit)) { $candidates.Add($Explicit) }
  if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) { $candidates.Add($env:JAVA_HOME) }

  $roots = @(
    'C:\Program Files\Eclipse Adoptium',
    'C:\Program Files\Java',
    'C:\Program Files\OpenLogic',
    'C:\Program Files\Microsoft',
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft'),
    'C:\Program Files\Android\Android Studio\jbr'
  )

  foreach ($root in $roots) {
    if ([string]::IsNullOrWhiteSpace($root)) { continue }
    if (Test-Jdk17 $root) { $candidates.Add($root) }
    if (Test-Path -LiteralPath $root -PathType Container) {
      Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { $candidates.Add($_.FullName) }
    }
  }

  foreach ($candidate in ($candidates | Select-Object -Unique)) {
    if (Test-Jdk17 $candidate) { return (Get-Item -LiteralPath $candidate).FullName }
  }
  return $null
}

function Test-BuildTools([string]$SdkRoot, [string]$Version) {
  $root = Join-Path $SdkRoot "build-tools\$Version"
  $required = @('source.properties','aapt2.exe','d8.bat','apksigner.bat','zipalign.exe')
  foreach ($name in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $name) -PathType Leaf)) { return $false }
  }
  return $true
}


function Get-InstalledBuildTools([string]$SdkRoot) {
  $root = Join-Path $SdkRoot 'build-tools'
  if (-not (Test-Path -LiteralPath $root -PathType Container)) { return @() }

  $items = @()
  foreach ($dir in Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue) {
    if (Test-BuildTools $SdkRoot $dir.Name) {
      try {
        $items += [PSCustomObject]@{
          VersionText = $dir.Name
          Version = [version]$dir.Name
          Path = $dir.FullName
        }
      } catch {}
    }
  }
  return @($items | Sort-Object Version)
}

function Select-BuildToolsVersion([string]$SdkRoot, [string]$ExplicitVersion, [bool]$PreferNewest) {
  if (-not [string]::IsNullOrWhiteSpace($ExplicitVersion)) { return $ExplicitVersion }

  $installed = @(Get-InstalledBuildTools $SdkRoot)
  $compatible = @($installed | Where-Object { $_.Version -ge [version]'35.0.0' })
  if ($compatible.Count -eq 0) { return '35.0.0' }

  if ($PreferNewest) {
    return ($compatible | Sort-Object Version -Descending | Select-Object -First 1).VersionText
  }

  $series35 = @($compatible | Where-Object { $_.Version.Major -eq 35 } | Sort-Object Version -Descending)
  if ($series35.Count -gt 0) { return $series35[0].VersionText }

  return ($compatible | Sort-Object Version | Select-Object -First 1).VersionText
}

function Initialize-LogDirectory([string]$Root, [string]$Requested) {
  if ([string]::IsNullOrWhiteSpace($Requested)) { $Requested = Join-Path $Root '.build-logs' }
  New-Item -ItemType Directory -Path $Requested -Force | Out-Null
  return (Get-Item -LiteralPath $Requested).FullName
}

function Find-SdkManager([string]$SdkRoot) {
  $cmdline = Join-Path $SdkRoot 'cmdline-tools'
  if (-not (Test-Path -LiteralPath $cmdline -PathType Container)) { return $null }

  $result = Get-ChildItem -LiteralPath $cmdline -Filter 'sdkmanager.bat' -Recurse -File -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1

  if ($result) { return $result.FullName }
  return $null
}

function Install-BuildTools([string]$SdkRoot, [string]$Version) {
  $sdkManager = Find-SdkManager $SdkRoot
  if (-not $sdkManager) {
    Fail "Build Tools $Version is missing and sdkmanager.bat was not found. Install Android SDK Command-line Tools, then install build-tools;$Version."
  }

  Write-Step "Install Android Build Tools $Version"
  Write-Warn "The SDK package is not a Maven dependency. Myket Maven cannot replace sdkmanager for this package."
  Write-Host "sdkmanager=$sdkManager"

  & $sdkManager --sdk_root="$SdkRoot" "build-tools;$Version"
  if ($LASTEXITCODE -ne 0) {
    Fail "sdkmanager could not install build-tools;$Version. Install it from Android Studio > SDK Manager > SDK Tools > Show Package Details."
  }

  if (-not (Test-BuildTools $SdkRoot $Version)) {
    Fail "Build Tools $Version installation is incomplete."
  }
}

function Ensure-EnvLine([string]$Path, [string]$Key, [string]$Value) {
  $lines = @()
  if (Test-Path -LiteralPath $Path) { $lines = @(Get-Content -LiteralPath $Path) }
  $lines = @($lines | Where-Object { $_ -notmatch ('^' + [regex]::Escape($Key) + '=') })
  $lines += "$Key=$Value"
  Set-Content -LiteralPath $Path -Value $lines -Encoding ASCII
}

function Ensure-GradleProperty([string]$Path, [string]$Key, [string]$Value) {
  $lines = @()
  if (Test-Path -LiteralPath $Path) { $lines = @(Get-Content -LiteralPath $Path) }
  $lines = @($lines | Where-Object { $_ -notmatch ('^\s*' + [regex]::Escape($Key) + '\s*=') })
  $lines += "$Key=$Value"
  Set-Content -LiteralPath $Path -Value $lines -Encoding ASCII
}

function Find-GradleZip([string]$Explicit, [string]$Root) {
  $items = @()
  if (-not [string]::IsNullOrWhiteSpace($Explicit)) { $items += $Explicit }
  $items += @(
    'F:\gradle-cache\gradle-9.3.1-bin.zip',
    (Join-Path $Root 'gradle-cache\gradle-9.3.1-bin.zip'),
    'D:\gradle-cache\gradle-9.3.1-bin.zip',
    'C:\gradle-cache\gradle-9.3.1-bin.zip'
  )
  foreach ($item in $items) {
    if ($item -and (Test-Path -LiteralPath $item -PathType Leaf)) {
      return (Get-Item -LiteralPath $item).FullName
    }
  }
  return $null
}

function Patch-Wrapper([string]$WrapperPath, [string]$LocalZip) {
  $text = [System.IO.File]::ReadAllText($WrapperPath)
  if ($LocalZip) {
    $uri = 'file:///' + (($LocalZip -replace '\\','/').TrimStart('/'))
    $text = [regex]::Replace($text, '(?m)^distributionUrl=.*$', "distributionUrl=$uri")
  }
  if ($text -match '(?m)^networkTimeout=') {
    $text = [regex]::Replace($text, '(?m)^networkTimeout=.*$', 'networkTimeout=120000')
  } else {
    $text += "`r`nnetworkTimeout=120000`r`n"
  }
  Save-Utf8NoBom $WrapperPath $text
}

function Patch-RootBuildGradle(
  [string]$Path,
  [string]$BuildTools,
  [int]$Compile,
  [int]$Target,
  [string]$Ndk
) {
  $text = [System.IO.File]::ReadAllText($Path)

  # Remove old values previously injected by older build engines.
  $text = [regex]::Replace($text, '(?m)^\s*ext\.buildToolsVersion\s*=.*\r?\n?', '')
  $text = [regex]::Replace($text, '(?m)^\s*ext\.compileSdkVersion\s*=.*\r?\n?', '')
  $text = [regex]::Replace($text, '(?m)^\s*ext\.targetSdkVersion\s*=.*\r?\n?', '')
  $text = [regex]::Replace($text, '(?m)^\s*ext\.ndkVersion\s*=.*\r?\n?', '')

  $marker = 'apply plugin: "expo-root-project"'
  $block = @"
ext.buildToolsVersion = "$BuildTools"
ext.compileSdkVersion = $Compile
ext.targetSdkVersion = $Target
ext.ndkVersion = "$Ndk"

"@

  if ($text.Contains($marker)) {
    $text = $text.Replace($marker, $block + $marker)
  } else {
    $text = $block + $text
  }

  Save-Utf8NoBom $Path $text
}

function Patch-AppBuildGradle([string]$Path) {
  $text = [System.IO.File]::ReadAllText($Path)

  $text = [regex]::Replace(
    $text,
    '(?m)^\s*buildToolsVersion\s+["''][^"'']+["'']\s*$',
    '    buildToolsVersion rootProject.ext.buildToolsVersion'
  )
  $text = [regex]::Replace(
    $text,
    '(?m)^\s*compileSdkVersion\s+\d+\s*$',
    '    compileSdkVersion rootProject.ext.compileSdkVersion'
  )
  $text = [regex]::Replace(
    $text,
    '(?m)^\s*targetSdkVersion\s+\d+\s*$',
    '        targetSdkVersion rootProject.ext.targetSdkVersion'
  )
  $text = [regex]::Replace(
    $text,
    '(?m)^\s*ndkVersion\s+["''][^"'']+["'']\s*$',
    '    ndkVersion rootProject.ext.ndkVersion'
  )

  Save-Utf8NoBom $Path $text
}

function Verify-AndroidConfig(
  [string]$RootGradle,
  [string]$AppGradle,
  [string]$BuildTools,
  [int]$Compile,
  [int]$Target,
  [string]$Ndk
) {
  $root = [System.IO.File]::ReadAllText($RootGradle)
  $app = [System.IO.File]::ReadAllText($AppGradle)

  $required = @(
    "ext.buildToolsVersion = `"$BuildTools`"",
    "ext.compileSdkVersion = $Compile",
    "ext.targetSdkVersion = $Target",
    "ext.ndkVersion = `"$Ndk`""
  )

  foreach ($value in $required) {
    if (-not $root.Contains($value)) { Fail "Generated build.gradle is missing: $value" }
  }

  if ($app -notmatch 'buildToolsVersion\s+rootProject\.ext\.buildToolsVersion') {
    Fail 'app/build.gradle does not use rootProject.ext.buildToolsVersion.'
  }
}

Write-Step 'Resolve project root'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
  if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) { $ProjectRoot = $PSScriptRoot }
  else { $ProjectRoot = (Get-Location).Path }
}
$ProjectRoot = Resolve-ExistingDirectory $ProjectRoot 'ProjectRoot'
Set-Location -LiteralPath $ProjectRoot
[Environment]::CurrentDirectory = $ProjectRoot
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot 'package.json') -PathType Leaf)) {
  Fail 'package.json was not found.'
}
Write-Ok "ProjectRoot=$ProjectRoot"

$LogDirectory = Initialize-LogDirectory $ProjectRoot $LogDirectory
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$masterLog = Join-Path $LogDirectory "build-v6-$timestamp.log"
Write-Ok "LOG_DIRECTORY=$LogDirectory"
Start-Transcript -LiteralPath $masterLog -Force | Out-Null

try {

Write-Step 'Configure Java 17' 
$jdk = Find-Jdk17 $JavaHome
if (-not $jdk) { Fail 'JDK 17 was not found.' }
$env:JAVA_HOME = $jdk
$env:Path = "$jdk\bin;$env:Path"
Write-Ok "JAVA_HOME=$jdk"
& (Join-Path $jdk 'bin\java.exe') -version

Write-Step 'Configure Android SDK'
if ([string]::IsNullOrWhiteSpace($AndroidSdk)) {
  if (-not [string]::IsNullOrWhiteSpace($env:ANDROID_SDK_ROOT)) { $AndroidSdk = $env:ANDROID_SDK_ROOT }
  elseif (-not [string]::IsNullOrWhiteSpace($env:ANDROID_HOME)) { $AndroidSdk = $env:ANDROID_HOME }
  else { $AndroidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
}

$AndroidSdk = Resolve-ExistingDirectory $AndroidSdk 'AndroidSdk'
$env:ANDROID_HOME = $AndroidSdk
$env:ANDROID_SDK_ROOT = $AndroidSdk
$env:ANDROID_NDK_VERSION = $NdkVersion

$platform = Join-Path $AndroidSdk "platforms\android-$CompileSdk"
if (-not (Test-Path -LiteralPath (Join-Path $platform 'android.jar') -PathType Leaf)) {
  Fail "Android platform android-$CompileSdk is not installed."
}

$ndk = Join-Path $AndroidSdk "ndk\$NdkVersion"
if (-not (Test-Path -LiteralPath (Join-Path $ndk 'source.properties') -PathType Leaf)) {
  Fail "NDK $NdkVersion is not installed side-by-side at: $ndk"
}

$BuildToolsVersion = Select-BuildToolsVersion $AndroidSdk $BuildToolsVersion ([bool]$PreferNewestBuildTools)

if (-not (Test-BuildTools $AndroidSdk $BuildToolsVersion)) {
  if ($AutoInstallSdkTools) {
    Install-BuildTools $AndroidSdk $BuildToolsVersion
  } else {
    Fail "Android Build Tools $BuildToolsVersion is missing or incomplete."
  }
}

$installedBuildTools = @(Get-InstalledBuildTools $AndroidSdk)
Write-Ok "ANDROID_SDK_ROOT=$AndroidSdk"
Write-Ok "COMPILE_SDK=$CompileSdk"
Write-Ok "TARGET_SDK=$TargetSdk"
Write-Ok "BUILD_TOOLS_VERSION=$BuildToolsVersion"
Write-Ok "BUILD_TOOLS_INSTALLED=$((@($installedBuildTools | ForEach-Object { $_.VersionText })) -join ', ')"
Write-Ok "NDK_VERSION=$NdkVersion"

$env:CI = '1'
$env:NODE_ENV = 'production'
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$env:KHATYAR_USE_MYKET_MIRROR = '0'
Ensure-EnvLine (Join-Path $ProjectRoot '.env') 'ANDROID_NDK_VERSION' $NdkVersion

if (-not $SkipInstall) {
  Write-Step 'Install npm dependencies'
  & npm install --no-audit --no-fund --prefer-offline
  if ($LASTEXITCODE -ne 0) { Fail 'npm install failed.' }

  Write-Step 'Check Expo package versions'
  & npx expo install --check
  if ($LASTEXITCODE -ne 0) { Write-Warn 'Expo package check reported issues; build will continue.' }
}

if (-not $SkipDoctor) {
  Write-Step 'Run Expo Doctor'
  & npx expo-doctor
  if ($LASTEXITCODE -ne 0) { Write-Warn 'Expo Doctor reported warnings. Build will continue.' }
}

Write-Step 'Run phase 5 validation'
& node scripts/validate-phase5.js
if ($LASTEXITCODE -ne 0) { Fail 'Phase 5 validation failed.' }

Write-Step 'Validate Expo config'
& npx expo config --json *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Expo config validation failed.' }

Write-Step 'Run Expo prebuild'
$existingGradle = Join-Path $ProjectRoot 'android\gradlew.bat'
if ($Fresh -and (Test-Path -LiteralPath $existingGradle -PathType Leaf)) {
  & $existingGradle --stop | Out-Null
}

& npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { Fail 'expo prebuild failed.' }

$android = Join-Path $ProjectRoot 'android'
$localProps = Join-Path $android 'local.properties'
$sdkEscaped = $AndroidSdk.Replace('\','\\').Replace(':','\:')
Set-Content -LiteralPath $localProps -Value "sdk.dir=$sdkEscaped" -Encoding ASCII

Write-Step 'Patch generated Android configuration'
$rootGradle = Join-Path $android 'build.gradle'
$appGradle = Join-Path $android 'app\build.gradle'
$gradleProperties = Join-Path $android 'gradle.properties'

Patch-RootBuildGradle $rootGradle $BuildToolsVersion $CompileSdk $TargetSdk $NdkVersion
Patch-AppBuildGradle $appGradle

Ensure-GradleProperty $gradleProperties 'android.buildToolsVersion' $BuildToolsVersion
Ensure-GradleProperty $gradleProperties 'android.compileSdkVersion' ([string]$CompileSdk)
Ensure-GradleProperty $gradleProperties 'android.targetSdkVersion' ([string]$TargetSdk)
Ensure-GradleProperty $gradleProperties 'android.ndkVersion' $NdkVersion
Ensure-GradleProperty $gradleProperties 'kotlin.compiler.execution.strategy' 'in-process'
Ensure-GradleProperty $gradleProperties 'org.gradle.workers.max' '2'

Verify-AndroidConfig $rootGradle $appGradle $BuildToolsVersion $CompileSdk $TargetSdk $NdkVersion
Write-Ok "Verified: BuildTools=$BuildToolsVersion CompileSdk=$CompileSdk TargetSdk=$TargetSdk NDK=$NdkVersion"

Write-Step 'Configure Gradle wrapper'
$wrapper = Join-Path $android 'gradle\wrapper\gradle-wrapper.properties'
$localGradle = Find-GradleZip $GradleZip $ProjectRoot
Patch-Wrapper $wrapper $localGradle
if ($localGradle) { Write-Ok "Local Gradle=$localGradle" }
else { Write-Warn 'Local Gradle ZIP was not found. Gradle Wrapper may download it.' }

Write-Step 'Gradle preflight'
Push-Location -LiteralPath $android
try {
  & .\gradlew.bat properties --no-daemon --console=plain 2>&1 |
    Tee-Object -FilePath (Join-Path $LogDirectory "gradle-properties-$timestamp.log")
  if ($LASTEXITCODE -ne 0) { Fail 'Gradle preflight failed.' }
}
finally {
  Pop-Location
}

Write-Step 'Build Android release'
Push-Location -LiteralPath $android
try {
  & .\gradlew.bat --stop | Out-Null

  if ($Fresh) {
    Remove-Item '.gradle','build','app\build' -Recurse -Force -ErrorAction SilentlyContinue
  }

  & .\gradlew.bat clean --no-daemon --console=plain 2>&1 |
    Tee-Object -FilePath (Join-Path $LogDirectory "gradle-clean-$timestamp.log")
  if ($LASTEXITCODE -ne 0) { Fail 'Gradle clean failed.' }

  if ($Aab) {
    & .\gradlew.bat bundleRelease --no-daemon --stacktrace --console=plain 2>&1 |
      Tee-Object -FilePath (Join-Path $LogDirectory "gradle-bundle-release-$timestamp.log")
    if ($LASTEXITCODE -ne 0) { Fail 'bundleRelease failed.' }
  } else {
    & .\gradlew.bat assembleRelease --no-daemon --stacktrace --console=plain 2>&1 |
      Tee-Object -FilePath (Join-Path $LogDirectory "gradle-assemble-release-$timestamp.log")
    if ($LASTEXITCODE -ne 0) { Fail 'assembleRelease failed.' }
  }
}
finally {
  Pop-Location
}

Write-Step 'Collect outputs'
$releaseRoot = Split-Path -Parent $ProjectRoot
$outDir = Join-Path $releaseRoot 'release\myket\final'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

if ($Aab) {
  $source = Join-Path $android 'app\build\outputs\bundle\release'
  $files = @(Get-ChildItem -LiteralPath $source -Recurse -File -Filter '*.aab' -ErrorAction SilentlyContinue)
} else {
  $source = Join-Path $android 'app\build\outputs\apk\release'
  $files = @(Get-ChildItem -LiteralPath $source -Recurse -File -Filter '*.apk' -ErrorAction SilentlyContinue)
}

if ($files.Count -eq 0) { Fail 'No release output was generated.' }

foreach ($file in $files) {
  $destination = Join-Path $outDir $file.Name
  Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
  Write-Ok $destination
}

Write-Ok 'Build completed successfully.'

}
finally {
  try { Stop-Transcript | Out-Null } catch {}
}
