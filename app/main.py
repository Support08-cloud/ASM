"""Vision 360 Doc Manager — family document vault with auto-read uploads."""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Optional

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app import auth
from app.dates import expiry_bucket, on_dashboard, parse_iso, renew_date_for
from app.db import data_dir, db, init_db, row_to_dict, uploads_dir, utcnow
from app.extract import DOC_LABELS, label_for
from app.ingest import ingest_paths, is_allowed, save_upload

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
TEMPLATES = ROOT / "templates"
COOKIE = "v360_doc_session"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    data_dir().mkdir(parents=True, exist_ok=True)
    uploads_dir().mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="Vision 360 Doc Manager", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


def _authed(request: Request) -> bool:
    return auth.read_session(request.cookies.get(COOKIE))


def _need_auth(request: Request):
    if not auth.pin_is_set():
        return JSONResponse({"error": "setup_required", "ok": False}, status_code=401)
    if not _authed(request):
        return JSONResponse({"error": "auth_required", "ok": False}, status_code=401)
    return None


def _member_payload(row) -> dict:
    data = row_to_dict(row)
    if data and data.get("photo_path"):
        data["photo_url"] = f"/files/{Path(data['photo_path']).name}"
    elif data:
        data["photo_url"] = None
    return data


def _file_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    name = Path(path).name
    return f"/files/{name}"


def _doc_payload(row) -> dict:
    data = row_to_dict(row)
    if not data:
        return {}
    expiry = parse_iso(data.get("expiry_date"))
    data["label"] = label_for(data.get("doc_type") or "other")
    data["bucket"] = expiry_bucket(expiry)
    data["on_dashboard"] = data.get("status") == "active" and on_dashboard(expiry)
    data["file_url"] = _file_url(data.get("file_path"))
    extra = data.get("extra_json")
    if extra:
        try:
            import json

            data["extra"] = json.loads(extra)
        except Exception:
            data["extra"] = {}
    else:
        data["extra"] = {}
    return data


def _policy_payload(row) -> dict:
    data = row_to_dict(row)
    if not data:
        return {}
    expiry = parse_iso(data.get("end_date"))
    data["bucket"] = expiry_bucket(expiry)
    data["file_url"] = _file_url(data.get("file_path"))
    return data


def _match_member_id(name: Optional[str]) -> Optional[int]:
    if not name:
        return None
    needle = " ".join(name.lower().split())
    with db() as conn:
        members = conn.execute("SELECT id, name, code FROM members").fetchall()
    for member in members:
        hay = (member["name"] or "").lower()
        code = (member["code"] or "").lower()
        if needle == hay or needle == code:
            return member["id"]
        if needle in hay or hay in needle:
            return member["id"]
    return None


@app.get("/")
def home():
    return FileResponse(TEMPLATES / "index.html")


@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(STATIC / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
def service_worker():
    return FileResponse(STATIC / "sw.js", media_type="text/javascript")


@app.get("/api/bootstrap")
def bootstrap(request: Request):
    return {
        "ok": True,
        "pin_set": auth.pin_is_set(),
        "authed": _authed(request),
        "doc_types": [{"id": k, "label": v} for k, v in DOC_LABELS.items()],
    }


@app.post("/api/setup")
def setup(pin: str = Form(...), confirm: str = Form(...)):
    if auth.pin_is_set():
        return JSONResponse({"ok": False, "error": "PIN already set"}, status_code=400)
    if pin != confirm:
        return JSONResponse({"ok": False, "error": "PINs do not match"}, status_code=400)
    try:
        auth.set_pin(pin)
    except ValueError as exc:
        return JSONResponse({"ok": False, "error": str(exc)}, status_code=400)
    response = JSONResponse({"ok": True})
    response.set_cookie(
        COOKIE,
        auth.make_session(),
        httponly=True,
        samesite="lax",
        max_age=auth.session_days() * 86400,
    )
    return response


@app.post("/api/login")
def login(pin: str = Form(...)):
    if not auth.check_pin(pin):
        return JSONResponse({"ok": False, "error": "Wrong PIN"}, status_code=401)
    response = JSONResponse({"ok": True})
    response.set_cookie(
        COOKIE,
        auth.make_session(),
        httponly=True,
        samesite="lax",
        max_age=auth.session_days() * 86400,
    )
    return response


@app.post("/api/logout")
def logout():
    response = JSONResponse({"ok": True})
    response.delete_cookie(COOKIE)
    return response


@app.get("/api/dashboard")
def dashboard(request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    with db() as conn:
        rows = conn.execute(
            """
            SELECT d.*, m.name AS member_name, m.photo_path AS member_photo, m.code AS member_code
            FROM documents d
            LEFT JOIN members m ON m.id = d.member_id
            WHERE d.status = 'active' AND d.expiry_date IS NOT NULL AND d.expiry_date != ''
            ORDER BY d.expiry_date ASC
            """
        ).fetchall()
        policies = conn.execute(
            """
            SELECT p.*, m.name AS member_name, m.photo_path AS member_photo
            FROM policies p
            LEFT JOIN members m ON m.id = p.member_id
            WHERE p.status = 'active' AND p.end_date IS NOT NULL AND p.end_date != ''
            ORDER BY p.end_date ASC
            """
        ).fetchall()
    items = []
    for row in rows:
        payload = _doc_payload(row)
        if payload.get("on_dashboard"):
            payload["kind"] = "document"
            payload["member_photo_url"] = _file_url(row["member_photo"])
            items.append(payload)
    for row in policies:
        payload = _policy_payload(row)
        remaining = parse_iso(payload.get("end_date"))
        if on_dashboard(remaining):
            payload["kind"] = "insurance"
            payload["doc_type"] = "insurance"
            payload["label"] = "Insurance"
            payload["doc_number"] = payload.get("policy_number")
            payload["expiry_date"] = payload.get("end_date")
            payload["member_photo_url"] = _file_url(row["member_photo"])
            items.append(payload)
    items.sort(key=lambda x: x.get("expiry_date") or "9999")
    return {"ok": True, "items": items[:40]}


@app.get("/api/members")
def list_members(request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    with db() as conn:
        rows = conn.execute("SELECT * FROM members ORDER BY name COLLATE NOCASE").fetchall()
        counts = {
            r["member_id"]: r["n"]
            for r in conn.execute(
                "SELECT member_id, COUNT(*) AS n FROM documents WHERE status='active' GROUP BY member_id"
            )
        }
    out = []
    for row in rows:
        item = _member_payload(row)
        item["doc_count"] = counts.get(row["id"], 0)
        out.append(item)
    return {"ok": True, "members": out}


@app.post("/api/members")
async def create_member(
    request: Request,
    name: str = Form(...),
    code: str = Form(""),
    relation: str = Form(""),
    phone: str = Form(""),
    email: str = Form(""),
    dob: str = Form(""),
    notes: str = Form(""),
    photo: UploadFile | None = File(None),
):
    denied = _need_auth(request)
    if denied:
        return denied
    name = name.strip()
    if not name:
        return JSONResponse({"ok": False, "error": "Name is required"}, status_code=400)
    photo_path = None
    if photo and photo.filename:
        raw = await photo.read()
        stored = save_upload(raw, photo.filename, uploads_dir())
        photo_path = str(stored)
    now = utcnow()
    with db() as conn:
        cur = conn.execute(
            """
            INSERT INTO members(code, name, relation, phone, email, dob, photo_path, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (code.strip() or None, name, relation.strip() or None, phone.strip() or None,
             email.strip() or None, dob.strip() or None, photo_path, notes.strip() or None, now, now),
        )
        member_id = cur.lastrowid
        row = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
    return {"ok": True, "member": _member_payload(row)}


@app.get("/api/members/{member_id}")
def get_member(member_id: int, request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    with db() as conn:
        member = conn.execute("SELECT * FROM members WHERE id = ?", (member_id,)).fetchone()
        if not member:
            return JSONResponse({"ok": False, "error": "Not found"}, status_code=404)
        docs = conn.execute(
            "SELECT * FROM documents WHERE member_id = ? AND status = 'active' ORDER BY doc_type",
            (member_id,),
        ).fetchall()
        policies = conn.execute(
            "SELECT * FROM policies WHERE member_id = ? AND status = 'active' ORDER BY end_date",
            (member_id,),
        ).fetchall()
    return {
        "ok": True,
        "member": _member_payload(member),
        "documents": [_doc_payload(d) for d in docs],
        "policies": [_policy_payload(p) for p in policies],
    }


@app.delete("/api/members/{member_id}")
def delete_member(member_id: int, request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    with db() as conn:
        conn.execute("DELETE FROM members WHERE id = ?", (member_id,))
    return {"ok": True}


@app.get("/api/documents")
def list_documents(request: Request, doc_type: str | None = None):
    denied = _need_auth(request)
    if denied:
        return denied
    sql = """
        SELECT d.*, m.name AS member_name, m.photo_path AS member_photo, m.code AS member_code
        FROM documents d
        LEFT JOIN members m ON m.id = d.member_id
        WHERE d.status = 'active'
    """
    params: list = []
    if doc_type:
        sql += " AND d.doc_type = ?"
        params.append(doc_type)
    sql += " ORDER BY d.doc_type, m.name COLLATE NOCASE"
    with db() as conn:
        rows = conn.execute(sql, params).fetchall()
    items = []
    for row in rows:
        payload = _doc_payload(row)
        payload["member_photo_url"] = _file_url(row["member_photo"])
        items.append(payload)
    return {"ok": True, "documents": items}


@app.post("/api/scan")
async def scan_files(request: Request, files: list[UploadFile] = File(...)):
    denied = _need_auth(request)
    if denied:
        return denied
    if not files:
        return JSONResponse({"ok": False, "error": "Choose a file first"}, status_code=400)
    saved: list[Path] = []
    work = uploads_dir() / "inbox"
    work.mkdir(parents=True, exist_ok=True)
    for upload in files:
        filename = upload.filename or "upload.bin"
        if not is_allowed(filename):
            return JSONResponse(
                {"ok": False, "error": f"Unsupported file: {filename}. Use zip, pdf, jpg, png."},
                status_code=400,
            )
        raw = await upload.read()
        if not raw:
            continue
        saved.append(save_upload(raw, filename, work))
    results = ingest_paths(saved, work)
    for item in results:
        item["suggested_member_id"] = _match_member_id(item.get("person_name"))
        item["file_url"] = _file_url(item.get("file_path"))
        if item.get("expiry_date") and not item.get("renew_date"):
            item["renew_date"] = (
                renew_date_for(item.get("doc_type") or "other", parse_iso(item.get("expiry_date"))).isoformat()
                if parse_iso(item.get("expiry_date"))
                else None
            )
    return {"ok": True, "items": results}


@app.post("/api/documents")
async def save_document(
    request: Request,
    member_id: str = Form(""),
    doc_type: str = Form("other"),
    doc_number: str = Form(""),
    person_name: str = Form(""),
    issue_date: str = Form(""),
    expiry_date: str = Form(""),
    renew_date: str = Form(""),
    notes: str = Form(""),
    file_path: str = Form(""),
    file_name: str = Form(""),
    sha256: str = Form(""),
    raw_text: str = Form(""),
    confidence: str = Form("0"),
    extra_json: str = Form(""),
    replace_id: str = Form(""),
):
    denied = _need_auth(request)
    if denied:
        return denied
    doc_type = (doc_type or "other").lower().strip()
    mid = int(member_id) if str(member_id).isdigit() else None
    expiry = parse_iso(expiry_date)
    renew = parse_iso(renew_date) or renew_date_for(doc_type, expiry)
    now = utcnow()
    stored_path = None
    stored_name = file_name or None
    if file_path:
        src = Path(file_path)
        if src.exists():
            dest = uploads_dir() / src.name
            if src.resolve() != dest.resolve():
                shutil.copy2(src, dest)
            stored_path = str(dest)
            stored_name = stored_name or src.name.split("_", 1)[-1]
    try:
        conf = int(float(confidence or 0))
    except ValueError:
        conf = 0
    with db() as conn:
        cur = conn.execute(
            """
            INSERT INTO documents(
                member_id, doc_type, doc_number, person_name, issue_date, expiry_date, renew_date,
                notes, extra_json, file_path, file_name, sha256, raw_text, confidence, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (
                mid,
                doc_type,
                doc_number.strip() or None,
                person_name.strip() or None,
                issue_date.strip() or None,
                expiry.isoformat() if expiry else (expiry_date.strip() or None),
                renew.isoformat() if renew else None,
                notes.strip() or None,
                extra_json.strip() or None,
                stored_path,
                stored_name,
                sha256.strip() or None,
                raw_text,
                conf,
                now,
                now,
            ),
        )
        new_id = cur.lastrowid
        if replace_id.isdigit():
            conn.execute(
                "UPDATE documents SET status='replaced', replaced_by=?, updated_at=? WHERE id=?",
                (new_id, now, int(replace_id)),
            )
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (new_id,)).fetchone()
    return {"ok": True, "document": _doc_payload(row)}


@app.post("/api/documents/{doc_id}")
async def update_document(
    doc_id: int,
    request: Request,
    member_id: str = Form(""),
    doc_type: str = Form("other"),
    doc_number: str = Form(""),
    person_name: str = Form(""),
    issue_date: str = Form(""),
    expiry_date: str = Form(""),
    renew_date: str = Form(""),
    notes: str = Form(""),
    file: UploadFile | None = File(None),
):
    denied = _need_auth(request)
    if denied:
        return denied
    expiry = parse_iso(expiry_date)
    doc_type = (doc_type or "other").lower().strip()
    renew = parse_iso(renew_date) or renew_date_for(doc_type, expiry)
    file_path = None
    file_name = None
    if file and file.filename:
        raw = await file.read()
        stored = save_upload(raw, file.filename, uploads_dir())
        file_path = str(stored)
        file_name = file.filename
    mid = int(member_id) if str(member_id).isdigit() else None
    with db() as conn:
        existing = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if not existing:
            return JSONResponse({"ok": False, "error": "Not found"}, status_code=404)
        conn.execute(
            """
            UPDATE documents SET
                member_id=?, doc_type=?, doc_number=?, person_name=?, issue_date=?, expiry_date=?,
                renew_date=?, notes=?, updated_at=?
            """
            + (", file_path=?, file_name=?" if file_path else "")
            + " WHERE id=?",
            tuple(
                [
                    mid,
                    doc_type,
                    doc_number.strip() or None,
                    person_name.strip() or None,
                    issue_date.strip() or None,
                    expiry.isoformat() if expiry else None,
                    renew.isoformat() if renew else None,
                    notes.strip() or None,
                    utcnow(),
                ]
                + ([file_path, file_name] if file_path else [])
                + [doc_id]
            ),
        )
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    return {"ok": True, "document": _doc_payload(row)}


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    with db() as conn:
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    return {"ok": True}


@app.get("/api/policies")
def list_policies(request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    with db() as conn:
        rows = conn.execute(
            """
            SELECT p.*, m.name AS member_name, m.photo_path AS member_photo
            FROM policies p
            LEFT JOIN members m ON m.id = p.member_id
            WHERE p.status = 'active'
            ORDER BY p.end_date ASC
            """
        ).fetchall()
    items = []
    for row in rows:
        payload = _policy_payload(row)
        payload["member_photo_url"] = _file_url(row["member_photo"])
        items.append(payload)
    return {"ok": True, "policies": items}


@app.post("/api/policies")
async def save_policy(
    request: Request,
    member_id: str = Form(""),
    provider: str = Form(""),
    policy_number: str = Form(""),
    person_name: str = Form(""),
    start_date: str = Form(""),
    end_date: str = Form(""),
    premium: str = Form(""),
    payment_mode: str = Form(""),
    notes: str = Form(""),
    file_path: str = Form(""),
    file_name: str = Form(""),
    file: UploadFile | None = File(None),
):
    denied = _need_auth(request)
    if denied:
        return denied
    stored_path = None
    stored_name = file_name or None
    if file and file.filename:
        raw = await file.read()
        stored = save_upload(raw, file.filename, uploads_dir())
        stored_path = str(stored)
        stored_name = file.filename
    elif file_path:
        src = Path(file_path)
        if src.exists():
            dest = uploads_dir() / src.name
            if src.resolve() != dest.resolve():
                shutil.copy2(src, dest)
            stored_path = str(dest)
            stored_name = stored_name or src.name.split("_", 1)[-1]
    now = utcnow()
    mid = int(member_id) if str(member_id).isdigit() else None
    with db() as conn:
        cur = conn.execute(
            """
            INSERT INTO policies(
                member_id, provider, policy_number, person_name, start_date, end_date,
                premium, payment_mode, file_path, file_name, notes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
            """,
            (
                mid,
                provider.strip() or None,
                policy_number.strip() or None,
                person_name.strip() or None,
                start_date.strip() or None,
                end_date.strip() or None,
                premium.strip() or None,
                payment_mode.strip() or None,
                stored_path,
                stored_name,
                notes.strip() or None,
                now,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM policies WHERE id = ?", (cur.lastrowid,)).fetchone()
    return {"ok": True, "policy": _policy_payload(row)}


@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: int, request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    with db() as conn:
        conn.execute("DELETE FROM policies WHERE id = ?", (policy_id,))
    return {"ok": True}


@app.get("/files/{name}")
def files(name: str, request: Request):
    denied = _need_auth(request)
    if denied:
        return denied
    safe = Path(name).name
    uploads = uploads_dir()
    for folder in (uploads, uploads / "inbox", uploads / "inbox" / "unzipped"):
        path = folder / safe
        if path.exists() and path.is_file():
            return FileResponse(path)
    return JSONResponse({"ok": False, "error": "Missing file"}, status_code=404)


@app.get("/api/health")
def health():
    return {"ok": True, "app": "doc-manager"}
