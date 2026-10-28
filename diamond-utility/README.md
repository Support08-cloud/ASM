# Diamond Utility

Premium desktop-style utility for organizing local diamond folders and extracting MP4s.

Core workflow:

```text
SELECT INPUT → SCAN → IDENTIFY DIAMOND GROUPS → SEARCH → SELECT VARIANTS → GET MP4 → RESULT
```

Related folders are grouped by their common prefix / diamond name. Views are `-1`, `-2`, `-RG`, or any letter name such as `-front`, `-PV`, `-top`. Numeric stone IDs like `260602-362` stay one diamond.

Example:

```text
Input
├── 260602-362
├── 260602-362-1
├── 260602-362-2
├── 260602-362-3
└── 260602-362-RG

Output_Testing
└── 260602-362
    ├── 260602-362-1.mp4
    ├── 260602-362-2.mp4
    ├── 260602-362-3.mp4
    └── 260602-362-RG.mp4
```

The base folder (`260602-362`) is listed with its variants so you can choose it, but it is not copied unless you select it and it contains an MP4. Source files are never modified.

## Get the Windows app

GitHub Actions on this branch builds a folder you extract once. It does not unpack itself into a temporary directory on every launch.

1. Open the **windows-exe** workflow on https://github.com/Support08-cloud/ASM/actions
2. Open the latest successful run on `cursor/diamond-utility-exe-9839`
3. Download the artifact **DiamondUtility-win-x64**
4. Extract the whole zip to a folder on this PC
5. Open the folder that contains `START-HERE.txt` and double-click `DiamondUtility.exe`

Leave every file in that folder together. If Windows SmartScreen appears, choose **More info → Run anyway**. This is an internal unsigned utility.

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

Open http://localhost:5173, load the sample dataset, search `260602-362`, select the `-1`, `-2`, `-3`, and `-RG` folders, then **Get MP4**. On Operations, click **Edit videos** for the CapCut-style timeline (trim, speed, transitions, export).

```bash
npm test
npm run build
npm run electron:dev
```
