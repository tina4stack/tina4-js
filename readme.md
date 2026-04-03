<p align="center">
  <img src="https://tina4.com/logo.svg" alt="Tina4" width="200">
</p>

<h1 align="center">tina4-js</h1>
<h3 align="center">The Intelligent Native Application 4ramework</h3>

<p align="center">
  Sub-3KB reactive frontend. Signals. Web Components. Zero dependencies.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/tina4js"><img src="https://img.shields.io/npm/v/tina4js?color=7b1fa2&label=npm" alt="npm"></a>
  <img src="https://img.shields.io/badge/tests-238%20passing-brightgreen" alt="Tests">
  <img src="https://img.shields.io/badge/size-%3C3KB-blue" alt="Size">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero Deps">
  <a href="https://tina4.com/js"><img src="https://img.shields.io/badge/docs-tina4.com%2Fjs-7b1fa2" alt="Docs"></a>
</p>

<p align="center">
  <a href="https://tina4.com/js">Documentation</a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#whats-included">What's Included</a> &bull;
  <a href="https://tina4stack.github.io/tina4-js/examples/gallery/">Live Gallery</a> &bull;
  <a href="https://tina4.com">tina4.com</a>
</p>

---

## Quick Start

```bash
# Create a project
npx tina4js create my-app

# With optional CSS framework
npx tina4js create my-app --css

# With PWA support
npx tina4js create my-app --css --pwa

# Run it
cd my-app && npm install && npm run dev
```

Open http://localhost:3000 -- your app is running.

---

## What's Included

Every module is built from scratch -- no node_modules bloat, no third-party runtime dependencies.

| Module | Gzipped | What it does |
|--------|---------|-------------|
| **Core** | 1.51 KB | Signals, computed, effect, batch, html tagged templates, Tina4Element web components |
| **Router** | 0.12 KB | Client-side SPA routing, path params (`{id}`), guards, history/hash mode |
| **API** | 1.49 KB | Fetch client with auth (Bearer + formToken + FreshToken rotation), interceptors, per-request headers/params |
| **WebSocket** | 0.91 KB | Signal-driven status, auto-reconnect with exponential backoff, pipe() to signal, JSON auto-parse |
| **PWA** | 1.16 KB | Service worker + manifest generation, cache strategies (network-first, cache-first, stale-while-revalidate) |
| **Debug** | 5.11 KB | Dev overlay (Ctrl+Shift+D) -- signals, components, routes, API panels |

**238 tests across 10 test files. Zero dependencies. Under 3KB for the full core.**

For full documentation visit **[tina4.com/javascript](https://tina4.com/js)**.

---

## Install

```bash
npm install tina4js
```

Or use via CDN with zero build tools:

```html
<script type="module">
  import { signal, html } from 'https://cdn.jsdelivr.net/npm/tina4js/dist/tina4.es.js';
</script>
```

---

## Getting Started

### 1. Create a project

```bash
npx tina4js create my-app --css
cd my-app && npm install
```

This creates:

```
my-app/
  index.html              # Entry point
  package.json            # Dependencies: tina4js, vite, typescript
  src/
    main.ts               # App entry -- imports routes, starts router
    routes/
      index.ts            # Route definitions
    pages/
      home.ts             # Home page handler
    components/
      app-header.ts       # Example web component
    public/
      css/
        default.css       # Default styles
```

### 2. Create a signal

```ts
import { signal, computed, html } from 'tina4js';

const count = signal(0);
const doubled = computed(() => count.value * 2);

const view = html`
  <button @click=${() => count.value--}>-</button>
  <span>${count}</span>
  <button @click=${() => count.value++}>+</button>
  <p>Doubled: ${doubled}</p>
`;

document.body.append(view);
```

### 3. Create a route

```ts
import { route, router, html } from 'tina4js';

route('/', () => html`<h1>Home</h1>`);
route('/user/{id}', ({ id }) => html`<h1>User ${id}</h1>`);
route('/admin', {
  guard: () => isLoggedIn() || '/login',
  handler: () => html`<h1>Admin</h1>`,
});
route('*', () => html`<h1>404</h1>`);

router.start({ target: '#root', mode: 'history' });
```

### 4. Create a component

```ts
import { Tina4Element, html, signal } from 'tina4js';

class MyCounter extends Tina4Element {
  static props = { label: String };
  static styles = `:host { display: block; }`;

  count = signal(0);

  render() {
    return html`
      <span>${this.prop('label')}: ${this.count}</span>
      <button @click=${() => this.count.value++}>+</button>
    `;
  }
}

customElements.define('my-counter', MyCounter);
```

```html
<my-counter label="Clicks"></my-counter>
```

### 5. Talk to your backend

```ts
import { api } from 'tina4js';

api.configure({
  baseUrl: '/api',
  auth: true,  // Bearer + formToken (tina4-php/python compatible)
});

const users = await api.get('/users');
const user  = await api.get('/users/42');
const result = await api.post('/users', { name: 'Andre' });

// Query params
const admins = await api.get('/users', {
  params: { role: 'admin', active: true },
});

// Per-request headers
const data = await api.get('/data', {
  headers: { 'X-API-Version': '2' },
});

// Interceptors
api.intercept('response', (res) => {
  if (res.status === 401) navigate('/login');
  return res;
});
```

### 6. Real-time with WebSocket

```ts
import { ws, signal } from 'tina4js';

const socket = ws.connect('wss://api.example.com/ws');
const messages = signal([]);

socket.pipe(messages, (msg, current) => [...current, msg]);

// Reactive signals
socket.status.value;     // 'connecting' | 'open' | 'closed' | 'reconnecting'
socket.connected.value;  // boolean
socket.send({ type: 'ping' }); // auto-JSON
socket.close(); // intentional -- no reconnect
```

### 7. Make it a PWA

```ts
import { pwa } from 'tina4js';

pwa.register({
  name: 'My App',
  shortName: 'App',
  themeColor: '#1a1a2e',
  cacheStrategy: 'network-first',
  precache: ['/', '/css/default.css'],
});
```

### 8. Debug everything

```ts
// Dev-only — tree-shaken out of production builds
if (import.meta.env.DEV) import('tina4js/debug');
```

Toggle with **Ctrl+Shift+D**. Shows live signal values, mounted components, route history, and API calls.

---

## Deployment Modes

| Mode | Description |
|------|-------------|
| **Standalone** | `npm run build` → deploy `dist/` to any static host |
| **tina4-php** | `npm run build` → JS bundle into `src/public/js/` |
| **tina4-python** | `npm run build` → JS bundle into `src/public/js/` |
| **Islands** | No SPA — hydrate individual web components in server-rendered pages |

---

## Live Gallery

**[9 real-world examples](https://tina4stack.github.io/tina4-js/examples/gallery/)** you can learn from, copy, and build on:

1. Admin Dashboard -- reactive KPIs, polling, notification feed
2. Contact Manager -- full CRUD with search/filter
3. Real-time Chat -- WebSocket with typing indicators
4. Auth Flow -- JWT login, protected routes, token refresh
5. Shopping Cart -- shared signals, computed totals, localStorage
6. Dynamic Form Builder -- drag fields, live preview, JSON export
7. PWA Notes -- offline-capable, installable
8. Data Table -- sort, search, pagination
9. Live Search -- debounced API calls

---

## Development

```bash
npm test          # run all tests (238 passing)
npm run test:watch # watch mode
npm run build     # production build
npm run build:types # TypeScript declarations
npm run dev       # dev server with HMR
```

---

## Changelog

### 1.0.12
- Added comprehensive boolean attribute tests (opposing pairs, inside reactive blocks, computed, multi-signal)

### 1.0.11
- **Fix:** `?attr=${() => expr}` now calls the function reactively instead of treating it as truthy

### 1.0.9
- **Fix:** All `@event` handlers auto-wrapped in `batch()` -- one re-render per handler, no mid-event DOM rebuilds

### 1.0.8
- Added `--css` flag to `tina4js create` for optional tina4-css integration
- Added gallery of 9 real-world examples

### 1.0.7
- Added WebSocket module with signal-driven auto-reconnect and `pipe()`
- Fixed effect error isolation, API tracker bugs, added per-request headers/params
- 231 tests across 10 test files

### 1.0.5
- Fixed effect subscription cleanup and inner effect disposal on re-evaluation

---

## License

MIT

*tina4-js — The Intelligent Native Application 4ramework. [tina4.com](https://tina4.com)*
