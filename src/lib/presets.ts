import type { FitMode, SizeSpec } from './geometry';
import type { OutputFormat } from './formats';

export interface Preset {
  label: string;
  group: string;
  size: Partial<SizeSpec>;
  fit?: FitMode;
  format?: OutputFormat;
  title?: string;
}

/**
 * Task-shaped presets rather than a bare grid of pixel pairs. Each one sets the
 * sizing mode as well as the numbers, because "1024 wide for the website" and
 * "exactly 1024x1024 for an icon" need different fit behaviour.
 */
export const PRESETS: Preset[] = [
  // Icons and logos — square, lossless, never cropped.
  { label: '16', group: 'Icon', size: { mode: 'dimensions', width: 16, height: 16 }, fit: 'contain', format: 'png' },
  { label: '32', group: 'Icon', size: { mode: 'dimensions', width: 32, height: 32 }, fit: 'contain', format: 'png' },
  { label: '64', group: 'Icon', size: { mode: 'dimensions', width: 64, height: 64 }, fit: 'contain', format: 'png' },
  { label: '128', group: 'Icon', size: { mode: 'dimensions', width: 128, height: 128 }, fit: 'contain', format: 'png' },
  { label: '256', group: 'Icon', size: { mode: 'dimensions', width: 256, height: 256 }, fit: 'contain', format: 'png' },
  { label: '512', group: 'Icon', size: { mode: 'dimensions', width: 512, height: 512 }, fit: 'contain', format: 'png' },

  // Long-edge caps: the safe way to bulk-shrink mixed portrait/landscape photos.
  { label: 'Max 800', group: 'Photo', size: { mode: 'longest', longest: 800 }, title: 'Longest edge 800px' },
  { label: 'Max 1280', group: 'Photo', size: { mode: 'longest', longest: 1280 }, title: 'Longest edge 1280px' },
  { label: 'Max 1920', group: 'Photo', size: { mode: 'longest', longest: 1920 }, title: 'Longest edge 1920px' },
  { label: 'Max 2560', group: 'Photo', size: { mode: 'longest', longest: 2560 }, title: 'Longest edge 2560px' },

  // Fixed canvases that are meant to be filled edge to edge.
  { label: 'HD 1920×1080', group: 'Screen', size: { mode: 'dimensions', width: 1920, height: 1080 }, fit: 'cover' },
  { label: 'Square 1080', group: 'Social', size: { mode: 'dimensions', width: 1080, height: 1080 }, fit: 'cover' },
  { label: 'Portrait 1080×1350', group: 'Social', size: { mode: 'dimensions', width: 1080, height: 1350 }, fit: 'cover' },
  { label: 'Story 1080×1920', group: 'Social', size: { mode: 'dimensions', width: 1080, height: 1920 }, fit: 'cover' },

  // Percentage scaling.
  { label: '50%', group: 'Scale', size: { mode: 'percent', percent: 50 } },
  { label: '25%', group: 'Scale', size: { mode: 'percent', percent: 25 } },
];

export const PRESET_GROUPS = ['Icon', 'Photo', 'Screen', 'Social', 'Scale'] as const;
