import type { Anchor, FitMode, SizeSpec } from './geometry';
import type { OutputFormat } from './formats';
import { isOutputFormat } from './formats';
import { DEFAULT_TEMPLATE } from './naming';

export type BackgroundMode = 'transparent' | 'color';

export interface Settings {
  size: SizeSpec;
  fit: FitMode;
  anchor: Anchor;
  format: OutputFormat;
  jpegExtension: 'jpg' | 'jpeg';
  /** 1..100, only meaningful for lossy codecs. */
  quality: number;
  /** When set, quality is searched automatically to land under this size. */
  targetKB: number | null;
  background: BackgroundMode;
  backgroundColor: string;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  nameTemplate: string;
}

export const DEFAULT_SETTINGS: Settings = {
  size: {
    mode: 'longest',
    width: null,
    height: null,
    percent: 100,
    longest: 1280,
    allowUpscale: false,
  },
  fit: 'contain',
  anchor: 'center',
  format: 'webp',
  jpegExtension: 'jpg',
  quality: 82,
  targetKB: null,
  background: 'transparent',
  backgroundColor: '#ffffff',
  rotation: 0,
  flipH: false,
  flipV: false,
  nameTemplate: DEFAULT_TEMPLATE,
};

const STORAGE_KEY = 'v360-image-studio:settings:v1';

const FIT_MODES: FitMode[] = ['contain', 'cover', 'stretch'];
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

const num = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

/**
 * Merge unknown persisted JSON into a valid Settings object.
 *
 * Anything unrecognised falls back to the default, so an older or hand-edited
 * localStorage entry can never put the UI into an impossible state.
 */
export function coerceSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return structuredClone(DEFAULT_SETTINGS);
  const input = raw as Record<string, unknown>;
  const base = structuredClone(DEFAULT_SETTINGS);

  const size = (input.size ?? {}) as Record<string, unknown>;
  const modes: SizeSpec['mode'][] = ['dimensions', 'percent', 'longest', 'original'];

  base.size = {
    mode: modes.includes(size.mode as SizeSpec['mode'])
      ? (size.mode as SizeSpec['mode'])
      : base.size.mode,
    width: typeof size.width === 'number' ? size.width : null,
    height: typeof size.height === 'number' ? size.height : null,
    percent: num(size.percent, base.size.percent),
    longest: num(size.longest, base.size.longest),
    allowUpscale: bool(size.allowUpscale, base.size.allowUpscale),
  };

  if (FIT_MODES.includes(input.fit as FitMode)) base.fit = input.fit as FitMode;
  if (ANCHORS.includes(input.anchor as Anchor)) base.anchor = input.anchor as Anchor;
  if (typeof input.format === 'string' && isOutputFormat(input.format)) {
    base.format = input.format as OutputFormat;
  }
  if (input.jpegExtension === 'jpeg' || input.jpegExtension === 'jpg') {
    base.jpegExtension = input.jpegExtension;
  }

  base.quality = Math.min(100, Math.max(1, num(input.quality, base.quality)));
  base.targetKB =
    typeof input.targetKB === 'number' && input.targetKB > 0 ? input.targetKB : null;
  base.background = input.background === 'color' ? 'color' : 'transparent';

  if (typeof input.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(input.backgroundColor)) {
    base.backgroundColor = input.backgroundColor;
  }

  const rotation = num(input.rotation, 0);
  base.rotation = ([0, 90, 180, 270] as const).includes(rotation as 0 | 90 | 180 | 270)
    ? (rotation as 0 | 90 | 180 | 270)
    : 0;

  base.flipH = bool(input.flipH, false);
  base.flipV = bool(input.flipV, false);

  if (typeof input.nameTemplate === 'string' && input.nameTemplate.trim().length > 0) {
    base.nameTemplate = input.nameTemplate;
  }

  return base;
}

export function loadSettings(storage: Storage | undefined = globalThis.localStorage): Settings {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? coerceSettings(JSON.parse(raw)) : structuredClone(DEFAULT_SETTINGS);
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(
  settings: Settings,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or a full quota: not worth interrupting the user over.
  }
}
