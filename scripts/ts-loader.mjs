// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// A ~50-line TypeScript loader for node:test, on esbuild alone (already the
// project's one build dependency) - no tsx, no ts-node, no new tree. It does two
// things Node's native resolver does not: resolve EXTENSIONLESS and DIRECTORY
// relative imports (`../src/core` -> `../src/core/index.ts`), the bundler style
// the source uses, and transpile `.ts`/`.tsx` on load via esbuild.transform.
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformSync } from "esbuild";

const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

function isFile(p) {
  try { return statSync(p).isFile(); } catch { return false; }
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("file:")) {
    const base = specifier.startsWith("file:")
      ? new URL(specifier)
      : new URL(specifier, context.parentURL ?? pathToFileURL(process.cwd() + "/"));
    const p = fileURLToPath(base);
    const candidates = [p, ...EXTS.map((e) => p + e), ...EXTS.map((e) => `${p}/index${e}`)];
    for (const c of candidates) {
      if (isFile(c)) return { url: pathToFileURL(c).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (url.endsWith(".ts") || url.endsWith(".tsx") || url.endsWith(".mts")) {
    const path = fileURLToPath(url);
    const raw = readFileSync(path, "utf8");
    const { code } = transformSync(raw, {
      loader: url.endsWith(".tsx") ? "tsx" : "ts",
      format: "esm",
      target: "es2020",
      sourcefile: path,
    });
    // CommonJS dirname globals a module may reference (ESM has none). Inject only
    // when used, so a module that declares its own never collides.
    const needsDir = /\b__dirname\b/.test(raw);
    const needsFile = /\b__filename\b/.test(raw);
    const banner = (needsDir || needsFile)
      ? "import{fileURLToPath as __f}from'node:url';"
        + (needsFile ? "const __filename=__f(import.meta.url);" : "")
        + (needsDir ? "const __dirname=__f(new URL('.',import.meta.url));" : "")
      : "";
    return { format: "module", source: banner + code, shortCircuit: true };
  }
  return next(url, context);
}
