import { defineConfig } from 'vite';
import { resolve } from 'path';

const frameworkSrc = resolve(__dirname, '../../src');

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    alias: {
      // `@` → this example's own src/ — absolute imports instead of
      // brittle ../.. relative chains. Matches the `paths` entry in
      // tsconfig.json and what `tina4 init js` scaffolds.
      '@': resolve(__dirname, 'src'),
      // tina4js → the framework source (this example builds against
      // the local checkout, not the npm package).
      'tina4js/debug': resolve(frameworkSrc, 'debug/index.ts'),
      'tina4js': resolve(frameworkSrc, 'index.ts'),
    },
  },
});
