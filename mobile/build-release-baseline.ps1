#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipDoctor,
    [switch]$ForcePrebuild,
    [ValidateSet('APK','AAB')][string]$ArtifactType = 'APK',
    [int]$GradleTimeoutMinutes = 180,
    [int]$GradleIdleTimeoutMinutes = 30,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = [IO.Path]::GetFullPath($PSScriptRoot)
Set-Location -LiteralPath $Root
$Start = Get-Date
$FinalStage = 'Starting'
$ExitCode = 1
$InitScript = Join-Path $Root 'gradle-mirror-baseline.init.gradle'
$PersistentGradleHome = 'F:\taxi-system\.gradle-cache'
$PrebuildMarker = Join-Path $Root 'android\.khatyar-prebuild-baseline.json'

function Stage([int]$Percent,[string]$Name) {
    $script:FinalStage = $Name
    Write-Host "`n[$($Percent.ToString('000'))%] $Name" -ForegroundColor Yellow
    Write-Host ('    Elapsed: ' + ((Get-Date)-$Start).ToString('hh\:mm\:ss'))
}
function Fail([string]$Message) { throw $Message }
function Invoke-Checked([string]$File,[string[]]$Arguments,[string]$Cwd=$Root) {
    Push-Location -LiteralPath $Cwd
    try {
        Write-Host ('> ' + $File + ' ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) { throw "$File exited with code $LASTEXITCODE." }
    } finally { Pop-Location }
}
function Stop-ProjectProcesses {
    $escaped = [regex]::Escape($Root)
    try {
        @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
            $_.ProcessId -ne $PID -and $_.Name -match '^(node|java|javaw)\.exe$' -and
            -not [string]::IsNullOrWhiteSpace([string]$_.CommandLine) -and $_.CommandLine -match $escaped
        }) | ForEach-Object { try { taskkill.exe /PID ([int]$_.ProcessId) /T /F 2>$null | Out-Null } catch {} }
    } catch {}
}
function Get-FileHashSafe([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}
function Test-PrebuildCurrent([string]$PackageHash) {
    if ($ForcePrebuild -or -not (Test-Path -LiteralPath $PrebuildMarker)) { return $false }
    try {
        $m = Get-Content -LiteralPath $PrebuildMarker -Raw | ConvertFrom-Json
        $android = Join-Path $Root 'android'
        return ([string]$m.packageHash -eq $PackageHash -and
                [string]$m.initHash -eq (Get-FileHashSafe $InitScript) -and
                (Test-Path -LiteralPath (Join-Path $android 'gradlew.bat')) -and
                (Test-Path -LiteralPath (Join-Path $android 'app\build.gradle')) -and
                (Test-Path -LiteralPath (Join-Path $android 'settings.gradle')))
    } catch { return $false }
}
function Save-PrebuildMarker([string]$PackageHash) {
    $android = Join-Path $Root 'android'
    $obj = [ordered]@{
        packageHash = $PackageHash
        lockHash = Get-FileHashSafe (Join-Path $Root 'package-lock.json')
        initHash = Get-FileHashSafe $InitScript
        created = (Get-Date).ToString('o')
    }
    $obj | ConvertTo-Json | Set-Content -LiteralPath $PrebuildMarker -Encoding UTF8
}
function Run-Gradle([string]$Gradlew,[string]$Cwd,[string]$LogPath,[string[]]$Tasks,[hashtable]$Environment) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'; $psi.WorkingDirectory = $Cwd; $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true; $psi.RedirectStandardOutput = $false; $psi.RedirectStandardError = $false
    $taskText = ($Tasks -join ' ')
    $command = '"' + $Gradlew + '" --init-script "' + $InitScript + '" ' + $taskText + ' --console=plain --stacktrace --warning-mode=all'
    $psi.Arguments = '/d /c "' + $command + ' > "' + $LogPath + '" 2>&1"'
    foreach ($key in $Environment.Keys) { $psi.EnvironmentVariables[$key] = [string]$Environment[$key] }
    Write-Host ('> ' + $Gradlew + ' --init-script ' + $InitScript + ' ' + $taskText) -ForegroundColor DarkGray
    $process = New-Object Diagnostics.Process; $process.StartInfo = $psi; [void]$process.Start()
    $lastLength = 0L; $lastActivity = Get-Date; $lastDisplay = Get-Date
    try {
        while (-not $process.HasExited) {
            Start-Sleep -Seconds 2
            if (Test-Path -LiteralPath $LogPath) {
                $length = (Get-Item -LiteralPath $LogPath).Length
                if ($length -gt $lastLength) { $lastLength = $length; $lastActivity = Get-Date }
            }
            $total = ((Get-Date)-$Start).TotalSeconds; $idle = ((Get-Date)-$lastActivity).TotalSeconds
            if (((Get-Date)-$lastDisplay).TotalSeconds -ge 10) {
                $lastDisplay = Get-Date
                Write-Host ('    Gradle running | ' + $taskText + ' | elapsed ' + (New-TimeSpan -Seconds ([int]$total)).ToString('hh\:mm\:ss')) -ForegroundColor Cyan
            }
            if ($total -ge ($GradleTimeoutMinutes * 60)) { try { taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null } catch {}; throw "Gradle exceeded $GradleTimeoutMinutes minutes." }
            if ($idle -ge ($GradleIdleTimeoutMinutes * 60)) { try { taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null } catch {}; throw "Gradle produced no new log output for $GradleIdleTimeoutMinutes minutes." }
        }
        if ($process.ExitCode -ne 0) {
            Write-Host "`n---------------- Last 160 Gradle log lines ----------------" -ForegroundColor Red
            if (Test-Path -LiteralPath $LogPath) { Get-Content -LiteralPath $LogPath -Tail 160 }
            Write-Host '------------------------------------------------------------' -ForegroundColor Red
            throw "Gradle exited with code $($process.ExitCode). Full log: $LogPath"
        }
    } finally { $process.Dispose() }
}

try {
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '      KHATYAR - FAST BASELINE ANDROID RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Project : ' + $Root); Write-Host ('Artifact: ' + $ArtifactType)

    Stage 10 'Validating baseline files and toolchain'
    foreach ($tool in @('node.exe','npm.cmd','java.exe','git.exe')) { if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "$tool was not found in PATH." } }
    $packagePath = Join-Path $Root 'package.json'; $lockPath = Join-Path $Root 'package-lock.json'
    if (-not (Test-Path -LiteralPath $packagePath)) { Fail 'package.json is missing.' }
    if (-not (Test-Path -LiteralPath $lockPath)) { Fail 'package-lock.json is missing.' }
    if (-not (Test-Path -LiteralPath $InitScript)) { Fail 'gradle-mirror-baseline.init.gradle is missing.' }
    $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    if ([string]$package.dependencies.expo -notmatch '^~?57\.') { Fail "Expo dependency is $($package.dependencies.expo); baseline requires SDK 57." }
    if ([string]$package.dependencies.'react-native' -ne '0.86.0') { Fail "React Native dependency is $($package.dependencies.'react-native'); baseline requires 0.86.0." }
    if ([string]$package.dependencies.react -ne '19.2.3') { Fail "React dependency is $($package.dependencies.react); baseline requires 19.2.3." }
    $packageHash = Get-FileHashSafe $packagePath
    Invoke-Checked 'cmd.exe' @('/d','/c','node.exe --version')
    Invoke-Checked 'cmd.exe' @('/d','/c','npm.cmd --version')
    Invoke-Checked 'cmd.exe' @('/d','/c','java.exe -version 2>&1')
    Invoke-Checked 'cmd.exe' @('/d','/c','git.exe --version')
    $javaVersion = (& cmd.exe /d /c 'java.exe -version 2>&1' | Out-String)
    if ($javaVersion -notmatch 'version\s+"17(?:\.|"|\s)') { Fail 'JDK 17 is required.' }

    if ($Fresh) {
        Stage 22 'Refreshing locked npm dependencies'
        Invoke-Checked 'npm.cmd' @('ci','--no-audit','--no-fund','--legacy-peer-deps','--include=dev')
    } elseif (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules\.bin\expo.cmd'))) {
        Stage 22 'Installing locked npm dependencies'
        Invoke-Checked 'npm.cmd' @('ci','--no-audit','--no-fund','--legacy-peer-deps','--include=dev')
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules\.bin\expo.cmd'))) { Fail 'Local Expo CLI is missing.' }

    if (-not $SkipDoctor) {
        Stage 30 'Running Expo diagnostics'
        $doctor = Join-Path $Root 'node_modules\.bin\expo-doctor.cmd'
        if (Test-Path -LiteralPath $doctor) { Invoke-Checked $doctor @() }
    }

    $android = Join-Path $Root 'android'
    if (Test-PrebuildCurrent $packageHash) {
        Stage 40 'Reusing existing native Android baseline (clean prebuild skipped)'
        Write-Host '    Native project matches package and mirror-policy markers.' -ForegroundColor Green
    } else {
        Stage 40 'Generating native Android project from package baseline'
        if (Test-Path -LiteralPath $android) {
            $oldWrapper = Join-Path $android 'gradlew.bat'
            if (Test-Path -LiteralPath $oldWrapper) { try { Invoke-Checked $oldWrapper @('--stop') $android } catch {} }
        }
        Stop-ProjectProcesses
        Invoke-Checked 'node.exe' @((Join-Path $Root 'scripts\prepare-android-release.js'))
        Save-PrebuildMarker $packageHash
    }

    $gradlew = Join-Path $android 'gradlew.bat'; $wrapperProps = Join-Path $android 'gradle\wrapper\gradle-wrapper.properties'
    if (-not (Test-Path -LiteralPath $gradlew)) { Fail 'Generated Gradle wrapper is missing.' }
    if ((Get-Content -LiteralPath $wrapperProps -Raw) -notmatch 'gradle-8\.13-bin\.zip') { Fail 'Generated wrapper is not pinned to Gradle 8.13.' }

    Stage 55 'Validating Gradle 8.13 / JDK 17'
    $versionLog = Join-Path $env:TEMP ('khatyar-baseline-gradle-' + [guid]::NewGuid().ToString('N') + '.txt')
    try {
        & cmd.exe /d /c ('"' + $gradlew + '" --version > "' + $versionLog + '" 2>&1')
        if ($LASTEXITCODE -ne 0) { Fail 'Gradle wrapper --version failed.' }
        $gradleVersion = Get-Content -LiteralPath $versionLog -Raw
    } finally { Remove-Item -LiteralPath $versionLog -Force -ErrorAction SilentlyContinue }
    if ($gradleVersion -notmatch 'Gradle 8\.13' -or $gradleVersion -notmatch 'Launcher JVM:\s+17(?:\.|\s|$)') { Fail 'Gradle/JDK baseline validation failed.' }
    Write-Host $gradleVersion.Trim() -ForegroundColor DarkGray

    Stage 68 'Preparing persistent Gradle cache'
    New-Item -ItemType Directory -Force -Path $PersistentGradleHome | Out-Null
    $logDir = Join-Path $android 'build\khatyar-baseline-logs'; New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $logPath = Join-Path $logDir (($ArtifactType.ToLowerInvariant()) + '-release-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    $gradleEnv = @{
        GRADLE_USER_HOME = $PersistentGradleHome
        GRADLE_OPTS = '-Dorg.gradle.internal.http.connectionTimeout=60000 -Dorg.gradle.internal.http.socketTimeout=180000 -Dfile.encoding=UTF-8'
        JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
        NODE_OPTIONS = '--dns-result-order=ipv4first'
        CI = '1'
    }

    $task = if ($ArtifactType -eq 'AAB') { 'bundleRelease' } else { 'assembleRelease' }
    Stage 75 ('Building cached Android release ' + $ArtifactType)
    Write-Host '[khatyar-fast] Persistent Gradle cache: F:\taxi-system\.gradle-cache' -ForegroundColor DarkGray
    Write-Host '[khatyar-fast] Clean prebuild is skipped when the native baseline marker is current.' -ForegroundColor DarkGray
    Write-Host '[khatyar-fast] Expo/RN remain excluded from Runflare.' -ForegroundColor DarkGray
    Run-Gradle $gradlew $android $logPath @($task) $gradleEnv

    Stage 95 'Verifying release artifact'
    $artifact = if ($ArtifactType -eq 'AAB') { Join-Path $android 'app\build\outputs\bundle\release\app-release.aab' } else { Join-Path $android 'app\build\outputs\apk\release\app-release.apk' }
    if (-not (Test-Path -LiteralPath $artifact)) { Fail "Build completed but artifact was not found: $artifact" }
    $size = [math]::Round((Get-Item -LiteralPath $artifact).Length / 1MB, 2)
    Write-Host ('Artifact: ' + $artifact) -ForegroundColor Green
    Write-Host ('Size MB : ' + $size) -ForegroundColor Green
    Write-Host ('Log     : ' + $logPath) -ForegroundColor Green
    $ExitCode = 0
}
catch {
    $ExitCode = 1; Write-Host "`nBUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host ('Final stage : ' + $FinalStage); Write-Host ('Exit code   : ' + $ExitCode); Write-Host ('Total elapsed: ' + ((Get-Date)-$Start).ToString('hh\:mm\:ss'))
    Write-Host '============================================================' -ForegroundColor Cyan
    if (-not $NoPause) { Read-Host 'Press ENTER to close this window' | Out-Null }
}
exit $ExitCode
