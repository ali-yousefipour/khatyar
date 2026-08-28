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

if ($SkipInstallIfNodeModulesPresent -and (Test-Path 'node_modules\expo\package.json')) {
  Write-Host 'node_modules already contains Expo; preserving local installation/cache.' -ForegroundColor Green
  exit 0
}

# Stage 1: local npm cache. No network is used here.
$offlineArgs = if ($Ci) { @('ci') + $common + @('--offline') } else { @('install') + $common + @('--offline') }
if (Invoke-Npm 'https://mirror-npm.runflare.com/' $offlineArgs 'local cache / offline') { exit 0 }

# Stage 2+: mirrors. A 404, DNS failure, timeout, 401/403, or any other npm failure
# moves to the next registry instead of terminating the build.
foreach ($registry in $registries) {
  $args = if ($Ci) { @('ci') + $common + @('--registry', $registry) } else { @('install') + $common + @('--registry', $registry) }
  if (Invoke-Npm $registry $args $registry) { exit 0 }
  Write-Warning "Registry failed: $registry; trying next source."
}

throw 'All npm dependency sources failed. Check .build-logs and network connectivity.'
