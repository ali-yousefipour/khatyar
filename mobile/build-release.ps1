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
$InitScript = Join-Path $ScriptRoot 'gradle-mirror.init.gradle'

function Stage([int]$Percent,[string]$Name) {
    $script:FinalStage = $Name
    Write-Host "`n[$($Percent.ToString('000'))%] $Name" -ForegroundColor Yellow
    Write-Host ('    Elapsed: ' + ((Get-Date)-$BuildStart).ToString('hh\:mm\:ss'))
}

function Invoke-DirectChecked([string]$File,[string[]]$Args,[string]$Cwd=$ScriptRoot) {
    Push-Location -LiteralPath $Cwd
    try {
        Write-Host ('> ' + $File + ' ' + ($Args -join ' ')) -ForegroundColor DarkGray
        & $File @Args
        $code = $LASTEXITCODE
        if ($null -ne $code -and $code -ne 0) { throw "$File exited with code $code." }
    } finally { Pop-Location }
}

function Get-Captured([string]$File,[string[]]$Args,[string]$Cwd=$ScriptRoot) {
    Push-Location -LiteralPath $Cwd
    try {
        $o = & $File @Args 2>&1 | Out-String
        $code = $LASTEXITCODE
        return [pscustomobject]@{ ExitCode=$code; Text=$o }
    } finally { Pop-Location }
}

function Stop-Tree([int]$ProcessId) {
    if($ProcessId -gt 0){ try{ taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null }catch{} }
}

function Run-Gradle([string]$Gradlew,[string]$Cwd,[string]$LogPath,[string]$Task) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'
    $psi.WorkingDirectory = $Cwd
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false
    $command = '"' + $Gradlew + '" --init-script "' + $InitScript + '" ' + $Task + ' --console=plain --stacktrace --warning-mode=all'
    $psi.Arguments = '/d /c "' + $command + ' > "' + $LogPath + '" 2>&1"'
    Write-Host ('> ' + $Gradlew + ' --init-script ' + $InitScript + ' ' + $Task) -ForegroundColor DarkGray
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
            if($total -ge ($GradleTimeoutMinutes*60)){ Stop-Tree $p.Id; throw "Gradle exceeded $GradleTimeoutMinutes minutes." }
            if($idle -ge ($GradleIdleTimeoutMinutes*60)){ Stop-Tree $p.Id; throw "Gradle produced no new log output for $GradleIdleTimeoutMinutes minutes." }
        }
        if($p.ExitCode -ne 0){
            Write-Host "`n---------------- Last 200 Gradle log lines ----------------" -ForegroundColor Red
            if(Test-Path -LiteralPath $LogPath){ Get-Content -LiteralPath $LogPath -Tail 200 }
            Write-Host '--------------------------------------------------------------' -ForegroundColor Red
            throw "Gradle exited with code $($p.ExitCode)."
        }
    } finally { $p.Dispose() }
}

try {
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - ANDROID STANDARD RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Project: ' + $ScriptRoot)
    Write-Host ('Artifact: ' + $ArtifactType)

    Stage 10 'Checking required tools'
    if(-not (Get-Command node.exe -ErrorAction SilentlyContinue)){ throw 'Node.js was not found in PATH.' }
    if(-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)){ throw 'npm was not found in PATH.' }
    if(-not (Get-Command java.exe -ErrorAction SilentlyContinue)){ throw 'Java was not found in PATH.' }
    if(-not (Get-Command git.exe -ErrorAction SilentlyContinue)){ throw 'Git was not found in PATH.' }
    $node = Get-Captured 'node.exe' @('--version')
    $npm = Get-Captured 'npm.cmd' @('--version')
    $java = Get-Captured 'java.exe' @('-version')
    $git = Get-Captured 'git.exe' @('--version')
    if($node.ExitCode -ne 0){ throw 'node.exe --version failed.' }
    if($npm.ExitCode -ne 0){ throw 'npm.cmd --version failed.' }
    if($java.ExitCode -ne 0){ throw 'java.exe -version failed.' }
    if($git.ExitCode -ne 0){ throw 'git.exe --version failed.' }
    Write-Host ('node: ' + $node.Text.Trim()) -ForegroundColor DarkGray
    Write-Host ('npm : ' + $npm.Text.Trim()) -ForegroundColor DarkGray
    Write-Host ('java: ' + $java.Text.Trim()) -ForegroundColor DarkGray
    Write-Host ('git : ' + $git.Text.Trim()) -ForegroundColor DarkGray
    if(-not (Test-Path -LiteralPath $InitScript)){ throw 'gradle-mirror.init.gradle is missing.' }

    Stage 20 'Checking project dependency manifest'
    if(-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'package.json'))){ throw 'package.json was not found.' }
    if(-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'node_modules'))){ throw 'node_modules is missing.' }

    if($Fresh){
        Stage 28 'Refreshing npm dependencies'
        if(Test-Path -LiteralPath (Join-Path $ScriptRoot 'package-lock.json')){
            Invoke-DirectChecked 'npm.cmd' @('ci','--no-audit','--no-fund','--legacy-peer-deps')
        } else {
            Invoke-DirectChecked 'npm.cmd' @('install','--no-audit','--no-fund','--legacy-peer-deps')
        }
    }

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
    if($java.Text -notmatch 'version\s+"17(?:\.|"|$)'){ throw 'JDK 17 is required.' }
    $gv = Get-Captured $gradlew @('--version') $android
    if($gv.ExitCode -ne 0){ throw 'Gradle wrapper --version failed.' }
    Write-Host $gv.Text.Trim() -ForegroundColor DarkGray
    if($gv.Text -notmatch 'Gradle 8\.13'){ throw 'Gradle wrapper did not launch Gradle 8.13.' }

    if(-not $SkipDoctor){
        Stage 63 'Running Expo dependency diagnostics'
        $doctor = Get-Captured 'npm.cmd' @('exec','--','expo-doctor')
        if($doctor.Text.Trim()){ Write-Host $doctor.Text.Trim() -ForegroundColor DarkGray }
        if($doctor.ExitCode -ne 0){
            $m='expo-doctor exited with code '+$doctor.ExitCode+'. Diagnostics are non-blocking by default.'
            if($StrictDoctor){ throw $m }
            Write-Host $m -ForegroundColor Yellow
        }
    }

    $task = if($ArtifactType -eq 'AAB'){'bundleRelease'}else{'assembleRelease'}
    Stage 72 ('Building standard Android release ' + $ArtifactType)
    Write-Host '[khatyar-build] Maven: local Maven -> Myket -> Runflare -> official.' -ForegroundColor DarkGray
    Write-Host '[khatyar-build] Gradle Wrapper: F:\gradle-cache -> Myket -> Runflare -> official.' -ForegroundColor DarkGray
    $logDir = Join-Path $android 'build\khatyar-build-logs'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $logPath = Join-Path $logDir ($task + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    Run-Gradle $gradlew $android $logPath $task

    Stage 95 'Verifying release artifact'
    if($ArtifactType -eq 'AAB'){
        $artifact = Join-Path $android 'app\build\outputs\bundle\release\app-release.aab'
    } else {
        $artifact = Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
        if(-not (Test-Path -LiteralPath $artifact)){
            $alt = Join-Path $android 'app\build\outputs\apk\release\app-release-unsigned.apk'
            if(Test-Path -LiteralPath $alt){$artifact=$alt}
        }
    }
    if(-not (Test-Path -LiteralPath $artifact)){ throw 'Gradle completed without producing the expected release artifact.' }
    $size=(Get-Item -LiteralPath $artifact).Length
    if($size -lt 100000){ throw "Release artifact is unexpectedly small: $size bytes." }
    Write-Host ($ArtifactType + ': ' + $artifact) -ForegroundColor Green
    Write-Host ('Size: ' + $size + ' bytes') -ForegroundColor Green
    $FinalExitCode=0
    $FinalStage='Completed'
    Write-Host "`nANDROID STANDARD RELEASE $ArtifactType BUILD COMPLETED SUCCESSFULLY." -ForegroundColor Green
}
catch {
    $FinalExitCode=1
    Write-Host "`nBUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host ('Final stage : ' + $FinalStage)
    Write-Host ('Exit code   : ' + $FinalExitCode)
    Write-Host ('Total elapsed: ' + ((Get-Date)-$BuildStart).ToString('hh\:mm\:ss'))
    if(-not $NoPause){ Read-Host 'Press ENTER to close' | Out-Null }
}
exit $FinalExitCode