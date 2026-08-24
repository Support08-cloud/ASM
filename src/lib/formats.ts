/**
 * Output format catalogue plus runtime capability detection.
 *
 * The original tool offered "JPG" and "JPEG" as two separate options even though
 * they encode identically; here JPEG is a single format and the file extension is
 * a separate, explicit choice.
 */

export type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif';

export interface FormatInfo {
  id: OutputFormat;
  label: string;
  mime: string;
  ext: string;
  /** Quality setting is meaningful (i.e. it is a lossy codec). */
  lossy: boolean;
  /** The codec can store an alpha channel. */
  alpha: boolean;
  hint: string;
}

export const FORMATS: Record<OutputFormat, FormatInfo> = {
  png: {
    id: 'png',
    label: 'PNG',
    mime: 'image/png',
    ext: 'png',
    lossy: false,
    alpha: true,
    hint: 'Lossless with transparency. Best for logos, icons and screenshots.',
  },
  jpeg: {
    id: 'jpeg',
    label: 'JPEG',
    mime: 'image/jpeg',
    ext: 'jpg',
    lossy: true,
    alpha: false,
    hint: 'Small photos, but no transparency. Universally supported.',
  },
  webp: {
    id: 'webp',
    label: 'WebP',
    mime: 'image/webp',
    ext: 'webp',
    lossy: true,
    alpha: true,
    hint: 'Much smaller than JPEG at the same quality, and keeps transparency.',
  },
  avif: {
    id: 'avif',
    label: 'AVIF',
    mime: 'image/avif',
    ext: 'avif',
    lossy: true,
    alpha: true,
    hint: 'Smallest files of all. Not supported by every browser or app.',
  },
};

export const FORMAT_IDS: OutputFormat[] = ['png', 'jpeg', 'webp', 'avif'];

export function formatInfo(id: OutputFormat): FormatInfo {
  return FORMATS[id];
}

export function isOutputFormat(value: string): value is OutputFormat {
  return Object.prototype.hasOwnProperty.call(FORMATS, value);
}

/**
 * Choose the extension for an output file. `original` lets the user keep a
 * `.jpeg` spelling if their downstream system insists on it.
 */
export function extensionFor(format: OutputFormat, jpegExtension: 'jpg' | 'jpeg' = 'jpg'): string {
  return format === 'jpeg' ? jpegExtension : FORMATS[format].ext;
}

/**
 * `canvas.toBlob` silently falls back to PNG when it does not know a MIME type,
 * so the only trustworthy support check is to encode a pixel and inspect the
 * type of the blob that comes back.
 */
export async function detectSupport(
  encode: (mime: string) => Promise<Blob | null>,
): Promise<Set<OutputFormat>> {
  const supported = new Set<OutputFormat>(['png', 'jpeg']);

  await Promise.all(
    (['webp', 'avif'] as const).map(async (id) => {
      try {
        const blob = await encode(FORMATS[id].mime);
        if (blob && blob.type === FORMATS[id].mime) supported.add(id);
      } catch {
        // Unsupported codec: leave it out of the set.
      }
    }),
  );

  return supported;
}

/** Formats that can represent the transparency the user asked for. */
export function keepsTransparency(format: OutputFormat): boolean {
  return FORMATS[format].alpha;
}
