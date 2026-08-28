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

$ScriptRoot = $PSScriptRoot
Set-Location -LiteralPath $ScriptRoot

$Remote = 'origin'
$Branch = 'main'
$RepoRoot = $null
$BuildStart = Get-Date
$StashCreated = $false
$StashMessage = 'khatyar-build-autostash-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$BackupBranch = ''
$FinalStage = 'Starting'
$FinalExitCode = 1

function Format-Elapsed {
    param([TimeSpan]$Value)
    return $Value.ToString('hh\:mm\:ss')
}

function Write-Header {
    Clear-Host
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - ANDROID RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Git repository : ' + $RepoRoot)
    Write-Host ('Build directory: ' + $ScriptRoot)
    Write-Host ''
}

function Write-Stage {
    param([int]$Percent, [string]$Stage)
    $script:FinalStage = $Stage
    $elapsed = Format-Elapsed ((Get-Date) - $BuildStart)
    Write-Host ''
    Write-Host ('[' + $Percent.ToString('000') + '%] ' + $Stage) -ForegroundColor Yellow
    Write-Host ('    Elapsed: ' + $elapsed)
}

function Fail-Build {
    param([string]$Message, [int]$Code = 1)
    $script:FinalExitCode = $Code
    Write-Host ''
    Write-Host ('BUILD STOPPED: ' + $Message) -ForegroundColor Red
    throw ('BUILD_STOPPED:' + $Message)
}

function Invoke-Git {
    param([Parameter(Mandatory=$true)][string[]]$Arguments)

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'git.exe'
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true

    foreach ($arg in $Arguments) {
        $escaped = $arg -replace '(\\*)"', '$1$1\\"'
        $escaped = $escaped -replace '(\\+)$', '$1$1'
        $psi.Arguments += ' "' + $escaped + '"'
    }

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

function Get-GitValue {
    param([string[]]$Arguments)
    $r = Invoke-Git $Arguments
    if ($r.ExitCode -ne 0) { return $null }
    return (($r.Output -join "`n").Trim())
}

function Get-GitClean {
    $r = Invoke-Git @('status','--porcelain')
    if ($r.ExitCode -ne 0) { Fail-Build 'Unable to read Git status.' }
    return (@($r.Output).Count -eq 0)
}

function Restore-Stash {
    if (-not $script:StashCreated) { return $true }
    Write-Host ''
    Write-Host 'Restoring local uncommitted changes...' -ForegroundColor Yellow
    $r = Invoke-Git @('stash','pop')
    if ($r.ExitCode -ne 0) {
        Write-Host 'WARNING: Git stash could not be restored automatically.' -ForegroundColor Red
        Write-Host 'The stash was preserved. Run: git stash list' -ForegroundColor Yellow
        return $false
    }
    $script:StashCreated = $false
    Write-Host 'Local changes restored successfully.' -ForegroundColor Green
    return $true
}

function Show-LastLog {
    param([string]$Path, [int]$Lines = 35)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $items = @(Get-Content -LiteralPath $Path -Tail $Lines -ErrorAction SilentlyContinue)
    if ($items.Count -eq 0) { return }
    Write-Host ''
    Write-Host '---------------- Last Gradle output ----------------' -ForegroundColor DarkGray
    foreach ($line in $items) { Write-Host ('    ' + $line) }
    Write-Host '-----------------------------------------------------' -ForegroundColor DarkGray
}

function Stop-ProcessTree {
    param([int]$ProcessId)
    if ($ProcessId -le 0) { return }
    try { & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null } catch {}
}

function Invoke-GradleBuild {
    param(
        [string]$GradlewPath,
        [string]$WorkingDirectory,
        [string]$LogPath
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false

    $command = '"' + $GradlewPath + '" assembleRelease --console=plain --stacktrace --warning-mode=all'
    $psi.Arguments = '/d /c "' + $command + ' > "' + $LogPath + '" 2>&1"'

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi
    [void]$p.Start()

    $lastLength = 0
    $lastActivity = Get-Date
    $lastDisplay = Get-Date
    $started = Get-Date
    $expectedSeconds = 900.0

    while (-not $p.HasExited) {
        Start-Sleep -Seconds 2

        if (Test-Path -LiteralPath $LogPath) {
            $length = (Get-Item -LiteralPath $LogPath).Length
            if ($length -gt $lastLength) {
                $lastLength = $length
                $lastActivity = Get-Date
            }
        }

        $elapsed = ((Get-Date) - $started).TotalSeconds
        $idle = ((Get-Date) - $lastActivity).TotalSeconds

        if (($elapsed -ge 15) -and ($elapsed -gt $expectedSeconds)) {
            $expectedSeconds = [Math]::Min($expectedSeconds * 1.15, [double]($GradleTimeoutMinutes * 60))
        }

        $percent = 86 + [int]([Math]::Min(12, [Math]::Max(0, ($elapsed / $expectedSeconds) * 12)))
        $etaSeconds = [Math]::Max(0, $expectedSeconds - $elapsed)
        $eta = if ($elapsed -lt 20) { '--:--:--' } else { (New-TimeSpan -Seconds ([int]$etaSeconds)).ToString('hh\:mm\:ss') }
        $elapsedText = (New-TimeSpan -Seconds ([int]$elapsed)).ToString('hh\:mm\:ss')

        if (((Get-Date) - $lastDisplay).TotalSeconds -ge 5) {
            $lastDisplay = Get-Date
            Write-Host ('[ ' + $percent.ToString('00') + '%] Gradle assembleRelease | Elapsed ' + $elapsedText + ' | ETA ' + $eta) -ForegroundColor Cyan
            if (Test-Path -LiteralPath $LogPath) {
                $tail = @(Get-Content -LiteralPath $LogPath -Tail 3 -ErrorAction SilentlyContinue)
                foreach ($line in $tail) {
                    if ($line.Trim()) { Write-Host ('    Gradle: ' + $line.Trim()) -ForegroundColor DarkGray }
                }
            }
        }

        if ($elapsed -ge ($GradleTimeoutMinutes * 60)) {
            Stop-ProcessTree $p.Id
            $p.WaitForExit()
            Show-LastLog $LogPath 60
            throw ('Gradle exceeded the total timeout of ' + $GradleTimeoutMinutes + ' minutes.')
        }

        if ($idle -ge ($GradleIdleTimeoutMinutes * 60)) {
            Stop-ProcessTree $p.Id
            $p.WaitForExit()
            Show-LastLog $LogPath 60
            throw ('Gradle produced no new log output for ' + $GradleIdleTimeoutMinutes + ' minutes.')
        }
    }

    $exitCode = $p.ExitCode
    Show-LastLog $LogPath 25
    if ($exitCode -ne 0) { throw ('Gradle exited with code ' + $exitCode + '.') }
    return 0
}

try {
    if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
        Fail-Build 'Git is not installed or is not available in PATH.'
    }

    $repoCheck = Invoke-Git @('rev-parse','--show-toplevel')
    if ($repoCheck.ExitCode -ne 0) { Fail-Build 'This build directory is not inside a Git repository.' }
    $RepoRoot = ($repoCheck.Output -join '').Trim()
    Write-Header

    Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
    $answer = (Read-Host 'Download from GitHub').Trim().ToUpperInvariant()
    if ($answer -notin @('Y','N')) { Fail-Build 'Please answer Y or N.' }

    Write-Stage 14 'Fetching GitHub main branch'
    $fetch = Invoke-Git @('fetch',$Remote,$Branch)
    if ($fetch.ExitCode -ne 0) { Fail-Build ('GitHub fetch failed: ' + (($fetch.Output + $fetch.Error) -join ' ')) }

    $localSha = Get-GitValue @('rev-parse','HEAD')
    $remoteSha = Get-GitValue @('rev-parse',($Remote + '/' + $Branch))
    if ([string]::IsNullOrWhiteSpace($localSha) -or [string]::IsNullOrWhiteSpace($remoteSha)) { Fail-Build 'Unable to determine local or GitHub commit SHA.' }

    Write-Stage 29 'Preparing local workspace'
    if ($answer -eq 'Y') {
        if (-not (Get-GitClean)) {
            Write-Host 'Local uncommitted changes detected. Stashing temporarily...' -ForegroundColor Yellow
            $stash = Invoke-Git @('stash','push','-u','-m',$StashMessage)
            if ($stash.ExitCode -ne 0) { Fail-Build ('Unable to stash local changes: ' + (($stash.Output + $stash.Error) -join ' ')) }
            $StashCreated = $true
            Write-Host 'Local changes safely stashed.' -ForegroundColor Green
        }

        $localSha = Get-GitValue @('rev-parse','HEAD')
        $remoteSha = Get-GitValue @('rev-parse',($Remote + '/' + $Branch))
        if ($localSha -ne $remoteSha) {
            $BackupBranch = 'build-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
            $backup = Invoke-Git @('branch',$BackupBranch,'HEAD')
            if ($backup.ExitCode -ne 0) { Fail-Build ('Unable to create backup branch: ' + (($backup.Output + $backup.Error) -join ' ')) }
            Write-Host ('Local commits preserved on backup branch: ' + $BackupBranch) -ForegroundColor Yellow
            $reset = Invoke-Git @('reset','--hard',($Remote + '/' + $Branch))
            if ($reset.ExitCode -ne 0) { Fail-Build ('Unable to synchronize local branch with GitHub: ' + (($reset.Output + $reset.Error) -join ' ')) }
        }

        $localSha = Get-GitValue @('rev-parse','HEAD')
        $remoteSha = Get-GitValue @('rev-parse',($Remote + '/' + $Branch))
        if ($localSha -ne $remoteSha) { Fail-Build ('Synchronization verification failed. Local=' + $localSha + ' GitHub=' + $remoteSha) }
        if (-not (Get-GitClean)) { Fail-Build 'Working tree is not clean after GitHub synchronization.' }
        Write-Host ('GitHub synchronization verified. Source commit: ' + $localSha) -ForegroundColor Green
    } else {
        if ($localSha -ne $remoteSha) { Fail-Build ('Local version is not equal to GitHub. Local=' + $localSha + ' GitHub=' + $remoteSha + '. Choose Y to download the latest files.') }
        if (-not (Get-GitClean)) { Fail-Build 'Local uncommitted changes are present. Choose Y to safely stash them.' }
        Write-Host ('Local version matches GitHub. Source commit: ' + $localSha) -ForegroundColor Green
    }

    Write-Stage 43 'Checking Node.js and npm environment'
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { Fail-Build 'Node.js was not found in PATH.' }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { Fail-Build 'npm was not found in PATH.' }
    & node.exe --version
    if ($LASTEXITCODE -ne 0) { Fail-Build 'Node.js version check failed.' }
    & npm.cmd --version
    if ($LASTEXITCODE -ne 0) { Fail-Build 'npm version check failed.' }

    $AndroidRoot = Join-Path $ScriptRoot 'android'
    $Gradlew = Join-Path $AndroidRoot 'gradlew.bat'
    if (-not (Test-Path -LiteralPath $Gradlew)) { Fail-Build ('Gradle wrapper not found: ' + $Gradlew) }

    Write-Stage 57 'Validating Android Gradle project'
    if (-not (Test-Path -LiteralPath (Join-Path $AndroidRoot 'settings.gradle')) -and -not (Test-Path -LiteralPath (Join-Path $AndroidRoot 'settings.gradle.kts'))) {
        Fail-Build 'Android settings.gradle/settings.gradle.kts was not found.'
    }

    if (-not $SkipDoctor) {
        $packageJson = Join-Path $ScriptRoot 'package.json'
        if (Test-Path -LiteralPath $packageJson) {
            Write-Host 'package.json found. No dependency or version mutation will be performed by this script.' -ForegroundColor DarkGray
        }
    }

    Write-Stage 71 'Checking Java and Gradle toolchain'
    if (-not (Get-Command java.exe -ErrorAction SilentlyContinue)) { Fail-Build 'Java was not found in PATH.' }
    & java.exe -version
    if ($LASTEXITCODE -ne 0) { Fail-Build 'Java version check failed.' }
    & $Gradlew --version
    if ($LASTEXITCODE -ne 0) { Fail-Build 'Gradle wrapper validation failed.' }

    $LogDir = Join-Path $AndroidRoot 'build\khatyar-build-logs'
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    $LogPath = Join-Path $LogDir ('assembleRelease-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')

    Write-Stage 86 'Starting Gradle assembleRelease'
    Write-Host ''
    Write-Host ('Gradle log: ' + $LogPath) -ForegroundColor DarkGray
    Write-Host 'Gradle preflight is intentionally disabled. The release build is the single build operation.' -ForegroundColor DarkGray
    Write-Host ('Total timeout: ' + $GradleTimeoutMinutes + ' min; idle timeout: ' + $GradleIdleTimeoutMinutes + ' min.') -ForegroundColor DarkGray

    $FinalExitCode = Invoke-GradleBuild -GradlewPath $Gradlew -WorkingDirectory $AndroidRoot -LogPath $LogPath

    $apkCandidates = @(
        (Join-Path $AndroidRoot 'app\build\outputs\apk\release\app-release.apk'),
        (Join-Path $AndroidRoot 'app\build\outputs\apk\release\app-release-unsigned.apk')
    )
    $apk = $apkCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($apk) { Write-Host ('APK: ' + $apk) -ForegroundColor Green }
    Write-Host ''
    Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
}
catch {
    if ($_.Exception.Message -notlike 'BUILD_STOPPED:*') {
        Write-Host ''
        Write-Host ('BUILD ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    }
    if ($FinalExitCode -eq 0) { $FinalExitCode = 1 }
}
finally {
    if (-not (Restore-Stash)) { $FinalExitCode = 1 }
    $total = Format-Elapsed ((Get-Date) - $BuildStart)
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Total elapsed : ' + $total)
    Write-Host ('Final stage   : ' + $FinalStage)
    $source = Get-GitValue @('rev-parse','HEAD')
    if ($source) { Write-Host ('Source commit : ' + $source) }
    if ($BackupBranch) { Write-Host ('Backup branch : ' + $BackupBranch) }
    Write-Host ('Exit code     : ' + $FinalExitCode)
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'BUILD SCRIPT FINISHED - WINDOW WILL REMAIN OPEN' -ForegroundColor Yellow
    if (-not $NoPause) { [void](Read-Host 'Press ENTER to close this window') }
}
exit $FinalExitCode
