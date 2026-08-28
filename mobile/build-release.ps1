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

$ScriptRoot = $PSScriptRoot
$Remote = 'origin'
$Branch = 'main'
$StashCreated = $false
$StashMessage = 'khatyar-build-autostash-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$BackupBranch = $null
$BuildStart = Get-Date
$CurrentStage = 'Initializing'
$TotalStages = 9
$StageIndex = 0
$GitRepoRoot = $null

function Format-Duration([TimeSpan]$Duration) {
  if ($Duration.TotalHours -ge 1) { return $Duration.ToString('hh\:mm\:ss') }
  return $Duration.ToString('mm\:ss')
}

function Write-Stage {
  param([string]$Name, [int]$Index)
  $script:CurrentStage = $Name
  $script:StageIndex = $Index
  $pct = [math]::Min(100, [math]::Round(($Index / $TotalStages) * 100))
  $elapsed = (Get-Date) - $BuildStart
  Write-Host ''
  Write-Host ('[' + $pct.ToString('000') + '%] ' + $Name) -ForegroundColor Cyan
  Write-Host ('    Elapsed: ' + (Format-Duration $elapsed)) -ForegroundColor DarkGray
}

function Write-ProgressLine {
  param([int]$Percent, [string]$Activity, [string]$Status, [int]$SecondsRemaining = 0)
  $elapsed = (Get-Date) - $BuildStart
  $safePercent = [math]::Min(100,[math]::Max(0,$Percent))
  $barWidth = 40
  $filled = [int][math]::Floor($barWidth * $safePercent / 100)
  $bar = ('#' * $filled) + ('-' * ($barWidth - $filled))
  $eta = if ($SecondsRemaining -gt 0) { Format-Duration ([TimeSpan]::FromSeconds($SecondsRemaining)) } else { '--:--' }
  Write-Progress -Id 1 -Activity $Activity -Status $Status -PercentComplete $safePercent -SecondsRemaining ([math]::Max(0,$SecondsRemaining))
  Write-Host ("`r{0,3}% [{1}] {2} | Elapsed {3} | ETA {4}" -f $safePercent,$bar,$Status,(Format-Duration $elapsed),$eta) -NoNewline
}

function Invoke-Git {
  param([Parameter(Mandatory=$true)][string[]]$Arguments)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'git.exe'
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.WorkingDirectory = $ScriptRoot
  foreach ($arg in $Arguments) {
    $escaped = $arg -replace '(\\*)"', '$1$1\\"'
    $escaped = $escaped -replace '(\\+)$', '$1$1'
    $psi.Arguments += ' "' + $escaped + '"'
  }
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  try {
    [void]$p.Start()
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    return [pscustomobject]@{
      Output = @($stdout -split "`r?`n" | Where-Object { $_ -ne '' })
      Error = @($stderr -split "`r?`n" | Where-Object { $_ -ne '' })
      ExitCode = $p.ExitCode
    }
  } finally {
    $p.Dispose()
  }
}

function Invoke-Native {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string[]]$Arguments,
    [string]$WorkingDirectory = $ScriptRoot
  )
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $FilePath
  $psi.WorkingDirectory = $WorkingDirectory
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  foreach ($arg in $Arguments) {
    $escaped = $arg -replace '(\\*)"', '$1$1\\"'
    $escaped = $escaped -replace '(\\+)$', '$1$1'
    $psi.Arguments += ' "' + $escaped + '"'
  }
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  try {
    [void]$p.Start()
    while (-not $p.HasExited) {
      $line = $p.StandardOutput.ReadLine()
      if ($null -ne $line -and $line -ne '') { Write-Host $line }
      Start-Sleep -Milliseconds 100
    }
    while (-not $p.StandardOutput.EndOfStream) {
      $line = $p.StandardOutput.ReadLine()
      if ($line) { Write-Host $line }
    }
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    if ($stderr) { Write-Host $stderr -ForegroundColor DarkYellow }
    return $p.ExitCode
  } finally {
    $p.Dispose()
  }
}

function Fail-Sync([string]$Message) {
  Write-Progress -Id 1 -Activity 'Khatyar Android Release Build' -Completed -ErrorAction SilentlyContinue
  Write-Host ''
  Write-Host ('BUILD STOPPED: ' + $Message) -ForegroundColor Red
  exit 1
}

function Get-GitStatusClean {
  $r = Invoke-Git @('status','--porcelain')
  if ($r.ExitCode -ne 0) { Fail-Sync ('Unable to read Git status: ' + (($r.Output + $r.Error) -join ' ')) }
  return (@($r.Output).Count -eq 0)
}

function Get-RefSha([string]$Ref) {
  $r = Invoke-Git @('rev-parse',$Ref)
  if ($r.ExitCode -ne 0) { return $null }
  return ((@($r.Output) -join '').Trim())
}

function Restore-WorkSafely {
  if ($script:StashCreated) {
    Write-Host ''
    Write-Host 'Restoring local uncommitted changes...' -ForegroundColor Yellow
    $pop = Invoke-Git @('stash','pop')
    if ($pop.ExitCode -ne 0) {
      Write-Host 'WARNING: The stash was preserved. Run git stash list to recover it.' -ForegroundColor Red
      return $false
    }
    Write-Host 'Local changes restored successfully.' -ForegroundColor Green
    $script:StashCreated = $false
  }
  return $true
}

function Test-CommandAvailable([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-CommandAvailable 'git.exe')) { Fail-Sync 'Git is not installed or is not available in PATH.' }

$repoCheck = Invoke-Git @('rev-parse','--show-toplevel')
if ($repoCheck.ExitCode -ne 0 -or @($repoCheck.Output).Count -eq 0) {
  $candidate = $ScriptRoot
  while ($candidate) {
    if (Test-Path -LiteralPath (Join-Path $candidate '.git')) {
      $GitRepoRoot = $candidate
      break
    }
    $parent = Split-Path -Parent $candidate
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $candidate) { break }
    $candidate = $parent
  }
  if ($GitRepoRoot) { $repoCheck = Invoke-Git @('-C',$GitRepoRoot,'rev-parse','--show-toplevel') }
}
if ($repoCheck.ExitCode -ne 0 -or @($repoCheck.Output).Count -eq 0) {
  Fail-Sync ('This build directory is not inside a Git repository. Build path: ' + $ScriptRoot)
}
$GitRepoRoot = ((@($repoCheck.Output) -join '').Trim())

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '       KHATYAR - ANDROID RELEASE BUILD' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host ''
Write-Host ('Git repository: ' + $GitRepoRoot) -ForegroundColor DarkGray
Write-Host ('Build directory: ' + $ScriptRoot) -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
$answer = (Read-Host 'Download from GitHub').Trim().ToUpperInvariant()
if ($answer -notin @('Y','N')) { Fail-Sync 'Please answer Y or N.' }

Write-Stage 'Fetching GitHub main branch' 1
$fetch = Invoke-Git @('fetch',$Remote,$Branch)
if ($fetch.ExitCode -ne 0) { Fail-Sync ('GitHub fetch failed: ' + (($fetch.Output + $fetch.Error) -join ' ')) }

$localSha = Get-RefSha 'HEAD'
$remoteSha = Get-RefSha ($Remote + '/' + $Branch)
if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) { Fail-Sync 'Unable to determine local or GitHub commit SHA.' }

if ($answer -eq 'Y') {
  Write-Stage 'Preparing local workspace' 2
  if (-not (Get-GitStatusClean)) {
    Write-Host 'Local uncommitted changes detected. Stashing temporarily...' -ForegroundColor Yellow
    $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
    if ($stash.ExitCode -ne 0) { Fail-Sync ('Unable to safely stash local changes: ' + (($stash.Output + $stash.Error) -join ' ')) }
    $script:StashCreated = $true
    Write-Host 'Local changes safely stashed.' -ForegroundColor Green
  }
  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha ($Remote + '/' + $Branch)
  if ($localSha -ne $remoteSha) {
    $backupName = 'build-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    $backup = Invoke-Git @('branch',$backupName,'HEAD')
    if ($backup.ExitCode -ne 0) { [void](Restore-WorkSafely); Fail-Sync ('Unable to create backup branch: ' + (($backup.Output + $backup.Error) -join ' ')) }
    $script:BackupBranch = $backupName
    Write-Host ('Local commits preserved on backup branch: ' + $backupName) -ForegroundColor Yellow
    Write-Host 'Synchronizing local branch with GitHub main...' -ForegroundColor Cyan
    $reset = Invoke-Git @('reset','--hard',($Remote + '/' + $Branch))
    if ($reset.ExitCode -ne 0) { [void](Restore-WorkSafely); Fail-Sync ('Unable to synchronize local files: ' + (($reset.Output + $reset.Error) -join ' ')) }
  }
  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha ($Remote + '/' + $Branch)
  if ($localSha -ne $remoteSha) { [void](Restore-WorkSafely); Fail-Sync ('Synchronization verification failed. Local=' + $localSha + ' GitHub=' + $remoteSha) }
  if (-not (Get-GitStatusClean)) { [void](Restore-WorkSafely); Fail-Sync 'Working tree is not clean after synchronization.' }
  Write-Host ('GitHub synchronization verified. Source commit: ' + $localSha) -ForegroundColor Green
} else {
  if ($localSha -ne $remoteSha) { Fail-Sync ('Local version is not equal to GitHub. Local=' + $localSha + ' GitHub=' + $remoteSha + '. Choose Y to download the latest files.') }
  if (-not (Get-GitStatusClean)) { Fail-Sync 'Local uncommitted changes are present. Choose Y to safely stash them while building.' }
  Write-Host ('Local version matches GitHub. Source commit: ' + $localSha) -ForegroundColor Green
}

Write-Stage 'Checking Node.js and npm environment' 3
if (-not (Test-CommandAvailable 'node.exe')) { Fail-Sync 'Node.js is required for the Android build but was not found in PATH.' }
if (-not (Test-CommandAvailable 'npm.cmd')) { Fail-Sync 'npm is required for the Android build but was not found in PATH.' }

$packageJson = Join-Path $ScriptRoot 'package.json'
$packageLock = Join-Path $ScriptRoot 'package-lock.json'
if (-not (Test-Path -LiteralPath $packageJson)) { Fail-Sync 'mobile/package.json was not found.' }
if (-not (Test-Path -LiteralPath $packageLock)) { Fail-Sync 'mobile/package-lock.json was not found. Cannot perform a reproducible dependency installation.' }

$nodeModules = Join-Path $ScriptRoot 'node_modules'
$reactNativeGradlePlugin = Join-Path $nodeModules '@react-native\gradle-plugin'
$expoCli = Join-Path $nodeModules 'expo\bin\cli'

if (-not (Test-Path -LiteralPath $reactNativeGradlePlugin)) {
  Write-Host 'React Native Gradle plugin is missing. Installing locked npm dependencies...' -ForegroundColor Yellow
  $npmExit = Invoke-Native 'npm.cmd' @('ci','--no-audit','--no-fund') $ScriptRoot
  if ($npmExit -ne 0) { Fail-Sync ('npm ci failed with exit code ' + $npmExit + '.') }
}

if (-not (Test-Path -LiteralPath $reactNativeGradlePlugin)) {
  Fail-Sync 'React Native Gradle plugin is still missing after npm ci. The dependency tree is incomplete.'
}

Write-Stage 'Validating and preparing Android Gradle project' 4
$androidDir = Join-Path $ScriptRoot 'android'
$gradlew = Join-Path $androidDir 'gradlew.bat'
$settingsGradle = Join-Path $androidDir 'settings.gradle'

if (-not (Test-Path -LiteralPath $gradlew)) {
  Write-Host 'Android project is missing. Generating it with Expo prebuild...' -ForegroundColor Yellow
  $prebuildExit = Invoke-Native 'npx.cmd' @('expo','prebuild','--platform','android') $ScriptRoot
  if ($prebuildExit -ne 0) { Fail-Sync ('Expo prebuild failed with exit code ' + $prebuildExit + '.') }
}

if (-not (Test-Path -LiteralPath $settingsGradle)) { Fail-Sync 'android/settings.gradle was not found after Android project preparation.' }

# The reported failure "Plugin [id: com.facebook.react.settings] was not found"
# occurs when the generated React Native Gradle plugin is not included by the
# Android settings file. Repair only the missing includeBuild line; do not
# replace the complete settings file because this project may contain local
# Myket/Gradle configuration.
$settingsText = Get-Content -LiteralPath $settingsGradle -Raw -Encoding UTF8
$requiredInclude = "includeBuild('../node_modules/@react-native/gradle-plugin')"
if (($settingsText -notmatch [regex]::Escape($requiredInclude)) -and ($settingsText -match "com\.facebook\.react\.settings")) {
  Write-Host 'React Native Gradle plugin includeBuild is missing from settings.gradle. Repairing it...' -ForegroundColor Yellow
  $settingsText = $requiredInclude + "`r`n" + $settingsText
  [System.IO.File]::WriteAllText($settingsGradle, $settingsText, (New-Object System.Text.UTF8Encoding($false)))
}

if ($settingsText -match "com\.facebook\.react\.settings" -and $settingsText -notmatch [regex]::Escape($requiredInclude)) {
  Fail-Sync 'settings.gradle still does not include the React Native Gradle plugin.'
}

Write-Stage 'Checking Java and Gradle toolchain' 5
if (-not (Test-CommandAvailable 'java.exe')) { Fail-Sync 'Java was not found in PATH.' }
$javaVersion = Invoke-Native 'java.exe' @('-version') $ScriptRoot
if ($javaVersion -ne 0) { Fail-Sync 'Java could not be executed.' }

Write-Stage 'Starting Gradle assembleRelease' 6
$buildExitCode = 0
$proc = $null
try {
  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  $processInfo.FileName = $gradlew
  $processInfo.WorkingDirectory = $androidDir
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $false
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true
  $processInfo.Arguments = 'assembleRelease --console=plain --stacktrace'
  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $processInfo
  [void]$proc.Start()
  $lastPercent = 50
  $lastTick = Get-Date
  $seenStages = @{}
  while (-not $proc.HasExited) {
    while (-not $proc.StandardOutput.EndOfStream) {
      $line = $proc.StandardOutput.ReadLine()
      if ($line) {
        Write-Host $line
        if ($line -match ':app:compileReleaseJavaWithJavac|compileReleaseKotlin') { $lastPercent = 58; $script:CurrentStage = 'Compiling Android source code' }
        elseif ($line -match 'createBundleReleaseJsAndAssets|bundleReleaseJsAndAssets') { $lastPercent = 65; $script:CurrentStage = 'Bundling JavaScript and Hermes assets' }
        elseif ($line -match 'mergeReleaseResources') { $lastPercent = 75; $script:CurrentStage = 'Merging Android release resources' }
        elseif ($line -match 'mergeReleaseNativeLibs') { $lastPercent = 82; $script:CurrentStage = 'Merging native libraries' }
        elseif ($line -match ':app:packageRelease') { $lastPercent = 92; $script:CurrentStage = 'Packaging release APK' }
        elseif ($line -match ':app:createReleaseApkListing') { $lastPercent = 97; $script:CurrentStage = 'Creating APK listing' }
      }
    }
    $elapsedSeconds = ((Get-Date) - $BuildStart).TotalSeconds
    # A conservative ETA based on the current percentage. It is deliberately
    # approximate because Gradle task durations vary significantly by cache state.
    $etaSeconds = if ($lastPercent -gt 5 -and $elapsedSeconds -gt 10) {
      [int][math]::Max(1, (($elapsedSeconds / $lastPercent) * (100 - $lastPercent)))
    } else { 0 }
    if (((Get-Date)-$lastTick).TotalSeconds -ge 2) {
      Write-ProgressLine $lastPercent 'Khatyar Android Release Build' $CurrentStage $etaSeconds
      $lastTick = Get-Date
    }
    Start-Sleep -Milliseconds 150
  }
  while (-not $proc.StandardOutput.EndOfStream) {
    $line = $proc.StandardOutput.ReadLine()
    if ($line) { Write-Host $line }
  }
  $stderr = $proc.StandardError.ReadToEnd()
  if ($stderr) { Write-Host $stderr -ForegroundColor DarkYellow }
  $proc.WaitForExit()
  $buildExitCode = $proc.ExitCode
} catch {
  Write-Host ('BUILD ERROR: ' + $_.Exception.Message) -ForegroundColor Red
  $buildExitCode = 1
} finally {
  if ($proc) { $proc.Dispose() }
}

if ($buildExitCode -eq 0) {
  Write-ProgressLine 100 'Khatyar Android Release Build' 'Build completed' 0
  Write-Progress -Id 1 -Activity 'Khatyar Android Release Build' -Completed -ErrorAction SilentlyContinue
  Write-Host ''
  Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
} else {
  Write-Progress -Id 1 -Activity 'Khatyar Android Release Build' -Completed -ErrorAction SilentlyContinue
  Write-Host ''
  Write-Host 'ANDROID RELEASE BUILD FAILED.' -ForegroundColor Red
}

if (-not (Restore-WorkSafely)) { $buildExitCode = 1 }

$duration = (Get-Date) - $BuildStart
Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host (' Total elapsed time : ' + (Format-Duration $duration)) -ForegroundColor White
Write-Host (' Final stage        : ' + $CurrentStage) -ForegroundColor White
Write-Host (' Source commit      : ' + $localSha) -ForegroundColor White
if ($BackupBranch) { Write-Host (' Backup branch      : ' + $BackupBranch) -ForegroundColor Yellow }
Write-Host '============================================================' -ForegroundColor Cyan
exit $buildExitCode
