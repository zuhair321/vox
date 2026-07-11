@echo off
title VOX Admin Portal
echo ========================================
echo   VOX Admin Portal - One Click Start
echo ========================================
echo.

:: ── Redis ──────────────────────────────────────────────────
netstat -ano | findstr :6379 | findstr LISTENING >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Redis...
    if exist "D:\Vox\redis\redis-server.exe" (
        start /B "Redis" "D:\Vox\redis\redis-server.exe" "D:\Vox\redis\redis.windows-service.conf"
        timeout /t 2 /nobreak >nul
        echo   Redis started on port 6379
    ) else (
        echo   Redis not found, skipping...
    )
) else (
    echo Redis already running on port 6379
)

:: ── MySQL ──────────────────────────────────────────────────
netstat -ano | findstr :3306 | findstr LISTENING >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting MySQL...
    if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" (
        start /B "MySQL" "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --no-defaults --basedir="C:\Program Files\MySQL\MySQL Server 8.0" --datadir="D:\Vox\temp\mysql-data" --port=3306 --bind-address=127.0.0.1 --console
        timeout /t 6 /nobreak >nul
        echo   MySQL started on port 3306
    ) else (
        echo   MySQL not found, skipping...
    )
) else (
    echo MySQL already running on port 3306
)

:: ── Backend ─────────────────────────────────────────────────
netstat -ano | findstr :4000 | findstr LISTENING >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting VOX Backend on port 4000...
    start "VOX Backend" cmd /k "cd /d "%~dp0backend" && node server.js"
    timeout /t 4 /nobreak >nul
) else (
    echo VOX Backend already running on port 4000
)

:: ── Admin Portal ───────────────────────────────────────────
echo.
echo Starting Admin Portal...
echo.

if not exist "%~dp0admin\node_modules" (
    echo Installing admin dependencies ^(first time^)...
    cd /d "%~dp0admin"
    call npm install
    echo.
)

echo ========================================
echo   Admin Portal starting on port 5173
echo   Opening browser automatically...
echo ========================================
echo.

:: Use start /D to set the working directory for the new process
start "Admin Portal" /D "%~dp0admin" cmd /k "npx vite --port 5173"

:: Wait for Vite to be ready, then open browser
timeout /t 6 /nobreak >nul
start "" "http://localhost:5173"

echo Admin Portal is running!
echo.
pause
