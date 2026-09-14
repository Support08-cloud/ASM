# Machine-1 comparison data sheet

Audience: data managers and technical teams.

**Data class:** synthetic sample fixtures. Live `D:\demo\INPUT\MACHINE-1` and `D:\demo\IDEAL_JSON` files were **not** available on this VM.

Source: `https://github.com/Support08-cloud/v360-machine-health` commit `1af6f9d`.

## Provenance and mapping

| User name | What was used |
|---|---|
| MACHINE-1 | `Customer_Captures/D-<stone>-01` (JSON `MachineName` = `Machine 01`) |
| Ideal / REC-1…REC-6 | `Ideal_Reference/D-1`…`D-6` |
| B2B mini 5.0 EDF | `V50_EDF_Reference/D-1`…`D-6` (`MachineName` = `V360 5.0 EDF`) |

## Counts

- Stones compiled: 6 (D-1…D-6)
- JSON files read and parsed: 18 (failed: 0)
- Stone folders with `0.json`: 18 / 18
- Stone folders with still image: 18 / 18
- Stone folders with `video.mp4`: 18 / 18
- Stone folders with HTML: 0 / 18
- `1.json`–`7.json` files found in these stone folders: 0
- Live MACHINE-1 / REC-* / M-* folders found: 0

## Key extracted fields (from each `0.json`)

| Stone | Type | Machine RGB | Ideal RGB | EDF RGB | RGB dist M–I | RGB dist M–EDF | Old→New M | Old→New I | Old→New EDF | Sharp M/I/EDF | Contrast M/I/EDF | Time M/I/EDF (s) | Time ratio M/I |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|---:|
| D-1 | Round | 205, 209, 221 | 204, 210, 220 | 205, 211, 221 | 1.732 | 2 | 6.928 | 5.196 | 5.196 | 4 / 4 / 7 | 0 / 0 / 0 | 45 / 41 / 49 | 1.0976 |
| D-2 | Oval | 210, 212, 220 | 208, 212, 218 | 209, 213, 219 | 2.828 | 1.732 | 6.928 | 5.196 | 5.196 | 4 / 4 / 7 | 0 / 0 / 0 | 46 / 42 / 50 | 1.0952 |
| D-3 | Cushion | 200, 204, 216 | 200, 206, 216 | 201, 207, 217 | 2 | 3.317 | 6.928 | 5.196 | 5.196 | 4 / 4 / 7 | 0 / 0 / 0 | 47 / 43 / 51 | 1.093 |
| D-4 | Princess | 213, 215, 225 | 212, 216, 224 | 213, 217, 225 | 1.732 | 2 | 6.928 | 5.196 | 5.196 | 4 / 4 / 7 | 0 / 0 / 0 | 48 / 44 / 52 | 1.0909 |
| D-5 | Emerald | 204, 209, 221 | 202, 209, 219 | 203, 210, 220 | 2.828 | 1.732 | 6.928 | 5.196 | 5.196 | 4 / 4 / 7 | 0 / 0 / 0 | 49 / 45 / 53 | 1.0889 |
| D-6 | Pear | 206, 209, 221 | 206, 211, 221 | 207, 212, 222 | 2 | 3.317 | 6.928 | 5.196 | 5.196 | 4 / 4 / 7 | 0 / 0 / 0 | 50 / 46 / 54 | 1.087 |

## Camera and exposure (same on all six stones in these fixtures)

Values below are from Machine 01 D-1 `0.json` and were checked stone-by-stone. If a later stone differed, it is listed under Exceptions.

| Field | Machine 01 | Ideal | 5.0 EDF |
|---|---|---|---|
| Camera | Canon EOS R8 | Canon EOS R8 | Canon EOS R8 |
| MachineName | Machine 01 | Ideal Reference | V360 5.0 EDF |
| AV | 8.0 | 8.0 | 8.0 |
| TV | 1/80 | 1/80 | 1/80 |
| ISO | 100 | 100 | 100 |
| WB | Color Temperature | Color Temperature | Color Temperature |
| K | 5600 | 5600 | 5600 |
| width | 1920.0 | 1920.0 | 1920.0 |
| height | 1080.0 | 1080.0 | 1080.0 |
| ImageQuality | Fine | Fine | Fine |

### Exceptions

- None. Camera/exposure/size/ImageQuality matched D-1 on every stone in all three tiers.

## JSON wrap styles actually observed

| Stone | Machine | Ideal | EDF |
|---|---|---|---|
| D-1 | direct-object | direct-object | direct-object |
| D-2 | direct-object | direct-object | direct-object |
| D-3 | direct-object | direct-object | payload-pascal-case |
| D-4 | direct-object | direct-object | direct-object |
| D-5 | direct-object | array-envelope | direct-object |
| D-6 | array-envelope | payload-wrapper | direct-object |

## File inventory (expected V360 slots)

In every compiled stone folder for all three tiers:

- Present: `0.json`, `still.jpg`, `video.mp4`
- Absent: `1.json`, `2.json`, `3.json`, `4.json`, `5.json`, `6.json`, `7.json`, HTML
- `still.jpg` on disk: 520 × 360 px JPEG (verified from SOF marker). JSON `width`/`height`: 1920 × 1080.
- `video.mp4` on disk: 29 bytes, ASCII text `V360-SAMPLE-VIDEO-PLACEHOLDER`. Not a playable MP4.

## Comparison formulas (computed only from extracted numbers)

- RGB Euclidean distance: `sqrt((R1-R2)² + (G1-G2)² + (B1-B2)²)`
- OldRGB → NewRGB correction distance: same formula on the parsed OldRGB and NewRGB triples
- Sharpness / contrast absolute difference: `|a − b|`
- TotalTime ratio: `machine_seconds / reference_seconds` after parsing `HH:MM:SS`

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

## Separate-document note (not recomputed here)

The upstream file `machine_health_validation_report.md` at commit 1af6f9d states that the generator scored Machine 01 composite **95** (Healthy). That score is a generator output with provisional constants. This compilation does **not** reproduce or endorse that score.

## Source files read

- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-1-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-2-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-3-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-4-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-5-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-6-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-1/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-2/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-3/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-4/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-5/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-6/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-1/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-2/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-3/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-4/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-5/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-6/0.json`
