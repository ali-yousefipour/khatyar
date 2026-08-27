#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$CsvPath = (Join-Path $PSScriptRoot '..\config\myket-sdk-required-windows.csv')
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $CsvPath)) { throw "CSV not found: $CsvPath" }
Import-Csv -LiteralPath $CsvPath | Format-Table package_path, package_revision, archive_url -AutoSize
