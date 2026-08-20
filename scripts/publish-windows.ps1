@param(
    [ValidateSet("win-x64", "win-x86", "win-arm64")]
    [string]$Runtime = "win-x64"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

dotnet restore DiamondFileRouter.sln
dotnet test tests/DiamondFileRouter.Core.Tests/DiamondFileRouter.Core.Tests.csproj -c Release --nologo
dotnet publish src/DiamondFileRouter.App/DiamondFileRouter.App.csproj `
    -c Release `
    -r $Runtime `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:EnableCompressionInSingleFile=true `
    -p:DebugType=None `
    -p:DebugSymbols=false `
    -o "artifacts/DiamondFileRouter/$Runtime"

Write-Host ""
Write-Host "Published: artifacts/DiamondFileRouter/$Runtime/DiamondFileRouter.exe"
Write-Host "This EXE is offline, self-contained, and does not open a console window."
