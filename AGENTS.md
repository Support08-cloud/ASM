# Vision 360 · Image Studio

Offline batch image resizer/converter/compressor. Vite + TypeScript + vanilla DOM, no UI
framework. See `README.md` for the feature list and `package.json` for all scripts.

## Cursor Cloud specific instructions

One static front-end, no backend, no database and no environment variables — `npm install`
then `npm run dev` (port 5173) is the whole setup. Standard commands are in `package.json`;
only the non-obvious things are recorded here.

- **The single-file build is the product, not a convenience.** `npm run build` emits exactly
  one `dist/index.html` with everything inlined, meant to be opened from disk. If you add an
  asset, keep it inlineable (data URI or bundled) — a build that references an external file
  breaks the core promise and will not fail any test.

- **Never let the build emit `<script type="module">`.** Chrome refuses to run module scripts
  on the `file://` origin, so the page renders and then does nothing at all, with no error in
  the UI. The `runnable-from-disk` plugin in `vite.config.ts` rewrites the inlined module into
  a classic script and moves it to the end of `<body>` (`defer` is ignored on inline scripts).
  Do not "simplify" this away. Setting `rollupOptions.output.format: 'iife'` is *not* an
  alternative — it silently drops the bundle from the HTML entirely.

- **Verify offline mode after touching the build.** Serving over `localhost` proves nothing
  about `file://`. Open `dist/index.html` directly and confirm the JS actually ran — the
  format buttons, crop-anchor grid and preset chips are all generated at runtime, so if they
  are missing the script did not execute. A quick headless check:
  ```bash
  google-chrome --headless --no-sandbox --user-data-dir=/tmp/probe \
    --virtual-time-budget=5000 --dump-dom file:///workspace/dist/index.html \
    | grep -c 'class="anchor"'   # expect 9
  ```
  Run it with a throwaway `--user-data-dir`, otherwise it fails when a desktop Chrome already
  holds the profile lock.

- **The settings column clips silently if you touch its layout.** `.panel--settings` is a
  flex column with a capped height, so its `<details>` children will shrink below their
  content and `.group { overflow: hidden }` then hides the form fields — which reads as
  "the input is missing" rather than as a layout bug. `.panel--settings > * { flex: none }`
  is what keeps it scrolling instead of clipping.

- **Form fields need explicit contrast.** The panel background is off-white, so inputs use
  dedicated `--field-bg` / `--field-border` tokens. Reverting them to `--paper`/`--line`
  makes text and number inputs effectively invisible against the panel.

- **Canvas work cannot be unit tested here.** Vitest runs in Node with no canvas, so the pure
  maths lives in `src/lib/{geometry,naming,filesize,formats,settings}.ts` and is tested
  directly; `src/lib/image.ts` is the only module that touches a canvas and is covered by
  manual browser testing instead. Keep new logic on the pure side where you can.

- **Verify real output, not just the UI.** The most reliable end-to-end check is to process
  images, download the zip, and inspect the extracted files — dimensions and formats there
  are ground truth, and screenshots of the queue are easy to misread.

- **Test images** are not in the repo. Generate throwaway ones (Pillow, ImageMagick) covering
  the cases that actually break things: a large photo, a square transparent PNG, a portrait
  image, and something smaller than the target size (to exercise the no-upscale guard).
