import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '../../src/core/index.ts'),
      name: 'tina4',
      formats: ['iife'],
      fileName: () => 'tina4.bundle.js',
    },
    outDir: resolve(__dirname),
    emptyOutDir: false,
    minify: 'esbuild',
  },
});
