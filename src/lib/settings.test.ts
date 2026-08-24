import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, coerceSettings, loadSettings, saveSettings } from './settings';

describe('coerceSettings', () => {
  it('returns defaults for junk input', () => {
    expect(coerceSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const result = coerceSettings({
      fit: 'cover',
      anchor: 'top-left',
      format: 'png',
      quality: 55,
      backgroundColor: '#ABCDEF',
    });
    expect(result.fit).toBe('cover');
    expect(result.anchor).toBe('top-left');
    expect(result.format).toBe('png');
    expect(result.quality).toBe(55);
    expect(result.backgroundColor).toBe('#ABCDEF');
  });

  it('rejects values outside the allowed sets', () => {
    const result = coerceSettings({
      fit: 'squish',
      anchor: 'nowhere',
      format: 'bmp',
      rotation: 45,
      backgroundColor: 'red',
    });
    expect(result.fit).toBe(DEFAULT_SETTINGS.fit);
    expect(result.anchor).toBe(DEFAULT_SETTINGS.anchor);
    expect(result.format).toBe(DEFAULT_SETTINGS.format);
    expect(result.rotation).toBe(0);
    expect(result.backgroundColor).toBe(DEFAULT_SETTINGS.backgroundColor);
  });

  it('clamps quality into 1..100', () => {
    expect(coerceSettings({ quality: 0 }).quality).toBe(1);
    expect(coerceSettings({ quality: 900 }).quality).toBe(100);
  });

  it('treats a non-positive target size as "no target"', () => {
    expect(coerceSettings({ targetKB: 0 }).targetKB).toBeNull();
    expect(coerceSettings({ targetKB: -3 }).targetKB).toBeNull();
    expect(coerceSettings({ targetKB: 250 }).targetKB).toBe(250);
  });

  it('does not let a blank name template through', () => {
    expect(coerceSettings({ nameTemplate: '   ' }).nameTemplate).toBe(
      DEFAULT_SETTINGS.nameTemplate,
    );
    expect(coerceSettings({ nameTemplate: '{name}' }).nameTemplate).toBe('{name}');
  });
});

/** Minimal in-memory Storage stand-in. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

describe('settings persistence', () => {
  it('round-trips through storage', () => {
    const storage = memoryStorage();
    const settings = { ...DEFAULT_SETTINGS, quality: 71, format: 'png' as const };
    saveSettings(settings, storage);
    expect(loadSettings(storage)).toEqual(settings);
  });

  it('falls back to defaults when storage holds corrupt JSON', () => {
    const storage = memoryStorage();
    storage.setItem('v360-image-studio:settings:v1', '{not json');
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('does not throw when storage is unavailable', () => {
    expect(() => saveSettings(DEFAULT_SETTINGS, undefined)).not.toThrow();
    expect(loadSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});
