#!/bin/sh
set -eu

cd "$(dirname "$0")"
mkdir -p dist

if ! command -v makensis >/dev/null 2>&1; then
  echo "makensis is not installed." >&2
  exit 1
fi

makensis -V2 vision360.nsi

exe="dist/Vision360-Setup.exe"
if [ ! -f "$exe" ]; then
  echo "Installer was not created: $exe" >&2
  exit 1
fi

python3 - <<'PY'
import pathlib
import sys

source = pathlib.Path("vision360.nsi").read_text(encoding="utf-8")
required = [
    r"D:\New folder (2)\SOFTWARE\02_Vision360_EXE",
    "Vision360.exe",
    "V360Upload.exe",
    "CDM212364_Setup.exe",
    r"$DESKTOP\Vision360.lnk",
    r"$DESKTOP\V360 Upload.lnk",
]
missing = [item for item in required if item not in source]
if missing:
    print("Installer script is missing:", ", ".join(missing), file=sys.stderr)
    sys.exit(1)

exe = pathlib.Path("dist/Vision360-Setup.exe")
data = exe.read_bytes()
if data[:2] != b"MZ":
    print("Installer is not a Windows executable.", file=sys.stderr)
    sys.exit(1)
if b"Nullsoft" not in data and b"NSIS" not in data:
    print("Installer is not an NSIS package.", file=sys.stderr)
    sys.exit(1)
embedded = [
    "D:\\New folder (2)\\SOFTWARE\\02_Vision360_EXE",
    "Vision360.exe",
    "V360Upload.exe",
    "CDM212364_Setup.exe",
]
for item in embedded:
    if item.encode("utf-16le") not in data:
        print(f"Built installer does not contain {item}", file=sys.stderr)
        sys.exit(1)
print(f"Built {exe} ({exe.stat().st_size} bytes)")
PY
