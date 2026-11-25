@echo off
setlocal
chcp 65001 >nul
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Для запуска нужен Node.js 24.
  pause
  exit /b 1
)

set "QA_WORKSHOP_BROWSER="
for %%B in (
  "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
  "%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe"
  "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  "%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do if not defined QA_WORKSHOP_BROWSER if exist "%%~B" set "QA_WORKSHOP_BROWSER=%%~B"

set "QA_WORKSHOP_PROFILE=%~dp0.profile"
set "TEMP=D:\CodexTools\Runtime\temp"
set "TMP=%TEMP%"
if not exist "%TEMP%\." mkdir "%TEMP%"
if not defined QA_WORKSHOP_BROWSER echo Brave, Edge или Chrome не найдены. Открой адрес ниже в браузере с профилем на D.
node "%~dp0server.mjs" --open
set "QA_WORKSHOP_EXIT=%ERRORLEVEL%"
if not "%QA_WORKSHOP_EXIT%"=="0" pause
exit /b %QA_WORKSHOP_EXIT%
