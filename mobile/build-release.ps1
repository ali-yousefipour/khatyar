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
$CoreCommit = '8579240a157240b7a327ef0599682114db72a419'
$CoreUrl = "https://raw.githubusercontent.com/ali-yousefipour/khatyar/$CoreCommit/mobile/build-release.ps1"
$CorePath = Join-Path $RepoRoot '.build-runtime-build-release.ps1'
$StashCreated = $false
$StashMessage = "khatyar-build-autostash-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

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
  $cleanBefore = Get-GitStatusClean
  if (-not $cleanBefore) {
    Write-Host 'Local uncommitted changes detected. Stashing them temporarily before GitHub synchronization...' -ForegroundColor Yellow
    $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
    if ($stash.ExitCode -ne 0) {
      Fail-Sync ('Unable to safely stash local changes: ' + ($stash.Output -join ' '))
    }
    $StashCreated = $true
    Write-Host 'Local changes were safely stashed.' -ForegroundColor Green
  }

  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha "$Remote/$Branch"
  $base = Invoke-Git @('merge-base','HEAD',"$Remote/$Branch")
  if ($base.ExitCode -ne 0) {
    if ($StashCreated) { & git stash pop 2>&1 | Out-Null }
    Fail-Sync 'Unable to compare the local branch with GitHub.'
  }
  $mergeBase = ((@($base.Output) -join '').Trim())

  if ($localSha -ne $remoteSha) {
    if ($mergeBase -eq $localSha) {
      Write-Host 'Local branch is behind GitHub. Pulling latest files with fast-forward only...' -ForegroundColor Cyan
      $pull = Invoke-Git @('pull','--ff-only',$Remote,$Branch)
      if ($pull.ExitCode -ne 0) {
        if ($StashCreated) { & git stash pop 2>&1 | Out-Null }
        Fail-Sync ('GitHub pull failed: ' + ($pull.Output -join ' '))
      }
    } elseif ($mergeBase -eq $remoteSha) {
      if ($StashCreated) { & git stash pop 2>&1 | Out-Null }
      Fail-Sync 'Local branch contains commits that are not on GitHub. Push or reconcile the local commits before building.'
    } else {
      if ($StashCreated) { & git stash pop 2>&1 | Out-Null }
      Fail-Sync 'Local branch and GitHub have diverged. Reconcile the branches before building.'
    }
  }

  $localSha = Get-RefSha 'HEAD'
  $remoteSha = Get-RefSha "$Remote/$Branch"
  if ($localSha -ne $remoteSha) {
    if ($StashCreated) { & git stash pop 2>&1 | Out-Null }
    Fail-Sync "Synchronization verification failed. Local=$localSha GitHub=$remoteSha"
  }

  Write-Host "GitHub synchronization verified. Commit: $localSha" -ForegroundColor Green
} else {
  if ($localSha -ne $remoteSha) {
    Fail-Sync "Local version is not equal to GitHub. Local=$localSha GitHub=$remoteSha. Choose Y to download the latest files before building."
  }
  if (-not (Get-GitStatusClean)) {
    Fail-Sync 'Local uncommitted changes are present. Choose Y so they can be safely stashed while the GitHub version is built.'
  }
  Write-Host "Local version matches GitHub. Commit: $localSha" -ForegroundColor Green
}

try {
  Write-Host 'Preparing the release build script...' -ForegroundColor Cyan
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
  Remove-Item -LiteralPath $CorePath -Force -ErrorAction SilentlyContinue
  if ($StashCreated) {
    Write-Host ''
    Write-Host 'Restoring local changes that were temporarily stashed before the build...' -ForegroundColor Yellow
    $pop = Invoke-Git @('stash','pop')
    if ($pop.ExitCode -ne 0) {
      Write-Host 'WARNING: Local changes could not be automatically restored. The stash was preserved by Git; run "git stash list" to recover it.' -ForegroundColor Red
      $buildExitCode = 1
    } else {
      Write-Host 'Local changes restored successfully.' -ForegroundColor Green
    }
  }
}

exit $buildExitCode
