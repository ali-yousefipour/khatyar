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
  $output = & git @Arguments 2>&1
  $code = $LASTEXITCODE
  return [pscustomobject]@{ Output=@($output); ExitCode=$code }
}

function Fail-Sync {
  param([string]$Message)
  Write-Host "`nBUILD STOPPED: $Message" -ForegroundColor Red
  exit 1
}

function Get-GitStatusClean {
  $r = Invoke-Git @('status','--porcelain')
  if ($r.ExitCode -ne 0) { Fail-Sync ('Unable to read Git status: ' + ($r.Output -join ' ')) }
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
  Fail-Sync ('GitHub fetch failed: ' + ($fetch.Output -join ' '))
}

$localSha = Get-RefSha 'HEAD'
$remoteSha = Get-RefSha "$Remote/$Branch"
if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) {
  Fail-Sync 'Unable to determine local or GitHub commit SHA.'
}

if ($answer -eq 'Y') {
  # Preserve ALL local work before making GitHub the exact build source.
  if (-not (Get-GitStatusClean)) {
    Write-Host 'Local uncommitted changes detected. Stashing them temporarily...' -ForegroundColor Yellow
    $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
    if ($stash.ExitCode -ne 0) {
      Fail-Sync ('Unable to safely stash local changes: ' + ($stash.Output -join ' '))
    }
    $StashCreated = $true
    Write-Host 'Local uncommitted changes were safely stashed.' -ForegroundColor Green
  }

  # Preserve local-only commits on a temporary backup branch before aligning with GitHub.
  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha "$Remote/$Branch"
  if ($localSha -ne $remoteSha) {
    $backupName = "build-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $backup = Invoke-Git @('branch',$backupName,'HEAD')
    if ($backup.ExitCode -ne 0) {
      if ($StashCreated) { [void](Restore-WorkSafely) }
      Fail-Sync ('Unable to create a backup branch for local commits: ' + ($backup.Output -join ' '))
    }
    $BackupBranch = $backupName
    Write-Host "Local commits preserved on backup branch: $BackupBranch" -ForegroundColor Yellow

    # GitHub is the source of truth when Y is selected.
    $reset = Invoke-Git @('reset','--hard',"$Remote/$Branch")
    if ($reset.ExitCode -ne 0) {
      [void](Restore-WorkSafely)
      Fail-Sync ('Unable to synchronize local files to GitHub: ' + ($reset.Output -join ' '))
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

$buildExitCode = 1
try {
  # The rest of the release build remains delegated to the repository's existing
  # release implementation, while this wrapper owns synchronization and safety.
  $CoreCommit = '423c392ace62a7a1eccfe7ff75c7ad96f8139496'
  $CoreUrl = "https://raw.githubusercontent.com/ali-yousefipour/khatyar/$CoreCommit/mobile/build-release-core.ps1"
  $CorePath = Join-Path $RepoRoot '.build-runtime-build-release-core.ps1'

  if (Test-Path -LiteralPath $CorePath) {
    Remove-Item -LiteralPath $CorePath -Force -ErrorAction SilentlyContinue
  }

  Write-Host 'Preparing the release build...' -ForegroundColor Cyan
  $ProgressPreference = 'SilentlyContinue'
  Invoke-WebRequest -Uri $CoreUrl -OutFile $CorePath -UseBasicParsing
  if (-not (Test-Path -LiteralPath $CorePath)) {
    throw "Unable to download the release build core: $CoreUrl"
  }

  $coreArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$CorePath)
  if ($Fresh) { $coreArgs += '-Fresh' }
  if ($SkipCleanup) { $coreArgs += '-SkipCleanup' }
  if ($SkipDoctor) { $coreArgs += '-SkipDoctor' }

  & powershell.exe @coreArgs
  $buildExitCode = $LASTEXITCODE
} catch {
  Write-Host "BUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
  $buildExitCode = 1
} finally {
  if ($CorePath -and (Test-Path -LiteralPath $CorePath)) {
    Remove-Item -LiteralPath $CorePath -Force -ErrorAction SilentlyContinue
  }
  if (-not (Restore-WorkSafely)) {
    $buildExitCode = 1
  }
}

exit $buildExitCode
