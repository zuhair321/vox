@echo off
setlocal

cd /d D:\Vox

echo.
echo ======================================
echo  VOX Desktop Setup
echo ======================================
echo.

:: Add Node.js to PATH if not already present
where npm >nul 2>&1
if errorlevel 1 (
    if exist "C:\Program Files\nodejs\npm" (
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else (
        echo.
        echo npm not found. Please install Node.js from https://nodejs.org
        pause
        exit /b 1
    )
)

if not exist "node_modules\electron" (
    echo Installing Electron (one-time setup)...
    npm install electron@^30.0.0 --save-dev
    if errorlevel 1 (
        echo.
        echo Installation failed. Please make sure Node.js is installed.
        echo Download from: https://nodejs.org
        pause
        exit /b 1
    )
    echo.
    echo Electron installed successfully!
) else (
    echo Electron already installed.
)

echo.
echo Starting VOX Desktop...
echo.

start "" "D:\Vox\node_modules\.bin\electron.cmd" "D:\Vox\electron-main.js"

echo VOX Desktop is starting...
echo.
timeout /t 5 /nobreak >nul
exit
