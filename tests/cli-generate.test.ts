// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { describe, it, expect, beforeEach, afterEach } from './harness';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The generator is the frontend equivalent of `tina4python generate model/route`:
// it must emit CORRECT tina4-js by construction (the patterns AI gets wrong) and
// style ONLY with tina4-css classes — inline styles are forbidden.
const CLI = join(__dirname, '..', 'bin', 'tina4.js');

function run(cwd: string, args: string[]): void {
  execFileSync('node', [CLI, ...args], { cwd, stdio: 'pipe' });
}

function output(cwd: string, args: string[]): string {
  return execFileSync('node', [CLI, ...args], { cwd, encoding: 'utf-8' });
}

describe('tina4js CLI onboarding', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'tina4-cli-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('exposes the page and component generators in help', () => {
    const help = output(dir, ['--help']);
    expect(help).toContain('generate page <name>');
    expect(help).toContain('generate component <name>');
  });

  it('scaffolds an esbuild project (no Vite) and points at npm run dev', () => {
    const result = output(dir, ['create', 'my-app']);
    const pkg = JSON.parse(readFileSync(join(dir, 'my-app/package.json'), 'utf-8'));
    const main = readFileSync(join(dir, 'my-app/src/main.ts'), 'utf-8');

    expect(pkg.dependencies.tina4js).toBe('^1.7.5');
    // The app build runs on esbuild via the tina4js CLI - no Vite anywhere.
    expect(pkg.scripts.dev).toBe('tina4js dev');
    expect(pkg.scripts.build).toBe('tina4js build');
    expect(pkg.devDependencies.esbuild).toBeDefined();
    expect(pkg.devDependencies.vite).toBeUndefined();
    expect(pkg.dependencies.vite).toBeUndefined();
    expect(result).toContain('npm run dev');
    expect(main).toContain("mode: 'history'");
    expect(main).not.toContain("mode: 'hash'");
    // No Vite-only import.meta features in the generated entry.
    expect(main).not.toContain('import.meta.env');
    expect(main).not.toContain('import.meta.glob');
  });

  it('ships no Vite config and wires the @ alias for tsc', () => {
    run(dir, ['create', 'typed-app']);
    // esbuild has no import.meta.glob/env, so the scaffold needs neither a
    // vite-env.d.ts nor a vite.config.ts.
    expect(existsSync(join(dir, 'typed-app/src/vite-env.d.ts'))).toBe(false);
    expect(existsSync(join(dir, 'typed-app/vite.config.ts'))).toBe(false);

    const tsconfig = JSON.parse(readFileSync(join(dir, 'typed-app/tsconfig.json'), 'utf-8'));
    // `@/*` -> src/* matches the esbuild `@` alias; `types` stays unset so every
    // @types/* package is still auto-included.
    expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['src/*']);
    expect(tsconfig.compilerOptions.types).toBeUndefined();

    const pkg = JSON.parse(readFileSync(join(dir, 'typed-app/package.json'), 'utf-8'));
    expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
  });
});

describe('tina4js generate', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'tina4-gen-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  describe('page', () => {
    beforeEach(() => run(dir, ['generate', 'page', 'products', '--api', '/api/products']));

    const pageJs = () => readFileSync(join(dir, 'public/js/products-page.js'), 'utf-8');
    const shell = () => readFileSync(join(dir, 'public/products.html'), 'utf-8');

    it('writes the page JS and an HTML shell', () => {
      expect(existsSync(join(dir, 'public/js/products-page.js'))).toBe(true);
      expect(existsSync(join(dir, 'public/products.html'))).toBe(true);
    });

    it('uses signals and reactive blocks (updates, not render-once)', () => {
      const js = pageJs();
      expect(js).toContain('signal(');
      // Reactive list must be a function hole `${() => ...}`, not a static value.
      expect(js).toMatch(/\$\{\(\) =>/);
    });

    it('fetches the given API and handles the Tina4 {records} shape', () => {
      const js = pageJs();
      expect(js).toContain("api.get('/api/products')");
      expect(js).toContain('records');
    });

    it('styles with tina4-css classes and NEVER inline styles', () => {
      const js = pageJs();
      expect(js).not.toMatch(/style=/);        // hard no on inline styles
      expect(shell()).not.toMatch(/style=/);
      expect(js).toMatch(/class="container"|class="card"|table-striped|btn btn-primary/);
      expect(shell()).toContain('tina4.min.css');
    });

    it('never emits another framework', () => {
      const js = pageJs();
      expect(js).not.toMatch(/\b(React|Vue|from ['"]react|createApp|FastAPI)\b/);
      expect(js).not.toMatch(/^\s*import\s/m); // no ES imports — pure global Tina4
    });

    it('renders directly without adding a hash router to a standalone page', () => {
      const js = pageJs();
      expect(js).toContain("document.getElementById('root').appendChild(productsPage())");
      expect(js).not.toContain('router.start');
      expect(js).not.toContain("route('/',");
    });

    it('is syntactically valid JavaScript', () => {
      // node --check throws on a syntax error.
      execFileSync('node', ['--check', join(dir, 'public/js/products-page.js')]);
    });
  });

  describe('component', () => {
    beforeEach(() => run(dir, ['generate', 'component', 'counter']));
    const js = () => readFileSync(join(dir, 'public/js/components/counter.js'), 'utf-8');

    it('emits a Tina4Element with a hyphenated tag and no inline styles', () => {
      expect(js()).toContain('extends Tina4Element');
      expect(js()).toMatch(/customElements\.define\('x-counter'/);   // custom els need a hyphen
      expect(js()).toContain('static styles');                      // scoped CSS, not inline
      expect(js()).not.toMatch(/style=/);
    });

    it('is syntactically valid JavaScript', () => {
      execFileSync('node', ['--check', join(dir, 'public/js/components/counter.js')]);
    });
  });
});
