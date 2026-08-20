"""Accept zip / pdf / jpg uploads, split them, and extract each document."""

from __future__ import annotations

import hashlib
import shutil
import zipfile
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.extract import detect_and_extract, hint_from_filename, label_for
from app.ocr import HEIC_SUFFIXES, IMAGE_SUFFIXES, PDF_SUFFIXES, read_file_text

ALLOWED = IMAGE_SUFFIXES | PDF_SUFFIXES | HEIC_SUFFIXES | {".zip"}
SKIP_NAMES = {".ds_store", "thumbs.db", "__macosx"}


def is_allowed(name: str) -> bool:
    path = Path(name)
    if path.name.lower() in SKIP_NAMES or path.name.startswith("."):
        return False
    return path.suffix.lower() in ALLOWED


def unpack_zip(zip_path: Path, dest: Path) -> list[Path]:
    dest.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = Path(info.filename).name
            if not is_allowed(name) or Path(name).suffix.lower() == ".zip":
                continue
            target = dest / f"{uuid4().hex}_{name}"
            with zf.open(info) as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)
            extracted.append(target)
    return extracted


def save_upload(raw: bytes, filename: str, dest_dir: Path) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe = Path(filename).name or "upload.bin"
    path = dest_dir / f"{uuid4().hex}_{safe}"
    path.write_bytes(raw)
    return path


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def expand_uploads(files: list[Path], work_dir: Path) -> list[Path]:
    """Flatten zip archives into individual pdf/jpg files."""
    work_dir.mkdir(parents=True, exist_ok=True)
    out: list[Path] = []
    for path in files:
        if path.suffix.lower() == ".zip":
            out.extend(unpack_zip(path, work_dir / "unzipped"))
        elif is_allowed(path.name):
            out.append(path)
    return out


def extract_one(path: Path) -> dict[str, Any]:
    text = read_file_text(path)
    original = path.name.split("_", 1)[-1]
    parsed = detect_and_extract(text, hint=hint_from_filename(original))
    parsed["file_name"] = path.name
    parsed["original_name"] = original
    parsed["file_path"] = str(path)
    parsed["raw_text"] = text[:8000]
    parsed["label"] = label_for(parsed.get("doc_type") or "other")
    parsed["sha256"] = file_sha256(path)
    return parsed


def ingest_paths(paths: list[Path], work_dir: Path) -> list[dict[str, Any]]:
    documents = expand_uploads(paths, work_dir)
    results = []
    for path in documents:
        try:
            results.append(extract_one(path))
        except Exception as exc:
            results.append(
                {
                    "doc_type": "other",
                    "doc_number": None,
                    "person_name": None,
                    "confidence": 0,
                    "needs_review": True,
                    "error": str(exc),
                    "file_name": path.name,
                    "original_name": path.name,
                    "file_path": str(path),
                    "label": "Could not read",
                    "raw_text": "",
                }
            )
    return results
