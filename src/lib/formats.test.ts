import { describe, expect, it } from 'vitest';
import { detectSupport, extensionFor, isOutputFormat, keepsTransparency } from './formats';

describe('isOutputFormat', () => {
  it('accepts known formats and rejects everything else', () => {
    expect(isOutputFormat('png')).toBe(true);
    expect(isOutputFormat('avif')).toBe(true);
    expect(isOutputFormat('bmp')).toBe(false);
    expect(isOutputFormat('toString')).toBe(false);
  });
});

describe('extensionFor', () => {
  it('lets JPEG use either spelling', () => {
    expect(extensionFor('jpeg')).toBe('jpg');
    expect(extensionFor('jpeg', 'jpeg')).toBe('jpeg');
  });

  it('ignores the JPEG preference for other formats', () => {
    expect(extensionFor('png', 'jpeg')).toBe('png');
    expect(extensionFor('webp')).toBe('webp');
  });
});

describe('keepsTransparency', () => {
  it('knows JPEG cannot store alpha', () => {
    expect(keepsTransparency('jpeg')).toBe(false);
    expect(keepsTransparency('png')).toBe(true);
    expect(keepsTransparency('webp')).toBe(true);
  });
});

describe('detectSupport', () => {
  it('always reports the two universally supported codecs', async () => {
    const supported = await detectSupport(async () => null);
    expect(supported.has('png')).toBe(true);
    expect(supported.has('jpeg')).toBe(true);
    expect(supported.has('webp')).toBe(false);
  });

  it('adds a codec only when the encoder returns that exact MIME type', async () => {
    const supported = await detectSupport(async (mime) =>
      // Emulate a browser that silently falls back to PNG for AVIF.
      mime === 'image/webp'
        ? new Blob([new Uint8Array([1])], { type: 'image/webp' })
        : new Blob([new Uint8Array([1])], { type: 'image/png' }),
    );
    expect(supported.has('webp')).toBe(true);
    expect(supported.has('avif')).toBe(false);
  });

  it('survives an encoder that throws', async () => {
    const supported = await detectSupport(async () => {
      throw new Error('no codec');
    });
    expect([...supported].sort()).toEqual(['jpeg', 'png']);
  });
});
