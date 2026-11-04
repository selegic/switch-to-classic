import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Manifest V3 service workers can be classic scripts, so this is bundled as
// an IIFE as well. Keeping it separate from the content script means each
// bundle is self-contained and needs no module support from Chrome.
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'extension/serviceWorker.ts'),
      fileName: () => 'serviceWorker.js',
      formats: ['iife'],
      name: 'SwitchToClassicWorker',
    },
    minify: true,
    outDir: 'dist/extension',
    sourcemap: false,
    target: 'chrome120',
  },
});
