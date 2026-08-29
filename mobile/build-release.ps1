#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipDoctor,
    [switch]$StrictDoctor,
    [ValidateSet('APK','AAB')][string]$ArtifactType = 'APK',
    [int]$GradleTimeoutMinutes = 180,
    [int]$GradleIdleTimeoutMinutes = 30,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ScriptRoot = [IO.Path]::GetFullPath($PSScriptRoot)
Set-Location -LiteralPath $ScriptRoot
$BuildStart = Get-Date
$FinalExitCode = 1
$FinalStage = 'Starting'

function Stage([int]$Percent,[string]$Name) {
    $script:FinalStage = $Name
    Write-Host "`n[$($Percent.ToString('000'))%] $Name" -ForegroundColor Yellow
    Write-Host ('    Elapsed: ' + ((Get-Date)-$BuildStart).ToString('hh\:mm\:ss'))
}

function Invoke-DirectChecked([string]$File,[string[]]$Arguments,[string]$Cwd=$ScriptRoot) {
    Push-Location -LiteralPath $Cwd
    try {
        Write-Host ('> ' + $File + ' ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
        & $File @Arguments
        $code = $LASTEXITCODE
        if ($null -ne $code -and $code -ne 0) { throw ("$File exited with code {0}." -f $code) }
    } finally { Pop-Location }
}

function Invoke-CmdChecked([string]$CommandLine,[string]$Cwd=$ScriptRoot) {
    Push-Location -LiteralPath $Cwd
    try {
        Write-Host ('> cmd.exe /d /c ' + $CommandLine) -ForegroundColor DarkGray
        & cmd.exe /d /c $CommandLine
        $code = $LASTEXITCODE
        if ($null -ne $code -and $code -ne 0) { throw ("Command exited with code {0}: {1}" -f $code, $CommandLine) }
    } finally { Pop-Location }
}

function Stop-Tree([int]$ProcessId) {
    if($ProcessId -gt 0){ try{ taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null }catch{} }
}

# Standard release build deliberately does NOT pass a project Gradle init script.
# Expo/RN included builds must keep their own plugin-management resolution path.
# Repository mirrors for generated Android projects are handled by the project
# configuration/plugin layer prepared by prepare-android-release.js.
function Run-Gradle([string]$Gradlew,[string]$Cwd,[string]$LogPath,[string]$Task) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'
    $psi.WorkingDirectory = $Cwd
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false
    $command = '"' + $Gradlew + '" ' + $Task + ' --console=plain --stacktrace --warning-mode=all'
    $psi.Arguments = '/d /c "' + $command + ' > "' + $LogPath + '" 2>&1"'
    Write-Host ('> ' + $Gradlew + ' ' + $Task) -ForegroundColor DarkGray
    $p = New-Object Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    $lastLen = 0
    $lastActivity = Get-Date
    $lastDisplay = Get-Date
    try {
        while(-not $p.HasExited){
            Start-Sleep -Seconds 2
            if(Test-Path -LiteralPath $LogPath){
                $len=(Get-Item -LiteralPath $LogPath).Length
                if($len -gt $lastLen){$lastLen=$len;$lastActivity=Get-Date}
            }
            $total=((Get-Date)-$BuildStart).TotalSeconds
            $idle=((Get-Date)-$lastActivity).TotalSeconds
            if(((Get-Date)-$lastDisplay).TotalSeconds -ge 10){
                $lastDisplay=Get-Date
                Write-Host ('    Gradle running | ' + $Task + ' | elapsed ' + (New-TimeSpan -Seconds ([int]$total)).ToString('hh\:mm\:ss')) -ForegroundColor Cyan
                if(Test-Path -LiteralPath $LogPath){
                    @(Get-Content -LiteralPath $LogPath -Tail 3 -ErrorAction SilentlyContinue) | ForEach-Object {
                        if($_.Trim()){ Write-Host ('    '+$_.Trim()) -ForegroundColor DarkGray }
                    }
                }
            }
            if($total -ge ($GradleTimeoutMinutes*60)){ Stop-Tree $p.Id; throw ("Gradle exceeded {0} minutes." -f $GradleTimeoutMinutes) }
            if($idle -ge ($GradleIdleTimeoutMinutes*60)){ Stop-Tree $p.Id; throw ("Gradle produced no new log output for {0} minutes." -f $GradleIdleTimeoutMinutes) }
        }
        if($p.ExitCode -ne 0){
            Write-Host "`n---------------- Last 200 Gradle log lines ----------------" -ForegroundColor Red
            if(Test-Path -LiteralPath $LogPath){ Get-Content -LiteralPath $LogPath -Tail 200 }
            Write-Host '--------------------------------------------------------------' -ForegroundColor Red
            throw ("Gradle exited with code {0}." -f $p.ExitCode)
        }
    } finally { $p.Dispose() }
}

function Invoke-OptionalDoctor {
    if ($SkipDoctor) {
        Write-Host '[khatyar-build] expo-doctor explicitly skipped.' -ForegroundColor DarkGray
        return
    }

    if (-not $StrictDoctor) {
        Write-Host '[khatyar-build] expo-doctor disabled for standard release builds (use -StrictDoctor to enable).' -ForegroundColor DarkGray
        return
    }

    Stage 63 'Running Expo dependency diagnostics (strict mode)'
    $doctorLines = @()
    & cmd.exe /d /c 'npm.cmd exec -- expo-doctor' 2>&1 | ForEach-Object {
        $doctorLines += [string]$_
        Write-Host $_ -ForegroundColor DarkGray
    }
    $doctorExit = $LASTEXITCODE
    if ($doctorExit -ne 0) {
        throw ('expo-doctor exited with code ' + $doctorExit + '.')
    }
    Write-Host 'expo-doctor completed successfully.' -ForegroundColor Green
}

try {
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - ANDROID STANDARD RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Project: ' + $ScriptRoot)
    Write-Host ('Artifact: ' + $ArtifactType)

    Stage 5 'Preparing and validating the complete build environment'
    $EnvironmentScript = Join-Path $ScriptRoot 'scripts\ensure-build-environment.ps1'
    if(-not (Test-Path -LiteralPath $EnvironmentScript)){ throw 'scripts\ensure-build-environment.ps1 is missing.' }

    if(-not $env:KHATYAR_ANDROID_SDK_MIRROR_URL){ $env:KHATYAR_ANDROID_SDK_MIRROR_URL = 'https://mirrors.cloud.tencent.com/AndroidSDK/' }
    if(-not $env:SDK_TEST_BASE_URL){ $env:SDK_TEST_BASE_URL = $env:KHATYAR_ANDROID_SDK_MIRROR_URL }
    if(-not $env:KHATYAR_ANDROID_MIRROR_URL_ACTIVE){ $env:KHATYAR_ANDROID_MIRROR_URL_ACTIVE = $env:KHATYAR_ANDROID_SDK_MIRROR_URL }
    Write-Host ('[khatyar-build] Android SDK mirror: ' + $env:KHATYAR_ANDROID_SDK_MIRROR_URL) -ForegroundColor DarkGray

    $envArgs = @()
    if($Fresh){ $envArgs += '-Fresh' }
    Invoke-DirectChecked 'powershell.exe' (@('-NoProfile','-ExecutionPolicy','Bypass','-File',$EnvironmentScript) + $envArgs)

    Stage 10 'Checking required tools'
    $toolCommands = @('node.exe','npm.cmd','java.exe','git.exe')
    foreach($tool in $toolCommands){
        if(-not (Get-Command $tool -ErrorAction SilentlyContinue)){ throw "$tool was not found in PATH." }
    }
    Invoke-CmdChecked 'node.exe --version'
    Invoke-CmdChecked 'npm.cmd --version'
    Invoke-CmdChecked 'java.exe -version 2>&1'
    Invoke-CmdChecked 'git.exe --version'

    Stage 20 'Checking project dependency manifest'
    if(-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'package.json'))){ throw 'package.json was not found.' }
    if(-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'node_modules'))){ throw 'node_modules is missing after environment preparation.' }
    if(-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'node_modules\expo\package.json'))){ throw 'Expo dependency is missing after environment preparation.' }

    Stage 38 'Generating a clean Expo Android project'
    Invoke-DirectChecked 'node.exe' @((Join-Path $ScriptRoot 'scripts\prepare-android-release.js'))

    $android = Join-Path $ScriptRoot 'android'
    $gradlew = Join-Path $android 'gradlew.bat'
    $wrapperProps = Join-Path $android 'gradle\wrapper\gradle-wrapper.properties'
    if(-not (Test-Path -LiteralPath $gradlew)){ throw 'Generated gradlew.bat is missing.' }
    if(-not (Test-Path -LiteralPath $wrapperProps)){ throw 'Generated gradle-wrapper.properties is missing.' }
    $wrapperText = Get-Content -LiteralPath $wrapperProps -Raw
    if($wrapperText -notmatch 'gradle-8\.13-bin\.zip'){ throw 'Gradle wrapper must use Gradle 8.13.' }

    Stage 55 'Validating Java 17 and Gradle wrapper'
    $gv = Join-Path $env:TEMP ('khatyar-gradle-version-' + [guid]::NewGuid().ToString('N') + '.txt')
    try {
        & cmd.exe /d /c ('"' + $gradlew + '" --version > "' + $gv + '" 2>&1')
        $gradleVersionExit = $LASTEXITCODE
        $gradleVersionText = if(Test-Path -LiteralPath $gv){ Get-Content -LiteralPath $gv -Raw } else { '' }
    } finally { Remove-Item -LiteralPath $gv -Force -ErrorAction SilentlyContinue }
    if($gradleVersionExit -ne 0){ throw 'Gradle wrapper --version failed.' }
    Write-Host $gradleVersionText.Trim() -ForegroundColor DarkGray
    if($gradleVersionText -notmatch 'Gradle 8\.13'){ throw 'Gradle wrapper did not launch Gradle 8.13.' }
    if($gradleVersionText -notmatch 'Launcher JVM:\s+17(?:\.|\s|$)'){ throw 'JDK 17 is required for the Android build.' }

    Invoke-OptionalDoctor

    $task = if($ArtifactType -eq 'AAB'){'bundleRelease'}else{'assembleRelease'}
    Stage 72 ('Building standard Android release ' + $ArtifactType)
    Write-Host '[khatyar-build] Maven: project-local generated configuration -> Myket/Runflare/official as prepared by Expo build plugins.' -ForegroundColor DarkGray
    Write-Host '[khatyar-build] Gradle Wrapper: local F:\gradle-cache -> configured fallback.' -ForegroundColor DarkGray
    $logDir = Join-Path $android 'build\khatyar-build-logs'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $logPath = Join-Path $logDir ($task + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    Run-Gradle $gradlew $android $logPath $task

    Stage 95 'Verifying release artifact'
    if($ArtifactType -eq 'AAB'){
        $artifact = Join-Path $android 'app\build\outputs\bundle\release\app-release.aab'
    } else {
        $artifact = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
    }
    if(-not (Test-Path -LiteralPath $artifact)){
        if($ArtifactType -eq 'APK'){
            $artifact = Join-Path $android 'app\build\outputs\apk\release\app-release-unsigned.apk'
        }
    }
    if(-not (Test-Path -LiteralPath $artifact)){ throw "Release artifact was not found: $artifact" }
    $sizeMB = [math]::Round((Get-Item -LiteralPath $artifact).Length / 1MB, 2)
    Write-Host ('Artifact: ' + $artifact) -ForegroundColor Green
    Write-Host ('Size MB : ' + $sizeMB) -ForegroundColor Green
    $FinalExitCode = 0
}
catch {
    $FinalExitCode = 1
    Write-Host "`nBUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host ('Final stage : ' + $FinalStage)
    Write-Host ('Exit code   : ' + $FinalExitCode)
    Write-Host ('Total elapsed: ' + ((Get-Date)-$BuildStart).ToString('hh\:mm\:ss'))
    Write-Host '============================================================' -ForegroundColor Cyan
    if(-not $NoPause){ Read-Host 'Press ENTER to close this window' | Out-Null }
}
exit $FinalExitCode
