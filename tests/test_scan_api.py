from fastapi.testclient import TestClient

from app.main import app


def test_scan_reads_pan_from_pdf(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (50, 80),
        "INCOME TAX DEPARTMENT GOVT OF INDIA\nPermanent Account Number Card\nABCDE1234F\nName RAHUL KUMAR SHARMA\nDate of Birth 01/01/1990",
        fontsize=14,
    )
    pdf_bytes = doc.tobytes()
    doc.close()
    with TestClient(app) as client:
        client.post("/api/setup", data={"pin": "1111", "confirm": "1111"})
        res = client.post(
            "/api/scan",
            files=[("files", ("pan.pdf", pdf_bytes, "application/pdf"))],
        )
        assert res.status_code == 200
        item = res.json()["items"][0]
        assert item["doc_type"] == "pan"
        assert item["doc_number"] == "ABCDE1234F"
