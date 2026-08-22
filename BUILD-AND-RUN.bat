@echo off
title Diamond File Router
cd /d "%~dp0"

echo.
echo  Diamond File Router
echo  Vision 360  -  internal use only
echo.

where dotnet >nul 2>&1
if errorlevel 1 (
    echo  .NET 8 is not installed on this PC.
    echo.
    echo  1. Open: https://dotnet.microsoft.com/download/dotnet/8.0
    echo  2. Install the .NET 8 SDK  ^(Windows x64^)
    echo  3. Close this window and double-click BUILD-AND-RUN.bat again.
    echo.
    start "" "https://dotnet.microsoft.com/download/dotnet/8.0"
    pause
    exit /b 1
)

if not exist "artifacts\DiamondFileRouter\win-x64\DiamondFileRouter.exe" (
    echo  Building the app. This can take a few minutes the first time...
    echo.
    powershell -ExecutionPolicy Bypass -File "%~dp0scripts\publish-windows.ps1"
    if errorlevel 1 (
        echo.
        echo  Build failed. A Windows PC with the .NET 8 SDK is required.
        pause
        exit /b 1
    )
)

set "EXE=%~dp0artifacts\DiamondFileRouter\win-x64\DiamondFileRouter.exe"
if not exist "%EXE%" (
    echo  Could not find DiamondFileRouter.exe after the build.
    pause
    exit /b 1
)

echo  Opening Diamond File Router...
start "" "%EXE%"
exit /b 0
