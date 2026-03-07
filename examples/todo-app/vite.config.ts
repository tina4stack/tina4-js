import { defineConfig } from 'vite';
import { resolve } from 'path';

const frameworkRoot = resolve(__dirname, '../../src');

export default defineConfig({
  server: { port: 3000 },
  resolve: {
    alias: {
      'tina4js/debug': resolve(frameworkRoot, 'debug/index.ts'),
      'tina4js': resolve(frameworkRoot, 'index.ts'),
    },
  },
});
