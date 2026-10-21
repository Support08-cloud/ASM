# Vision360 Bulk Data Extractor

Windows desktop app that copies files and folders from a source directory when their names match IDs in an Excel file.

The ready-to-run program is [dist/Vision360.BulkDataExtractor.exe](dist/Vision360.BulkDataExtractor.exe). It needs the .NET 8 Desktop Runtime. Download that file, copy it to the Windows PC, and double-click it.

```text
Download template → fill NAME ID → upload → choose source and destination → Start Copying
```

The source is never deleted, moved, or modified. Copying starts only after you confirm it.

## What it copies

For each ID, the app searches every nested folder in the source.

- A folder whose name matches the ID is copied with all of its files and subfolders.
- A file matches when its name, or its name without the extension, equals the ID. `10005.mp4` matches `10005`. `10005.extra.mp4` does not.
- Leading zeros are kept. `00123` and `123` are different IDs.
- Matching ignores letter case, same as Windows file names.
- The matched item is placed in the destination under its own name. `D:\DiamondData\Batch\10001` becomes `E:\ExtractedData\10001`.
- If two matches would use the same destination name, the extra match is saved beside it and written to the log.
- Existing destination files are skipped unless you choose overwrite and confirm it.
- IDs that are not in the source are listed as missing. If nothing matches, the app says so and does not report a successful copy.

## Build

Requires the .NET 8 SDK.

```bash
cd vision360-bulk-extractor
dotnet test
dotnet build src/Vision360.BulkExtractor.App -c Release
```

## Windows executable

On a Windows machine, or in GitHub Actions (`windows-latest`):

```bash
dotnet publish src/Vision360.BulkExtractor.App/Vision360.BulkExtractor.App.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

The executable is:

```text
src/Vision360.BulkExtractor.App/bin/Release/net8.0-windows/win-x64/publish/Vision360.BulkDataExtractor.exe
```

A framework-dependent build is `dotnet build -c Release` and needs the .NET 8 Desktop Runtime.

Logs are saved under `%LocalAppData%\Vision360\BulkDataExtractor\logs`.
