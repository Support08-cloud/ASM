#!/usr/bin/env python3
"""Generate ONE Machine-1 health report from sample_capture_data.

Live D:\\demo was not on this VM. This script runs the packaged V360 generator
against Machine 01 (D-*-01 analog of MACHINE-1) plus Ideal_Reference and
V50_EDF_Reference (B2B mini 5.0 EDF). The HTML is then stamped with a SAMPLE
banner so it cannot be mistaken for a live customer audit.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "reports"
V360 = Path("/tmp/v360-machine-health/executed_source")
GENERATOR = V360 / "V360_Machine_Health_Audit_Generator.html"
SAMPLE = V360 / "sample_capture_data" / "flat"
STAGE = Path("/tmp/mh-machine1-only")

HTML_NAME = "V360_Machine_Health_Report_Machine-1.html"
AUDIT_NAME = "V360_Machine_Health_Report_Machine-1.audit.json"

SAMPLE_BANNER_CSS = """
.sample-live-banner {
  background: #7a4b00;
  color: #fff8ea;
  padding: 14px 24px 16px;
  font-size: 14px;
  line-height: 1.5;
  border-bottom: 4px solid #c6691d;
}
.sample-live-banner strong { display: block; font-size: 15px; margin-bottom: 4px; }
.sample-live-banner code { font-size: 12px; }
.demo-tag {
  background: #7a4b00 !important;
  color: #fff8ea !important;
  border-color: #c6691d !important;
}
"""

SAMPLE_BANNER_HTML = """
<div id="sampleLiveBanner" class="sample-live-banner" role="status">
  <strong>SAMPLE REPORT — live D:\\demo is not available on this Linux VM.</strong>
  This file is a format demo scored from v360-machine-health <code>sample_capture_data</code>
  (commit <code>1af6f9d</code>), not from <code>D:\\demo\\INPUT\\MACHINE-1</code> or
  <code>D:\\demo\\IDEAL_JSON</code>. Machine 01 (folders D-1-01 … D-6-01) is the MACHINE-1 analog.
  Ideal = Ideal_Reference (REC-1 … REC-6 analog). B2B mini 5.0 EDF = V50_EDF_Reference.
  Scores use the packaged generator <code>provisional-v1.0</code> formulas. Do not treat these
  numbers as a customer machine audit. Provide a Linux copy of D:\\demo (or a save path after
  upload) to regenerate from live captures.
</div>
"""

SAMPLE_MODE_PATCH = (
    "return state.lang==='gu'?'નમૂનો · live D:\\\\demo નથી':'SAMPLE · live D:\\\\demo not on this VM';"
)


def stage_machine01() -> Path:
    """Copy only Machine 01 (D-*-01) so the generator emits ONE machine report."""
    if STAGE.exists():
        shutil.rmtree(STAGE)
    cust = STAGE / "Customer_Captures"
    cust.mkdir(parents=True)
    for n in range(1, 7):
        src = SAMPLE / "Customer_Captures" / f"D-{n}-01"
        if not src.exists():
            raise FileNotFoundError(src)
        shutil.copytree(src, cust / f"D-{n}-01")
    return cust


def stamp_sample_banner(html: str) -> str:
    if "</style>" in html:
        html = html.replace("</style>", SAMPLE_BANNER_CSS + "\n</style>", 1)
    if "<header" in html:
        html = html.replace("<header", SAMPLE_BANNER_HTML + "\n<header", 1)
    old = "return state.lang==='gu'?'વાસ્તવિક કેપ્ચર ડેટા':'real capture data';"
    if old in html:
        html = html.replace(old, SAMPLE_MODE_PATCH, 1)
    html = html.replace(
        '<span class="demo-tag" id="dataTag">real capture data</span>',
        '<span class="demo-tag" id="dataTag">SAMPLE · live D:\\demo not on this VM</span>',
        1,
    )
    return html


def strip_data_urls(obj):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k == "dataUrl":
                continue
            out[k] = strip_data_urls(v)
        return out
    if isinstance(obj, list):
        return [strip_data_urls(v) for v in obj]
    return obj


def main() -> int:
    if not GENERATOR.exists():
        print("Generator not found:", GENERATOR, file=sys.stderr)
        return 1
    cust = stage_machine01()
    ideal = SAMPLE / "Ideal_Reference"
    v50 = SAMPLE / "V50_Reference"
    v50edf = SAMPLE / "V50_EDF_Reference"
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    chrome = (
        os.environ.get("V360_CHROMIUM")
        or shutil.which("google-chrome")
        or shutil.which("google-chrome-stable")
        or shutil.which("chromium")
    )
    launch_args = {
        "headless": True,
        "args": ["--no-sandbox", "--disable-dev-shm-usage"],
    }
    if chrome:
        launch_args["executable_path"] = chrome

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_args)
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, accept_downloads=True)
        page.set_content(GENERATOR.read_text(encoding="utf-8"), wait_until="load")
        page.fill("#custName", "SAMPLE Machine-1")
        page.fill("#preparedBy", "Cursor Cloud Agent")
        page.fill("#contactPerson", "Format demo — live D:\\demo not uploaded")
        page.fill("#location", "Linux cloud VM (not Windows D:\\demo)")
        page.fill("#reportDate", "2026-09-14")
        page.click("#toStep2")
        page.locator("#idealInput").set_input_files(str(ideal))
        page.locator("#custInput").set_input_files(str(cust))
        if v50.exists():
            page.locator("#v50Input").set_input_files(str(v50))
        if v50edf.exists():
            page.locator("#v50edfInput").set_input_files(str(v50edf))
        page.wait_for_function("!document.querySelector('#toStep3').disabled", timeout=30_000)
        detection = page.locator("#custDetection").inner_text()
        print("customer detection:", detection.replace("\n", " | "))
        page.click("#toStep3")
        page.click("#generateBtn")
        page.locator("#resultBox").wait_for(state="visible", timeout=90_000)
        err = page.locator("#processError")
        if err.is_visible():
            print("generator error:", err.inner_text(), file=sys.stderr)
            browser.close()
            return 1

        data = page.evaluate("state.lastResult.data")
        html = page.evaluate("state.lastResult.html")
        machines = page.locator("#resultMachines").inner_text()
        excluded = page.locator("#resultExcluded").inner_text()
        warnings = page.locator("#resultWarnings").inner_text()
        print(f"scored machines={machines} excluded={excluded} warnings={warnings}")
        browser.close()

    html = stamp_sample_banner(html)
    html_path = OUT_DIR / HTML_NAME
    html_path.write_text(html, encoding="utf-8")

    scores = {}
    for m in data.get("machines") or []:
        scores[m.get("id")] = (m.get("scores") or {}).get("composite")

    sidecar = {
        "title": "V360 Machine Health Report — Machine-1 (SAMPLE)",
        "live_customer_files_available": False,
        "data_class": "synthetic_sample_fixtures",
        "banner": "SAMPLE REPORT — live D:\\demo is not available on this Linux VM.",
        "generated_at": data.get("generatedAt"),
        "save_path_note": (
            "No Windows D: write was attempted. Report saved to the workspace reports/ "
            "folder and /opt/cursor/artifacts/. A user save path has not been provided yet."
        ),
        "provenance": {
            "generator": str(GENERATOR),
            "git_repo": "https://github.com/Support08-cloud/v360-machine-health",
            "git_commit": "1af6f9d",
            "sample_root": str(SAMPLE),
            "customer_input": str(cust),
            "mapping": {
                "MACHINE-1": "Customer_Captures D-<stone>-01 (JSON MachineName = Machine 01)",
                "Ideal_Reference / REC-*": "Ideal_Reference/D-1..D-6",
                "V50_EDF_Reference": "B2B mini 5.0 EDF (JSON MachineName = V360 5.0 EDF)",
            },
        },
        "counts": {
            "stones_scored": 6,
            "machines_in_report": len(data.get("machines") or []),
            "excluded_machines": len(data.get("excludedMachines") or []),
            "live_machine_1_folders_found": 0,
            "json_slots_1_through_7_used": 0,
        },
        "composite_scores": scores,
        "assumptions": [
            "Live D:\\demo Machine-1 / IDEAL_JSON files were not on this VM.",
            "Machine 01 (flat suffix -01) is the MACHINE-1 analog in sample_capture_data.",
            "Scoring used the packaged generator provisional-v1.0 formulas; missing metrics were not invented.",
            "Normalization is not production-calibrated (see generator disclosure).",
            "video.mp4 files in the sample tree are ASCII placeholders, not playable video.",
        ],
        "generator_audit": strip_data_urls(data),
    }
    audit_path = OUT_DIR / AUDIT_NAME
    audit_path.write_text(json.dumps(sidecar, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", html_path, html_path.stat().st_size, "bytes")
    print("wrote", audit_path, audit_path.stat().st_size, "bytes")
    print("composite_scores", json.dumps(scores))
    return 0


if __name__ == "__main__":
    sys.exit(main())
