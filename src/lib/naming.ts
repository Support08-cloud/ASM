/**
 * Output filename templating.
 *
 * Batch exports are useless if every file lands as `download.png`, so names are
 * driven by a token template and defended against path traversal and collisions.
 */

export interface NameContext {
  /** Source file name with its extension already removed. */
  name: string;
  width: number;
  height: number;
  ext: string;
  /** 1-based position in the batch. */
  index: number;
}

export const DEFAULT_TEMPLATE = '{name}-{w}x{h}';

export const TEMPLATE_TOKENS = ['{name}', '{w}', '{h}', '{i}', '{date}'] as const;

/** Remove the final extension, leaving dotted names like `logo.v2` intact. */
export function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^./\\]+$/, '');
}

/**
 * Strip anything that could escape the target directory or upset a filesystem,
 * then collapse the result so it stays readable.
 */
export function sanitizeSegment(value: string): string {
  const cleaned = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();

  return cleaned.length > 0 ? cleaned.slice(0, 120) : 'image';
}

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Expand a template into a filename (including extension).
 * Unknown tokens are left untouched so typos are visible rather than silent.
 */
export function applyTemplate(template: string, ctx: NameContext, date: string = today()): string {
  const base = template.replace(/\{(name|w|h|i|date)\}/g, (_match, token: string) => {
    switch (token) {
      case 'name':
        return ctx.name;
      case 'w':
        return String(ctx.width);
      case 'h':
        return String(ctx.height);
      case 'i':
        return String(ctx.index);
      case 'date':
        return date;
      default:
        return _match;
    }
  });

  return `${sanitizeSegment(base)}.${ctx.ext}`;
}

/**
 * Ensure every name in a batch is unique by suffixing `-2`, `-3`, ... on repeats.
 * Zip files with duplicate entries are handled inconsistently by extractors, so
 * this matters more than it looks.
 */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();

  return names.map((name) => {
    const key = name.toLowerCase();
    const count = seen.get(key) ?? 0;
    seen.set(key, count + 1);
    if (count === 0) return name;

    const dot = name.lastIndexOf('.');
    const stem = dot === -1 ? name : name.slice(0, dot);
    const ext = dot === -1 ? '' : name.slice(dot);
    return `${stem}-${count + 1}${ext}`;
  });
}
