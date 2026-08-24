/**
 * Pure sizing / cropping maths. No DOM, no canvas — so it is cheap to unit test
 * and impossible for it to disagree with what the renderer actually draws.
 */

export type FitMode = 'contain' | 'cover' | 'stretch';

export type Anchor =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom-left'
  | 'bottom'
  | 'bottom-right';

/** How the output dimensions are derived from the source dimensions. */
export type SizeMode = 'dimensions' | 'percent' | 'longest' | 'original';

export interface SizeSpec {
  mode: SizeMode;
  /** Used by `dimensions`. `null` means "derive from the other axis". */
  width: number | null;
  height: number | null;
  /** Used by `percent`, as a percentage (100 = unchanged). */
  percent: number;
  /** Used by `longest`: the maximum length of the longer edge, in px. */
  longest: number;
  /** When false, an image is never rendered larger than its source. */
  allowUpscale: boolean;
}

export interface Size {
  width: number;
  height: number;
}

export interface DrawRects {
  /** Source crop rectangle. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Destination rectangle inside the output canvas. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export const MAX_EDGE = 12_000;

const clampEdge = (value: number): number =>
  Math.max(1, Math.min(MAX_EDGE, Math.round(value) || 1));

/**
 * Resolve an anchor into horizontal / vertical weightings in the 0..1 range,
 * where 0 is left/top, 0.5 is centred and 1 is right/bottom.
 */
export function anchorFactors(anchor: Anchor): { fx: number; fy: number } {
  const fx = anchor.includes('left') ? 0 : anchor.includes('right') ? 1 : 0.5;
  const fy = anchor.includes('top') ? 0 : anchor.includes('bottom') ? 1 : 0.5;
  return { fx, fy };
}

/**
 * Work out the output canvas size for one image.
 *
 * `dimensions` with both axes set is the only mode that produces a fixed canvas
 * regardless of the source aspect ratio; every other mode is proportional, which
 * is what makes batch runs over mixed portrait/landscape input behave sensibly.
 */
export function computeOutputSize(srcW: number, srcH: number, spec: SizeSpec): Size {
  if (srcW <= 0 || srcH <= 0) return { width: 1, height: 1 };

  const scaled = (factor: number): Size => {
    const f = spec.allowUpscale ? factor : Math.min(1, factor);
    return { width: clampEdge(srcW * f), height: clampEdge(srcH * f) };
  };

  switch (spec.mode) {
    case 'original':
      return { width: clampEdge(srcW), height: clampEdge(srcH) };

    case 'percent':
      return scaled(Math.max(1, spec.percent) / 100);

    case 'longest': {
      const longestEdge = Math.max(srcW, srcH);
      return scaled(Math.max(1, spec.longest) / longestEdge);
    }

    case 'dimensions': {
      const w = spec.width && spec.width > 0 ? spec.width : null;
      const h = spec.height && spec.height > 0 ? spec.height : null;

      // Both axes: an explicit canvas. `fit` then decides how pixels land in it.
      if (w !== null && h !== null) return { width: clampEdge(w), height: clampEdge(h) };
      if (w !== null) return scaled(w / srcW);
      if (h !== null) return scaled(h / srcH);
      return { width: clampEdge(srcW), height: clampEdge(srcH) };
    }

    default:
      return { width: clampEdge(srcW), height: clampEdge(srcH) };
  }
}

/**
 * Given a source and an output canvas, produce the source-crop and
 * destination rectangles for a single `drawImage` call.
 *
 * - `contain` never crops; leftover space becomes background.
 * - `cover` fills the canvas and crops the overflow, positioned by `anchor`.
 * - `stretch` distorts the image to exactly fill the canvas.
 */
export function computeDrawRects(
  srcW: number,
  srcH: number,
  outW: number,
  outH: number,
  fit: FitMode,
  anchor: Anchor,
): DrawRects {
  const { fx, fy } = anchorFactors(anchor);

  if (fit === 'stretch') {
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: outW, dh: outH };
  }

  if (fit === 'contain') {
    const scale = Math.min(outW / srcW, outH / srcH);
    const dw = srcW * scale;
    const dh = srcH * scale;
    return {
      sx: 0,
      sy: 0,
      sw: srcW,
      sh: srcH,
      dx: (outW - dw) * fx,
      dy: (outH - dh) * fy,
      dw,
      dh,
    };
  }

  // cover
  const scale = Math.max(outW / srcW, outH / srcH);
  const sw = Math.min(srcW, outW / scale);
  const sh = Math.min(srcH, outH / scale);
  return {
    sx: (srcW - sw) * fx,
    sy: (srcH - sh) * fy,
    sw,
    sh,
    dx: 0,
    dy: 0,
    dw: outW,
    dh: outH,
  };
}

/** Rotating by a quarter turn swaps the logical width and height. */
export function rotatedSize(width: number, height: number, rotation: number): Size {
  const turn = ((rotation % 360) + 360) % 360;
  return turn === 90 || turn === 270 ? { width: height, height: width } : { width, height };
}

/**
 * Build the ladder of intermediate sizes used to downscale in halving steps.
 *
 * A single large `drawImage` reduction skips source pixels and produces aliased,
 * crunchy edges. Halving repeatedly averages every pixel on the way down, which
 * is dramatically cleaner for things like a 4000px logo going to 64px.
 */
export function halvingSteps(srcW: number, srcH: number, dstW: number, dstH: number): Size[] {
  const steps: Size[] = [];
  let w = srcW;
  let h = srcH;

  // Guard against pathological inputs producing an unbounded loop.
  for (let i = 0; i < 32; i += 1) {
    if (Math.floor(w / 2) < dstW || Math.floor(h / 2) < dstH) break;
    w = Math.max(dstW, Math.floor(w / 2));
    h = Math.max(dstH, Math.floor(h / 2));
    steps.push({ width: w, height: h });
    if (w === dstW && h === dstH) break;
  }

  return steps;
}
