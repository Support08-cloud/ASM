import { describe, expect, it } from 'vitest';
import { applyTemplate, dedupeNames, sanitizeSegment, stripExtension } from './naming';

describe('stripExtension', () => {
  it('removes only the final extension', () => {
    expect(stripExtension('logo.png')).toBe('logo');
    expect(stripExtension('logo.v2.png')).toBe('logo.v2');
  });

  it('leaves extension-less names alone', () => {
    expect(stripExtension('logo')).toBe('logo');
  });
});

describe('sanitizeSegment', () => {
  it('replaces path separators so output cannot escape the folder', () => {
    const result = sanitizeSegment('../../etc/passwd');
    expect(result).not.toMatch(/[/\\]/);
    expect(result).toContain('passwd');
  });

  it('strips characters that filesystems reject', () => {
    expect(sanitizeSegment('a:b*c?d"e<f>g|h')).toBe('a-b-c-d-e-f-g-h');
  });

  it('falls back to a usable name when everything is stripped', () => {
    expect(sanitizeSegment('   ')).toBe('image');
    expect(sanitizeSegment('...')).toBe('image');
  });

  it('caps very long names', () => {
    expect(sanitizeSegment('x'.repeat(500))).toHaveLength(120);
  });
});

describe('applyTemplate', () => {
  const ctx = { name: 'logo', width: 512, height: 256, ext: 'webp', index: 3 };

  it('expands every supported token', () => {
    expect(applyTemplate('{name}-{w}x{h}-{i}-{date}', ctx, '2026-01-02')).toBe(
      'logo-512x256-3-2026-01-02.webp',
    );
  });

  it('appends the extension from the context', () => {
    expect(applyTemplate('{name}', ctx)).toBe('logo.webp');
  });

  it('leaves unknown tokens visible instead of silently dropping them', () => {
    expect(applyTemplate('{name}-{bogus}', ctx)).toBe('logo-{bogus}.webp');
  });

  it('sanitizes a template that would otherwise write outside the folder', () => {
    const result = applyTemplate('../{name}', ctx);
    expect(result.includes('/')).toBe(false);
    expect(result.includes('\\')).toBe(false);
  });
});

describe('dedupeNames', () => {
  it('leaves already-unique names untouched', () => {
    expect(dedupeNames(['a.png', 'b.png'])).toEqual(['a.png', 'b.png']);
  });

  it('suffixes repeats while keeping the extension last', () => {
    expect(dedupeNames(['a.png', 'a.png', 'a.png'])).toEqual(['a.png', 'a-2.png', 'a-3.png']);
  });

  it('treats names that differ only by case as duplicates', () => {
    expect(dedupeNames(['A.png', 'a.png'])).toEqual(['A.png', 'a-2.png']);
  });
});
