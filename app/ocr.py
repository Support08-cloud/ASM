"""Turn photos and PDF pages into OCR text.

Phone photos of an open passport are two pages in one picture, so we read
the full image plus left, right, and bottom crops and merge the text.
"""

from __future__ import annotations

import io
import re
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps, ImageEnhance

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

MRZ_WHITELIST = (
    "--oem 3 --psm 6 "
    "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
)


def _open_image(path: Path) -> Image.Image:
    suffix = path.suffix.lower()
    if suffix in HEIC_SUFFIXES:
        try:
            from pillow_heif import register_heif_opener

            register_heif_opener()
        except Exception:
            pass
    image = Image.open(path)
    image = ImageOps.exif_transpose(image)
    if image.mode not in {"RGB", "L"}:
        image = image.convert("RGB")
    return image


def _upscale(image: Image.Image, min_side: int = 1800) -> Image.Image:
    w, h = image.size
    longest = max(w, h)
    if longest >= min_side:
        return image
    scale = min_side / longest
    return image.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)


def preprocess(image: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(image)
    gray = _upscale(gray)
    gray = ImageOps.autocontrast(gray)
    gray = ImageEnhance.Contrast(gray).enhance(1.4)
    gray = gray.filter(ImageFilter.SHARPEN)
    return gray


def _tesseract(image: Image.Image, config: str) -> str:
    if pytesseract is None:
        return ""
    try:
        return pytesseract.image_to_string(image, lang="eng", config=config) or ""
    except Exception:
        return ""


def ocr_image(image: Image.Image) -> str:
    prepared = preprocess(image)
    return _tesseract(prepared, "--psm 4")


def ocr_mrz_band(image: Image.Image) -> str:
    """Machine-readable zone sits on the bottom of a passport biodata page."""
    w, h = image.size
    band = image.crop((0, int(h * 0.58), w, h))
    prepared = preprocess(band)
    prepared = _upscale(prepared, 2000)
    return _tesseract(prepared, MRZ_WHITELIST)


def ocr_with_crops(image: Image.Image) -> str:
    w, h = image.size
    parts = [ocr_image(image), ocr_mrz_band(image)]
    if w >= 1100:
        parts.append(ocr_image(image.crop((0, 0, int(w * 0.58), h))))
    seen: set[str] = set()
    ordered: list[str] = []
    for block in parts:
        for line in block.splitlines():
            key = " ".join(line.upper().split())
            if len(key) < 3 or key in seen:
                continue
            seen.add(key)
            ordered.append(line)
    return "\n".join(ordered)


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
            pix = page.get_pixmap(matrix=fitz.Matrix(2.5, 2.5), alpha=False)
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
        usable = len(re.findall(r"[A-Za-z]{4,}", native or "")) >= 20
        if not usable:
            for img in images:
                ocr = ocr_with_crops(img)
                if ocr.strip():
                    parts.append(ocr)
    elif suffix in IMAGE_SUFFIXES | HEIC_SUFFIXES:
        try:
            parts.append(ocr_with_crops(_open_image(path)))
        except Exception:
            return ""
    return "\n".join(p for p in parts if p.strip())
