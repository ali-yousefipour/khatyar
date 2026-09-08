#requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$root = 'F:\taxi-system'
$file = Join-Path $root 'mobile\App.js'

Write-Host ''
Write-Host '=== KhatYar RTL Fix ===' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path -LiteralPath $file)) {
    throw "App.js was not found: $file"
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$file.$timestamp.bak"

Copy-Item -LiteralPath $file -Destination $backup -Force

Write-Host "Backup created: $backup" -ForegroundColor Green

$content = [System.IO.File]::ReadAllText(
    $file,
    [System.Text.UTF8Encoding]::new($false)
)

# ------------------------------------------------------------
# 1. Remove I18nManager from react-native import
# ------------------------------------------------------------

$importPattern = "I18nManager,\s*"

$importMatches = [regex]::Matches($content, $importPattern)

if ($importMatches.Count -ne 1) {
    throw "Expected exactly one I18nManager import occurrence. Found: $($importMatches.Count)"
}

$content = [regex]::Replace(
    $content,
    $importPattern,
    '',
    1
)

Write-Host '[1/3] Removed I18nManager from import.' -ForegroundColor Green

# ------------------------------------------------------------
# 2. Remove global RTL forcing
# ------------------------------------------------------------

$rtlInitPattern = "try\s*\{\s*I18nManager\.allowRTL\(true\);\s*I18nManager\.forceRTL\(true\);\s*I18nManager\.swapLeftAndRightInRTL\(false\);\s*\}\s*catch\s*\(_\)\s*\{\s*\}"

$rtlMatches = [regex]::Matches(
    $content,
    $rtlInitPattern,
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

if ($rtlMatches.Count -ne 1) {
    throw "Expected exactly one global RTL initialization block. Found: $($rtlMatches.Count)"
}

$content = [regex]::Replace(
    $content,
    $rtlInitPattern,
    '',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

Write-Host '[2/3] Removed global RTL forcing.' -ForegroundColor Green

# ------------------------------------------------------------
# 3. Remove direction:rtl ONLY from root App View
# ------------------------------------------------------------

$rootPattern = "<View\s+style=\{\{flex:1,\s*backgroundColor:C\.paper,\s*direction:'rtl'\}\}>"

$rootMatches = [regex]::Matches(
    $content,
    $rootPattern
)

if ($rootMatches.Count -ne 1) {
    throw "Expected exactly one root View with direction:rtl. Found: $($rootMatches.Count)"
}

$content = [regex]::Replace(
    $content,
    $rootPattern,
    "<View style={{flex:1,backgroundColor:C.paper}}>",
    1
)

Write-Host '[3/3] Removed direction:rtl from root View.' -ForegroundColor Green

# ------------------------------------------------------------
# Write UTF-8 without BOM
# ------------------------------------------------------------

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

[System.IO.File]::WriteAllText(
    $file,
    $content,
    $utf8NoBom
)

# ------------------------------------------------------------
# Verification
# ------------------------------------------------------------

$verify = [System.IO.File]::ReadAllText(
    $file,
    [System.Text.UTF8Encoding]::new($false)
)

if ($verify -match 'I18nManager') {
    throw 'Verification failed: I18nManager still exists in App.js.'
}

if ($verify -match "backgroundColor:C\.paper,direction:'rtl'") {
    throw "Verification failed: root direction:rtl still exists."
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host 'RTL FIX SUCCESSFULLY APPLIED' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host "File:   $file"
Write-Host "Backup: $backup"
Write-Host ''
