@echo off
set "GRADLE_USER_HOME=F:\g"
set "KHATYAR_GRADLE_CACHE=F:\gradle-cache"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-release.ps1"
exit /b %ERRORLEVEL%
