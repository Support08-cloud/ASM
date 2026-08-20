from fastapi.testclient import TestClient

from app.main import app


def test_vba_family_then_wife_nva(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    with TestClient(app) as client:
        client.post("/api/setup", data={"pin": "2580", "confirm": "2580"})
        vba = client.post(
            "/api/members",
            data={"name": "Vansh Ankoliya", "code": "VBA", "start_family": "1"},
        ).json()["member"]
        assert vba["code"] == "VBA"
        nva = client.post(
            "/api/members",
            data={
                "name": "Nehal Ankoliya",
                "code": "NVA",
                "under_member_id": str(vba["id"]),
                "role": "Wife",
            },
        ).json()["member"]
        assert nva["role"] == "Wife"
        families = client.get("/api/families").json()
        assert len(families["families"]) == 1
        fam = families["families"][0]
        assert fam["count"] == 2
        assert fam["head"]["code"] == "VBA"
        roles = {p["code"]: p["role"] for p in fam["members"]}
        assert roles["NVA"] == "Wife"
        detail = client.get(f"/api/members/{vba['id']}").json()
        assert len(detail["relatives"]) == 1
        assert detail["relatives"][0]["code"] == "NVA"


def test_unassigned_people_show_when_no_family_yet(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    with TestClient(app) as client:
        client.post("/api/setup", data={"pin": "2580", "confirm": "2580"})
        person = client.post(
            "/api/members",
            data={"name": "Vansh Ankoliya", "code": "VBA"},
        ).json()["member"]
        families = client.get("/api/families").json()
        assert families["ok"] is True
        assert families["families"] == []
        assert families["unassigned"][0]["id"] == person["id"]
        assert families["unassigned"][0]["code"] == "VBA"
        started = client.post(
            "/api/families",
            data={"name": "VBA's family", "head_member_id": str(person["id"])},
        ).json()
        assert started["ok"] is True
        after = client.get("/api/families").json()
        assert len(after["families"]) == 1
        assert after["families"][0]["head"]["code"] == "VBA"
        assert after["unassigned"] == []


def test_settings_and_pin_change(tmp_path, monkeypatch):
    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    with TestClient(app) as client:
        client.post("/api/setup", data={"pin": "2580", "confirm": "2580"})
        saved = client.post(
            "/api/settings",
            data={"household_name": "Ankoliya house", "reminder_days": "90", "show_expired": "0"},
        ).json()
        assert saved["household_name"] == "Ankoliya house"
        assert saved["reminder_days"] == 90
        assert saved["show_expired"] is False
        bad = client.post(
            "/api/pin/change",
            data={"current": "0000", "pin": "1111", "confirm": "1111"},
        )
        assert bad.status_code == 400
        ok = client.post(
            "/api/pin/change",
            data={"current": "2580", "pin": "1111", "confirm": "1111"},
        )
        assert ok.json()["ok"] is True
        client.post("/api/logout")
        assert client.post("/api/login", data={"pin": "1111"}).json()["ok"] is True
