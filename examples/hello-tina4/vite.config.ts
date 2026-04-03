import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    // Proxy API calls to tina4-php/python backend in dev
    // proxy: { '/api': 'http://localhost:7145' },
  },
});
