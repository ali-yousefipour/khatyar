#requires -Version 5.1
[CmdletBinding()]
param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$BuildArguments = @()
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot

$BuildScript = Join-Path $PSScriptRoot 'build-release.ps1'

if (-not (Test-Path -LiteralPath $BuildScript)) {
  Write-Host "BUILD STOPPED: Build script not found: $BuildScript" -ForegroundColor Red
  exit 1
}

Write-Host 'Starting build-release.ps1...' -ForegroundColor Cyan
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BuildScript @BuildArguments
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
  Write-Host 'Android release build completed successfully.' -ForegroundColor Green
} else {
  Write-Host "Android release build failed with exit code $exitCode." -ForegroundColor Red
}

exit $exitCode
