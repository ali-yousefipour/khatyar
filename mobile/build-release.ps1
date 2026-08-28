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
    $percent = [int][math]::Min(100,[math]::Round(($Index / [double]$TotalStages) * 100))
    Write-Host ''
    Write-Host ('[{0,3}%] {1}' -f $percent,$Name) -ForegroundColor Cyan
    Write-Host ('    Elapsed: ' + (Format-Duration ((Get-Date)-$BuildStart))) -ForegroundColor DarkGray
}

function Write-ProgressLine {
    param([int]$Percent,[string]$Status,[int]$EtaSeconds=0)
    $p = [int][math]::Min(99,[math]::Max(0,$Percent))
    $width = 40
    $filled = [int][math]::Floor($width * $p / 100)
    $bar = ('#' * $filled) + ('-' * ($width - $filled))
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
    } finally {
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

function Invoke-ProcessWithTimeout {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string]$WorkingDirectory,
        [Parameter(Mandatory=$true)][string]$Arguments,
        [int]$TimeoutSeconds = 180
    )
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.Arguments = $Arguments
    $process = $null
    $stdoutLines = New-Object System.Collections.Concurrent.ConcurrentQueue[string]
    $stderrLines = New-Object System.Collections.Concurrent.ConcurrentQueue[string]
    $lastOutput = Get-Date
    try {
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $process.EnableRaisingEvents = $true
        $outHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($sender,$e) if ($null -ne $e.Data) { $stdoutLines.Enqueue($e.Data); $script:ProcessLastOutput = Get-Date } }
        $errHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($sender,$e) if ($null -ne $e.Data) { $stderrLines.Enqueue($e.Data); $script:ProcessLastOutput = Get-Date } }
        $script:ProcessLastOutput = Get-Date
        $process.add_OutputDataReceived($outHandler)
        $process.add_ErrorDataReceived($errHandler)
        [void]$process.Start()
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while (-not $process.HasExited) {
            $line = $null
            while ($stdoutLines.TryDequeue([ref]$line)) { Write-Host ('    ' + $line) -ForegroundColor DarkGray }
            while ($stderrLines.TryDequeue([ref]$line)) { Write-Host ('    ' + $line) -ForegroundColor DarkYellow }
            if ((Get-Date) -ge $deadline) {
                try { $process.Kill() } catch {}
                $process.WaitForExit()
                return [pscustomobject]@{ ExitCode=124; Output=@($stdoutLines); Error=@($stderrLines); TimedOut=$true }
            }
            Start-Sleep -Milliseconds 100
        }
        $process.WaitForExit()
        $line = $null
        while ($stdoutLines.TryDequeue([ref]$line)) { Write-Host ('    ' + $line) -ForegroundColor DarkGray }
        while ($stderrLines.TryDequeue([ref]$line)) { Write-Host ('    ' + $line) -ForegroundColor DarkYellow }
        return [pscustomobject]@{ ExitCode=$process.ExitCode; Output=@($stdoutLines); Error=@($stderrLines); TimedOut=$false }
    } finally {
        if ($null -ne $process) { $process.Dispose() }
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
    $psi.Arguments = 'assembleRelease --console=plain --stacktrace --no-daemon --no-watch-fs'
    $process = $null
    $stdoutLines = New-Object System.Collections.Concurrent.ConcurrentQueue[string]
    $stderrLines = New-Object System.Collections.Concurrent.ConcurrentQueue[string]
    $gradleStart = Get-Date
    $lastActivity = Get-Date
    $lastTask = 'Gradle is initializing...'
    $completed = 0
    $total = 0
    $exit = 1
    try {
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $process.EnableRaisingEvents = $true
        $outHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($sender,$e) if ($null -ne $e.Data) { $stdoutLines.Enqueue($e.Data); $script:GradleLastActivity = Get-Date } }
        $errHandler = [System.Diagnostics.DataReceivedEventHandler]{ param($sender,$e) if ($null -ne $e.Data) { $stderrLines.Enqueue($e.Data); $script:GradleLastActivity = Get-Date } }
        $script:GradleLastActivity = Get-Date
        $process.add_OutputDataReceived($outHandler)
        $process.add_ErrorDataReceived($errHandler)
        [void]$process.Start()
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        while (-not $process.HasExited) {
            $line = $null
            while ($stdoutLines.TryDequeue([ref]$line)) {
                if (-not [string]::IsNullOrWhiteSpace($line)) {
                    $text = $line.Trim()
                    $lastActivity = Get-Date
                    if ($text -match '^> Task\s+(.+)$') { $lastTask=$Matches[1]; $completed++ }
                    if ($text -match '(\d+) actionable tasks?') { $total=[int]$Matches[1] }
                    Write-Host ("`n    Gradle: " + $text) -ForegroundColor DarkGray
                }
            }
            while ($stderrLines.TryDequeue([ref]$line)) {
                if (-not [string]::IsNullOrWhiteSpace($line)) {
                    $text = $line.Trim()
                    $lastActivity = Get-Date
                    Write-Host ("`n    Gradle: " + $text) -ForegroundColor DarkYellow
                }
            }
            $elapsed = ((Get-Date)-$gradleStart).TotalSeconds
            if ($total -gt 0 -and $completed -gt 0) {
                $fraction=[math]::Min(.98,$completed/[double]$total)
                $percent=[int](67+$fraction*32)
                $eta=[int][math]::Max(0,($elapsed/$fraction)-$elapsed)
            } else {
                $fraction=[math]::Min(.98,$elapsed/900)
                $percent=[int](67+$fraction*20)
                $eta=0
            }
            Write-ProgressLine $percent $lastTask $eta
            if (((Get-Date)-$lastActivity).TotalSeconds -ge [math]::Max(60,$IdleTimeoutMinutes*60)) {
                Write-Host ''
                Write-Host ('BUILD STOPPED: Gradle produced no output for ' + $IdleTimeoutMinutes + ' minutes.') -ForegroundColor Red
                Write-Host ('Last Gradle activity: ' + $lastTask) -ForegroundColor Yellow
                Write-Host 'A Gradle diagnostic report will be generated before exit.' -ForegroundColor Yellow
                try { $process.Kill() } catch {}
                $process.WaitForExit()
                $exit=124
                break
            }
            Start-Sleep -Milliseconds 250
        }
        if ($exit -ne 124) {
            $process.WaitForExit()
            $exit=$process.ExitCode
        }
    } catch {
        Write-Host ''
        Write-Host ('Gradle process error: ' + $_.Exception.Message) -ForegroundColor Red
        try { if ($null -ne $process -and -not $process.HasExited) { $process.Kill() } } catch {}
        $exit=1
    } finally {
        if ($null -ne $process) { $process.Dispose() }
    }
    return $exit
}

function Wait-BeforeExit {
    if ($NoPause) { return }
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor DarkGray
    Write-Host 'BUILD SCRIPT FINISHED - WINDOW WILL REMAIN OPEN' -ForegroundColor Yellow
    Write-Host 'Press ENTER to close this window.' -ForegroundColor Yellow
    Write-Host '============================================================' -ForegroundColor DarkGray
    try { Read-Host 'Press ENTER' | Out-Null } catch { Start-Sleep -Seconds 30 }
}

try {
    if (-not (Test-CommandAvailable 'git.exe')) { throw 'Git is not installed or is not available in PATH.' }
    $cursor=$ScriptRoot
    while ($true) {
        $candidate=Join-Path $cursor '.git'
        if (Test-Path -LiteralPath $candidate) { $GitRepoRoot=$cursor; break }
        $parent=Split-Path -Parent $cursor
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) { break }
        $cursor=$parent
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
    $answer=(Read-Host 'Download from GitHub').Trim().ToUpperInvariant()
    if ($answer -notin @('Y','N')) { throw 'Please answer Y or N.' }

    Write-Stage 'Fetching GitHub main branch' 1
    $fetch=Invoke-Git @('fetch',$Remote,$Branch)
    if ($fetch.ExitCode -ne 0) { throw ('GitHub fetch failed: ' + (($fetch.Output+$fetch.Error)-join ' ')) }
    $localSha=Get-RefSha 'HEAD'; $remoteSha=Get-RefSha ($Remote+'/'+$Branch)
    if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) { throw 'Unable to determine local or GitHub commit SHA.' }

    Write-Stage 'Preparing local workspace' 2
    if ($answer -eq 'Y') {
        if (-not (Get-GitStatusClean)) {
            Write-Host 'Local uncommitted changes detected. Stashing temporarily...' -ForegroundColor Yellow
            $stash=Invoke-Git @('stash','push','-u','-m',$StashMessage)
            if ($stash.ExitCode -ne 0) { throw ('Unable to stash local changes: ' + (($stash.Output+$stash.Error)-join ' ')) }
            $script:StashCreated=$true
            Write-Host 'Local changes safely stashed.' -ForegroundColor Green
        }
        $localSha=Get-RefSha 'HEAD'
        if ($localSha -ne $remoteSha) {
            $BackupBranch='build-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss')
            $backup=Invoke-Git @('branch',$BackupBranch,'HEAD')
            if ($backup.ExitCode -ne 0) { throw 'Unable to create backup branch.' }
            Write-Host ('Local commits preserved on backup branch: ' + $BackupBranch) -ForegroundColor Yellow
            $reset=Invoke-Git @('reset','--hard',($Remote+'/'+$Branch))
            if ($reset.ExitCode -ne 0) { throw ('Unable to synchronize: ' + (($reset.Output+$reset.Error)-join ' ')) }
        }
        $localSha=Get-RefSha 'HEAD'; $remoteSha=Get-RefSha ($Remote+'/'+$Branch)
        if ($localSha -ne $remoteSha) { throw "Synchronization verification failed. Local=$localSha GitHub=$remoteSha" }
        if (-not (Get-GitStatusClean)) { throw 'Working tree is not clean after synchronization.' }
        $SourceCommit=$localSha
        Write-Host ('GitHub synchronization verified. Source commit: ' + $SourceCommit) -ForegroundColor Green
    } else {
        if ($localSha -ne $remoteSha) { throw "Local version is not equal to GitHub. Local=$localSha GitHub=$remoteSha. Choose Y to download." }
        if (-not (Get-GitStatusClean)) { throw 'Local uncommitted changes are present. Choose Y to stash them safely.' }
        $SourceCommit=$localSha
        Write-Host ('Local version matches GitHub. Source commit: ' + $SourceCommit) -ForegroundColor Green
    }

    Write-Stage 'Checking Node.js and npm environment' 3
    if (-not (Test-CommandAvailable 'node.exe')) { throw 'Node.js was not found in PATH.' }
    if (-not (Test-CommandAvailable 'npm.cmd')) { throw 'npm was not found in PATH.' }
    & node --version; if ($LASTEXITCODE -ne 0) { throw 'Node.js check failed.' }
    & npm --version; if ($LASTEXITCODE -ne 0) { throw 'npm check failed.' }

    Write-Stage 'Validating and preparing Android Gradle project' 4
    $android=Join-Path $ScriptRoot 'android'
    $gradlew=Join-Path $android 'gradlew.bat'
    if (-not (Test-Path -LiteralPath $gradlew)) { throw 'android\gradlew.bat was not found.' }
    $settings=Join-Path $android 'settings.gradle'
    if (-not (Test-Path -LiteralPath $settings)) { throw 'android\settings.gradle was not found.' }
    $rnPlugin=Join-Path $ScriptRoot 'node_modules\@react-native\gradle-plugin'
    if (-not (Test-Path -LiteralPath $rnPlugin)) {
        throw 'React Native Gradle Plugin is missing from node_modules\@react-native\gradle-plugin. Run npm install before building.'
    }
    $settingsText=Get-Content -LiteralPath $settings -Raw
    if ($settingsText -notmatch 'com\.facebook\.react\.settings|@react-native/gradle-plugin|react-native/gradle-plugin') {
        throw 'settings.gradle does not reference the React Native Gradle plugin. Android project generation is inconsistent with the installed React Native version.'
    }

    Write-Stage 'Checking Java and Gradle toolchain' 5
    & java -version; if ($LASTEXITCODE -ne 0) { throw 'Java check failed.' }
    & $gradlew --version; if ($LASTEXITCODE -ne 0) { throw 'Gradle toolchain check failed.' }

    Write-Host ''
    Write-Host 'Running Gradle preflight (configuration only)...' -ForegroundColor Cyan
    $preflight=Invoke-ProcessWithTimeout -FilePath $gradlew -WorkingDirectory $android -Arguments 'help --console=plain --stacktrace --no-daemon --no-watch-fs' -TimeoutSeconds 180
    if ($preflight.ExitCode -ne 0) {
        if ($preflight.ExitCode -eq 124) { throw 'Gradle preflight timed out after 3 minutes. The problem occurs during Gradle configuration, before assembleRelease.' }
        throw ('Gradle preflight failed with exit code ' + $preflight.ExitCode + '. Fix the configuration error above before starting the release build.')
    }
    Write-Host 'Gradle preflight completed successfully.' -ForegroundColor Green

    Write-Stage 'Starting Gradle assembleRelease' 6
    $FinalExitCode=Invoke-GradleRelease $gradlew $android $GradleIdleTimeoutMinutes
    if ($FinalExitCode -eq 0) {
        $apk=Get-ChildItem -LiteralPath $android -Filter '*.apk' -Recurse -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($null -eq $apk) { throw 'Gradle reported success but no APK was found.' }
        Write-Host ''
        Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
        Write-Host ('APK: ' + $apk.FullName) -ForegroundColor Green
    } else {
        Write-Host ''
        Write-Host 'ANDROID RELEASE BUILD FAILED.' -ForegroundColor Red
    }
} catch {
    Write-Host ''
    Write-Host ('BUILD ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    $FinalExitCode=1
} finally {
    if (-not (Restore-WorkSafely)) { $FinalExitCode=1 }
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor DarkGray
    Write-Host ('Total elapsed : ' + (Format-Duration ((Get-Date)-$BuildStart))) -ForegroundColor DarkGray
    Write-Host ('Source commit : ' + $SourceCommit) -ForegroundColor DarkGray
    if ($BackupBranch) { Write-Host ('Backup branch : ' + $BackupBranch) -ForegroundColor DarkGray }
    Write-Host ('Exit code     : ' + $FinalExitCode) -ForegroundColor DarkGray
    Write-Host '============================================================' -ForegroundColor DarkGray
    Wait-BeforeExit
}
exit $FinalExitCode
