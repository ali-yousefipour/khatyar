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

$RepoRoot = $PSScriptRoot
$Remote = 'origin'
$Branch = 'main'
$StashCreated = $false
$StashMessage = 'khatyar-build-autostash-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$BackupBranch = $null
$BuildStart = Get-Date
$CurrentStage = 'Initializing'
$TotalStages = 8
$StageIndex = 0

function Invoke-Git {
  param([Parameter(Mandatory=$true)][string[]]$Arguments)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'git.exe'
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
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
  Write-Progress -Id 1 -Activity $Activity -Status $Status -PercentComplete ([math]::Min(100,[math]::Max(0,$Percent))) -SecondsRemaining ([math]::Max(0,$SecondsRemaining))
  $barWidth = 40
  $filled = [math]::Floor($barWidth * $Percent / 100)
  $bar = ('#' * $filled) + ('-' * ($barWidth - $filled))
  $eta = if ($SecondsRemaining -gt 0) { Format-Duration ([TimeSpan]::FromSeconds($SecondsRemaining)) } else { '--:--' }
  Write-Host ("`r{0,3}% [{1}] {2} | Elapsed {3} | ETA {4}" -f $Percent,$bar,$Status,(Format-Duration $elapsed),$eta) -NoNewline
}

function Fail-Sync([string]$Message) {
  Write-Progress -Id 1 -Activity 'Khatyar Android Release Build' -Completed
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

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { Fail-Sync 'Git is not installed or is not available in PATH.' }

$repoCheck = Invoke-Git @('rev-parse','--show-toplevel')
if ($repoCheck.ExitCode -ne 0) { Fail-Sync 'This build directory is not inside a Git repository.' }

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '       KHATYAR - ANDROID RELEASE BUILD' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
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

Write-Stage 'Checking Android build environment' 3
$gradlew = Join-Path $RepoRoot 'android\gradlew.bat'
if (-not (Test-Path -LiteralPath $gradlew)) { Fail-Sync 'android\gradlew.bat was not found.' }

Write-Stage 'Starting Gradle assembleRelease' 4
$buildExitCode = 0
try {
  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  $processInfo.FileName = $gradlew
  $processInfo.WorkingDirectory = (Join-Path $RepoRoot 'android')
  $processInfo.UseShellExecute = $false
  $processInfo.CreateNoWindow = $false
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true
  $processInfo.Arguments = 'assembleRelease --console=plain'
  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $processInfo
  [void]$proc.Start()
  $lastPercent = 45
  $lastTick = Get-Date
  while (-not $proc.HasExited) {
    Start-Sleep -Milliseconds 500
    while (-not $proc.StandardOutput.EndOfStream) {
      $line = $proc.StandardOutput.ReadLine()
      if ($line) {
        Write-Host $line
        if ($line -match 'createBundleReleaseJsAndAssets|bundleReleaseJsAndAssets') { Write-Stage 'Bundling JavaScript and Hermes assets' 5 }
        elseif ($line -match ':app:mergeReleaseResources') { Write-Stage 'Merging Android release resources' 6 }
        elseif ($line -match ':app:packageRelease|:app:createReleaseApkListing') { Write-Stage 'Packaging release APK' 7 }
      }
    }
    $elapsed = ((Get-Date) - $BuildStart).TotalSeconds
    $estimated = if ($elapsed -gt 0 -and $lastPercent -gt 0) { [int]([math]::Max(1,(100-$lastPercent)/$lastPercent*$elapsed)) } else { 0 }
    if (((Get-Date)-$lastTick).TotalSeconds -ge 2) {
      Write-ProgressLine $lastPercent 'Khatyar Android Release Build' $CurrentStage $estimated
      $lastTick = Get-Date
    }
  }
  $stderr = $proc.StandardError.ReadToEnd()
  $stdoutTail = $proc.StandardOutput.ReadToEnd()
  if ($stdoutTail) { Write-Host $stdoutTail }
  if ($stderr) { Write-Host $stderr -ForegroundColor DarkYellow }
  $proc.WaitForExit()
  $buildExitCode = $proc.ExitCode
  $proc.Dispose()
} catch {
  Write-Host ('BUILD ERROR: ' + $_.Exception.Message) -ForegroundColor Red
  $buildExitCode = 1
}

if ($buildExitCode -eq 0) {
  Write-ProgressLine 100 'Khatyar Android Release Build' 'Build completed' 0
  Write-Progress -Id 1 -Activity 'Khatyar Android Release Build' -Completed
  Write-Host ''
  Write-Stage 'Release build completed successfully' 8
} else {
  Write-Progress -Id 1 -Activity 'Khatyar Android Release Build' -Completed
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
