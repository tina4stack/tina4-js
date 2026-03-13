import { defineConfig } from 'vite';
import { resolve } from 'path';

const frameworkSrc = resolve(__dirname, '../../src');

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    alias: {
      'tina4js/debug': resolve(frameworkSrc, 'debug/index.ts'),
      'tina4js': resolve(frameworkSrc, 'index.ts'),
    },
  },
});
