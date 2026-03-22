# Tina4-JS

Sub-3KB reactive framework — signals, web components, routing, PWA, WebSocket, and API client.

Works standalone or embedded inside [tina4-php](https://github.com/tina4stack/tina4-php) / [tina4-python](https://github.com/tina4stack/tina4-python).

**[Live Gallery — 9 real-world examples](https://tina4stack.github.io/tina4-js/examples/gallery/)** · dashboards, CRUD, chat, auth, cart, forms, PWA, data tables, and live search — all self-contained, no build step.

## Why?

| Feature               | React  | Preact | Vue    | **tina4-js** |
|-----------------------|--------|--------|--------|--------------|
| Size (gzip)           | 42KB   | 3KB    | 33KB   | **~2KB**     |
| Virtual DOM           | Yes    | Yes    | Yes    | **No**       |
| Components            | Custom | Custom | Custom | **Native Web Components** |
| Reactivity            | Hooks  | Hooks  | Proxy  | **Signals**  |
| Router included       | No     | No     | No     | **Yes**      |
| HTTP client included  | No     | No     | No     | **Yes**      |
| PWA support           | No     | No     | No     | **Yes**      |
| Backend integration   | None   | None   | None   | **tina4-php/python** |
| Works without build   | No     | No     | No     | **Yes** (ESM) |

No virtual DOM. Signals track exactly which DOM nodes need updating — O(1) updates.

## Install

```bash
npm install tina4js
```

Or use via CDN with zero build tools:

```html
<script type="module">
  import { signal, html } from 'https://cdn.jsdelivr.net/npm/tina4js/dist/tina4.esm.js';
</script>
```

## Quick Start

```bash
npm run dev    # dev server with HMR
npm run build  # production build
npm test       # run tests
```

---

## API Reference

### Signals — Reactive State

```ts
import { signal, computed, effect, batch } from 'tina4js';

// Create a reactive value
const count = signal(0);
count.value;       // read: 0
count.value = 5;   // write: triggers subscribers

// Derived value (auto-tracks dependencies)
const doubled = computed(() => count.value * 2);
doubled.value;     // 10 (read-only)

// Side effect (auto-tracks dependencies)
const dispose = effect(() => {
  console.log(`Count is ${count.value}`);
});
// Runs immediately, then re-runs when count changes.
// Call dispose() to stop.

// Batch multiple updates (one notification)
batch(() => {
  a.value = 1;
  b.value = 2;
}); // subscribers notified once
```

### html`` — Tagged Template Renderer

```ts
import { html, signal } from 'tina4js';

const name = signal('World');

// Creates real DOM nodes (not strings)
const el = html`<h1>Hello ${name}!</h1>`;
document.body.append(el);

name.value = 'Tina4'; // DOM updates surgically — no diffing

// Event handlers
html`<button @click=${() => alert('clicked')}>Go</button>`;

// Conditional rendering
const show = signal(true);
html`<div>${() => show.value ? html`<p>Visible</p>` : null}</div>`;

// List rendering
const items = signal(['a', 'b', 'c']);
html`<ul>${() => items.value.map(i => html`<li>${i}</li>`)}</ul>`;

// Reactive attributes
const cls = signal('active');
html`<div class=${cls}>Styled</div>`;

// Boolean attributes
const disabled = signal(false);
html`<button ?disabled=${disabled}>Submit</button>`;
```

### Tina4Element — Web Components

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

### Router — Client-Side Routing

```ts
import { route, router, navigate, html } from 'tina4js';

route('/', () => html`<h1>Home</h1>`);
route('/user/{id}', ({ id }) => html`<h1>User ${id}</h1>`);
route('/admin', {
  guard: () => isLoggedIn() || '/login',
  handler: () => html`<h1>Admin</h1>`,
});
route('*', () => html`<h1>404</h1>`);

router.start({ target: '#root', mode: 'history' });

// Programmatic navigation
navigate('/user/42');
```

### API — Fetch Client

```ts
import { api } from 'tina4js';

api.configure({
  baseUrl: '/api',
  auth: true,  // auto Bearer + formToken (tina4-php/python compatible)
});

const users = await api.get('/users');
const user  = await api.get('/users/{id}', { id: 42 });
const result = await api.post('/users', { name: 'Andre' });

// Interceptors
api.intercept('request', (config) => {
  config.headers['X-Custom'] = 'value';
  return config;
});

api.intercept('response', (res) => {
  if (res.status === 401) navigate('/login');
  return res;
});
```

### PWA — Progressive Web App

```ts
import { pwa } from 'tina4js';

pwa.register({
  name: 'My App',
  shortName: 'App',
  themeColor: '#1a1a2e',
  cacheStrategy: 'network-first',
  precache: ['/', '/css/default.css'],
  offlineRoute: '/offline',
});
```

### WebSocket — Signal-driven real-time

```ts
import { ws } from 'tina4js/ws';

const socket = ws.connect('wss://api.example.com/ws');

// Reactive signals — use in html templates
socket.status.value;     // 'connecting' | 'connected' | 'disconnected' | 'error'
socket.connected.value;  // boolean
socket.lastMessage.value;

// Pipe messages into a signal
const messages = signal([]);
socket.pipe(messages, (msg, current) => [...current, msg]);

// Send
socket.send({ type: 'ping' }); // objects auto-JSON serialised

// Auto-reconnects with exponential backoff by default
socket.close(); // intentional close — no reconnect
```

### Debug Overlay

A built-in debug overlay that shows live signal values, component tree, route history, and API calls.

```ts
// Always-on (remove for production)
import 'tina4js/debug';

// Dev-only (recommended) — tree-shaken out of production builds
if (import.meta.env.DEV) import('tina4js/debug');
```

Once enabled, toggle the overlay with **Ctrl+Shift+D**.

The overlay shows four tabs:

| Tab | What it shows |
|-----|---------------|
| **Signals** | All signals with current value, subscriber count, and update count |
| **Components** | Mounted `Tina4Element` web components |
| **Routes** | Navigation history with timing |
| **API** | Intercepted `api.*` requests and responses |

---

## Deployment Modes

| Mode | Description |
|------|-------------|
| **Standalone** | `npm run build` → deploy `dist/` to any static host |
| **tina4-php** | `npm run build` → JS bundle into `src/public/js/`, uses `TINA4_APP_DOCUMENT_ROOT` |
| **tina4-python** | `npm run build` → JS bundle into `src/public/js/`, with catch-all route |
| **Islands** | No SPA — hydrate individual web components in server-rendered pages |

---

## Development

```bash
npm test          # run all tests
npm run test:watch # watch mode
npm run build     # production build
npm run dev       # dev server
```

## Changelog

### 1.0.9
- **Fix:** All `@event` handlers are now automatically wrapped in `batch()` — multiple signal writes inside a single handler produce exactly one re-render after the event finishes, preventing mid-event DOM rebuilds and duplicate handler calls on re-rendered elements

### 1.0.8
- Added `--css` flag to `tina4 create` — scaffolds with [tina4-css](https://www.npmjs.com/package/tina4-css) included
- Added gallery of 9 real-world examples: [live demo](https://tina4stack.github.io/tina4-js/examples/gallery/)

### 1.0.7
- Added WebSocket module (`tina4js/ws`) with signal-driven status, auto-reconnect with exponential backoff, `pipe()` for streaming messages into signals, and JSON auto-parse/serialise
- Fixed effect error isolation — a throwing effect no longer blocks sibling effects
- Fixed API request/response correlation for concurrent requests
- Fixed API tracker always showing empty URL in debug overlay
- Added per-request `headers` and `params` to all API methods
- 231 tests across 10 test files

### 1.0.5
- **Fix:** Effects now properly unsubscribe from signals on dispose — prevents stale subscriptions accumulating in signal subscriber sets across navigations
- **Fix:** Function bindings in `html` templates now dispose inner effects when re-evaluated — fixes duplicate DOM nodes from nested reactive lists and conditionals
- Added 9 new tests covering effect subscription cleanup, inner effect disposal, and multi-navigation accumulation (116 total)

### 1.0.4
- Added router reactive effect cleanup tests (navigate away/back, stale effects, async handlers, stale async discard)
- Added debug overlay documentation to README and TINA4.md

### 1.0.3
- **Fix:** `renderContent` now uses `replaceChildren` instead of `appendChild`, preventing duplicate content when async route handlers resolve.

### 1.0.2
- **Fix:** Router now disposes reactive effects when navigating between routes. Previously, signal subscriptions created by `html` templates survived DOM removal via `innerHTML = ''`, causing duplicate renders when revisiting a page.
- **Fix:** Stale async route handlers are discarded if navigation occurs before they resolve.

### 1.0.1
- Debug overlay module with signal, component, route, and API inspectors
- Todo app example and exports map file extension fixes
- CLI scaffolding tool and TINA4.md AI context file
- Fetch, PWA, integration, and size tests (102 total)

## License

MIT
