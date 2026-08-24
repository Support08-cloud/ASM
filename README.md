# Vision 360 · Image Studio

Resize, convert and compress images **in batches**, entirely in the browser. Nothing is
uploaded — every pixel is processed on the machine that opens the page.

It builds to **one self-contained `.html` file** (~67 KB) with no external requests, so you
can email it to the team and they can double-click it. No install, no server, no internet.

This is a rebuild of the original single-file `image-resize-tool.html`, kept in the same
spirit but with the sharp edges taken off.

---

## Give it to the team

```bash
npm install
npm run build
```

Send `dist/index.html` to whoever needs it. Opening it from disk is enough.

> The build deliberately emits a *classic* inline script rather than an ES module. Chrome
> refuses to execute `<script type="module">` on the `file://` origin, so a module build
> renders the page and then silently does nothing. See `vite.config.ts`.

## Develop

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (http://localhost:5173) |
| `npm run build` | Typecheck, then emit the single-file `dist/index.html` |
| `npm run preview` | Serve the built file |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## What it does

**Batch first.** Drop in as many images as you like. Each one gets a queue row showing its
new dimensions, new file size and the percentage saved. Export them all as a `.zip`, or a
single image directly.

**Sizing that matches the actual job:**

| Mode | Use it when |
| --- | --- |
| Limit the longest edge | Bulk-shrinking mixed portrait/landscape photos. Orientation-safe. |
| Exact width / height | You need a specific canvas. Leave one axis blank to keep proportions. |
| Scale by percentage | "Half size, please." |
| Keep original size | Convert or compress without resizing at all. |

**Framing** — fit inside, fill and crop, or stretch. When cropping, a nine-point anchor
decides which part survives. Framing only applies when both a width and a height are set,
since that is the only case where the frame can disagree with the image's own proportions;
the UI says so rather than leaving you guessing.

**Formats** — PNG, JPEG, WebP and AVIF. Support is detected at runtime by encoding a test
pixel and checking the MIME type that comes back, because `canvas.toBlob` quietly falls back
to PNG for codecs it does not know. Unsupported formats are disabled rather than silently
producing the wrong file.

**Target file size** — instead of guessing at a quality slider, tick *"Aim for a maximum file
size"* and give it a number. Quality is binary-searched to land just under the budget, and
the app tells you which quality it settled on.

**Rotate and flip**, applied before resizing, so the width and height you type always
describe the final upright image.

**Background** — transparent or a solid colour. Choosing transparent with JPEG warns you and
falls back to white, because JPEG has no alpha channel.

**File names** — a token template (`{name}`, `{w}`, `{h}`, `{i}`, `{date}`), sanitised against
path traversal and de-duplicated so a zip never contains two entries with the same name.

Plus a before/after compare slider, dark mode, keyboard-accessible controls, and settings
that persist between sessions.

---

## Improvements over the original tool

| Original | Here |
| --- | --- |
| One image at a time | Batch queue with zip export |
| Single-shot `drawImage` downscale | Progressive halving — see below |
| EXIF rotation ignored, phone photos came out sideways | Decoded with `imageOrientation: 'from-image'` |
| `JPG` and `JPEG` offered as two different formats | One JPEG format; `.jpg`/`.jpeg` is an extension choice |
| Quality slider active even for lossless PNG | Hidden for PNG; target-size mode added |
| Only exact width/height | Longest-edge, percentage and convert-only modes |
| Could silently enlarge small images | *Allow enlarging* is opt-in |
| No rotate, flip or crop control | Rotate, flip, and a nine-point crop anchor |
| Object URLs leaked on every render | Revoked on replace and on removal |
| Dropzone was a `div` — not keyboard reachable | Real `<button>`, labelled controls, visible focus rings |
| No format capability detection | Probed at runtime; unsupported codecs disabled |

### Why the downscale looks better

Asking a browser to shrink a 2400 px logo to 64 px in one `drawImage` call makes it sample
rather than average, and thin details alias into crunchy noise. `halvingSteps` builds a ladder
of intermediate sizes and the renderer halves repeatedly until it is within 2× of the target,
so every source pixel contributes. The first halving reads straight from the crop region, so
no full-size intermediate canvas is ever allocated, and the ladder is skipped entirely for
very large sources and for SVG (which is re-rasterised at the target size anyway).

---

## Privacy

There are no network requests, no analytics and no uploads — the `dist/index.html` file
contains zero external references, which is what makes it work offline in the first place.
Re-encoding through a canvas also strips EXIF metadata, so GPS coordinates in holiday photos
do not travel with the resized copy.

---

## Layout

```
src/
  lib/
    geometry.ts    sizing + crop maths (pure, unit tested)
    formats.ts     format catalogue + runtime capability detection
    naming.ts      filename templating, sanitising, de-duplication
    filesize.ts    byte formatting and savings maths
    settings.ts    settings model, validation, persistence
    presets.ts     task-shaped presets
    image.ts       decode, orientation, halving downscale, encode
    zip.ts         zip packaging and download
  ui/compare.ts    before/after slider
  main.ts          app wiring
  styles.css
```

The maths lives in pure modules with no DOM access so it can be tested directly; `image.ts`
is the only place that touches a canvas.

## Browser support

Needs a current Chrome, Edge, Firefox or Safari. AVIF encoding is Chrome-only at the time of
writing and is disabled automatically elsewhere. Animated GIFs are read as their first frame.
