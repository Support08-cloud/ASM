"""Read Indian ID / passport / insurance text and pull structured fields."""

from __future__ import annotations

import re
from datetime import date
from typing import Any, Optional

MONTHS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
    "JANUARY": 1, "FEBRUARY": 2, "MARCH": 3, "APRIL": 4, "JUNE": 6,
    "JULY": 7, "AUGUST": 8, "SEPTEMBER": 9, "OCTOBER": 10,
    "NOVEMBER": 11, "DECEMBER": 12,
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

PAN_4TH = set("PCHFATBLJG")
PAN_RE = re.compile(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b")
AADHAAR_RE = re.compile(r"\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b")
PASSPORT_NO_RE = re.compile(r"\b([A-PR-Z][0-9]{7})\b")
VOTER_RE = re.compile(r"\b([A-Z]{3}[0-9]{7})\b")
DL_RE = re.compile(r"\b([A-Z]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{5,8})\b")
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

TO_DIGIT = str.maketrans("OQILSZB", "0011528")
TO_LETTER = str.maketrans("01528", "OISZB")

FILENAME_HINTS = (
    ("aadhaar", ("aadhaar", "aadhar", "uidai", "uid")),
    ("passport", ("passport", "passprt", "pass")),
    ("pan", ("pancard", "pan-card", "pan_card", " pan ", "-pan", "_pan")),
    ("dl", ("driving", "licence", "license", "dl-card", "dl_card")),
    ("voter", ("voter", "epic", "election")),
    ("insurance", ("insurance", "policy", "hdfc", "icici")),
    ("birth", ("birth",)),
    ("rc", ("-rc", "_rc", "regcert")),
)


def hint_from_filename(name: str) -> Optional[str]:
    lower = f" {name.lower()} "
    for doc_type, keys in FILENAME_HINTS:
        if any(k in lower for k in keys):
            return doc_type
    return None


def _clean(text: str) -> str:
    text = text.replace("\x00", " ")
    text = text.replace("‘", "'").replace("’", "'")
    text = re.sub(r"[ \t]+", " ", text)
    # 31/01/2 004  or  31/01/20 04
    text = re.sub(r"(\d{1,2}[./-]\d{1,2}[./-])(\d)\s+(\d{3})\b", r"\1\2\3", text)
    text = re.sub(r"(\d{1,2}[./-]\d{1,2}[./-])(\d{2})\s+(\d{2})\b", r"\1\2\3", text)
    # 22/122015 -> 22/12/2015
    text = re.sub(r"\b(\d{2})[./-](\d{2})(19|20)(\d{2})\b", r"\1/\2/\3\4", text)
    # 22/1242015 (extra OCR digit between month and year) -> 22/12/2015
    text = re.sub(r"\b(\d{2})[./-](\d{2})\d(19|20)(\d{2})\b", r"\1/\2/\3\4", text)
    return text


def _norm_lines(text: str) -> list[str]:
    return [ln.strip() for ln in _clean(text).splitlines() if ln.strip()]


def _alnum_lt(text: str) -> str:
    return re.sub(r"[^A-Z0-9<]", "", text.upper())


def mrz_check_digit(payload: str) -> str:
    weights = (7, 3, 1)
    total = 0
    table = {str(i): i for i in range(10)}
    table["<"] = 0
    for i, value in enumerate(range(10, 36)):
        table[chr(ord("A") + i)] = value
    for idx, char in enumerate(payload.upper()):
        total += table.get(char, 0) * weights[idx % 3]
    return str(total % 10)


def _mrz_date(raw: str, prefer: str = "past") -> Optional[str]:
    raw = (raw or "").translate(TO_DIGIT)
    match = re.fullmatch(r"(\d{2})(\d{2})(\d{2})", raw)
    if not match:
        return None
    yy, mm, dd = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    if mm < 1 or mm > 12 or dd < 1 or dd > 31:
        return None
    if prefer == "future":
        year = 2000 + yy if yy <= 79 else 1900 + yy
    else:
        year = 1900 + yy if yy >= 30 else 2000 + yy
        if year > date.today().year:
            year -= 100
    try:
        return date(year, mm, dd).isoformat()
    except ValueError:
        return None


def _fix_mrz_line1(raw: str) -> str:
    raw = _alnum_lt(raw)[:44].ljust(44, "<")
    head = raw[:5]
    rest = raw[5:].translate(TO_LETTER)
    rest = re.sub(r"[^A-Z<]", "<", rest)
    return (head[:2] + head[2:5].translate(TO_LETTER) + rest)[:44].ljust(44, "<")


def _fix_mrz_line2(raw: str) -> str:
    raw = _alnum_lt(raw)[:44].ljust(44, "<")
    number = raw[0] + raw[1:9].translate(TO_DIGIT)
    check = raw[9].translate(TO_DIGIT)
    nationality = raw[10:13].translate(TO_LETTER)
    dob = raw[13:19].translate(TO_DIGIT)
    dob_cd = raw[19].translate(TO_DIGIT)
    sex = raw[20] if raw[20] in "MF<" else "M"
    exp = raw[21:27].translate(TO_DIGIT)
    exp_cd = raw[27].translate(TO_DIGIT)
    tail = raw[28:]
    return (number + check + nationality + dob + dob_cd + sex + exp + exp_cd + tail)[:44]


def parse_mrz(text: str) -> Optional[dict[str, Any]]:
    """Parse ICAO 9303 TD3 passport MRZ. Survives spaces and O/0 OCR mixups."""
    blob = _alnum_lt(text)
    line1_best: tuple[int, str] | None = None
    for match in re.finditer(r"P<[A-Z0-9<]{20,}", blob):
        candidate = _fix_mrz_line1(match.group(0))
        if not candidate.startswith("P<") or "<<" not in candidate:
            continue
        score = 3 + (5 if "<<" in candidate else 0) + min(candidate.count("<"), 12)
        if candidate.startswith("P<IND"):
            score += 4
        if line1_best is None or score > line1_best[0]:
            line1_best = (score, candidate)
    line2_best: tuple[int, str] | None = None
    for match in re.finditer(r"[A-Z][0-9OIL]{7}<[0-9O][A-Z0-9<]{20,}", blob):
        candidate = _fix_mrz_line2(match.group(0))
        score = 0
        if re.match(r"[A-Z][0-9]{7}", candidate):
            score += 2
        if candidate[10:13] == "IND":
            score += 8
        if candidate[20] in "MF":
            score += 3
        if candidate.count("<") >= 5:
            score += 6
        if mrz_check_digit(candidate[0:9]) == candidate[9]:
            score += 6
        if _mrz_date(candidate[13:19], "past"):
            score += 2
        if _mrz_date(candidate[21:27], "future"):
            score += 2
        if line2_best is None or score > line2_best[0]:
            line2_best = (score, candidate)
    if not line1_best or not line2_best or line2_best[0] < 10:
        return None
    line1, line2 = line1_best[1], line2_best[1]

    names = line1[5:44]
    surname, _, rest = names.partition("<<")
    given = rest.replace("<", " ").strip()
    surname = surname.replace("<", " ").strip()
    full_name = " ".join(p for p in (given, surname) if p).strip() or None
    passport_no = line2[0:9].replace("<", "")
    match_no = re.match(r"([A-Z][0-9]{7})", passport_no)
    passport_no = match_no.group(1) if match_no else None
    number_ok = mrz_check_digit(line2[0:9]) == line2[9]
    nationality = line2[10:13]
    dob = _mrz_date(line2[13:19], "past")
    sex = {"M": "M", "F": "F"}.get(line2[20], None)
    expiry = _mrz_date(line2[21:27], "future")
    if not passport_no:
        return None
    confidence = 94 if number_ok and expiry else 82
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
    match = re.search(
        r"\b(\d{1,2})[./\- ](\d{1,2}|[A-Z]{3,9})[./\- ](\d{2,4})\b",
        raw,
        re.I,
    )
    if not match:
        digits = re.sub(r"\D", "", raw)
        if len(digits) == 8:
            parsed = None
            try:
                parsed = date(int(digits[4:8]), int(digits[2:4]), int(digits[0:2])).isoformat()
            except ValueError:
                parsed = None
            return parsed
        return None
    day_s, mid, year_s = match.group(1), match.group(2), match.group(3)
    try:
        day = int(day_s)
        month = int(mid) if mid.isdigit() else MONTHS.get(mid[:3], MONTHS.get(mid))
        if not month:
            return None
        year = int(year_s)
        if year < 100:
            year = 2000 + year if year < 50 else 1900 + year
        if year < 1950 or year > 2060:
            return None
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def _dates_in(text: str) -> list[str]:
    found: list[str] = []
    for match in re.finditer(
        r"\b(\d{1,2})[./\- ](\d{1,2}|[A-Z]{3,9})[./\- ](\d{2,4})\b",
        text.upper(),
    ):
        parsed = parse_flexible_date(match.group(0))
        if parsed and parsed not in found:
            found.append(parsed)
    for match in re.finditer(r"\b(\d{2})(\d{2})(19|20)(\d{2})\b", text):
        parsed = parse_flexible_date(f"{match.group(1)}/{match.group(2)}/{match.group(3)}{match.group(4)}")
        if parsed and parsed not in found:
            found.append(parsed)
    return found


def _date_after_label(text: str, labels: tuple[str, ...]) -> Optional[str]:
    for label in labels:
        pattern = re.compile(
            rf"{label}\s*[:\-/]?\s*(\d{{1,2}}[./\-]\d{{1,2}}[./\-]\d{{2,4}}|\d{{8}})",
            re.I,
        )
        match = pattern.search(text)
        if match:
            parsed = parse_flexible_date(match.group(1))
            if parsed:
                return parsed
    return None


def _looks_like_person_name(value: str) -> bool:
    if not value:
        return False
    text = " ".join(value.split())
    if len(text) < 4 or len(text) > 60:
        return False
    if re.search(r"[B-DF-HJ-NP-TV-Z]{5,}", text.upper()):
        return False
    if not re.fullmatch(r"[A-Za-z][A-Za-z .']+", text):
        return False
    skip = {"INDIA", "INDIAN", "REPUBLIC", "SURAT", "GUJARAT", "ADDRESS", "MALE", "FEMALE"}
    if any(w.upper() in skip for w in text.split()):
        return False
    return len(re.findall(r"[AEIOUaeiou]", text)) >= 2


def _name_near(text: str, labels: tuple[str, ...]) -> Optional[str]:
    skip = {
        "INDIA", "GOVERNMENT", "MALE", "FEMALE", "REPUBLIC", "AUTHORITY",
        "FATHER", "MOTHER", "SPOUSE", "ADDRESS", "UNIQUE", "DOWNLOAD",
    }
    for label in labels:
        pattern = re.compile(
            rf"{label}\s*[:\-]?\s*([A-Z][A-Za-z .']{{2,50}})",
            re.I,
        )
        match = pattern.search(text)
        if match:
            name = re.sub(r"\s+", " ", match.group(1)).strip(" .")
            name = re.split(r"\b(DOB|MALE|FEMALE|GENDER|ADDRESS)\b", name, flags=re.I)[0].strip()
            if name.upper() not in skip and len(name) >= 4 and _looks_like_person_name(name):
                return name.title()
    for line in _norm_lines(text):
        if _looks_like_person_name(line) and not any(k in line.upper() for k in skip):
            return line.title()
    return None


def extract_passport_visual(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    looks_like = (
        "PASSPORT" in upper
        or "REPUBLIC OF INDIA" in upper
        or "P<IND" in _alnum_lt(text)
        or "GIVEN NAME" in upper
        or "SURNAME" in upper
    )
    number = None
    labeled = re.search(r"PASSPORT\s*(?:NO|NUMBER|#)?\.?\s*[:\-]?\s*([A-Z]\d{7})", upper)
    if labeled:
        number = labeled.group(1)
    if not number:
        found = PASSPORT_NO_RE.findall(upper)
        if found:
            number = found[0]
    if not looks_like and not number:
        return None
    if not looks_like:
        return None
    surname = None
    sm = re.search(r"SURNAME\s*[:\-]?\s*([A-Z]{2,30})", upper)
    if sm and _looks_like_person_name(sm.group(1)):
        surname = sm.group(1).title()
    given = None
    gm = re.search(r"(?:GIVEN\s*NAMES?|GIVEN\s*NAME\(S\))\s*[:\-]?\s*([A-Z][A-Z ]{2,40})", upper)
    if gm and _looks_like_person_name(gm.group(1)):
        given = gm.group(1).title()
    if not given or not surname:
        for line in _norm_lines(text):
            left = line.split("|")[0].strip()
            if any(x in left.upper() for x in ("FATHER", "MOTHER", "GUARDIAN", "SPOUSE", "ADDRESS")):
                continue
            if not _looks_like_person_name(left):
                continue
            words = left.split()
            if len(words) == 1 and not surname:
                surname = left.title()
            elif len(words) == 2 and not given:
                given = left.title()
            if given and surname:
                break
    person = " ".join(p for p in (given, surname) if p)
    if person and not _looks_like_person_name(person):
        person = given or surname
    date_text = re.split(r"OLD PASSPORT", text, flags=re.I)[0]
    dob = _date_after_label(date_text, ("DATE OF BIRTH", "DOB", "D.O.B"))
    issue = _date_after_label(date_text, ("DATE OF ISSUE", "DATE OF ISS"))
    expiry = _date_after_label(date_text, ("DATE OF EXPIRY", "DATE OF EXP"))
    pair = re.search(
        r"(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\D{1,24}(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})",
        date_text,
    )
    if pair:
        first, second = parse_flexible_date(pair.group(1)), parse_flexible_date(pair.group(2))
        if first and second and second > first:
            issue = issue or first
            expiry = expiry or second
    if not issue:
        for d in _dates_in(date_text):
            if d in {dob, expiry}:
                continue
            issue = d
            break
    if issue and dob and issue == dob:
        issue = None
    if not number and not person:
        return None
    return {
        "doc_type": "passport",
        "doc_number": number,
        "person_name": person,
        "dob": dob,
        "expiry_date": expiry,
        "issue_date": issue,
        "confidence": 88 if number and (expiry or dob) else 74,
        "source": "visual",
    }


def extract_passport(text: str) -> Optional[dict[str, Any]]:
    mrz = parse_mrz(text)
    visual = extract_passport_visual(text)
    if not mrz and not visual:
        return None
    if mrz and not visual:
        return mrz
    if visual and not mrz:
        return visual
    merged = dict(mrz)
    for key in ("doc_number", "person_name", "dob", "expiry_date", "issue_date"):
        if not merged.get(key) and visual.get(key):
            merged[key] = visual[key]
    if visual.get("issue_date") and not merged.get("issue_date"):
        merged["issue_date"] = visual["issue_date"]
    if visual.get("person_name") and _looks_like_person_name(visual["person_name"]):
        vis_words = visual["person_name"].split()
        mrz_words = str(merged.get("person_name") or "").split()
        if len(vis_words) >= 2:
            merged["person_name"] = visual["person_name"]
        elif len(vis_words) == 1 and mrz_words:
            if vis_words[0][:4].lower() == mrz_words[-1][:4].lower():
                mrz_words[-1] = vis_words[0]
                merged["person_name"] = " ".join(mrz_words)
    if merged.get("doc_number"):
        m = re.match(r"([A-Z][0-9]{7})", merged["doc_number"].upper())
        if m:
            merged["doc_number"] = m.group(1)
    merged["source"] = "mrz+visual"
    merged["confidence"] = max(mrz.get("confidence", 0), visual.get("confidence", 0), 90)
    return merged


def repair_pan(raw: str) -> Optional[str]:
    compact = re.sub(r"[^A-Z0-9]", "", raw.upper())
    if len(compact) != 10:
        return None
    letters = (compact[:5] + compact[9]).translate(TO_LETTER)
    digits = compact[5:9].translate(TO_DIGIT)
    candidate = letters[:5] + digits + letters[5]
    if not PAN_RE.fullmatch(candidate):
        return None
    return candidate


def extract_pan(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    number = None
    for match in re.finditer(r"\b[A-Z0-9]{10}\b", upper):
        repaired = repair_pan(match.group(0))
        if repaired:
            number = repaired
            break
    if not number:
        match = PAN_RE.search(upper)
        if match:
            number = match.group(1)
    if not number:
        return None
    keywords = any(k in upper for k in ("PERMANENT ACCOUNT", "INCOME TAX", "PAN CARD", "PAN NO", "PAN:"))
    dates = _dates_in(text)
    dob = _date_after_label(text, ("DATE OF BIRTH", "DOB")) or (dates[0] if dates else None)
    return {
        "doc_type": "pan",
        "doc_number": number,
        "person_name": _name_near(text, ("NAME", "NAAM")),
        "dob": dob,
        "expiry_date": None,
        "issue_date": None,
        "confidence": 92 if keywords and number[3] in PAN_4TH else (80 if keywords else 60),
        "source": "pan",
    }


def extract_aadhaar(text: str) -> Optional[dict[str, Any]]:
    upper = text.upper()
    keywords = any(
        k in upper
        for k in ("AADHAAR", "AADHAR", "UIDAI", "UNIQUE IDENTIFICATION", "YOUR AADHAAR NO")
    )
    spaced = re.search(r"\b\d{4}\s\d{4}\s\d{4}\b", text)
    if not keywords and not spaced:
        return None
    match = AADHAAR_RE.search(text)
    if not match:
        return None
    number = re.sub(r"\D", "", match.group(1))
    if len(number) != 12 or number == number[0] * 12:
        return None
    # Enrolment numbers look like 0635/10533/73133 — not Aadhaar.
    dob = _date_after_label(text, ("DOB", "DATE OF BIRTH", "D.O.B", "जन्म"))
    name = _name_near(text, ("NAME", "NAAM", "TO"))
    return {
        "doc_type": "aadhaar",
        "doc_number": f"{number[0:4]} {number[4:8]} {number[8:12]}",
        "person_name": name,
        "dob": dob,
        "expiry_date": None,
        "issue_date": _date_after_label(text, ("ISSUE DATE",)),
        "confidence": 93 if keywords else 70,
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
    expiry = _date_after_label(text, ("VALID TILL", "VALIDITY", "EXPIRY", "VALID TO"))
    issue = _date_after_label(text, ("DATE OF ISSUE", "DOI", "ISSUE"))
    dates = _dates_in(text)
    if not expiry and dates:
        expiry = max(dates)
        others = [d for d in dates if d != expiry]
        issue = issue or (others[0] if others else None)
    return {
        "doc_type": "dl",
        "doc_number": number,
        "person_name": _name_near(text, ("NAME", "HOLDER")),
        "dob": _date_after_label(text, ("DATE OF BIRTH", "DOB")),
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
        "dob": _date_after_label(text, ("DATE OF BIRTH", "DOB")),
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
    start = _date_after_label(text, ("START DATE", "FROM", "PERIOD", "COMMENCEMENT"))
    end = _date_after_label(text, ("END DATE", "EXPIRY", "VALID TILL", "TO"))
    dates = _dates_in(text)
    if not start and dates:
        start = dates[0]
    if not end and len(dates) > 1:
        end = dates[-1]
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
        "dob": _date_after_label(text, ("DATE OF BIRTH", "DOB")) or (dates[0] if dates else None),
        "expiry_date": None,
        "issue_date": dates[1] if len(dates) > 1 else None,
        "confidence": 75,
        "source": "birth",
    }


def _keyword_boost(doc_type: str, text: str, hint: Optional[str]) -> int:
    upper = text.upper()
    keys = {
        "passport": ("PASSPORT", "REPUBLIC OF INDIA", "P<IND", "GIVEN NAME"),
        "aadhaar": ("AADHAAR", "AADHAR", "UIDAI", "UNIQUE IDENTIFICATION"),
        "pan": ("PERMANENT ACCOUNT", "INCOME TAX", "PAN CARD"),
        "dl": ("DRIVING LICENCE", "DRIVING LICENSE", "DL NO"),
        "voter": ("ELECTION COMMISSION", "EPIC", "VOTER"),
        "insurance": ("INSURANCE", "POLICY NO", "HDFC", "PREMIUM"),
        "birth": ("BIRTH CERTIFICATE",),
    }
    boost = 0
    if any(k in upper for k in keys.get(doc_type, ())):
        boost += 20
    if hint == doc_type:
        boost += 25
    # Strong competing keywords reduce a weak guess.
    for other, words in keys.items():
        if other != doc_type and any(k in upper for k in words):
            boost -= 8
    return boost


def detect_and_extract(text: str, hint: Optional[str] = None) -> dict[str, Any]:
    """Pick the strongest document type from OCR / PDF text."""
    text = _clean(text)
    candidates: list[dict[str, Any]] = []
    for fn in (
        extract_passport,
        extract_pan,
        extract_aadhaar,
        extract_dl,
        extract_voter,
        extract_insurance,
        extract_birth,
    ):
        parsed = fn(text)
        if parsed:
            parsed["confidence"] = min(
                99, parsed.get("confidence", 0) + _keyword_boost(parsed["doc_type"], text, hint)
            )
            candidates.append(parsed)

    if hint and not any(c["doc_type"] == hint for c in candidates):
        # Filename said passport/PAN but OCR was weak — still prefer that type if we have a number.
        pass

    if not candidates:
        dates = _dates_in(text)
        return {
            "doc_type": hint or "other",
            "doc_number": None,
            "person_name": _name_near(text, ("NAME",)),
            "dob": _date_after_label(text, ("DOB", "DATE OF BIRTH")),
            "expiry_date": dates[-1] if dates else None,
            "issue_date": None,
            "confidence": 25 if hint else 20,
            "source": "unknown",
            "needs_review": True,
        }

    best = max(candidates, key=lambda c: c.get("confidence", 0))
    if hint and any(c["doc_type"] == hint for c in candidates):
        hinted = [c for c in candidates if c["doc_type"] == hint]
        best = max(hinted, key=lambda c: c.get("confidence", 0))
    best["needs_review"] = best.get("confidence", 0) < 80 or not best.get("doc_number")
    if best.get("person_name"):
        best["person_name"] = " ".join(str(best["person_name"]).split()).title()
    return best


def label_for(doc_type: str) -> str:
    return DOC_LABELS.get((doc_type or "other").lower(), "Document")
