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
$RequiredCompileSdk = 'android-36'
$RequiredBuildTools = '36.0.0'
$RequiredNdk = '27.1.12297006'
$DefaultAndroidMirror = 'https://mirrors.cloud.tencent.com/AndroidSDK/'

function Write-Stage([string]$Text) { Write-Host "`n[environment] $Text" -ForegroundColor Yellow }
function Write-Ok([string]$Text) { Write-Host "[environment] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "[environment] $Text" -ForegroundColor DarkYellow }

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
    $user = [Environment]::GetEnvironmentVariable('Path','User')
    $parts = @()
    if ($machine) { $parts += ($machine -split ';') }
    if ($user) { $parts += ($user -split ';') }
    $parts += ($env:Path -split ';')
    $env:Path = (($parts | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique) -join ';')
}

function Invoke-Native([string]$File,[string[]]$Arguments,[string]$WorkingDirectory=$Root) {
    Push-Location -LiteralPath $WorkingDirectory
    try {
        Write-Host ('> ' + $File + ' ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
        & $File @Arguments
        $code = $LASTEXITCODE
        if ($null -ne $code -and $code -ne 0) { throw "$File exited with code $code." }
    } finally { Pop-Location }
}

function Get-JavaMajor {
    $text = (& cmd.exe /d /c 'java.exe -version 2>&1' | Out-String)
    $m = [regex]::Match($text,'version\s+"(\d+)')
    if (-not $m.Success) { return 0 }
    return [int]$m.Groups[1].Value
}

function Ensure-Node {
    Refresh-Path
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($node) {
        $version = (& node.exe --version 2>$null).Trim()
        $m = [regex]::Match($version,'^v(\d+)\.')
        if ($m.Success -and [int]$m.Groups[1].Value -eq $RequiredNodeMajor) {
            Write-Ok "Node.js $version detected."
            return
        }
    }
    throw 'Node.js 22.x is required but was not found. Install Node.js 22.x and rerun the build.'
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
            $txt = & cmd.exe /d /c ('"' + (Join-Path $rootPath 'bin\java.exe') + '" -version 2>&1') | Out-String
            if ($txt -match 'version\s+"17(?:\.|"|\s)') { return $rootPath }
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

function Ensure-Jdk {
    Refresh-Path
    if (-not (Get-Command java.exe -ErrorAction SilentlyContinue)) { throw 'Java is required but was not found.' }
    if ((Get-JavaMajor) -ne 17) { throw "JDK 17 is required. Detected Java $(Get-JavaMajor)." }
    $jdk = Find-Jdk17
    if ($jdk) {
        $env:JAVA_HOME = $jdk
        $env:Path = "$(Join-Path $jdk 'bin');$env:Path"
        Write-Ok "JDK 17 detected at $jdk."
    } else {
        throw 'JDK 17 is active but JAVA_HOME could not be resolved.'
    }
}

function Ensure-Git {
    Refresh-Path
    if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw 'Git is required but was not found.' }
    Write-Ok 'Git detected.'
}

function Find-AndroidSdk {
    $candidates = @($env:ANDROID_SDK_ROOT,$env:ANDROID_HOME,(Join-Path $env:LOCALAPPDATA 'Android\Sdk'),'C:\Android\Sdk') | Where-Object { $_ } | Select-Object -Unique
    foreach ($path in $candidates) {
        if (Test-Path (Join-Path $path 'platform-tools\adb.exe')) { return [IO.Path]::GetFullPath($path) }
    }
    return [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Android\Sdk'))
}

function Find-SdkManager([string]$SdkRoot) {
    foreach ($path in @(
        (Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'),
        (Join-Path $SdkRoot 'cmdline-tools\bin\sdkmanager.bat'),
        (Join-Path $SdkRoot 'tools\bin\sdkmanager.bat')
    )) { if (Test-Path $path) { return $path } }
    return $null
}

function Test-Ndk([string]$SdkRoot) {
    $props = Join-Path $SdkRoot "ndk\$RequiredNdk\source.properties"
    if (-not (Test-Path $props)) { return $false }
    $line = Get-Content $props -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*Pkg\.Revision\s*=' } | Select-Object -First 1
    return ($line -and (($line -split '=',2)[1]).Trim() -eq $RequiredNdk)
}

function Test-AndroidRequirements([string]$SdkRoot) {
    return (
        (Test-Path (Join-Path $SdkRoot 'platform-tools\adb.exe')) -and
        (Test-Path (Join-Path $SdkRoot "platforms\$RequiredCompileSdk\android.jar")) -and
        (Test-Path (Join-Path $SdkRoot "build-tools\$RequiredBuildTools\aapt2.exe")) -and
        (Test-Ndk $SdkRoot)
    )
}

function Ensure-AndroidSdk {
    $sdk = Find-AndroidSdk
    $env:ANDROID_SDK_ROOT = $sdk
    $env:ANDROID_HOME = $sdk
    $env:Path = "$(Join-Path $sdk 'platform-tools');$env:Path"

    if (Test-AndroidRequirements $sdk) {
        Write-Ok 'Android SDK components already present and validated; skipping sdkmanager installation.'
        Write-Ok "Using existing NDK $RequiredNdk from $(Join-Path $sdk "ndk\$RequiredNdk")"
        return
    }

    $sdkManager = Find-SdkManager $sdk
    if (-not $sdkManager) { throw "Required Android SDK components are missing and sdkmanager.bat was not found under $sdk." }

    $mirror = if ($env:KHATYAR_ANDROID_MIRROR_URL) { $env:KHATYAR_ANDROID_MIRROR_URL.TrimEnd('/') + '/' } else { $DefaultAndroidMirror }
    $env:SDK_TEST_BASE_URL = $mirror
    $required = @('platform-tools',"platforms;$RequiredCompileSdk","build-tools;$RequiredBuildTools","ndk;$RequiredNdk")
    $missing = @($required | Where-Object {
        switch -Regex ($_){
            '^platform-tools$' { -not (Test-Path (Join-Path $sdk 'platform-tools\adb.exe')) }
            '^platforms;(.+)$' { -not (Test-Path (Join-Path $sdk ("platforms\" + $Matches[1] + '\android.jar'))) }
            '^build-tools;(.+)$' { -not (Test-Path (Join-Path $sdk ("build-tools\" + $Matches[1] + '\aapt2.exe'))) }
            '^ndk;(.+)$' { -not (Test-Ndk $sdk) }
        }
    })
    if ($missing.Count -eq 0) { return }

    Write-Stage "Installing missing Android SDK components via $mirror"
    1..30 | ForEach-Object { 'y' } | & $sdkManager --sdk_root=$sdk --licenses | Out-Null
    & $sdkManager --sdk_root=$sdk @missing
    if ($LASTEXITCODE -ne 0) { throw "sdkmanager failed with exit code $LASTEXITCODE." }
    if (-not (Test-AndroidRequirements $sdk)) { throw 'Required Android SDK components are still missing after installation.' }
    Write-Ok "Android SDK packages ready via $mirror"
}

function Ensure-Npm {
    if ($SkipNpm) { Write-Ok 'npm dependency preparation explicitly skipped.'; return }
    $expo = Join-Path $Root 'node_modules\expo\package.json'
    if (-not $Fresh -and (Test-Path $expo)) {
        Write-Ok 'npm dependencies already installed.'
        return
    }
    $installer = Join-Path $Root 'scripts\install-dependencies-fallback.ps1'
    if (-not (Test-Path $installer)) { throw 'Dependency fallback installer is missing.' }
    Write-Stage 'Installing project npm dependencies with the configured mirror-first fallback policy'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installer -Ci
    if ($LASTEXITCODE -ne 0) { throw "npm dependency installation failed with exit code $LASTEXITCODE." }
    if (-not (Test-Path $expo)) { throw 'Expo dependency is still missing after npm installation.' }
    Write-Ok 'Project npm dependencies ready.'
}

Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '       KHATYAR - BUILD ENVIRONMENT PREPARATION' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '[environment] Local valid installations are reused; network is used only for missing prerequisites.' -ForegroundColor Cyan

Ensure-Node
Ensure-Jdk
Ensure-Git
Ensure-AndroidSdk
Ensure-Npm

Write-Stage 'Validating required toolchain'
Invoke-Native 'node.exe' @('--version')
Invoke-Native 'npm.cmd' @('--version')
& cmd.exe /d /c 'java.exe -version 2>&1'
if ($LASTEXITCODE -ne 0) { throw "java.exe exited with code $LASTEXITCODE." }
Invoke-Native 'git.exe' @('--version')
Invoke-Native (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe') @('version')
Write-Ok 'Build environment preparation completed successfully.'
