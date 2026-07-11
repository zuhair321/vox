@echo off
cd /d "%~dp0"
echo Starting VOX Application from D:\Vox
echo.
if exist package.json (
    echo ? Found package.json
) else (
    echo ? ERROR: package.json not found!
    pause
    exit /b 1
)
echo.
echo Starting application...
node scripts\start.mjs
