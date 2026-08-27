@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD-ONE-CLICK.ps1" %*
set EXIT_CODE=%ERRORLEVEL%
echo.
if not "%EXIT_CODE%"=="0" (
  echo Build failed. Open ..\release\myket\reports\build-report.html
) else (
  echo Build completed successfully.
)
pause
exit /b %EXIT_CODE%
