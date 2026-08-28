#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipCleanup,
    [switch]$SkipDoctor,
    [int]$GradleIdleTimeoutMinutes = 15,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptRoot = $PSScriptRoot
Set-Location -LiteralPath $ScriptRoot

$Remote = 'origin'
$Branch = 'main'
$BuildStart = Get-Date
$CurrentStage = 'Initializing'
$TotalStages = 7
$StashCreated = $false
$StashMessage = 'khatyar-build-autostash-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$BackupBranch = $null
$SourceCommit = $null
$FinalExitCode = 1
$GitRepoRoot = $null

function Format-Duration {
    param([TimeSpan]$Duration)
    if ($Duration.TotalHours -ge 1) { return $Duration.ToString('hh\:mm\:ss') }
    return $Duration.ToString('mm\:ss')
}

function Write-Stage {
    param([string]$Name,[int]$Index)
    $script:CurrentStage = $Name
    $percent = [int][math]::Min(100,[math]::Round(($Index / $TotalStages) * 100))
    Write-Host ''
    Write-Host ('[{0,3}%] {1}' -f $percent,$Name) -ForegroundColor Cyan
    Write-Host ('    Elapsed: ' + (Format-Duration ((Get-Date)-$BuildStart))) -ForegroundColor DarkGray
}

function Write-ProgressLine {
    param([int]$Percent,[string]$Status,[int]$EtaSeconds=0)
    $p = [int][math]::Min(99,[math]::Max(0,$Percent))
    $width = 40
    $filled = [int][math]::Floor($width*$p/100)
    $bar = ('#' * $filled) + ('-' * ($width-$filled))
    $eta = if ($EtaSeconds -gt 0) { Format-Duration ([TimeSpan]::FromSeconds($EtaSeconds)) } else { '--:--' }
    $elapsed = Format-Duration ((Get-Date)-$BuildStart)
    Write-Host ("`r[{0,3}%] [{1}] {2} | Elapsed {3} | ETA {4}   " -f $p,$bar,$Status,$elapsed,$eta) -NoNewline
}

function Test-CommandAvailable {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-Git {
    param([Parameter(Mandatory=$true)][string[]]$Arguments)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'git.exe'
    $psi.WorkingDirectory = $ScriptRoot
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = ''
    foreach ($arg in $Arguments) {
        $escaped = [string]$arg
        $escaped = $escaped -replace '(\\*)"','$1$1\\"'
        $escaped = $escaped -replace '(\\+)$','$1$1'
        $psi.Arguments += ' "' + $escaped + '"'
    }
    $process = $null
    try {
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()
        $process.WaitForExit()
        return [pscustomobject]@{
            Output = @($stdout -split "`r?`n" | Where-Object { $_ -ne '' })
            Error = @($stderr -split "`r?`n" | Where-Object { $_ -ne '' })
            ExitCode = $process.ExitCode
        }
    }
    finally {
        if ($null -ne $process) { $process.Dispose() }
    }
}

function Get-RefSha {
    param([string]$Ref)
    $r = Invoke-Git @('rev-parse',$Ref)
    if ($r.ExitCode -ne 0) { return $null }
    return ((@($r.Output) -join '').Trim())
}

function Get-GitStatusClean {
    $r = Invoke-Git @('status','--porcelain')
    if ($r.ExitCode -ne 0) { throw (($r.Output+$r.Error) -join ' ') }
    return @($r.Output).Count -eq 0
}

function Restore-WorkSafely {
    if (-not $script:StashCreated) { return $true }
    Write-Host ''
    Write-Host 'Restoring local uncommitted changes...' -ForegroundColor Yellow
    $r = Invoke-Git @('stash','pop')
    if ($r.ExitCode -ne 0) {
        Write-Host 'WARNING: local changes could not be restored automatically.' -ForegroundColor Red
        Write-Host 'The stash is preserved. Run: git stash list' -ForegroundColor Yellow
        return $false
    }
    $script:StashCreated = $false
    Write-Host 'Local changes restored successfully.' -ForegroundColor Green
    return $true
}

function Invoke-NativeLive {
    param([string]$FilePath,[string[]]$Arguments,[string]$WorkingDirectory)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = ''
    foreach ($arg in $Arguments) {
        $escaped = [string]$arg
        $escaped = $escaped -replace '(\\*)"','$1$1\\"'
        $escaped = $escaped -replace '(\\+)$','$1$1'
        $psi.Arguments += ' "' + $escaped + '"'
    }
    $process = $null
    $stdoutQueue = New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
    $stderrQueue = New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
    $stdoutHandler = $null
    $stderrHandler = $null
    try {
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $stdoutHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($s,$e) if ($null -ne $e.Data) { $stdoutQueue.Enqueue($e.Data) } }
        $stderrHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($s,$e) if ($null -ne $e.Data) { $stderrQueue.Enqueue($e.Data) } }
        $process.add_OutputDataReceived($stdoutHandler)
        $process.add_ErrorDataReceived($stderrHandler)
        [void]$process.Start()
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        while (-not $process.HasExited) {
            $line = $null
            while ($stdoutQueue.TryDequeue([ref]$line)) { if (-not [string]::IsNullOrWhiteSpace($line)) { Write-Host ('    ' + $line) } }
            while ($stderrQueue.TryDequeue([ref]$line)) { if (-not [string]::IsNullOrWhiteSpace($line)) { Write-Host ('    ' + $line) -ForegroundColor DarkYellow } }
            Start-Sleep -Milliseconds 100
        }
        Start-Sleep -Milliseconds 300
        $line = $null
        while ($stdoutQueue.TryDequeue([ref]$line)) { if (-not [string]::IsNullOrWhiteSpace($line)) { Write-Host ('    ' + $line) } }
        while ($stderrQueue.TryDequeue([ref]$line)) { if (-not [string]::IsNullOrWhiteSpace($line)) { Write-Host ('    ' + $line) -ForegroundColor DarkYellow } }
        return $process.ExitCode
    }
    finally {
        if ($null -ne $process) {
            try { $process.CancelOutputRead() } catch { }
            try { $process.CancelErrorRead() } catch { }
            if ($null -ne $stdoutHandler) { try { $process.remove_OutputDataReceived($stdoutHandler) } catch { } }
            if ($null -ne $stderrHandler) { try { $process.remove_ErrorDataReceived($stderrHandler) } catch { } }
            $process.Dispose()
        }
    }
}

function Invoke-GradleRelease {
    param([string]$GradlewPath,[string]$WorkingDirectory,[int]$IdleTimeoutMinutes=15)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $GradlewPath
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = 'assembleRelease --console=plain --stacktrace --no-daemon'

    $process = $null
    $stdoutQueue = New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
    $stderrQueue = New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
    $stdoutHandler = $null
    $stderrHandler = $null
    $lastActivity = Get-Date
    $gradleStart = Get-Date
    $lastTask = 'Gradle is initializing...'
    $taskCount = 0
    $completedTasks = 0
    $idleLimitSeconds = [math]::Max(60,$IdleTimeoutMinutes*60)
    $exitCode = 1
    $stalled = $false

    try {
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $stdoutHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($s,$e) if ($null -ne $e.Data) { $stdoutQueue.Enqueue($e.Data) } }
        $stderrHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($s,$e) if ($null -ne $e.Data) { $stderrQueue.Enqueue($e.Data) } }
        $process.add_OutputDataReceived($stdoutHandler)
        $process.add_ErrorDataReceived($stderrHandler)
        [void]$process.Start()
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()

        while (-not $process.HasExited) {
            $line = $null
            while ($stdoutQueue.TryDequeue([ref]$line)) {
                if ([string]::IsNullOrWhiteSpace($line)) { continue }
                $lastActivity = Get-Date
                $text = $line.Trim()
                if ($text -match '^> Task\s+(.+)$') { $lastTask = $Matches[1]; $completedTasks++ }
                if ($text -match '(\d+) actionable tasks?') { $taskCount = [int]$Matches[1] }
                Write-Host ("`n    Gradle: " + $text) -ForegroundColor DarkGray
            }
            while ($stderrQueue.TryDequeue([ref]$line)) {
                if ([string]::IsNullOrWhiteSpace($line)) { continue }
                $lastActivity = Get-Date
                Write-Host ("`n    Gradle: " + $line.Trim()) -ForegroundColor DarkYellow
            }

            $elapsedSeconds = ((Get-Date)-$gradleStart).TotalSeconds
            if ($taskCount -gt 0 -and $completedTasks -gt 0) {
                $fraction = [math]::Min(0.98,$completedTasks/[double]$taskCount)
                $percent = [int](67+($fraction*32))
                $etaSeconds = [int][math]::Max(0,($elapsedSeconds/$fraction)-$elapsedSeconds)
            }
            else {
                $fraction = [math]::Min(0.98,$elapsedSeconds/600)
                $percent = [int](67+($fraction*20))
                $etaSeconds = if ($fraction -gt 0.02) { [int][math]::Max(0,($elapsedSeconds/$fraction)-$elapsedSeconds) } else { 0 }
            }
            Write-ProgressLine $percent $lastTask $etaSeconds

            $idleSeconds = ((Get-Date)-$lastActivity).TotalSeconds
            if ($idleSeconds -ge $idleLimitSeconds) {
                $stalled = $true
                Write-Host ''
                Write-Host ('BUILD STOPPED: Gradle produced no output for ' + $IdleTimeoutMinutes + ' minutes.') -ForegroundColor Red
                Write-Host ('Last Gradle activity: ' + $lastTask) -ForegroundColor Yellow
                try { $process.Kill() } catch { }
                break
            }
            Start-Sleep -Milliseconds 500
        }

        Start-Sleep -Milliseconds 500
        $line = $null
        while ($stdoutQueue.TryDequeue([ref]$line)) { if (-not [string]::IsNullOrWhiteSpace($line)) { Write-Host ("`n    Gradle: " + $line.Trim()) -ForegroundColor DarkGray } }
        while ($stderrQueue.TryDequeue([ref]$line)) { if (-not [string]::IsNullOrWhiteSpace($line)) { Write-Host ("`n    Gradle: " + $line.Trim()) -ForegroundColor DarkYellow } }
        if ($stalled) { $exitCode = 124 } else { $exitCode = $process.ExitCode }
    }
    catch {
        Write-Host ''
        Write-Host ('Gradle process error: ' + $_.Exception.Message) -ForegroundColor Red
        if ($null -ne $process) { try { if (-not $process.HasExited) { $process.Kill() } } catch { } }
        $exitCode = 1
    }
    finally {
        if ($null -ne $process) {
            try { $process.CancelOutputRead() } catch { }
            try { $process.CancelErrorRead() } catch { }
            if ($null -ne $stdoutHandler) { try { $process.remove_OutputDataReceived($stdoutHandler) } catch { } }
            if ($null -ne $stderrHandler) { try { $process.remove_ErrorDataReceived($stderrHandler) } catch { } }
            $process.Dispose()
        }
    }
    return $exitCode
}

function Wait-BeforeExit {
    if ($NoPause) { return }
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor DarkGray
    Write-Host 'BUILD SCRIPT FINISHED - WINDOW WILL REMAIN OPEN' -ForegroundColor Yellow
    Write-Host 'Press ENTER to close this window.' -ForegroundColor Yellow
    Write-Host '============================================================' -ForegroundColor DarkGray
    try { [void](Read-Host 'Press ENTER') } catch { Start-Sleep -Seconds 30 }
}

try {
    if (-not (Test-CommandAvailable 'git.exe')) { throw 'Git is not installed or is not available in PATH.' }

    $repoResult = Invoke-Git @('rev-parse','--show-toplevel')
    if ($repoResult.ExitCode -eq 0 -and @($repoResult.Output).Count -gt 0) {
        $GitRepoRoot = ((@($repoResult.Output)-join '').Trim())
    }
    else {
        $cursor = $ScriptRoot
        while (-not [string]::IsNullOrWhiteSpace($cursor)) {
            if (Test-Path -LiteralPath (Join-Path $cursor '.git')) { $GitRepoRoot = $cursor; break }
            $parent = Split-Path -Parent $cursor
            if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) { break }
            $cursor = $parent
        }
    }
    if ([string]::IsNullOrWhiteSpace($GitRepoRoot)) { throw ('This build directory is not inside a Git repository. Build path: ' + $ScriptRoot) }

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - ANDROID RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Git repository : ' + $GitRepoRoot) -ForegroundColor DarkGray
    Write-Host ('Build directory: ' + $ScriptRoot) -ForegroundColor DarkGray
    Write-Host ''
    Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
    $answer = (Read-Host 'Download from GitHub').Trim().ToUpperInvariant()
    if ($answer -notin @('Y','N')) { throw 'Please answer Y or N.' }

    Write-Stage 'Fetching GitHub main branch' 1
    $fetch = Invoke-Git @('fetch',$Remote,$Branch)
    if ($fetch.ExitCode -ne 0) { throw ('GitHub fetch failed: ' + (($fetch.Output+$fetch.Error)-join ' ')) }
    $localSha = Get-RefSha 'HEAD'
    $remoteSha = Get-RefSha ($Remote+'/'+$Branch)
    if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) { throw 'Unable to determine local or GitHub commit SHA.' }

    Write-Stage 'Preparing local workspace' 2
    if ($answer -eq 'Y') {
        if (-not (Get-GitStatusClean)) {
            Write-Host 'Local uncommitted changes detected. Stashing temporarily...' -ForegroundColor Yellow
            $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
            if ($stash.ExitCode -ne 0) { throw ('Unable to safely stash local changes: ' + (($stash.Output+$stash.Error)-join ' ')) }
            $script:StashCreated = $true
            Write-Host 'Local changes safely stashed.' -ForegroundColor Green
        }
        $localSha = Get-RefSha 'HEAD'
        $remoteSha = Get-RefSha ($Remote+'/'+$Branch)
        if ($localSha -ne $remoteSha) {
            $BackupBranch = 'build-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
            $backup = Invoke-Git @('branch',$BackupBranch,'HEAD')
            if ($backup.ExitCode -ne 0) { throw ('Unable to create backup branch: ' + (($backup.Output+$backup.Error)-join ' ')) }
            Write-Host ('Local commits preserved on backup branch: ' + $BackupBranch) -ForegroundColor Yellow
            $reset = Invoke-Git @('reset','--hard',($Remote+'/'+$Branch))
            if ($reset.ExitCode -ne 0) { throw ('Unable to synchronize local branch: ' + (($reset.Output+$reset.Error)-join ' ')) }
        }
        $localSha = Get-RefSha 'HEAD'
        $remoteSha = Get-RefSha ($Remote+'/'+$Branch)
        if ($localSha -ne $remoteSha) { throw ('Synchronization verification failed. Local='+$localSha+' GitHub='+$remoteSha) }
        if (-not (Get-GitStatusClean)) { throw 'Working tree is not clean after GitHub synchronization.' }
        $SourceCommit = $localSha
        Write-Host ('GitHub synchronization verified. Source commit: ' + $SourceCommit) -ForegroundColor Green
    }
    else {
        if ($localSha -ne $remoteSha) { throw ('Local version is not equal to GitHub. Local='+$localSha+' GitHub='+$remoteSha+'. Choose Y to download the latest files.') }
        if (-not (Get-GitStatusClean)) { throw 'Local uncommitted changes are present. Choose Y to safely stash them while building.' }
        $SourceCommit = $localSha
        Write-Host ('Local version matches GitHub. Source commit: ' + $SourceCommit) -ForegroundColor Green
    }

    Write-Stage 'Checking Node.js and npm environment' 3
    if (-not (Test-CommandAvailable 'node.exe')) { throw 'Node.js was not found in PATH.' }
    if (-not (Test-CommandAvailable 'npm.cmd')) { throw 'npm was not found in PATH.' }
    if (-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'package.json'))) { throw 'mobile/package.json was not found.' }
    if (-not (Test-Path -LiteralPath (Join-Path $ScriptRoot 'package-lock.json'))) { throw 'mobile/package-lock.json was not found.' }
    $rnPlugin = Join-Path $ScriptRoot 'node_modules\@react-native\gradle-plugin'
    if (-not (Test-Path -LiteralPath $rnPlugin)) {
        Write-Host 'React Native Gradle plugin is missing. Installing locked npm dependencies...' -ForegroundColor Yellow
        $npmCode = Invoke-NativeLive 'npm.cmd' @('ci','--no-audit','--no-fund') $ScriptRoot
        if ($npmCode -ne 0) { throw ('npm ci failed with exit code ' + $npmCode) }
    }
    if (-not (Test-Path -LiteralPath $rnPlugin)) { throw 'React Native Gradle plugin is still missing after npm ci.' }

    Write-Stage 'Validating and preparing Android Gradle project' 4
    $androidDir = Join-Path $ScriptRoot 'android'
    $gradlew = Join-Path $androidDir 'gradlew.bat'
    $settingsPath = Join-Path $androidDir 'settings.gradle'
    if (-not (Test-Path -LiteralPath $gradlew)) { throw 'android/gradlew.bat was not found.' }
    if (-not (Test-Path -LiteralPath $settingsPath)) { throw 'android/settings.gradle was not found.' }
    $settingsText = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8
    $includeBuildLine = "includeBuild('../node_modules/@react-native/gradle-plugin')"
    if ($settingsText -match 'com\.facebook\.react\.settings' -and $settingsText -notmatch [regex]::Escape($includeBuildLine)) {
        Write-Host 'React Native Gradle plugin includeBuild is missing from settings.gradle. Repairing it...' -ForegroundColor Yellow
        if ($settingsText -match '(?m)^pluginManagement\s*\{') {
            $settingsText = $settingsText -replace '(?m)^pluginManagement\s*\{', "pluginManagement {`r`n    $includeBuildLine"
        }
        if ($settingsText -notmatch [regex]::Escape($includeBuildLine)) { $settingsText = $includeBuildLine + "`r`n" + $settingsText }
        Set-Content -LiteralPath $settingsPath -Value $settingsText -Encoding UTF8
    }

    Write-Stage 'Checking Java and Gradle toolchain' 5
    if (-not (Test-CommandAvailable 'java.exe')) { throw 'Java was not found in PATH.' }
    $javaCode = Invoke-NativeLive 'java.exe' @('-version') $ScriptRoot
    if ($javaCode -ne 0) { throw ('java -version failed with exit code ' + $javaCode) }
    $gradleVersion = & $gradlew '--version' 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Unable to execute Gradle wrapper.' }
    Write-Host $gradleVersion.Trim() -ForegroundColor DarkGray

    Write-Stage 'Starting Gradle assembleRelease' 6
    $gradleCode = Invoke-GradleRelease $gradlew $androidDir $GradleIdleTimeoutMinutes
    if ($gradleCode -ne 0) {
        if ($gradleCode -eq 124) { throw ('Gradle was terminated after ' + $GradleIdleTimeoutMinutes + ' minutes without output. Check android/build/reports/problems/problems-report.html.') }
        throw ('Gradle assembleRelease failed with exit code ' + $gradleCode + '.')
    }

    Write-Stage 'Verifying release APK' 7
    $apkCandidates = @(
        (Join-Path $androidDir 'app\build\outputs\apk\release\app-release.apk'),
        (Join-Path $androidDir 'app\build\outputs\apk\release\app-release-unsigned.apk')
    )
    $apk = $apkCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($null -eq $apk) { throw 'Gradle completed successfully but no release APK was found.' }
    $sizeMb = [math]::Round((Get-Item -LiteralPath $apk).Length / 1MB,2)
    Write-Host ('Release APK: ' + $apk) -ForegroundColor Green
    Write-Host ('APK size    : ' + $sizeMb + ' MB') -ForegroundColor Green
    $FinalExitCode = 0
}
catch {
    $FinalExitCode = 1
    Write-Host ''
    Write-Host 'BUILD FAILED.' -ForegroundColor Red
    Write-Host ('Stage: ' + $CurrentStage) -ForegroundColor Yellow
    Write-Host ('Error: ' + $_.Exception.Message) -ForegroundColor Red
}
finally {
    if (-not (Restore-WorkSafely)) { $FinalExitCode = 1 }
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor DarkGray
    if ($FinalExitCode -eq 0) { Write-Host ' ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY' -ForegroundColor Green }
    else { Write-Host ' ANDROID RELEASE BUILD FAILED' -ForegroundColor Red }
    Write-Host '============================================================' -ForegroundColor DarkGray
    Write-Host ('Total elapsed : ' + (Format-Duration ((Get-Date)-$BuildStart)))
    Write-Host ('Final stage   : ' + $CurrentStage)
    if (-not [string]::IsNullOrWhiteSpace($SourceCommit)) { Write-Host ('Source commit : ' + $SourceCommit) }
    if (-not [string]::IsNullOrWhiteSpace($BackupBranch)) { Write-Host ('Backup branch : ' + $BackupBranch) -ForegroundColor Yellow }
    Write-Host ('Exit code     : ' + $FinalExitCode)
    Write-Host '============================================================' -ForegroundColor DarkGray
    Wait-BeforeExit
}

exit $FinalExitCode
