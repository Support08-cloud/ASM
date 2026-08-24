import { describe, expect, it } from 'vitest';
import {
  anchorFactors,
  computeDrawRects,
  computeOutputSize,
  halvingSteps,
  rotatedSize,
  type SizeSpec,
} from './geometry';

const spec = (over: Partial<SizeSpec> = {}): SizeSpec => ({
  mode: 'dimensions',
  width: null,
  height: null,
  percent: 100,
  longest: 1280,
  allowUpscale: false,
  ...over,
});

describe('anchorFactors', () => {
  it('maps the nine anchors onto 0 / 0.5 / 1 weightings', () => {
    expect(anchorFactors('center')).toEqual({ fx: 0.5, fy: 0.5 });
    expect(anchorFactors('top-left')).toEqual({ fx: 0, fy: 0 });
    expect(anchorFactors('bottom-right')).toEqual({ fx: 1, fy: 1 });
    expect(anchorFactors('top')).toEqual({ fx: 0.5, fy: 0 });
    expect(anchorFactors('right')).toEqual({ fx: 1, fy: 0.5 });
  });
});

describe('computeOutputSize', () => {
  it('keeps the source size in original mode', () => {
    expect(computeOutputSize(800, 600, spec({ mode: 'original' }))).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('scales by percentage', () => {
    expect(computeOutputSize(800, 600, spec({ mode: 'percent', percent: 50 }))).toEqual({
      width: 400,
      height: 300,
    });
  });

  it('caps the longest edge regardless of orientation', () => {
    expect(computeOutputSize(4000, 2000, spec({ mode: 'longest', longest: 1000 }))).toEqual({
      width: 1000,
      height: 500,
    });
    expect(computeOutputSize(2000, 4000, spec({ mode: 'longest', longest: 1000 }))).toEqual({
      width: 500,
      height: 1000,
    });
  });

  it('keeps a square source square when capping the longest edge', () => {
    // Regression guard: a 1:1 logo must not come back as a rectangle.
    expect(computeOutputSize(2400, 2400, spec({ mode: 'longest', longest: 600 }))).toEqual({
      width: 600,
      height: 600,
    });
  });

  it('leaves an image alone when it is already under the longest-edge cap', () => {
    expect(computeOutputSize(48, 48, spec({ mode: 'longest', longest: 800 }))).toEqual({
      width: 48,
      height: 48,
    });
  });

  it('derives the missing axis from the aspect ratio', () => {
    expect(computeOutputSize(800, 600, spec({ width: 400 }))).toEqual({ width: 400, height: 300 });
    expect(computeOutputSize(800, 600, spec({ height: 300 }))).toEqual({ width: 400, height: 300 });
  });

  it('honours an explicit canvas when both axes are given', () => {
    expect(computeOutputSize(800, 600, spec({ width: 1000, height: 200 }))).toEqual({
      width: 1000,
      height: 200,
    });
  });

  it('refuses to enlarge unless upscaling is allowed', () => {
    const grow = spec({ mode: 'longest', longest: 4000 });
    expect(computeOutputSize(800, 600, grow)).toEqual({ width: 800, height: 600 });
    expect(computeOutputSize(800, 600, { ...grow, allowUpscale: true })).toEqual({
      width: 4000,
      height: 3000,
    });
  });

  it('never returns a zero or negative edge', () => {
    const tiny = computeOutputSize(10, 10, spec({ mode: 'percent', percent: 1 }));
    expect(tiny.width).toBeGreaterThanOrEqual(1);
    expect(tiny.height).toBeGreaterThanOrEqual(1);
    expect(computeOutputSize(0, 0, spec())).toEqual({ width: 1, height: 1 });
  });

  it('clamps absurd requests to the maximum edge', () => {
    const huge = computeOutputSize(100, 100, spec({ width: 99_999, height: 99_999 }));
    expect(huge.width).toBe(12_000);
    expect(huge.height).toBe(12_000);
  });
});

describe('computeDrawRects', () => {
  it('contain fits the whole image and centres the leftover space', () => {
    const r = computeDrawRects(800, 400, 200, 200, 'contain', 'center');
    expect(r.dw).toBe(200);
    expect(r.dh).toBe(100);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(50);
    // Nothing is cropped away.
    expect({ sx: r.sx, sy: r.sy, sw: r.sw, sh: r.sh }).toEqual({ sx: 0, sy: 0, sw: 800, sh: 400 });
  });

  it('contain respects a non-centre anchor', () => {
    const r = computeDrawRects(800, 400, 200, 200, 'contain', 'top-left');
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
  });

  it('cover fills the canvas and crops the overflow', () => {
    const r = computeDrawRects(800, 400, 200, 200, 'cover', 'center');
    expect({ dx: r.dx, dy: r.dy, dw: r.dw, dh: r.dh }).toEqual({
      dx: 0,
      dy: 0,
      dw: 200,
      dh: 200,
    });
    // A 2:1 source cropped to 1:1 keeps a centred square.
    expect(r.sw).toBe(400);
    expect(r.sh).toBe(400);
    expect(r.sx).toBe(200);
    expect(r.sy).toBe(0);
  });

  it('cover anchored left crops from the right-hand side only', () => {
    const r = computeDrawRects(800, 400, 200, 200, 'cover', 'left');
    expect(r.sx).toBe(0);
    expect(r.sw).toBe(400);
  });

  it('stretch uses the full source and the full canvas', () => {
    const r = computeDrawRects(800, 400, 300, 300, 'stretch', 'center');
    expect(r).toEqual({ sx: 0, sy: 0, sw: 800, sh: 400, dx: 0, dy: 0, dw: 300, dh: 300 });
  });

  it('keeps the drawn area inside the canvas for every fit mode', () => {
    for (const fit of ['contain', 'cover', 'stretch'] as const) {
      const r = computeDrawRects(1234, 567, 300, 200, fit, 'center');
      expect(r.dx).toBeGreaterThanOrEqual(0);
      expect(r.dy).toBeGreaterThanOrEqual(0);
      expect(r.dx + r.dw).toBeLessThanOrEqual(300.001);
      expect(r.dy + r.dh).toBeLessThanOrEqual(200.001);
      expect(r.sx + r.sw).toBeLessThanOrEqual(1234.001);
      expect(r.sy + r.sh).toBeLessThanOrEqual(567.001);
    }
  });
});

describe('rotatedSize', () => {
  it('swaps the axes on a quarter turn only', () => {
    expect(rotatedSize(800, 600, 0)).toEqual({ width: 800, height: 600 });
    expect(rotatedSize(800, 600, 90)).toEqual({ width: 600, height: 800 });
    expect(rotatedSize(800, 600, 180)).toEqual({ width: 800, height: 600 });
    expect(rotatedSize(800, 600, 270)).toEqual({ width: 600, height: 800 });
  });
});

describe('halvingSteps', () => {
  it('produces no steps when the reduction is less than 2x', () => {
    expect(halvingSteps(800, 600, 500, 375)).toEqual([]);
  });

  it('halves repeatedly for a large reduction and never undershoots', () => {
    const steps = halvingSteps(4000, 4000, 64, 64);
    expect(steps.length).toBeGreaterThan(3);
    for (const step of steps) {
      expect(step.width).toBeGreaterThanOrEqual(64);
      expect(step.height).toBeGreaterThanOrEqual(64);
    }
    // Each step is smaller than the last.
    const widths = steps.map((s) => s.width);
    expect([...widths].sort((a, b) => b - a)).toEqual(widths);
  });

  it('terminates on degenerate input', () => {
    expect(halvingSteps(1, 1, 1, 1)).toEqual([]);
    expect(halvingSteps(0, 0, 10, 10)).toEqual([]);
  });
});
