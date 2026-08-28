#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipCleanup,
    [switch]$SkipDoctor,
    [int]$GradleTimeoutMinutes = 180,
    [int]$GradleIdleTimeoutMinutes = 30,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ScriptRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
Set-Location -LiteralPath $ScriptRoot
$BuildStart = Get-Date
$FinalExitCode = 1
$FinalStage = 'Starting'

function Write-Stage {
    param([int]$Percent, [string]$Stage)
    $script:FinalStage = $Stage
    $elapsed = (Get-Date) - $BuildStart
    Write-Host ''
    Write-Host ('[' + $Percent.ToString('000') + '%] ' + $Stage) -ForegroundColor Yellow
    Write-Host ('    Elapsed: ' + $elapsed.ToString('hh\:mm\:ss'))
}

function Stop-Tree {
    param([int]$ProcessId)
    if ($ProcessId -gt 0) {
        try { & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null } catch {}
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory=$true)][string]$File,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [string]$WorkingDirectory = $ScriptRoot
    )
    Write-Host ('> ' + $File + ' ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $File
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false
    foreach ($arg in $Arguments) {
        $a = [string]$arg
        if ($a -match '[\s"]') { $psi.Arguments += ' "' + ($a -replace '"','\"') + '"' }
        else { $psi.Arguments += ' ' + $a }
    }
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    try {
        [void]$p.Start()
        $p.WaitForExit()
        if ($p.ExitCode -ne 0) { throw ($File + ' exited with code ' + $p.ExitCode + '.') }
    } finally { $p.Dispose() }
}

function Get-JavaMajorVersion {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'java.exe'
    $psi.Arguments = '-version'
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    try {
        [void]$p.Start()
        $stdout = $p.StandardOutput.ReadToEnd()
        $stderr = $p.StandardError.ReadToEnd()
        $p.WaitForExit()
        if ($p.ExitCode -ne 0) { throw 'java.exe -version failed.' }
        $text = ($stdout + "`n" + $stderr)
        $m = [regex]::Match($text, 'version\s+"([0-9]+)(?:\.([0-9]+))?')
        if (-not $m.Success) { throw 'Unable to determine Java major version.' }
        return [int]$m.Groups[1].Value
    } finally { $p.Dispose() }
}

function Invoke-GradleRelease {
    param(
        [string]$Gradlew,
        [string]$WorkingDirectory,
        [string]$InitScript,
        [string]$LogPath
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false
    $command = '"' + $Gradlew + '" --init-script "' + $InitScript + '" assembleRelease --console=plain --stacktrace --warning-mode=all'
    $psi.Arguments = '/d /c "' + $command + ' > "' + $LogPath + '" 2>&1"'

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    $lastLength = 0
    $lastActivity = Get-Date
    $lastDisplay = Get-Date

    try {
        while (-not $p.HasExited) {
            Start-Sleep -Seconds 2
            if (Test-Path -LiteralPath $LogPath) {
                $length = (Get-Item -LiteralPath $LogPath).Length
                if ($length -gt $lastLength) { $lastLength = $length; $lastActivity = Get-Date }
            }
            $elapsedSeconds = ((Get-Date) - $lastDisplay).TotalSeconds
            $totalSeconds = ((Get-Date) - $BuildStart).TotalSeconds
            $idleSeconds = ((Get-Date) - $lastActivity).TotalSeconds
            if ($elapsedSeconds -ge 5) {
                $lastDisplay = Get-Date
                Write-Host ('    Gradle running | elapsed ' + (New-TimeSpan -Seconds ([int]$totalSeconds)).ToString('hh\:mm\:ss')) -ForegroundColor Cyan
                if (Test-Path -LiteralPath $LogPath) {
                    @(Get-Content -LiteralPath $LogPath -Tail 2 -ErrorAction SilentlyContinue) | ForEach-Object {
                        if ($_.Trim()) { Write-Host ('    ' + $_.Trim()) -ForegroundColor DarkGray }
                    }
                }
            }
            if ($totalSeconds -ge ($GradleTimeoutMinutes * 60)) {
                Stop-Tree $p.Id
                throw ('Gradle exceeded the total timeout of ' + $GradleTimeoutMinutes + ' minutes.')
            }
            if ($idleSeconds -ge ($GradleIdleTimeoutMinutes * 60)) {
                Stop-Tree $p.Id
                throw ('Gradle produced no new log output for ' + $GradleIdleTimeoutMinutes + ' minutes.')
            }
        }
        if ($p.ExitCode -ne 0) { throw ('Gradle exited with code ' + $p.ExitCode + '.') }
    } finally { $p.Dispose() }
}

try {
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - ANDROID RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Project: ' + $ScriptRoot)

    Write-Stage 10 'Checking required tools'
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js was not found in PATH.' }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm was not found in PATH.' }
    if (-not (Get-Command java.exe -ErrorAction SilentlyContinue)) { throw 'Java was not found in PATH.' }
    if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) { throw 'Git was not found in PATH.' }
    & node.exe --version
    & npm.cmd --version

    Write-Stage 20 'Checking project dependency manifest'
    $packageJson = Join-Path $ScriptRoot 'package.json'
    if (-not (Test-Path -LiteralPath $packageJson)) { throw 'mobile/package.json was not found.' }
    if (-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'node_modules'))) {
        throw 'node_modules is missing. Run the dependency build step first.'
    }

    if ($Fresh) {
        Write-Stage 28 'Refreshing npm dependencies'
        $lock = Join-Path $ScriptRoot 'package-lock.json'
        if (Test-Path -LiteralPath $lock) {
            Invoke-Checked -File 'npm.cmd' -Arguments @('ci','--no-audit','--no-fund','--legacy-peer-deps')
        } else {
            Invoke-Checked -File 'npm.cmd' -Arguments @('install','--no-audit','--no-fund','--legacy-peer-deps')
        }
    }

    Write-Stage 38 'Generating a clean Expo Android project'
    Invoke-Checked -File 'node.exe' -Arguments @((Join-Path $ScriptRoot 'scripts\prepare-android-release.js'))

    $AndroidRoot = Join-Path $ScriptRoot 'android'
    $Gradlew = Join-Path $AndroidRoot 'gradlew.bat'
    $InitScript = Join-Path $ScriptRoot 'myket.init.gradle'
    if (-not (Test-Path -LiteralPath $Gradlew)) { throw 'Generated Gradle wrapper was not found.' }
    if (-not (Test-Path -LiteralPath $InitScript)) { throw 'myket.init.gradle was not found.' }

    Write-Stage 55 'Validating Java 17 and Gradle wrapper'
    $javaMajor = Get-JavaMajorVersion
    Write-Host ('Java major version: ' + $javaMajor)
    if ($javaMajor -ne 17) { throw ('This project build policy requires JDK 17. Detected Java ' + $javaMajor + '.') }
    Invoke-Checked -File $Gradlew -Arguments @('--version') -WorkingDirectory $AndroidRoot

    if (-not $SkipDoctor) {
        Write-Stage 63 'Running Expo dependency diagnostics'
        Invoke-Checked -File 'npm.cmd' -Arguments @('exec','--','expo-doctor')
    }

    Write-Stage 72 'Building release APK with Myket repository policy'
    $logDir = Join-Path $AndroidRoot 'build\khatyar-build-logs'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $logPath = Join-Path $logDir ('assembleRelease-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    Write-Host ('Gradle log: ' + $logPath) -ForegroundColor DarkGray
    Invoke-GradleRelease -Gradlew $Gradlew -WorkingDirectory $AndroidRoot -InitScript $InitScript -LogPath $logPath

    Write-Stage 95 'Verifying release artifact'
    $apk = Join-Path $AndroidRoot 'app\build\outputs\apk\release\app-release.apk'
    if (-not (Test-Path -LiteralPath $apk)) {
        $apk = Join-Path $AndroidRoot 'app\build\outputs\apk\release\app-release-unsigned.apk'
    }
    if (-not (Test-Path -LiteralPath $apk)) { throw 'Gradle succeeded but no release APK was produced.' }
    $size = (Get-Item -LiteralPath $apk).Length
    if ($size -lt 100000) { throw ('Release APK is unexpectedly small: ' + $size + ' bytes.') }
    Write-Host ('APK: ' + $apk) -ForegroundColor Green
    Write-Host ('APK size: ' + $size + ' bytes') -ForegroundColor Green

    $FinalExitCode = 0
    $FinalStage = 'Completed'
    Write-Host ''
    Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
}
catch {
    $FinalExitCode = 1
    Write-Host ''
    Write-Host ('BUILD ERROR: ' + $_.Exception.Message) -ForegroundColor Red
}
finally {
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Final stage: ' + $FinalStage)
    Write-Host ('Exit code  : ' + $FinalExitCode)
    Write-Host '============================================================' -ForegroundColor Cyan
    if (-not $NoPause) { [void](Read-Host 'Press ENTER to close this window') }
}
exit $FinalExitCode
