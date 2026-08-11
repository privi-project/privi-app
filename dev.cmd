@echo off
setlocal enabledelayedexpansion

REM Point to shared portable Node installation in website/tools/node
set "NODEDIR=%~dp0..\website\tools\node"
set "PATH=!NODEDIR!;!PATH!"

cd /d "%~dp0"
npm run start
