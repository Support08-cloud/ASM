# Diamond Utility

Premium desktop-style utility for organizing local diamond folders and extracting MP4s.

Core workflow:

```text
SOURCE → SCAN → SEARCH → SELECT → GET MP4 → RESULT
```

Folders such as `Krish_Front`, `Krish_3D`, `Krish_Top`, `Krish_360`, and `Krish_ER` are grouped into one diamond record (`KRISH`) with view-level status. Source files are never modified.

## Run

```bash
cd diamond-utility
npm install
npm run dev
```

Open http://localhost:5173.

- **Load sample dataset** on the empty dashboard to exercise the full UI without a production share.
- In Chromium, **Change** on Source / Output uses the folder picker when the File System Access API is available.

```bash
npm test
npm run build
npm run preview
```

## Phase 1

- Dashboard with path cards, search, filters, cards/list density, details drawer
- Get MP4 confirmation, processing, and completion
- History and settings (theme, density, duplicate policy)
- Keyboard: Ctrl/⌘ F, A, R, Esc, Enter, Delete
