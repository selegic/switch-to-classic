import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The content script is injected as a classic script, so it must be an IIFE
// with no imports. It is built separately from the service worker.
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'extension/contentPage.ts'),
      fileName: () => 'contentPage.js',
      formats: ['iife'],
      name: 'SwitchToClassicContent',
    },
    minify: true,
    outDir: 'dist/extension',
    sourcemap: false,
    target: 'chrome120',
  },
});
