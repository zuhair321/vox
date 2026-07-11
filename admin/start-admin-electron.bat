@echo off
echo ========================================
echo   VOX Admin Portal - Electron Setup
echo ========================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Check if electron is installed
if not exist "node_modules\.package-lock.json" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting VOX Admin Portal (Electron)...
echo Press Ctrl+Shift+A to toggle the window.
echo.
call npm run electron:dev
