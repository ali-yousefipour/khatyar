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

function Invoke-Git {
  param([Parameter(Mandatory=$true)][string[]]$Arguments)

  # Start-Process is used deliberately. Windows PowerShell 5.1 can turn native
  # stderr output into NativeCommandError records even when the native process
  # exits with code 0. Git routinely writes normal progress messages to stderr.
  $outFile = [System.IO.Path]::GetTempFileName()
  $errFile = [System.IO.Path]::GetTempFileName()
  try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'git.exe'
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    foreach ($arg in $Arguments) {
      if ($psi.ArgumentList) {
        [void]$psi.ArgumentList.Add($arg)
      } else {
        # Windows PowerShell 5.1 has no ArgumentList property. Quote arguments
        # using ProcessStartInfo.Arguments with Windows command-line escaping.
        $escaped = $arg -replace '(\\*)"', '$1$1\\"'
        $escaped = $escaped -replace '(\\+)$', '$1$1'
        $psi.Arguments += ' "' + $escaped + '"'
      }
    }

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    $stdout = $p.StandardOutput.ReadToEnd()
    $stderr = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    $code = $p.ExitCode

    if ($stdout) { [System.IO.File]::WriteAllText($outFile, $stdout, [System.Text.Encoding]::UTF8) }
    if ($stderr) { [System.IO.File]::WriteAllText($errFile, $stderr, [System.Text.Encoding]::UTF8) }

    $outLines = if ($stdout) { @($stdout -split "`r?`n" | Where-Object { $_ -ne '' }) } else { @() }
    $errLines = if ($stderr) { @($stderr -split "`r?`n" | Where-Object { $_ -ne '' }) } else { @() }
    return [pscustomobject]@{ Output=$outLines; Error=$errLines; ExitCode=$code }
  }
  finally {
    if ($p) { $p.Dispose() }
    Remove-Item -LiteralPath $outFile,$errFile -Force -ErrorAction SilentlyContinue
  }
}

function Fail-Sync {
  param([string]$Message)
  Write-Host "`nBUILD STOPPED: $Message" -ForegroundColor Red
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
  if ($StashCreated) {
    Write-Host ''
    Write-Host 'Restoring local uncommitted changes...' -ForegroundColor Yellow
    $pop = Invoke-Git @('stash','pop')
    if ($pop.ExitCode -ne 0) {
      Write-Host 'WARNING: Local changes could not be automatically restored. The stash was preserved by Git; run "git stash list" to recover them.' -ForegroundColor Red
      return $false
    }
    Write-Host 'Local changes restored successfully.' -ForegroundColor Green
    $script:StashCreated = $false
  }
  return $true
}

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
  Fail-Sync 'Git is not installed or is not available in PATH.'
}

$repoCheck = Invoke-Git @('rev-parse','--show-toplevel')
if ($repoCheck.ExitCode -ne 0) {
  Fail-Sync 'This build directory is not inside a Git repository.'
}

Write-Host ''
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ' GitHub synchronization before Android build' -ForegroundColor Cyan
Write-Host '=============================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
$answer = (Read-Host 'Download from GitHub').Trim().ToUpperInvariant()
if ($answer -notin @('Y','N')) {
  Fail-Sync 'Please answer Y or N.'
}

$fetch = Invoke-Git @('fetch',$Remote,$Branch)
if ($fetch.ExitCode -ne 0) {
  Fail-Sync ('GitHub fetch failed: ' + (($fetch.Output + $fetch.Error) -join ' '))
}

$localSha = Get-RefSha 'HEAD'
$remoteSha = Get-RefSha "$Remote/$Branch"
if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) {
  Fail-Sync 'Unable to determine local or GitHub commit SHA.'
}

if ($answer -eq 'Y') {
  if (-not (Get-GitStatusClean)) {
    Write-Host 'Local uncommitted changes detected. Stashing them temporarily before GitHub synchronization...' -ForegroundColor Yellow
    $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
    if ($stash.ExitCode -ne 0) {
      Fail-Sync ('Unable to safely stash local changes: ' + (($stash.Output + $stash.Error) -join ' '))
    }
    $StashCreated = $true
    Write-Host 'Local changes were safely stashed.' -ForegroundColor Green
  }

  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha "$Remote/$Branch"
  if ($localSha -ne $remoteSha) {
    $backupName = "build-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $backup = Invoke-Git @('branch',$backupName,'HEAD')
    if ($backup.ExitCode -ne 0) {
      [void](Restore-WorkSafely)
      Fail-Sync ('Unable to create a backup branch for local commits: ' + (($backup.Output + $backup.Error) -join ' '))
    }
    $BackupBranch = $backupName
    Write-Host "Local commits preserved on backup branch: $BackupBranch" -ForegroundColor Yellow

    Write-Host 'Synchronizing local branch with GitHub main...' -ForegroundColor Cyan
    $reset = Invoke-Git @('reset','--hard',"$Remote/$Branch")
    if ($reset.ExitCode -ne 0) {
      [void](Restore-WorkSafely)
      Fail-Sync ('Unable to synchronize local files to GitHub: ' + (($reset.Output + $reset.Error) -join ' '))
    }
  }

  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha "$Remote/$Branch"
  if ($localSha -ne $remoteSha) {
    [void](Restore-WorkSafely)
    Fail-Sync "Synchronization verification failed. Local=$localSha GitHub=$remoteSha"
  }

  if (-not (Get-GitStatusClean)) {
    [void](Restore-WorkSafely)
    Fail-Sync 'Working tree is not clean after GitHub synchronization.'
  }

  Write-Host "GitHub synchronization verified. Build source commit: $localSha" -ForegroundColor Green
} else {
  if ($localSha -ne $remoteSha) {
    Fail-Sync "Local version is not equal to GitHub. Local=$localSha GitHub=$remoteSha. Choose Y to download the latest files before building."
  }
  if (-not (Get-GitStatusClean)) {
    Fail-Sync 'Local uncommitted changes are present. Choose Y so they can be safely stashed while the GitHub version is built.'
  }
  Write-Host "Local version matches GitHub. Build source commit: $localSha" -ForegroundColor Green
}

Write-Host ''
Write-Host 'Starting Android release build...' -ForegroundColor Cyan
$buildExitCode = 0
try {
  $gradlew = Join-Path $RepoRoot 'android\gradlew.bat'
  if (-not (Test-Path -LiteralPath $gradlew)) {
    throw "android\gradlew.bat was not found."
  }
  $gradleArgs = @('assembleRelease')
  & $gradlew @gradleArgs
  $buildExitCode = $LASTEXITCODE
} catch {
  Write-Host "BUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
  $buildExitCode = 1
} finally {
  if (-not (Restore-WorkSafely)) {
    $buildExitCode = 1
  }
}

if ($buildExitCode -eq 0) {
  Write-Host ''
  Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
}
exit $buildExitCode
