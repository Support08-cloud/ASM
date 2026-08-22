# Diamond File Router

Internal VISION 360° Windows utility that copies diamond/stone files from an Input location into **existing** Output stone folders.

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

The UI follows **V360 Brand Guideline v2.0** (`V360_Brand_Guideline_Master_Package`). Official logos are used as supplied — they are not redrawn.

| Token | Hex | Role in this EXE |
| --- | --- | --- |
| V360 Orange | `#C6691D` | Accent only (~10%): CTA fill, active nav bar, H4 labels |
| Orange 700 | `#8E4A12` | Orange button hover / pressed path |
| Charcoal | `#2B2A29` | Body text, technical header, footer band, secondary buttons |
| White | `#FEFEFE` | Page background |
| Cloud Grey | `#EBECEC` | Alternating table rows, soft chips |
| Cream | `#FFF6E0` | Warm info bands |
| Ice Blue | `#E4F6F8` | Technical table headers |
| Navy | `#011843` | Sidebar (V360.Tech / technical interface) |
| Slate | `#34434D` | Charcoal button hover |
| Success / Warning / Error / Info | `#2E7D32` / `#E0A800` / `#C62828` / `#1565C0` | Status only — never used as brand decoration |

Layout rules applied:

- Charcoal header bar (32 px), no orange stripe at the top
- Footer: 4 px orange stripe + 32 px charcoal band
- Product family strip: Studio · **Tech** · Micro · Measure · Light (current product in orange)
- Cards 8 px radius, controls 4 px radius
- Type: Gill Sans MT, then Verdana, then Segoe UI
- Degree symbol is `°` (U+00B0)

Official assets live in `src/DiamondFileRouter.App/Assets/` (`logo.png`, `logo-white.png`, `powered-by*.png`, `app.ico`).

## Build the Windows EXE

Requires Windows with the [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (including the Windows desktop workload).

```powershell
.\scripts\publish-windows.ps1
```

Output:

`artifacts/DiamondFileRouter/win-x64/DiamondFileRouter.exe`

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
