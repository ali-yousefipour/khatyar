#requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$Fresh,
  [switch]$SkipCleanup,
  [switch]$SkipDoctor
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$target = Join-Path $PSScriptRoot 'BUILD-ONE-CLICK.ps1'
if (-not (Test-Path $target)) { throw "Build engine not found: $target" }

$argsList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $target)
if ($Fresh) { $argsList += '-Fresh' }
if ($SkipCleanup) { $argsList += '-SkipCleanup' }
if ($SkipDoctor) { $argsList += '-SkipDoctor' }

& powershell.exe @argsList
exit $LASTEXITCODE
