# V360 Starter

The template every new Vision 360 utility in this repo starts from. It is a real,
running app — not a skeleton — so the scaffold stays honest: CI lints, tests, and
builds it on every push.

Do not develop features here. Stamp out a copy instead:

```bash
node scripts/new-project.mjs invoice-router --title "Invoice Router" --tagline "Offline invoice sorting"
```

## Run

```bash
cd v360-starter
npm install
npm run dev
```

Open http://localhost:5173 and choose **Load sample dataset**.

```bash
npm run lint
npm test
npm run build
npm run preview
```

## What you get

- Vision 360 shell: collapsible sidebar, page header, status bar, dark/light tokens
- The workflow shape every project here shares: `LOAD → SEARCH → SELECT → CONFIRM → RUN → RESULT`
- A reducer-driven state machine with exhaustive `switch` handling
- Toasts, confirmation and completion dialogs, a details drawer, empty/error/loading states
- Local persistence for settings, history, and the last source, namespaced by `APP.slug`
- Keyboard shortcuts: Ctrl/⌘ F, Ctrl/⌘ A, Ctrl/⌘ R, Esc
- 26 tests covering the reducer, search, task runner, formatters, and a full UI walkthrough

## Layout

```text
src/
  app.config.ts          app identity — the generator rewrites this file
  app/
    AppShell.tsx         layout, routing, keyboard shortcuts
    state/machine.ts     reducer and actions
    state/AppStateContext.tsx   side effects, persistence, async flows
    state/store-context.ts      context + useAppStore hook
  components/            common, navigation, records, dialogs, run
  models/app.ts          domain types — replace these first
  pages/                 Dashboard, Records, History, Settings
  services/              demo-data, search, task-runner, settings
  styles/                tokens.css (shared V360 tokens) + app.css
```

## Making it yours

1. Replace `RecordItem` and friends in `src/models/app.ts` with your real domain types.
2. Swap `src/services/demo-data.ts` for the real loader and `src/services/task-runner.ts`
   for the real job. Both keep the progress/abort contract the UI already handles.
3. Rename routes and labels in `src/components/navigation/Sidebar.tsx` and `src/pages/`.
4. Update the tests alongside each change — they are written to be edited, not deleted.

`src/app.config.ts` is the single source of truth for the app name, slug, and tagline.
Keep referencing it instead of hardcoding strings, so the generator keeps working.
