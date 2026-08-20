from datetime import date

from app.dates import expiry_bucket, on_dashboard, renew_date_for
from app.extract import detect_and_extract, mrz_check_digit, parse_mrz


def test_mrz_check_digit_known_sample():
    assert mrz_check_digit("L898902C3") == "6"


def test_parse_passport_mrz():
    text = """
    REPUBLIC OF INDIA
    P<INDLASTNAME<<RAHUL<KUMAR<<<<<<<<<<<<<<<<<<
    A1234567<8IND9001014M3001017<<<<<<<<<<<<<<04
    """
    parsed = parse_mrz(text)
    assert parsed is not None
    assert parsed["doc_type"] == "passport"
    assert parsed["doc_number"].startswith("A1234567")
    assert parsed["expiry_date"] == "2030-01-01"
    assert parsed["dob"] == "1990-01-01"
    assert "RAHUL" in parsed["person_name"].upper()


def test_pan_extract():
    text = """
    INCOME TAX DEPARTMENT
    GOVT OF INDIA
    Permanent Account Number Card
    ABCDE1234F
    Name
    RAHUL KUMAR SHARMA
    Date of Birth
    01/01/1990
    """
    parsed = detect_and_extract(text)
    assert parsed["doc_type"] == "pan"
    assert parsed["doc_number"] == "ABCDE1234F"
    assert parsed["confidence"] >= 80


def test_aadhaar_extract():
    text = """
    GOVERNMENT OF INDIA
    AADHAAR
    2345 6789 0123
    Name RAHUL SHARMA
    DOB 15/08/1988
    """
    parsed = detect_and_extract(text)
    assert parsed["doc_type"] == "aadhaar"
    assert parsed["doc_number"] == "2345 6789 0123"


def test_dl_extract():
    text = """
    INDIAN UNION DRIVING LICENCE
    DL No MH-12-20110012345
    NAME RAHUL SHARMA
    Valid Till 12/12/2028
    Date of Issue 12/12/2018
    """
    parsed = detect_and_extract(text)
    assert parsed["doc_type"] == "dl"
    assert "MH12" in parsed["doc_number"].replace("-", "")
    assert parsed["expiry_date"] == "2028-12-12"


def test_insurance_extract():
    text = """
    HDFC ERGO General Insurance
    Policy No 1234567890123
    Insured Name RAHUL SHARMA
    Period 01/04/2025 to 31/03/2026
    """
    parsed = detect_and_extract(text)
    assert parsed["doc_type"] == "insurance"
    assert parsed["provider"]
    assert "HDFC" in parsed["provider"].upper()
    assert parsed["doc_number"]
    assert parsed["expiry_date"] == "2026-03-31"


def test_expiry_colours():
    today = date(2026, 8, 20)
    assert expiry_bucket(date(2026, 9, 10), today) == "red"
    assert expiry_bucket(date(2026, 11, 1), today) == "orange"
    assert expiry_bucket(date(2027, 1, 15), today) == "green"
    assert expiry_bucket(date(2027, 12, 1), today) is None
    assert on_dashboard(date(2026, 10, 1), today) is True
    assert on_dashboard(date(2028, 1, 1), today) is False


def test_passport_renew_is_180_days():
    expiry = date(2027, 1, 1)
    assert renew_date_for("passport", expiry) == date(2026, 7, 5)


def test_garbled_passport_mrz_from_phone_photo():
    """Typical Tesseract output from an open Indian passport photo."""
    text = """
    REPUBLIC OF INDIA
    Passport No.
    A1234567
    Surname ANKOLIYA
    VANSH BALKRUSHNABHAI
    Date of Birth 31/01/2 004
    Date of Issue 22/1242015
    Date of Expiry 21/12/2020
    P<INDANKOLIYA<<VANSH<BALKRUSHNABHA I<<<<<<<<< | junk
    A12 34567<8 INDO4O13 19M20122 16<<e< junk
    """
    parsed = detect_and_extract(text, hint="passport")
    assert parsed["doc_type"] == "passport"
    assert parsed["doc_number"].startswith("A1234567")
    assert parsed["dob"] == "2004-01-31"
    assert parsed["expiry_date"] == "2020-12-21"
    assert parsed["issue_date"] == "2015-12-22"


def test_aadhaar_uses_dob_not_download_date():
    text = """
    UNIQUE IDENTIFICATION AUTHORITY OF INDIA
    AADHAAR
    Vansh Kumar
    DOB: 31/01/2004
    Download Date: 09/06/2021
    Issue Date: 07/06/2021
    2345 6789 0123
    """
    parsed = detect_and_extract(text)
    assert parsed["doc_type"] == "aadhaar"
    assert parsed["doc_number"] == "2345 6789 0123"
    assert parsed["dob"] == "2004-01-31"


def test_filename_hint_prefers_passport_over_stray_pan_like_text():
    from app.extract import hint_from_filename

    assert hint_from_filename("VBA - passport (2015-2020).jpg") == "passport"
    assert hint_from_filename("VBA.pdf") is None

