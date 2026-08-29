# This entry is generated for KhatYar mirror-first builds.
# It configures non-Google Android repositories before invoking the existing build script.
$mirrors=@('https://mirrors.aliyun.com/android/repository/','https://mirrors.cloud.tencent.com/AndroidSDK/','https://mirrors.huaweicloud.com/repository/toolkit/android/repository/')
foreach($m in $mirrors){$url=$m.TrimEnd('/')+'/';$env:SDK_TEST_BASE_URL=$url;$p=Join-Path $env:USERPROFILE '.android';New-Item -ItemType Directory -Force $p|Out-Null;Set-Content (Join-Path $p 'repositories.cfg') -Encoding ASCII -Value @('### KhatYar mirror','repo-type=legacy',('url='+$url));Write-Host "[khatyar] Android mirror configured: $url" -ForegroundColor Cyan;break}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot '..\build-release.ps1') @args
exit $LASTEXITCODE
