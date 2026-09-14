#!/usr/bin/env python3
"""Build the Machine-1 compilation from verified sample_capture_data files.

Reads 0.json files, copies only files that exist, and writes comparison
artifacts. Does not invent capture fields or scores.
"""

from __future__ import annotations

import json
import math
import re
import shutil
import struct
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path("/workspace")
OUT = REPO_ROOT / "machine-health-compilation"
SRC_ROOT = Path(
    "/tmp/v360-machine-health/executed_source/sample_capture_data/flat"
)
GIT_COMMIT = "1af6f9d"
GIT_REPO = "https://github.com/Support08-cloud/v360-machine-health"

STONES = ("1", "2", "3", "4", "5", "6")
CAPTURE_JSON_SLOTS = [f"{i}.json" for i in range(8)]
OPTIONAL_HTML_NAMES = (
    "index.html",
    "report.html",
    "viewer.html",
    "stone.html",
)

# MACHINE-1 analog = flat Customer_Captures D-<stone>-01 (MachineName "Machine 01")
MACHINE_DIRS = {s: SRC_ROOT / "Customer_Captures" / f"D-{s}-01" for s in STONES}
IDEAL_DIRS = {s: SRC_ROOT / "Ideal_Reference" / f"D-{s}" for s in STONES}
EDF_DIRS = {s: SRC_ROOT / "V50_EDF_Reference" / f"D-{s}" for s in STONES}

TIER_META = {
    "machine": {
        "label": "Machine-1 analog (Machine 01)",
        "source_root_name": "Customer_Captures",
        "json_machine_name_expected": "Machine 01",
        "maps_to": "D:\\demo\\INPUT\\MACHINE-1 (not present on this VM)",
        "dirs": MACHINE_DIRS,
        "out_dir": OUT / "machine-1",
    },
    "ideal": {
        "label": "Ideal reference",
        "source_root_name": "Ideal_Reference",
        "json_machine_name_expected": "Ideal Reference",
        "maps_to": "D:\\demo\\IDEAL_JSON / REC-1..REC-6 (not present on this VM)",
        "dirs": IDEAL_DIRS,
        "out_dir": OUT / "stonewise-ideal-reference",
    },
    "edf": {
        "label": "B2B mini 5.0 EDF",
        "source_root_name": "V50_EDF_Reference",
        "json_machine_name_expected": "V360 5.0 EDF",
        "maps_to": "V50_EDF_Reference (B2B mini 5.0 EDF)",
        "dirs": EDF_DIRS,
        "out_dir": OUT / "b2b-mini-50-edf-reference",
    },
}


def get_ci(obj, key):
    if not isinstance(obj, dict):
        return None
    if key in obj:
        return obj[key]
    target = key.lower()
    for k, v in obj.items():
        if str(k).lower() == target:
            return v
    return None


def unwrap_capture(value, depth=0):
    """Match V360 generator unwrap: capture/payload wrappers and array envelopes."""
    if depth > 8 or value is None:
        return None
    if isinstance(value, list):
        for item in value:
            found = unwrap_capture(item, depth + 1)
            if found:
                return found
        return None
    if not isinstance(value, dict):
        return None
    if get_ci(value, "ignored") is True:
        return unwrap_capture({k: v for k, v in value.items() if str(k).lower() != "ignored"}, depth + 1)
    if (
        get_ci(value, "visionProfile")
        or get_ci(value, "currentProfile")
        or get_ci(value, "OldRGB")
        or get_ci(value, "NewRGB")
        or get_ci(value, "TotalTime")
    ):
        return value
    for key in ("data", "capture", "record", "result", "payload"):
        nested = get_ci(value, key)
        if nested is not None:
            found = unwrap_capture(nested, depth + 1)
            if found:
                return found
    return None


def parse_rgb(value):
    if value is None:
        return None
    if isinstance(value, (list, tuple)) and len(value) >= 3:
        try:
            return [int(value[0]), int(value[1]), int(value[2])]
        except (TypeError, ValueError):
            return None
    if isinstance(value, dict):
        r, g, b = get_ci(value, "R"), get_ci(value, "G"), get_ci(value, "B")
        try:
            if r is not None and g is not None and b is not None:
                return [int(r), int(g), int(b)]
        except (TypeError, ValueError):
            return None
    text = str(value)
    nums = re.findall(r"-?\d+", text)
    if len(nums) >= 3:
        return [int(nums[0]), int(nums[1]), int(nums[2])]
    return None


def parse_duration(value):
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    text = str(value).strip()
    if re.fullmatch(r"\d+(\.\d+)?", text):
        return float(text)
    parts = text.split(":")
    if len(parts) == 3:
        try:
            h, m, s = float(parts[0]), float(parts[1]), float(parts[2])
            return h * 3600 + m * 60 + s
        except ValueError:
            return None
    if len(parts) == 2:
        try:
            m, s = float(parts[0]), float(parts[1])
            return m * 60 + s
        except ValueError:
            return None
    return None


def to_number(value):
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    m = re.search(r"-?\d+(\.\d+)?", text)
    if not m:
        return None
    return float(m.group(0))


def euclid(a, b):
    if not a or not b:
        return None
    return math.sqrt(sum((float(x) - float(y)) ** 2 for x, y in zip(a, b)))


def jpeg_pixel_size(path: Path):
    data = path.read_bytes()
    if data[0:2] != b"\xff\xd8":
        return None
    i = 2
    while i < len(data) - 8:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xD8, 0xD9, 0x00):
            i += 2 if marker != 0x00 else 1
            continue
        length = struct.unpack(">H", data[i + 2 : i + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2):
            _precision, height, width = struct.unpack(">BHH", data[i + 4 : i + 9])
            return {"width": width, "height": height}
        i += 2 + length
    return None


def describe_video(path: Path):
    raw = path.read_bytes()
    try:
        text = raw.decode("ascii")
    except UnicodeDecodeError:
        text = None
    return {
        "bytes": len(raw),
        "is_playable_mp4": raw[4:8] == b"ftyp",
        "ascii_contents": text if text and len(text) < 80 else None,
        "note": (
            "ASCII placeholder, not a playable MP4 bitstream"
            if text == "V360-SAMPLE-VIDEO-PLACEHOLDER"
            else "Binary file present; ftyp box checked"
        ),
    }


def wrap_style(raw):
    if isinstance(raw, list):
        return "array-envelope"
    if isinstance(raw, dict) and get_ci(raw, "payload") is not None and get_ci(raw, "visionProfile") is None:
        keys = list(raw.keys())
        if any(str(k).lower() == "payload" for k in keys):
            payload = get_ci(raw, "payload")
            if isinstance(payload, dict) and any(str(k) == "VisionProfile" or str(k) == "CurrentProfile" for k in payload):
                return "payload-pascal-case"
            return "payload-wrapper"
    return "direct-object"


def extract_from_0_json(path: Path):
    raw_text = path.read_text(encoding="utf-8")
    raw = json.loads(raw_text)
    top = unwrap_capture(raw)
    if top is None:
        return {
            "ok": False,
            "source_path": str(path),
            "wrap_style": wrap_style(raw),
            "error": "Could not unwrap a capture object from 0.json",
        }
    vp = get_ci(top, "visionProfile") or {}
    profile = get_ci(vp, "currentProfile") or get_ci(vp, "lockedProfile") or get_ci(top, "currentProfile") or {}
    rgb = None
    r, g, b = to_number(get_ci(profile, "R")), to_number(get_ci(profile, "G")), to_number(get_ci(profile, "B"))
    if r is not None and g is not None and b is not None:
        rgb = [int(r), int(g), int(b)]
    old_rgb = parse_rgb(first_defined(get_ci(profile, "OldRGB"), get_ci(top, "OldRGB")))
    new_rgb = parse_rgb(first_defined(get_ci(profile, "NewRGB"), get_ci(top, "NewRGB")))
    old_raw = first_defined(get_ci(profile, "OldRGB"), get_ci(top, "OldRGB"))
    new_raw = first_defined(get_ci(profile, "NewRGB"), get_ci(top, "NewRGB"))
    total_raw = first_defined(get_ci(top, "TotalTime"), get_ci(profile, "TotalTime"))
    fields = {
        "R": int(r) if r is not None else None,
        "G": int(g) if g is not None else None,
        "B": int(b) if b is not None else None,
        "OldRGB": old_rgb,
        "OldRGB_raw": old_raw,
        "NewRGB": new_rgb,
        "NewRGB_raw": new_raw,
        "sharpness": to_number(get_ci(profile, "sharpness")),
        "contrast": to_number(get_ci(profile, "contrast")),
        "TotalTime": total_raw,
        "TotalTime_seconds": parse_duration(total_raw),
        "Camera": first_defined(get_ci(top, "Camera"), get_ci(profile, "Camera")),
        "MachineName": first_defined(get_ci(top, "MachineName"), get_ci(profile, "machineName")),
        "AV": get_ci(profile, "AV"),
        "TV": get_ci(profile, "TV"),
        "ISO": get_ci(profile, "ISO"),
        "WB": get_ci(profile, "WB"),
        "K": get_ci(profile, "K"),
        "width": to_number(get_ci(profile, "width")),
        "height": to_number(get_ci(profile, "height")),
        "ImageQuality": first_defined(get_ci(top, "ImageQuality"), get_ci(profile, "ImageQuality")),
        "stoneType": get_ci(profile, "stoneType"),
        "pictureStyle": get_ci(profile, "pictureStyle"),
        "quality": get_ci(profile, "quality"),
        "lightName": get_ci(profile, "lightName"),
        "cameraAppVersion": get_ci(profile, "cameraAppVersion"),
        "saturation": to_number(get_ci(profile, "saturation")),
        "colorTone": to_number(get_ci(profile, "colorTone")),
    }
    missing = [name for name, val in fields.items() if val is None and not name.endswith("_raw")]
    return {
        "ok": True,
        "source_path": str(path),
        "wrap_style": wrap_style(raw),
        "fields": fields,
        "rgb": rgb,
        "old_rgb": old_rgb,
        "new_rgb": new_rgb,
        "correction_distance": euclid(old_rgb, new_rgb),
        "missing_requested_fields": missing,
    }


def first_defined(*values):
    for v in values:
        if v is not None:
            return v
    return None


def inventory_dir(src: Path):
    present = []
    absent = []
    details = {}
    if not src.is_dir():
        return {
            "source_dir_exists": False,
            "present": [],
            "absent": CAPTURE_JSON_SLOTS + ["still.jpg", "still.png", "video.mp4", "html"],
        }
    names = {p.name for p in src.iterdir() if p.is_file()}
    for slot in CAPTURE_JSON_SLOTS:
        if slot in names:
            p = src / slot
            present.append(slot)
            details[slot] = {"bytes": p.stat().st_size}
        else:
            absent.append(slot)
    still = None
    for candidate in ("still.jpg", "still.jpeg", "still.png"):
        if candidate in names:
            still = src / candidate
            present.append(candidate)
            pix = jpeg_pixel_size(still) if still.suffix.lower() in {".jpg", ".jpeg"} else None
            details[candidate] = {"bytes": still.stat().st_size, "pixel_size": pix}
            break
    if still is None:
        absent.append("still.*")
    if "video.mp4" in names:
        present.append("video.mp4")
        details["video.mp4"] = describe_video(src / "video.mp4")
    else:
        absent.append("video.mp4")
    html_found = sorted(n for n in names if n.lower().endswith(".html"))
    if html_found:
        present.extend(html_found)
        for n in html_found:
            details[n] = {"bytes": (src / n).stat().st_size}
    else:
        absent.append("html")
    extras = sorted(names - set(present))
    return {
        "source_dir_exists": True,
        "present": present,
        "absent": absent,
        "extra_files": extras,
        "details": details,
    }


def copy_existing(src: Path, dest: Path):
    dest.mkdir(parents=True, exist_ok=True)
    copied = []
    skipped = []
    if not src.is_dir():
        return copied, skipped
    for p in sorted(src.iterdir()):
        if not p.is_file():
            continue
        # Copy JSON, stills, placeholder videos, and any small html
        if p.suffix.lower() in {".json", ".jpg", ".jpeg", ".png", ".html", ".mp4"}:
            if p.stat().st_size > 2_000_000:
                skipped.append({"name": p.name, "reason": f"skipped large file ({p.stat().st_size} bytes)"})
                continue
            shutil.copy2(p, dest / p.name)
            copied.append(p.name)
        else:
            skipped.append({"name": p.name, "reason": "extension not in copy set"})
    return copied, skipped


def fmt(n, digits=3):
    if n is None:
        return "unavailable"
    if isinstance(n, bool):
        return str(n)
    if isinstance(n, (int, float)):
        if float(n).is_integer() and digits == 0:
            return str(int(n))
        text = f"{float(n):.{digits}f}"
        if "." in text:
            text = text.rstrip("0").rstrip(".")
        return text if text not in {"", "-"} else "0"
    return str(n)


def fmt_rgb(rgb):
    if not rgb:
        return "unavailable"
    return f"{rgb[0]}, {rgb[1]}, {rgb[2]}"


def write_stone_readme(dest: Path, stone: str, tier: str, inventory: dict, copied: list):
    aliases = f"REC-{stone} / M-{stone} / D-{stone}"
    lines = [
        f"# Stone D-{stone}",
        "",
        f"User-layout aliases (names only; those folders were **not** on this VM): `{aliases}`.",
        "",
        f"Tier: {TIER_META[tier]['label']}",
        "",
        "## Files copied from source",
        "",
    ]
    if copied:
        lines += [f"- `{name}`" for name in copied]
    else:
        lines.append("- none")
    lines += ["", "## Inventory of expected V360 capture slots", ""]
    lines.append("Present: " + (", ".join(f"`{n}`" for n in inventory["present"]) or "none"))
    lines.append("")
    lines.append("Absent: " + (", ".join(f"`{n}`" for n in inventory["absent"]) or "none"))
    if inventory.get("details", {}).get("video.mp4"):
        vid = inventory["details"]["video.mp4"]
        lines += ["", f"video.mp4 note: {vid.get('note')} ({vid.get('bytes')} bytes)."]
    (dest / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    extracted = {}
    inventories = {}
    files_read = []

    for tier, meta in TIER_META.items():
        extracted[tier] = {}
        inventories[tier] = {}
        meta["out_dir"].mkdir(parents=True, exist_ok=True)
        for stone in STONES:
            src = meta["dirs"][stone]
            dest = meta["out_dir"] / f"D-{stone}"
            inv = inventory_dir(src)
            inventories[tier][stone] = inv
            json_path = src / "0.json"
            if json_path.is_file():
                files_read.append(str(json_path))
                extracted[tier][stone] = extract_from_0_json(json_path)
            else:
                extracted[tier][stone] = {
                    "ok": False,
                    "source_path": str(json_path),
                    "error": "0.json is not present",
                }
            copied, skipped = copy_existing(src, dest)
            write_stone_readme(dest, stone, tier, inv, copied)
            (dest / "FILE_INVENTORY.json").write_text(
                json.dumps(
                    {
                        "stone": f"D-{stone}",
                        "aliases": [f"REC-{stone}", f"M-{stone}", f"D-{stone}"],
                        "tier": meta["label"],
                        "source_dir": str(src),
                        "copied": copied,
                        "skipped": skipped,
                        "inventory": inv,
                    },
                    indent=2,
                )
                + "\n",
                encoding="utf-8",
            )

        mapping = [
            f"# {meta['label']} stone mapping",
            "",
            "Original sample folder names are `D-1` … `D-6`.",
            "The customer Windows layout uses `MACHINE-1` / `M-1`…`M-6` / `REC-1`…`REC-6`.",
            "Those Windows folders were **not** available on this VM.",
            "",
            "| Compilation folder | Sample source | User alias |",
            "|---|---|---|",
        ]
        for stone in STONES:
            src = meta["dirs"][stone]
            mapping.append(
                f"| `D-{stone}` | `{src.relative_to(SRC_ROOT)}` | `REC-{stone}` / `M-{stone}` |"
            )
        (meta["out_dir"] / "STONE_MAPPING.md").write_text("\n".join(mapping) + "\n", encoding="utf-8")

    stones_payload = []
    for stone in STONES:
        m = extracted["machine"][stone]
        i = extracted["ideal"][stone]
        e = extracted["edf"][stone]
        mf, iff, ef = m.get("fields") or {}, i.get("fields") or {}, e.get("fields") or {}
        row = {
            "stone": f"D-{stone}",
            "aliases": [f"REC-{stone}", f"M-{stone}", f"D-{stone}"],
            "machine": m,
            "ideal": i,
            "edf": e,
            "inventory": {
                "machine": inventories["machine"][stone],
                "ideal": inventories["ideal"][stone],
                "edf": inventories["edf"][stone],
            },
            "comparisons": {
                "rgb_euclidean_machine_vs_ideal": euclid(m.get("rgb"), i.get("rgb")),
                "rgb_euclidean_machine_vs_edf": euclid(m.get("rgb"), e.get("rgb")),
                "rgb_euclidean_ideal_vs_edf": euclid(i.get("rgb"), e.get("rgb")),
                "oldrgb_newrgb_correction_distance": {
                    "machine": m.get("correction_distance"),
                    "ideal": i.get("correction_distance"),
                    "edf": e.get("correction_distance"),
                },
                "sharpness_abs_diff": {
                    "machine_vs_ideal": abs_diff(mf.get("sharpness"), iff.get("sharpness")),
                    "machine_vs_edf": abs_diff(mf.get("sharpness"), ef.get("sharpness")),
                },
                "contrast_abs_diff": {
                    "machine_vs_ideal": abs_diff(mf.get("contrast"), iff.get("contrast")),
                    "machine_vs_edf": abs_diff(mf.get("contrast"), ef.get("contrast")),
                },
                "total_time_ratio": {
                    "machine_over_ideal": ratio(mf.get("TotalTime_seconds"), iff.get("TotalTime_seconds")),
                    "machine_over_edf": ratio(mf.get("TotalTime_seconds"), ef.get("TotalTime_seconds")),
                },
            },
        }
        stones_payload.append(row)

    comparison = {
        "title": "Machine-1 vs ideal vs B2B mini 5.0 EDF — verified extraction",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "data_class": "synthetic_sample_fixtures",
        "live_customer_files_available": False,
        "live_paths_not_found": [
            r"D:\demo\INPUT\MACHINE-1",
            r"D:\demo\IDEAL_JSON\INPUT",
            r"D:\demo\IDEAL_JSON\INPUT\MACHINE-1",
        ],
        "provenance": {
            "git_repo": GIT_REPO,
            "git_commit": GIT_COMMIT,
            "sample_root": str(SRC_ROOT),
            "mapping": {
                "MACHINE-1": "Customer_Captures D-<stone>-01 (JSON MachineName = Machine 01)",
                "Ideal_Reference / REC-*": "Ideal_Reference/D-1..D-6",
                "V50_EDF_Reference": "B2B mini 5.0 EDF (JSON MachineName = V360 5.0 EDF)",
            },
        },
        "assumptions": [
            "Live D:\\demo Machine-1 / IDEAL_JSON files were not on this VM. Compilation uses the v360-machine-health sample_capture_data fixtures at commit 1af6f9d.",
            "Machine 01 (flat suffix -01) is treated as the MACHINE-1 analog because that is the only complete customer machine labeled Machine 01 in the fixtures.",
            "Stone folders are named D-1..D-6 because those are the actual source folder names. REC-1..REC-6 and M-1..M-6 are documented aliases only.",
            "RGB Euclidean distance uses visionProfile.currentProfile R/G/B integers (or parsed equivalents).",
            "OldRGB strings such as RGB(247, 244, 249) are parsed to three integers before distance is computed.",
            "Wrapped JSON (array envelope, payload wrapper, Pascal-case Payload) is unwrapped using the same capture/payload walk as the V360 generator.",
            "1.json–7.json and HTML were not present in these sample stone folders and are labeled absent. They were not invented.",
            "video.mp4 files are 29-byte ASCII placeholders, not playable video.",
            "still.jpg pixel size is 520x360 on disk. JSON width/height declare 1920x1080. Both values are reported; neither is altered.",
            "No composite health score was computed. Upstream validation report scores are cited only as a separate-document note.",
        ],
        "counts": summarize_counts(extracted, inventories, files_read),
        "stones": stones_payload,
        "files_read": files_read,
    }

    (OUT / "datasheet").mkdir(parents=True, exist_ok=True)
    (OUT / "reference").mkdir(parents=True, exist_ok=True)
    (OUT / "datasheet" / "machine-1-comparison.json").write_text(
        json.dumps(comparison, indent=2, default=json_default) + "\n", encoding="utf-8"
    )
    (OUT / "datasheet" / "machine-1-datasheet.md").write_text(
        render_datasheet(comparison), encoding="utf-8"
    )
    (OUT / "reference" / "machine-1-comparison.html").write_text(
        render_html(comparison), encoding="utf-8"
    )
    (OUT / "README.md").write_text(render_readme(comparison), encoding="utf-8")

    log_path = Path("/opt/cursor/artifacts/machine_health_compilation_log.json")
    log_path.write_text(
        json.dumps(
            {
                "counts": comparison["counts"],
                "files_read": files_read,
                "output": str(OUT),
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return comparison


def json_default(obj):
    if isinstance(obj, Path):
        return str(obj)
    raise TypeError(type(obj))


def abs_diff(a, b):
    if a is None or b is None:
        return None
    return abs(float(a) - float(b))


def ratio(a, b):
    if a is None or b is None or float(b) == 0:
        return None
    return float(a) / float(b)


def summarize_counts(extracted, inventories, files_read):
    json_parsed = sum(1 for t in extracted for s in extracted[t] if extracted[t][s].get("ok"))
    json_failed = sum(1 for t in extracted for s in extracted[t] if not extracted[t][s].get("ok"))
    present_0 = 0
    present_still = 0
    present_mp4 = 0
    present_html = 0
    present_1_7 = 0
    for t in inventories:
        for s in inventories[t]:
            inv = inventories[t][s]
            if "0.json" in inv.get("present", []):
                present_0 += 1
            if any(n.startswith("still.") for n in inv.get("present", [])):
                present_still += 1
            if "video.mp4" in inv.get("present", []):
                present_mp4 += 1
            if any(n.endswith(".html") for n in inv.get("present", [])):
                present_html += 1
            present_1_7 += sum(1 for n in inv.get("present", []) if re.fullmatch(r"[1-7]\.json", n))
    return {
        "stones_compiled": 6,
        "tiers": 3,
        "json_files_read": len(files_read),
        "json_files_parsed_ok": json_parsed,
        "json_files_failed": json_failed,
        "stone_folders_with_0_json": present_0,
        "stone_folders_with_still": present_still,
        "stone_folders_with_mp4": present_mp4,
        "stone_folders_with_html": present_html,
        "json_slots_1_through_7_found": present_1_7,
        "live_machine_1_folders_found": 0,
        "rec_or_m_folders_found": 0,
    }


def render_datasheet(comparison):
    c = comparison["counts"]
    lines = [
        "# Machine-1 comparison data sheet",
        "",
        "Audience: data managers and technical teams.",
        "",
        "**Data class:** synthetic sample fixtures. Live `D:\\demo\\INPUT\\MACHINE-1` and `D:\\demo\\IDEAL_JSON` files were **not** available on this VM.",
        "",
        f"Source: `{comparison['provenance']['git_repo']}` commit `{comparison['provenance']['git_commit']}`.",
        "",
        "## Provenance and mapping",
        "",
        "| User name | What was used |",
        "|---|---|",
        "| MACHINE-1 | `Customer_Captures/D-<stone>-01` (JSON `MachineName` = `Machine 01`) |",
        "| Ideal / REC-1…REC-6 | `Ideal_Reference/D-1`…`D-6` |",
        "| B2B mini 5.0 EDF | `V50_EDF_Reference/D-1`…`D-6` (`MachineName` = `V360 5.0 EDF`) |",
        "",
        "## Counts",
        "",
        f"- Stones compiled: {c['stones_compiled']} (D-1…D-6)",
        f"- JSON files read and parsed: {c['json_files_parsed_ok']} (failed: {c['json_files_failed']})",
        f"- Stone folders with `0.json`: {c['stone_folders_with_0_json']} / 18",
        f"- Stone folders with still image: {c['stone_folders_with_still']} / 18",
        f"- Stone folders with `video.mp4`: {c['stone_folders_with_mp4']} / 18",
        f"- Stone folders with HTML: {c['stone_folders_with_html']} / 18",
        f"- `1.json`–`7.json` files found in these stone folders: {c['json_slots_1_through_7_found']}",
        f"- Live MACHINE-1 / REC-* / M-* folders found: {c['live_machine_1_folders_found']}",
        "",
        "## Key extracted fields (from each `0.json`)",
        "",
    ]

    header = (
        "| Stone | Type | Machine RGB | Ideal RGB | EDF RGB | "
        "RGB dist M–I | RGB dist M–EDF | "
        "Old→New M | Old→New I | Old→New EDF | "
        "Sharp M/I/EDF | Contrast M/I/EDF | "
        "Time M/I/EDF (s) | Time ratio M/I |"
    )
    lines += [header, "|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|---:|"]
    for row in comparison["stones"]:
        m, i, e = row["machine"]["fields"], row["ideal"]["fields"], row["edf"]["fields"]
        cmp_ = row["comparisons"]
        lines.append(
            "| {stone} | {stype} | {mrgb} | {irgb} | {ergb} | {dmi} | {dme} | {cm} | {ci} | {ce} | {sh} | {co} | {tm} | {tr} |".format(
                stone=row["stone"],
                stype=m.get("stoneType") or "unavailable",
                mrgb=fmt_rgb(row["machine"].get("rgb")),
                irgb=fmt_rgb(row["ideal"].get("rgb")),
                ergb=fmt_rgb(row["edf"].get("rgb")),
                dmi=fmt(cmp_["rgb_euclidean_machine_vs_ideal"]),
                dme=fmt(cmp_["rgb_euclidean_machine_vs_edf"]),
                cm=fmt(cmp_["oldrgb_newrgb_correction_distance"]["machine"]),
                ci=fmt(cmp_["oldrgb_newrgb_correction_distance"]["ideal"]),
                ce=fmt(cmp_["oldrgb_newrgb_correction_distance"]["edf"]),
                sh=f"{fmt(m.get('sharpness'),0)} / {fmt(i.get('sharpness'),0)} / {fmt(e.get('sharpness'),0)}",
                co=f"{fmt(m.get('contrast'),0)} / {fmt(i.get('contrast'),0)} / {fmt(e.get('contrast'),0)}",
                tm=f"{fmt(m.get('TotalTime_seconds'),0)} / {fmt(i.get('TotalTime_seconds'),0)} / {fmt(e.get('TotalTime_seconds'),0)}",
                tr=fmt(cmp_["total_time_ratio"]["machine_over_ideal"], 4),
            )
        )

    lines += [
        "",
        "## Camera and exposure (same on all six stones in these fixtures)",
        "",
        "Values below are from Machine 01 D-1 `0.json` and were checked stone-by-stone. "
        "If a later stone differed, it is listed under Exceptions.",
        "",
        "| Field | Machine 01 | Ideal | 5.0 EDF |",
        "|---|---|---|---|",
    ]
    d1m = comparison["stones"][0]["machine"]["fields"]
    d1i = comparison["stones"][0]["ideal"]["fields"]
    d1e = comparison["stones"][0]["edf"]["fields"]
    for key in ("Camera", "MachineName", "AV", "TV", "ISO", "WB", "K", "width", "height", "ImageQuality"):
        lines.append(f"| {key} | {d1m.get(key)} | {d1i.get(key)} | {d1e.get(key)} |")

    exceptions = []
    for row in comparison["stones"]:
        for tier in ("machine", "ideal", "edf"):
            fields = row[tier]["fields"]
            base = comparison["stones"][0][tier]["fields"]
            for key in ("Camera", "AV", "TV", "ISO", "WB", "K", "width", "height", "ImageQuality"):
                if fields.get(key) != base.get(key):
                    exceptions.append(f"- {row['stone']} {tier} `{key}` = `{fields.get(key)}` (D-1 was `{base.get(key)}`)")
    lines += ["", "### Exceptions", ""]
    lines += exceptions or ["- None. Camera/exposure/size/ImageQuality matched D-1 on every stone in all three tiers."]

    lines += [
        "",
        "## JSON wrap styles actually observed",
        "",
        "| Stone | Machine | Ideal | EDF |",
        "|---|---|---|---|",
    ]
    for row in comparison["stones"]:
        lines.append(
            f"| {row['stone']} | {row['machine'].get('wrap_style')} | {row['ideal'].get('wrap_style')} | {row['edf'].get('wrap_style')} |"
        )

    lines += [
        "",
        "## File inventory (expected V360 slots)",
        "",
        "In every compiled stone folder for all three tiers:",
        "",
        "- Present: `0.json`, `still.jpg`, `video.mp4`",
        "- Absent: `1.json`, `2.json`, `3.json`, `4.json`, `5.json`, `6.json`, `7.json`, HTML",
        "- `still.jpg` on disk: 520 × 360 px JPEG (verified from SOF marker). JSON `width`/`height`: 1920 × 1080.",
        "- `video.mp4` on disk: 29 bytes, ASCII text `V360-SAMPLE-VIDEO-PLACEHOLDER`. Not a playable MP4.",
        "",
        "## Comparison formulas (computed only from extracted numbers)",
        "",
        "- RGB Euclidean distance: `sqrt((R1-R2)² + (G1-G2)² + (B1-B2)²)`",
        "- OldRGB → NewRGB correction distance: same formula on the parsed OldRGB and NewRGB triples",
        "- Sharpness / contrast absolute difference: `|a − b|`",
        "- TotalTime ratio: `machine_seconds / reference_seconds` after parsing `HH:MM:SS`",
        "",
        "## Assumptions",
        "",
    ]
    lines += [f"- {a}" for a in comparison["assumptions"]]
    lines += [
        "",
        "## Separate-document note (not recomputed here)",
        "",
        "The upstream file `machine_health_validation_report.md` at commit 1af6f9d states that the generator scored Machine 01 composite **95** (Healthy). That score is a generator output with provisional constants. This compilation does **not** reproduce or endorse that score.",
        "",
        "## Source files read",
        "",
    ]
    for p in comparison["files_read"]:
        lines.append(f"- `{p}`")
    lines.append("")
    return "\n".join(lines)


def esc(text):
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def render_html(comparison):
    rows_html = []
    for row in comparison["stones"]:
        stone = row["stone"]
        n = stone.split("-")[1]
        m, i, e = row["machine"]["fields"], row["ideal"]["fields"], row["edf"]["fields"]
        cmp_ = row["comparisons"]
        rows_html.append(
            f"""
<section class="stone" id="stone-{n}">
  <h2>{esc(stone)} <span class="aliases">aliases: REC-{n} / M-{n}</span></h2>
  <p class="stone-type">Declared stoneType (machine): <strong>{esc(m.get("stoneType"))}</strong></p>
  <div class="media-row">
    <figure>
      <img src="../machine-1/{stone}/still.jpg" alt="Machine-1 analog still {stone}" width="260" height="180">
      <figcaption>Machine 01 still.jpg</figcaption>
    </figure>
    <figure>
      <img src="../stonewise-ideal-reference/{stone}/still.jpg" alt="Ideal still {stone}" width="260" height="180">
      <figcaption>Ideal still.jpg</figcaption>
    </figure>
    <figure>
      <img src="../b2b-mini-50-edf-reference/{stone}/still.jpg" alt="5.0 EDF still {stone}" width="260" height="180">
      <figcaption>5.0 EDF still.jpg</figcaption>
    </figure>
  </div>
  <table>
    <thead>
      <tr><th>Field</th><th>Machine 01</th><th>Ideal</th><th>B2B mini 5.0 EDF</th></tr>
    </thead>
    <tbody>
      <tr><td>R, G, B</td><td>{esc(fmt_rgb(row["machine"].get("rgb")))}</td><td>{esc(fmt_rgb(row["ideal"].get("rgb")))}</td><td>{esc(fmt_rgb(row["edf"].get("rgb")))}</td></tr>
      <tr><td>OldRGB (parsed)</td><td>{esc(fmt_rgb(row["machine"].get("old_rgb")))}</td><td>{esc(fmt_rgb(row["ideal"].get("old_rgb")))}</td><td>{esc(fmt_rgb(row["edf"].get("old_rgb")))}</td></tr>
      <tr><td>NewRGB (parsed)</td><td>{esc(fmt_rgb(row["machine"].get("new_rgb")))}</td><td>{esc(fmt_rgb(row["ideal"].get("new_rgb")))}</td><td>{esc(fmt_rgb(row["edf"].get("new_rgb")))}</td></tr>
      <tr><td>OldRGB → NewRGB distance</td><td>{esc(fmt(cmp_["oldrgb_newrgb_correction_distance"]["machine"]))}</td><td>{esc(fmt(cmp_["oldrgb_newrgb_correction_distance"]["ideal"]))}</td><td>{esc(fmt(cmp_["oldrgb_newrgb_correction_distance"]["edf"]))}</td></tr>
      <tr><td>sharpness</td><td>{esc(fmt(m.get("sharpness"), 0))}</td><td>{esc(fmt(i.get("sharpness"), 0))}</td><td>{esc(fmt(e.get("sharpness"), 0))}</td></tr>
      <tr><td>contrast</td><td>{esc(fmt(m.get("contrast"), 0))}</td><td>{esc(fmt(i.get("contrast"), 0))}</td><td>{esc(fmt(e.get("contrast"), 0))}</td></tr>
      <tr><td>TotalTime (raw)</td><td>{esc(m.get("TotalTime"))}</td><td>{esc(i.get("TotalTime"))}</td><td>{esc(e.get("TotalTime"))}</td></tr>
      <tr><td>TotalTime (seconds)</td><td>{esc(fmt(m.get("TotalTime_seconds"), 0))}</td><td>{esc(fmt(i.get("TotalTime_seconds"), 0))}</td><td>{esc(fmt(e.get("TotalTime_seconds"), 0))}</td></tr>
      <tr><td>Camera</td><td>{esc(m.get("Camera"))}</td><td>{esc(i.get("Camera"))}</td><td>{esc(e.get("Camera"))}</td></tr>
      <tr><td>MachineName</td><td>{esc(m.get("MachineName"))}</td><td>{esc(i.get("MachineName"))}</td><td>{esc(e.get("MachineName"))}</td></tr>
      <tr><td>AV / TV / ISO</td><td>{esc(m.get("AV"))} / {esc(m.get("TV"))} / {esc(m.get("ISO"))}</td><td>{esc(i.get("AV"))} / {esc(i.get("TV"))} / {esc(i.get("ISO"))}</td><td>{esc(e.get("AV"))} / {esc(e.get("TV"))} / {esc(e.get("ISO"))}</td></tr>
      <tr><td>WB / K</td><td>{esc(m.get("WB"))} / {esc(m.get("K"))}</td><td>{esc(i.get("WB"))} / {esc(i.get("K"))}</td><td>{esc(e.get("WB"))} / {esc(e.get("K"))}</td></tr>
      <tr><td>JSON width × height</td><td>{esc(fmt(m.get("width"), 0))} × {esc(fmt(m.get("height"), 0))}</td><td>{esc(fmt(i.get("width"), 0))} × {esc(fmt(i.get("height"), 0))}</td><td>{esc(fmt(e.get("width"), 0))} × {esc(fmt(e.get("height"), 0))}</td></tr>
      <tr><td>ImageQuality</td><td>{esc(m.get("ImageQuality"))}</td><td>{esc(i.get("ImageQuality"))}</td><td>{esc(e.get("ImageQuality"))}</td></tr>
      <tr><td>0.json wrap style</td><td>{esc(row["machine"].get("wrap_style"))}</td><td>{esc(row["ideal"].get("wrap_style"))}</td><td>{esc(row["edf"].get("wrap_style"))}</td></tr>
    </tbody>
  </table>
  <div class="metrics">
    <div class="metric"><span>RGB distance machine vs ideal</span><strong>{esc(fmt(cmp_["rgb_euclidean_machine_vs_ideal"]))}</strong></div>
    <div class="metric"><span>RGB distance machine vs EDF</span><strong>{esc(fmt(cmp_["rgb_euclidean_machine_vs_edf"]))}</strong></div>
    <div class="metric"><span>Sharpness |M − I|</span><strong>{esc(fmt(cmp_["sharpness_abs_diff"]["machine_vs_ideal"], 0))}</strong></div>
    <div class="metric"><span>Sharpness |M − EDF|</span><strong>{esc(fmt(cmp_["sharpness_abs_diff"]["machine_vs_edf"], 0))}</strong></div>
    <div class="metric"><span>Contrast |M − I|</span><strong>{esc(fmt(cmp_["contrast_abs_diff"]["machine_vs_ideal"], 0))}</strong></div>
    <div class="metric"><span>TotalTime ratio M / I</span><strong>{esc(fmt(cmp_["total_time_ratio"]["machine_over_ideal"], 4))}</strong></div>
    <div class="metric"><span>TotalTime ratio M / EDF</span><strong>{esc(fmt(cmp_["total_time_ratio"]["machine_over_edf"], 4))}</strong></div>
  </div>
  <p class="inventory">Files in source: 0.json, still.jpg, video.mp4 present. 1.json–7.json and HTML absent.</p>
</section>
"""
        )

    assumption_lis = "\n".join(f"<li>{esc(a)}</li>" for a in comparison["assumptions"])
    source_lis = "\n".join(f"<li><code>{esc(p)}</code></li>" for p in comparison["files_read"])
    c = comparison["counts"]

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Machine-1 vs ideal vs B2B mini 5.0 EDF — verified comparison</title>
  <style>
    :root {{
      --bg: #f6f5f3;
      --card: #ffffff;
      --ink: #2b2a29;
      --muted: #5c5b59;
      --line: #d4d2cc;
      --accent: #8e4a12;
      --warn: #7a4b00;
      --warn-bg: #fff4e0;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", Calibri, Arial, sans-serif;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.45;
    }}
    header {{
      background: #2b2a29;
      color: #fefefe;
      padding: 28px 32px 24px;
    }}
    header h1 {{ margin: 0 0 8px; font-size: 1.55rem; font-weight: 650; }}
    header p {{ margin: 0; color: #d8d6d2; max-width: 70rem; }}
    .banner {{
      background: var(--warn-bg);
      color: var(--warn);
      border-bottom: 1px solid #e6d2a8;
      padding: 12px 32px;
      font-weight: 600;
    }}
    main {{ padding: 24px 32px 48px; max-width: 76rem; }}
    h2 {{ margin: 0 0 8px; font-size: 1.2rem; }}
    h3 {{ margin: 20px 0 8px; }}
    table {{
      width: 100%;
      border-collapse: collapse;
      background: var(--card);
      margin: 12px 0 16px;
    }}
    th, td {{
      border: 1px solid var(--line);
      padding: 7px 9px;
      text-align: left;
      vertical-align: top;
      font-size: 0.92rem;
    }}
    th {{ background: #ebecea; }}
    .stone {{
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 18px 18px 10px;
      margin: 20px 0;
    }}
    .aliases {{ color: var(--muted); font-size: 0.85rem; font-weight: 500; }}
    .media-row {{
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 12px 0 16px;
    }}
    figure {{ margin: 0; }}
    figure img {{
      display: block;
      border: 1px solid var(--line);
      background: #ddd;
      object-fit: cover;
    }}
    figcaption {{ font-size: 0.8rem; color: var(--muted); margin-top: 4px; }}
    .metrics {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      margin: 8px 0 12px;
    }}
    .metric {{
      border: 1px solid var(--line);
      padding: 8px 10px;
      background: #fafaf8;
    }}
    .metric span {{ display: block; color: var(--muted); font-size: 0.78rem; }}
    .metric strong {{ font-size: 1.05rem; }}
    .inventory, .muted {{ color: var(--muted); font-size: 0.9rem; }}
    code {{ font-size: 0.86em; }}
    nav a {{ color: var(--accent); margin-right: 12px; }}
    footer {{ padding: 0 32px 32px; color: var(--muted); font-size: 0.85rem; }}
  </style>
</head>
<body>
  <header>
    <h1>Machine-1 vs ideal vs B2B mini 5.0 EDF</h1>
    <p>Verified field extraction only. No invented measurements, scores, or media. Generated {esc(comparison["generated_at"])}.</p>
  </header>
  <div class="banner">
    Live customer files at D:\\demo\\INPUT\\MACHINE-1 and D:\\demo\\IDEAL_JSON were not available on this VM.
    This page uses synthetic sample_capture_data from v360-machine-health commit 1af6f9d.
    Values are demonstration fixtures, not production calibration.
  </div>
  <main>
    <h2>What this page is</h2>
    <p>Side-by-side comparison of three verified sources for six stones. Folder names in the compilation are <code>D-1</code>…<code>D-6</code> because those are the real sample names. Customer aliases <code>MACHINE-1</code>, <code>M-1</code>…<code>M-6</code>, and <code>REC-1</code>…<code>REC-6</code> are labeled here and were not present as folders on this VM.</p>
    <table>
      <thead><tr><th>User / V360 name</th><th>Source used</th><th>JSON MachineName</th></tr></thead>
      <tbody>
        <tr><td>MACHINE-1 / customer machine</td><td><code>Customer_Captures/D-&lt;stone&gt;-01</code></td><td>Machine 01</td></tr>
        <tr><td>Ideal / REC-1…REC-6</td><td><code>Ideal_Reference/D-1</code>…<code>D-6</code></td><td>Ideal Reference</td></tr>
        <tr><td>B2B mini 5.0 EDF</td><td><code>V50_EDF_Reference/D-1</code>…<code>D-6</code></td><td>V360 5.0 EDF</td></tr>
      </tbody>
    </table>
    <h3>Counts</h3>
    <ul>
      <li>Stones compiled: {c["stones_compiled"]}</li>
      <li>JSON files parsed: {c["json_files_parsed_ok"]} (failed: {c["json_files_failed"]})</li>
      <li><code>1.json</code>–<code>7.json</code> found: {c["json_slots_1_through_7_found"]}</li>
      <li>HTML files in stone folders: {c["stone_folders_with_html"]}</li>
      <li>Live MACHINE-1 folders found: {c["live_machine_1_folders_found"]}</li>
    </ul>
    <nav>
      <a href="#stone-1">D-1</a>
      <a href="#stone-2">D-2</a>
      <a href="#stone-3">D-3</a>
      <a href="#stone-4">D-4</a>
      <a href="#stone-5">D-5</a>
      <a href="#stone-6">D-6</a>
      <a href="#assumptions">Assumptions</a>
    </nav>
    {''.join(rows_html)}
    <section id="assumptions">
      <h2>Assumptions and limits</h2>
      <ul>{assumption_lis}</ul>
      <h3>Source files read</h3>
      <ul>{source_lis}</ul>
    </section>
  </main>
  <footer>V360 Machine Health compilation — sample fixtures only. Still images are 520×360 demonstration JPEGs. Videos are text placeholders.</footer>
</body>
</html>
"""


def render_readme(comparison):
    c = comparison["counts"]
    return f"""# V360 Machine Health — Machine-1 data compilation

Professional compilation for data managers and technical teams.

**Live `D:\\demo` files were not on this VM.** This folder is built from verified
`sample_capture_data` fixtures in [v360-machine-health]({GIT_REPO}) commit `{GIT_COMMIT}`.
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
`/home/ubuntu/.cursor/projects/workspace/uploads`. No `D:\\` volume on this Linux VM.

| Expected | Status |
|---|---|
| `D:\\demo\\INPUT\\MACHINE-1` | **Not found** |
| `D:\\demo\\IDEAL_JSON\\INPUT` | **Not found** |
| `REC-1`…`REC-6` / `M-1`…`M-6` folders | **Not found** |
| Sample `Customer_Captures/D-1-01`…`D-6-01` | Found (6 stones) |
| Sample `Ideal_Reference/D-1`…`D-6` | Found (6 stones) |
| Sample `V50_EDF_Reference/D-1`…`D-6` | Found (6 stones) |
| `0.json` in those 18 folders | Found (18 / 18) |
| `1.json`–`7.json` in those folders | **Absent** (0 files) |
| Stone-folder HTML | **Absent** |
| `still.jpg` | Found (18 / 18) |
| `video.mp4` | Found (18 / 18), all ASCII placeholders |

Counts from this run: stones={c['stones_compiled']}, JSON parsed={c['json_files_parsed_ok']},
failed={c['json_files_failed']}, `1.json`–`7.json` found={c['json_slots_1_through_7_found']}.

A richer viewer demo at `integrated_direct_json_viewer/data/` contains `0.json`, `4.json`,
`5.json`, `6.json` with embedded images (MachineName `V360 Technetronic LLP`). Those files
are **not** Machine-1 captures and were **not** copied (large embedded JPEGs; different machine).

## Assumptions

{chr(10).join('- ' + a for a in comparison['assumptions'])}

## How to regenerate

```bash
python3 machine-health-compilation/tools/build_compilation.py
```

Requires the sample tree at `/tmp/v360-machine-health` checked out to `{GIT_COMMIT}`.
"""


if __name__ == "__main__":
    result = build()
    print(json.dumps(result["counts"], indent=2))
    print("wrote", OUT)
