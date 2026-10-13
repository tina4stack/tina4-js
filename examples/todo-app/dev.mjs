// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// Dev server for this example — esbuild only, no Vite. Rebuilds on save and
// serves the folder with esbuild's built-in live-reload (SSE at /esbuild).
// index.html opts in with one <script> line that reloads on `change`.
import { context } from 'esbuild';
import { resolve } from 'node:path';

const root = process.cwd();
const framework = resolve(root, '..', '..', 'src');
const port = Number(process.env.PORT) || 3000;

const ctx = await context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2021',
  sourcemap: true,
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

await ctx.watch();
const { hosts, port: servedPort } = await ctx.serve({ servedir: '.', port });
console.log(`dev server (esbuild) on http://${hosts[0] ?? 'localhost'}:${servedPort} - watching src/, live-reload via /esbuild`);
