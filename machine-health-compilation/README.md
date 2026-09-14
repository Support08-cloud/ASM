# V360 Machine Health — Machine-1 data compilation

Professional compilation for data managers and technical teams.

**Live `D:\demo` files were not on this VM.** This folder is built from verified
`sample_capture_data` fixtures in [v360-machine-health](https://github.com/Support08-cloud/v360-machine-health) commit `1af6f9d`.
The fixtures are synthetic demonstration content, not calibrated production measurements.

## Folder hierarchy

```
machine-health-compilation/
  README.md                              This file: structure, purpose, assumptions
  SOURCES.md                             Every path searched or read (maintained separately)
  datasheet/
    machine-1-datasheet.md               Human-readable key fields and inventories
    machine-1-comparison.json            Machine vs ideal vs EDF, stone-wise
  reference/
    machine-1-comparison.html            Side-by-side comparison (opens locally)
  machine-1/                             MACHINE-1 analog, stone-wise
    STONE_MAPPING.md
    D-1/ … D-6/                          0.json, still.jpg, video.mp4 if present
  stonewise-ideal-reference/             Ideal_Reference mapped to D-1…D-6
    STONE_MAPPING.md
    D-1/ … D-6/
  b2b-mini-50-edf-reference/             V50_EDF_Reference = B2B mini 5.0 EDF
    STONE_MAPPING.md
    D-1/ … D-6/
  tools/
    build_compilation.py                 Re-runnable extractor (no invented fields)
```

## Purpose of each component

| Path | Purpose |
|---|---|
| `datasheet/machine-1-datasheet.md` | Printable sheet of extracted numbers, missing slots, and formulas |
| `datasheet/machine-1-comparison.json` | Same data for tools; includes per-stone inventories |
| `reference/machine-1-comparison.html` | Browser view with stills and side-by-side fields |
| `machine-1/` | Normalized customer-machine view (Machine 01 / D-*-01) |
| `stonewise-ideal-reference/` | Ideal reference, one folder per stone |
| `b2b-mini-50-edf-reference/` | B2B mini 5.0 EDF reference, one folder per stone |
| `D-n/FILE_INVENTORY.json` | Exact present/absent list for that stone |
| `D-n/README.md` | Alias names (REC-n / M-n) and copy list |

Stone folders keep **original filenames** (`0.json`, `still.jpg`, `video.mp4`).

## Name mapping

The Machine Health generator looks for `D-1`…`D-6`. The customer Windows tree uses
`MACHINE-1`, `M-1`…`M-6`, and `REC-1`…`REC-6`. Those Windows folders were not found here.

| Compilation / sample name | User Windows name | Role |
|---|---|---|
| `Customer_Captures/D-<n>-01` → `machine-1/D-<n>` | `MACHINE-1` / `M-<n>` | Customer machine analog |
| `Ideal_Reference/D-<n>` | `REC-<n>` / ideal master | Ideal reference |
| `V50_EDF_Reference/D-<n>` | B2B mini 5.0 EDF | Upgrade-tier EDF reference |

`V50_Reference` (non-EDF 5.0) also exists in the sample tree. It is **not** copied here
because this compilation is scoped to Machine-1 + ideal + B2B mini 5.0 EDF.

## What was found vs missing

Searched: `/workspace`, `/tmp/v360-machine-health` (cloned), `/home/ubuntu` (Downloads,
Desktop, Machine Health Report), `/tmp`, `/opt/cursor`,
`/home/ubuntu/.cursor/projects/workspace/uploads`. No `D:\` volume on this Linux VM.

| Expected | Status |
|---|---|
| `D:\demo\INPUT\MACHINE-1` | **Not found** |
| `D:\demo\IDEAL_JSON\INPUT` | **Not found** |
| `REC-1`…`REC-6` / `M-1`…`M-6` folders | **Not found** |
| Sample `Customer_Captures/D-1-01`…`D-6-01` | Found (6 stones) |
| Sample `Ideal_Reference/D-1`…`D-6` | Found (6 stones) |
| Sample `V50_EDF_Reference/D-1`…`D-6` | Found (6 stones) |
| `0.json` in those 18 folders | Found (18 / 18) |
| `1.json`–`7.json` in those folders | **Absent** (0 files) |
| Stone-folder HTML | **Absent** |
| `still.jpg` | Found (18 / 18) |
| `video.mp4` | Found (18 / 18), all ASCII placeholders |

Counts from this run: stones=6, JSON parsed=18,
failed=0, `1.json`–`7.json` found=0.

A richer viewer demo at `integrated_direct_json_viewer/data/` contains `0.json`, `4.json`,
`5.json`, `6.json` with embedded images (MachineName `V360 Technetronic LLP`). Those files
are **not** Machine-1 captures and were **not** copied (large embedded JPEGs; different machine).

## Assumptions

- Live D:\demo Machine-1 / IDEAL_JSON files were not on this VM. Compilation uses the v360-machine-health sample_capture_data fixtures at commit 1af6f9d.
- Machine 01 (flat suffix -01) is treated as the MACHINE-1 analog because that is the only complete customer machine labeled Machine 01 in the fixtures.
- Stone folders are named D-1..D-6 because those are the actual source folder names. REC-1..REC-6 and M-1..M-6 are documented aliases only.
- RGB Euclidean distance uses visionProfile.currentProfile R/G/B integers (or parsed equivalents).
- OldRGB strings such as RGB(247, 244, 249) are parsed to three integers before distance is computed.
- Wrapped JSON (array envelope, payload wrapper, Pascal-case Payload) is unwrapped using the same capture/payload walk as the V360 generator.
- 1.json–7.json and HTML were not present in these sample stone folders and are labeled absent. They were not invented.
- video.mp4 files are 29-byte ASCII placeholders, not playable video.
- still.jpg pixel size is 520x360 on disk. JSON width/height declare 1920x1080. Both values are reported; neither is altered.
- No composite health score was computed. Upstream validation report scores are cited only as a separate-document note.

## How to regenerate

```bash
python3 machine-health-compilation/tools/build_compilation.py
```

Requires the sample tree at `/tmp/v360-machine-health` checked out to `1af6f9d`.
