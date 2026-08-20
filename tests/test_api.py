from fastapi.testclient import TestClient

from app.main import app


def test_health_and_setup_login(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    with TestClient(app) as client:
        assert client.get("/api/health").json()["ok"] is True
        boot = client.get("/api/bootstrap").json()
        assert boot["pin_set"] is False
        res = client.post("/api/setup", data={"pin": "2580", "confirm": "2580"})
        assert res.json()["ok"] is True
        dash = client.get("/api/dashboard")
        assert dash.status_code == 200
        created = client.post("/api/members", data={"name": "Rahul Sharma", "code": "RPA"})
        assert created.json()["member"]["code"] == "RPA"
        docs = client.get("/api/documents")
        assert docs.json()["documents"] == []
