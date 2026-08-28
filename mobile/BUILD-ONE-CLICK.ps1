#requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$BuildArguments = @()
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Branch = 'main'
$BuildScript = Join-Path $PSScriptRoot 'build-release.ps1'

function Get-LocalGitCommit {
  $value = (& git -C $RepoRoot rev-parse HEAD 2>$null | Select-Object -First 1)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
    throw 'Unable to determine the local Git commit.'
  }
  return $value.Trim()
}

function Get-RemoteGitCommit {
  $value = (& git -C $RepoRoot ls-remote origin "refs/heads/$Branch" 2>$null | Select-Object -First 1)
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
    throw "Unable to read the GitHub commit for origin/$Branch. Check the Internet connection and GitHub remote."
  }
  $parts = $value.Trim() -split '\s+'
  if ($parts.Count -lt 1 -or [string]::IsNullOrWhiteSpace($parts[0])) {
    throw "Unable to parse the GitHub commit for origin/$Branch."
  }
  return $parts[0]
}

function Assert-GitAvailable {
  if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed or is not available in PATH.'
  }
  if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
    throw "The project directory is not a Git repository: $RepoRoot"
  }
}

function Sync-AndVerifyRepository {
  Assert-GitAvailable

  Write-Host ''
  Write-Host '=============================================' -ForegroundColor Cyan
  Write-Host ' GitHub synchronization before Android build' -ForegroundColor Cyan
  Write-Host '=============================================' -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
  $answer = (Read-Host 'Download from GitHub').Trim().ToUpperInvariant()

  if ($answer -notin @('Y','YES','N','NO')) {
    throw 'Invalid answer. Please run the build again and answer Y or N.'
  }

  if ($answer -in @('Y','YES')) {
    Write-Host "`nFetching latest GitHub changes..." -ForegroundColor Cyan
    & git -C $RepoRoot fetch --prune origin $Branch
    if ($LASTEXITCODE -ne 0) {
      throw 'Git fetch failed. Build was stopped.'
    }

    $status = (& git -C $RepoRoot status --porcelain 2>$null)
    if ($LASTEXITCODE -ne 0) {
      throw 'Unable to inspect the local Git status. Build was stopped.'
    }
    if (-not [string]::IsNullOrWhiteSpace(($status -join "`n"))) {
      throw 'Local uncommitted changes were detected. GitHub files were not pulled automatically because doing so could overwrite local work. Commit/stash the local changes and run the build again.'
    }

    Write-Host "Pulling origin/$Branch with fast-forward only..." -ForegroundColor Cyan
    & git -C $RepoRoot pull --ff-only origin $Branch
    if ($LASTEXITCODE -ne 0) {
      throw 'Git pull failed or the local branch cannot be fast-forwarded. Build was stopped.'
    }
  } else {
    Write-Host "`nGitHub download skipped by user." -ForegroundColor DarkYellow
    Write-Host 'The local commit will still be compared with GitHub before the build.' -ForegroundColor DarkYellow
    & git -C $RepoRoot fetch --prune origin $Branch
    if ($LASTEXITCODE -ne 0) {
      throw 'Unable to contact GitHub for the required version check. Build was stopped.'
    }
  }

  $localCommit = Get-LocalGitCommit
  $remoteCommit = Get-RemoteGitCommit

  Write-Host ''
  Write-Host "Local GitHub project commit : $localCommit" -ForegroundColor Gray
  Write-Host "GitHub origin/$Branch commit : $remoteCommit" -ForegroundColor Gray

  if ($localCommit -ne $remoteCommit) {
    Write-Host ''
    Write-Host 'VERSION CHECK FAILED: local files and GitHub are not at the same commit.' -ForegroundColor Red
    Write-Host 'Build has been stopped to prevent building an out-of-sync project.' -ForegroundColor Red
    Write-Host "Local :  $localCommit" -ForegroundColor Red
    Write-Host "GitHub:  $remoteCommit" -ForegroundColor Red
    throw 'Local project and GitHub are not synchronized.'
  }

  Write-Host ''
  Write-Host 'VERSION CHECK PASSED: local project and GitHub are synchronized.' -ForegroundColor Green
  Write-Host "Commit: $localCommit" -ForegroundColor Green
  Write-Host ''
}

try {
  Sync-AndVerifyRepository

  if (-not (Test-Path $BuildScript)) {
    throw "Build script not found: $BuildScript"
  }

  Write-Host 'Starting Android release build...' -ForegroundColor Cyan
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BuildScript @BuildArguments
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    Write-Host "Android release build failed with exit code $exitCode." -ForegroundColor Red
  } else {
    Write-Host 'Android release build completed successfully.' -ForegroundColor Green
  }

  exit $exitCode
}
catch {
  Write-Host ''
  Write-Host "BUILD STOPPED: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
