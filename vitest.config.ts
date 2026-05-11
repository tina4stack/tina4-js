import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    globals: true,
    // Node v22+ ships a built-in localStorage stub via the --localstorage-file
    // flag which lacks .clear() / .key() and shadows happy-dom's proper
    // implementation. tests/setup.ts polyfills it — without this `setupFiles`
    // line that file is dead code and all 40 `api — edge cases` tests fail
    // with `localStorage.clear is not a function`.
    setupFiles: ['./tests/setup.ts'],
  },
});
