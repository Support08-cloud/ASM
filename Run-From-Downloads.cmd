@echo off
title Diamond File Router
color 0F

set "APPDIR=C:\Users\SPT2\Downloads\ASM-cursor-diamond-file-router-d058"
set "EXE=%APPDIR%\artifacts\DiamondFileRouter\win-x64\DiamondFileRouter.exe"

echo.
echo  Diamond File Router
echo  Do not use BUILD-AND-RUN.bat
echo.

if not exist "%APPDIR%\src\DiamondFileRouter.App\DiamondFileRouter.App.csproj" (
    echo  Project folder not found:
    echo  %APPDIR%
    echo.
    echo  Unzip the GitHub ZIP into Downloads first.
    pause
    exit /b 1
)

cd /d "%APPDIR%"

where dotnet >nul 2>&1
if errorlevel 1 (
    echo  .NET 8 SDK is missing.
    start "" "https://dotnet.microsoft.com/download/dotnet/8.0"
    pause
    exit /b 1
)

echo  Building. Wait for this to finish...
echo.
dotnet publish "src\DiamondFileRouter.App\DiamondFileRouter.App.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "artifacts\DiamondFileRouter\win-x64"
if errorlevel 1 (
    echo.
    echo  Build failed. Copy the red text and send it.
    pause
    exit /b 1
)

if not exist "%EXE%" (
    echo  EXE was not created at:
    echo  %EXE%
    pause
    exit /b 1
)

echo.
echo  EXE is here:
echo  %EXE%
echo.
start "" "%EXE%"
exit /b 0
