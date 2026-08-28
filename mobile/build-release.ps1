#requires -Version 5.1
[CmdletBinding()]
param(
  [switch]$Fresh,
  [switch]$SkipCleanup,
  [switch]$SkipDoctor,
  [int]$GradleIdleTimeoutMinutes = 10,
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ScriptRoot = $PSScriptRoot
Set-Location $ScriptRoot

$Remote = 'origin'
$Branch = 'main'
$BuildStart = Get-Date
$CurrentStage = 'Initializing'
$TotalStages = 7
$StashCreated = $false
$StashMessage = 'khatyar-build-autostash-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
$BackupBranch = $null
$FinalExitCode = 1
$GitRepoRoot = $null

function Format-Duration([TimeSpan]$d) {
  if ($d.TotalHours -ge 1) { return $d.ToString('hh\:mm\:ss') }
  return $d.ToString('mm\:ss')
}

function Write-Stage([string]$Name,[int]$Index) {
  $script:CurrentStage = $Name
  $pct = [math]::Min(100,[math]::Round(($Index / $TotalStages) * 100))
  Write-Host ''
  Write-Host ('[{0,3}%] {1}' -f $pct,$Name) -ForegroundColor Cyan
  Write-Host ('    Elapsed: ' + (Format-Duration ((Get-Date)-$BuildStart))) -ForegroundColor DarkGray
}

function Write-BuildProgress([int]$Percent,[string]$Status,[int]$EtaSeconds=0) {
  $p = [math]::Min(99,[math]::Max(0,$Percent))
  $width = 40
  $filled = [int][math]::Floor($width*$p/100)
  $bar = ('#'*$filled)+('-'*($width-$filled))
  $eta = if ($EtaSeconds -gt 0) { Format-Duration ([TimeSpan]::FromSeconds($EtaSeconds)) } else {'--:--'}
  Write-Host ("`r[{0,3}%] [{1}] {2} | Elapsed {3} | ETA {4}   " -f $p,$bar,$Status,(Format-Duration ((Get-Date)-$BuildStart)),$eta) -NoNewline
}

function Invoke-Git([string[]]$Arguments) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName='git.exe'; $psi.WorkingDirectory=$ScriptRoot
  $psi.UseShellExecute=$false; $psi.CreateNoWindow=$true
  $psi.RedirectStandardOutput=$true; $psi.RedirectStandardError=$true
  foreach($a in $Arguments) {
    $e=$a -replace '(\\*)"','$1$1\\"'; $e=$e -replace '(\\+)$','$1$1'
    $psi.Arguments += ' "'+$e+'"'
  }
  $p=New-Object System.Diagnostics.Process; $p.StartInfo=$psi
  try {
    [void]$p.Start(); $o=$p.StandardOutput.ReadToEnd(); $e=$p.StandardError.ReadToEnd(); $p.WaitForExit()
    [pscustomobject]@{Output=@($o -split "`r?`n"|Where-Object{$_ -ne ''});Error=@($e -split "`r?`n"|Where-Object{$_ -ne ''});ExitCode=$p.ExitCode}
  } finally { $p.Dispose() }
}

function Test-CommandAvailable([string]$Name) { return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue) }
function Get-RefSha([string]$Ref) { $r=Invoke-Git @('rev-parse',$Ref); if($r.ExitCode -ne 0){return $null}; return ((@($r.Output)-join '').Trim()) }
function Get-GitStatusClean { $r=Invoke-Git @('status','--porcelain'); if($r.ExitCode -ne 0){throw (($r.Output+$r.Error)-join ' ')}; return @($r.Output).Count -eq 0 }

function Restore-WorkSafely {
  if($script:StashCreated) {
    Write-Host ''; Write-Host 'Restoring local uncommitted changes...' -ForegroundColor Yellow
    $r=Invoke-Git @('stash','pop')
    if($r.ExitCode -ne 0){ Write-Host 'WARNING: stash was preserved. Run git stash list to recover it.' -ForegroundColor Red; return $false }
    $script:StashCreated=$false; Write-Host 'Local changes restored successfully.' -ForegroundColor Green
  }
  return $true
}

function Invoke-Native([string]$FilePath,[string[]]$Arguments,[string]$WorkingDirectory=$ScriptRoot) {
  $psi=New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName=$FilePath; $psi.WorkingDirectory=$WorkingDirectory
  $psi.UseShellExecute=$false; $psi.CreateNoWindow=$false
  $psi.RedirectStandardOutput=$true; $psi.RedirectStandardError=$true
  foreach($a in $Arguments){$e=$a -replace '(\\*)"','$1$1\\"';$e=$e -replace '(\\+)$','$1$1';$psi.Arguments+=' "'+$e+'"'}
  $p=New-Object System.Diagnostics.Process; $p.StartInfo=$psi
  $q1=New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'; $q2=New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
  $h1=[System.Diagnostics.DataReceivedEventHandler]{param($s,$e)if($null-ne $e.Data){$q1.Enqueue($e.Data)}}
  $h2=[System.Diagnostics.DataReceivedEventHandler]{param($s,$e)if($null-ne $e.Data){$q2.Enqueue($e.Data)}}
  $p.add_OutputDataReceived($h1);$p.add_ErrorDataReceived($h2)
  try{[void]$p.Start();$p.BeginOutputReadLine();$p.BeginErrorReadLine();while(-not $p.HasExited){$x=$null;while($q1.TryDequeue([ref]$x)){if($x){Write-Host $x}};while($q2.TryDequeue([ref]$x)){if($x){Write-Host $x -ForegroundColor DarkYellow}};Start-Sleep -Milliseconds 100};Start-Sleep -Milliseconds 300;$x=$null;while($q1.TryDequeue([ref]$x)){if($x){Write-Host $x}};while($q2.TryDequeue([ref]$x)){if($x){Write-Host $x -ForegroundColor DarkYellow}};return $p.ExitCode}finally{try{$p.CancelOutputRead()}catch{};try{$p.CancelErrorRead()}catch{};$p.Dispose()}
}

function Invoke-GradleRelease([string]$GradlewPath,[string]$WorkingDirectory,[int]$IdleTimeoutMinutes=10) {
  $psi=New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName=$GradlewPath;$psi.WorkingDirectory=$WorkingDirectory;$psi.UseShellExecute=$false;$psi.CreateNoWindow=$false
  $psi.RedirectStandardOutput=$true;$psi.RedirectStandardError=$true
  $psi.Arguments='assembleRelease --console=plain --stacktrace --no-daemon'
  $p=New-Object System.Diagnostics.Process;$p.StartInfo=$psi
  $out=New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]';$err=New-Object 'System.Collections.Concurrent.ConcurrentQueue[string]'
  $oh=[System.Diagnostics.DataReceivedEventHandler]{param($s,$e)if($null-ne $e.Data){$out.Enqueue($e.Data)}}
  $eh=[System.Diagnostics.DataReceivedEventHandler]{param($s,$e)if($null-ne $e.Data){$err.Enqueue($e.Data)}}
  $p.add_OutputDataReceived($oh);$p.add_ErrorDataReceived($eh)
  $last=Get-Date;$task='Gradle is initializing...';$start=Get-Date;$expected=240;$stalled=$false;$code=1
  try {
    [void]$p.Start();$p.BeginOutputReadLine();$p.BeginErrorReadLine()
    while(-not $p.HasExited){
      $line=$null
      while($out.TryDequeue([ref]$line)){if($line){$last=Get-Date;$t=$line.Trim();if($t -match '^> Task\s+(.+)$'){$task=$Matches[1]};if($t){Write-Host ("`n    Gradle: "+$t) -ForegroundColor DarkGray}}
      while($err.TryDequeue([ref]$line)){if($line){$last=Get-Date;$t=$line.Trim();if($t){Write-Host ("`n    Gradle: "+$t) -ForegroundColor DarkYellow}}
      $sec=((Get-Date)-$start).TotalSeconds;if($sec -gt $expected){$expected=[math]::Max($expected,[int]($sec*1.2))}
      Write-BuildProgress [int]([math]::Min(99,[math]::Max(67,67+($sec/$expected*32)))) $task ([int][math]::Max(0,$expected-$sec))
      if(((Get-Date)-$last).TotalSeconds -ge ($IdleTimeoutMinutes*60)){$stalled=$true;Write-Host '';Write-Host ('Gradle produced no output for '+[int](((Get-Date)-$last).TotalMinutes)+' minute(s).') -ForegroundColor Red;Write-Host ('Last activity: '+$task) -ForegroundColor Yellow;try{$p.Kill()}catch{};break}
      Start-Sleep -Milliseconds 250
    }
    Start-Sleep -Milliseconds 500;$line=$null;while($out.TryDequeue([ref]$line)){if($line){Write-Host ("`n    Gradle: "+$line.Trim()) -ForegroundColor DarkGray}};while($err.TryDequeue([ref]$line)){if($line){Write-Host ("`n    Gradle: "+$line.Trim()) -ForegroundColor DarkYellow}}
    if($stalled){$code=124}else{$code=$p.ExitCode}
  }catch{Write-Host '';Write-Host ('Gradle process error: '+$_.Exception.Message) -ForegroundColor Red;try{if(-not $p.HasExited){$p.Kill()}}catch{};$code=1}
  finally{try{$p.CancelOutputRead()}catch{};try{$p.CancelErrorRead()}catch{};try{$p.remove_OutputDataReceived($oh)}catch{};try{$p.remove_ErrorDataReceived($eh)}catch{};$p.Dispose()}
  return $code
}

function Wait-BeforeExit {
  if($NoPause){return}
  Write-Host ''
  Write-Host '============================================================' -ForegroundColor DarkGray
  Write-Host 'BUILD SCRIPT FINISHED - WINDOW WILL REMAIN OPEN' -ForegroundColor Yellow
  Write-Host 'Press any key or ENTER to close this window.' -ForegroundColor Yellow
  Write-Host '============================================================' -ForegroundColor DarkGray
  try {
    if($Host.Name -eq 'ConsoleHost' -and -not [Console]::IsInputRedirected){[void][Console]::ReadKey($true)}
    else {Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','pause' -Wait -NoNewWindow}
  } catch { try { Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','pause' -Wait -NoNewWindow } catch { Start-Sleep -Seconds 30 } }
}

try {
  if(-not(Test-CommandAvailable 'git.exe')){throw 'Git is not installed or is not available in PATH.'}
  $repo=Invoke-Git @('rev-parse','--show-toplevel')
  if($repo.ExitCode -ne 0 -or @($repo.Output).Count -eq 0){$c=$ScriptRoot;while($c){if(Test-Path (Join-Path $c '.git')){$GitRepoRoot=$c;break};$p=Split-Path -Parent $c;if([string]::IsNullOrWhiteSpace($p)-or $p-eq $c){break};$c=$p};if($GitRepoRoot){$repo=Invoke-Git @('-C',$GitRepoRoot,'rev-parse','--show-toplevel')}}
  if($repo.ExitCode -ne 0 -or @($repo.Output).Count -eq 0){throw ('This build directory is not inside a Git repository. Build path: '+$ScriptRoot)}
  $GitRepoRoot=((@($repo.Output)-join '').Trim())

  Write-Host '';Write-Host '============================================================' -ForegroundColor Cyan;Write-Host '       KHATYAR - ANDROID RELEASE BUILD' -ForegroundColor Cyan;Write-Host '============================================================' -ForegroundColor Cyan
  Write-Host ('Git repository: '+$GitRepoRoot) -ForegroundColor DarkGray;Write-Host ('Build directory: '+$ScriptRoot) -ForegroundColor DarkGray;Write-Host ''
  Write-Host 'Do you want to download the latest files from GitHub before building? (Y/N)' -ForegroundColor Yellow
  $answer=(Read-Host 'Download from GitHub').Trim().ToUpperInvariant();if($answer -notin @('Y','N')){throw 'Please answer Y or N.'}

  Write-Stage 'Fetching GitHub main branch' 1;$f=Invoke-Git @('fetch',$Remote,$Branch);if($f.ExitCode-ne 0){throw ('GitHub fetch failed: '+(($f.Output+$f.Error)-join ' '))}
  $local=Get-RefSha 'HEAD';$remote=Get-RefSha ($Remote+'/'+$Branch);if([string]::IsNullOrWhiteSpace($local)-or [string]::IsNullOrWhiteSpace($remote)){throw 'Unable to determine local or GitHub commit SHA.'}

  Write-Stage 'Preparing local workspace' 2
  if($answer-eq 'Y'){
    if(-not(Get-GitStatusClean)){$s=Invoke-Git @('stash','push','-u','-m',$StashMessage);if($s.ExitCode-ne 0){throw ('Unable to safely stash local changes: '+(($s.Output+$s.Error)-join ' '))};$script:StashCreated=$true;Write-Host 'Local changes safely stashed.' -ForegroundColor Green}
    $local=Get-RefSha 'HEAD';$remote=Get-RefSha ($Remote+'/'+$Branch)
    if($local-ne $remote){$BackupBranch='build-backup-'+(Get-Date -Format 'yyyyMMdd-HHmmss');$b=Invoke-Git @('branch',$BackupBranch,'HEAD');if($b.ExitCode-ne 0){throw 'Unable to create backup branch.'};Write-Host ('Local commits preserved on backup branch: '+$BackupBranch) -ForegroundColor Yellow;$r=Invoke-Git @('reset','--hard',($Remote+'/'+$Branch));if($r.ExitCode-ne 0){throw 'Unable to synchronize local files.'}}
    $local=Get-RefSha 'HEAD';$remote=Get-RefSha ($Remote+'/'+$Branch);if($local-ne $remote){throw ('Synchronization verification failed. Local='+$local+' GitHub='+$remote)};if(-not(Get-GitStatusClean)){throw 'Working tree is not clean after synchronization.'};Write-Host ('GitHub synchronization verified. Source commit: '+$local) -ForegroundColor Green
  }else{if($local-ne $remote){throw ('Local version is not equal to GitHub. Local='+$local+' GitHub='+$remote+'. Choose Y to download the latest files.')};if(-not(Get-GitStatusClean)){throw 'Local uncommitted changes are present. Choose Y to safely stash them.'};Write-Host ('Local version matches GitHub. Source commit: '+$local) -ForegroundColor Green}

  Write-Stage 'Checking Node.js and npm environment' 3;if(-not(Test-CommandAvailable 'node.exe')){throw 'Node.js was not found in PATH.'};if(-not(Test-CommandAvailable 'npm.cmd')){throw 'npm was not found in PATH.'};if(-not(Test-Path (Join-Path $ScriptRoot 'package.json'))){throw 'mobile/package.json was not found.'};if(-not(Test-Path (Join-Path $ScriptRoot 'package-lock.json'))){throw 'mobile/package-lock.json was not found.'}
  if(-not(Test-Path (Join-Path $ScriptRoot 'node_modules\@react-native\gradle-plugin'))){Write-Host 'React Native Gradle plugin is missing. Installing locked npm dependencies...' -ForegroundColor Yellow;$n=Invoke-Native 'npm.cmd' @('ci','--no-audit','--no-fund');if($n-ne 0){throw ('npm ci failed with exit code '+$n)}}
  if(-not(Test-Path (Join-Path $ScriptRoot 'node_modules\@react-native\gradle-plugin'))){throw 'React Native Gradle plugin is still missing after npm ci.'}

  Write-Stage 'Validating and preparing Android Gradle project' 4;$android=Join-Path $ScriptRoot 'android';$gradlew=Join-Path $android 'gradlew.bat';$settings=Join-Path $android 'settings.gradle';if(-not(Test-Path $gradlew)){throw 'android/gradlew.bat was not found.'};if(-not(Test-Path $settings)){throw 'android/settings.gradle was not found.'}
  $st=Get-Content $settings -Raw -Encoding UTF8;$inc="includeBuild('../node_modules/@react-native/gradle-plugin')";if($st -match 'com\.facebook\.react\.settings' -and $st -notmatch [regex]::Escape($inc)){$st=$inc+"`r`n"+$st;[IO.File]::WriteAllText($settings,$st,(New-Object Text.UTF8Encoding($false)));Write-Host 'React Native Gradle plugin includeBuild repaired.' -ForegroundColor Yellow}

  Write-Stage 'Checking Java and Gradle toolchain' 5;if(-not(Test-CommandAvailable 'java.exe')){throw 'Java was not found in PATH.'};$j=Invoke-Native 'java.exe' @('-version');if($j-ne 0){throw 'Java could not be executed.'}
  Write-Stage 'Starting Gradle assembleRelease' 6;$g=Invoke-GradleRelease $gradlew $android $GradleIdleTimeoutMinutes;if($g-ne 0){throw ('Android release build failed with exit code '+$g+'.')}
  Write-Stage 'Finalizing release build' 7;$apk=Get-ChildItem (Join-Path $android 'app\build\outputs\apk\release') -Filter '*.apk' -File -ErrorAction SilentlyContinue;if($apk){Write-Host '';Write-Host 'Generated APK:' -ForegroundColor Green;foreach($a in $apk){Write-Host ('  '+$a.FullName) -ForegroundColor Green}}
  $script:FinalExitCode=0;Write-Host '';Write-Host 'ANDROID RELEASE BUILD COMPLETED SUCCESSFULLY.' -ForegroundColor Green
}catch{
  $script:FinalExitCode=1;Write-Host '';Write-Host '============================================================' -ForegroundColor Red;Write-Host 'BUILD FAILED' -ForegroundColor Red;Write-Host '============================================================' -ForegroundColor Red;Write-Host ('Stage: '+$CurrentStage) -ForegroundColor Yellow;Write-Host ('Error: '+$_.Exception.Message) -ForegroundColor Red;Write-Host ('Line: '+$_.InvocationInfo.ScriptLineNumber) -ForegroundColor DarkRed
}finally{
  if(-not(Restore-WorkSafely)){$script:FinalExitCode=1}
  Write-Host '';Write-Host '============================================================' -ForegroundColor DarkGray;Write-Host (' Total elapsed time : '+(Format-Duration ((Get-Date)-$BuildStart))) -ForegroundColor DarkGray;Write-Host (' Final stage        : '+$CurrentStage) -ForegroundColor DarkGray;Write-Host (' Exit code          : '+$FinalExitCode) -ForegroundColor DarkGray;if($BackupBranch){Write-Host (' Backup branch      : '+$BackupBranch) -ForegroundColor DarkGray};Write-Host '============================================================' -ForegroundColor DarkGray
  Wait-BeforeExit
}

# Deliberately do NOT call exit here. An explicit exit can close a PowerShell
# console when the .ps1 file was launched through a shortcut, Explorer, or a
# wrapper. The script reports its result and leaves the host alive until the
# user explicitly dismisses the pause above.
return