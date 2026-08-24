/** Human-readable byte sizes and savings maths. */

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const digits = unit === 0 ? 0 : fractionDigits;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

/**
 * Percentage saved going from `before` to `after`.
 * Negative values mean the output got bigger, which is worth surfacing rather
 * than hiding — re-encoding a small PNG as PNG often does exactly that.
 */
export function percentChange(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

export function kilobytesToBytes(kb: number): number {
  return Math.max(1, Math.round(kb * 1024));
}
