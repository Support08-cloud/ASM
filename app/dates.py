"""Expiry colours, renewal dates, and dashboard ranking."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

# Lead time before expiry when the family should apply for renewal.
RENEW_LEAD_DAYS = {
    "passport": 180,
    "dl": 30,
    "rc": 30,
    "insurance": 60,
    "medical": 30,
    "voter": 0,
    "pan": 0,
    "aadhaar": 0,
    "birth": 0,
    "photo": 0,
    "other": 90,
}

NO_EXPIRY_TYPES = {"pan", "aadhaar", "voter", "birth", "photo"}


def parse_iso(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    text = str(value).strip()[:10]
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def days_until(expiry: Optional[date], today: Optional[date] = None) -> Optional[int]:
    if expiry is None:
        return None
    today = today or date.today()
    return (expiry - today).days


def renew_date_for(doc_type: str, expiry: Optional[date]) -> Optional[date]:
    if expiry is None:
        return None
    lead = RENEW_LEAD_DAYS.get((doc_type or "other").lower(), 90)
    if lead <= 0:
        return expiry
    return expiry - timedelta(days=lead)


def expiry_bucket(expiry: Optional[date], today: Optional[date] = None) -> Optional[str]:
    """Row colour: red < 2 months, orange < 4 months, green < 6 months."""
    remaining = days_until(expiry, today)
    if remaining is None:
        return None
    if remaining < 61:
        return "red"
    if remaining < 122:
        return "orange"
    if remaining < 183:
        return "green"
    return None


def on_dashboard(expiry: Optional[date], today: Optional[date] = None) -> bool:
    """Upcoming expiries (within 6 months) and already-expired docs stay on the board."""
    remaining = days_until(expiry, today)
    if remaining is None:
        return False
    return remaining < 183
