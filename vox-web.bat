@echo off
chcp 65001 >nul
title VOX Web Dev
cd /d D:\Vox

:: ── MySQL ──────────────────────────────────────────────────────
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" (
        if not exist "D:\Vox\temp\mysql-data" mkdir "D:\Vox\temp\mysql-data"
        start "" /MIN "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --no-defaults --basedir="C:\Program Files\MySQL\MySQL Server 8.0" --datadir="D:\Vox\temp\mysql-data" --port=3306 --bind-address=127.0.0.1 --console
        timeout /t 4 /nobreak >NUL
    )
)

:: ── Backend ────────────────────────────────────────────────────
start "VOX Backend" cmd /k "cd /d D:\Vox\backend && node server.js"
timeout /t 5 /nobreak >NUL

:: ── Frontend (Vite) ───────────────────────────────────────────
start "VOX Frontend" cmd /k "cd /d D:\Vox\frontend && npx vite"
timeout /t 6 /nobreak >NUL

:: ── Open browser ──────────────────────────────────────────────
start "" "http://127.0.0.1:3001"
