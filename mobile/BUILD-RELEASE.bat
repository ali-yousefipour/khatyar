@echo off
setlocal
set "GRADLE_USER_HOME=F:\g"
set "KHATYAR_GRADLE_CACHE=F:\gradle-cache"
set "NPM_CONFIG_PREFER_OFFLINE=true"
set "NPM_CONFIG_AUDIT=false"
set "NPM_CONFIG_FUND=false"
cd /d "%~dp0"
node scripts\build-network-policy.js
exit /b %ERRORLEVEL%
