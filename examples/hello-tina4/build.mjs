// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Production build for this example — esbuild only, no Vite. Bundles
// src/main.ts (with the `@` -> src alias and tina4js -> local framework
// source) into dist/main.js.
import { build } from 'esbuild';
import { resolve } from 'node:path';

const root = process.cwd();
const framework = resolve(root, '..', '..', 'src');

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2021',
  sourcemap: true,
  minify: true,
  // Keep intentional side-effect imports ('tina4js/debug' registers the dev
  // overlay); the framework marks debug side-effect-free for library tree-shaking.
  ignoreAnnotations: true,
  outfile: 'dist/main.js',
  alias: {
    '@': resolve(root, 'src'),
    'tina4js/debug': resolve(framework, 'debug', 'index.ts'),
    tina4js: resolve(framework, 'index.ts'),
  },
  logLevel: 'info',
});
console.log('build complete -> dist/main.js');
