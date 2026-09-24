// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, '_entry.ts'),
      name: 'tina4',
      formats: ['iife'],
      fileName: () => 'tina4.bundle.js',
    },
    outDir: resolve(__dirname),
    emptyOutDir: false,
    minify: 'esbuild',
  },
});
