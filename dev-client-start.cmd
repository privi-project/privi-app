@echo off
setlocal enabledelayedexpansion

set "NODEDIR=%~dp0..\website\tools\node"
set "PATH=!NODEDIR!;!PATH!"

cd /d "%~dp0"
npx expo start --dev-client
