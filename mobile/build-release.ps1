#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipCleanup,
    [switch]$SkipDoctor,
    [int]$GradleTimeoutMinutes = 120,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ScriptRoot = $PSScriptRoot
Set-Location -LiteralPath $ScriptRoot

$Remote = 'origin'
$Branch = 'main'
$RepoRoot = $null
$BuildStart = Get-Date
$StashCreated = $false
$StashMessage = 'khatyar-build-autostash-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$BackupBranch = $null
$SourceCommit = $null
$FinalExitCode = 1
$CurrentStage = 'Initializing'

function Format-Duration {
    param([TimeSpan]$Duration)
    if ($Duration.TotalHours -ge 1) { return $Duration.ToString('hh\:mm\:ss') }
    return $Duration.ToString('mm\:ss')
}

function Show-Stage {
    param([int]$Percent,[string]$Name)
    $script:CurrentStage = $Name
    Write-Host ''
    Write-Host ('[{0,3}%] {1}' -f $Percent,$Name) -ForegroundColor Cyan
    Write-Host ('    Elapsed: ' + (Format-Duration ((Get-Date) - $BuildStart))) -ForegroundColor DarkGray
}

function Test-Command {
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
        $a = [string]$arg
        $a = $a -replace '(\\*)"','$1$1\\"'
        $a = $a -replace '(\\+)$','$1$1'
        $psi.Arguments += ' "' + $a + '"'
    }

    $p = $null
    try {
        $p = New-Object System.Diagnostics.Process
        $p.StartInfo = $psi
        [void]$p.Start()
        $stdout = $p.StandardOutput.ReadToEnd()
        $stderr = $p.StandardError.ReadToEnd()
        $p.WaitForExit()
        return [pscustomobject]@{
            Output = @($stdout -split "`r?`n" | Where-Object { $_ -ne '' })
            Error = @($stderr -split "`r?`n" | Where-Object { $_ -ne '' })
            ExitCode = $p.ExitCode
        }
    }
    finally {
        if ($null -ne $p) { $p.Dispose() }
    }
}

function Get-RefSha {
    param([string]$Ref)
    $r = Invoke-Git @('rev-parse',$Ref)
    if ($r.ExitCode -ne 0) { return $null }
    return ((@($r.Output) -join '').Trim())
}

function Get-TreeClean {
    $r = Invoke-Git @('status','--porcelain')
    if ($r.ExitCode -ne 0) { throw ('Unable to read Git status: ' + (($r.Output + $r.Error) -join ' ')) }
    return (@($r.Output).Count -eq 0)
}

function Restore-Stash {
    if (-not $script:StashCreated) { return $true }

    Write-Host ''
    Write-Host 'Restoring local uncommitted changes...' -ForegroundColor Yellow
    $r = Invoke-Git @('stash','pop')
    if ($r.ExitCode -ne 0) {
        Write-Host 'WARNING: local changes could not be restored automatically.' -ForegroundColor Red
        Write-Host 'The stash was preserved. Use: git stash list' -ForegroundColor Yellow
        return $false
    }

    $script:StashCreated = $false
    Write-Host 'Local changes restored successfully.' -ForegroundColor Green
    return $true
}

function Get-LastLogLines {
    param([string]$Path,[int]$Count=12)
    if (-not (Test-Path -LiteralPath $Path)) { return @() }
    try {
        return @(Get-Content -LiteralPath $Path -Tail $Count -ErrorAction Stop)
    } catch {
        return @()
    }
}

function Invoke-GradleProcess {
    param(
        [Parameter(Mandatory=$true)][string]$GradlewPath,
        [Parameter(Mandatory=$true)][string]$WorkingDirectory,
        [int]$TimeoutMinutes = 120
    )

    $logDirectory = Join-Path $WorkingDirectory 'build\khatyar-build-logs'
    if (-not (Test-Path -LiteralPath $logDirectory)) {
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $logPath = Join-Path $logDirectory ('assembleRelease-' + $stamp + '.log')
    $escapedGradle = $GradlewPath.Replace('"','\"')
    $escapedLog = $logPath.Replace('"','\"')
    $command = '"' + $escapedGradle + '" assembleRelease --console=plain --stacktrace --no-daemon --no-watch-fs > "' + $escapedLog + '" 2>&1'

    Write-Host ''
    Write-Host ('Gradle log: ' + $logPath) -ForegroundColor DarkGray
    Write-Host 'Gradle is running in a separate process. PowerShell will remain active and monitor it.' -ForegroundColor Green

    $process = $null
    $started = Get-Date
    $lastLine = ''
    $lastLineTime = Get-Date
    $estimatedSeconds = 0
    $taskCount = 0
    $taskDone = 0

    try {
        $process = Start-Process -FilePath 'cmd.exe' `
            -ArgumentList @('/d','/c',$command) `
            -WorkingDirectory $WorkingDirectory `
            -WindowStyle Hidden `
            -PassThru

        while (-not $process.HasExited) {
            $lines = Get-LastLogLines -Path $logPath -Count 40
            if (@($lines).Count -gt 0) {
                $candidate = ([string]$lines[-1]).Trim()
                if ($candidate -and $candidate -ne $lastLine) {
                    $lastLine = $candidate
                    $lastLineTime = Get-Date
                }

                foreach ($line in @($lines)) {
                    $text = ([string]$line).Trim()
                    if ($text -match '^> Task\s+(.+)$') {
                        $taskDone++
                    }
                    if ($text -match '(\d+) actionable tasks?') {
                        $taskCount = [int]$Matches[1]
                    }
                }
            }

            $elapsed = ((Get-Date) - $started).TotalSeconds
            $displayPercent = 86
            $etaText = '--:--'
            $status = if ($lastLine) { $lastLine } else { 'Gradle is initializing...' }

            if ($taskCount -gt 0 -and $taskDone -gt 0) {
                $ratio = [math]::Min(0.99,$taskDone / [double]$taskCount)
                $displayPercent = [int](86 + ($ratio * 13))
                $estimatedSeconds = [int][math]::Max(0,(($elapsed / $ratio) - $elapsed))
                $etaText = Format-Duration ([TimeSpan]::FromSeconds($estimatedSeconds))
            } else {
                # Gradle does not expose a reliable percentage during dependency
                # resolution/configuration. Never invent an ETA in this phase.
                $etaText = 'calculating'
            }

            $barWidth = 36
            $filled = [int][math]::Floor($barWidth * $displayPercent / 100)
            $bar = ('#' * $filled) + ('-' * ($barWidth - $filled))
            $elapsedText = Format-Duration ((Get-Date) - $BuildStart)
            Write-Host ("`r[{0,3}%] [{1}] {2} | Elapsed {3} | ETA {4}   " -f $displayPercent,$bar,$status,$elapsedText,$etaText) -NoNewline

            if (((Get-Date) - $started).TotalMinutes -ge $TimeoutMinutes) {
                Write-Host ''
                Write-Host ('BUILD STOPPED: Gradle exceeded the maximum build time of ' + $TimeoutMinutes + ' minutes.') -ForegroundColor Red
                Write-Host ('Full Gradle log: ' + $logPath) -ForegroundColor Yellow
                try { $process.Kill() } catch {}
                try { $process.WaitForExit() } catch {}
                return [pscustomobject]@{ ExitCode = 124; LogPath = $logPath; TimedOut = $true }
            }

            Start-Sleep -Seconds 1
            $process.Refresh()
        }

        $process.WaitForExit()
        Write-Host ''
        Write-Host ('Gradle process exited with code: ' + $process.ExitCode) -ForegroundColor $(if ($process.ExitCode -eq 0) { 'Green' } else { 'Red' })

        $tail = Get-LastLogLines -Path $logPath -Count 20
        if (@($tail).Count -gt 0) {
            Write-Host '------------------------------------------------------------' -ForegroundColor DarkGray
            foreach ($line in @($tail)) {
                Write-Host ('    ' + $line) -ForegroundColor DarkGray
            }
            Write-Host '------------------------------------------------------------' -ForegroundColor DarkGray
        }

        return [pscustomobject]@{ ExitCode = $process.ExitCode; LogPath = $logPath; TimedOut = $false }
    }
    finally {
        if ($null -ne $process) { $process.Dispose() }
    }
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
    if (-not (Test-Command 'git.exe')) { throw 'Git is not installed or is not available in PATH.' }

    # Resolve the repository without relying on the current working directory.
    $cursor = $ScriptRoot
    while ($true) {
        if (Test-Path -LiteralPath (Join-Path $cursor '.git')) {
            $RepoRoot = $cursor
            break
        }
        $parent = Split-Path -Parent $cursor
        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $cursor) { break }
        $cursor = $parent
    }
    if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
        throw ('This build directory is not inside a Git repository: ' + $ScriptRoot)
    }

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - ANDROID RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Git repository : ' + $RepoRoot) -ForegroundColor DarkGray
    Write-Host ('Build directory: ' + $ScriptRoot) -ForegroundColor DarkGray
    Write-Host ''
    Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
    $answer = (Read-Host 'Download from GitHub').Trim().ToUpperInvariant()
    if ($answer -notin @('Y','N')) { throw 'Please answer Y or N.' }

    Show-Stage 14 'Fetching GitHub main branch'
    $fetch = Invoke-Git @('fetch',$Remote,$Branch)
    if ($fetch.ExitCode -ne 0) { throw ('GitHub fetch failed: ' + (($fetch.Output + $fetch.Error) -join ' ')) }

    $localSha = Get-RefSha 'HEAD'
    $remoteSha = Get-RefSha ($Remote + '/' + $Branch)
    if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) {
        throw 'Unable to determine local or GitHub commit SHA.'
    }

    Show-Stage 29 'Preparing local workspace'
    if ($answer -eq 'Y') {
        if (-not (Get-TreeClean)) {
            Write-Host 'Local uncommitted changes detected. Stashing temporarily...' -ForegroundColor Yellow
            $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
            if ($stash.ExitCode -ne 0) { throw ('Unable to stash local changes: ' + (($stash.Output + $stash.Error) -join ' ')) }
            $script:StashCreated = $true
            Write-Host 'Local changes safely stashed.' -ForegroundColor Green
        }

        $localSha = Get-RefSha 'HEAD'
        if ($localSha -ne $remoteSha) {
            $BackupBranch = 'build-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
            $backup = Invoke-Git @('branch',$BackupBranch,'HEAD')
            if ($backup.ExitCode -ne 0) { throw ('Unable to create backup branch: ' + (($backup.Output + $backup.Error) -join ' ')) }
            Write-Host ('Local commits preserved on backup branch: ' + $BackupBranch) -ForegroundColor Yellow

            $reset = Invoke-Git @('reset','--hard',($Remote + '/' + $Branch))
            if ($reset.ExitCode -ne 0) { throw ('Unable to synchronize local branch: ' + (($reset.Output + $reset.Error) -join ' ')) }
        }

        $localSha = Get-RefSha 'HEAD'
        $remoteSha = Get-RefSha ($Remote + '/' + $Branch)
        if ($localSha -ne $remoteSha) { throw "Synchronization verification failed. Local=$localSha GitHub=$remoteSha" }
        if (-not (Get-TreeClean)) { throw 'Working tree is not clean after GitHub synchronization.' }
        $SourceCommit = $localSha
        Write-Host ('GitHub synchronization verified. Source commit: ' + $SourceCommit) -ForegroundColor Green
    }
    else {
        if ($localSha -ne $remoteSha) {
            throw "Local version is not equal to GitHub. Local=$localSha GitHub=$remoteSha. Choose Y to download the latest files before building."
        }
        if (-not (Get-TreeClean)) {
            throw 'Local uncommitted changes are present. Choose Y so they can be safely stashed while the GitHub version is built.'
        }
        $SourceCommit = $localSha
        Write-Host ('Local version matches GitHub. Source commit: ' + $SourceCommit) -ForegroundColor Green
    }

    Show-Stage 43 'Checking Node.js and npm environment'
    if (-not (Test-Command 'node.exe')) { throw 'Node.js is not available in PATH.' }
    if (-not (Test-Command 'npm.cmd')) { throw 'npm is not available in PATH.' }
    & node.exe --version
    if ($LASTEXITCODE -ne 0) { throw 'Node.js check failed.' }
    & npm.cmd --version
    if ($LASTEXITCODE -ne 0) { throw 'npm check failed.' }

    $gradlew = Join-Path $ScriptRoot 'android\gradlew.bat'
    if (-not (Test-Path -LiteralPath $gradlew)) { throw ('Gradle wrapper not found: ' + $gradlew) }

    Show-Stage 57 'Validating Android Gradle project'
    $settingsGradle = Join-Path $ScriptRoot 'android\settings.gradle'
    if (-not (Test-Path -LiteralPath $settingsGradle)) { throw 'android/settings.gradle was not found.' }

    $rnPlugin = Join-Path $ScriptRoot 'node_modules\@react-native\gradle-plugin'
    if (-not (Test-Path -LiteralPath $rnPlugin)) {
        throw 'React Native Gradle Plugin is missing from node_modules. Run npm install before building.'
    }

    if (-not $SkipDoctor) {
        Write-Host 'Running Gradle configuration preflight (help)...' -ForegroundColor DarkGray
        $preflight = Invoke-GradleProcess -GradlewPath $gradlew -WorkingDirectory (Join-Path $ScriptRoot 'android') -TimeoutMinutes 10
        if ($preflight.ExitCode -ne 0) {
            throw ('Gradle preflight failed. Full log: ' + $preflight.LogPath)
        }
    }

    Show-Stage 71 'Checking Java and Gradle toolchain'
    if (-not (Test-Command 'java.exe')) { throw 'Java is not available in PATH.' }
    & java.exe -version
    if ($LASTEXITCODE -ne 0) { throw 'Java check failed.' }

    & $gradlew '--version'
    if ($LASTEXITCODE -ne 0) { throw 'Gradle wrapper check failed.' }

    Show-Stage 86 'Starting Gradle assembleRelease'
    $gradleResult = Invoke-GradleProcess -GradlewPath $gradlew -WorkingDirectory (Join-Path $ScriptRoot 'android') -TimeoutMinutes $GradleTimeoutMinutes
    $FinalExitCode = [int]$gradleResult.ExitCode

    if ($FinalExitCode -eq 0) {
        $apkCandidates = @(Get-ChildItem -Path (Join-Path $ScriptRoot 'android\app\build\outputs\apk') -Filter '*.apk' -Recurse -File -ErrorAction SilentlyContinue)
        Write-Host ''
        Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
        if ($apkCandidates.Count -gt 0) {
            Write-Host 'Generated APK:' -ForegroundColor Green
            foreach ($apk in $apkCandidates) { Write-Host ('  ' + $apk.FullName) -ForegroundColor White }
        }
    }
    else {
        Write-Host ''
        Write-Host 'ANDROID RELEASE BUILD FAILED.' -ForegroundColor Red
        Write-Host ('Gradle exit code: ' + $FinalExitCode) -ForegroundColor Red
    }
}
catch {
    $FinalExitCode = 1
    Write-Host ''
    Write-Host ('BUILD STOPPED: ' + $_.Exception.Message) -ForegroundColor Red
}
finally {
    try {
        if (-not (Restore-Stash)) { $FinalExitCode = 1 }
    } catch {
        $FinalExitCode = 1
        Write-Host ('WARNING: failed while restoring local changes: ' + $_.Exception.Message) -ForegroundColor Red
    }

    Write-Host ''
    Write-Host '============================================================' -ForegroundColor DarkGray
    Write-Host ('Total elapsed : ' + (Format-Duration ((Get-Date) - $BuildStart))) -ForegroundColor White
    Write-Host ('Final stage   : ' + $CurrentStage) -ForegroundColor White
    Write-Host ('Source commit : ' + $SourceCommit) -ForegroundColor White
    if ($BackupBranch) { Write-Host ('Backup branch : ' + $BackupBranch) -ForegroundColor White }
    Write-Host ('Exit code     : ' + $FinalExitCode) -ForegroundColor White
    Write-Host '============================================================' -ForegroundColor DarkGray

    if (-not $NoPause) {
        Wait-BeforeExit
    }
}

exit $FinalExitCode
