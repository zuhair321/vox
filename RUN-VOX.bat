@echo off
title VOX - Simple Application Launcher

REM Prevent command echoing for cleaner output
@echo off

REM Set console color to green
color 0A

REM Change to project root directory
cd /d "%~dp0"

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Please run this script from the VOX project directory
    echo Current directory: %cd%
    pause
    exit /b 1
)

REM Check for Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is required but not found in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check for npm
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is required but not found in PATH
    echo Please install Node.js which includes npm
    pause
    exit /b 1
)

echo.
echo ============================================
echo          VOX APPLICATION LAUNCHER
echo ============================================
echo.
echo Starting VOX services...
echo.

REM Start backend service silently
echo [1/3] Starting Backend API...
start "" /b cmd /c "cd backend && npm run dev > nul 2>&1"
REM Brief pause to allow startup
timeout /t 2 >nul

REM Start frontend service silently  
echo [2/3] Starting Frontend Development Server...
start "" /b cmd /c "cd frontend && npm run dev > nul 2>&1"
REM Longer pause for Vite to initialize
timeout /t 4 >nul

REM Launch Electron desktop app
echo [3/3] Starting VOX Desktop Application...
echo.

REM Run Electron - this is the main interaction point
REM Using call to ensure proper error handling
call npm run dev:desktop

REM Optional cleanup (only runs when Electron exits)
REM Suppress all cleanup errors to prevent exceptions
echo.
echo ============================================
echo    VOX APPLICATION SESSION ENDED
echo ============================================
echo.
echo Thank you for using VOX!
echo.
REM Silent cleanup - ignore all errors
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
exit /b 0