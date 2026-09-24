// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

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
