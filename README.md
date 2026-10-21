# ASM

Internal Vision 360 utilities.

## Vision360 Bulk Data Extractor

Windows app that copies files and folders matching `NAME ID` values from an Excel list. See [vision360-bulk-extractor/README.md](vision360-bulk-extractor/README.md).

```bash
cd vision360-bulk-extractor
dotnet test
dotnet build src/Vision360.BulkExtractor.App -c Release
```

## Diamond Utility

Desktop-style local diamond data processor (scan → select → Get MP4).

```bash
cd diamond-utility
npm install
npm run dev
```
