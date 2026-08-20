"""
Vision 360 Doc Manager
======================

Family document vault for iPhone and other phones.

- One shared PIN for the household
- Documents stay on the server disk (SQLite + files) so they are not lost when you change phones
- Upload a zip, PDF, JPG, or PNG — the app reads passport / PAN / Aadhaar / DL / insurance details
- Dashboard colours: red < 2 months, orange < 4 months, green < 6 months

Run (office PC, Raspberry Pi, or any always-on machine)
-------------------------------------------------------

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8080
```

On iPhone: open `http://THAT-PC-LAN-IP:8080` in Safari, then Share → Add to Home Screen.

For access outside the house, put HTTPS in front (Cloudflare Tunnel, Tailscale, or a VPS).

First open
----------

Create a 4–8 digit family PIN. The same PIN works on every phone for 90 days.

Tests
-----

```bash
pytest -q
```
"""
