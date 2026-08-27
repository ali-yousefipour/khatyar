#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$ProjectRoot = $PSScriptRoot,
  [string]$JavaHome = $env:JAVA_HOME,
  [string]$AndroidSdk = $env:ANDROID_HOME,
  [string]$GradleZip = "F:\gradle-cache\gradle-9.3.1-bin.zip",
  [string]$NdkVersion = "27.3.13750724",
  [switch]$Fresh
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Step([string]$Text){ Write-Host "`n=== $Text ===" -ForegroundColor Cyan }
function Fail([string]$Text){ throw $Text }

Set-Location -LiteralPath $ProjectRoot
if (-not (Test-Path package.json)) { Fail 'package.json not found.' }
if (-not (Test-Path "$JavaHome\bin\java.exe")) { Fail "Invalid JAVA_HOME: $JavaHome" }
if (-not (Test-Path $AndroidSdk)) { Fail "Invalid Android SDK: $AndroidSdk" }
if (-not (Test-Path "$AndroidSdk\ndk\$NdkVersion\source.properties")) { Fail "NDK $NdkVersion not found." }

$env:JAVA_HOME=$JavaHome
$env:ANDROID_HOME=$AndroidSdk
$env:ANDROID_SDK_ROOT=$AndroidSdk
$env:ANDROID_NDK_VERSION=$NdkVersion
$env:KHATYAR_USE_MYKET_MIRROR='0'
$env:CI='1'
$env:NODE_ENV='production'
$env:NODE_OPTIONS='--dns-result-order=ipv4first'
$env:Path="$JavaHome\bin;$AndroidSdk\platform-tools;$env:Path"

Step 'Clean stale caches'
if ($Fresh) {
  if (Test-Path android\gradlew.bat) { & .\android\gradlew.bat --stop | Out-Null }
  Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
  Remove-Item android -Recurse -Force -ErrorAction SilentlyContinue
}
Remove-Item "$env:USERPROFILE\.gradle\init.d\myket.init.gradle" -Force -ErrorAction SilentlyContinue
Remove-Item "$env:USERPROFILE\.gradle\init.d\myket.gradle" -Force -ErrorAction SilentlyContinue

Step 'Install dependencies'
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { Fail 'npm install failed.' }

Step 'Validate Expo config'
npx expo config --json *> $null
if ($LASTEXITCODE -ne 0) { Fail 'Expo config validation failed.' }

Step 'Expo prebuild'
npx expo prebuild --platform android --clean --no-install
if ($LASTEXITCODE -ne 0) { Fail 'expo prebuild failed.' }

$sdkEscaped=$AndroidSdk.Replace('\','\\').Replace(':','\:')
Set-Content -LiteralPath android\local.properties -Value "sdk.dir=$sdkEscaped" -Encoding ASCII

if ((Test-Path $GradleZip) -and (Test-Path android\gradle\wrapper\gradle-wrapper.properties)) {
  $wrapper=[IO.File]::ReadAllText((Resolve-Path android\gradle\wrapper\gradle-wrapper.properties))
  $uri='file:///' + (($GradleZip -replace '\\','/').TrimStart('/'))
  $wrapper=[regex]::Replace($wrapper,'(?m)^distributionUrl=.*$',"distributionUrl=$uri")
  if ($wrapper -match '(?m)^networkTimeout=') { $wrapper=[regex]::Replace($wrapper,'(?m)^networkTimeout=.*$','networkTimeout=120000') }
  else { $wrapper += "`r`nnetworkTimeout=120000`r`n" }
  [IO.File]::WriteAllText((Resolve-Path android\gradle\wrapper\gradle-wrapper.properties),$wrapper,(New-Object Text.UTF8Encoding($false)))
}

Step 'Gradle release build'
Push-Location android
try {
  .\gradlew.bat --stop | Out-Null
  Remove-Item .gradle,build,app\build -Recurse -Force -ErrorAction SilentlyContinue
  .\gradlew.bat clean assembleRelease --no-daemon --stacktrace --console=plain
  if ($LASTEXITCODE -ne 0) { Fail 'assembleRelease failed.' }
} finally { Pop-Location }

Step 'Collect APK'
$out=Join-Path (Split-Path -Parent $ProjectRoot) 'release\myket\final'
New-Item -ItemType Directory -Path $out -Force | Out-Null
$apks=@(Get-ChildItem android\app\build\outputs\apk\release -Recurse -Filter *.apk -File -ErrorAction SilentlyContinue)
if ($apks.Count -eq 0) { Fail 'No APK generated.' }
$apks | ForEach-Object { Copy-Item $_.FullName (Join-Path $out $_.Name) -Force; Write-Host (Join-Path $out $_.Name) -ForegroundColor Green }
