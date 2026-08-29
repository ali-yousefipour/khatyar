#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipDoctor,
    [switch]$StrictDoctor,
    [switch]$ForcePrebuild,
    [ValidateSet('APK','AAB')][string]$ArtifactType = 'APK',
    [int]$GradleTimeoutMinutes = 120,
    [int]$GradleIdleTimeoutMinutes = 15,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = [IO.Path]::GetFullPath($PSScriptRoot)
Set-Location -LiteralPath $Root
$Start = Get-Date
$FinalStage = 'Starting'
$ExitCode = 1
$InitScript = Join-Path $Root 'gradle-mirror.init.gradle'
$PersistentGradleHome = 'F:\taxi-system\.gradle-cache'
$PrebuildMarker = Join-Path $Root 'android\.khatyar-prebuild.json'

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
function Configure-GradlePerformance([string]$Android) {
    # Tuned for 24 GB RAM / Intel Core i3-6100 (4 logical processors).
    # Do not over-allocate RAM: Windows, Node and Android tooling also need memory.
    $cpu = [Environment]::ProcessorCount
    $workers = [Math]::Max(2, [Math]::Min($cpu, 4))
    $propsPath = Join-Path $Android 'gradle.properties'
    $props = @()
    if (Test-Path -LiteralPath $propsPath) { $props = @(Get-Content -LiteralPath $propsPath) }
    $keys = [ordered]@{
        'org.gradle.jvmargs' = '-Xmx12g -XX:MaxMetaspaceSize=3g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8'
        'org.gradle.daemon' = 'true'
        'org.gradle.parallel' = 'true'
        'org.gradle.workers.max' = [string]$workers
        'org.gradle.caching' = 'true'
        'org.gradle.configureondemand' = 'true'
        'org.gradle.vfs.watch' = 'true'
        'org.gradle.daemon.performance.disable-logging' = 'true'
    }
    foreach ($key in $keys.Keys) {
        $value = [string]$keys[$key]
        $found = $false
        $next = foreach ($line in $props) {
            if ($line -match ('^\s*' + [regex]::Escape($key) + '\s*=')) { $found = $true; "$key=$value" } else { $line }
        }
        if (-not $found) { $next += "$key=$value" }
        $props = @($next)
    }
    Set-Content -LiteralPath $propsPath -Value $props -Encoding UTF8
    Write-Host "    Gradle memory: 12 GiB heap / 3 GiB metaspace / $workers workers" -ForegroundColor Green
}
function Run-Gradle([string]$Gradlew,[string]$Cwd,[string]$LogPath,[string]$Task,[hashtable]$Environment) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'; $psi.WorkingDirectory = $Cwd; $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true; $psi.RedirectStandardOutput = $false; $psi.RedirectStandardError = $false
    $command = '"' + $Gradlew + '" --init-script "' + $InitScript + '" ' + $Task + ' --parallel --build-cache --console=plain --stacktrace'
    $psi.Arguments = '/d /c "' + $command + ' > "' + $LogPath + '" 2>&1"'
    foreach ($key in $Environment.Keys) { $psi.EnvironmentVariables[$key] = [string]$Environment[$key] }
    Write-Host ('> ' + $Gradlew + ' --init-script ' + $InitScript + ' ' + $Task + ' --parallel --build-cache') -ForegroundColor DarkGray
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
                Write-Host ('    Gradle running | ' + $Task + ' | elapsed ' + (New-TimeSpan -Seconds ([int]$total)).ToString('hh\:mm\:ss')) -ForegroundColor Cyan
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
    Write-Host '       KHATYAR - FAST ANDROID RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Project: ' + $Root); Write-Host ('Artifact: ' + $ArtifactType)

    Stage 10 'Checking required tools'
    foreach ($tool in @('node.exe','npm.cmd','java.exe','git.exe')) { if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "$tool was not found in PATH." } }
    $packagePath = Join-Path $Root 'package.json'; $lockPath = Join-Path $Root 'package-lock.json'
    if (-not (Test-Path -LiteralPath $packagePath)) { Fail 'package.json is missing.' }
    if (-not (Test-Path -LiteralPath $lockPath)) { Fail 'package-lock.json is missing.' }
    if (-not (Test-Path -LiteralPath $InitScript)) { Fail 'gradle-mirror.init.gradle is missing.' }
    $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    if ([string]$package.dependencies.expo -notmatch '^~?57\.') { Fail "Expo dependency is $($package.dependencies.expo); SDK 57 baseline required." }
    if ([string]$package.dependencies.'react-native' -ne '0.86.0') { Fail 'React Native 0.86.0 baseline required.' }
    if ([string]$package.dependencies.react -ne '19.2.3') { Fail 'React 19.2.3 baseline required.' }
    $packageHash = Get-FileHashSafe $packagePath
    Invoke-Checked 'cmd.exe' @('/d','/c','node.exe --version')
    Invoke-Checked 'cmd.exe' @('/d','/c','npm.cmd --version')
    Invoke-Checked 'cmd.exe' @('/d','/c','java.exe -version 2>&1')
    Invoke-Checked 'cmd.exe' @('/d','/c','git.exe --version')

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
        Stage 40 'Reusing existing Android native project (clean prebuild skipped)'
    } else {
        Stage 40 'Generating Android native project from Expo baseline'
        if (Test-Path -LiteralPath $android) {
            $oldWrapper = Join-Path $android 'gradlew.bat'
            if (Test-Path -LiteralPath $oldWrapper) { try { Invoke-Checked $oldWrapper @('--stop') $android } catch {} }
        }
        Invoke-Checked 'node.exe' @((Join-Path $Root 'scripts\prepare-android-release.js'))
        Save-PrebuildMarker $packageHash
    }

    $gradlew = Join-Path $android 'gradlew.bat'; $wrapperProps = Join-Path $android 'gradle\wrapper\gradle-wrapper.properties'
    if (-not (Test-Path -LiteralPath $gradlew)) { Fail 'Gradle wrapper is missing.' }
    if ((Get-Content -LiteralPath $wrapperProps -Raw) -notmatch 'gradle-8\.13-bin\.zip') { Fail 'Gradle 8.13 baseline required.' }

    Stage 55 'Configuring high-performance Gradle daemon'
    Configure-GradlePerformance $android

    Stage 62 'Validating Gradle 8.13 / JDK 17'
    $versionLog = Join-Path $env:TEMP ('khatyar-gradle-' + [guid]::NewGuid().ToString('N') + '.txt')
    try {
        & cmd.exe /d /c ('"' + $gradlew + '" --version > "' + $versionLog + '" 2>&1')
        if ($LASTEXITCODE -ne 0) { Fail 'Gradle wrapper --version failed.' }
        $version = Get-Content -LiteralPath $versionLog -Raw
    } finally { Remove-Item -LiteralPath $versionLog -Force -ErrorAction SilentlyContinue }
    if ($version -notmatch 'Gradle 8\.13' -or $version -notmatch 'Launcher JVM:\s+17(?:\.|\s|$)') { Fail 'Gradle/JDK baseline validation failed.' }

    Stage 70 'Preparing persistent Gradle cache'
    New-Item -ItemType Directory -Force -Path $PersistentGradleHome | Out-Null
    $logDir = Join-Path $android 'build\khatyar-fast-logs'; New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    $task = if ($ArtifactType -eq 'AAB') { 'bundleRelease' } else { 'assembleRelease' }
    $logPath = Join-Path $logDir (($ArtifactType.ToLowerInvariant()) + '-release-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    $gradleEnv = @{
        GRADLE_USER_HOME = $PersistentGradleHome
        GRADLE_OPTS = '-Dorg.gradle.internal.http.connectionTimeout=20000 -Dorg.gradle.internal.http.socketTimeout=60000 -Dfile.encoding=UTF-8'
        JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
        NODE_OPTIONS = '--dns-result-order=ipv4first'
        CI = '1'
    }

    Stage 75 ('Building cached Android release ' + $ArtifactType)
    Write-Host '[khatyar-fast] Configuration cache intentionally disabled for Expo/RN compatibility.' -ForegroundColor DarkGray
    Write-Host '[khatyar-fast] Parallel + build cache enabled; persistent cache retained.' -ForegroundColor DarkGray
    Run-Gradle $gradlew $android $logPath $task $gradleEnv

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
