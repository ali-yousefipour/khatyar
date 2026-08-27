@echo off
echo نصب نیازمندی‌ها...
pip install pyinstaller requests
echo ساخت فایل اجرایی...
pyinstaller --onefile --noconsole --name "TaxiBackup" taxi_backup.py
echo.
echo فایل اجرایی در پوشهٔ dist\TaxiBackup.exe ساخته شد.
pause
