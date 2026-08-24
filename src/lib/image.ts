import {
  computeDrawRects,
  computeOutputSize,
  halvingSteps,
  rotatedSize,
  type Size,
} from './geometry';
import { extensionFor, formatInfo, keepsTransparency } from './formats';
import type { Settings } from './settings';
import { kilobytesToBytes } from './filesize';

export interface DecodedImage {
  readonly source: CanvasImageSource;
  readonly width: number;
  readonly height: number;
  /** SVG input can be rasterised at any size without loss. */
  readonly isVector: boolean;
  release(): void;
}

export interface RenderResult {
  blob: Blob;
  width: number;
  height: number;
  /** Quality actually used (after any target-size search). */
  quality: number;
}

const SVG_MIME = 'image/svg+xml';
/** Above this, skip the extra full-frame copy that step-down scaling needs. */
const MAX_STEPDOWN_PIXELS = 40_000_000;

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser would not provide a 2D canvas context.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The file could not be read as an image.'));
    img.src = url;
  });
}

/**
 * Decode a file into something drawable.
 *
 * Raster images go through `createImageBitmap` with `imageOrientation: 'from-image'`
 * so that EXIF-rotated phone photos are decoded upright — the original tool drew
 * them sideways. SVG deliberately stays an `HTMLImageElement`: a bitmap would lock
 * the vector to its intrinsic size and throw away the resolution independence.
 */
export async function decodeImage(file: File): Promise<DecodedImage> {
  if (file.type === SVG_MIME) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadHtmlImage(url);
      // Width-less SVGs report 0 (or a 300x150 default); pick a sane canvas.
      const width = img.naturalWidth || 1024;
      const height = img.naturalHeight || 1024;
      return {
        source: img,
        width,
        height,
        isVector: true,
        release: () => URL.revokeObjectURL(url),
      };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        isVector: false,
        release: () => bitmap.close(),
      };
    } catch {
      // Older engines reject the options bag, or the codec is unknown here.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(url);
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      isVector: false,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

interface Oriented {
  source: CanvasImageSource;
  width: number;
  height: number;
}

/** Bake rotation and flips into the source so all later maths is axis-aligned. */
function applyOrientation(image: DecodedImage, settings: Settings): Oriented {
  const { rotation, flipH, flipV } = settings;
  if (rotation === 0 && !flipH && !flipV) {
    return { source: image.source, width: image.width, height: image.height };
  }

  const { width, height } = rotatedSize(image.width, image.height, rotation);
  const canvas = makeCanvas(width, height);
  const ctx = context2d(canvas);

  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(image.source, -image.width / 2, -image.height / 2, image.width, image.height);

  return { source: canvas, width, height };
}

/**
 * Scale a source region down in repeated halving steps.
 *
 * Browsers sample rather than average when a single `drawImage` shrinks an image
 * by a large factor, which is what makes naive resizers produce jagged logos.
 * Halving first means every source pixel contributes to the result.
 */
function scaleRegion(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  allowStepDown: boolean,
): { image: CanvasImageSource; sx: number; sy: number; sw: number; sh: number } {
  const targetW = Math.max(1, Math.round(dw));
  const targetH = Math.max(1, Math.round(dh));
  const steps = allowStepDown ? halvingSteps(sw, sh, targetW, targetH) : [];

  if (steps.length === 0 || sw * sh > MAX_STEPDOWN_PIXELS) {
    return { image: source, sx, sy, sw, sh };
  }

  let current: HTMLCanvasElement | null = null;
  let currentW = sw;
  let currentH = sh;

  for (const step of steps) {
    const next = makeCanvas(step.width, step.height);
    const ctx = context2d(next);
    if (current === null) {
      // First pass reads straight from the crop region, so no full-size copy exists.
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, step.width, step.height);
    } else {
      ctx.drawImage(current, 0, 0, currentW, currentH, 0, 0, step.width, step.height);
    }
    current = next;
    currentW = step.width;
    currentH = step.height;
  }

  return current === null
    ? { image: source, sx, sy, sw, sh }
    : { image: current, sx: 0, sy: 0, sw: currentW, sh: currentH };
}

/** Compute the output pixel dimensions for a source size without drawing anything. */
export function outputSizeFor(srcW: number, srcH: number, settings: Settings): Size {
  const { width, height } = rotatedSize(srcW, srcH, settings.rotation);
  return computeOutputSize(width, height, settings.size);
}

/** Draw the final composed frame at its output resolution. */
export function renderToCanvas(image: DecodedImage, settings: Settings): HTMLCanvasElement {
  const oriented = applyOrientation(image, settings);
  const { width: outW, height: outH } = computeOutputSize(
    oriented.width,
    oriented.height,
    settings.size,
  );

  const rects = computeDrawRects(
    oriented.width,
    oriented.height,
    outW,
    outH,
    settings.fit,
    settings.anchor,
  );

  const canvas = makeCanvas(outW, outH);
  const ctx = context2d(canvas);

  const wantsTransparency = settings.background === 'transparent';
  const canBeTransparent = wantsTransparency && keepsTransparency(settings.format);

  if (canBeTransparent) {
    ctx.clearRect(0, 0, outW, outH);
  } else {
    // JPEG has no alpha, so "transparent" has to become a real colour. White is
    // the least surprising choice and matches what the preview shows.
    ctx.fillStyle = wantsTransparency ? '#ffffff' : settings.backgroundColor;
    ctx.fillRect(0, 0, outW, outH);
  }

  // Vectors are re-rasterised at the target size, so stepping down would only
  // throw away the crispness we get for free.
  const scaled = scaleRegion(
    oriented.source,
    rects.sx,
    rects.sy,
    rects.sw,
    rects.sh,
    rects.dw,
    rects.dh,
    !image.isVector,
  );

  ctx.drawImage(
    scaled.image,
    scaled.sx,
    scaled.sy,
    scaled.sw,
    scaled.sh,
    rects.dx,
    rects.dy,
    rects.dw,
    rects.dh,
  );

  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

/**
 * Encode, optionally searching for the highest quality that still fits a size budget.
 *
 * A binary search over quality is far more useful than a raw slider: "keep every
 * attachment under 200 KB" is the actual requirement people have.
 */
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  settings: Settings,
): Promise<{ blob: Blob; quality: number }> {
  const info = formatInfo(settings.format);
  const quality = settings.quality / 100;

  if (!info.lossy) {
    const blob = await canvasToBlob(canvas, info.mime);
    if (!blob) throw new Error(`This browser cannot write ${info.label} files.`);
    return { blob, quality: 1 };
  }

  if (settings.targetKB === null) {
    const blob = await canvasToBlob(canvas, info.mime, quality);
    if (!blob) throw new Error(`This browser cannot write ${info.label} files.`);
    return { blob, quality };
  }

  const budget = kilobytesToBytes(settings.targetKB);
  let low = 0.3;
  let high = 0.98;
  let best: { blob: Blob; quality: number } | null = null;
  let smallest: { blob: Blob; quality: number } | null = null;

  for (let i = 0; i < 7; i += 1) {
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(canvas, info.mime, mid);
    if (!blob) break;

    if (smallest === null || blob.size < smallest.blob.size) smallest = { blob, quality: mid };

    if (blob.size <= budget) {
      best = { blob, quality: mid };
      low = mid; // Fits — try to spend the remaining budget on quality.
    } else {
      high = mid;
    }
  }

  const chosen = best ?? smallest;
  if (!chosen) throw new Error(`This browser cannot write ${info.label} files.`);
  return chosen;
}

export async function renderImage(image: DecodedImage, settings: Settings): Promise<RenderResult> {
  const canvas = renderToCanvas(image, settings);
  const width = canvas.width;
  const height = canvas.height;

  try {
    const { blob, quality } = await encodeCanvas(canvas, settings);
    return { blob, width, height, quality };
  } finally {
    // Free the backing store promptly; batches of large canvases add up fast.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Output file extension for the current settings. */
export function outputExtension(settings: Settings): string {
  return extensionFor(settings.format, settings.jpegExtension);
}
