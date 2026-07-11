@echo off
echo ========================================
echo   VOX Admin Portal - Build & Package
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo Step 2: Building frontend...
call npm run build
if errorlevel 1 (
    echo Failed to build frontend!
    pause
    exit /b 1
)
echo.

echo Step 3: Packaging Electron app...
call npm run dist:win
if errorlevel 1 (
    echo Failed to package app!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   Build complete! Check the release/ folder.
echo ========================================
pause
