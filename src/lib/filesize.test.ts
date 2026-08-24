import { describe, expect, it } from 'vitest';
import { formatBytes, kilobytesToBytes, percentChange } from './filesize';

describe('formatBytes', () => {
  it('shows whole bytes without decimals', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('steps up through the units', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('handles rubbish input without throwing', () => {
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
  });
});

describe('percentChange', () => {
  it('reports a saving as a positive number', () => {
    expect(percentChange(1000, 250)).toBe(75);
  });

  it('reports growth as a negative number', () => {
    expect(percentChange(100, 150)).toBe(-50);
  });

  it('is zero when nothing changed or the input is empty', () => {
    expect(percentChange(100, 100)).toBe(0);
    expect(percentChange(0, 50)).toBe(0);
  });
});

describe('kilobytesToBytes', () => {
  it('converts and never returns zero', () => {
    expect(kilobytesToBytes(2)).toBe(2048);
    expect(kilobytesToBytes(0)).toBe(1);
  });
});
