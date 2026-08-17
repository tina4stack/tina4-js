import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

  it('creates a current project and hands startup to the unified client', () => {
    const result = output(dir, ['create', 'my-app']);
    const pkg = JSON.parse(readFileSync(join(dir, 'my-app/package.json'), 'utf-8'));

    expect(pkg.dependencies.tina4js).toBe('^1.5.3');
    expect(result).toContain('tina4 serve');
    expect(result).not.toContain('npm run dev');
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
