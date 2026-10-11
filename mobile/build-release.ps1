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



function Get-SdkArchiveSha1([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA1).Hash.ToLowerInvariant()
}
function Ensure-SdkArchive([object]$Record,[string]$LocalName,[string[]]$LegacyNames) {
    $archiveDir = Ensure-Directory $BuildTempRoot
    $canonicalPath = Join-Path $archiveDir $LocalName
    $expectedSize = [int64]$Record.archive_size
    $expectedSha1 = ([string]$Record.archive_checksum).Trim().ToLowerInvariant()
    $candidates = @($canonicalPath)
    foreach ($legacy in $LegacyNames) {
        if (-not [string]::IsNullOrWhiteSpace($legacy)) {
            $candidates += (Join-Path $archiveDir $legacy)
        }
    }

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        $item = Get-Item -LiteralPath $candidate
        if ($item.Length -eq $expectedSize) {
            $actualSha1 = Get-SdkArchiveSha1 $candidate
            if ($actualSha1 -eq $expectedSha1) {
                Write-Host "    Reusing checksum-verified archive: $candidate" -ForegroundColor Green
                return $candidate
            }
        }
        Write-Host "    Cached archive failed size/SHA-1 verification; it will not be installed: $candidate" -ForegroundColor Yellow
    }

    $partial = $canonicalPath + '.download'
    Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
    try {
        Write-Host "    Downloading verified Myket SDK archive: $($Record.archive_url)" -ForegroundColor Cyan
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri ([string]$Record.archive_url) -OutFile $partial -UseBasicParsing -TimeoutSec 1800
        if (-not (Test-Path -LiteralPath $partial)) { Fail "Download did not create a file for $LocalName." }
        $downloaded = Get-Item -LiteralPath $partial
        if ($downloaded.Length -ne $expectedSize) {
            Fail "SDK archive size mismatch for $LocalName. Expected $expectedSize bytes; received $($downloaded.Length)."
        }
        $actualSha1 = Get-SdkArchiveSha1 $partial
        if ($actualSha1 -ne $expectedSha1) {
            Fail "SDK archive SHA-1 mismatch for $LocalName. Expected $expectedSha1; received $actualSha1."
        }
        Move-Item -LiteralPath $partial -Destination $canonicalPath -Force
        Write-Host "    Download size and SHA-1 verified: $canonicalPath" -ForegroundColor Green
        return $canonicalPath
    } finally {
        Remove-Item -LiteralPath $partial -Force -ErrorAction SilentlyContinue
        $ProgressPreference = 'Continue'
    }
}
function Test-SdkPackageReady([string]$PackagePath,[string]$PackageKind) {
    $dir = Join-Path $AndroidSdkRoot $PackagePath
    if (-not (Test-Path -LiteralPath (Join-Path $dir 'source.properties'))) { return $false }
    $props = Get-Content -LiteralPath (Join-Path $dir 'source.properties') -Raw
    switch ($PackageKind) {
        'ndk' {
            return ($props -match '(?m)^\s*Pkg\.Revision\s*=\s*27\.3\.13750724\s*$' -and
                (Test-Path -LiteralPath (Join-Path $dir 'ndk-build.cmd')) -and
                (Test-Path -LiteralPath (Join-Path $dir 'toolchains\llvm\prebuilt\windows-x86_64\bin\clang.exe')))
        }
        'platform-tools' {
            return ($props -match '(?m)^\s*Pkg\.Revision\s*=\s*37\.0\.1\s*$' -and
                (Test-Path -LiteralPath (Join-Path $dir 'adb.exe')) -and
                (Test-Path -LiteralPath (Join-Path $dir 'fastboot.exe')))
        }
        'build-tools' {
            return ($props -match '(?m)^\s*Pkg\.Revision\s*=\s*36\.0\.0\s*$' -and
                (Test-Path -LiteralPath (Join-Path $dir 'aapt2.exe')) -and
                (Test-Path -LiteralPath (Join-Path $dir 'd8.bat')) -and
                (Test-Path -LiteralPath (Join-Path $dir 'zipalign.exe')) -and
                (Test-Path -LiteralPath (Join-Path $dir 'aidl.exe')))
        }
        'platform' {
            return ($props -match '(?m)^\s*AndroidVersion\.ApiLevel\s*=\s*36\s*$' -and
                (Test-Path -LiteralPath (Join-Path $dir 'android.jar')) -and
                (Test-Path -LiteralPath (Join-Path $dir 'framework.aidl')))
        }
        default { return $false }
    }
}
function Install-SdkArchivePackage([object]$Record,[string]$ArchiveName,[string[]]$LegacyNames,[string]$ArchiveRoot,[string]$TargetRelative,[string]$PackageKind) {
    $target = Join-Path $AndroidSdkRoot $TargetRelative
    if (Test-SdkPackageReady $TargetRelative $PackageKind) {
        Write-Host "    Already installed and validated: $TargetRelative" -ForegroundColor Green
        return
    }

    $archive = Ensure-SdkArchive $Record $ArchiveName $LegacyNames
    $extractRoot = Join-Path $BuildTempRoot ('sdk-extract-' + [guid]::NewGuid().ToString('N'))
    $stagedPackage = Join-Path $extractRoot $ArchiveRoot
    $backupRoot = Join-Path $BuildTempRoot ('sdk-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
    $backupPath = Join-Path $backupRoot $TargetRelative
    try {
        [void][IO.Directory]::CreateDirectory($extractRoot)
        Expand-Archive -LiteralPath $archive -DestinationPath $extractRoot -Force
        if (-not (Test-Path -LiteralPath $stagedPackage)) {
            Fail "Archive '$ArchiveName' did not contain expected root '$ArchiveRoot'."
        }
        $propsPath = Join-Path $stagedPackage 'source.properties'
        if (-not (Test-Path -LiteralPath $propsPath)) {
            Fail "Archive '$ArchiveName' does not contain source.properties."
        }
        $props = Get-Content -LiteralPath $propsPath -Raw
        switch ($PackageKind) {
            'ndk' {
                if ($props -notmatch '(?m)^\s*Pkg\.Revision\s*=\s*27\.3\.13750724\s*$') { Fail 'Downloaded NDK revision is not 27.3.13750724.' }
                foreach ($rel in @('ndk-build.cmd','toolchains\llvm\prebuilt\windows-x86_64\bin\clang.exe')) {
                    if (-not (Test-Path -LiteralPath (Join-Path $stagedPackage $rel))) { Fail "NDK archive is missing $rel." }
                }
            }
            'platform-tools' {
                if ($props -notmatch '(?m)^\s*Pkg\.Revision\s*=\s*37\.0\.1\s*$') { Fail 'Downloaded Platform Tools revision is not 37.0.1.' }
                foreach ($rel in @('adb.exe','fastboot.exe')) {
                    if (-not (Test-Path -LiteralPath (Join-Path $stagedPackage $rel))) { Fail "Platform Tools archive is missing $rel." }
                }
            }
            'build-tools' {
                if ($props -notmatch '(?m)^\s*Pkg\.Revision\s*=\s*36\.0\.0\s*$') { Fail 'Downloaded Build Tools revision is not 36.0.0.' }
                foreach ($rel in @('aapt2.exe','d8.bat','zipalign.exe','aidl.exe','core-lambda-stubs.jar')) {
                    if (-not (Test-Path -LiteralPath (Join-Path $stagedPackage $rel))) { Fail "Build Tools archive is missing $rel." }
                }
            }
            'platform' {
                # Myket's API 36 archive reports Platform.Version=16 in source.properties;
                # use AndroidVersion.ApiLevel=36 as the authoritative platform check.
                if ($props -notmatch '(?m)^\s*AndroidVersion\.ApiLevel\s*=\s*36\s*$') { Fail 'Downloaded Android platform is not API 36.' }
                foreach ($rel in @('android.jar','framework.aidl')) {
                    if (-not (Test-Path -LiteralPath (Join-Path $stagedPackage $rel))) { Fail "Android Platform archive is missing $rel." }
                }
            }
        }

        $parent = Split-Path -LiteralPath $target -Parent
        [void][IO.Directory]::CreateDirectory($parent)
        if (Test-Path -LiteralPath $target) {
            [void][IO.Directory]::CreateDirectory((Split-Path -LiteralPath $backupPath -Parent))
            Move-Item -LiteralPath $target -Destination $backupPath
            Write-Host "    Previous package backed up: $backupPath" -ForegroundColor Yellow
        }
        try {
            Move-Item -LiteralPath $stagedPackage -Destination $target
        } catch {
            if ((Test-Path -LiteralPath $backupPath) -and -not (Test-Path -LiteralPath $target)) {
                Move-Item -LiteralPath $backupPath -Destination $target
            }
            throw
        }
        if (-not (Test-SdkPackageReady $TargetRelative $PackageKind)) {
            if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
            if (Test-Path -LiteralPath $backupPath) { Move-Item -LiteralPath $backupPath -Destination $target }
            Fail "Post-install verification failed for $TargetRelative; previous package restored when available."
        }
        Write-Host "    Installed and verified: $target" -ForegroundColor Green
    } finally {
        Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
function Ensure-AndroidSdk() {
    # Prefer already-installed SDK packages, then verified local archives in .build-temp.
    # Download only a missing/invalid archive; no SDK archive-index request is needed.
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $sdk = [IO.Path]::GetFullPath($AndroidSdkRoot)
    [void](Ensure-Directory $sdk)
    $env:ANDROID_HOME = $sdk
    $env:ANDROID_SDK_ROOT = $sdk
    $env:ANDROID_USER_HOME = [IO.Path]::GetFullPath($AndroidUserHome)
    [void](Ensure-Directory $env:ANDROID_USER_HOME)
    Write-Host "    SDK install path: $sdk" -ForegroundColor Cyan
    Write-Host "    Android user data: $env:ANDROID_USER_HOME" -ForegroundColor Cyan
    Write-Host "    SDK archive cache: $BuildTempRoot" -ForegroundColor Cyan

    $packages = @(
        @{
            Path='ndk;27.3.13750724'; Archive='android-ndk-r27d-windows.zip'; Legacy=@('android-ndk-r27d-windows.zip')
            Root='android-ndk-r27d'; Target='ndk\27.3.13750724'; Kind='ndk'
            Url='https://maven.myket.ir/android-sdk/android-ndk-r27d-windows.zip'
            Size=[int64]781506724; Sha1='56607cbccd3642d4a1991f6bb3114a00f884f426'
        },
        @{
            Path='platform-tools'; Archive='platform-tools_r37.0.1-win.zip'; Legacy=@('platform-tools.zip')
            Root='platform-tools'; Target='platform-tools'; Kind='platform-tools'
            Url='https://maven.myket.ir/android-sdk/platform-tools_r37.0.1-win.zip'
            Size=[int64]8044989; Sha1='e03e78b1d80b396f1c3358e31251cb31740e1110'
        },
        @{
            Path='build-tools;36.0.0'; Archive='build-tools_r36_windows.zip'; Legacy=@('build-tools-36.0.0.zip')
            Root='android-16'; Target='build-tools\36.0.0'; Kind='build-tools'
            Url='https://maven.myket.ir/android-sdk/build-tools_r36_windows.zip'
            Size=[int64]58699878; Sha1='f16ccffd34de8790dede813a6c7d8e2c11a27b50'
        },
        @{
            Path='platforms;android-36'; Archive='platform-36_r02.zip'; Legacy=@('platform-android-36.zip')
            Root='android-36'; Target='platforms\android-36'; Kind='platform'
            Url='https://maven.myket.ir/android-sdk/platform-36_r02.zip'
            Size=[int64]65878410; Sha1='2c1a80dd4d9f7d0e6dd336ec603d9b5c55a6f576'
        }
    )

    $missingPackages = @($packages | Where-Object { -not (Test-SdkPackageReady $_.Target $_.Kind) })
    if ($missingPackages.Count -eq 0) {
        Write-Host '    All required Android SDK packages already exist and passed validation; no download required.' -ForegroundColor Green
    } else {
        Write-Host ("    Packages requiring installation: " + (($missingPackages | ForEach-Object { $_.Target }) -join ', ')) -ForegroundColor Cyan
        foreach ($p in $missingPackages) {
            $record = [pscustomobject]@{
                package_path = $p.Path
                archive_url = $p.Url
                archive_size = [string]$p.Size
                archive_checksum = $p.Sha1
            }
            Install-SdkArchivePackage $record $p.Archive $p.Legacy $p.Root $p.Target $p.Kind
        }
    }

    $required = @(
        (Join-Path $sdk 'platforms\android-36\android.jar'),
        (Join-Path $sdk 'build-tools\36.0.0\aapt2.exe'),
        (Join-Path $sdk 'build-tools\36.0.0\zipalign.exe'),
        (Join-Path $sdk 'platform-tools\adb.exe'),
        (Join-Path $sdk 'ndk\27.3.13750724\source.properties')
    )
    foreach ($file in $required) {
        if (-not (Test-Path -LiteralPath $file)) { Fail "Android SDK component verification failed; missing: $file" }
    }

    Write-Host "    Android SDK ready: $sdk" -ForegroundColor Green
    Write-Host '    Installed: Platform Tools 37.0.1, Android API 36, Build Tools 36.0.0, NDK 27.3.13750724' -ForegroundColor Green
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
