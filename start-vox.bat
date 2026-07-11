@echo off
REM VOX All-in-One Startup Script
REM Run this as Administrator to start MySQL, Redis, backend, and frontend.

REM ── Redis ──────────────────────────────────────────────────
netstat -ano | findstr :6379 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting Redis...
    start /B "Redis" "D:\Vox\redis\redis-server.exe" "D:\Vox\redis\redis.windows-service.conf"
    timeout /t 2 /nobreak >nul
) else (
    echo Redis already running.
)

REM ── MySQL ──────────────────────────────────────────────────
netstat -ano | findstr :3306 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting MySQL...
    start /B "MySQL" "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" "--datadir=D:\Vox\mysql-data" "--console"
    timeout /t 6 /nobreak >nul
) else (
    echo MySQL already running.
)

REM ── Backend ─────────────────────────────────────────────────
netstat -ano | findstr :4000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting VOX Backend...
    cd /d D:\Vox\backend
    start /B "VOX-Backend" node server.js
    timeout /t 2 /nobreak >nul
) else (
    echo VOX Backend already running.
)

REM ── Frontend ────────────────────────────────────────────────
netstat -ano | findstr :3000 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo Starting VOX Frontend...
    cd /d D:\Vox\frontend
    start /B "VOX-Frontend" npm run dev
) else (
    echo VOX Frontend already running.
)

echo.
echo  All services started.
echo  Frontend:  http://127.0.0.1:3000
echo  Backend:   http://127.0.0.1:4000
echo.
pause
