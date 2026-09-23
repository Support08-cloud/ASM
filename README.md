# ASM

Internal Vision 360 utilities. Each project is a self-contained app in its own
directory with its own `package.json` and CI workflow.

## Projects

<!-- projects:start -->
| Project | What it does |
| --- | --- |
| [`diamond-utility`](diamond-utility) | Desktop-style local diamond data processor (scan → select → Get MP4) |
| [`v360-starter`](v360-starter) | Template every new project starts from |
<!-- projects:end -->

## Start a new project

```bash
node scripts/new-project.mjs invoice-router --title "Invoice Router" --tagline "Offline invoice sorting"
cd invoice-router
npm install
npm run dev
```

That copies [`v360-starter`](v360-starter) — a running React + TypeScript + Vite app with the
Vision 360 shell, state machine, and tests already wired up — renames it throughout,
adds a matching GitHub Actions workflow, and registers it in the table above.

| Option | Default |
| --- | --- |
| `--title` | Title-cased slug |
| `--tagline` | The template's tagline |
| `--template` | `v360-starter` |
| `--force` | Off — refuses to overwrite an existing directory |
| `--dry-run` | Off — prints the plan without writing |

Run `node scripts/new-project.mjs --help` for the full list, and
`node --test scripts/*.test.mjs` to exercise the generator.

## Conventions

Every project uses React 19, TypeScript, Vite, oxlint, and Vitest, with the shared
design tokens in `src/styles/tokens.css` and these scripts:

```bash
npm run dev      # http://localhost:5173
npm run lint
npm test
npm run build
npm run preview  # http://localhost:4173
```
