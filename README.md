# Vision 360 Doc Manager

Family document vault for iPhone and other phones.

- One shared PIN for the household
- Documents stay on the server disk (SQLite + files) so they are not lost when you change phones
- Upload a zip, PDF, JPG, or PNG — the app reads passport / PAN / Aadhaar / DL / insurance details
- Nested families: VBA can have his own family with NVA (wife) under him
- Settings: household name, reminder window, PIN change, backup zip

## Run (office PC, Raspberry Pi, or any always-on machine)

Install Tesseract so photos can be read:

```bash
sudo apt-get install -y tesseract-ocr
```

Then:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Or `docker compose up --build`.

On iPhone: open `http://THAT-PC-LAN-IP:8080` in Safari, then Share → Add to Home Screen.

Keep that machine running so every phone sees the same data. For access outside the house, put HTTPS in front (Cloudflare Tunnel, Tailscale, or a VPS).

## Where files are stored

Everything stays on the computer that runs the app (not on the iPhone):

| What | Path |
|---|---|
| Uploaded PDFs / photos | `data/uploads/` |
| Names, numbers, dates | `data/docmanager.sqlite3` |

With Docker this is the `/data` volume. Delete a document in the app to remove it. Copy the whole `data/` folder to back up the family vault.

## First open

Create a 4–8 digit family PIN. The same PIN works on every phone for 90 days.

## Tests

```bash
pytest -q
```
