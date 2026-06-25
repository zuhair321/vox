@echo off
setlocal

cd /d C:\vox

:: Free only the ports VOX uses (4000 backend, 3000 frontend).
:: Do NOT taskkill all node.exe globally - that kills Electron's own
:: child processes and other unrelated apps (editors, CLIs, etc.).
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo.
echo ======================================
echo  Starting VOX Desktop
echo ======================================
echo.

:: Launch Electron (electron-main.js spawns backend on 4000 + frontend on 3000).
:: Prefer the real electron.exe - the .cmd shim dies when launched via `start`.
if exist "C:\vox\node_modules\electron\dist\electron.exe" (
    start "VOX" "C:\vox\node_modules\electron\dist\electron.exe" "C:\vox\electron-main.js"
) else (
    if exist "C:\vox\electron\electron.exe" (
        start "VOX" "C:\vox\electron\electron.exe" "C:\vox\electron-main.js"
    ) else (
        if exist "C:\vox\node_modules\.bin\electron.cmd" (
            start "VOX" cmd /c ""C:\vox\node_modules\.bin\electron.cmd" "C:\vox\electron-main.js""
        ) else (
            echo Electron not found. Run install-and-run-desktop.bat first.
            exit /b 1
        )
    )
)

echo VOX Desktop is starting...
echo.
echo This window will close in 5 seconds...
timeout /t 5 /nobreak >nul
exit
