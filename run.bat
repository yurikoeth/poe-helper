@echo off
title ExiledOrb
set PATH=%USERPROFILE%\AppData\Roaming\npm;%USERPROFILE%\.cargo\bin;%PATH%
cd /d "%~dp0apps\overlay"
call pnpm tauri dev
pause
