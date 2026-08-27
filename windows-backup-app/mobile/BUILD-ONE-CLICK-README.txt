KHATYAR ONE-CLICK MYKET BUILD

Requirements:
1. Windows PowerShell 5.1 or newer.
2. Node.js 22 LTS is recommended.
3. Java and Android SDK must be installed.
4. Copy the signing keystore to:
   mobile\credentials\taxi-myket-release.keystore
5. Copy the signing credentials file to:
   release\myket\signing\SIGNING-CREDENTIALS-KEEP-PRIVATE.txt

Run by double-clicking:
  BUILD-ONE-CLICK.bat

Or run in PowerShell:
  powershell -NoProfile -ExecutionPolicy Bypass -File .\BUILD-ONE-CLICK.ps1

Useful options:
  -Fresh          Ignore checkpoints and reinstall from a clean state.
  -SkipCleanup    Keep the current android and Expo generated folders.
  -SkipDoctor     Skip expo-doctor.
  -FromStage NAME Start from a named stage.

Example:
  .\BUILD-ONE-CLICK.ps1 -Fresh
  .\BUILD-ONE-CLICK.ps1 -FromStage expo-prebuild

Stages:
  preflight
  npm-network-config
  optional-cleanup
  registry-selection
  dependency-install
  expo-version-fix
  module-validation
  expo-doctor
  release-config
  expo-prebuild
  manifest-patch
  gradle-clean
  gradle-apk
  gradle-aab
  collect-artifacts

Resume behavior:
- Successful stages are stored in mobile\.build-state.json.
- Run the same command again after fixing an error to continue.
- Use -Fresh to discard checkpoints.

Outputs:
  release\myket\khatyar-<version>-myket.apk
  release\myket\khatyar-<version>-myket.aab

Reports:
  release\myket\reports\build-report.txt
  release\myket\reports\build-report.json
  release\myket\reports\build-report.html
