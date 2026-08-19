<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Vision 360 Advance Salary Manager is a single Next.js 16 (App Router, React 19) service backed by a local SQLite database via Prisma 7 (`@prisma/adapter-better-sqlite3`). There is one product/service; commands are already documented in `README.md` and `package.json` scripts — this section only captures non-obvious startup caveats.

- Requires a `.env` file (not committed). Copy `.env.example` to `.env` and set a real `AUTH_SECRET` (e.g. `openssl rand -hex 32`). `prisma.config.ts` and the app read `DATABASE_URL` from `.env` via dotenv, so Prisma commands fail without it.
- The SQLite file (`prisma/dev.db`) is gitignored and is NOT recreated by the dependency-install update script. On a fresh VM, initialize the database before running the app: `npx prisma migrate deploy` then `npm run db:seed`.
- `npm run db:seed` prints the login/PIN credentials it created: admin `admin` / `Vision360@admin`, reception `reception` / `Reception@123`, and demo employee PINs (e.g. Ravi `4826`). Issuing an upad or a salary payout requires the employee's 4-digit PIN, and too many wrong tries locks the employee — read the seed output for current PINs.
- Run the dev server with `npm run dev` (port 3000). `npm run build` runs `prisma generate` first, so a clean checkout can build without a separate generate step. Tests are plain `node:test` files run via `npm test` (tsx over `src/lib/*.test.ts`); no DB is needed for them.
- `DEMO_OTP="true"` in `.env` makes the "Forgot PIN" flow surface the OTP on screen instead of sending real SMS (MSG91 is optional and unconfigured by default).
