// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

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
