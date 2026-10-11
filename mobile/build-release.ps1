#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Fresh,
    [switch]$SkipDoctor,
    [switch]$StrictDoctor,
    [switch]$ForcePrebuild,
    [ValidateSet('APK','AAB')][string]$ArtifactType = 'APK',
    [int]$GradleTimeoutMinutes = 120,
    [int]$GradleIdleTimeoutMinutes = 15,
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Root = [IO.Path]::GetFullPath($PSScriptRoot)
Set-Location -LiteralPath $Root
$Start = Get-Date
$FinalStage = 'Starting'
$ExitCode = 1
$InitScript = Join-Path $Root 'gradle-mirror.init.gradle'
$WorkspaceDriveRoot = 'F:\taxi-system'
$PersistentGradleHome = Join-Path $WorkspaceDriveRoot '.gradle-cache'
$BuildTempRoot = Join-Path $WorkspaceDriveRoot '.build-temp'
$NpmCacheRoot = Join-Path $WorkspaceDriveRoot '.npm-cache'
$AndroidSdkRoot = Join-Path $WorkspaceDriveRoot 'android-sdk'
$AndroidUserHome = Join-Path $WorkspaceDriveRoot '.android'
[void][IO.Directory]::CreateDirectory($BuildTempRoot)
[void][IO.Directory]::CreateDirectory($NpmCacheRoot)
[void][IO.Directory]::CreateDirectory($AndroidUserHome)
$env:TEMP = $BuildTempRoot
$env:TMP = $BuildTempRoot
$env:npm_config_cache = $NpmCacheRoot
$PrebuildMarker = Join-Path $Root 'android\.khatyar-prebuild.json'

function Stage([int]$Percent,[string]$Name) {
    $script:FinalStage = $Name
    Write-Host "`n[$($Percent.ToString('000'))%] $Name" -ForegroundColor Yellow
    Write-Host ('    Elapsed: ' + ((Get-Date)-$Start).ToString('hh\:mm\:ss'))
}
function Fail([string]$Message) { throw $Message }
function Invoke-Checked([string]$File,[string[]]$Arguments,[string]$Cwd=$Root) {
    Push-Location -LiteralPath $Cwd
    try {
        Write-Host ('> ' + $File + ' ' + ($Arguments -join ' ')) -ForegroundColor DarkGray
        & $File @Arguments
        if ($LASTEXITCODE -ne 0) { throw "$File exited with code $LASTEXITCODE." }
    } finally { Pop-Location }
}
function Get-FileHashSafe([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}
function Get-NativeConfigHash() {
    $files = @(
        (Join-Path $Root 'app.config.js'),
        (Join-Path $Root 'plugins\withKhatyarRadio.js'),
        (Join-Path $Root 'plugins\withPersistentBackground.js'),
        (Join-Path $Root 'plugins\withAndroidMavenMirrors.js'),
        (Join-Path $Root 'plugins\withWifiRebornSdkCompat.js')
    )
    $parts = foreach ($file in $files) { Get-FileHashSafe $file }
    return (($parts -join ':') | ForEach-Object { $_ })
}
function Test-ExpoAutolinkingPackageClean() {
    $settingsPath = Join-Path $Root 'node_modules\expo-modules-autolinking\android\expo-gradle-plugin\settings.gradle.kts'
    $buildPath = Join-Path $Root 'node_modules\expo-modules-autolinking\android\expo-gradle-plugin\build.gradle.kts'
    if (-not (Test-Path -LiteralPath $settingsPath)) { return $true }
    $settings = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8
    $build = if (Test-Path -LiteralPath $buildPath) { Get-Content -LiteralPath $buildPath -Raw -Encoding UTF8 } else { '' }
    return ($settings -notmatch 'KHATYAR_ANDROID_MAVEN_MIRRORS' -and
            $build -notmatch 'KHATYAR_ANDROID_MAVEN_MIRRORS' -and
            $settings -notmatch 'RunflareGradlePlugins' -and
            $build -notmatch 'RunflareGradlePlugins')
}
function Test-PrebuildCurrent([string]$PackageHash,[string]$NativeConfigHash) {
    if ($ForcePrebuild -or -not (Test-Path -LiteralPath $PrebuildMarker)) { return $false }
    try {
        $m = Get-Content -LiteralPath $PrebuildMarker -Raw | ConvertFrom-Json
        $android = Join-Path $Root 'android'
        return ([string]$m.packageHash -eq $PackageHash -and
                [string]$m.nativeConfigHash -eq $NativeConfigHash -and
                [string]$m.initHash -eq (Get-FileHashSafe $InitScript) -and
                [string]$m.androidMirrorPluginHash -eq (Get-FileHashSafe (Join-Path $Root 'plugins\withAndroidMavenMirrors.js')) -and
                (Test-Path -LiteralPath (Join-Path $android 'gradlew.bat')) -and
                (Test-Path -LiteralPath (Join-Path $android 'app\build.gradle')) -and
                (Test-Path -LiteralPath (Join-Path $android 'settings.gradle')))
    } catch { return $false }
}
function Save-PrebuildMarker([string]$PackageHash,[string]$NativeConfigHash) {
    $android = Join-Path $Root 'android'
    $obj = [ordered]@{
        packageHash = $PackageHash
        nativeConfigHash = $NativeConfigHash
        lockHash = Get-FileHashSafe (Join-Path $Root 'package-lock.json')
        initHash = Get-FileHashSafe $InitScript
        androidMirrorPluginHash = Get-FileHashSafe (Join-Path $Root 'plugins\withAndroidMavenMirrors.js')
        created = (Get-Date).ToString('o')
    }
    $obj | ConvertTo-Json | Set-Content -LiteralPath $PrebuildMarker -Encoding UTF8
}
function Stop-AndroidBuildProcesses([string]$Android) {
    $Android = [IO.Path]::GetFullPath($Android)
    $gradlew = Join-Path $Android 'gradlew.bat'
    if (Test-Path -LiteralPath $gradlew) {
        try { Invoke-Checked $gradlew @('--stop') $Android } catch { Write-Host '    Gradle daemon stop returned a non-zero status; continuing with process cleanup.' -ForegroundColor Yellow }
    }
    $androidNeedle = $Android.ToLowerInvariant()
    $cacheNeedle = $PersistentGradleHome.ToLowerInvariant()
    $killed = 0
    try {
        $processes = @(Get-CimInstance Win32_Process -Filter "Name='java.exe' OR Name='javaw.exe'" -ErrorAction Stop)
        foreach ($proc in $processes) {
            $cmdLower = ([string]$proc.CommandLine).ToLowerInvariant()
            if (($cmdLower -like "*$androidNeedle*") -or ($cmdLower -like "*$cacheNeedle*")) {
                try { Stop-Process -Id ([int]$proc.ProcessId) -Force -ErrorAction Stop; $killed++ } catch {}
            }
        }
    } catch { Write-Host '    Could not enumerate Java processes; continuing.' -ForegroundColor Yellow }
    if ($killed -gt 0) {
        Write-Host "    Terminated $killed stale Java/Gradle process(es) holding the Android build directory." -ForegroundColor Yellow
        Start-Sleep -Milliseconds 800
    }
}
function Remove-LockedAndroidDirectory([string]$Android) {
    if (-not (Test-Path -LiteralPath $Android)) { return }
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try { Remove-Item -LiteralPath $Android -Recurse -Force -ErrorAction Stop; return }
        catch {
            if ($attempt -eq 5) { throw "Unable to remove generated Android directory after 5 attempts: $Android. Close Android Studio/Gradle or another process using the project, then retry." }
            Write-Host "    Android directory is still locked; retrying cleanup ($attempt/5)..." -ForegroundColor Yellow
            Stop-AndroidBuildProcesses $Android
            Start-Sleep -Seconds 1
        }
    }
}


function Ensure-AndroidSdk() {
    # Prefer public mirrors that do not rely on Google's download endpoints.
    # Maven dependency mirrors remain independently controlled by gradle-mirror.init.gradle (Myket-first).
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    # Pin all SDK and Android user metadata to the F: workspace, ignoring C: defaults.
    $sdk = [IO.Path]::GetFullPath($AndroidSdkRoot)
    [void](Ensure-Directory $sdk)
    $env:ANDROID_HOME = $sdk
    $env:ANDROID_SDK_ROOT = $sdk
    $env:ANDROID_USER_HOME = [IO.Path]::GetFullPath($AndroidUserHome)
    [void](Ensure-Directory $env:ANDROID_USER_HOME)
    Write-Host "    SDK install path: $sdk" -ForegroundColor Cyan
    Write-Host "    Android user data: $env:ANDROID_USER_HOME" -ForegroundColor Cyan
    Write-Host "    Temporary downloads: $env:TEMP" -ForegroundColor Cyan

    # TUNA and Huawei are tried before Tencent; the official Google endpoint is deliberately
    # not used by this local script. Mirrors can be changed without editing this function.
    $repositoryMirrors = @(
        'https://mirrors.tuna.tsinghua.edu.cn/android/repository/',
        'https://mirrors.huaweicloud.com/android/repository/',
        'https://mirrors.cloud.tencent.com/AndroidSDK/'
    )
    $toolsArchiveName = 'commandlinetools-win-11076708_latest.zip'
    $sdkManager = Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'
    if (-not (Test-Path -LiteralPath $sdkManager)) {
        Stage 15 'Downloading Android SDK command-line tools from public mirrors'
        $toolsRoot = Join-Path $sdk 'cmdline-tools'
        [void](Ensure-Directory $toolsRoot)
        $zip = Join-Path $env:TEMP ('khatyar-android-cmdline-tools-' + [guid]::NewGuid().ToString('N') + '.zip')
        $extract = Join-Path $env:TEMP ('khatyar-android-cmdline-tools-' + [guid]::NewGuid().ToString('N'))
        $downloaded = $false
        try {
            foreach ($mirror in $repositoryMirrors) {
                $url = $mirror.TrimEnd('/') + '/' + $toolsArchiveName
                try {
                    Write-Host "    Trying SDK mirror: $mirror" -ForegroundColor Cyan
                    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -TimeoutSec 600
                    if ((Test-Path -LiteralPath $zip) -and (Get-Item -LiteralPath $zip).Length -gt 10MB) {
                        $downloaded = $true
                        break
                    }
                    Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
                    Write-Host '    Mirror returned an incomplete or unexpected archive; trying next mirror.' -ForegroundColor Yellow
                } catch {
                    Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
                    Write-Host "    Mirror failed: $($_.Exception.Message)" -ForegroundColor Yellow
                }
            }
            if (-not $downloaded) {
                Fail 'Could not download Android command-line tools from the configured non-Google mirrors. Check mirror availability or set up a reachable mirror; Google download endpoints are intentionally not used.'
            }
            Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
            $extractedBin = Join-Path $extract 'cmdline-tools\bin'
            if (-not (Test-Path -LiteralPath (Join-Path $extractedBin 'sdkmanager.bat'))) {
                Fail 'Downloaded command-line tools archive does not contain sdkmanager.bat.'
            }
            $latest = Join-Path $toolsRoot 'latest'
            if (Test-Path -LiteralPath $latest) { Remove-Item -LiteralPath $latest -Recurse -Force }
            Move-Item -LiteralPath (Join-Path $extract 'cmdline-tools') -Destination $latest
        } catch {
            Fail "Unable to install Android SDK command-line tools from public mirrors: $($_.Exception.Message)"
        } finally {
            Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath $extract -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    $sdkBin = Join-Path $sdk 'platform-tools'
    if ($env:PATH -notlike "*$sdkBin*") { $env:PATH = "$sdkBin;$([IO.Path]::GetDirectoryName($sdkManager));$env:PATH" }
    if (-not (Test-Path -LiteralPath $sdkManager)) { Fail "sdkmanager was not installed: $sdkManager" }

    Stage 18 'Installing required Android SDK components from configured repository mirrors'
    $components = @('platform-tools','platforms;android-36','build-tools;36.0.0','ndk;27.3.13750724')
    $sdkLog = Join-Path $env:TEMP ('khatyar-sdkmanager-' + [guid]::NewGuid().ToString('N') + '.log')
    $repositoriesConfig = Join-Path $env:ANDROID_USER_HOME 'repositories.cfg'
    $installed = $false
    try {
        foreach ($mirror in $repositoryMirrors) {
            # sdkmanager does not reliably honor SDK_TEST_BASE_URL. Register the mirror's
            # actual repository XML in repositories.cfg instead, as documented by mirror operators.
            $repositoryXml = $mirror.TrimEnd('/') + '/repository2-1.xml'
            Write-Host "    Testing SDK repository: $repositoryXml" -ForegroundColor Cyan
            try {
                @(
                    '### Khatyar Android SDK mirror configuration'
                    $repositoryXml
                ) | Set-Content -LiteralPath $repositoriesConfig -Encoding ASCII

                $listOutput = & $sdkManager "--sdk_root=$sdk" --list --verbose 2>&1
                $listExit = $LASTEXITCODE
                $listText = ($listOutput | Out-String)
                $listText | Set-Content -LiteralPath $sdkLog -Encoding UTF8
                if ($listExit -ne 0 -or $listText -match '(?i)Failed to download any source lists|IO exception while downloading manifest|Still waiting for package manifests') {
                    throw 'sdkmanager could not load the mirror repository manifest.'
                }

                $licenseInput = ('y' + [Environment]::NewLine) * 100
                $licenseInput | & $sdkManager "--sdk_root=$sdk" --licenses 2>&1 | Tee-Object -FilePath $sdkLog -Append | Out-Host
                if ($LASTEXITCODE -ne 0) { throw 'License acceptance command failed.' }

                & $sdkManager "--sdk_root=$sdk" @components 2>&1 | Tee-Object -FilePath $sdkLog -Append | Out-Host
                if ($LASTEXITCODE -ne 0) { throw 'One or more SDK components failed to install from this mirror.' }
                $installed = $true
                break
            } catch {
                Write-Host "    SDK repository failed: $($_.Exception.Message)" -ForegroundColor Yellow
                if (Test-Path -LiteralPath $sdkLog) {
                    Get-Content -LiteralPath $sdkLog -Tail 12 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkYellow }
                }
            }
        }
    } finally {
        if (Test-Path -LiteralPath $sdkLog) {
            Write-Host "    SDK Manager diagnostics: $sdkLog" -ForegroundColor Yellow
        }
    }
    if (-not $installed) {
        Fail "Could not install Android SDK components from the configured non-Google mirrors. Mirror repository URLs were registered in $repositoriesConfig. See diagnostics: $sdkLog. Google download endpoints are intentionally not used as a fallback."
    }

    $required = @(
        (Join-Path $sdk 'platforms\android-36\android.jar'),
        (Join-Path $sdk 'build-tools\36.0.0\aapt.exe'),
        (Join-Path $sdk 'platform-tools\adb.exe'),
        (Join-Path $sdk 'ndk\27.3.13750724\source.properties')
    )
    foreach ($file in $required) {
        if (-not (Test-Path -LiteralPath $file)) { Fail "Android SDK component verification failed; missing: $file" }
    }
    Write-Host "    Android SDK ready: $sdk" -ForegroundColor Green
    Write-Host '    Installed: platform-tools, Android API 36, Build Tools 36.0.0, NDK 27.3.13750724' -ForegroundColor Green
}
function Ensure-Directory([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { Fail 'Directory path is empty.' }
    $full = [IO.Path]::GetFullPath($Path)
    if (-not [IO.Directory]::Exists($full)) { [void][IO.Directory]::CreateDirectory($full) }
    if (-not [IO.Directory]::Exists($full)) { Fail "Unable to create directory: $full" }
    return $full
}
function Sync-RadioNativeSources([string]$Android) {
    $Android = [IO.Path]::GetFullPath($Android)
    $sourceDir = Join-Path $Root 'plugins\khatyar-radio-native'
    $targetDir = Join-Path $Android 'app\src\main\java\ir\mashhad\taxicontrol\radio'
    if (-not (Test-Path -LiteralPath $sourceDir)) { Fail 'Canonical Khatyar radio plugin source directory is missing.' }
    $targetDir = Ensure-Directory $targetDir

    foreach ($name in @('KhatyarRadioPackage.java','KhatyarRadioModule.java','KhatyarRadioService.java','OutgoingRadioRecorder.java','RadioSfxPlayer.java')) {
        $source = Join-Path $sourceDir $name
        if (-not (Test-Path -LiteralPath $source)) { Fail "Missing canonical radio source: $source" }
        Copy-Item -LiteralPath $source -Destination (Join-Path $targetDir $name) -Force
    }

    $resourceRoot = Join-Path $sourceDir 'resources'
    foreach ($dir in @('layout','drawable','values')) {
        $src = Join-Path $resourceRoot $dir
        if (-not (Test-Path -LiteralPath $src)) { continue }
        $dst = Join-Path $Android ('app\src\main\res\' + $dir)
        $dst = Ensure-Directory $dst
        Get-ChildItem -LiteralPath $src -File | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $dst $_.Name) -Force
        }
    }

    $expected = @(
        (Join-Path $targetDir 'OutgoingRadioRecorder.java'),
        (Join-Path $targetDir 'RadioSfxPlayer.java'),
        (Join-Path $Android 'app\src\main\res\layout\khatyar_radio_notification.xml'),
        (Join-Path $Android 'app\src\main\res\layout\khatyar_radio_notification_big.xml')
    )
    foreach ($file in $expected) {
        if (-not (Test-Path -LiteralPath $file)) { Fail "Radio native synchronization failed; missing $file" }
    }
    Write-Host '    Radio native sources/resources synchronized from canonical plugin.' -ForegroundColor Green
}

function Test-GeneratedRadioManifest([string]$Android) {
    $manifest = Join-Path $Android 'app\src\main\AndroidManifest.xml'
    if (-not (Test-Path -LiteralPath $manifest)) { Fail 'Generated AndroidManifest.xml is missing.' }
    $text = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8
    if ($text -match 'android:description\s*=\s*"(?!@string/)') {
        Fail 'AndroidManifest.xml contains a literal android:description value. Radio service descriptions must use an @string resource reference or be omitted.'
    }
}
function Configure-GradlePerformance([string]$Android) {
    # Tuned for 24 GB RAM / Intel Core i3-6100 (4 logical processors).
    $cpu = [Environment]::ProcessorCount
    $workers = [Math]::Max(2, [Math]::Min($cpu, 4))
    $propsPath = Join-Path $Android 'gradle.properties'
    $props = @()
    if (Test-Path -LiteralPath $propsPath) { $props = @(Get-Content -LiteralPath $propsPath) }
    $keys = [ordered]@{
        'org.gradle.jvmargs' = '-Xmx12g -XX:MaxMetaspaceSize=3g -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8'
        'org.gradle.daemon' = 'true'
        'org.gradle.parallel' = 'true'
        'org.gradle.workers.max' = [string]$workers
        'org.gradle.caching' = 'true'
        'org.gradle.configureondemand' = 'true'
        'org.gradle.vfs.watch' = 'true'
        'org.gradle.daemon.performance.disable-logging' = 'true'
    }
    foreach ($key in $keys.Keys) {
        $value = [string]$keys[$key]
        $found = $false
        $next = foreach ($line in $props) {
            if ($line -match ('^\s*' + [regex]::Escape($key) + '\s*=')) { $found = $true; "$key=$value" } else { $line }
        }
        if (-not $found) { $next += "$key=$value" }
        $props = @($next)
    }
    Set-Content -LiteralPath $propsPath -Value $props -Encoding UTF8
    Write-Host "    Gradle memory: 12 GiB heap / 3 GiB metaspace / $workers workers" -ForegroundColor Green
}
function Remove-ReactNativeScreensNativeBuild([string]$Android) {
    $nativeBuild = Join-Path $Root 'node_modules\react-native-screens\android\build'
    if (-not (Test-Path -LiteralPath $nativeBuild)) { return }
    Write-Host '    Cleaning react-native-screens native CMake intermediates before release build.' -ForegroundColor Yellow
    Stop-AndroidBuildProcesses $Android
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Remove-Item -LiteralPath $nativeBuild -Recurse -Force -ErrorAction Stop
            return
        } catch {
            if ($attempt -eq 3) {
                throw "react-native-screens native build directory is locked: $nativeBuild. Close Android Studio/other native build tools and retry."
            }
            Start-Sleep -Seconds 1
            Stop-AndroidBuildProcesses $Android
        }
    }
}

function Run-Gradle([string]$Gradlew,[string]$Cwd,[string]$LogPath,[string]$Task,[hashtable]$Environment) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'; $psi.WorkingDirectory = $Cwd; $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true; $psi.RedirectStandardOutput = $false; $psi.RedirectStandardError = $false
    $command = '"' + $Gradlew + '" --init-script "' + $InitScript + '" ' + $Task + ' --build-cache --console=plain --stacktrace'
    $psi.Arguments = '/d /c "' + $command + ' > "' + $LogPath + '" 2>&1"'
    foreach ($key in $Environment.Keys) { $psi.EnvironmentVariables[$key] = [string]$Environment[$key] }
    Write-Host ('> ' + $Gradlew + ' --init-script ' + $InitScript + ' ' + $Task + ' --build-cache') -ForegroundColor DarkGray
    $process = New-Object Diagnostics.Process; $process.StartInfo = $psi; [void]$process.Start()
    $lastLength = 0L; $lastActivity = Get-Date; $lastDisplay = Get-Date
    try {
        while (-not $process.HasExited) {
            Start-Sleep -Seconds 2
            if (Test-Path -LiteralPath $LogPath) {
                $length = (Get-Item -LiteralPath $LogPath).Length
                if ($length -gt $lastLength) { $lastLength = $length; $lastActivity = Get-Date }
            }
            $total = ((Get-Date)-$Start).TotalSeconds; $idle = ((Get-Date)-$lastActivity).TotalSeconds
            if (((Get-Date)-$lastDisplay).TotalSeconds -ge 10) {
                $lastDisplay = Get-Date
                Write-Host ('    Gradle running | ' + $Task + ' | elapsed ' + (New-TimeSpan -Seconds ([int]$total)).ToString('hh\:mm\:ss')) -ForegroundColor Cyan
            }
            if ($total -ge ($GradleTimeoutMinutes * 60)) { try { taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null } catch {}; throw "Gradle exceeded $GradleTimeoutMinutes minutes." }
            if ($idle -ge ($GradleIdleTimeoutMinutes * 60)) { try { taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null } catch {}; throw "Gradle produced no new log output for $GradleIdleTimeoutMinutes minutes." }
        }
        if ($process.ExitCode -ne 0) {
            if (Test-Path -LiteralPath $LogPath) {
                $lines = @(Get-Content -LiteralPath $LogPath)
                Write-Host "`n---------------- Compiler/Gradle root-cause diagnostics ----------------" -ForegroundColor Red
                $patterns = @(
                    'error: .*',
                    'e: .*',
                    'FAILURE: .*',
                    'What went wrong:',
                    'Execution failed for task .*',
                    'Caused by: .*',
                    'AAPT: error: .*',
                    'cannot find symbol',
                    'symbol: .*',
                    'location: .*'
                )
                $diagnosticMatches = New-Object System.Collections.Generic.List[int]
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    foreach ($pattern in $patterns) {
                        if ($lines[$i] -match $pattern) { [void]$diagnosticMatches.Add($i); break }
                    }
                }
                $unique = @($diagnosticMatches | Select-Object -Unique)
                if ($unique.Count -gt 0) {
                    $shown = New-Object System.Collections.Generic.HashSet[int]
                    foreach ($idx in $unique) {
                        $from = [Math]::Max(0, $idx - 3); $to = [Math]::Min($lines.Count - 1, $idx + 8)
                        for ($j = $from; $j -le $to; $j++) { if ($shown.Add($j)) { Write-Host ($('{0,6}: {1}' -f ($j + 1), $lines[$j])) -ForegroundColor Red } }
                        Write-Host '---' -ForegroundColor DarkRed
                    }
                } else {
                    Write-Host 'No structured compiler diagnostic matched; showing final 160 log lines.' -ForegroundColor Yellow
                    $lines | Select-Object -Last 160
                }
                Write-Host "Full log: $LogPath" -ForegroundColor Yellow
                Write-Host '-----------------------------------------------------------------------' -ForegroundColor Red
            }
            throw "Gradle exited with code $($process.ExitCode). Full log: $LogPath"
        }
    } finally { $process.Dispose() }
}

try {
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host '       KHATYAR - FAST ANDROID RELEASE BUILD' -ForegroundColor Cyan
    Write-Host '============================================================' -ForegroundColor Cyan
    Write-Host ('Project: ' + $Root); Write-Host ('Artifact: ' + $ArtifactType)

    Stage 10 'Checking required tools'
    foreach ($tool in @('node.exe','npm.cmd','java.exe','git.exe')) { if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Fail "$tool was not found in PATH." } }
    $packagePath = Join-Path $Root 'package.json'; $lockPath = Join-Path $Root 'package-lock.json'
    if (-not (Test-Path -LiteralPath $packagePath)) { Fail 'package.json is missing.' }
    if (-not (Test-Path -LiteralPath $lockPath)) { Fail 'package-lock.json is missing.' }
    if (-not (Test-Path -LiteralPath $InitScript)) { Fail 'gradle-mirror.init.gradle is missing.' }
    $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    if ([string]$package.dependencies.expo -notmatch '^~?57\.') { Fail "Expo dependency is $($package.dependencies.expo); SDK 57 baseline required." }
    if ([string]$package.dependencies.'react-native' -ne '0.86.0') { Fail 'React Native 0.86.0 baseline required.' }
    if ([string]$package.dependencies.react -ne '19.2.3') { Fail 'React 19.2.3 baseline required.' }
    $packageHash = Get-FileHashSafe $packagePath
    $nativeConfigHash = Get-NativeConfigHash
    Invoke-Checked 'cmd.exe' @('/d','/c','node.exe --version')
    Invoke-Checked 'cmd.exe' @('/d','/c','npm.cmd --version')
    Invoke-Checked 'cmd.exe' @('/d','/c','java.exe -version 2>&1')
    Invoke-Checked 'cmd.exe' @('/d','/c','git.exe --version')

    Ensure-AndroidSdk

    $expoAutolinkingContaminated = -not (Test-ExpoAutolinkingPackageClean)
    if ($Fresh -or $expoAutolinkingContaminated) {
        if ($expoAutolinkingContaminated) {
            Write-Host '    Detected legacy KhatYar patch inside expo-modules-autolinking; restoring package from package-lock.json.' -ForegroundColor Yellow
        }
        Stage 22 'Refreshing locked npm dependencies'
        Invoke-Checked 'npm.cmd' @('ci','--no-audit','--no-fund','--legacy-peer-deps','--include=dev')
    } elseif (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules\.bin\expo.cmd'))) {
        Stage 22 'Installing locked npm dependencies'
        Invoke-Checked 'npm.cmd' @('ci','--no-audit','--no-fund','--legacy-peer-deps','--include=dev')
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Root 'node_modules\.bin\expo.cmd'))) { Fail 'Local Expo CLI is missing.' }
    if (-not (Test-ExpoAutolinkingPackageClean)) { Fail 'expo-modules-autolinking is still modified after npm ci; package installation is not clean.' }

    if (-not $SkipDoctor) {
        Stage 30 'Running Expo diagnostics'
        $doctor = Join-Path $Root 'node_modules\.bin\expo-doctor.cmd'
        if (Test-Path -LiteralPath $doctor) { Invoke-Checked $doctor @() }
    }

    $android = Join-Path $Root 'android'
    if (Test-PrebuildCurrent $packageHash $nativeConfigHash) {
        Stage 40 'Reusing existing Android native project (clean prebuild skipped)'
    } else {
        Stage 40 'Generating Android native project from Expo baseline'
        if (Test-Path -LiteralPath $android) {
            Stop-AndroidBuildProcesses $android
            Remove-LockedAndroidDirectory $android
        }
        Invoke-Checked 'node.exe' @((Join-Path $Root 'scripts\prepare-android-release.js'))
        Save-PrebuildMarker $packageHash $nativeConfigHash
    }

    Sync-RadioNativeSources $android
    Test-GeneratedRadioManifest $android

    $gradlew = Join-Path $android 'gradlew.bat'; $wrapperProps = Join-Path $android 'gradle\wrapper\gradle-wrapper.properties'
    if (-not (Test-Path -LiteralPath $gradlew)) { Fail 'Gradle wrapper is missing.' }
    if ((Get-Content -LiteralPath $wrapperProps -Raw) -notmatch 'gradle-8\.13-bin\.zip') { Fail 'Gradle 8.13 baseline required.' }

    Stage 55 'Configuring high-performance Gradle daemon'
    Configure-GradlePerformance $android

    Stage 62 'Validating Gradle 8.13 / JDK 17'
    $versionLog = Join-Path $env:TEMP ('khatyar-gradle-' + [guid]::NewGuid().ToString('N') + '.txt')
    try {
        & cmd.exe /d /c ('"' + $gradlew + '" --version > "' + $versionLog + '" 2>&1')
        if ($LASTEXITCODE -ne 0) { Fail 'Gradle wrapper --version failed.' }
        $version = Get-Content -LiteralPath $versionLog -Raw
    } finally { Remove-Item -LiteralPath $versionLog -Force -ErrorAction SilentlyContinue }
    if ($version -notmatch 'Gradle 8\.13' -or $version -notmatch 'Launcher JVM:\s+17(?:\.|\s|$)') { Fail 'Gradle/JDK baseline validation failed.' }

    Stage 70 'Preparing persistent Gradle cache'
    $PersistentGradleHome = Ensure-Directory $PersistentGradleHome
    $logDir = Ensure-Directory (Join-Path $android 'build\khatyar-fast-logs')
    $task = if ($ArtifactType -eq 'AAB') { 'bundleRelease' } else { 'assembleRelease' }
    $logPath = Join-Path $logDir (($ArtifactType.ToLowerInvariant()) + '-release-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
    $gradleEnv = @{
        GRADLE_USER_HOME = $PersistentGradleHome
        GRADLE_OPTS = '-Dorg.gradle.internal.http.connectionTimeout=20000 -Dorg.gradle.internal.http.socketTimeout=60000 -Dfile.encoding=UTF-8'
        JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8'
        NODE_OPTIONS = '--dns-result-order=ipv4first'
        CI = '1'
    }

    Stage 75 ('Building cached Android release ' + $ArtifactType)
    Write-Host '[khatyar-fast] Configuration cache intentionally disabled for Expo/RN compatibility.' -ForegroundColor DarkGray
    Write-Host '[khatyar-fast] Gradle parallel execution disabled for Windows CMake/native stability; build cache remains enabled.' -ForegroundColor DarkGray
    Remove-ReactNativeScreensNativeBuild $android
    Stop-AndroidBuildProcesses $android
    Run-Gradle $gradlew $android $logPath $task $gradleEnv

    Stage 95 'Verifying release artifact'
    $artifact = if ($ArtifactType -eq 'AAB') { Join-Path $android 'app\build\outputs\bundle\release\app-release.aab' } else { Join-Path $android 'app\build\outputs\apk\release\app-release.apk' }
    if (-not (Test-Path -LiteralPath $artifact)) { Fail "Build completed but artifact was not found: $artifact" }
    $size = [math]::Round((Get-Item -LiteralPath $artifact).Length / 1MB, 2)
    Write-Host ('Artifact: ' + $artifact) -ForegroundColor Green
    Write-Host ('Size MB : ' + $size) -ForegroundColor Green
    Write-Host ('Log     : ' + $logPath) -ForegroundColor Green
    $ExitCode = 0
}
catch {
    $ExitCode = 1
    Write-Host "`nBUILD ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ("Exception type: " + $_.Exception.GetType().FullName) -ForegroundColor DarkRed
    if ($_.InvocationInfo) {
        Write-Host ("Source: " + $_.InvocationInfo.PositionMessage) -ForegroundColor DarkRed
    }
    if ($_.Exception.StackTrace) {
        Write-Host ("Stack: " + $_.Exception.StackTrace) -ForegroundColor DarkRed
    }
}
finally {
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host ('Final stage : ' + $FinalStage); Write-Host ('Exit code   : ' + $ExitCode); Write-Host ('Total elapsed: ' + ((Get-Date)-$Start).ToString('hh\:mm\:ss'))
    Write-Host '============================================================' -ForegroundColor Cyan
    if (-not $NoPause) { Read-Host 'Press ENTER to close this window' | Out-Null }
}
exit $ExitCode
