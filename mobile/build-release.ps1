#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipCleanup,
    [switch]$SkipDoctor,
    [switch]$StrictDoctor,
    [ValidateSet('APK','AAB')][string]$ArtifactType = 'APK',
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
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false

    $extension = [System.IO.Path]::GetExtension($File).ToLowerInvariant()
    if ($extension -eq '.bat' -or $extension -eq '.cmd') {
        $psi.FileName = 'cmd.exe'
        $command = '"' + $File + '"'
        foreach ($arg in $Arguments) {
            $a = [string]$arg
            $command += ' "' + ($a -replace '"','\"') + '"'
        }
        $psi.Arguments = '/d /c "' + $command + '"'
    } else {
        $psi.FileName = $File
        foreach ($arg in $Arguments) {
            $a = [string]$arg
            if ($a -match '[\s"]') { $psi.Arguments += ' "' + ($a -replace '"','\"') + '"' }
            else { $psi.Arguments += ' ' + $a }
        }
    }

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    try {
        [void]$p.Start()
        $p.WaitForExit()
        if ($p.ExitCode -ne 0) { throw ($File + ' exited with code ' + $p.ExitCode + '.') }
    } finally { $p.Dispose() }
}

function Invoke-CommandWithCapture {
    param(
        [Parameter(Mandatory=$true)][string]$File,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [string]$WorkingDirectory = $ScriptRoot
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    $extension = [System.IO.Path]::GetExtension($File).ToLowerInvariant()
    if ($extension -eq '.bat' -or $extension -eq '.cmd') {
        $psi.FileName = 'cmd.exe'
        $command = '"' + $File + '"'
        foreach ($arg in $Arguments) {
            $a = [string]$arg
            $command += ' "' + ($a -replace '"','\"') + '"'
        }
        $psi.Arguments = '/d /c "' + $command + '"'
    } else {
        $psi.FileName = $File
        foreach ($arg in $Arguments) {
            $a = [string]$arg
            if ($a -match '[\s"]') { $psi.Arguments += ' "' + ($a -replace '"','\"') + '"' }
            else { $psi.Arguments += ' ' + $a }
        }
    }

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    try {
        [void]$p.Start()
        $stdout = $p.StandardOutput.ReadToEnd()
        $stderr = $p.StandardError.ReadToEnd()
        $p.WaitForExit()
        return [pscustomobject]@{ ExitCode = $p.ExitCode; Output = $stdout; Error = $stderr }
    } finally { $p.Dispose() }
}

function Get-JavaMajorVersion {
    $result = Invoke-CommandWithCapture -File 'java.exe' -Arguments @('-version')
    if ($result.ExitCode -ne 0) { throw 'java.exe -version failed.' }
    $text = ($result.Output + "`n" + $result.Error)
    $m = [regex]::Match($text, 'version\s+"([0-9]+)(?:\.([0-9]+))?')
    if (-not $m.Success) { throw 'Unable to determine Java major version.' }
    return [int]$m.Groups[1].Value
}

function Get-WrapperDistributionVersion {
    param([string]$PropertiesPath)
    $text = Get-Content -LiteralPath $PropertiesPath -Raw -ErrorAction Stop
    $m = [regex]::Match($text, 'distributionUrl=.*gradle-([0-9.]+)-bin\.zip')
    if (-not $m.Success) { throw 'Unable to determine Gradle wrapper distribution version.' }
    return $m.Groups[1].Value
}

function Show-GradleFailureLog {
    param([string]$LogPath, [int]$Lines = 160)
    if (-not (Test-Path -LiteralPath $LogPath)) {
        Write-Host 'Gradle log file was not created.' -ForegroundColor Red
        return
    }
    Write-Host ''
    Write-Host ('---------------- Last ' + $Lines + ' Gradle log lines ----------------') -ForegroundColor Red
    @(Get-Content -LiteralPath $LogPath -Tail $Lines -ErrorAction SilentlyContinue) | ForEach-Object {
        if ($_.Trim()) { Write-Host $_ }
    }
    Write-Host '--------------------------------------------------------------' -ForegroundColor Red
}

function Invoke-GradleRelease {
    param(
        [string]$Gradlew,
        [string]$WorkingDirectory,
        [string]$LogPath,
        [ValidateSet('assembleRelease','bundleRelease')][string]$GradleTask
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false

    # Standard Android release build. No Myket init script or Myket repository
    # hook is supplied here; dependency repositories come from the Expo/RN
    # generated Gradle project and standard Gradle repository configuration.
    $command = '"' + $Gradlew + '" ' + $GradleTask + ' --console=plain --stacktrace --warning-mode=all'
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
            $displaySeconds = ((Get-Date) - $lastDisplay).TotalSeconds
            $totalSeconds = ((Get-Date) - $BuildStart).TotalSeconds
            $idleSeconds = ((Get-Date) - $lastActivity).TotalSeconds
            if ($displaySeconds -ge 5) {
                $lastDisplay = Get-Date
                Write-Host ('    Gradle running | task ' + $GradleTask + ' | elapsed ' + (New-TimeSpan -Seconds ([int]$totalSeconds)).ToString('hh\:mm\:ss')) -ForegroundColor Cyan
                if (Test-Path -LiteralPath $LogPath) {
                    @(Get-Content -LiteralPath $LogPath -Tail 4 -ErrorAction SilentlyContinue) | ForEach-Object {
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
        $exitCode = $p.ExitCode
        if ($exitCode -ne 0) {
            Show-GradleFailureLog -LogPath $LogPath -Lines 160
            throw ('Gradle exited with code ' + $exitCode + '.')
        }
    } finally { $p.Dispose() }
}

try {
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - ANDROID STANDARD RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Project: ' + $ScriptRoot)
    Write-Host ('Artifact: ' + $ArtifactType)

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
    if (-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'node_modules'))) { throw 'node_modules is missing. Run the dependency installation step first.' }

    if ($Fresh) {
        Write-Stage 28 'Refreshing npm dependencies'
        $lock = Join-Path $ScriptRoot 'package-lock.json'
        if (Test-Path -LiteralPath $lock) { Invoke-Checked -File 'npm.cmd' -Arguments @('ci','--no-audit','--no-fund','--legacy-peer-deps') }
        else { Invoke-Checked -File 'npm.cmd' -Arguments @('install','--no-audit','--no-fund','--legacy-peer-deps') }
    }

    Write-Stage 38 'Generating a clean Expo Android project'
    Invoke-Checked -File 'node.exe' -Arguments @((Join-Path $ScriptRoot 'scripts\prepare-android-release.js'))

    $AndroidRoot = Join-Path $ScriptRoot 'android'
    $Gradlew = Join-Path $AndroidRoot 'gradlew.bat'
    $WrapperProperties = Join-Path $AndroidRoot 'gradle\wrapper\gradle-wrapper.properties'
    foreach ($required in @($Gradlew,$WrapperProperties)) { if (-not (Test-Path -LiteralPath $required)) { throw ('Required generated file is missing: ' + $required) } }

    $wrapperVersion = Get-WrapperDistributionVersion $WrapperProperties
    Write-Host ('Gradle wrapper distribution: ' + $wrapperVersion)
    if ($wrapperVersion -ne '8.13') { throw ('Generated Gradle wrapper is ' + $wrapperVersion + '; expected 8.13 for this project.') }

    Write-Stage 55 'Validating Java 17 and Gradle wrapper'
    $javaMajor = Get-JavaMajorVersion
    Write-Host ('Java major version: ' + $javaMajor)
    if ($javaMajor -ne 17) { throw ('This project build policy requires JDK 17. Detected Java ' + $javaMajor + '.') }
    $gradleVersionCheck = Invoke-CommandWithCapture -File $Gradlew -Arguments @('--version') -WorkingDirectory $AndroidRoot
    if ($gradleVersionCheck.Output.Trim()) { Write-Host $gradleVersionCheck.Output.Trim() -ForegroundColor DarkGray }
    if ($gradleVersionCheck.Error.Trim()) { Write-Host $gradleVersionCheck.Error.Trim() -ForegroundColor DarkGray }
    if ($gradleVersionCheck.ExitCode -ne 0) { throw 'Gradle wrapper --version failed.' }
    if ($gradleVersionCheck.Output -notmatch 'Gradle 8\.13') { throw 'Gradle wrapper did not launch Gradle 8.13.' }

    if (-not $SkipDoctor) {
        Write-Stage 63 'Running Expo dependency diagnostics'
        $doctor = Invoke-CommandWithCapture -File 'npm.cmd' -Arguments @('exec','--','expo-doctor')
        if ($doctor.Output.Trim()) { Write-Host $doctor.Output.Trim() -ForegroundColor DarkGray }
        if ($doctor.Error.Trim()) { Write-Host $doctor.Error.Trim() -ForegroundColor DarkGray }
        if ($doctor.ExitCode -ne 0) {
            $message = 'expo-doctor exited with code ' + $doctor.ExitCode + '. Diagnostics are non-blocking by default.'
            if ($StrictDoctor) { throw $message }
            Write-Host $message -ForegroundColor Yellow
        } else { Write-Host 'expo-doctor completed successfully.' -ForegroundColor Green }
    }

    $gradleTask = if ($ArtifactType -eq 'AAB') { 'bundleRelease' } else { 'assembleRelease' }
    Write-Stage 72 ('Building standard Android release ' + $ArtifactType)
    $logDir = Join-Path $AndroidRoot 'build\khatyar-build-logs'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $logPath = Join-Path $logDir ($gradleTask + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    Write-Host ('Gradle log: ' + $logPath) -ForegroundColor DarkGray
    Invoke-GradleRelease -Gradlew $Gradlew -WorkingDirectory $AndroidRoot -LogPath $logPath -GradleTask $gradleTask

    Write-Stage 95 'Verifying release artifact'
    if ($ArtifactType -eq 'AAB') { $artifact = Join-Path $AndroidRoot 'app\build\outputs\bundle\release\app-release.aab' }
    else {
        $artifact = Join-Path $AndroidRoot 'app\build\outputs\apk\release\app-release.apk'
        if (-not (Test-Path -LiteralPath $artifact)) { $artifact = Join-Path $AndroidRoot 'app\build\outputs\apk\release\app-release-unsigned.apk' }
    }
    if (-not (Test-Path -LiteralPath $artifact)) { throw ('Gradle succeeded but no release ' + $ArtifactType + ' was produced.') }
    $size = (Get-Item -LiteralPath $artifact).Length
    if ($size -lt 100000) { throw ('Release ' + $ArtifactType + ' is unexpectedly small: ' + $size + ' bytes.') }
    Write-Host ($ArtifactType + ': ' + $artifact) -ForegroundColor Green
    Write-Host ($ArtifactType + ' size: ' + $size + ' bytes') -ForegroundColor Green

    $FinalExitCode = 0
    $FinalStage = 'Completed'
    Write-Host ''
    Write-Host ('ANDROID STANDARD RELEASE ' + $ArtifactType + ' BUILD COMPLETED SUCCESSFULLY.') -ForegroundColor Green
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
    if (-not $NoPause) { [void](Read-Host 'Press ENTER to close the window') }
}
exit $FinalExitCode