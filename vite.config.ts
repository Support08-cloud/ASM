import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Make the single-file build runnable straight from disk.
 *
 * Chrome refuses to execute `<script type="module">` on the `file://` origin, so a
 * double-clicked export would render the markup and then quietly do nothing. Vite's
 * entry chunk is already a self-contained IIFE with no import/export/import.meta, so
 * it is safe to serve as a classic script.
 *
 * `defer` is ignored on inline scripts, so the tag also has to move to the end of
 * `<body>` to still see a fully parsed DOM. This runs in `closeBundle` so it is
 * guaranteed to see the finished HTML that vite-plugin-singlefile inlined into.
 */
function runnableFromDisk(): Plugin {
  const MODULE_SCRIPT = /<script\b[^>]*\btype="module"[^>]*>([\s\S]*?)<\/script>/g;
  let config: ResolvedConfig;

  return {
    name: 'runnable-from-disk',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      const file = resolve(config.root, config.build.outDir, 'index.html');

      let html: string;
      try {
        html = await readFile(file, 'utf8');
      } catch {
        return; // Nothing emitted.
      }

      const bodies: string[] = [];
      let rewritten = html.replace(MODULE_SCRIPT, (_tag, code: string) => {
        if (code.trim().length > 0) bodies.push(code);
        return '';
      });

      if (bodies.length === 0) return; // Already classic; nothing to do.

      const scripts = bodies.map((code) => `<script>${code}</script>`).join('\n');
      rewritten = rewritten.includes('</body>')
        ? rewritten.replace('</body>', `${scripts}\n  </body>`)
        : rewritten + scripts;

      await writeFile(file, rewritten, 'utf8');
    },
  };
}

// The build output is intentionally ONE self-contained .html file with no external
// requests, so it can be emailed around and opened straight from disk.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile(), runnableFromDisk()],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 100_000,
  },
});
