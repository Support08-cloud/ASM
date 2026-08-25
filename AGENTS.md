# ASM — repository guide

This repository (`asm`) is an umbrella / "utility" repo. The `main` branch is intentionally
almost empty (just `README.md`). Each product is developed on its own long-lived branch, and
the branches use **completely different tech stacks**. Pick the branch for the product you want
to work on before installing or running anything.

## Products (by branch)

| Branch | Product | Stack | Runs on Linux VM? |
|---|---|---|---|
| `cursor/upad-management-system-94f2` | Vision 360 Advance Salary Manager (`asm-app`) | Next.js 16 (App Router) + React 19 + Prisma 7 + SQLite | Yes |
| `cursor/doc-manager-app-ae35` | Vision 360 Doc Manager | Python 3.12 + FastAPI + Uvicorn + SQLite + Tesseract OCR | Yes |
| `cursor/v360-branded-exe-99bc` | Diamond File Router (branded build) | .NET / WPF desktop (Windows) | No (Windows-only) |
| `cursor/diamond-file-router-d058` | Diamond File Router | .NET / WPF desktop (Windows) | No (Windows-only) |

Per-project run/build/lint/test commands are documented in each branch's own `README.md` and
`package.json` / `requirements.txt` / `.sln`. Prefer those sources. Both Next.js and Doc Manager
branches also ship their own `AGENTS.md` with project-specific notes.

## Cursor Cloud specific instructions

The startup dependency-refresh script is branch-aware and idempotent: `npm ci`/`npm install`
when a `package.json` is present, and a `.venv` + `pip install -r requirements.txt` when a
`requirements.txt` is present. It is a safe no-op on `main`. It does **not** create databases,
`.env` files, or install system packages — do those per project below.

Non-obvious, durable caveats for this VM:

- **`main` has no application.** Don't try to build/run from `main`; check out a product branch first.
- **System packages** (not handled by the update script): the base image has `git`, `node` 22,
  `python3` 3.12 and C/C++ build tools (`gcc`/`g++`/`make`, needed for `better-sqlite3`).
  You must additionally install `python3-venv` (`sudo apt-get install -y python3.12-venv`) for the
  Doc Manager, and `tesseract-ocr` (`sudo apt-get install -y tesseract-ocr`) for its image OCR.
  `dotnet` is **not** installed and the two Diamond File Router branches are WPF/Windows desktop
  apps that cannot run on this Linux VM.
- **Next.js ASM app** (`cursor/upad-management-system-94f2`): needs a `.env` (copy `.env.example`,
  set a real `AUTH_SECRET`, e.g. `openssl rand -hex 32`). The SQLite file `prisma/dev.db` is
  gitignored and is **not** created by the update script — initialize it with
  `npx prisma migrate deploy` then `npm run db:seed` before running. Dev server: `npm run dev`
  (port 3000). Lint: `npm run lint`. Tests: `npm test` (plain `node:test`, no DB needed). Seed prints
  logins: admin `admin` / `Vision360@admin`, reception `reception` / `Reception@123`, plus demo
  employee 4-digit PINs. Issuing an upad or salary payout requires an employee PIN.
- **Doc Manager** (`cursor/doc-manager-app-ae35`): copy `.env.example` to `.env` and set `SECRET_KEY`.
  Create/activate `.venv` and `pip install -r requirements.txt`. Run:
  `python -m uvicorn app.main:app --host 0.0.0.0 --port 8080`. Tests: `python -m pytest` (18 tests,
  no OCR needed). The app starts without `tesseract-ocr`, but uploading images for field extraction
  needs it installed. Data (SQLite + files) is stored under `DATA_DIR` (default `./data`).
