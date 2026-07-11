@echo off
chcp 65001 >nul
title VOX Web Dev
cd /d D:\Vox

:: ── PostgreSQL ──────────────────────────────────────────────────────
tasklist /FI "IMAGENAME eq postgres.exe" 2>NUL | find /I "postgres.exe" >NUL
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" (
        start "" /MIN "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" -l "D:\Vox\temp\pg.log"
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
