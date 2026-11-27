@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-platform.ps1" -Action publish
pause
