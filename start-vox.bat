@echo off
chcp 65001 >nul
cd /d C:\vox
echo Starting VOX servers...
echo.

start "VOX Backend" cmd /k "cd /d C:\vox && node backend\server.js"
start "VOX Frontend" cmd /k "cd /d C:\vox && node frontend\static-server.js"

echo VOX is starting...
echo Backend: http://127.0.0.1:4000
echo Frontend: http://127.0.0.1:3000
echo.
pause
