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
