#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipNpm
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Set-Location -LiteralPath $Root

$RequiredNodeMajor = 22
$RequiredJdkMajor = 17
$RequiredCompileSdk = 'android-36'
$RequiredBuildTools = '36.0.0'
$RequiredNdk = '27.1.12297006'
$DefaultAndroidMirror = 'https://mirrors.cloud.tencent.com/AndroidSDK/'

function Write-Stage([string]$Text) { Write-Host "`n[environment] $Text" -ForegroundColor Yellow }
function Write-Ok([string]$Text) { Write-Host "[environment] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "[environment] $Text" -ForegroundColor DarkYellow }
function Fail([string]$Text) { throw $Text }

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
    $user = [Environment]::GetEnvironmentVariable('Path','User')
    $parts = @()
    if ($machine) { $parts += ($machine -split ';') }
    if ($user) { $parts += ($user -split ';') }
    $parts += ($env:Path -split ';')
    $env:Path = (($parts | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique) -join ';')
}

function Invoke-Native([string]$File, [string[]]$Arguments, [string]$WorkingDirectory=$Root) {
    Push-Location -LiteralPath $WorkingDirectory
    try {
        Write-Host ('> ' + $File + ' ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
        & $File @Arguments
        $code = $LASTEXITCODE
        if ($null -ne $code -and $code -ne 0) { throw "$File exited with code $code." }
    } finally {
        Pop-Location
    }
}

function Get-JavaMajor {
    $text = (& cmd.exe /d /c 'java.exe -version 2>&1' | Out-String)
    $m = [regex]::Match($text, 'version\s+"(\d+)(?:\.\d+)?')
    if (-not $m.Success) { return 0 }
    return [int]$m.Groups[1].Value
}

function Find-Jdk17 {
    $roots = @(
        $env:JAVA_HOME,
        'C:\Program Files\Java',
        'C:\Program Files\Eclipse Adoptium',
        'C:\Program Files\Microsoft',
        'C:\Program Files\Zulu',
        'C:\Program Files\Amazon Corretto'
    ) | Where-Object { $_ } | Select-Object -Unique

    foreach ($rootPath in $roots) {
        if (-not (Test-Path $rootPath)) { continue }
        if (Test-Path (Join-Path $rootPath 'bin\java.exe')) {
            if ((& cmd.exe /d /c ('"' + (Join-Path $rootPath 'bin\java.exe') + '" -version 2>&1') | Out-String) -match 'version\s+"17(?:\.|"|\s)') { return $rootPath }
        }
        foreach ($dir in (Get-ChildItem -Path $rootPath -Directory -ErrorAction SilentlyContinue)) {
            $java = Join-Path $dir.FullName 'bin\java.exe'
            if (Test-Path $java) {
                $txt = & cmd.exe /d /c ('"' + $java + '" -version 2>&1') | Out-String
                if ($txt -match 'version\s+"17(?:\.|"|\s)') { return $dir.FullName }
            }
        }
    }
    return $null
}

function Ensure-Node {
    Refresh-Path
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($node) {
        $version = (& node.exe --version 2>$null).Trim()
        $m = [regex]::Match($version, '^v(\d+)\.')
        if ($m.Success -and [int]$m.Groups[1].Value -eq $RequiredNodeMajor) {
            Write-Ok "Node.js $version detected."
            return
        }
    }
    Write-Stage 'Installing Node.js 22.x'
    $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -TimeoutSec 120
    $release = @($index | Where-Object { $_.version -match '^v22\.\d+\.\d+$' }) | Select-Object -First 1
    if (-not $release) { Fail 'Could not find a Node.js 22.x release.' }
    $version = [string]$release.version
    $msi = "node-$version-x64.msi"
    $base = "https://nodejs.org/dist/$version/"
    $msiPath = Join-Path $env:TEMP "khatyar-$msi"
    $sumPath = Join-Path $env:TEMP "khatyar-$version-SHASUMS256.txt"
    Invoke-WebRequest -Uri ($base + $msi) -OutFile $msiPath -UseBasicParsing -TimeoutSec 180
    Invoke-WebRequest -Uri ($base + 'SHASUMS256.txt') -OutFile $sumPath -UseBasicParsing -TimeoutSec 180
    $expected = $null
    foreach ($line in Get-Content $sumPath) {
        $p = $line.Trim() -split '\s+'
        if ($p.Count -ge 2 -and $p[-1].TrimStart('*') -eq $msi) { $expected = $p[0].ToLowerInvariant(); break }
    }
    if (-not $expected) { Fail "SHA-256 for $msi was not found." }
    $actual = (Get-FileHash $msiPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { Fail 'Node.js MSI SHA-256 verification failed.' }
    $p = Start-Process msiexec.exe -ArgumentList @('/i',$msiPath,'/qn','/norestart') -Wait -PassThru
    if ($p.ExitCode -notin @(0,3010)) { Fail "Node.js installation failed with exit code $($p.ExitCode)." }
    Remove-Item $msiPath,$sumPath -Force -ErrorAction SilentlyContinue
    Refresh-Path
    if (Test-Path 'C:\Program Files\nodejs\node.exe') { $env:Path = "C:\Program Files\nodejs;$env:Path" }
    $installed = (& node.exe --version 2>$null).Trim()
    if ($installed -notmatch '^v22\.') { Fail "Node.js 22.x could not be verified. Detected: $installed" }
    Write-Ok "Node.js $installed ready."
}

function Ensure-Jdk {
    Refresh-Path
    $jdk = Find-Jdk17
    if ($jdk -and (Get-JavaMajor) -eq $RequiredJdkMajor) {
        $env:JAVA_HOME = $jdk
        $env:Path = "$(Join-Path $jdk 'bin');$env:Path"
        Write-Ok "JDK 17 detected at $jdk."
        return
    }
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) { Fail 'JDK 17 is missing and winget is unavailable for automatic installation.' }
    Write-Stage 'Installing JDK 17'
    & winget.exe install --id EclipseAdoptium.Temurin.17.JDK --exact --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) { Fail "JDK 17 installation failed (winget exit code $LASTEXITCODE)." }
    Refresh-Path
    $jdk = Find-Jdk17
    if (-not $jdk) { Fail 'JDK 17 was installed but could not be located.' }
    $env:JAVA_HOME = $jdk
    $env:Path = "$(Join-Path $jdk 'bin');$env:Path"
    [Environment]::SetEnvironmentVariable('JAVA_HOME',$jdk,'User')
    Write-Ok "JAVA_HOME=$jdk"
}

function Ensure-Git {
    Refresh-Path
    if (Get-Command git.exe -ErrorAction SilentlyContinue) { Write-Ok 'Git detected.'; return }
    $winget = Get-Command winget.exe -ErrorAction SilentlyContinue
    if (-not $winget) { Fail 'Git is missing and winget is unavailable for automatic installation.' }
    Write-Stage 'Installing Git for Windows'
    & winget.exe install --id Git.Git --exact --accept-package-agreements --accept-source-agreements --silent
    if ($LASTEXITCODE -ne 0) { Fail "Git installation failed (winget exit code $LASTEXITCODE)." }
    Refresh-Path
    if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { Fail 'Git installation could not be verified.' }
    Write-Ok 'Git ready.'
}

function Find-AndroidSdk {
    $candidates = @($env:ANDROID_SDK_ROOT,$env:ANDROID_HOME,(Join-Path $env:LOCALAPPDATA 'Android\Sdk'),'C:\Android\Sdk') | Where-Object { $_ } | Select-Object -Unique
    foreach ($path in $candidates) {
        if (Test-Path (Join-Path $path 'platform-tools\adb.exe')) { return [IO.Path]::GetFullPath($path) }
    }
    return $null
}

function Find-SdkManager([string]$SdkRoot) {
    foreach ($path in @(
        (Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'),
        (Join-Path $SdkRoot 'cmdline-tools\bin\sdkmanager.bat'),
        (Join-Path $SdkRoot 'tools\bin\sdkmanager.bat')
    )) { if (Test-Path $path) { return $path } }
    return $null
}

function Get-NdkRevision([string]$SdkRoot) {
    $props = Join-Path $SdkRoot "ndk\$RequiredNdk\source.properties"
    if (-not (Test-Path $props)) { return $null }
    $line = Get-Content $props -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*Pkg\.Revision\s*=' } | Select-Object -First 1
    if (-not $line) { return $null }
    return (($line -split '=',2)[1]).Trim()
}

function Test-AndroidRequirements([string]$SdkRoot) {
    return (
        (Test-Path (Join-Path $SdkRoot 'platform-tools\adb.exe')) -and
        (Test-Path (Join-Path $SdkRoot "platforms\$RequiredCompileSdk\android.jar")) -and
        (Test-Path (Join-Path $SdkRoot "build-tools\$RequiredBuildTools\aapt2.exe")) -and
        ((Get-NdkRevision $SdkRoot) -eq $RequiredNdk)
    )
}

function Download-CmdlineTools([string]$Destination) {
    $mirror = if ($env:KHATYAR_ANDROID_MIRROR_URL) { $env:KHATYAR_ANDROID_MIRROR_URL } else { $DefaultAndroidMirror }
    $url = $mirror.TrimEnd('/') + '/commandlinetools-win-15859902_latest.zip'
    Invoke-WebRequest -Uri $url -OutFile $Destination -UseBasicParsing -TimeoutSec 180
    if ((Get-Item $Destination).Length -lt 10MB) { Fail 'Downloaded Android command-line tools archive is unexpectedly small.' }
}

function Ensure-AndroidSdk {
    $sdk = Find-AndroidSdk
    if (-not $sdk) { $sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
    New-Item -ItemType Directory -Force -Path $sdk | Out-Null

    # Reuse first. Do not probe mirrors or call sdkmanager when the local SDK is already complete.
    if (Test-AndroidRequirements $sdk) {
        $env:ANDROID_SDK_ROOT = $sdk
        $env:ANDROID_HOME = $sdk
        $env:Path = "$(Join-Path $sdk 'platform-tools');$env:Path"
        [Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT',$sdk,'User')
        [Environment]::SetEnvironmentVariable('ANDROID_HOME',$sdk,'User')
        Write-Ok 'Android SDK components already present and validated; skipping sdkmanager installation.'
        Write-Ok "Using existing NDK $RequiredNdk from $(Join-Path $sdk "ndk\$RequiredNdk")"
        return
    }

    $sdkManager = Find-SdkManager $sdk
    if (-not $sdkManager) {
        Write-Stage 'Installing Android SDK command-line tools'
        $zip = Join-Path $env:TEMP 'khatyar-commandlinetools.zip'
        Download-CmdlineTools $zip
        $stage = Join-Path $env:TEMP ('khatyar-cmdline-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Force -Path $stage | Out-Null
        Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
        $source = Join-Path $stage 'cmdline-tools'
        $target = Join-Path $sdk 'cmdline-tools\latest'
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        if (Test-Path $target) { Remove-Item $target -Recurse -Force }
        Move-Item $source $target
        Remove-Item $stage,$zip -Recurse -Force -ErrorAction SilentlyContinue
        $sdkManager = Find-SdkManager $sdk
    }
    if (-not $sdkManager) { Fail "sdkmanager.bat was not found under $sdk." }

    $env:ANDROID_SDK_ROOT = $sdk
    $env:ANDROID_HOME = $sdk
    $env:Path = "$(Join-Path $sdk 'platform-tools');$(Split-Path $sdkManager -Parent);$env:Path"
    $mirror = if ($env:KHATYAR_ANDROID_MIRROR_URL) { $env:KHATYAR_ANDROID_MIRROR_URL } else { $DefaultAndroidMirror }
    $env:SDK_TEST_BASE_URL = $mirror.TrimEnd('/') + '/'
    Write-Stage "Installing missing Android SDK components via $($env:SDK_TEST_BASE_URL)"
    1..30 | ForEach-Object { 'y' } | & $sdkManager --sdk_root=$sdk --licenses | Out-Null
    & $sdkManager --sdk_root=$sdk 'platform-tools' "platforms;$RequiredCompileSdk" "build-tools;$RequiredBuildTools" "ndk;$RequiredNdk"
    if ($LASTEXITCODE -ne 0) { Fail "sdkmanager failed with exit code $LASTEXITCODE." }
    if (-not (Test-AndroidRequirements $sdk)) { Fail 'Required Android SDK components are still missing after installation.' }
    [Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT',$sdk,'User')
    [Environment]::SetEnvironmentVariable('ANDROID_HOME',$sdk,'User')
    Write-Ok "Android SDK packages ready via $($env:SDK_TEST_BASE_URL)"
    Write-Ok "Using NDK $RequiredNdk"
}

function Ensure-NpmDependencies {
    if ($SkipNpm) { Write-Ok 'npm dependency installation explicitly skipped.'; return }
    $expoPackage = Join-Path $Root 'node_modules\expo\package.json'
    if (-not $Fresh -and (Test-Path $expoPackage)) {
        Write-Ok 'npm dependencies already installed.'
        return
    }
    $installer = Join-Path $Root 'scripts\install-dependencies-fallback.ps1'
    if (-not (Test-Path $installer)) { Fail 'Dependency fallback installer is missing.' }
    Write-Stage 'Installing project npm dependencies with the configured mirror fallback policy'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -Ci
    if ($LASTEXITCODE -ne 0) { Fail "npm dependency installation failed (exit code $LASTEXITCODE)." }
    if (-not (Test-Path $expoPackage)) { Fail 'Expo dependency is still missing after npm installation.' }
    Write-Ok 'Project npm dependencies ready.'
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '       KHATYAR - BUILD ENVIRONMENT PREPARATION' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '[environment] Preparing only missing prerequisites; valid existing installations are reused.' -ForegroundColor Cyan

Ensure-Node
Ensure-Jdk
Ensure-Git
Ensure-AndroidSdk
Ensure-NpmDependencies

Write-Stage 'Validating required toolchain'
Invoke-Native 'node.exe' @('--version')
Invoke-Native 'npm.cmd' @('--version')
& cmd.exe /d /c 'java.exe -version 2>&1'
if ($LASTEXITCODE -ne 0) { Fail "java.exe exited with code $LASTEXITCODE." }
Invoke-Native 'git.exe' @('--version')
Invoke-Native (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe') @('version')
Write-Ok 'Build environment preparation completed successfully.'
