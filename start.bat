@echo off
title WhatsApp Monks - Starting All Services
echo.
echo ========================================
echo   WhatsApp Monks - Starting Services
echo ========================================
echo.

:: Start Node.js WhatsApp Engine
echo [1/3] Starting WhatsApp Engine on port 3001...
start "WhatsApp Engine" cmd /k "cd /d %~dp0whatsapp-engine && node server.js"
timeout /t 2 /nobreak >nul

:: Start Vite Dev Server
echo [2/3] Starting Vite dev server...
start "Vite Dev" cmd /k "cd /d %~dp0 && npm run dev"
timeout /t 2 /nobreak >nul

:: Start Laravel
echo [3/3] Starting Laravel on port 8000...
start "Laravel" cmd /k "cd /d %~dp0 && php artisan serve"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo   Laravel:    http://127.0.0.1:8000
echo   WA Engine:  http://127.0.0.1:3001
echo   Vite:       http://127.0.0.1:5173
echo.
echo   Admin:  admin@whatsappmonks.com / admin123456
echo   Client: client@whatsappmonks.com / client123456
echo.
echo   Close this window or press Ctrl+C to stop info display.
echo   Close individual service windows to stop them.
echo ========================================
pause
