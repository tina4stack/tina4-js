import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        tina4: resolve(import.meta.dirname, 'src/index.ts'),
        core: resolve(import.meta.dirname, 'src/core/index.ts'),
        router: resolve(import.meta.dirname, 'src/router/index.ts'),
        api: resolve(import.meta.dirname, 'src/api/index.ts'),
        pwa: resolve(import.meta.dirname, 'src/pwa/index.ts'),
        debug: resolve(import.meta.dirname, 'src/debug/index.ts'),
        ws: resolve(import.meta.dirname, 'src/ws/index.ts'),
        sse: resolve(import.meta.dirname, 'src/sse/index.ts'),
        rtc: resolve(import.meta.dirname, 'src/rtc/index.ts'),
        storage: resolve(import.meta.dirname, 'src/storage/index.ts'),
        i18n: resolve(import.meta.dirname, 'src/i18n/index.ts'),
        ai: resolve(import.meta.dirname, 'src/ai/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].[format].js',
        chunkFileNames: '[name].[format].js',
        manualChunks: undefined,
        inlineDynamicImports: false,
      },
    },
    minify: 'esbuild',
    outDir: 'dist',
  },
});
