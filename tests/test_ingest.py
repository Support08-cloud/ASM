import zipfile
from pathlib import Path

from app.ingest import expand_uploads, unpack_zip


def test_zip_unpacks_pdf_and_jpg(tmp_path: Path):
    pdf = tmp_path / "pass.pdf"
    jpg = tmp_path / "pan.jpg"
    pdf.write_bytes(b"%PDF-1.1 test")
    jpg.write_bytes(b"\xff\xd8\xff fakejpg")
    zpath = tmp_path / "bundle.zip"
    with zipfile.ZipFile(zpath, "w") as zf:
        zf.write(pdf, "folder/pass.pdf")
        zf.write(jpg, "pan.jpg")
        zf.writestr(".DS_Store", "skip")
        zf.writestr("notes.txt", "ignore")
    out = unpack_zip(zpath, tmp_path / "out")
    names = sorted(p.name.split("_", 1)[-1] for p in out)
    assert names == ["pan.jpg", "pass.pdf"]


def test_expand_uploads_flattens_zip(tmp_path: Path):
    inner = tmp_path / "dl.png"
    inner.write_bytes(b"png")
    zpath = tmp_path / "docs.zip"
    with zipfile.ZipFile(zpath, "w") as zf:
        zf.write(inner, "dl.png")
    files = expand_uploads([zpath], tmp_path / "work")
    assert len(files) == 1
    assert files[0].suffix == ".png"
