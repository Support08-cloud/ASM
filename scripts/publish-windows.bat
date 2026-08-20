@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0publish-windows.ps1" %*
if errorlevel 1 exit /b 1
