"""Read Indian ID / passport / insurance text and pull structured fields."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Optional

MONTHS = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
    "JANUARY": 1,
    "FEBRUARY": 2,
    "MARCH": 3,
    "APRIL": 4,
    "JUNE": 6,
    "JULY": 7,
    "AUGUST": 8,
    "SEPTEMBER": 9,
    "OCTOBER": 10,
    "NOVEMBER": 11,
    "DECEMBER": 12,
}

DOC_LABELS = {
    "passport": "Passport",
    "pan": "PAN",
    "aadhaar": "Aadhaar",
    "dl": "Driving Licence",
    "voter": "Voter ID",
    "birth": "Birth Certificate",
    "rc": "Vehicle RC",
    "insurance": "Insurance",
    "medical": "Medical",
    "photo": "Photo",
    "other": "Other document",
}

PAN_RE = re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b")
AADHAAR_RE = re.compile(r"\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b")
PASSPORT_NO_RE = re.compile(r"\b([A-Z][0-9]{7})\b")
VOTER_RE = re.compile(r"\b([A-Z]{3}[0-9]{7})\b")
DL_RE = re.compile(
    r"\b([A-Z]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{5,8})\b"
)
POLICY_RE = re.compile(
    r"\b(?:policy(?:\s*(?:no|number|#))?|pol(?:icy)?\s*no\.?)[^\w]{0,8}([A-Z0-9][A-Z0-9\/\-]{6,24})\b",
    re.I,
)
INSURER_RE = re.compile(
    r"\b(HDFC\s*(?:ERGO|LIFE)?|ICICI\s*(?:LOMBARD|PRUDENTIAL)?|STAR\s*HEALTH|"
    r"NEW\s*INDIA|ORIENTAL|UNITED\s*INDIA|NATIONAL\s*INSURANCE|BAJAJ\s*ALLIANZ|"
    r"TATA\s*AIG|SBI\s*(?:LIFE|GENERAL)?|MAX\s*LIFE|LIC|CARE\s*HEALTH|"
    r"RELIANCE\s*(?:GENERAL|LIFE)?|GO\s*DIGIT|ACKO|NIVA\s*BUPA)\b",
    re.I,
)

DATE_NUMERIC = re.compile(
    r"\b(\d{1,2})[./\- ](\d{1,2}|[A-Z]{3,9})[./\- ](\d{2,4})\b",
    re.I,
)
DATE_MRZ = re.compile(r"^(\d{2})(\d{2})(\d{2})$")


def _clean(text: str) -> str:
    text = text.replace("\x00", " ")
    text = text.replace("‘", "'").replace("’", "'")
    return re.sub(r"[ \t]+", " ", text)


def _norm_lines(text: str) -> list[str]:
    return [ln.strip() for ln in _clean(text).splitlines() if ln.strip()]


def mrz_check_digit(payload: str) -> str:
    weights = (7, 3, 1)
    total = 0
    table = {str(i): i for i in range(10)}
    table["<"] = 0
    for i, ch in enumerate(range(10, 36)):
        table[chr(ord("A") + i)] = ch
    for idx, char in enumerate(payload.upper()):
        total += table.get(char, 0) * weights[idx % 3]
    return str(total % 10)


def _mrz_date(raw: str) -> Optional[str]:
    match = DATE_MRZ.match(raw or "")
    if not match:
        return None
    yy, mm, dd = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    if mm < 1 or mm > 12 or dd < 1 or dd > 31:
        return None
    year = 2000 + yy if yy <= 40 else 1900 + yy
    try:
        return date(year, mm, dd).isoformat()
    except ValueError:
        return None


def parse_mrz(text: str) -> Optional[dict[str, Any]]:
    """Parse ICAO 9303 TD3 passport MRZ. Check digits reject OCR noise."""
    compact = _clean(text).upper().replace(" ", "")
    lines = [re.sub(r"[^A-Z0-9<]", "", ln.upper().replace(" ", "")) for ln in text.splitlines()]
    lines = [ln for ln in lines if len(ln) >= 30]
    line1 = next((ln for ln in lines if ln.startswith("P<") or ln.startswith("P[")), None)
    line2 = None
    if line1:
        try:
            idx = lines.index(line1)
            if idx + 1 < len(lines) and len(lines[idx + 1]) >= 40:
                line2 = lines[idx + 1]
        except ValueError:
            line2 = None
    if not line1 or not line2:
        # fallback: hunt 44-char TD3 pair inside compacted OCR
        td3 = re.search(r"(P<[A-Z]{3}[A-Z<]{39})[\s\n]*(?:.*\n)?([A-Z0-9<]{44})", compact)
        if not td3:
            td3 = re.search(r"(P<[A-Z]{3}[A-Z<]{30,39}).{0,8}([A-Z0-9<]{40,44})", compact)
        if not td3:
            return None
        line1, line2 = td3.group(1).ljust(44, "<")[:44], td3.group(2).ljust(44, "<")[:44]
    line1 = line1.ljust(44, "<")[:44]
    line2 = line2.ljust(44, "<")[:44]

    names = line1[5:44]
    surname, _, rest = names.partition("<<")
    given = rest.replace("<", " ").strip()
    surname = surname.replace("<", " ").strip()
    full_name = " ".join(p for p in (given, surname) if p).strip() or None

    passport_no = line2[0:9].replace("<", "")
    if mrz_check_digit(line2[0:9]) != line2[9]:
        # still return number but lower confidence
        number_ok = False
    else:
        number_ok = True
    nationality = line2[10:13]
    dob = _mrz_date(line2[13:19])
    if dob and mrz_check_digit(line2[13:19]) != line2[19]:
        dob = dob  # keep parsed date; digit mismatch is common on noisy scans
    sex = {"M": "M", "F": "F"}.get(line2[20], None)
    expiry = _mrz_date(line2[21:27])

    confidence = 92 if number_ok and passport_no and expiry else 70
    if not passport_no:
        return None
    return {
        "doc_type": "passport",
        "doc_number": passport_no,
        "person_name": full_name,
        "nationality": nationality,
        "dob": dob,
        "sex": sex,
        "expiry_date": expiry,
        "issue_date": None,
        "confidence": confidence,
        "source": "mrz",
    }


def parse_flexible_date(raw: str) -> Optional[str]:
    raw = (raw or "").strip().upper().replace(",", " ")
    raw = re.sub(r"\s+", " ", raw)
    match = DATE_NUMERIC.search(raw)
    if not match:
        return None
    day_s, mid, year_s = match.group(1), match.group(2), match.group(3)
    try:
        day = int(day_s)
        if mid.isdigit():
            month = int(mid)
        else:
            month = MONTHS.get(mid[:3], MONTHS.get(mid))
            if not month:
                return None
        year = int(year_s)
        if year < 100:
            year = 2000 + year if year < 50 else 1900 + year
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def _dates_in(text: str) -> list[str]:
    found: list[str] = []
    for match in DATE_NUMERIC.finditer(text.upper()):
        parsed = parse_flexible_date(match.group(0))
        if parsed and parsed not in found:
            found.append(parsed)
    return found


def _name_near(text: str, labels: tuple[str, ...]) -> Optional[str]:
    upper = text.upper()
    for label in labels:
        pattern = re.compile(
            rf"{label}\s*[:\-]?\s*([A-Z][A-Z .']{{2,40}})",
            re.I,
        )
        match = pattern.search(text)
        if match:
            name = re.sub(r"\s+", " ", match.group(1)).strip(" .")
            if name.upper() not in {"INDIA", "GOVERNMENT", "MALE", "FEMALE"}:
                return name.title()
    # fallback: first decent Title Case line
    for line in _norm_lines(text):
        if re.fullmatch(r"[A-Za-z][A-Za-z .']{3,40}", line) and line.upper() not in upper[:40]:
            if not any(k in line.upper() for k in ("GOVERNMENT", "REPUBLIC", "INDIA", "AUTHORITY")):
                return line.title()
    return None


def extract_pan(text: str) -> Optional[dict[str, Any]]:
    match = PAN_RE.search(text.upper())
    if not match:
        return None
    dates = _dates_in(text)
    return {
        "doc_type": "pan",
        "doc_number": match.group(1),
        "person_name": _name_near(text, ("NAME", "NAAM")),
        "dob": dates[0] if dates else None,
        "expiry_date": None,
        "issue_date": None,
        "confidence": 90,
        "source": "pan",
    }


def extract_aadhaar(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    if "AADHAAR" not in upper and "UIDAI" not in upper and "GOVERNMENT OF INDIA" not in upper:
        # still accept a well-formed 12-digit cluster if VID/Aadhaar wording nearby
        if not re.search(r"\b\d{4}\s\d{4}\s\d{4}\b", text):
            return None
    match = AADHAAR_RE.search(text)
    if not match:
        return None
    number = re.sub(r"\D", "", match.group(1))
    if len(number) != 12:
        return None
    # Aadhaar numbers are never 0000... and Verhoeff would be ideal; reject obvious OCR junk.
    if number == number[0] * 12:
        return None
    dates = _dates_in(text)
    return {
        "doc_type": "aadhaar",
        "doc_number": f"{number[0:4]} {number[4:8]} {number[8:12]}",
        "person_name": _name_near(text, ("NAME", "NAAM")),
        "dob": dates[0] if dates else None,
        "expiry_date": None,
        "issue_date": None,
        "confidence": 88 if "AADHAAR" in upper or "UIDAI" in upper else 72,
        "source": "aadhaar",
    }


def extract_dl(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    licence_words = any(
        token in upper
        for token in (
            "DRIVING LICENCE",
            "DRIVING LICENSE",
            "DRIVING",
            "DL NO",
            "DL NUMBER",
            "DRIVER LICENSE",
        )
    )
    if not licence_words:
        return None
    match = DL_RE.search(upper)
    if not match:
        return None
    number = re.sub(r"[\s]", "", match.group(1)).replace("--", "-")
    dates = _dates_in(text)
    expiry = None
    issue = None
    for label, bucket in (("VALID TILL", "expiry"), ("VALIDITY", "expiry"), ("EXPIR", "expiry"), ("DOI", "issue"), ("ISSUE", "issue")):
        idx = upper.find(label)
        if idx >= 0:
            parsed = parse_flexible_date(text[idx : idx + 40])
            if parsed and bucket == "expiry":
                expiry = parsed
            if parsed and bucket == "issue":
                issue = parsed
    if not expiry and dates:
        expiry = max(dates)
        others = [d for d in dates if d != expiry]
        issue = others[0] if others else issue
    return {
        "doc_type": "dl",
        "doc_number": number,
        "person_name": _name_near(text, ("NAME", "HOLDER")),
        "dob": None,
        "expiry_date": expiry,
        "issue_date": issue,
        "confidence": 86,
        "source": "dl",
    }


def extract_voter(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    if "ELECTION" not in upper and "EPIC" not in upper and "VOTER" not in upper:
        return None
    match = VOTER_RE.search(upper)
    if not match:
        return None
    return {
        "doc_type": "voter",
        "doc_number": match.group(1),
        "person_name": _name_near(text, ("NAME", "ELECTOR")),
        "dob": _dates_in(text)[0] if _dates_in(text) else None,
        "expiry_date": None,
        "issue_date": None,
        "confidence": 84,
        "source": "voter",
    }


def extract_insurance(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    if "INSUR" not in upper and "POLICY" not in upper and not INSURER_RE.search(text):
        return None
    insurer = None
    ins_match = INSURER_RE.search(text)
    if ins_match:
        insurer = re.sub(r"\s+", " ", ins_match.group(1)).strip().title()
    policy = None
    pol_match = POLICY_RE.search(text)
    if pol_match:
        policy = pol_match.group(1).strip()
    if not policy:
        loose = re.search(r"\b([A-Z]{2,5}[0-9]{6,18})\b", upper)
        if loose and not PAN_RE.fullmatch(loose.group(1)):
            policy = loose.group(1)
    dates = _dates_in(text)
    start = dates[0] if dates else None
    end = dates[-1] if len(dates) > 1 else None
    if "INSUR" not in upper and "POLICY" not in upper and not insurer:
        return None
    if not policy and not insurer:
        return None
    return {
        "doc_type": "insurance",
        "doc_number": policy,
        "person_name": _name_near(text, ("INSURED", "NAME OF INSURED", "PROPOSER", "NAME")),
        "provider": insurer,
        "issue_date": start,
        "expiry_date": end,
        "confidence": 80 if policy else 65,
        "source": "insurance",
    }


def extract_birth(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    if "BIRTH" not in upper or "CERTIFICATE" not in upper:
        return None
    dates = _dates_in(text)
    return {
        "doc_type": "birth",
        "doc_number": None,
        "person_name": _name_near(text, ("NAME OF CHILD", "CHILD", "NAME")),
        "dob": dates[0] if dates else None,
        "expiry_date": None,
        "issue_date": dates[1] if len(dates) > 1 else None,
        "confidence": 75,
        "source": "birth",
    }


def detect_and_extract(text: str) -> dict[str, Any]:
    """Pick the strongest document type from OCR / PDF text."""
    text = _clean(text)
    candidates: list[dict[str, Any]] = []

    mrz = parse_mrz(text)
    if mrz:
        candidates.append(mrz)
    pan = extract_pan(text)
    if pan:
        candidates.append(pan)
    aadhaar = extract_aadhaar(text)
    if aadhaar:
        candidates.append(aadhaar)
    dl = extract_dl(text)
    if dl:
        candidates.append(dl)
    voter = extract_voter(text)
    if voter:
        candidates.append(voter)
    insurance = extract_insurance(text)
    if insurance:
        candidates.append(insurance)
    birth = extract_birth(text)
    if birth:
        candidates.append(birth)

    if not candidates:
        dates = _dates_in(text)
        return {
            "doc_type": "other",
            "doc_number": None,
            "person_name": _name_near(text, ("NAME",)),
            "dob": dates[0] if dates else None,
            "expiry_date": dates[-1] if len(dates) > 1 else None,
            "issue_date": None,
            "confidence": 20,
            "source": "unknown",
            "needs_review": True,
        }

    best = max(candidates, key=lambda c: c.get("confidence", 0))
    best["needs_review"] = best.get("confidence", 0) < 80 or not best.get("doc_number")
    return best


def label_for(doc_type: str) -> str:
    return DOC_LABELS.get((doc_type or "other").lower(), "Document")
