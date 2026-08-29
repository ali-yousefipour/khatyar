#requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$Ci,
  [switch]$SkipInstallIfNodeModulesPresent
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location (Split-Path -Parent $PSScriptRoot)

$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$cache = if ($env:NPM_CONFIG_CACHE) { $env:NPM_CONFIG_CACHE } else { Join-Path $env:LOCALAPPDATA 'npm-cache' }
New-Item -ItemType Directory -Force -Path $cache | Out-Null

# npmjs is the authoritative public registry. Myket is intentionally NOT listed here:
# maven.myket.ir is a Maven repository for Android/Gradle artifacts, not an npm registry.
# Runflare publishes an npm mirror; Pardisco is an additional Iranian npm mirror.
$registries = @(
  'https://mirror-npm.runflare.com/',
  'https://mirrors.pardisco.co/npm/',
  'https://registry.npmjs.org/'
)

$common = @('--no-audit','--no-fund','--legacy-peer-deps','--include=dev','--prefer-offline')

# When the user has already configured a working Git proxy for the build machine,
# reuse it for npm without committing any proxy address to the repository.
try {
  $gitProxy = (& git config --global --get http.proxy 2>$null | Select-Object -First 1)
  if ($gitProxy) {
    $env:NPM_CONFIG_PROXY = [string]$gitProxy
    $env:NPM_CONFIG_HTTPS_PROXY = [string]$gitProxy
    Write-Host "[npm] Reusing configured Git proxy for npm: $gitProxy" -ForegroundColor DarkGray
  }
} catch {
  Write-Warning "Could not read the configured Git proxy; continuing without inheriting it."
}

function Invoke-Npm {
  param([string]$Registry, [string[]]$CommandArgs, [string]$Label)
  Write-Host "`n=== npm dependency stage: $Label ===" -ForegroundColor Cyan
  Write-Host "Registry: $Registry" -ForegroundColor DarkCyan
  $env:NPM_CONFIG_CACHE = $cache
  $env:NPM_CONFIG_REGISTRY = $Registry
  $env:NPM_CONFIG_PREFER_OFFLINE = 'true'
  $env:NPM_CONFIG_FETCH_TIMEOUT = '180000'
  $env:NPM_CONFIG_FETCH_RETRIES = '1'
  $env:NPM_CONFIG_FETCH_RETRY_MINTIMEOUT = '5000'
  $env:NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT = '30000'
  $env:NPM_CONFIG_AUDIT = 'false'
  $env:NPM_CONFIG_FUND = 'false'
  & $npm @CommandArgs
  return ($LASTEXITCODE -eq 0)
}

function Test-LockfileSync {
  try {
    $pkg = Get-Content -Raw -LiteralPath 'package.json' | ConvertFrom-Json
    $lock = Get-Content -Raw -LiteralPath 'package-lock.json' | ConvertFrom-Json
    if ([string]$lock.version -ne [string]$pkg.version) { return $false }
    $root = $lock.packages.''
    if (-not $root) { return $false }
    foreach ($p in $pkg.dependencies.PSObject.Properties) {
      $locked = $root.dependencies.($p.Name)
      if ($null -eq $locked -or [string]$locked -ne [string]$p.Value) { return $false }
    }
    foreach ($p in $pkg.devDependencies.PSObject.Properties) {
      $locked = $root.devDependencies.($p.Name)
      if ($null -eq $locked -or [string]$locked -ne [string]$p.Value) { return $false }
    }
    return $true
  } catch {
    return $false
  }
}

function Sync-Lockfile {
  if (Test-LockfileSync) {
    Write-Host '[npm] package-lock.json is already synchronized with package.json.' -ForegroundColor Green
    return $true
  }

  Write-Host '[npm] package-lock.json is out of sync with package.json; synchronizing lockfile before npm ci.' -ForegroundColor Yellow

  $lockArgsCommon = @('install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund','--legacy-peer-deps','--include=dev','--prefer-offline')

  # Prefer the configured local/mirror policy in exactly the same order as installation.
  foreach ($registry in $registries) {
    $args = $lockArgsCommon + @('--registry', $registry)
    if (Invoke-Npm $registry $args "lockfile sync: $registry") {
      if (Test-LockfileSync) {
        Write-Host "[npm] package-lock.json synchronized successfully via $registry." -ForegroundColor Green
        return $true
      }
      Write-Warning "npm completed but package-lock.json is still not synchronized via $registry."
    } else {
      Write-Warning "Lockfile synchronization failed via $registry; trying next source."
    }
  }

  return $false
}

if ($SkipInstallIfNodeModulesPresent -and (Test-Path 'node_modules\expo\package.json')) {
  Write-Host 'node_modules already contains Expo; preserving local installation/cache.' -ForegroundColor Green
  exit 0
}

# npm ci is intentionally strict. Before calling it, synchronize a stale lockfile
# using package.json as the source of truth, without changing package.json versions.
if ($Ci) {
  if (-not (Sync-Lockfile)) {
    throw 'package-lock.json is not synchronized with package.json, and automatic lockfile synchronization failed.'
  }
}

# Stage 1: local npm cache. No network is used here.
$offlineArgs = if ($Ci) { @('ci') + $common + @('--offline') } else { @('install') + $common + @('--offline') }
if (Invoke-Npm 'https://mirror-npm.runflare.com/' $offlineArgs 'local cache / offline') { exit 0 }

# Stage 2+: mirrors. A 404, DNS failure, timeout, 401/402/403, or any other npm failure
# moves to the next registry instead of terminating the build.
foreach ($registry in $registries) {
  $args = if ($Ci) { @('ci') + $common + @('--registry', $registry) } else { @('install') + $common + @('--registry', $registry) }
  if (Invoke-Npm $registry $args $registry) { exit 0 }
  Write-Warning "Registry failed: $registry; trying next source."
}

throw 'All npm dependency sources failed. Check .build-logs and network connectivity.'
