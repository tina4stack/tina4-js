// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// The library build, on esbuild alone (no Vite/Rollup). Produces the same dist
// layout the package.json `exports` map references: <name>.es.js (ESM, split so
// shared code lands in one chunk) and <name>.cjs.js (CJS, each entry standalone
// since esbuild cannot code-split CJS). Minified, es2021, no sourcemaps - matching
// the old `vite build` (which already delegated minify to esbuild). Types are
// emitted separately by `tsc --emitDeclarationOnly`, the IIFE by build:iife.
import { build } from "esbuild";
import { resolve } from "node:path";

const r = (p) => resolve(import.meta.dirname, "..", p);

const entryPoints = {
  tina4: r("src/index.ts"),
  core: r("src/core/index.ts"),
  router: r("src/router/index.ts"),
  api: r("src/api/index.ts"),
  pwa: r("src/pwa/index.ts"),
  push: r("src/push.ts"),
  debug: r("src/debug/index.ts"),
  ws: r("src/ws/index.ts"),
  sse: r("src/sse/index.ts"),
  rtc: r("src/rtc/index.ts"),
  storage: r("src/storage/index.ts"),
  i18n: r("src/i18n/index.ts"),
  ai: r("src/ai/index.ts"),
};

const common = {
  entryPoints,
  bundle: true,
  minify: true,
  sourcemap: false,
  target: "es2021",
  outdir: r("dist"),
  logLevel: "info",
};

await build({
  ...common,
  format: "esm",
  splitting: true, // shared code -> a chunk, like Rollup did
  outExtension: { ".js": ".es.js" },
});

await build({
  ...common,
  format: "cjs",
  outExtension: { ".js": ".cjs.js" },
});

console.log("esbuild: library build complete (dist/*.es.js, dist/*.cjs.js)");
