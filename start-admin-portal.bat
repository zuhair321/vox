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

:: ── PostgreSQL ──────────────────────────────────────────────
netstat -ano | findstr :5432 | findstr LISTENING >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting PostgreSQL...
    if exist "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" (
        start /B "PostgreSQL" "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" -l "D:\Vox\temp\pg.log"
        timeout /t 6 /nobreak >nul
        echo   PostgreSQL started on port 5432
    ) else (
        echo   PostgreSQL not found, skipping...
    )
) else (
    echo PostgreSQL already running on port 5432
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
