import { zip, type Zippable } from 'fflate';

export interface ZipEntry {
  name: string;
  blob: Blob;
}

/**
 * Bundle finished images into a zip.
 *
 * Compression is disabled (level 0, "store"): PNG/JPEG/WebP/AVIF payloads are
 * already compressed, so deflating them burns time for a fraction of a percent.
 */
export async function createZip(entries: ZipEntry[]): Promise<Blob> {
  const files: Zippable = {};

  await Promise.all(
    entries.map(async (entry) => {
      const buffer = await entry.blob.arrayBuffer();
      files[entry.name] = [new Uint8Array(buffer), { level: 0 }];
    }),
  );

  const data = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, { level: 0 }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });

  // Copy into a fresh buffer so the Blob owns plain ArrayBuffer-backed bytes.
  return new Blob([new Uint8Array(data)], { type: 'application/zip' });
}

/** Trigger a browser download for a blob, cleaning up the object URL afterwards. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
