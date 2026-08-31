$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..
npm ci
npm run build:win
Write-Host "Built: $(Resolve-Path .\release\DiamondUtility.exe)"
