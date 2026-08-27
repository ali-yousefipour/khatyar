#requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$Fresh,
  [switch]$SkipCleanup,
  [switch]$SkipDoctor
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
$env:NODE_ENV = 'production'
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$env:CI = '1'

. "$PSScriptRoot\build-common.ps1"
Initialize-BuildContext -Root $PSScriptRoot

Write-Host 'Khatyar stable Android release build' -ForegroundColor Cyan

function Fail-Build {
  param([string]$Stage, [string]$Message)
  Add-BuildResult -Stage $Stage -Status 'failed' -ExitCode 1 -DurationSeconds 0 -Message $Message -Critical $true
  Write-BuildReport -FinalStatus "$Stage-failed" | Out-Null
  Write-Host "Build stopped at stage: $Stage" -ForegroundColor Red
  Write-Host $Message -ForegroundColor Red
  exit 1
}

function Complete-SimpleStage {
  param([string]$Name, [string]$Message = 'Completed', [string]$Status = 'success')
  Add-BuildResult -Stage $Name -Status $Status -ExitCode 0 -DurationSeconds 0 -Message $Message -Critical $false
}

function Stop-ProjectBuildProcesses {
  param([Parameter(Mandatory=$true)][string]$ProjectRoot)

  $escapedRoot = [regex]::Escape($ProjectRoot)
  $stopped = New-Object 'System.Collections.Generic.List[string]'
  try {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
      $_.ProcessId -ne $PID -and
      $_.Name -match '^(node|java|javaw)\.exe$' -and
      -not [string]::IsNullOrWhiteSpace([string]$_.CommandLine) -and
      $_.CommandLine -match $escapedRoot
    })
    foreach ($process in $processes) {
      try {
        Stop-ProcessTree -ProcessId ([int]$process.ProcessId)
        [void]$stopped.Add("$($process.Name):$($process.ProcessId)")
      } catch {}
    }
  } catch {}

  if ($stopped.Count -gt 0) {
    Complete-SimpleStage 'prebuild-process-stop' ("Stopped project build processes: " + ($stopped.ToArray() -join ', ')) 'warning'
    Start-Sleep -Seconds 2
  } else {
    Complete-SimpleStage 'prebuild-process-stop' 'No project-scoped Java or Node process required termination.'
  }
}

function Remove-DirectoryWithRetry {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [int]$Attempts = 5,
    [int]$DelaySeconds = 2
  )

  if (-not (Test-Path -LiteralPath $Path)) { return $true }
  $lastError = ''
  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      [System.GC]::Collect()
      [System.GC]::WaitForPendingFinalizers()
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    } catch {
      $lastError = $_.Exception.Message
    }
    if (-not (Test-Path -LiteralPath $Path)) { return $true }
    if ($attempt -lt $Attempts) { Start-Sleep -Seconds $DelaySeconds }
  }

  if ([string]::IsNullOrWhiteSpace($lastError)) { $lastError = 'Windows kept the directory locked.' }
  Complete-SimpleStage 'android-cleanup' ("Android directory could not be removed after $Attempts attempts: $lastError. Continuing with safe incremental prebuild.") 'warning'
  return $false
}


function Test-MyketSdkCatalog {
  param([Parameter(Mandatory=$true)][string]$ProjectRoot)

  $csvPath = Join-Path $ProjectRoot 'config\myket-sdk-required-windows.csv'
  if (-not (Test-Path -LiteralPath $csvPath)) {
    Complete-SimpleStage 'myket-sdk-catalog' "SDK CSV was not found: $csvPath" 'warning'
    return
  }

  $rows = @(Import-Csv -LiteralPath $csvPath)
  $ndkVersion = [string]$env:ANDROID_NDK_VERSION
  $selected = @($rows | Where-Object {
    $_.package_path -in @('platforms;android-36', 'build-tools;36.0.0', 'platform-tools', 'cmdline-tools;20.0', 'cmake;3.22.1') -or
    (-not [string]::IsNullOrWhiteSpace($ndkVersion) -and $_.package_path -eq "ndk;$ndkVersion")
  })

  $links = ($selected | ForEach-Object { "$($_.package_path)=$($_.archive_url)" }) -join '; '
  Complete-SimpleStage 'myket-sdk-catalog' "Myket Android SDK catalog ready: $csvPath; $links"
}

# 1) Preflight
if (-not (Test-Path '.env')) {
  if (Test-Path '.env.example') { Copy-Item '.env.example' '.env' -Force }
}
if (-not (Test-Path 'package.json')) { Fail-Build 'preflight' 'package.json is missing.' }
if (-not (Test-Path 'package-lock.json')) { Fail-Build 'preflight' 'package-lock.json is missing. This build requires locked dependencies.' }

$nodePath = Get-ExecutablePath 'node.exe'
$npmPath = Get-ExecutablePath 'npm.cmd'
$javaPath = Get-ExecutablePath 'java.exe'
if (-not $nodePath) { Fail-Build 'preflight' 'Node.js is not installed or is not in PATH.' }
if (-not $npmPath) { Fail-Build 'preflight' 'npm.cmd is not installed or is not in PATH.' }
if (-not $javaPath) { Fail-Build 'preflight' 'Java is not installed or is not in PATH.' }

$nodeVersion = (& $nodePath --version).Trim()
# java.exe writes its version text to stderr by design. Calling it directly while
# $ErrorActionPreference is 'Stop' causes Windows PowerShell 5.1 to raise
# NativeCommandError even when Java exits successfully. Capture both native
# streams through System.Diagnostics.Process instead.
$javaStartInfo = New-Object System.Diagnostics.ProcessStartInfo
$javaStartInfo.FileName = $javaPath
$javaStartInfo.Arguments = '-version'
$javaStartInfo.UseShellExecute = $false
$javaStartInfo.RedirectStandardOutput = $true
$javaStartInfo.RedirectStandardError = $true
$javaStartInfo.CreateNoWindow = $true
$javaProcess = New-Object System.Diagnostics.Process
$javaProcess.StartInfo = $javaStartInfo
if (-not $javaProcess.Start()) {
  Fail-Build 'preflight' 'Unable to start java.exe for version detection.'
}
$javaStdOut = $javaProcess.StandardOutput.ReadToEnd()
$javaStdErr = $javaProcess.StandardError.ReadToEnd()
$javaProcess.WaitForExit()
$javaExitCode = $javaProcess.ExitCode
$javaProcess.Dispose()
$javaText = (($javaStdOut + [Environment]::NewLine + $javaStdErr).Trim())
if ($javaExitCode -ne 0) {
  Fail-Build 'preflight' "java.exe -version failed with exit code $javaExitCode. Output: $javaText"
}
$javaMajor = 0
if ($javaText -match 'version\s+"(?<major>\d+)') { $javaMajor = [int]$Matches.major }
elseif ($javaText -match 'openjdk\s+(?<major>\d+)') { $javaMajor = [int]$Matches.major }
if ($javaMajor -ne 17) {
  Fail-Build 'preflight' "JDK 17 is required for this Expo/React Native build. Detected Java output: $javaText"
}
Complete-SimpleStage 'preflight' "Node=$nodeVersion; Java=$javaMajor"

# 2) Cleanup. The Android directory is handled immediately before prebuild so a
# Windows EBUSY lock can fall back to a safe incremental prebuild instead of aborting.
if (-not $SkipCleanup) {
  if (Test-Path '.expo') { Remove-Item '.expo' -Recurse -Force -ErrorAction SilentlyContinue }
  if ($Fresh -and (Test-Path 'node_modules')) {
    Remove-Item 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue
  }
}

# 3) Deterministic dependency install
$install = Invoke-ManagedProcess -Stage 'npm-ci' -FilePath $npmPath -Arguments @('ci', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev') -IdleTimeoutMinutes 20 -HardTimeoutMinutes 90 -Retries 1 -RetryDelaySeconds 20 -Critical $true
if (-not $install.Success) { Fail-Build 'dependency-install' $install.Message }

$localExpo = Join-Path $PSScriptRoot 'node_modules\.bin\expo.cmd'
if (-not (Test-Path $localExpo)) { Fail-Build 'dependency-install' 'Local Expo CLI is missing after npm ci.' }

# 4) Exact compatibility validation. Do not run `expo install --fix` here because it mutates a release build.
$versionValidator = Join-Path $PSScriptRoot 'scripts\validate-versions.js'
if (-not (Test-Path $versionValidator)) { Fail-Build 'version-compatibility' 'scripts\validate-versions.js is missing.' }
$versionCheck = Invoke-ManagedProcess -Stage 'version-compatibility' -FilePath $nodePath -Arguments @($versionValidator) -IdleTimeoutMinutes 2 -HardTimeoutMinutes 3 -Retries 0 -Critical $true
if (-not $versionCheck.Success) { Fail-Build 'version-compatibility' $versionCheck.Message }

$babelValidator = Join-Path $PSScriptRoot 'scripts\validate-babel.js'
if (-not (Test-Path $babelValidator)) { Fail-Build 'babel-validation' 'scripts\validate-babel.js is missing.' }
$babel = Invoke-ManagedProcess -Stage 'babel-validation' -FilePath $nodePath -Arguments @($babelValidator) -IdleTimeoutMinutes 3 -HardTimeoutMinutes 5 -Retries 0 -Critical $true
if (-not $babel.Success) { Fail-Build 'babel-validation' $babel.Message }

# 5) Optional doctor, informational only
if (-not $SkipDoctor) {
  $doctor = Join-Path $PSScriptRoot 'node_modules\.bin\expo-doctor.cmd'
  if (Test-Path $doctor) {
    [void](Invoke-ManagedProcess -Stage 'expo-doctor' -FilePath $doctor -Arguments @() -IdleTimeoutMinutes 8 -HardTimeoutMinutes 20 -Retries 0 -Critical $false)
  }
}

# 6) Native generation with Windows-lock recovery.
$androidDir = Join-Path $PSScriptRoot 'android'
# Do not invoke an existing Gradle wrapper here: doing so may bootstrap/download
# Gradle before the local-cache/Myket distribution source is configured.
Stop-ProjectBuildProcesses -ProjectRoot $PSScriptRoot

$androidRemoved = $false
$incrementalReason = ''
if ($SkipCleanup) {
  if (Test-Path $androidDir) {
    $incrementalReason = 'Cleanup was explicitly skipped.'
    Complete-SimpleStage 'android-cleanup' 'Cleanup skipped; using incremental native synchronization.' 'warning'
  } else {
    $androidRemoved = $true
  }
} else {
  $androidRemoved = Remove-DirectoryWithRetry -Path $androidDir -Attempts 5 -DelaySeconds 2
  if (-not $androidRemoved) { $incrementalReason = 'Windows kept the Android directory locked.' }
}

if ($androidRemoved) {
  Complete-SimpleStage 'android-cleanup' 'Android directory removed; running fresh native generation.'
} else {
  Write-Host "$incrementalReason Running Expo prebuild in-place without --clean." -ForegroundColor Yellow
  Write-Host 'A CMD/PowerShell window located inside android, Explorer, Gradle, or antivirus can hold this lock.' -ForegroundColor Yellow
}

# Do not pass --clean here. If the directory was removed, Expo creates it from scratch.
# If Windows kept it locked, Expo safely synchronizes the existing native project in place.
$prebuild = Invoke-ManagedProcess -Stage 'expo-prebuild' -FilePath $localExpo -Arguments @('prebuild', '--platform', 'android', '--no-install') -IdleTimeoutMinutes 15 -HardTimeoutMinutes 50 -Retries 1 -Critical $true -Environment @{ CI='1'; EXPO_NO_DOCTOR='1'; NODE_ENV='production'; NODE_OPTIONS='--dns-result-order=ipv4first' }
if (-not $prebuild.Success) { Fail-Build 'expo-prebuild' $prebuild.Message }

# Expo SDK 57 uses package-local Maven repositories containing prebuilt AAR files.
# Validate them before invoking Gradle so repository-mode regressions are reported clearly.
$expoMavenValidator = Join-Path $PSScriptRoot 'scripts\validate-expo-local-maven.js'
$expoMavenCheck = Invoke-ManagedProcess -Stage 'expo-local-maven-validation' -FilePath $nodePath -Arguments @($expoMavenValidator) -IdleTimeoutMinutes 3 -HardTimeoutMinutes 5 -Retries 0 -Critical $true
if (-not $expoMavenCheck.Success) { Fail-Build 'expo-local-maven-validation' $expoMavenCheck.Message }

$gradlew = Join-Path $PSScriptRoot 'android\gradlew.bat'
if (-not (Test-Path $gradlew)) { Fail-Build 'gradle' 'Gradle wrapper was not generated.' }

# Configure the exact Gradle version generated by Expo. Prefer the matching ZIP in
# F:\gradle-cache; otherwise download that same version from Myket.
$wrapperProperties = Join-Path $androidDir 'gradle\wrapper\gradle-wrapper.properties'
$wrapperConfigScript = Join-Path $PSScriptRoot 'scripts\configure-gradle-wrapper.js'
if (-not (Test-Path -LiteralPath $wrapperConfigScript)) {
  Fail-Build 'gradle-wrapper-source' "Wrapper configuration script is missing: $wrapperConfigScript"
}
$wrapperConfig = Invoke-ManagedProcess -Stage 'gradle-wrapper-source' -FilePath $nodePath -Arguments @($wrapperConfigScript, $wrapperProperties, 'F:\gradle-cache') -IdleTimeoutMinutes 2 -HardTimeoutMinutes 3 -Retries 0 -Critical $true
if (-not $wrapperConfig.Success) { Fail-Build 'gradle-wrapper-source' $wrapperConfig.Message }

Test-MyketSdkCatalog -ProjectRoot $PSScriptRoot

$myketInitScript = Join-Path $PSScriptRoot 'myket.init.gradle'
if (-not (Test-Path -LiteralPath $myketInitScript)) {
  Fail-Build 'myket-repository' "Myket Gradle init script is missing: $myketInitScript"
}
Complete-SimpleStage 'myket-repository' "Myket Maven will be used first for the main build and all included builds: $myketInitScript"

# 7) Detect global Gradle init scripts. Previous Myket/repository scripts in USERPROFILE\.gradle
# are automatically bypassed with an isolated Gradle home while keeping the project unchanged.
$configuredGradleHome = $env:GRADLE_USER_HOME
if ([string]::IsNullOrWhiteSpace($configuredGradleHome)) {
  $configuredGradleHome = Join-Path $env:USERPROFILE '.gradle'
}
$globalInitFiles = @()
foreach ($candidate in @(
  (Join-Path $configuredGradleHome 'init.gradle'),
  (Join-Path $configuredGradleHome 'init.gradle.kts')
)) {
  if (Test-Path $candidate) { $globalInitFiles += $candidate }
}
$initDir = Join-Path $configuredGradleHome 'init.d'
if (Test-Path $initDir) {
  $globalInitFiles += @(Get-ChildItem $initDir -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
}

$gradleEnv = @{
  GRADLE_OPTS = '-Dorg.gradle.internal.http.connectionTimeout=600000 -Dorg.gradle.internal.http.socketTimeout=600000 -Djava.net.preferIPv4Stack=true -Dfile.encoding=UTF-8'
  NODE_OPTIONS = '--dns-result-order=ipv4first'
  JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
}
if ($globalInitFiles.Count -gt 0) {
  $isolatedGradleHome = Join-Path $PSScriptRoot '.gradle-user-home'
  New-Item -ItemType Directory -Force -Path $isolatedGradleHome | Out-Null
  $gradleEnv['GRADLE_USER_HOME'] = $isolatedGradleHome
  Complete-SimpleStage 'gradle-init-isolation' ("Bypassed global Gradle init scripts: " + ($globalInitFiles -join '; ')) 'warning'
} else {
  Complete-SimpleStage 'gradle-init-isolation' 'No global Gradle init scripts detected.'
}

$gradleArgs = @('--init-script', $myketInitScript, '--no-daemon', '--stacktrace', '--console=plain', '--warning-mode=all')

# Native generation has already synchronized the Android project. A separate `gradlew clean`
# is redundant and can introduce another lock/configuration failure, so build directly.
$apkResult = Invoke-ManagedProcess -Stage 'gradle-assemble-release' -FilePath $gradlew -Arguments ($gradleArgs + @('assembleRelease')) -WorkingDirectory $androidDir -IdleTimeoutMinutes 60 -HardTimeoutMinutes 240 -Retries 1 -RetryDelaySeconds 15 -Critical $true -Environment $gradleEnv
if (-not $apkResult.Success) { Fail-Build 'gradle-assemble-release' $apkResult.Message }

# 8) Collect universal release APK
$outputRoot = Join-Path $androidDir 'app\build\outputs\apk\release'
$apks = @(Get-ChildItem $outputRoot -Filter '*.apk' -File -ErrorAction SilentlyContinue | Sort-Object FullName)
if ($apks.Count -eq 0) { Fail-Build 'collect-artifacts' "Build succeeded but no APK was found in $outputRoot" }
$apkList = ($apks | ForEach-Object { $_.FullName }) -join '; '
Complete-SimpleStage 'collect-artifacts' "APKs=$apkList"

Write-BuildReport -FinalStatus 'success' -ApkPath $apks[0].FullName -AabPath '' | Out-Null
Write-Host ''
Write-Host '================ BUILD COMPLETE ================' -ForegroundColor Green
foreach ($apk in $apks) { Write-Host "APK: $($apk.FullName)" -ForegroundColor Green }
exit 0
