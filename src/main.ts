import './styles.css';

import { FORMAT_IDS, formatInfo, detectSupport, keepsTransparency } from './lib/formats';
import type { OutputFormat } from './lib/formats';
import { formatBytes, percentChange } from './lib/filesize';
import { applyTemplate, dedupeNames, stripExtension } from './lib/naming';
import { PRESETS, PRESET_GROUPS } from './lib/presets';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from './lib/settings';
import type { Anchor, FitMode, SizeMode } from './lib/geometry';
import {
  canvasToBlob,
  decodeImage,
  outputSizeFor,
  renderImage,
  outputExtension,
  type DecodedImage,
} from './lib/image';
import { createZip, downloadBlob } from './lib/zip';
import { CompareSlider } from './ui/compare';

/* ── Element lookup ─────────────────────────────────────────────────────── */

const el = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
};

const dropzone = el<HTMLButtonElement>('dropzone');
const fileInput = el<HTMLInputElement>('fileInput');
const queueList = el<HTMLUListElement>('queue');
const queueCount = el('queueCount');
const queueEmpty = el('queueEmpty');
const clearQueueBtn = el<HTMLButtonElement>('clearQueue');

const stageEmpty = el('stageEmpty');
const compareRoot = el('compare');
const statsEl = el('stats');
const statSource = el('statSource');
const statOutput = el('statOutput');
const statSize = el('statSize');
const statSaved = el('statSaved');
const previewNote = el('previewNote');

const sizeModeEl = el<HTMLSelectElement>('sizeMode');
const longestEl = el<HTMLInputElement>('longest');
const percentEl = el<HTMLInputElement>('percent');
const widthEl = el<HTMLInputElement>('width');
const heightEl = el<HTMLInputElement>('height');
const lockBtn = el<HTMLButtonElement>('lock');
const allowUpscaleEl = el<HTMLInputElement>('allowUpscale');
const fitEl = el<HTMLSelectElement>('fit');
const anchorGrid = el('anchorGrid');
const anchorWrap = el('anchorWrap');
const formatGrid = el('formatGrid');
const formatHint = el('formatHint');
const qualityEl = el<HTMLInputElement>('quality');
const qualityValue = el('qualityValue');
const qualityWrap = el('qualityWrap');
const useTargetEl = el<HTMLInputElement>('useTarget');
const targetWrap = el('targetWrap');
const targetKBEl = el<HTMLInputElement>('targetKB');
const jpegExtWrap = el('jpegExtWrap');
const jpegExtEl = el<HTMLSelectElement>('jpegExt');
const bgColorWrap = el('bgColorWrap');
const bgColorEl = el<HTMLInputElement>('bgColor');
const bgNote = el('bgNote');
const nameTemplateEl = el<HTMLInputElement>('nameTemplate');
const namePreview = el('namePreview');

const processBtn = el<HTMLButtonElement>('processBtn');
const downloadBtn = el<HTMLButtonElement>('downloadBtn');
const resetBtn = el<HTMLButtonElement>('resetBtn');
const progress = el('progress');
const progressBar = el('progressBar');
const statusEl = el('status');
const themeToggle = el<HTMLButtonElement>('themeToggle');
const presetsEl = el('presets');

/* ── State ──────────────────────────────────────────────────────────────── */

interface QueueItem {
  id: string;
  file: File;
  baseName: string;
  originalUrl: string;
  image: DecodedImage | null;
  width: number;
  height: number;
  status: 'loading' | 'ready' | 'error' | 'done';
  error?: string;
  result?: { blob: Blob; url: string; width: number; height: number };
}

let settings: Settings = loadSettings();
let items: QueueItem[] = [];
let selectedId: string | null = null;
let supported = new Set<OutputFormat>(['png', 'jpeg']);
let previewToken = 0;
let previewUrl: string | null = null;
let busy = false;

const compare = new CompareSlider(compareRoot);
const ANCHORS: Anchor[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right',
];

const uid = (): string => Math.random().toString(36).slice(2, 10);
const selected = (): QueueItem | null => items.find((i) => i.id === selectedId) ?? null;

/* ── Theme ──────────────────────────────────────────────────────────────── */

const THEME_KEY = 'v360-image-studio:theme';

function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
}

function initTheme(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch {
    /* storage unavailable */
  }
  const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  applyTheme(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

/* ── Static control construction ────────────────────────────────────────── */

function buildPresets(): void {
  for (const group of PRESET_GROUPS) {
    const groupPresets = PRESETS.filter((p) => p.group === group);
    if (groupPresets.length === 0) continue;

    const row = document.createElement('div');
    row.className = 'preset-group';

    const label = document.createElement('span');
    label.className = 'preset-group__label';
    label.textContent = group;
    row.appendChild(label);

    for (const preset of groupPresets) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = preset.label;
      if (preset.title) chip.title = preset.title;
      chip.addEventListener('click', () => {
        settings.size = { ...settings.size, ...preset.size };
        if (preset.fit) settings.fit = preset.fit;
        if (preset.format && supported.has(preset.format)) settings.format = preset.format;
        syncControlsFromSettings();
        onSettingsChanged();
      });
      row.appendChild(chip);
    }

    presetsEl.appendChild(row);
  }
}

function buildAnchorGrid(): void {
  for (const anchor of ANCHORS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'anchor';
    button.dataset.anchor = anchor;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('aria-label', anchor.replace('-', ' '));
    button.addEventListener('click', () => {
      settings.anchor = anchor;
      syncControlsFromSettings();
      onSettingsChanged();
    });
    anchorGrid.appendChild(button);
  }
}

function buildFormatGrid(): void {
  for (const id of FORMAT_IDS) {
    const info = formatInfo(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'format';
    button.dataset.format = id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.innerHTML = `<span class="format__name"></span><span class="format__tag"></span>`;
    button.querySelector('.format__name')!.textContent = info.label;
    button.querySelector('.format__tag')!.textContent = info.lossy ? 'Lossy' : 'Lossless';
    button.addEventListener('click', () => {
      settings.format = id;
      syncControlsFromSettings();
      onSettingsChanged();
    });
    formatGrid.appendChild(button);
  }
}

/* ── Settings ⇄ controls ────────────────────────────────────────────────── */

function syncControlsFromSettings(): void {
  const { size } = settings;

  sizeModeEl.value = size.mode;
  longestEl.value = String(size.longest);
  percentEl.value = String(size.percent);
  widthEl.value = size.width === null ? '' : String(size.width);
  heightEl.value = size.height === null ? '' : String(size.height);
  allowUpscaleEl.checked = size.allowUpscale;

  el('modeLongest').hidden = size.mode !== 'longest';
  el('modePercent').hidden = size.mode !== 'percent';
  el('modeDimensions').hidden = size.mode !== 'dimensions';

  // Framing only changes the result when the canvas can differ from the source
  // aspect ratio, which is exactly the both-axes case. Dim just these controls —
  // rotate/flip lives in its own group because it always applies.
  const framingApplies = size.mode === 'dimensions' && size.width !== null && size.height !== null;
  el('framingControls').style.opacity = framingApplies ? '1' : '0.5';
  el('framingNote').hidden = framingApplies;
  fitEl.disabled = !framingApplies;
  fitEl.value = settings.fit;
  anchorWrap.hidden = settings.fit !== 'cover';

  for (const button of anchorGrid.querySelectorAll<HTMLButtonElement>('.anchor')) {
    button.setAttribute('aria-checked', String(button.dataset.anchor === settings.anchor));
  }

  for (const button of formatGrid.querySelectorAll<HTMLButtonElement>('.format')) {
    const id = button.dataset.format as OutputFormat;
    const ok = supported.has(id);
    button.disabled = !ok;
    button.title = ok ? formatInfo(id).hint : `${formatInfo(id).label} is not supported here.`;
    button.setAttribute('aria-checked', String(id === settings.format && ok));
  }

  const info = formatInfo(settings.format);
  formatHint.textContent = info.hint;
  jpegExtWrap.hidden = settings.format !== 'jpeg';
  jpegExtEl.value = settings.jpegExtension;

  qualityWrap.hidden = !info.lossy;
  qualityEl.value = String(settings.quality);
  qualityValue.textContent = `${settings.quality}`;
  useTargetEl.checked = settings.targetKB !== null;
  targetWrap.hidden = settings.targetKB === null;
  qualityEl.disabled = settings.targetKB !== null;
  targetKBEl.value = String(settings.targetKB ?? 200);

  const bgRadio = document.querySelector<HTMLInputElement>(
    `input[name="bg"][value="${settings.background}"]`,
  );
  if (bgRadio) bgRadio.checked = true;
  for (const choice of document.querySelectorAll<HTMLElement>('.choice')) {
    const input = choice.querySelector<HTMLInputElement>('input');
    choice.classList.toggle('is-active', Boolean(input?.checked));
  }
  bgColorWrap.hidden = settings.background !== 'color';
  bgColorEl.value = settings.backgroundColor;

  if (settings.background === 'transparent' && !keepsTransparency(settings.format)) {
    bgNote.className = 'note note--warn';
    bgNote.textContent = `${info.label} cannot store transparency — empty areas will be filled with white. Choose PNG or WebP to keep it.`;
  } else if (settings.background === 'transparent') {
    bgNote.className = 'note';
    bgNote.textContent = 'Original transparency and any empty space stay see-through.';
  } else {
    bgNote.className = 'note';
    bgNote.textContent = 'Transparent areas and any empty space are filled with this colour.';
  }

  lockBtn.classList.toggle('is-on', lockRatio);
  lockBtn.setAttribute('aria-pressed', String(lockRatio));
  el('flipH').setAttribute('aria-pressed', String(settings.flipH));
  el('flipV').setAttribute('aria-pressed', String(settings.flipV));
  nameTemplateEl.value = settings.nameTemplate;

  updateSummaries();
}

function updateSummaries(): void {
  const { size } = settings;
  const sizeText =
    size.mode === 'longest'
      ? `max ${size.longest}px`
      : size.mode === 'percent'
        ? `${size.percent}%`
        : size.mode === 'original'
          ? 'original'
          : `${size.width ?? 'auto'} × ${size.height ?? 'auto'}`;

  el('sizeSummary').textContent = sizeText;
  el('fitSummary').textContent = fitEl.disabled ? 'n/a' : settings.fit;

  const transformBits = [
    settings.rotation !== 0 ? `${settings.rotation}°` : '',
    settings.flipH ? '↔' : '',
    settings.flipV ? '↕' : '',
  ].filter(Boolean);
  el('transformSummary').textContent = transformBits.length > 0 ? transformBits.join(' ') : 'none';
  el('formatSummary').textContent = formatInfo(settings.format).label;
  el('bgSummary').textContent =
    settings.background === 'transparent' ? 'transparent' : settings.backgroundColor;

  const item = selected();
  const ext = outputExtension(settings);
  const width = item?.result?.width ?? 0;
  const height = item?.result?.height ?? 0;
  const example = applyTemplate(settings.nameTemplate, {
    name: item ? item.baseName : 'photo',
    width: width || 1280,
    height: height || 720,
    ext,
    index: 1,
  });
  el('nameSummary').textContent = `.${ext}`;
  namePreview.textContent = `e.g. ${example}`;
}

function readSettingsFromControls(): void {
  settings.size.mode = sizeModeEl.value as SizeMode;
  settings.size.longest = Math.max(1, Number(longestEl.value) || 1);
  settings.size.percent = Math.max(1, Number(percentEl.value) || 1);
  settings.size.width = widthEl.value.trim() === '' ? null : Math.max(1, Number(widthEl.value));
  settings.size.height = heightEl.value.trim() === '' ? null : Math.max(1, Number(heightEl.value));
  settings.size.allowUpscale = allowUpscaleEl.checked;
  settings.fit = fitEl.value as FitMode;
  settings.jpegExtension = jpegExtEl.value === 'jpeg' ? 'jpeg' : 'jpg';
  settings.quality = Number(qualityEl.value);
  settings.targetKB = useTargetEl.checked ? Math.max(5, Number(targetKBEl.value) || 200) : null;
  settings.background =
    document.querySelector<HTMLInputElement>('input[name="bg"]:checked')?.value === 'color'
      ? 'color'
      : 'transparent';
  settings.backgroundColor = bgColorEl.value;
  settings.nameTemplate = nameTemplateEl.value.trim() === '' ? '{name}' : nameTemplateEl.value;
}

/* ── Queue rendering ────────────────────────────────────────────────────── */

function renderQueue(): void {
  queueList.replaceChildren();

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'item';
    li.classList.toggle('is-selected', item.id === selectedId);
    li.tabIndex = 0;
    li.setAttribute('role', 'button');

    const thumb = document.createElement('img');
    thumb.className = 'item__thumb';
    thumb.src = item.result?.url ?? item.originalUrl;
    thumb.alt = '';
    li.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'item__body';

    const name = document.createElement('div');
    name.className = 'item__name';
    name.textContent = item.file.name;
    body.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'item__meta';

    if (item.status === 'loading') {
      meta.textContent = 'Reading…';
    } else if (item.status === 'error') {
      meta.innerHTML = `<span class="bad">${item.error ?? 'Failed'}</span>`;
    } else if (item.result) {
      const change = percentChange(item.file.size, item.result.blob.size);
      const cls = change >= 0 ? 'ok' : 'bad';
      const verb = change >= 0 ? 'smaller' : 'larger';
      meta.innerHTML =
        `${item.result.width}×${item.result.height} · ${formatBytes(item.result.blob.size)} ` +
        `<span class="${cls}">${Math.abs(change)}% ${verb}</span>`;
    } else {
      const out = outputSizeFor(item.width, item.height, settings);
      meta.textContent = `${item.width}×${item.height} → ${out.width}×${out.height} · ${formatBytes(item.file.size)}`;
    }
    body.appendChild(meta);
    li.appendChild(body);

    const remove = document.createElement('button');
    remove.className = 'item__remove';
    remove.type = 'button';
    remove.innerHTML = '&times;';
    remove.setAttribute('aria-label', `Remove ${item.file.name}`);
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      removeItem(item.id);
    });
    li.appendChild(remove);

    const select = () => {
      selectedId = item.id;
      renderQueue();
      void updatePreview();
    };
    li.addEventListener('click', select);
    li.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });

    queueList.appendChild(li);
  }

  const count = items.length;
  queueCount.textContent = `${count} image${count === 1 ? '' : 's'}`;
  queueEmpty.hidden = count > 0;
  clearQueueBtn.hidden = count === 0;

  const ready = items.some((i) => i.status === 'ready' || i.status === 'done');
  processBtn.disabled = !ready || busy;
  processBtn.textContent = count > 1 ? `Resize all ${count} images` : 'Resize image';

  const done = items.filter((i) => i.result);
  downloadBtn.disabled = done.length === 0 || busy;
  downloadBtn.textContent = done.length > 1 ? `Download ${done.length} as .zip` : 'Download image';
}

/* ── File intake ────────────────────────────────────────────────────────── */

async function addFiles(fileList: FileList | File[]): Promise<void> {
  const files = [...fileList].filter(
    (file) => file.type.startsWith('image/') || /\.(svg|png|jpe?g|webp|avif|gif|bmp)$/i.test(file.name),
  );

  if (files.length === 0) {
    setStatus('Those files are not images.', 'error');
    return;
  }

  const fresh: QueueItem[] = files.map((file) => ({
    id: uid(),
    file,
    baseName: stripExtension(file.name),
    originalUrl: URL.createObjectURL(file),
    image: null,
    width: 0,
    height: 0,
    status: 'loading',
  }));

  items = [...items, ...fresh];
  if (selectedId === null && fresh[0]) selectedId = fresh[0].id;
  renderQueue();

  for (const item of fresh) {
    try {
      const image = await decodeImage(item.file);
      item.image = image;
      item.width = image.width;
      item.height = image.height;
      item.status = 'ready';
    } catch (error) {
      item.status = 'error';
      item.error = error instanceof Error ? error.message : 'Could not read this image';
    }
    renderQueue();
  }

  setStatus(`${files.length} image${files.length === 1 ? '' : 's'} ready.`);
  void updatePreview();
}

function removeItem(id: string): void {
  const item = items.find((i) => i.id === id);
  if (!item) return;

  item.image?.release();
  URL.revokeObjectURL(item.originalUrl);
  if (item.result) URL.revokeObjectURL(item.result.url);

  items = items.filter((i) => i.id !== id);
  if (selectedId === id) selectedId = items[0]?.id ?? null;

  renderQueue();
  void updatePreview();
}

function clearQueue(): void {
  for (const item of items) {
    item.image?.release();
    URL.revokeObjectURL(item.originalUrl);
    if (item.result) URL.revokeObjectURL(item.result.url);
  }
  items = [];
  selectedId = null;
  renderQueue();
  void updatePreview();
  setStatus('');
}

/* ── Preview ────────────────────────────────────────────────────────────── */

// `ReturnType` keeps this correct whether the DOM or Node timer types win.
let previewTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

function schedulePreview(): void {
  globalThis.clearTimeout(previewTimer);
  previewTimer = globalThis.setTimeout(() => void updatePreview(), 140);
}

async function updatePreview(): Promise<void> {
  const item = selected();
  const token = ++previewToken;

  if (!item || item.status === 'error' || !item.image) {
    compareRoot.hidden = true;
    statsEl.hidden = true;
    previewNote.hidden = true;
    stageEmpty.hidden = false;
    stageEmpty.textContent =
      item?.status === 'error'
        ? (item.error ?? 'This image could not be read.')
        : item?.status === 'loading'
          ? 'Reading image…'
          : 'Add an image to see a live preview.';
    return;
  }

  try {
    const { blob, width, height, quality } = await renderImage(item.image, settings);
    if (token !== previewToken) return; // A newer preview started; drop this one.

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);

    stageEmpty.hidden = true;
    compareRoot.hidden = false;
    statsEl.hidden = false;
    compare.setImages(item.originalUrl, previewUrl);

    statSource.textContent = `${item.width} × ${item.height}`;
    statOutput.textContent = `${width} × ${height}`;
    statSize.textContent = `${formatBytes(item.file.size)} → ${formatBytes(blob.size)}`;

    const change = percentChange(item.file.size, blob.size);
    statSaved.textContent = `${change >= 0 ? '−' : '+'}${Math.abs(change)}%`;
    statSaved.className = change >= 0 ? 'ok' : 'bad';

    const notes: string[] = [];
    if (item.file.type === 'image/gif') notes.push('Only the first frame of a GIF is used.');
    if (settings.targetKB !== null) {
      const budget = settings.targetKB * 1024;
      notes.push(
        blob.size <= budget
          ? `Landed under ${settings.targetKB} KB at quality ${Math.round(quality * 100)}.`
          : `Could not reach ${settings.targetKB} KB even at the lowest quality — try smaller dimensions.`,
      );
    }
    previewNote.textContent = notes.join(' ');
    previewNote.hidden = notes.length === 0;

    updateSummaries();
  } catch (error) {
    if (token !== previewToken) return;
    setStatus(error instanceof Error ? error.message : 'Preview failed.', 'error');
  }
}

/* ── Processing ─────────────────────────────────────────────────────────── */

function setStatus(text: string, kind: 'info' | 'error' | 'done' = 'info'): void {
  statusEl.textContent = text;
  statusEl.className = `status${kind === 'error' ? ' is-error' : kind === 'done' ? ' is-done' : ''}`;
}

async function processAll(): Promise<void> {
  const targets = items.filter((i) => i.status === 'ready' || i.status === 'done');
  if (targets.length === 0) return;

  busy = true;
  renderQueue();
  progress.hidden = false;
  progressBar.style.width = '0%';

  let completed = 0;
  let failed = 0;

  for (const item of targets) {
    if (!item.image) continue;
    try {
      const { blob, width, height } = await renderImage(item.image, settings);
      if (item.result) URL.revokeObjectURL(item.result.url);
      item.result = { blob, url: URL.createObjectURL(blob), width, height };
      item.status = 'done';
    } catch (error) {
      item.status = 'error';
      item.error = error instanceof Error ? error.message : 'Failed to resize';
      failed += 1;
    }

    completed += 1;
    progressBar.style.width = `${Math.round((completed / targets.length) * 100)}%`;
    setStatus(`Resizing ${completed} of ${targets.length}…`);
    renderQueue();
  }

  busy = false;
  renderQueue();
  progress.hidden = true;

  const okCount = completed - failed;
  const totalBefore = items.reduce((sum, i) => (i.result ? sum + i.file.size : sum), 0);
  const totalAfter = items.reduce((sum, i) => (i.result ? sum + i.result.blob.size : sum), 0);
  const change = percentChange(totalBefore, totalAfter);

  setStatus(
    failed > 0
      ? `${okCount} done, ${failed} failed.`
      : `${okCount} image${okCount === 1 ? '' : 's'} ready · ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (${change >= 0 ? '−' : '+'}${Math.abs(change)}%)`,
    failed > 0 ? 'error' : 'done',
  );
}

function outputNames(done: QueueItem[]): string[] {
  const ext = outputExtension(settings);
  return dedupeNames(
    done.map((item, index) =>
      applyTemplate(settings.nameTemplate, {
        name: item.baseName,
        width: item.result?.width ?? 0,
        height: item.result?.height ?? 0,
        ext,
        index: index + 1,
      }),
    ),
  );
}

async function downloadAll(): Promise<void> {
  const done = items.filter((i) => i.result);
  if (done.length === 0) return;

  const names = outputNames(done);

  if (done.length === 1) {
    const only = done[0];
    const name = names[0];
    if (only?.result && name) downloadBlob(only.result.blob, name);
    return;
  }

  busy = true;
  renderQueue();
  setStatus('Building zip…');

  try {
    const zipBlob = await createZip(
      done.map((item, index) => ({ name: names[index]!, blob: item.result!.blob })),
    );
    downloadBlob(zipBlob, `image-studio-${done.length}-images.zip`);
    setStatus(`Downloaded ${done.length} images (${formatBytes(zipBlob.size)}).`, 'done');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not build the zip.', 'error');
  } finally {
    busy = false;
    renderQueue();
  }
}

/* ── Events ─────────────────────────────────────────────────────────────── */

let lockRatio = true;

function onSettingsChanged(): void {
  saveSettings(settings);
  renderQueue();
  updateSummaries();
  schedulePreview();
}

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('is-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-over'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('is-over');
  if (event.dataTransfer?.files.length) void addFiles(event.dataTransfer.files);
});

// Stop a stray drop elsewhere on the page from navigating away from the app.
for (const type of ['dragover', 'drop'] as const) {
  globalThis.addEventListener(type, (event) => {
    if (!dropzone.contains(event.target as Node)) event.preventDefault();
  });
}

fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) void addFiles(fileInput.files);
  fileInput.value = '';
});

clearQueueBtn.addEventListener('click', clearQueue);

for (const control of [
  sizeModeEl,
  longestEl,
  percentEl,
  allowUpscaleEl,
  fitEl,
  jpegExtEl,
  qualityEl,
  useTargetEl,
  targetKBEl,
  bgColorEl,
  nameTemplateEl,
]) {
  control.addEventListener('input', () => {
    readSettingsFromControls();
    syncControlsFromSettings();
    onSettingsChanged();
  });
}

widthEl.addEventListener('input', () => {
  const item = selected();
  if (lockRatio && item && item.height > 0 && widthEl.value.trim() !== '') {
    heightEl.value = String(Math.max(1, Math.round((Number(widthEl.value) * item.height) / item.width)));
  }
  readSettingsFromControls();
  updateSummaries();
  onSettingsChanged();
});

heightEl.addEventListener('input', () => {
  const item = selected();
  if (lockRatio && item && item.width > 0 && heightEl.value.trim() !== '') {
    widthEl.value = String(Math.max(1, Math.round((Number(heightEl.value) * item.width) / item.height)));
  }
  readSettingsFromControls();
  updateSummaries();
  onSettingsChanged();
});

lockBtn.addEventListener('click', () => {
  lockRatio = !lockRatio;
  syncControlsFromSettings();
});

for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="bg"]')) {
  radio.addEventListener('change', () => {
    readSettingsFromControls();
    syncControlsFromSettings();
    onSettingsChanged();
  });
}

el('rotateLeft').addEventListener('click', () => {
  settings.rotation = ((((settings.rotation - 90) % 360) + 360) % 360) as Settings['rotation'];
  syncControlsFromSettings();
  onSettingsChanged();
});

el('rotateRight').addEventListener('click', () => {
  settings.rotation = ((settings.rotation + 90) % 360) as Settings['rotation'];
  syncControlsFromSettings();
  onSettingsChanged();
});

el('flipH').addEventListener('click', () => {
  settings.flipH = !settings.flipH;
  syncControlsFromSettings();
  onSettingsChanged();
});

el('flipV').addEventListener('click', () => {
  settings.flipV = !settings.flipV;
  syncControlsFromSettings();
  onSettingsChanged();
});

el('transformReset').addEventListener('click', () => {
  settings.rotation = 0;
  settings.flipH = false;
  settings.flipV = false;
  syncControlsFromSettings();
  onSettingsChanged();
});

for (const button of document.querySelectorAll<HTMLButtonElement>('.segmented__btn')) {
  button.addEventListener('click', () => {
    for (const other of document.querySelectorAll('.segmented__btn')) {
      other.classList.toggle('is-active', other === button);
    }
    compare.setResultOnly(button.dataset.view === 'result');
  });
}

processBtn.addEventListener('click', () => void processAll());
downloadBtn.addEventListener('click', () => void downloadAll());

resetBtn.addEventListener('click', () => {
  settings = structuredClone(DEFAULT_SETTINGS);
  lockRatio = true;
  syncControlsFromSettings();
  onSettingsChanged();
  setStatus('Settings reset.');
});

/* ── Boot ───────────────────────────────────────────────────────────────── */

async function boot(): Promise<void> {
  initTheme();
  buildPresets();
  buildAnchorGrid();
  buildFormatGrid();

  supported = await detectSupport(async (mime) => {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    return canvasToBlob(probe, mime, 0.8);
  });

  // Fall back if a stored preference names a codec this browser cannot write.
  if (!supported.has(settings.format)) {
    settings.format = supported.has('webp') ? 'webp' : 'jpeg';
  }

  syncControlsFromSettings();
  renderQueue();
  compare.setPosition(50);
}

void boot();
