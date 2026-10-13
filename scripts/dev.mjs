// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// The dev server, on esbuild alone (no Vite). It rebuilds the bundle on every
// save and serves the project with esbuild's built-in live-reload: esbuild
// exposes a Server-Sent Events channel at /esbuild, and a page reloads on the
// `change` event. A served HTML page opts in with one line:
//
//   <script>new EventSource('/esbuild').addEventListener('change',()=>location.reload())</script>
//
// Full-page reload (not module-level HMR) - the same behaviour tina4-js had
// under Vite, which registered no HMR handlers (see ADR / the migration notes).
import { context } from "esbuild";

const port = Number(process.env.PORT) || 5173;

const ctx = await context({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  sourcemap: true,
  target: "es2021",
  outfile: "dist/tina4.es.js",
  logLevel: "info",
});

await ctx.watch();
const { hosts, port: servedPort } = await ctx.serve({ servedir: ".", port });
console.log(`tina4-js dev server (esbuild) on http://${hosts[0] ?? "localhost"}:${servedPort}  - watching src/, live-reload via /esbuild`);
