@echo off
chcp 65001 >nul
title Qurbonov AI - mahalliy server
cd /d "%~dp0public"
echo.
echo  Qurbonov AI olami ishga tushyapti...
echo  Brauzerda oching:  http://localhost:8000/world.html
echo  To'xtatish uchun shu oynani yoping.
echo.
start "" http://localhost:8000/world.html
where python >nul 2>nul && (python -m http.server 8000 & goto :eof)
where py >nul 2>nul && (py -m http.server 8000 & goto :eof)
where npx >nul 2>nul && (npx --yes http-server -p 8000 -c-1 & goto :eof)
echo  Python yoki Node.js topilmadi. python.org dan Python o'rnating (Add to PATH belgisini qo'ying).
pause
