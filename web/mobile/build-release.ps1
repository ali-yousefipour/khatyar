#requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$Fresh,
  [switch]$SkipCleanup,
  [switch]$SkipDoctor
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot
$env:NODE_ENV = 'production'
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
$env:CI = '1'

# Build helper functions embedded below.
#requires -Version 5.1
Set-StrictMode -Version Latest

function Initialize-BuildContext {
  param([string]$Root = $PSScriptRoot)
  $script:BuildRoot = (Resolve-Path $Root).Path
  $script:LogDir = Join-Path $script:BuildRoot '.build-logs'
  $script:ReportDir = Join-Path $script:BuildRoot '..\release\myket\reports'
  New-Item -ItemType Directory -Force -Path $script:LogDir | Out-Null
  New-Item -ItemType Directory -Force -Path $script:ReportDir | Out-Null
  $script:BuildResults = New-Object 'System.Collections.Generic.List[object]'
  $script:BuildStartedAt = Get-Date
}

function Add-BuildResult {
  param(
    [string]$Stage,
    [string]$Status,
    [int]$ExitCode = -1,
    [double]$DurationSeconds = 0,
    [string]$Message = '',
    [string]$LogFile = '',
    [int]$Attempt = 1,
    [bool]$Critical = $false,
    [string]$Registry = ''
  )
  $item = [pscustomobject][ordered]@{
    stage = $Stage
    status = $Status
    exitCode = $ExitCode
    durationSeconds = [math]::Round($DurationSeconds, 1)
    message = $Message
    logFile = $LogFile
    attempt = $Attempt
    critical = $Critical
    registry = $Registry
    time = (Get-Date).ToString('s')
  }
  [void]$script:BuildResults.Add($item)
}

function Get-ExecutablePath {
  param([Parameter(Mandatory=$true)][string]$Command)
  if (Test-Path $Command) { return (Resolve-Path $Command).Path }
  $cmd = Get-Command $Command -ErrorAction SilentlyContinue
  if ($null -eq $cmd) { return $null }
  return $cmd.Source
}

function Quote-CmdArgument {
  param([AllowEmptyString()][string]$Value)
  if ($null -eq $Value) { return '""' }
  $escaped = $Value -replace '"','\"'
  return '"' + $escaped + '"'
}

function Stop-ProcessTree {
  param([int]$ProcessId)
  try { & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null } catch {}
}

function Get-LogSummary {
  param([string]$OutLog, [string]$ErrLog, [int]$Lines = 50)
  $all = New-Object 'System.Collections.Generic.List[string]'
  foreach ($path in @($OutLog, $ErrLog)) {
    if (Test-Path $path) {
      foreach ($line in @(Get-Content $path -ErrorAction SilentlyContinue)) {
        if (-not [string]::IsNullOrWhiteSpace($line)) { [void]$all.Add($line.TrimEnd()) }
      }
    }
  }
  if ($all.Count -eq 0) { return "No process output. out=$OutLog err=$ErrLog" }

  $arr = @($all.ToArray())
  $contexts = New-Object 'System.Collections.Generic.List[string]'
  $markers = @(
    '^FAILURE:', '^\* Where:', '^\* What went wrong:', '^Execution failed for task',
    '^A problem occurred', '^Could not ', '^Caused by:', '^> ',
    'Could not get unknown property', 'SoftwareComponent', 'Publication',
    'Build file .* line:', 'Script .* line:'
  )
  for ($i = 0; $i -lt $arr.Count; $i++) {
    $matched = $false
    foreach ($m in $markers) { if ($arr[$i] -match $m) { $matched = $true; break } }
    if ($matched) {
      $from = [math]::Max(0, $i - 2)
      $to = [math]::Min($arr.Count - 1, $i + 8)
      for ($j = $from; $j -le $to; $j++) { [void]$contexts.Add($arr[$j].Trim()) }
    }
  }

  $tail = @($arr | Select-Object -Last $Lines)
  $combined = @($contexts.ToArray() + $tail | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
  $summary = (($combined -join ' | ') -replace "`r|`n", ' ')
  if ($summary.Length -gt 12000) { $summary = $summary.Substring(0, 12000) + ' ...[truncated]' }
  return "$summary | Full logs: out=$OutLog err=$ErrLog"
}

function Classify-BuildFailure {
  param([string]$Text, [string]$Status)
  if ($Status -match 'timeout') { return 'timeout' }
  if ($Text -match 'ENOTFOUND|getaddrinfo|Could not resolve host|UnknownHostException') { return 'dns-or-registry-unreachable' }
  if ($Text -match 'ETIMEDOUT|ECONNRESET|socket hang up|Connection timed out|Read timed out') { return 'network-timeout' }
  if ($Text -match 'EAI_AGAIN|temporary failure') { return 'temporary-dns-failure' }
  if ($Text -match 'ERESOLVE|peer dependency|Could not resolve dependency') { return 'dependency-conflict' }
  if ($Text -match '401|403|forbidden|unauthorized') { return 'access-denied-or-sanction' }
  if ($Text -match 'No space left|not enough space|disk full') { return 'disk-space' }
  if ($Text -match 'JAVA_HOME|java.*not found') { return 'java-missing' }
  if ($Text -match 'SDK location not found|ANDROID_HOME|sdkmanager') { return 'android-sdk-missing' }
  return 'command-failed'
}

function Invoke-ManagedProcess {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory=$true)][string]$Stage,
    [Parameter(Mandatory=$true)][string]$FilePath,
    [string[]]$Arguments = @(),
    [string]$WorkingDirectory = $script:BuildRoot,
    [int]$IdleTimeoutMinutes = 8,
    [int]$HardTimeoutMinutes = 45,
    [int]$Retries = 0,
    [int]$RetryDelaySeconds = 10,
    [bool]$Critical = $false,
    [hashtable]$Environment = @{},
    [string]$Registry = ''
  )

  $resolved = Get-ExecutablePath $FilePath
  if ([string]::IsNullOrWhiteSpace($resolved)) {
    $msg = "Executable not found: $FilePath"
    Add-BuildResult -Stage $Stage -Status 'missing' -ExitCode 127 -Message $msg -Critical $Critical -Registry $Registry
    Write-Warning "[$Stage] $msg"
    return [pscustomobject]@{ Success=$false; Status='missing'; ExitCode=127; Message=$msg; OutLog=''; ErrLog=''; Category='missing-executable' }
  }

  $lastFailure = $null

  for ($attempt = 1; $attempt -le ($Retries + 1); $attempt++) {
    $safe = ($Stage -replace '[^a-zA-Z0-9_.-]', '_')
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $outLog = Join-Path $script:LogDir "$stamp-$safe-attempt$attempt.out.log"
    $errLog = Join-Path $script:LogDir "$stamp-$safe-attempt$attempt.err.log"
    New-Item -ItemType File -Force -Path $outLog | Out-Null
    New-Item -ItemType File -Force -Path $errLog | Out-Null

    Write-Host "`n=== $Stage (attempt $attempt of $($Retries + 1)) ===" -ForegroundColor Cyan
    if ($Registry) { Write-Host "Registry: $Registry" -ForegroundColor DarkCyan }
    Write-Host ("Command: {0} {1}" -f $resolved, ($Arguments -join ' ')) -ForegroundColor DarkGray

    $start = Get-Date
    $lastActivity = Get-Date
    $lastOutLength = 0L
    $lastErrLength = 0L
    $lastCpuSeconds = -1.0
    $oldEnv = @{}
    foreach ($key in $Environment.Keys) {
      $oldEnv[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
      [Environment]::SetEnvironmentVariable($key, [string]$Environment[$key], 'Process')
    }

    $proc = $null
    $status = 'running'
    try {
      $cmdExe = Get-ExecutablePath 'cmd.exe'
      $parts = New-Object 'System.Collections.Generic.List[string]'
      [void]$parts.Add((Quote-CmdArgument $resolved))
      foreach ($arg in $Arguments) { [void]$parts.Add((Quote-CmdArgument ([string]$arg))) }
      $commandLine = ($parts.ToArray() -join ' ')

      $psi = New-Object System.Diagnostics.ProcessStartInfo
      $psi.FileName = $cmdExe
      $psi.Arguments = '/d /s /c "' + $commandLine + '"'
      $psi.WorkingDirectory = $WorkingDirectory
      $psi.UseShellExecute = $false
      $psi.CreateNoWindow = $true
      $psi.RedirectStandardOutput = $true
      $psi.RedirectStandardError = $true

      $proc = New-Object System.Diagnostics.Process
      $proc.StartInfo = $psi
      [void]$proc.Start()

      $stdoutTask = $proc.StandardOutput.ReadToEndAsync()
      $stderrTask = $proc.StandardError.ReadToEndAsync()

      while (-not $proc.WaitForExit(1000)) {
        $elapsed = (Get-Date) - $start
        if (($HardTimeoutMinutes -gt 0) -and ($elapsed.TotalMinutes -ge $HardTimeoutMinutes)) { $status = 'hard-timeout'; break }

        # ReadToEndAsync does not expose partial data, so process CPU and npm debug logs are also progress signals.
        $cpu = 0.0
        try {
          $proc.Refresh()
          $cpu = $proc.TotalProcessorTime.TotalSeconds
          if ($cpu -gt ($lastCpuSeconds + 0.05)) {
            $lastActivity = Get-Date
            $lastCpuSeconds = $cpu
          }
        } catch {}
        $heartbeatPath = Join-Path $script:LogDir "$safe.heartbeat"
        $heartbeat = "{0}|pid={1}|cpu={2}" -f (Get-Date).ToString('s'), $proc.Id, $cpu
        Set-Content -Path $heartbeatPath -Value $heartbeat -Encoding ASCII

        # For npm, the debug log changes even when stdout is quiet.
        $npmLog = Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_logs\*-debug-0.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($npmLog -and $npmLog.LastWriteTime -gt $lastActivity) { $lastActivity = $npmLog.LastWriteTime }

        if (($IdleTimeoutMinutes -gt 0) -and (((Get-Date) - $lastActivity).TotalMinutes -ge $IdleTimeoutMinutes)) { $status = 'idle-timeout'; break }
      }

      if ($status -ne 'running') {
        Write-Warning "[$Stage] $status detected. Terminating process tree PID $($proc.Id)."
        Stop-ProcessTree -ProcessId $proc.Id
        Start-Sleep -Seconds 2
      } else {
        $proc.WaitForExit()
      }

      $stdout = ''
      $stderr = ''
      try { $stdout = $stdoutTask.Result } catch {}
      try { $stderr = $stderrTask.Result } catch {}
      Set-Content -Path $outLog -Value $stdout -Encoding UTF8
      Set-Content -Path $errLog -Value $stderr -Encoding UTF8

      $exitCode = if ($status -eq 'running') { [int]$proc.ExitCode } else { 124 }
      $duration = ((Get-Date) - $start).TotalSeconds
      if (($status -eq 'running') -and ($exitCode -eq 0)) {
        Add-BuildResult -Stage $Stage -Status 'success' -ExitCode 0 -DurationSeconds $duration -Message 'Completed' -LogFile $outLog -Attempt $attempt -Critical $Critical -Registry $Registry
        Write-Host "[$Stage] completed in $([math]::Round($duration,1)) seconds." -ForegroundColor Green
        return [pscustomobject]@{ Success=$true; Status='success'; ExitCode=0; Message='Completed'; OutLog=$outLog; ErrLog=$errLog; Category='' }
      }

      if ($status -eq 'running') { $status = 'failed' }
      $tail = Get-LogSummary -OutLog $outLog -ErrLog $errLog
      $category = Classify-BuildFailure -Text $tail -Status $status
      $summary = "Category=$category Status=$status ExitCode=$exitCode"
      if ($tail) { $summary += '; Last output: ' + $tail }
      Add-BuildResult -Stage $Stage -Status $status -ExitCode $exitCode -DurationSeconds $duration -Message $summary -LogFile $errLog -Attempt $attempt -Critical $Critical -Registry $Registry
      $lastFailure = [pscustomobject]@{ Success=$false; Status=$status; ExitCode=$exitCode; Message=$summary; OutLog=$outLog; ErrLog=$errLog; Category=$category }
      Write-Warning "[$Stage] $summary"
    }
    catch {
      $duration = ((Get-Date) - $start).TotalSeconds
      $msg = $_.Exception.Message
      Add-BuildResult -Stage $Stage -Status 'exception' -ExitCode 1 -DurationSeconds $duration -Message $msg -LogFile $errLog -Attempt $attempt -Critical $Critical -Registry $Registry
      $lastFailure = [pscustomobject]@{ Success=$false; Status='exception'; ExitCode=1; Message=$msg; OutLog=$outLog; ErrLog=$errLog; Category='exception' }
      Write-Warning "[$Stage] $msg"
    }
    finally {
      if ($proc -and (-not $proc.HasExited)) { Stop-ProcessTree -ProcessId $proc.Id }
      foreach ($key in $Environment.Keys) { [Environment]::SetEnvironmentVariable($key, $oldEnv[$key], 'Process') }
    }

    if ($attempt -le $Retries) {
      Write-Host "Retrying $Stage in $RetryDelaySeconds seconds..." -ForegroundColor Yellow
      Start-Sleep -Seconds $RetryDelaySeconds
    }
  }

  if ($null -ne $lastFailure) { return $lastFailure }
  return [pscustomobject]@{ Success=$false; Status='failed'; ExitCode=1; Message='All attempts failed'; OutLog=''; ErrLog=''; Category='all-attempts-failed' }
}

function Write-BuildReport {
  param([string]$FinalStatus='unknown', [string]$ApkPath='', [string]$AabPath='')
  $ended = Get-Date
  $resultArray = @($script:BuildResults.ToArray())
  $report = [pscustomobject][ordered]@{
    finalStatus = $FinalStatus
    startedAt = $script:BuildStartedAt.ToString('s')
    endedAt = $ended.ToString('s')
    elapsedSeconds = [math]::Round(($ended - $script:BuildStartedAt).TotalSeconds, 1)
    apk = $ApkPath
    aab = $AabPath
    results = $resultArray
  }
  $jsonPath = Join-Path $script:ReportDir 'build-report.json'
  $txtPath = Join-Path $script:ReportDir 'build-report.txt'
  $htmlPath = Join-Path $script:ReportDir 'build-report.html'
  $report | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

  $lines = New-Object 'System.Collections.Generic.List[string]'
  [void]$lines.Add("Final status: $FinalStatus")
  [void]$lines.Add("Started: $($report.startedAt)")
  [void]$lines.Add("Ended: $($report.endedAt)")
  [void]$lines.Add("Elapsed seconds: $($report.elapsedSeconds)")
  [void]$lines.Add("APK: $ApkPath")
  [void]$lines.Add("AAB: $AabPath")
  [void]$lines.Add('')
  foreach ($r in $resultArray) { [void]$lines.Add("[$($r.status)] $($r.stage) | registry=$($r.registry) | exit=$($r.exitCode) | $($r.durationSeconds)s | $($r.message)") }
  $lines | Set-Content -Path $txtPath -Encoding UTF8

  $rows = New-Object 'System.Collections.Generic.List[string]'
  foreach ($r in $resultArray) {
    $color = if ($r.status -eq 'success') { '#dcfce7' } elseif ($r.status -match 'timeout|failed|exception|missing') { '#fee2e2' } else { '#fef3c7' }
    $stageHtml = [System.Net.WebUtility]::HtmlEncode([string]$r.stage)
    $messageHtml = [System.Net.WebUtility]::HtmlEncode([string]$r.message)
    $registryHtml = [System.Net.WebUtility]::HtmlEncode([string]$r.registry)
    [void]$rows.Add("<tr style='background:$color'><td>$stageHtml</td><td>$($r.status)</td><td>$registryHtml</td><td>$($r.exitCode)</td><td>$($r.durationSeconds)</td><td>$messageHtml</td></tr>")
  }
  $html = "<!doctype html><html><head><meta charset='utf-8'><title>Khatyar build report</title><style>body{font-family:Arial;margin:30px;background:#f8fafc;color:#0f172a}table{width:100%;border-collapse:collapse;background:white}th,td{padding:9px;border:1px solid #cbd5e1;text-align:left;vertical-align:top}.meta{background:white;padding:15px;border-radius:10px;margin-bottom:16px}</style></head><body><h1>Khatyar build report</h1><div class='meta'><b>Final status:</b> $FinalStatus<br><b>APK:</b> $([System.Net.WebUtility]::HtmlEncode($ApkPath))<br><b>AAB:</b> $([System.Net.WebUtility]::HtmlEncode($AabPath))<br><b>Elapsed:</b> $($report.elapsedSeconds)s</div><table><thead><tr><th>Stage</th><th>Status</th><th>Registry</th><th>Exit</th><th>Seconds</th><th>Message</th></tr></thead><tbody>$($rows.ToArray() -join "`n")</tbody></table></body></html>"
  Set-Content -Path $htmlPath -Value $html -Encoding UTF8
  Write-Host "Reports:`n  $txtPath`n  $jsonPath`n  $htmlPath" -ForegroundColor Cyan
  return $report
}

Initialize-BuildContext -Root $PSScriptRoot

Write-Host 'Khatyar stable Android release build' -ForegroundColor Cyan

function Fail-Build {
  param([string]$Stage, [string]$Message)
  Add-BuildResult -Stage $Stage -Status 'failed' -ExitCode 1 -DurationSeconds 0 -Message $Message -Critical $true
  Write-BuildReport -FinalStatus "$Stage-failed" | Out-Null
  Write-Host "Build stopped at stage: $Stage" -ForegroundColor Red
  Write-Host $Message -ForegroundColor Red
  exit 1
}

function Complete-SimpleStage {
  param([string]$Name, [string]$Message = 'Completed', [string]$Status = 'success')
  Add-BuildResult -Stage $Name -Status $Status -ExitCode 0 -DurationSeconds 0 -Message $Message -Critical $false
}

function Stop-ProjectBuildProcesses {
  param([Parameter(Mandatory=$true)][string]$ProjectRoot)

  $escapedRoot = [regex]::Escape($ProjectRoot)
  $stopped = New-Object 'System.Collections.Generic.List[string]'
  try {
    $processes = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
      $_.ProcessId -ne $PID -and
      $_.Name -match '^(node|java|javaw)\.exe$' -and
      -not [string]::IsNullOrWhiteSpace([string]$_.CommandLine) -and
      $_.CommandLine -match $escapedRoot
    })
    foreach ($process in $processes) {
      try {
        Stop-ProcessTree -ProcessId ([int]$process.ProcessId)
        [void]$stopped.Add("$($process.Name):$($process.ProcessId)")
      } catch {}
    }
  } catch {}

  if ($stopped.Count -gt 0) {
    Complete-SimpleStage 'prebuild-process-stop' ("Stopped project build processes: " + ($stopped.ToArray() -join ', ')) 'warning'
    Start-Sleep -Seconds 2
  } else {
    Complete-SimpleStage 'prebuild-process-stop' 'No project-scoped Java or Node process required termination.'
  }
}

function Remove-DirectoryWithRetry {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [int]$Attempts = 5,
    [int]$DelaySeconds = 2
  )

  if (-not (Test-Path -LiteralPath $Path)) { return $true }
  $lastError = ''
  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      [System.GC]::Collect()
      [System.GC]::WaitForPendingFinalizers()
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    } catch {
      $lastError = $_.Exception.Message
    }
    if (-not (Test-Path -LiteralPath $Path)) { return $true }
    if ($attempt -lt $Attempts) { Start-Sleep -Seconds $DelaySeconds }
  }

  if ([string]::IsNullOrWhiteSpace($lastError)) { $lastError = 'Windows kept the directory locked.' }
  Complete-SimpleStage 'android-cleanup' ("Android directory could not be removed after $Attempts attempts: $lastError. Continuing with safe incremental prebuild.") 'warning'
  return $false
}


function Test-MyketSdkCatalog {
  param([Parameter(Mandatory=$true)][string]$ProjectRoot)

  $csvPath = Join-Path $ProjectRoot 'config\myket-sdk-required-windows.csv'
  if (-not (Test-Path -LiteralPath $csvPath)) {
    Complete-SimpleStage 'myket-sdk-catalog' "SDK CSV was not found: $csvPath" 'warning'
    return
  }

  $rows = @(Import-Csv -LiteralPath $csvPath)
  $ndkVersion = [string]$env:ANDROID_NDK_VERSION
  $selected = @($rows | Where-Object {
    $_.package_path -in @('platforms;android-36', 'build-tools;36.0.0', 'platform-tools', 'cmdline-tools;20.0', 'cmake;3.22.1') -or
    (-not [string]::IsNullOrWhiteSpace($ndkVersion) -and $_.package_path -eq "ndk;$ndkVersion")
  })

  $links = ($selected | ForEach-Object { "$($_.package_path)=$($_.archive_url)" }) -join '; '
  Complete-SimpleStage 'myket-sdk-catalog' "Myket Android SDK catalog ready: $csvPath; $links"
}

# 1) Preflight
if (-not (Test-Path '.env')) {
  if (Test-Path '.env.example') { Copy-Item '.env.example' '.env' -Force }
}
if (-not (Test-Path 'package.json')) { Fail-Build 'preflight' 'package.json is missing.' }
if (-not (Test-Path 'package-lock.json')) { Fail-Build 'preflight' 'package-lock.json is missing. This build requires locked dependencies.' }

$nodePath = Get-ExecutablePath 'node.exe'
$npmPath = Get-ExecutablePath 'npm.cmd'
$javaPath = Get-ExecutablePath 'java.exe'
if (-not $nodePath) { Fail-Build 'preflight' 'Node.js is not installed or is not in PATH.' }
if (-not $npmPath) { Fail-Build 'preflight' 'npm.cmd is not installed or is not in PATH.' }
if (-not $javaPath) { Fail-Build 'preflight' 'Java is not installed or is not in PATH.' }

$nodeVersion = (& $nodePath --version).Trim()
# java.exe writes its version text to stderr by design. Calling it directly while
# $ErrorActionPreference is 'Stop' causes Windows PowerShell 5.1 to raise
# NativeCommandError even when Java exits successfully. Capture both native
# streams through System.Diagnostics.Process instead.
$javaStartInfo = New-Object System.Diagnostics.ProcessStartInfo
$javaStartInfo.FileName = $javaPath
$javaStartInfo.Arguments = '-version'
$javaStartInfo.UseShellExecute = $false
$javaStartInfo.RedirectStandardOutput = $true
$javaStartInfo.RedirectStandardError = $true
$javaStartInfo.CreateNoWindow = $true
$javaProcess = New-Object System.Diagnostics.Process
$javaProcess.StartInfo = $javaStartInfo
if (-not $javaProcess.Start()) {
  Fail-Build 'preflight' 'Unable to start java.exe for version detection.'
}
$javaStdOut = $javaProcess.StandardOutput.ReadToEnd()
$javaStdErr = $javaProcess.StandardError.ReadToEnd()
$javaProcess.WaitForExit()
$javaExitCode = $javaProcess.ExitCode
$javaProcess.Dispose()
$javaText = (($javaStdOut + [Environment]::NewLine + $javaStdErr).Trim())
if ($javaExitCode -ne 0) {
  Fail-Build 'preflight' "java.exe -version failed with exit code $javaExitCode. Output: $javaText"
}
$javaMajor = 0
if ($javaText -match 'version\s+"(?<major>\d+)') { $javaMajor = [int]$Matches.major }
elseif ($javaText -match 'openjdk\s+(?<major>\d+)') { $javaMajor = [int]$Matches.major }
if ($javaMajor -ne 17) {
  Fail-Build 'preflight' "JDK 17 is required for this Expo/React Native build. Detected Java output: $javaText"
}
Complete-SimpleStage 'preflight' "Node=$nodeVersion; Java=$javaMajor"

# 2) Cleanup. The Android directory is handled immediately before prebuild so a
# Windows EBUSY lock can fall back to a safe incremental prebuild instead of aborting.
if (-not $SkipCleanup) {
  if (Test-Path '.expo') { Remove-Item '.expo' -Recurse -Force -ErrorAction SilentlyContinue }
  if ($Fresh -and (Test-Path 'node_modules')) {
    Remove-Item 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue
  }
}

# 3) Deterministic dependency install
$install = Invoke-ManagedProcess -Stage 'npm-ci' -FilePath $npmPath -Arguments @('ci', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev') -IdleTimeoutMinutes 20 -HardTimeoutMinutes 90 -Retries 1 -RetryDelaySeconds 20 -Critical $false
if (-not $install.Success) {
  # اگر package.json تغییر کرده باشد ولی package-lock.json هنوز sync نشده باشد (مثلاً بعد از
  # افزودن دستیِ یک وابستگی جدید)، «npm ci» با خطای سازگاری شکست می‌خورد. به‌جای متوقف‌کردن
  # کل بیلد، یک بار «npm install» (که lock file را با دسترسی واقعی به رجیستری npm روی همین
  # سیستم به‌درستی بازسازی می‌کند) امتحان می‌شود؛ اگر آن هم موفق نشد، بیلد همچنان متوقف می‌شود.
  Complete-SimpleStage 'npm-ci' "npm ci failed ($($install.Message)); falling back to npm install to resync the lock file." 'warning'
  $installFallback = Invoke-ManagedProcess -Stage 'npm-install-fallback' -FilePath $npmPath -Arguments @('install', '--no-audit', '--no-fund', '--legacy-peer-deps', '--include=dev') -IdleTimeoutMinutes 20 -HardTimeoutMinutes 90 -Retries 1 -RetryDelaySeconds 20 -Critical $true
  if (-not $installFallback.Success) { Fail-Build 'dependency-install' $installFallback.Message }
}

$localExpo = Join-Path $PSScriptRoot 'node_modules\.bin\expo.cmd'
if (-not (Test-Path $localExpo)) { Fail-Build 'dependency-install' 'Local Expo CLI is missing after npm ci.' }

# 4) Exact compatibility validation. Do not run `expo install --fix` here because it mutates a release build.
$versionValidator = Join-Path $PSScriptRoot 'scripts\validate-versions.js'
if (-not (Test-Path $versionValidator)) { Fail-Build 'version-compatibility' 'scripts\validate-versions.js is missing.' }
$versionCheck = Invoke-ManagedProcess -Stage 'version-compatibility' -FilePath $nodePath -Arguments @($versionValidator) -IdleTimeoutMinutes 2 -HardTimeoutMinutes 3 -Retries 0 -Critical $true
if (-not $versionCheck.Success) { Fail-Build 'version-compatibility' $versionCheck.Message }

$babelValidator = Join-Path $PSScriptRoot 'scripts\validate-babel.js'
if (-not (Test-Path $babelValidator)) { Fail-Build 'babel-validation' 'scripts\validate-babel.js is missing.' }
$babel = Invoke-ManagedProcess -Stage 'babel-validation' -FilePath $nodePath -Arguments @($babelValidator) -IdleTimeoutMinutes 3 -HardTimeoutMinutes 5 -Retries 0 -Critical $true
if (-not $babel.Success) { Fail-Build 'babel-validation' $babel.Message }

$assetValidator = Join-Path $PSScriptRoot 'scripts\validate-static-assets.js'
if (-not (Test-Path $assetValidator)) { Fail-Build 'asset-validation' 'scripts\validate-static-assets.js is missing.' }
$assetCheck = Invoke-ManagedProcess -Stage 'asset-validation' -FilePath $nodePath -Arguments @($assetValidator) -IdleTimeoutMinutes 3 -HardTimeoutMinutes 5 -Retries 0 -Critical $true
if (-not $assetCheck.Success) { Fail-Build 'asset-validation' $assetCheck.Message }

# 5) Optional doctor, informational only
if (-not $SkipDoctor) {
  $doctor = Join-Path $PSScriptRoot 'node_modules\.bin\expo-doctor.cmd'
  if (Test-Path $doctor) {
    [void](Invoke-ManagedProcess -Stage 'expo-doctor' -FilePath $doctor -Arguments @() -IdleTimeoutMinutes 8 -HardTimeoutMinutes 20 -Retries 0 -Critical $false)
  }
}

# 6) Native generation with Windows-lock recovery.
$androidDir = Join-Path $PSScriptRoot 'android'
# Do not invoke an existing Gradle wrapper here: doing so may bootstrap/download
# Gradle before the local-cache/Myket distribution source is configured.
Stop-ProjectBuildProcesses -ProjectRoot $PSScriptRoot

# اگر از بیلد قبلی، gradlew.bat باقی مانده باشد، یعنی نسخهٔ Gradle قبلاً به‌صورت محلی
# دانلود/کش شده است؛ در این حالت (و فقط در این حالت) امن است که با «gradlew --stop»
# از خودِ Gradle بخواهیم daemon های در حال اجرا را تمیز خاموش کند. این کار قفل فایل‌های
# پوشهٔ android\app\build (مثل فایل‌های صوتی packaged_res) را که باعث خطای EBUSY هنگام
# پاک‌سازی می‌شود، برطرف می‌کند. برخلاف اجرای مستقیم gradlew برای build، دستور --stop به
# دانلود دیستریبیوشن جدید نیاز ندارد (daemon از قبل با نسخهٔ محلیِ کش‌شده اجرا شده است)،
# پس این تغییر هیچ ریسک شبکه/آفلاین‌بودنی که نگرانی اصلی طراحی قبلی بود اضافه نمی‌کند.
$existingGradlew = Join-Path $androidDir 'gradlew.bat'
if (Test-Path $existingGradlew) {
  try {
    & $existingGradlew '--stop' *> $null
    Start-Sleep -Seconds 2
    Complete-SimpleStage 'gradle-daemon-stop' 'Stopped lingering Gradle daemons from a previous build (gradlew --stop).'
  } catch {
    Complete-SimpleStage 'gradle-daemon-stop' "Could not run gradlew --stop (continuing anyway): $($_.Exception.Message)" 'warning'
  }
}

$androidRemoved = $false
$incrementalReason = ''
if ($SkipCleanup) {
  if (Test-Path $androidDir) {
    $incrementalReason = 'Cleanup was explicitly skipped.'
    Complete-SimpleStage 'android-cleanup' 'Cleanup skipped; using incremental native synchronization.' 'warning'
  } else {
    $androidRemoved = $true
  }
} else {
  $androidRemoved = Remove-DirectoryWithRetry -Path $androidDir -Attempts 5 -DelaySeconds 2
  if (-not $androidRemoved) { $incrementalReason = 'Windows kept the Android directory locked.' }
}

if ($androidRemoved) {
  Complete-SimpleStage 'android-cleanup' 'Android directory removed; running fresh native generation.'
} else {
  Write-Host "$incrementalReason Running Expo prebuild in-place without --clean." -ForegroundColor Yellow
  Write-Host 'A CMD/PowerShell window located inside android, Explorer, Gradle, or antivirus can hold this lock.' -ForegroundColor Yellow
}

# Do not pass --clean here. If the directory was removed, Expo creates it from scratch.
# If Windows kept it locked, Expo safely synchronizes the existing native project in place.
$prebuild = Invoke-ManagedProcess -Stage 'expo-prebuild' -FilePath $localExpo -Arguments @('prebuild', '--platform', 'android', '--no-install') -IdleTimeoutMinutes 15 -HardTimeoutMinutes 50 -Retries 1 -Critical $true -Environment @{ CI='1'; EXPO_NO_DOCTOR='1'; NODE_ENV='production'; NODE_OPTIONS='--dns-result-order=ipv4first' }
if (-not $prebuild.Success) { Fail-Build 'expo-prebuild' $prebuild.Message }

# Expo SDK 57 uses package-local Maven repositories containing prebuilt AAR files.
# Validate them before invoking Gradle so repository-mode regressions are reported clearly.
$expoMavenValidator = Join-Path $PSScriptRoot 'scripts\validate-expo-local-maven.js'
$expoMavenCheck = Invoke-ManagedProcess -Stage 'expo-local-maven-validation' -FilePath $nodePath -Arguments @($expoMavenValidator) -IdleTimeoutMinutes 3 -HardTimeoutMinutes 5 -Retries 0 -Critical $true
if (-not $expoMavenCheck.Success) { Fail-Build 'expo-local-maven-validation' $expoMavenCheck.Message }

$gradlew = Join-Path $PSScriptRoot 'android\gradlew.bat'
if (-not (Test-Path $gradlew)) { Fail-Build 'gradle' 'Gradle wrapper was not generated.' }

# Force the AGP 8.5-compatible Gradle 8.7 distribution. Prefer the local ZIP at
# F:\gradle-cache\gradle-8.7-bin.zip; otherwise download it from the Myket mirror.
$wrapperProperties = Join-Path $androidDir 'gradle\wrapper\gradle-wrapper.properties'
$wrapperConfigScript = Join-Path $PSScriptRoot 'scripts\configure-gradle-wrapper.js'
if (-not (Test-Path -LiteralPath $wrapperConfigScript)) {
  Fail-Build 'gradle-wrapper-source' "Wrapper configuration script is missing: $wrapperConfigScript"
}
$wrapperConfig = Invoke-ManagedProcess -Stage 'gradle-wrapper-source' -FilePath $nodePath -Arguments @($wrapperConfigScript, $wrapperProperties, 'F:\gradle-cache') -IdleTimeoutMinutes 2 -HardTimeoutMinutes 3 -Retries 0 -Critical $true
if (-not $wrapperConfig.Success) { Fail-Build 'gradle-wrapper-source' $wrapperConfig.Message }

Test-MyketSdkCatalog -ProjectRoot $PSScriptRoot

$myketInitScript = Join-Path $PSScriptRoot 'myket.init.gradle'
if (-not (Test-Path -LiteralPath $myketInitScript)) {
  Fail-Build 'myket-repository' "Myket Gradle init script is missing: $myketInitScript"
}
Complete-SimpleStage 'myket-repository' "Myket Maven will be used first for the main build and all included builds: $myketInitScript"

# 7) Detect global Gradle init scripts. Previous Myket/repository scripts in USERPROFILE\.gradle
# are automatically bypassed with an isolated Gradle home while keeping the project unchanged.
$configuredGradleHome = $env:GRADLE_USER_HOME
if ([string]::IsNullOrWhiteSpace($configuredGradleHome)) {
  $configuredGradleHome = Join-Path $env:USERPROFILE '.gradle'
}
$globalInitFiles = @()
foreach ($candidate in @(
  (Join-Path $configuredGradleHome 'init.gradle'),
  (Join-Path $configuredGradleHome 'init.gradle.kts')
)) {
  if (Test-Path $candidate) { $globalInitFiles += $candidate }
}
$initDir = Join-Path $configuredGradleHome 'init.d'
if (Test-Path $initDir) {
  $globalInitFiles += @(Get-ChildItem $initDir -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
}

$gradleEnv = @{
  GRADLE_OPTS = '-Dorg.gradle.internal.http.connectionTimeout=600000 -Dorg.gradle.internal.http.socketTimeout=600000 -Djava.net.preferIPv4Stack=true -Dfile.encoding=UTF-8'
  NODE_OPTIONS = '--dns-result-order=ipv4first'
  JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
}

# Windows Ninja/CMake still enforces the legacy 260-character path limit in some
# native React Native builds. Always use a short Gradle home at the drive root.
$projectDrive = [System.IO.Path]::GetPathRoot($PSScriptRoot)
if ([string]::IsNullOrWhiteSpace($projectDrive)) { $projectDrive = 'C:\\' }
$shortGradleHome = Join-Path $projectDrive 'g'
New-Item -ItemType Directory -Force -Path $shortGradleHome | Out-Null
$gradleEnv['GRADLE_USER_HOME'] = $shortGradleHome
Complete-SimpleStage 'gradle-short-path' "Using short GRADLE_USER_HOME=$shortGradleHome to prevent Ninja/CMake path-length failures." 'warning'

# Remove stale native/CMake state that may contain absolute paths from an older
# or longer Gradle cache location. This is safe after Expo prebuild.
foreach ($nativeCache in @(
  (Join-Path $androidDir '.cxx'),
  (Join-Path $androidDir 'app\\.cxx'),
  (Join-Path $PSScriptRoot 'node_modules\\react-native-screens\\android\\.cxx')
)) {
  if (Test-Path $nativeCache) { Remove-DirectoryWithRetry -Path $nativeCache -Attempts 5 -DelaySeconds 1 | Out-Null }
}

# پاک‌سازی عمومیِ کش/خروجی CMake تمام ماژول‌های بومی داخل node_modules (نه فقط چند مورد ثابت).
# علت: روی ویندوز، فایل‌های .so ساخته‌شده توسط یک بیلد قبلی گاهی توسط آنتی‌ویروس یا یک
# پردازش باقی‌ماندهٔ دیگر قفل می‌مانند؛ Gradle هنگام تلاش برای پاک‌سازیِ افزایشیِ (incremental)
# پوشهٔ build\intermediates\cxx در بیلد بعدی با خطای «Failed to delete some children» و
# AccessDeniedException شکست می‌خورد (دقیقاً نمونه‌ای که برای expo-modules-core رخ داد).
# با حذف کامل و از قبلِ این پوشه‌ها (با retry)، Gradle مجبور به یک پیکربندی/بیلد کاملاً تازه
# می‌شود و دیگر تلاشی برای «حذف افزایشی» یک پوشهٔ قفل‌شده نمی‌کند.
$nativeModuleDirs = Get-ChildItem (Join-Path $PSScriptRoot 'node_modules') -Directory -ErrorAction SilentlyContinue
foreach ($mod in $nativeModuleDirs) {
  $cxxConfig = Join-Path $mod.FullName 'android\.cxx'
  $cxxOutput = Join-Path $mod.FullName 'android\build\intermediates\cxx'
  $hasNative = (Test-Path $cxxConfig) -or (Test-Path $cxxOutput)
  if (-not $hasNative) { continue }
  foreach ($sub in @('android\.cxx', 'android\build\intermediates\cxx', 'android\build')) {
    $p = Join-Path $mod.FullName $sub
    if (Test-Path $p) { Remove-DirectoryWithRetry -Path $p -Attempts 5 -DelaySeconds 1 | Out-Null }
  }
}

# Force-remove Gradle's own build/output cache for the app module (android\app\build).
# This directory holds Gradle's up-to-date snapshot for the `bundleReleaseJsAndAssets` task
# and the previously embedded index.android.bundle. When the top-level `android` folder was
# NOT fully removed above (Windows file lock -> incremental prebuild fallback), Gradle can
# otherwise decide the JS-bundling task is already up to date and skip re-bundling, silently
# shipping an APK with an OLD JavaScript bundle even though every source .js file changed.
# Removing this directory unconditionally guarantees every release build re-bundles fresh JS,
# regardless of which cleanup path was taken above.
$appBuildDir = Join-Path $androidDir 'app\build'
if (Test-Path $appBuildDir) {
  Write-Host 'Removing android\app\build to force a fresh JavaScript bundle (prevents stale-bundle releases).' -ForegroundColor Yellow
  Remove-DirectoryWithRetry -Path $appBuildDir -Attempts 5 -DelaySeconds 2 | Out-Null
}

$gradleArgs = @('--init-script', $myketInitScript, '--no-daemon', '--stacktrace', '--console=plain', '--warning-mode=all')

# Native generation has already synchronized the Android project. A separate `gradlew clean`
# is redundant and can introduce another lock/configuration failure, so build directly.
$apkResult = Invoke-ManagedProcess -Stage 'gradle-assemble-release' -FilePath $gradlew -Arguments ($gradleArgs + @('assembleRelease')) -WorkingDirectory $androidDir -IdleTimeoutMinutes 60 -HardTimeoutMinutes 240 -Retries 1 -RetryDelaySeconds 15 -Critical $true -Environment $gradleEnv
if (-not $apkResult.Success) { Fail-Build 'gradle-assemble-release' $apkResult.Message }

# 8) Collect universal release APK
$outputRoot = Join-Path $androidDir 'app\build\outputs\apk\release'
$apks = @(Get-ChildItem $outputRoot -Filter '*.apk' -File -ErrorAction SilentlyContinue | Sort-Object FullName)
if ($apks.Count -eq 0) { Fail-Build 'collect-artifacts' "Build succeeded but no APK was found in $outputRoot" }
$apkList = ($apks | ForEach-Object { $_.FullName }) -join '; '
Complete-SimpleStage 'collect-artifacts' "APKs=$apkList"

Write-BuildReport -FinalStatus 'success' -ApkPath $apks[0].FullName -AabPath '' | Out-Null
Write-Host ''
Write-Host '================ BUILD COMPLETE ================' -ForegroundColor Green
foreach ($apk in $apks) { Write-Host "APK: $($apk.FullName)" -ForegroundColor Green }
exit 0
