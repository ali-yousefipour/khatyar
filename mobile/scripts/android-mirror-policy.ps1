# Android mirror policy for Iran-network constrained builds.
# This helper is intentionally standalone and can be dot-sourced by build scripts.

$script:KhatYarAndroidMirrors = @(
  'https://mirrors.aliyun.com/android/repository/',
  'https://mirrors.cloud.tencent.com/AndroidSDK/',
  'https://mirrors.huaweicloud.com/repository/toolkit/android/repository/'
)

function Get-KhatYarAndroidMirrors {
  if ($env:KHATYAR_ANDROID_MIRROR_URL) {
    return @($env:KHATYAR_ANDROID_MIRROR_URL.TrimEnd('/') + '/') + $script:KhatYarAndroidMirrors
  }
  return $script:KhatYarAndroidMirrors
}

function Set-KhatYarAndroidMirror([string]$BaseUrl) {
  $url = $BaseUrl.TrimEnd('/') + '/'
  $env:SDK_TEST_BASE_URL = $url
  $env:KHATYAR_ANDROID_MIRROR_URL_ACTIVE = $url
  $androidUser = Join-Path $env:USERPROFILE '.android'
  New-Item -ItemType Directory -Force -Path $androidUser | Out-Null
  $repoCfg = Join-Path $androidUser 'repositories.cfg'
  $cfg = @(
    '### KhatYar Android SDK mirror',
    'repo-type=legacy',
    ('url=' + $url)
  )
  Set-Content -LiteralPath $repoCfg -Value $cfg -Encoding ASCII
}
