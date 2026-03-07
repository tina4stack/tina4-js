# Tina4-JS

Sub-3KB reactive framework — signals, web components, routing, and PWA.

Works standalone or embedded inside [tina4-php](https://github.com/tina4stack/tina4-php) / [tina4-python](https://github.com/tina4stack/tina4-python).

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

## License

MIT
