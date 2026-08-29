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
$AndroidCmdlineZip = 'commandlinetools-win-15859902_latest.zip'
$AndroidCmdlineSha256 = '90ae805d20434428bffcb699c290860f19bb5f66a67e3de801fb04a'
$AndroidMirrorCandidates = @(
  'https://mirrors.aliyun.com/android/repository/',
  'https://mirrors.cloud.tencent.com/AndroidSDK/',
  'https://mirrors.huaweicloud.com/repository/toolkit/android/repository/'
)
$script:ActiveAndroidMirror = $null

function Write-Stage([string]$Name) { Write-Host "`n[environment] $Name" -ForegroundColor Yellow }
function Write-Ok([string]$Text) { Write-Host "[environment] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "[environment] $Text" -ForegroundColor DarkYellow }

# Do not call a native executable with a parameter named $Args: in PowerShell,
# $args is an automatic variable and can cause the intended argument array to be lost.
function Invoke-Checked([string]$File, [string[]]$ToolArgs, [string]$Cwd=$Root) {
  Push-Location -LiteralPath $Cwd
  try {
    Write-Host ('> ' + $File + ' ' + ($ToolArgs -join ' ')) -ForegroundColor DarkGray
    & $File @ToolArgs
    if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "$File exited with code $LASTEXITCODE." }
  } finally { Pop-Location }
}

function Test-Winget { return $null -ne (Get-Command winget.exe -ErrorAction SilentlyContinue) }

function Install-WingetPackage([string]$Id, [string]$DisplayName) {
  if (-not (Test-Winget)) { throw "winget is required to install missing $DisplayName automatically. Install App Installer/winget and rerun the build." }
  Write-Stage "Installing $DisplayName"
  & winget.exe install --id $Id --exact --accept-package-agreements --accept-source-agreements --silent
  if ($LASTEXITCODE -ne 0) { throw "Automatic installation failed for $DisplayName (winget exit code $LASTEXITCODE)." }
}

function Refresh-ProcessPath {
  $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
  $user = [Environment]::GetEnvironmentVariable('Path','User')
  $paths = @()
  if ($machine) { $paths += $machine -split ';' }
  if ($user) { $paths += $user -split ';' }
  $env:Path = (($paths + ($env:Path -split ';')) | Where-Object { $_ -and $_.Trim() } | Select-Object -Unique) -join ';'
}

function Install-Node22Direct {
  Write-Stage 'Downloading and installing Node.js 22.x from the official Node.js distribution'
  $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -TimeoutSec 120
  $release = @($index | Where-Object { $_.version -match '^v22\.\d+\.\d+$' }) | Select-Object -First 1
  if (-not $release) { throw 'Could not find a Node.js 22.x release in the official Node.js distribution index.' }
  $version = [string]$release.version
  $msi = "node-$version-x64.msi"
  $base = "https://nodejs.org/dist/$version/"
  $msiPath = Join-Path $env:TEMP ("khatyar-$msi")
  $shaPath = Join-Path $env:TEMP ("khatyar-$version-SHASUMS256.txt")
  Invoke-WebRequest -Uri ($base + $msi) -OutFile $msiPath -UseBasicParsing -TimeoutSec 180
  Invoke-WebRequest -Uri ($base + 'SHASUMS256.txt') -OutFile $shaPath -UseBasicParsing -TimeoutSec 180
  $expected = $null
  foreach ($line in Get-Content -LiteralPath $shaPath) {
    $parts = $line.Trim() -split '\s+'
    if ($parts.Count -ge 2 -and $parts[$parts.Count-1].TrimStart('*') -eq $msi) { $expected = $parts[0].ToLowerInvariant(); break }
  }
  if (-not $expected) { throw "Could not find SHA-256 for $msi." }
  $actual = (Get-FileHash -LiteralPath $msiPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) { Remove-Item $msiPath,$shaPath -Force -ErrorAction SilentlyContinue; throw "Node.js MSI SHA-256 verification failed for $msi." }
  $p = Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i',$msiPath,'/qn','/norestart') -Wait -PassThru
  if ($p.ExitCode -notin @(0,3010)) { throw "Node.js MSI installation failed with exit code $($p.ExitCode)." }
  Remove-Item $msiPath,$shaPath -Force -ErrorAction SilentlyContinue
  Refresh-ProcessPath
  if (Test-Path 'C:\Program Files\nodejs\node.exe') { $env:Path = "C:\Program Files\nodejs;$env:Path" }
  $raw = (& node.exe --version 2>$null).Trim()
  if ($raw -notmatch '^v22\.') { throw "Node.js 22.x installation could not be verified. Detected: $raw" }
  Write-Ok "Node.js $raw ready."
}

function Ensure-Node {
  Refresh-ProcessPath
  $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($cmd) {
    $raw = (& node.exe --version 2>$null).Trim()
    $m = [regex]::Match($raw, '^v(\d+)\.(\d+)\.(\d+)$')
    if ($m.Success -and [int]$m.Groups[1].Value -eq $RequiredNodeMajor) { Write-Ok "Node.js $raw detected."; return }
    Write-Warn "Node.js $raw detected; Node.js 22.x is required."
  } else { Write-Warn 'Node.js is not installed.' }
  Install-Node22Direct
}

function Get-JavaVersionText { return (& cmd.exe /d /c 'java.exe -version 2>&1' | Out-String) }

function Find-JdkHome {
  $candidates = New-Object System.Collections.Generic.List[string]
  if ($env:JAVA_HOME) { [void]$candidates.Add($env:JAVA_HOME) }
  $registryPaths = @(
    'HKLM:\SOFTWARE\JavaSoft\JDK',
    'HKLM:\SOFTWARE\JavaSoft\Java Development Kit',
    'HKLM:\SOFTWARE\WOW6432Node\JavaSoft\JDK',
    'HKLM:\SOFTWARE\WOW6432Node\JavaSoft\Java Development Kit',
    'HKCU:\SOFTWARE\JavaSoft\JDK',
    'HKCU:\SOFTWARE\JavaSoft\Java Development Kit'
  )
  foreach ($base in $registryPaths) {
    try {
      if (Test-Path $base) {
        $current = (Get-ItemProperty -LiteralPath $base -Name CurrentVersion -ErrorAction SilentlyContinue).CurrentVersion
        if ($current) {
          $props = Get-ItemProperty -LiteralPath (Join-Path $base $current) -Name JavaHome -ErrorAction SilentlyContinue
          if ($props.JavaHome) { [void]$candidates.Add([string]$props.JavaHome) }
        }
        $children = Get-ChildItem -LiteralPath $base -ErrorAction SilentlyContinue
        foreach ($child in $children) {
          $props = Get-ItemProperty -LiteralPath $child.PSPath -Name JavaHome -ErrorAction SilentlyContinue
          if ($props.JavaHome) { [void]$candidates.Add([string]$props.JavaHome) }
        }
      }
    } catch { }
  }
  $knownRoots = @(
    'C:\Program Files\Eclipse Adoptium',
    'C:\Program Files\Java',
    'C:\Program Files\Microsoft',
    'C:\Program Files\Zulu',
    'C:\Program Files\Amazon Corretto'
  )
  foreach ($rootPath in $knownRoots) {
    if (Test-Path $rootPath) {
      $dirs = Get-ChildItem -Path $rootPath -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '(?i)(jdk|java|temurin|corretto|zulu).*17' }
      foreach ($dir in $dirs) { [void]$candidates.Add($dir.FullName) }
    }
  }
  $javaCmd = Get-Command java.exe -ErrorAction SilentlyContinue
  if ($javaCmd) {
    $javaPath = $javaCmd.Source
    if ($javaPath -and (Test-Path $javaPath)) {
      $resolved = (Resolve-Path $javaPath).Path
      $parent = Split-Path $resolved -Parent
      if ((Split-Path $parent -Leaf) -ieq 'bin') { [void]$candidates.Add((Split-Path $parent -Parent)) }
    }
  }
  foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
    try {
      $full = [IO.Path]::GetFullPath($candidate)
      $javaExe = Join-Path $full 'bin\java.exe'
      if (-not (Test-Path $javaExe)) { continue }
      $txt = & cmd.exe /d /c ('"' + $javaExe + '" -version 2>&1') | Out-String
      if ($txt -match 'version\s+"17(?:\.|"|\s)') { return $full }
    } catch { }
  }
  return $null
}

function Ensure-Jdk {
  Refresh-ProcessPath
  $java = Get-Command java.exe -ErrorAction SilentlyContinue
  $ok = $false
  if ($java) {
    $txt = Get-JavaVersionText
    $m = [regex]::Match($txt, 'version\s+"(\d+)(?:\.\d+)?')
    if ($m.Success -and [int]$m.Groups[1].Value -eq $RequiredJdkMajor) { $ok = $true }
    if ($ok) { Write-Ok 'JDK 17 detected.' } else { Write-Warn 'Installed Java is not JDK 17.' }
  } else { Write-Warn 'Java is not installed.' }
  if (-not $ok) { Install-WingetPackage 'EclipseAdoptium.Temurin.17.JDK' 'Eclipse Temurin JDK 17'; Refresh-ProcessPath }
  $jdkHome = Find-JdkHome
  if (-not $jdkHome) { throw 'JDK 17 was installed/detected, but its JAVA_HOME could not be determined from the environment, Windows Java registry, or common JDK installation paths.' }
  $env:JAVA_HOME = $jdkHome
  $env:Path = "$(Join-Path $jdkHome 'bin');$env:Path"
  [Environment]::SetEnvironmentVariable('JAVA_HOME',$jdkHome,'User')
  $check = & cmd.exe /d /c ('"' + (Join-Path $jdkHome 'bin\java.exe') + '" -version 2>&1') | Out-String
  if ($check -notmatch 'version\s+"17(?:\.|"|\s)') { throw 'JAVA_HOME does not point to JDK 17.' }
  Write-Ok "JAVA_HOME=$jdkHome"
}

function Ensure-Git {
  Refresh-ProcessPath
  if (Get-Command git.exe -ErrorAction SilentlyContinue) { Write-Ok 'Git detected.'; return }
  Install-WingetPackage 'Git.Git' 'Git for Windows'; Refresh-ProcessPath
  if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw 'Git installation could not be verified.' }
  Write-Ok 'Git ready.'
}

function Find-AndroidSdk {
  $candidates = @($env:ANDROID_SDK_ROOT,$env:ANDROID_HOME,(Join-Path $env:LOCALAPPDATA 'Android\Sdk'),'C:\Android\Sdk') | Where-Object { $_ } | Select-Object -Unique
  foreach ($p in $candidates) { if (Test-Path (Join-Path $p 'platform-tools\adb.exe')) { return (Resolve-Path $p).Path } }
  return $null
}

function Find-SdkManager([string]$SdkRoot) {
  $paths = @((Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'),(Join-Path $SdkRoot 'cmdline-tools\bin\sdkmanager.bat'),(Join-Path $SdkRoot 'tools\bin\sdkmanager.bat'))
  foreach ($p in $paths) { if (Test-Path $p) { return $p } }
  $found = Get-ChildItem -Path (Join-Path $SdkRoot 'cmdline-tools') -Filter sdkmanager.bat -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { return $found.FullName }; return $null
}

function Test-SdkManager([string]$SdkManager) {
  if (-not $SdkManager -or -not (Test-Path $SdkManager)) { return $false }
  try {
    $outputFile = Join-Path $env:TEMP ('khatyar-sdkmanager-' + [guid]::NewGuid().ToString('N') + '.txt')
    try {
      & cmd.exe /d /c ('"' + $SdkManager + '" --version > "' + $outputFile + '" 2>&1')
      $exit = $LASTEXITCODE
      $text = if (Test-Path $outputFile) { Get-Content -LiteralPath $outputFile -Raw } else { '' }
    } finally { Remove-Item -LiteralPath $outputFile -Force -ErrorAction SilentlyContinue }
    if ($exit -ne 0) { return $false }
    if ($text -match 'NoClassDefFoundError|ClassNotFoundException|javax\.xml\.bind') { return $false }
    return $text -match '\d+\.\d+(?:\.\d+)?'
  } catch { return $false }
}

function Get-AndroidMirrors {
  if ($env:KHATYAR_ANDROID_MIRROR_URL) { return @($env:KHATYAR_ANDROID_MIRROR_URL.TrimEnd('/') + '/') + $AndroidMirrorCandidates }
  return $AndroidMirrorCandidates
}

function Test-AndroidMirror([string]$BaseUrl) {
  $base = $BaseUrl.TrimEnd('/') + '/'
  foreach ($manifest in @('repository2-3.xml','repository2-2.xml','repository2-1.xml')) {
    $tmp = Join-Path $env:TEMP ('khatyar-mirror-' + [guid]::NewGuid().ToString('N') + '.xml')
    try {
      Invoke-WebRequest -Uri ($base + $manifest) -OutFile $tmp -UseBasicParsing -TimeoutSec 30
      if ((Get-Item -LiteralPath $tmp).Length -gt 10000) { return $true }
    } catch { }
    finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
  }
  return $false
}

function Select-AndroidMirror {
  $candidates = @(Get-AndroidMirrors)
  foreach ($base in $candidates) {
    if (Test-AndroidMirror $base) { return ($base.TrimEnd('/') + '/') }
    Write-Warn "Android SDK mirror unavailable: $base"
  }
  if ($env:KHATYAR_ALLOW_GOOGLE -eq '1') { return 'https://dl.google.com/android/repository/' }
  throw 'No accessible non-Google Android SDK mirror was found. Set KHATYAR_ANDROID_MIRROR_URL to a reachable Android repository mirror. Google is disabled by default for Iran-network builds.'
}

function Download-AndroidCommandLineTools([string]$Destination) {
  $lastError = $null
  foreach ($baseUrl in (Get-AndroidMirrors)) {
    try {
      Write-Stage "Downloading Android SDK command-line tools from $baseUrl"
      $url = $baseUrl.TrimEnd('/') + '/' + $AndroidCmdlineZip
      Invoke-WebRequest -Uri $url -OutFile $Destination -UseBasicParsing -TimeoutSec 180
      if (-not (Test-Path $Destination)) { throw 'Download completed without creating the expected archive.' }
      $length = (Get-Item -LiteralPath $Destination).Length
      if ($length -lt 10000000) { throw "Downloaded command-line tools archive is unexpectedly small ($length bytes)." }
      $hash = (Get-FileHash -LiteralPath $Destination -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($hash -ne $AndroidCmdlineSha256.ToLowerInvariant()) { throw "Android command-line tools SHA-256 mismatch from $baseUrl." }
      return $true
    } catch { $lastError = $_; Remove-Item -LiteralPath $Destination -Force -ErrorAction SilentlyContinue }
  }
  throw "Could not download a verified Android command-line tools archive. Last error: $lastError"
}

function Bootstrap-AndroidCommandLineTools([string]$SdkRoot) {
  $archive = Join-Path $env:TEMP $AndroidCmdlineZip
  Download-AndroidCommandLineTools $archive | Out-Null
  $tempDir = Join-Path $env:TEMP ('khatyar-cmdline-tools-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
  Expand-Archive -LiteralPath $archive -DestinationPath $tempDir -Force
  $source = Join-Path $tempDir 'cmdline-tools'
  $target = Join-Path $SdkRoot 'cmdline-tools\latest'
  New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
  if (Test-Path $target) { Remove-Item -LiteralPath $target -Recurse -Force }
  Move-Item -LiteralPath $source -Destination $target
  Remove-Item -LiteralPath $archive,$tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

function Get-SdkPackageRevision([string]$PackagePath) {
  $props = Join-Path $PackagePath 'source.properties'
  if (-not (Test-Path $props)) { return $null }
  $line = Get-Content -LiteralPath $props -ErrorAction SilentlyContinue | Where-Object { $_ -match '^Pkg\.Revision\s*=' } | Select-Object -First 1
  if (-not $line) { return $null }
  return (($line -split '=',2)[1]).Trim()
}

function Test-AndroidPackagePresent([string]$SdkRoot, [string]$Package) {
  switch -Regex ($Package) {
    '^ndk;' { return ((Get-SdkPackageRevision (Join-Path $SdkRoot ('ndk\' + $Package.Substring(4)))) -eq $Package.Substring(4)) }
    '^build-tools;' { return (Test-Path (Join-Path $SdkRoot ('build-tools\' + $Package.Substring(12)))) }
    '^platforms;' { return (Test-Path (Join-Path $SdkRoot ('platforms\' + $Package.Substring(10)))) }
    '^platform-tools$' { return (Test-Path (Join-Path $SdkRoot 'platform-tools\adb.exe')) }
    default { return $false }
  }
}

function Install-AndroidPackagesWithMirrors([string]$SdkManager,[string]$SdkRoot,[string]$Mirror) {
  $packages = @("platform-tools","platforms;$RequiredCompileSdk","build-tools;$RequiredBuildTools","ndk;$RequiredNdk")
  $missing = @($packages | Where-Object { -not (Test-AndroidPackagePresent $SdkRoot $_) })
  if ($missing.Count -eq 0) {
    Write-Ok 'Android SDK components already present and validated; skipping sdkmanager installation.'
    Write-Ok "Using existing NDK $RequiredNdk from $(Join-Path $SdkRoot ('ndk\' + $RequiredNdk))"
    return $Mirror
  }
  Write-Stage "Installing missing Android SDK packages via $Mirror"
  foreach ($base in (Get-AndroidMirrors)) {
    try {
      $env:REPO_OS_OVERRIDE = 'windows'
      $args = @('--sdk_root=' + $SdkRoot,'--no_https') + @($missing)
      & $SdkManager @args
      if ($LASTEXITCODE -eq 0 -and @($missing | Where-Object { -not (Test-AndroidPackagePresent $SdkRoot $_) }).Count -eq 0) { return ($base.TrimEnd('/') + '/') }
    } catch { }
  }
  throw 'Android SDK package installation failed or packages remained missing after installation attempts.'
}

# ... remainder of existing script remains unchanged ...
