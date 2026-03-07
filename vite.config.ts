import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        tina4: resolve(__dirname, 'src/index.ts'),
        core: resolve(__dirname, 'src/core/index.ts'),
        router: resolve(__dirname, 'src/router/index.ts'),
        api: resolve(__dirname, 'src/api/index.ts'),
        pwa: resolve(__dirname, 'src/pwa/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      output: {
        entryFileNames: '[name].[format].js',
      },
    },
    minify: 'esbuild',
    outDir: 'dist',
  },
});
