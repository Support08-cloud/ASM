# Sources read and search results

Only paths listed here were opened or hashed during this compilation. Nothing else was inferred as a measurement.

## Live customer locations — not found

| Path | Result |
|---|---|
| `D:\demo\INPUT\MACHINE-1` | No `D:` volume on this Linux VM |
| `D:\demo\IDEAL_JSON\INPUT` | Not found |
| `D:\demo\IDEAL_JSON\INPUT\MACHINE-*` | Not found |
| `/workspace` MACHINE-1 / IDEAL_JSON / REC-* / M-* | Not found (repo is diamond-utility + README) |
| `/home/ubuntu/Downloads` | Image-studio zips/html only; no V360 captures |
| `/home/ubuntu/Desktop` | Not present |
| `/home/ubuntu/Machine Health Report` | Not present |
| `/home/ubuntu/.cursor/projects/workspace/uploads` | `image-resize-tool_c9f5.html` only |
| `/opt/cursor` capture trees | No MACHINE-1 / IDEAL_JSON / EDF capture folders |
| `/tmp`, `/mnt`, `/media`, `/home/ubuntu` (re-search 2026-09-14 report run) | Still no live `D:\demo`, `MACHINE-1`, `IDEAL_JSON`, `REC-1`, or EDF capture trees |

## Fixtures used (v360-machine-health commit `1af6f9d`)

Cloned to `/tmp/v360-machine-health` from `https://github.com/Support08-cloud/v360-machine-health`.
Current `main` on that repo has 8 docs only. The 243-file tree is commit `1af6f9d`.

### Machine-1 analog — Customer_Captures D-*-01 (all read)

- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-1-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-2-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-3-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-4-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-5-01/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Customer_Captures/D-6-01/0.json`

### Ideal reference (all read)

- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-1/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-2/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-3/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-4/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-5/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/Ideal_Reference/D-6/0.json`

### B2B mini 5.0 EDF (all read)

- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-1/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-2/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-3/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-4/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-5/0.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_EDF_Reference/D-6/0.json`

### Context files read (not used as Machine-1 measurements)

- `/tmp/v360-machine-health/executed_source/sample_capture_data/README_SAMPLE_DATA.md`
- `/tmp/v360-machine-health/machine_health_validation_report.md`
- `/tmp/v360-machine-health/executed_source/demo_outputs/manifest.json`
- `/tmp/v360-machine-health/executed_source/sample_capture_data/nested/Customer_Nested/Machine Alpha/D-1/0.json` (nested layout check; MachineName `Machine Alpha`)
- `/tmp/v360-machine-health/executed_source/sample_capture_data/flat/V50_Reference/D-1/0.json` (non-EDF 5.0; not copied into this compilation)
- `/tmp/v360-machine-health/integrated_direct_json_viewer/data/actual/0.json` (keys only; MachineName `V360 Technetronic LLP`; not Machine-1)
- `/tmp/v360-machine-health/integrated_direct_json_viewer/data/reference/0.json` (keys only)
- `/tmp/v360-machine-health/executed_source/src/generator_runtime.js` (unwrap / parse helpers, for extraction alignment)
- `/tmp/v360-machine-health/executed_source/demo_outputs/generator_audit_data.json` (path/time cross-check only)

### Media inspected

- All 18 `still.jpg` files: JPEG SOF size **520 × 360**, 8-bit
- All 18 `video.mp4` files: 29-byte ASCII `V360-SAMPLE-VIDEO-PLACEHOLDER`
- `Customer_Captures/D-6-03`: `0.json` + `video.mp4` only (no still). That folder is Machine 03, not used as Machine-1.

## Not reverse-engineered

No EXEs or DLLs from the Windows package were opened for logic extraction.
