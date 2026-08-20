"""SQLite helpers. One family database, kept on disk forever."""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def data_dir() -> Path:
    return Path(os.environ.get("DATA_DIR", ROOT / "data")).resolve()


def db_path() -> Path:
    return data_dir() / "docmanager.sqlite3"


def uploads_dir() -> Path:
    return data_dir() / "uploads"


DATA_DIR = data_dir()
DB_PATH = db_path()
UPLOADS = uploads_dir()


def utcnow() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def connect() -> sqlite3.Connection:
    folder = data_dir()
    uploads = uploads_dir()
    folder.mkdir(parents=True, exist_ok=True)
    uploads.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def db():
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    name TEXT NOT NULL,
    relation TEXT,
    role TEXT,
    family_id INTEGER,
    phone TEXT,
    email TEXT,
    dob TEXT,
    photo_path TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    head_member_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    doc_type TEXT NOT NULL,
    doc_number TEXT,
    person_name TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    renew_date TEXT,
    notes TEXT,
    extra_json TEXT,
    file_path TEXT,
    file_name TEXT,
    sha256 TEXT,
    raw_text TEXT,
    confidence INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    replaced_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    provider TEXT,
    policy_number TEXT,
    person_name TEXT,
    start_date TEXT,
    end_date TEXT,
    premium TEXT,
    payment_mode TEXT,
    file_path TEXT,
    file_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


def init_db() -> None:
    with db() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)


def _migrate(conn: sqlite3.Connection) -> None:
    member_cols = {row[1] for row in conn.execute("PRAGMA table_info(members)")}
    if "family_id" not in member_cols:
        conn.execute("ALTER TABLE members ADD COLUMN family_id INTEGER")
    if "role" not in member_cols:
        conn.execute("ALTER TABLE members ADD COLUMN role TEXT")
    defaults = {
        "household_name": "Our family",
        "reminder_days": "180",
        "show_expired": "1",
    }
    for key, value in defaults.items():
        exists = conn.execute("SELECT 1 FROM settings WHERE key = ?", (key,)).fetchone()
        if not exists:
            conn.execute("INSERT INTO settings(key, value) VALUES (?, ?)", (key, value))


def get_setting(key: str, default: str | None = None) -> str | None:
    with db() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    with db() as conn:
        conn.execute(
            "INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return {k: row[k] for k in row.keys()}


def dumps(data) -> str:
    return json.dumps(data, ensure_ascii=False)
