// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

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
