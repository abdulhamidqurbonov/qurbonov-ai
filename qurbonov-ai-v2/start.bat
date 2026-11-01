@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist .env (
  copy .env.example .env >nul
  echo .env fayl yaratildi. Unga API kalitingizni qo'ying, keyin start.bat ni qayta bosing.
  notepad .env
  exit /b
)
python -m pip install -q -r requirements.txt || (echo Python topilmadi! python.org dan o'rnating. & pause & exit /b)
python run.py
pause
