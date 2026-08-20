"""Turn photos and PDF pages into OCR text."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Optional

from PIL import Image, ImageFilter, ImageOps

try:
    import pytesseract
except Exception:  # pragma: no cover
    pytesseract = None

try:
    import fitz
except Exception:  # pragma: no cover
    fitz = None

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"}
PDF_SUFFIXES = {".pdf"}
HEIC_SUFFIXES = {".heic", ".heif"}


def _open_image(path: Path) -> Image.Image:
    suffix = path.suffix.lower()
    if suffix in HEIC_SUFFIXES:
        try:
            from pillow_heif import register_heif_opener

            register_heif_opener()
        except Exception:
            pass
    image = Image.open(path)
    if image.mode not in {"RGB", "L"}:
        image = image.convert("RGB")
    return image


def preprocess(image: Image.Image) -> Image.Image:
    """Boost contrast so Tesseract can read faded ID cards."""
    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray)
    # Upscale small phone photos; leave big scans alone.
    w, h = gray.size
    if max(w, h) < 1400:
        scale = 1400 / max(w, h)
        gray = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    gray = gray.filter(ImageFilter.SHARPEN)
    return gray


def ocr_image(image: Image.Image) -> str:
    if pytesseract is None:
        return ""
    prepared = preprocess(image)
    configs = [
        "--psm 6",
        "--psm 4",
        "--psm 3",
    ]
    chunks: list[str] = []
    for cfg in configs:
        try:
            text = pytesseract.image_to_string(prepared, lang="eng", config=cfg)
        except Exception:
            continue
        if text and text.strip():
            chunks.append(text)
    # Prefer the longest read — usually the most complete.
    return max(chunks, key=len) if chunks else ""


def pdf_text_and_images(path: Path, max_pages: int = 8) -> tuple[str, list[Image.Image]]:
    if fitz is None:
        return "", []
    doc = fitz.open(path)
    native = []
    images: list[Image.Image] = []
    try:
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            native.append(page.get_text("text") or "")
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            images.append(img.convert("RGB"))
    finally:
        doc.close()
    return "\n".join(native).strip(), images


def read_file_text(path: Path) -> str:
    suffix = path.suffix.lower()
    parts: list[str] = []
    if suffix in PDF_SUFFIXES:
        native, images = pdf_text_and_images(path)
        if native:
            parts.append(native)
        for img in images:
            ocr = ocr_image(img)
            if ocr.strip():
                parts.append(ocr)
    elif suffix in IMAGE_SUFFIXES | HEIC_SUFFIXES:
        try:
            parts.append(ocr_image(_open_image(path)))
        except Exception:
            return ""
    return "\n".join(p for p in parts if p.strip())
