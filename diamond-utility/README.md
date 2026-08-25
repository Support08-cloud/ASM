# Diamond Utility

Premium desktop-style utility for organizing local diamond folders and extracting MP4s.

Core workflow:

```text
SOURCE → SCAN → SEARCH → SELECT → GET MP4 → RESULT
```

Folders such as `Krish_Front`, `Krish_3D`, `Krish_Top`, `Krish_360`, and `Krish_ER` are grouped into one diamond record (`KRISH`) with view-level status. Source files are never modified.

## Get the Windows EXE

GitHub Actions on this branch builds `DiamondUtility.exe`.

1. Open the **Diamond Utility** workflow run: https://github.com/Support08-cloud/ASM/actions
2. Open the latest successful run on `cursor/diamond-data-utility-9839`
3. Download the artifact **DiamondUtility-win-x64**
4. Unzip it and double-click `DiamondUtility.exe`

If Windows SmartScreen appears, choose **More info → Run anyway**. This is an internal unsigned utility.

To rebuild on a Windows PC with Node.js:

```bat
BUILD-AND-RUN.bat
```

## Run in the browser

```bash
cd diamond-utility
npm install
npm run dev
```

Open http://localhost:5173 and click **Load sample dataset**.

```bash
npm test
npm run build
npm run electron:dev
```
