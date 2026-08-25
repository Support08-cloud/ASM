# Diamond File Router

Internal Vision 360 Windows utility that copies diamond/stone files from an Input location into **existing** Output stone folders.

This is an offline, staff-only desktop tool. It does not use cloud services, telemetry, authentication servers, or the internet.

## What it does

1. Select Input (files, a folder, or mixed items) and an Output directory of existing stone folders.
2. **Analyze** builds a preview plan. Nothing is copied in this step.
3. Review matches, unmatched files, and duplicates.
4. **Start processing** copies files (default) into the matching Output folders.
5. A timestamped CSV/JSON/TXT report is written locally and the session is stored in local SQLite history.

Unmatched files are reported. The app **never creates** a new Output stone folder automatically.

## Matching (no fuzzy guessing)

1. Filename without extension equals an Output folder name (`abc.html` → `abc\`).
2. Filename begins with a known Stone ID plus a suffix separator (`E-2500600-15-30_preview.html`).
3. A parent folder name matches an Output folder (nested batches).
4. The item is a folder whose name matches an Output folder.

Ambiguous or unknown items stay unmatched.

## Safety

- Default mode is **Copy**. Input files are not modified.
- **Move** is explicit and confirmed.
- Duplicates default to **Skip**. Replace requires confirmation. Rename uses `name (1).ext`.
- Input and Output cannot be the same path, and nested Input/Output pairs are rejected.
- Copies stream through a `.dfr.tmp` file, then rename, so cancel/error does not leave a corrupt destination.
- Per-file errors do not stop the batch.

## Branding

The UI follows Vision 360 identity used across internal tools:

| Token | Value |
| --- | --- |
| Ink | `#111111` |
| Copper | `#C06618` |
| Paper | `#FBF8F4` |
| Cream | `#F7F1EA` |
| Line | `#E6D5C3` |
| Stone | `#6D6E71` |
| Danger | `#B42318` |
| OK | `#067647` |

Logo assets live in `src/DiamondFileRouter.App/Assets/`.

## Run it (Windows)

On a Windows PC, open this folder and **double-click `BUILD-AND-RUN.bat`**.

The first time it will install/build if needed, then open the app. After that, the EXE is:

`artifacts\DiamondFileRouter\win-x64\DiamondFileRouter.exe`

You can also publish manually:

```powershell
.\scripts\publish-windows.ps1
```

Requires the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (Windows x64).

The publish is **self-contained**. Another Windows PC does not need Visual Studio or a .NET runtime installed.

Run tests:

```powershell
dotnet test tests/DiamondFileRouter.Core.Tests/DiamondFileRouter.Core.Tests.csproj -c Release
```

## Local data (this PC only)

`%AppData%\Vision360\DiamondFileRouter\`

- `settings.json`
- `history.db`
- `Logs\`
- `Reports\`

## Architecture

| Layer | Project |
| --- | --- |
| UI | `DiamondFileRouter.App` (WPF) |
| Engine | `DiamondFileRouter.Core` |
| Tests | `DiamondFileRouter.Core.Tests` |

The matching engine is independent of WPF so it can be tested without the desktop shell.
