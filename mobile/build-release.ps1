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

function Invoke-Captured([string]$File,[string[]]$Args,[string]$Cwd=$ScriptRoot) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = $File
    $psi.WorkingDirectory = $Cwd
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $quoted = foreach($a in $Args) { if($a -match '[\s"]'){ '"'+($a -replace '"','\"')+'"' } else { $a } }
    $psi.Arguments = ($quoted -join ' ')
    $p = New-Object Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()
    try {
        $o = $p.StandardOutput.ReadToEnd(); $e = $p.StandardError.ReadToEnd(); $p.WaitForExit()
        [pscustomobject]@{ ExitCode=$p.ExitCode; Output=$o; Error=$e }
    } finally { $p.Dispose() }
}

function Invoke-Checked([string]$File,[string[]]$Args,[string]$Cwd=$ScriptRoot) {
    Write-Host ('> ' + $File + ' ' + ($Args -join ' ')) -ForegroundColor DarkGray
    $r = Invoke-Captured $File $Args $Cwd
    if ($r.Output.Trim()) { Write-Host $r.Output.Trim() -ForegroundColor DarkGray }
    if ($r.Error.Trim()) { Write-Host $r.Error.Trim() -ForegroundColor DarkGray }
    if ($r.ExitCode -ne 0) { throw "$File exited with code $($r.ExitCode)." }
    return $r
}

function Stop-Tree([int]$Pid) { if($Pid -gt 0){ try{ taskkill.exe /PID $Pid /T /F 2>$null | Out-Null }catch{} } }

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
    $lastLen = 0; $lastActivity = Get-Date; $lastDisplay = Get-Date
    try {
        while(-not $p.HasExited){
            Start-Sleep -Seconds 2
            if(Test-Path -LiteralPath $LogPath){ $len=(Get-Item -LiteralPath $LogPath).Length; if($len -gt $lastLen){$lastLen=$len;$lastActivity=Get-Date} }
            $total=((Get-Date)-$BuildStart).TotalSeconds; $idle=((Get-Date)-$lastActivity).TotalSeconds
            if(((Get-Date)-$lastDisplay).TotalSeconds -ge 10){
                $lastDisplay=Get-Date
                Write-Host ('    Gradle running | ' + $Task + ' | elapsed ' + (New-TimeSpan -Seconds ([int]$total)).ToString('hh\:mm\:ss')) -ForegroundColor Cyan
                if(Test-Path -LiteralPath $LogPath){ @(Get-Content -LiteralPath $LogPath -Tail 3 -ErrorAction SilentlyContinue) | ForEach-Object { if($_.Trim()){ Write-Host ('    '+$_.Trim()) -ForegroundColor DarkGray } } }
            }
            if($total -ge $GradleTimeoutMinutes*60){ Stop-Tree $p.Id; throw "Gradle exceeded $GradleTimeoutMinutes minutes." }
            if($idle -ge $GradleIdleTimeoutMinutes*60){ Stop-Tree $p.Id; throw "Gradle produced no new log output for $GradleIdleTimeoutMinutes minutes." }
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
    Invoke-Checked 'node.exe' @('--version') | Out-Null
    Invoke-Checked 'npm.cmd' @('--version') | Out-Null
    Invoke-Checked 'java.exe' @('-version') | Out-Null
    Invoke-Checked 'git.exe' @('--version') | Out-Null
    if(-not (Test-Path -LiteralPath $InitScript)){ throw 'gradle-mirror.init.gradle is missing.' }

    Stage 20 'Checking project dependency manifest'
    if(-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'package.json'))){ throw 'package.json was not found.' }
    if(-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'node_modules'))){ throw 'node_modules is missing.' }
    if($Fresh){ Stage 28 'Refreshing npm dependencies'; Invoke-Checked 'npm.cmd' @('ci','--no-audit','--no-fund','--legacy-peer-deps') | Out-Null }

    Stage 38 'Generating a clean Expo Android project'
    Invoke-Checked 'node.exe' @((Join-Path $ScriptRoot 'scripts\prepare-android-release.js')) | Out-Null

    $android = Join-Path $ScriptRoot 'android'
    $gradlew = Join-Path $android 'gradlew.bat'
    $wrapperProps = Join-Path $android 'gradle\wrapper\gradle-wrapper.properties'
    if(-not (Test-Path -LiteralPath $gradlew)){ throw 'Generated gradlew.bat is missing.' }
    if(-not (Test-Path -LiteralPath $wrapperProps)){ throw 'Generated gradle-wrapper.properties is missing.' }
    $wrapperText = Get-Content -LiteralPath $wrapperProps -Raw
    if($wrapperText -notmatch 'gradle-8\.13-bin\.zip'){ throw 'Gradle wrapper must use Gradle 8.13.' }

    Stage 55 'Validating Java 17 and Gradle wrapper'
    $j = Invoke-Captured 'java.exe' @('-version')
    $jt = $j.Error + "`n" + $j.Output
    if($jt -notmatch 'version\s+"17(?:\.|"|$)'){ throw 'JDK 17 is required.' }
    $gv = Invoke-Checked $gradlew @('--version') $android
    if(($gv.Output + $gv.Error) -notmatch 'Gradle 8\.13'){ throw 'Gradle wrapper did not launch Gradle 8.13.' }

    if(-not $SkipDoctor){
        Stage 63 'Running Expo dependency diagnostics'
        $d = Invoke-Captured 'npm.cmd' @('exec','--','expo-doctor')
        if($d.Output.Trim()){Write-Host $d.Output.Trim() -ForegroundColor DarkGray}; if($d.Error.Trim()){Write-Host $d.Error.Trim() -ForegroundColor DarkGray}
        if($d.ExitCode -ne 0){$m='expo-doctor exited with code '+$d.ExitCode+'. Diagnostics are non-blocking by default.'; if($StrictDoctor){throw $m}; Write-Host $m -ForegroundColor Yellow}
    }

    $task = if($ArtifactType -eq 'AAB'){'bundleRelease'}else{'assembleRelease'}
    Stage 72 ('Building standard Android release ' + $ArtifactType)
    Write-Host '[khatyar-build] Gradle repository policy: local Maven -> Myket -> Runflare -> official.' -ForegroundColor DarkGray
    Write-Host '[khatyar-build] Gradle Wrapper policy: F:\gradle-cache -> Myket -> Runflare -> official.' -ForegroundColor DarkGray
    $logDir = Join-Path $android 'build\khatyar-build-logs'; New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $logPath = Join-Path $logDir ($task + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    Run-Gradle $gradlew $android $logPath $task

    Stage 95 'Verifying release artifact'
    $artifact = if($ArtifactType -eq 'AAB'){Join-Path $android 'app\build\outputs\bundle\release\app-release.aab'}else{Join-Path $android 'app\build\outputs\apk\release\app-release.apk'}
    if(-not (Test-Path -LiteralPath $artifact)){
        $alt = Join-Path $android 'app\build\outputs\apk\release\app-release-unsigned.apk'; if(Test-Path -LiteralPath $alt){$artifact=$alt}else{throw 'Gradle completed without producing the expected release artifact.'}
    }
    $size=(Get-Item -LiteralPath $artifact).Length; if($size -lt 100000){throw "Release artifact is unexpectedly small: $size bytes."}
    Write-Host ($ArtifactType + ': ' + $artifact) -ForegroundColor Green
    Write-Host ('Size: ' + $size + ' bytes') -ForegroundColor Green
    $FinalExitCode=0; $FinalStage='Completed'
    Write-Host "`nANDROID STANDARD RELEASE $ArtifactType BUILD COMPLETED SUCCESSFULLY." -ForegroundColor Green
}
catch { $FinalExitCode=1; Write-Host "`nBUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red }
finally {
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host ('Final stage : ' + $FinalStage)
    Write-Host ('Exit code   : ' + $FinalExitCode)
    Write-Host ('Total elapsed: ' + ((Get-Date)-$BuildStart).ToString('hh\:mm\:ss'))
    if(-not $NoPause){ Read-Host 'Press ENTER to close' | Out-Null }
}
exit $FinalExitCode
