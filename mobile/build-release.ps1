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
$StashMessage = "khatyar-build-autostash-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$BackupBranch = $null
$BuildStarted = Get-Date
$CurrentStage = 'Initializing'
$CurrentPercent = 0
$LastGradleTask = ''
$GradleTaskCount = 0
$GradleProgress = 0

function Format-Duration {
  param([double]$Seconds)
  if ($Seconds -lt 0) { $Seconds = 0 }
  $ts = [TimeSpan]::FromSeconds([math]::Floor($Seconds))
  if ($ts.TotalHours -ge 1) { return $ts.ToString('hh\:mm\:ss') }
  return $ts.ToString('mm\:ss')
}

function Format-Eta {
  param([double]$Seconds)
  if ($Seconds -le 0) { return '--:--' }
  return Format-Duration $Seconds
}

function Write-BuildHeader {
  param([string]$Title)
  Write-Host ''
  Write-Host '╔════════════════════════════════════════════════════════════╗' -ForegroundColor DarkCyan
  Write-Host ('║' + $Title.PadLeft(30).PadRight(58) + '║') -ForegroundColor Cyan
  Write-Host '╚════════════════════════════════════════════════════════════╝' -ForegroundColor DarkCyan
}

function Update-BuildProgress {
  param(
    [Parameter(Mandatory=$true)][int]$Percent,
    [Parameter(Mandatory=$true)][string]$Stage,
    [double]$KnownTotalSeconds = 0
  )

  $script:CurrentPercent = [math]::Max(0,[math]::Min(100,$Percent))
  $script:CurrentStage = $Stage

  $elapsed = ((Get-Date) - $BuildStarted).TotalSeconds
  $eta = 0
  if ($CurrentPercent -gt 0 -and $elapsed -gt 1) {
    $eta = ($elapsed / $CurrentPercent) * (100 - $CurrentPercent)
  } elseif ($KnownTotalSeconds -gt 0) {
    $eta = [math]::Max(0,$KnownTotalSeconds - $elapsed)
  }

  $barWidth = 36
  $filled = [math]::Floor(($CurrentPercent / 100) * $barWidth)
  if ($filled -lt 0) { $filled = 0 }
  if ($filled -gt $barWidth) { $filled = $barWidth }
  $bar = ('█' * [int]$filled) + ('░' * [int]($barWidth - $filled))

  Write-Progress `
    -Id 1 `
    -Activity 'Khatyar Android Release Build' `
    -Status ("{0}% | {1} | Elapsed {2} | ETA {3}" -f $CurrentPercent,$Stage,(Format-Duration $elapsed),(Format-Eta $eta)) `
    -PercentComplete $CurrentPercent

  Write-Host ("`r  [{0}] {1,3}%  {2}  | Elapsed: {3} | ETA: {4}     " -f $bar,$CurrentPercent,$Stage,(Format-Duration $elapsed),(Format-Eta $eta)) -NoNewline
  Write-Host "`r" -NoNewline
}

function Complete-BuildProgress {
  Write-Progress -Id 1 -Activity 'Khatyar Android Release Build' -Completed
}

function Invoke-Git {
  param([Parameter(Mandatory=$true)][string[]]$Arguments)

  $p = $null
  $stdout = ''
  $stderr = ''
  $code = -1

  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'git.exe'
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    $commandLine = ''
    foreach ($arg in $Arguments) {
      if ($null -eq $arg) { $arg = '' }
      if ($arg -notmatch '[\s"]') {
        $commandLine += $arg + ' '
        continue
      }
      $escaped = $arg -replace '(\\*)"', '$1$1\"'
      $escaped = $escaped -replace '(\\+)$', '$1$1'
      $commandLine += '"' + $escaped + '" '
    }
    $psi.Arguments = $commandLine.TrimEnd()

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    $code = $p.ExitCode

    $outLines = if ($stdout) { @($stdout -split "`r?`n" | Where-Object { $_ -ne '' }) } else { @() }
    $errLines = if ($stderr) { @($stderr -split "`r?`n" | Where-Object { $_ -ne '' }) } else { @() }
    return [pscustomobject]@{ Output=$outLines; Error=$errLines; ExitCode=$code }
  }
  catch {
    return [pscustomobject]@{ Output=@(); Error=@($_.Exception.Message); ExitCode=1 }
  }
  finally {
    if ($null -ne $p) {
      try { $p.Dispose() } catch {}
    }
  }
}

function Fail-Sync {
  param([string]$Message)
  Complete-BuildProgress
  Write-Host ''
  Write-Host "BUILD STOPPED: $Message" -ForegroundColor Red
  exit 1
}

function Get-GitStatusClean {
  $r = Invoke-Git @('status','--porcelain')
  if ($r.ExitCode -ne 0) { Fail-Sync ('Unable to read Git status: ' + (($r.Output + $r.Error) -join ' ')) }
  return (@($r.Output).Count -eq 0)
}

function Get-RefSha {
  param([Parameter(Mandatory=$true)][string]$Ref)
  $r = Invoke-Git @('rev-parse',$Ref)
  if ($r.ExitCode -ne 0) { return $null }
  return ((@($r.Output) -join '').Trim())
}

function Restore-WorkSafely {
  if (-not $StashCreated) { return $true }

  Write-Host ''
  Write-Host 'Restoring local uncommitted changes...' -ForegroundColor Yellow
  Update-BuildProgress 94 'Restoring local changes'

  $pop = Invoke-Git @('stash','pop')
  if ($pop.ExitCode -ne 0) {
    Write-Host 'WARNING: Local changes could not be automatically restored. The stash was preserved by Git; run "git stash list" to recover them.' -ForegroundColor Red
    return $false
  }

  Write-Host 'Local changes restored successfully.' -ForegroundColor Green
  $script:StashCreated = $false
  return $true
}

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
  Fail-Sync 'Git is not installed or is not available in PATH.'
}

Update-BuildProgress 2 'Checking Git installation'
$repoCheck = Invoke-Git @('rev-parse','--show-toplevel')
if ($repoCheck.ExitCode -ne 0) { Fail-Sync 'This build directory is not inside a Git repository.' }

Write-BuildHeader 'KHATYAR ANDROID RELEASE BUILD'
Write-Host '  PowerShell 5.1 compatible build pipeline' -ForegroundColor Gray
Write-Host '  Repository: ' -NoNewline; Write-Host $RepoRoot -ForegroundColor White
Write-Host ''

Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
$answer = (Read-Host 'Download from GitHub').Trim().ToUpperInvariant()
if ($answer -notin @('Y','N')) { Fail-Sync 'Please answer Y or N.' }

Update-BuildProgress 6 'Fetching GitHub main'
$fetch = Invoke-Git @('fetch',$Remote,$Branch)
if ($fetch.ExitCode -ne 0) {
  $details = (($fetch.Output + $fetch.Error) -join ' ').Trim()
  if ([string]::IsNullOrWhiteSpace($details)) { $details = 'Unknown Git fetch error.' }
  Fail-Sync "GitHub fetch failed: $details"
}

$localSha = Get-RefSha 'HEAD'
$remoteSha = Get-RefSha "$Remote/$Branch"
if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) {
  Fail-Sync 'Unable to determine local or GitHub commit SHA.'
}

Write-Host ''
Write-Host ('  Local  : ' + $localSha) -ForegroundColor Gray
Write-Host ('  GitHub : ' + $remoteSha) -ForegroundColor Gray

if ($answer -eq 'Y') {
  if (-not (Get-GitStatusClean)) {
    Update-BuildProgress 12 'Stashing local changes'
    Write-Host 'Local uncommitted changes detected. Stashing them temporarily...' -ForegroundColor Yellow
    $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
    if ($stash.ExitCode -ne 0) {
      $details = (($stash.Output + $stash.Error) -join ' ').Trim()
      if ([string]::IsNullOrWhiteSpace($details)) { $details = 'Unknown stash error.' }
      Fail-Sync "Unable to safely stash local changes: $details"
    }
    $StashCreated = $true
    Write-Host 'Local changes were safely stashed.' -ForegroundColor Green
  } else {
    Update-BuildProgress 12 'Working tree is clean'
  }

  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha "$Remote/$Branch"

  if ($localSha -ne $remoteSha) {
    $backupName = "build-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Update-BuildProgress 18 'Creating local backup branch'
    $backup = Invoke-Git @('branch',$backupName,'HEAD')
    if ($backup.ExitCode -ne 0) {
      [void](Restore-WorkSafely)
      $details = (($backup.Output + $backup.Error) -join ' ').Trim()
      if ([string]::IsNullOrWhiteSpace($details)) { $details = 'Unknown branch creation error.' }
      Fail-Sync "Unable to create a backup branch for local commits: $details"
    }
    $BackupBranch = $backupName
    Write-Host "Local commits preserved on backup branch: $BackupBranch" -ForegroundColor Yellow

    Update-BuildProgress 23 'Synchronizing local branch with GitHub'
    $reset = Invoke-Git @('reset','--hard',"$Remote/$Branch")
    if ($reset.ExitCode -ne 0) {
      [void](Restore-WorkSafely)
      $details = (($reset.Output + $reset.Error) -join ' ').Trim()
      if ([string]::IsNullOrWhiteSpace($details)) { $details = 'Unknown reset error.' }
      Fail-Sync "Unable to synchronize local files to GitHub: $details"
    }
  } else {
    Update-BuildProgress 23 'Local commit already matches GitHub'
  }

  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha "$Remote/$Branch"
  if ($localSha -ne $remoteSha) {
    [void](Restore-WorkSafely)
    Fail-Sync "Synchronization verification failed. Local=$localSha GitHub=$remoteSha"
  }

  Update-BuildProgress 27 'Verifying synchronized working tree'
  if (-not (Get-GitStatusClean)) {
    [void](Restore-WorkSafely)
    Fail-Sync 'Working tree is not clean after GitHub synchronization.'
  }

  Write-Host ''
  Write-Host "GitHub synchronization verified. Build source commit: $localSha" -ForegroundColor Green
} else {
  if ($localSha -ne $remoteSha) {
    Fail-Sync "Local version is not equal to GitHub. Local=$localSha GitHub=$remoteSha. Choose Y to download the latest files before building."
  }
  Update-BuildProgress 27 'Verifying local source'
  if (-not (Get-GitStatusClean)) {
    Fail-Sync 'Local uncommitted changes are present. Choose Y so they can be safely stashed while the GitHub version is built.'
  }
  Write-Host ''
  Write-Host "Local version matches GitHub. Build source commit: $localSha" -ForegroundColor Green
}

Write-Host ''
Write-BuildHeader 'ANDROID GRADLE BUILD'
Update-BuildProgress 30 'Preparing Android Gradle build'

$buildExitCode = 0
try {
  $gradlew = Join-Path $RepoRoot 'android\gradlew.bat'
  if (-not (Test-Path -LiteralPath $gradlew)) { throw 'android\gradlew.bat was not found.' }

  Write-Host '  Running: gradlew.bat assembleRelease --console=plain' -ForegroundColor Gray
  Write-Host ''

  # Gradle does not expose a reliable overall percentage. We therefore use its
  # completed task stream to provide a live, time-based estimate for the Gradle
  # portion while keeping the overall pipeline percentage deterministic.
  $gradleStart = Get-Date
  $seenTasks = @{}
  $lastTaskAt = $gradleStart
  $estimatedTaskTotal = 120

  & $gradlew assembleRelease --console=plain 2>&1 |
    ForEach-Object {
      $line = [string]$_
      if ([string]::IsNullOrWhiteSpace($line)) { return }

      if ($line -match '^> Task (.+)$') {
        $taskName = $Matches[1].Trim()
        if (-not $seenTasks.ContainsKey($taskName)) {
          $seenTasks[$taskName] = $true
          $GradleTaskCount++
        }
        $LastGradleTask = $taskName

        # Keep Gradle between 30% and 90% of the total pipeline.
        $raw = 30 + [math]::Min(60, [math]::Floor(($GradleTaskCount / $estimatedTaskTotal) * 60))
        if ($raw -lt 30) { $raw = 30 }
        if ($raw -gt 90) { $raw = 90 }
        $GradleProgress = [int]$raw

        $elapsedGradle = ((Get-Date) - $gradleStart).TotalSeconds
        $eta = 0
        if ($GradleTaskCount -gt 1 -and $elapsedGradle -gt 2) {
          $perTask = $elapsedGradle / $GradleTaskCount
          $eta = $perTask * ($estimatedTaskTotal - $GradleTaskCount)
        }

        Write-Host ("  Gradle task: {0}" -f $taskName) -ForegroundColor DarkGray
        Update-BuildProgress $GradleProgress ("Gradle: $taskName") $eta
      } else {
        Write-Host ('  ' + $line) -ForegroundColor DarkGray
      }
    }

  $buildExitCode = $LASTEXITCODE

  if ($buildExitCode -ne 0) {
    Write-Host ''
    Write-Host "Gradle build failed with exit code $buildExitCode." -ForegroundColor Red
  } else {
    Update-BuildProgress 90 'Gradle build completed'
  }
}
catch {
  Write-Host ''
  Write-Host "BUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
  $buildExitCode = 1
}
finally {
  if ($buildExitCode -eq 0) {
    Update-BuildProgress 93 'Final verification'
  }

  if (-not (Restore-WorkSafely)) {
    $buildExitCode = 1
  }
}

if ($buildExitCode -eq 0) {
  Update-BuildProgress 97 'Finalizing build result'

  $apkCandidates = @(
    (Join-Path $RepoRoot 'android\app\build\outputs\apk\release\app-release.apk'),
    (Join-Path $RepoRoot 'android\app\build\outputs\bundle\release\app-release.aab')
  )

  $artifact = $apkCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  $totalSeconds = ((Get-Date) - $BuildStarted).TotalSeconds

  Complete-BuildProgress
  Write-Host ''
  Write-BuildHeader 'BUILD SUCCESSFUL'
  Write-Host ('  Source commit : ' + $localSha) -ForegroundColor Gray
  Write-Host ('  Build         : assembleRelease') -ForegroundColor Gray
  Write-Host ('  Total time    : ' + (Format-Duration $totalSeconds)) -ForegroundColor Gray
  if ($artifact) {
    Write-Host ('  Artifact      : ' + $artifact) -ForegroundColor Gray
  } else {
    Write-Host '  Artifact      : Gradle succeeded; output file was not found at the standard path.' -ForegroundColor Yellow
  }
  if ($BackupBranch) {
    Write-Host ('  Backup branch : ' + $BackupBranch) -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
} else {
  $totalSeconds = ((Get-Date) - $BuildStarted).TotalSeconds
  Complete-BuildProgress
  Write-Host ''
  Write-BuildHeader 'BUILD FAILED'
  Write-Host ('  Failed stage  : ' + $CurrentStage) -ForegroundColor Red
  Write-Host ('  Elapsed       : ' + (Format-Duration $totalSeconds)) -ForegroundColor Gray
  Write-Host ('  Source commit : ' + $localSha) -ForegroundColor Gray
  if ($BackupBranch) {
    Write-Host ('  Backup branch : ' + $BackupBranch) -ForegroundColor Yellow
  }
}

exit $buildExitCode
