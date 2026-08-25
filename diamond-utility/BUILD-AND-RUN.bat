@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)

echo Installing dependencies...
call npm ci
if errorlevel 1 (
  call npm install
)

echo Building DiamondUtility.exe ...
call npm run build:win
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

if exist "release\DiamondUtility.exe" (
  start "" "release\DiamondUtility.exe"
) else (
  echo Could not find release\DiamondUtility.exe
  pause
  exit /b 1
)
