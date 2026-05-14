import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // `@` → src/ — absolute imports instead of ../.. chains.
      // Matches the `paths` entry in tsconfig.json.
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    // Proxy API calls to tina4-php/python backend in dev
    // proxy: { '/api': 'http://localhost:7145' },
  },
});
