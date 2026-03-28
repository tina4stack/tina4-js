#!/usr/bin/env node

/**
 * Tina4 CLI — Project scaffolding and build tooling.
 *
 * Usage:
 *   npx tina4 create <name>           Scaffold a new project
 *   npx tina4 create <name> --pwa     Include PWA support
 *   npx tina4 build                   Production build
 *   npx tina4 build --target php      Build for tina4-php embedding
 *   npx tina4 build --target python   Build for tina4-python embedding
 *   npx tina4 dev                     Dev server with HMR
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

// ── Colors (no dependencies) ────────────────────────────────────────

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Commands ────────────────────────────────────────────────────────

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

switch (command) {
  case 'create':
    createProject(args[1], args.includes('--pwa'), args.includes('--css'));
    break;
  case 'dev':
    runDev();
    break;
  case 'build':
    runBuild(args.includes('--target') ? args[args.indexOf('--target') + 1] : null);
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
}

// ── Create ──────────────────────────────────────────────────────────

function createProject(name, withPwa, withCss) {
  if (!name) {
    console.error('Usage: tina4 create <project-name>');
    process.exit(1);
  }

  const projectDir = path.resolve(process.cwd(), name);
  const projectName = path.basename(projectDir);

  if (fs.existsSync(projectDir)) {
    console.error(`Directory "${name}" already exists.`);
    process.exit(1);
  }

  console.log(`\n${c.bold('Creating')} ${c.cyan(projectName)}...\n`);

  // Create directory structure
  const dirs = [
    'src/components',
    'src/routes',
    'src/pages',
    'src/public/css',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(projectDir, dir), { recursive: true });
  }

  // ── package.json ──────────────────────────────────────────────

  const pkg = {
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      test: 'vitest run',
    },
    dependencies: {
      tina4js: '^1.0.7',
      ...(withCss ? { 'tina4-css': '^2.0.0' } : {}),
    },
    devDependencies: {
      vite: '^5.4.0',
      typescript: '^5.4.0',
    },
  };
  writeFile(projectDir, 'package.json', JSON.stringify(pkg, null, 2));

  // ── tsconfig.json ─────────────────────────────────────────────

  const tsconfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    },
    include: ['src/**/*.ts'],
  };
  writeFile(projectDir, 'tsconfig.json', JSON.stringify(tsconfig, null, 2));

  // ── vite.config.ts ────────────────────────────────────────────

  writeFile(projectDir, 'vite.config.ts', `import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    // Proxy API calls to tina4-php/python backend in dev
    // proxy: { '/api': 'http://localhost:7145' },
  },
});
`);

  // ── index.html ────────────────────────────────────────────────

  writeFile(projectDir, 'index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  ${withCss
    ? '<link rel="stylesheet" href="/node_modules/tina4-css/dist/tina4.min.css">'
    : '<link rel="stylesheet" href="/src/public/css/default.css">'}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`);

  // ── src/main.ts ───────────────────────────────────────────────

  let mainTs = `import { signal, computed, html, route, router, navigate, api } from 'tina4js';
import './routes/index';

// Debug overlay in dev mode (Ctrl+Shift+D to toggle, tree-shaken from production builds)
if (import.meta.env.DEV) import('tina4js/debug');
`;

  if (withPwa) {
    mainTs += `import { pwa } from 'tina4js';

pwa.register({
  name: '${projectName}',
  shortName: '${projectName}',
  themeColor: '#1a1a2e',
  cacheStrategy: 'network-first',
  precache: ['/', '/src/public/css/default.css'],
});
`;
  }

  mainTs += `
// Configure API (uncomment to connect to tina4-php/python backend)
// api.configure({ baseUrl: '/api', auth: true });

// Start router
router.start({ target: '#root', mode: 'hash' });
`;
  writeFile(projectDir, 'src/main.ts', mainTs);

  // ── src/routes/index.ts ───────────────────────────────────────

  writeFile(projectDir, 'src/routes/index.ts', `import { route, navigate, html, signal, computed } from 'tina4js';
import { homePage } from '../pages/home';

// Home
route('/', homePage);

// About
route('/about', () => html\`
  <div class="page">
    <h1>About</h1>
    <p>Built with <a href="https://github.com/tina4stack/tina4-js">tina4-js</a> — a sub-3KB reactive framework.</p>
    <a href="/">Back home</a>
  </div>
\`);

// 404
route('*', () => html\`
  <div class="page">
    <h1>404</h1>
    <p>Page not found.</p>
    <a href="/">Go home</a>
  </div>
\`);
`);

  // ── src/pages/home.ts ─────────────────────────────────────────

  writeFile(projectDir, 'src/pages/home.ts', `import { signal, computed, html } from 'tina4js';

export function homePage() {
  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  return html\`
    <div class="page">
      <h1>Welcome to \${document.title}</h1>
      <p>Edit <code>src/pages/home.ts</code> to get started.</p>

      <div class="counter">
        <button @click=\${() => count.value--}>-</button>
        <span>\${count}</span>
        <button @click=\${() => count.value++}>+</button>
      </div>
      <p class="muted">Doubled: \${doubled}</p>

      <nav>
        <a href="/about">About</a>
      </nav>
    </div>
  \`;
}
`);

  // ── src/components/app-header.ts ──────────────────────────────

  writeFile(projectDir, 'src/components/app-header.ts', `import { Tina4Element, html } from 'tina4js';

class AppHeader extends Tina4Element {
  static props = { title: String };
  static styles = \`
    :host { display: block; padding: 1rem 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 2rem; }
    h1 { margin: 0; font-size: 1.5rem; }
    nav { display: flex; gap: 1rem; margin-top: 0.5rem; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  \`;

  render() {
    return html\`
      <h1>\${this.prop('title')}</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    \`;
  }
}

customElements.define('app-header', AppHeader);
`);

  // ── src/public/css/default.css ────────────────────────────────

  writeFile(projectDir, 'src/public/css/default.css', `/* Tina4 default styles */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1f2937;
  background: #ffffff;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

h1 { font-size: 2rem; margin-bottom: 0.5rem; }
p { margin-bottom: 1rem; }
a { color: #2563eb; }
code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }

.page { padding: 2rem 0; }
.muted { color: #6b7280; font-size: 0.875rem; }

.counter {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
}

.counter button {
  width: 40px;
  height: 40px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
  font-size: 1.25rem;
  cursor: pointer;
  transition: background 0.15s;
}

.counter button:hover { background: #e5e7eb; }

.counter span {
  font-size: 2rem;
  font-weight: bold;
  min-width: 3rem;
  text-align: center;
}

nav { margin: 1.5rem 0; display: flex; gap: 1rem; }
`);

  // ── .gitignore ────────────────────────────────────────────────

  writeFile(projectDir, '.gitignore', `node_modules/
dist/
*.tsbuildinfo
`);

  // ── TINA4.md (AI context) ─────────────────────────────────────

  writeFile(projectDir, 'TINA4.md', getTina4ContextMd());

  // ── Done ──────────────────────────────────────────────────────

  console.log(`  ${c.green('✓')} Created project structure`);
  console.log(`  ${c.green('✓')} package.json, tsconfig, vite config`);
  console.log(`  ${c.green('✓')} Home page with reactive counter`);
  console.log(`  ${c.green('✓')} Router with /, /about, 404`);
  console.log(`  ${c.green('✓')} AppHeader web component`);
  console.log(`  ${c.green('✓')} ${withCss ? 'tina4-css (full CSS framework)' : 'Default CSS'}`);
  console.log(`  ${c.green('✓')} TINA4.md (AI context file)`);
  if (withPwa) console.log(`  ${c.green('✓')} PWA support (service worker + manifest)`);
  if (withCss) console.log(`  ${c.green('✓')} tina4-css@2.0.0 — grid, buttons, forms, tables, cards`);

  console.log(`\n${c.bold('Next steps:')}\n`);
  console.log(`  cd ${projectName}`);
  console.log(`  npm install`);
  console.log(`  npm run dev\n`);
}

// ── Dev ─────────────────────────────────────────────────────────────

function runDev() {
  console.log(`\n${c.cyan('Starting dev server...')}\n`);
  try {
    execSync('npx vite', { stdio: 'inherit', cwd: process.cwd() });
  } catch { /* user ctrl-c */ }
}

// ── Build ───────────────────────────────────────────────────────────

function runBuild(target) {
  if (target === 'php' || target === 'python') {
    buildForBackend(target);
  } else {
    console.log(`\n${c.cyan('Building for production...')}\n`);
    execSync('npx vite build', { stdio: 'inherit', cwd: process.cwd() });
    console.log(`\n${c.green('✓')} Build complete — output in dist/\n`);
  }
}

function buildForBackend(target) {
  const cwd = process.cwd();
  const outDir = path.join(cwd, 'src', 'public', 'js');

  console.log(`\n${c.cyan(`Building for tina4-${target}...`)}\n`);

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });

  // Build with Vite, output to src/public/js/
  execSync(`npx vite build --outDir "${outDir}" --emptyOutDir`, {
    stdio: 'inherit',
    cwd,
  });

  // Generate index.twig from index.html
  const indexHtml = path.join(cwd, 'index.html');
  if (fs.existsSync(indexHtml)) {
    let html = fs.readFileSync(indexHtml, 'utf8');
    // Replace script src to point to built bundle
    html = html.replace(
      /<script type="module" src="[^"]*"><\/script>/,
      '<script type="module" src="/js/tina4.es.js"></script>'
    );
    // Add server-side state injection point
    html = html.replace(
      '</head>',
      '  <script>window.__TINA4_STATE__ = {{ initialState | json_encode | raw }};</script>\n</head>'
    );

    const templatesDir = path.join(cwd, 'src', 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'index.twig'), html);
    console.log(`  ${c.green('✓')} Generated src/templates/index.twig`);
  }

  // For Python, generate a catch-all route
  if (target === 'python') {
    const routesDir = path.join(cwd, 'src', 'routes');
    fs.mkdirSync(routesDir, { recursive: true });
    const catchAll = path.join(routesDir, 'spa.py');
    if (!fs.existsSync(catchAll)) {
      fs.writeFileSync(catchAll, `from tina4_python import get
from tina4_python.Template import Template

@get("/{path:path}")
async def spa_catchall(path, request, response):
    """Catch-all for SPA client-side routing"""
    return response(Template.render_twig_template("index.twig", {"request": request}))
`);
      console.log(`  ${c.green('✓')} Generated src/routes/spa.py (catch-all)`);
    }
  }

  // For PHP, remind about .env
  if (target === 'php') {
    console.log(`\n  ${c.yellow('Reminder:')} Add to your .env:`);
    console.log(`    TINA4_APP_DOCUMENT_ROOT=src/public`);
    console.log(`    TINA4_APP_INDEX=../templates/index.twig`);
  }

  console.log(`\n${c.green('✓')} Build complete for tina4-${target}\n`);
}

// ── Help ────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
${c.bold('tina4')} — Sub-3KB reactive framework

${c.bold('Usage:')}
  tina4 create <name>               Create a new project
  tina4 create <name> --pwa         Create with PWA support
  tina4 create <name> --css         Create with tina4-css framework
  tina4 create <name> --pwa --css   Create with both
  tina4 dev                         Start dev server
  tina4 build                       Production build → dist/
  tina4 build --target php          Build for tina4-php
  tina4 build --target python       Build for tina4-python

${c.bold('Examples:')}
  ${c.dim('$')} npx tina4 create my-app
  ${c.dim('$')} npx tina4 create my-app --css
  ${c.dim('$')} cd my-app && npm install && npm run dev
`);
}

// ── TINA4.md Content ────────────────────────────────────────────────

function getTina4ContextMd() {
  return `# Tina4-JS Framework Context

> This file helps AI coding tools (Claude Code, Cursor, Copilot) generate correct tina4-js code.

## Quick Reference

| Concept | Code |
|---------|------|
| State | \`const x = signal(value)\` — read/write via \`.value\` |
| Derived | \`const d = computed(() => x.value * 2)\` — read-only, auto-tracks |
| Effect | \`effect(() => { /* runs when signals change */ })\` |
| Render | \`html\\\`<div>\\\${signal}</div>\\\`\` — returns real DOM nodes |
| Component | \`class X extends Tina4Element { render() { return html\\\`...\\\`; } }\` |
| Route | \`route('/path', (params) => html\\\`...\\\`)\` |
| Navigate | \`navigate('/path')\` |
| API | \`await api.get('/path')\`, \`.post\`, \`.put\`, \`.patch\`, \`.delete\` |
| PWA | \`pwa.register({ name, themeColor, cacheStrategy })\` |

## File Conventions

- Components: \`src/components/kebab-case.ts\`
- Routes: \`src/routes/index.ts\`
- Pages: \`src/pages/kebab-case.ts\`
- Static files: \`src/public/\`
- Styles: \`src/public/css/\`

## Rules

1. Always use \`.value\` to read/write signals
2. Always return \`html\\\`...\\\`\` from \`render()\` and route handlers
3. Route params use \`{name}\` syntax: \`route('/user/{id}', ({ id }) => ...)\`
4. Event handlers use \`@\` prefix: \`@click=\\\${handler}\`, \`@input=\\\${handler}\`
5. Boolean attrs use \`?\` prefix: \`?disabled=\\\${signal}\`
6. API calls are async/await
7. Components extend \`Tina4Element\` and must call \`customElements.define()\`
8. Use \`static props = { name: String }\` for component attributes
9. Use \`static styles = \\\`css\\\`\` for scoped styles (Shadow DOM)
10. Use \`static shadow = false\` for light DOM components

## Signal Patterns

\`\`\`ts
// Create
const count = signal(0);

// Read
count.value; // 0

// Write (triggers DOM updates)
count.value = 5;

// Derived (auto-updates)
const doubled = computed(() => count.value * 2);

// Side effect
effect(() => console.log(count.value));

// Batch multiple updates
batch(() => { a.value = 1; b.value = 2; }); // one notification

// In templates — signals interpolate directly
html\\\`<span>\\\${count}</span>\\\`; // auto-updates when count changes
\`\`\`

## Component Pattern

\`\`\`ts
import { Tina4Element, html, signal } from 'tina4js';

class MyWidget extends Tina4Element {
  static props = { label: String, count: Number, active: Boolean };
  static styles = \\\`:host { display: block; }\\\`;

  // Internal state
  expanded = signal(false);

  render() {
    return html\\\`
      <div>
        <span>\\\${this.prop('label')}: \\\${this.prop('count')}</span>
        <button @click=\\\${() => this.expanded.value = !this.expanded.value}>
          \\\${() => this.expanded.value ? 'Less' : 'More'}
        </button>
        \\\${() => this.expanded.value ? html\\\`<slot></slot>\\\` : null}
      </div>
    \\\`;
  }

  onMount() { /* connected to DOM */ }
  onUnmount() { /* removed from DOM */ }
}

customElements.define('my-widget', MyWidget);
\`\`\`

## Router Pattern

\`\`\`ts
import { route, router, navigate, html } from 'tina4js';

route('/', () => html\\\`<h1>Home</h1>\\\`);
route('/user/{id}', ({ id }) => html\\\`<h1>User \\\${id}</h1>\\\`);
route('/admin', { guard: () => isLoggedIn() || '/login', handler: () => html\\\`<h1>Admin</h1>\\\` });
route('*', () => html\\\`<h1>404</h1>\\\`);

router.start({ target: '#root', mode: 'hash' }); // or mode: 'history'
navigate('/user/42');
\`\`\`

## API Pattern (tina4-php/python compatible)

\`\`\`ts
import { api } from 'tina4js';

api.configure({ baseUrl: '/api', auth: true });

const users = await api.get('/users');
const user = await api.get('/users/{id}', { id: 42 });
await api.post('/users', { name: 'Andre' });
await api.put('/users/42', { name: 'Updated' });
await api.delete('/users/42');

// Interceptors
api.intercept('request', (config) => { config.headers['X-Custom'] = 'val'; return config; });
api.intercept('response', (res) => { if (res.status === 401) navigate('/login'); return res; });
\`\`\`

## Conditional & List Rendering

\`\`\`ts
// Conditional — use a function that returns html or null
html\\\`\\\${() => show.value ? html\\\`<p>Visible</p>\\\` : null}\\\`;

// List — use a function that maps to html templates
html\\\`<ul>\\\${() => items.value.map(i => html\\\`<li>\\\${i}</li>\\\`)}</ul>\\\`;
\`\`\`

## Framework Size

| Module | Gzipped |
|--------|---------|
| Core (signals + html + component) | 2.44 KB |
| Router | 1.13 KB |
| API | 0.82 KB |
| PWA | 1.13 KB |
`;
}

// ── Helpers ─────────────────────────────────────────────────────────

function writeFile(dir, filePath, content) {
  const full = path.join(dir, filePath);
  const parent = path.dirname(full);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  fs.writeFileSync(full, content);
}
