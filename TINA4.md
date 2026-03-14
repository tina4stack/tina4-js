# Tina4-JS Framework Context

> This file helps AI coding tools (Claude Code, Cursor, Copilot) generate correct tina4-js code.

## Quick Reference

| Concept | Code |
|---------|------|
| State | `const x = signal(value)` — read/write via `.value` |
| Derived | `const d = computed(() => x.value * 2)` — read-only, auto-tracks |
| Effect | `effect(() => { /* runs when signals change */ })` |
| Render | `` html`<div>${signal}</div>` `` — returns real DOM nodes |
| Component | `` class X extends Tina4Element { render() { return html`...`; } } `` |
| Route | `` route('/path', (params) => html`...`) `` |
| Navigate | `navigate('/path')` |
| API | `await api.get('/path')`, `.post`, `.put`, `.patch`, `.delete` |
| PWA | `pwa.register({ name, themeColor, cacheStrategy })` |
| WebSocket | `ws.connect('wss://...', { reconnect: true })` — signals for status/messages |
| Debug | `import 'tina4js/debug'` — toggle with Ctrl+Shift+D |

## File Conventions

- Components: `src/components/kebab-case.ts`
- Routes: `src/routes/index.ts`
- Pages: `src/pages/kebab-case.ts`
- Static files: `src/public/`
- Styles: `src/public/css/`

## Rules

1. Always use `.value` to read/write signals
2. Always return `` html`...` `` from `render()` and route handlers
3. Route params use `{name}` syntax: `` route('/user/{id}', ({ id }) => ...) ``
4. Event handlers use `@` prefix: `` @click=${handler} ``, `` @input=${handler} ``
5. Boolean attrs use `?` prefix: `` ?disabled=${signal} ``
6. API calls are async/await
7. Components extend `Tina4Element` and must call `customElements.define()`
8. Use `static props = { name: String }` for component attributes
9. Use `` static styles = `css` `` for scoped styles (Shadow DOM)
10. Use `static shadow = false` for light DOM components
11. `route(pattern, handler)` — pattern is ALWAYS the first argument, handler/config is second
12. `api.configure()` must be called before any API calls if you need auth or a base URL

## Signal Patterns

```ts
// Create
const count = signal(0);

// Create with debug label (shows in debug overlay)
const count = signal(0, 'count');

// Read
count.value; // 0

// Write (triggers DOM updates)
count.value = 5;

// Read without subscribing
count.peek(); // 5

// Derived (auto-updates)
const doubled = computed(() => count.value * 2);

// Side effect
effect(() => console.log(count.value));

// Batch multiple updates
batch(() => { a.value = 1; b.value = 2; }); // one notification

// Check if something is a signal
isSignal(count); // true

// In templates — signals interpolate directly
html`<span>${count}</span>`; // auto-updates when count changes
```

## Component Pattern

```ts
import { Tina4Element, html, signal } from 'tina4js';

class MyWidget extends Tina4Element {
  static props = { label: String, count: Number, active: Boolean };
  static styles = `:host { display: block; }`;

  // Internal state
  expanded = signal(false);

  render() {
    return html`
      <div>
        <span>${this.prop('label')}: ${this.prop('count')}</span>
        <button @click=${() => this.expanded.value = !this.expanded.value}>
          ${() => this.expanded.value ? 'Less' : 'More'}
        </button>
        ${() => this.expanded.value ? html`<slot></slot>` : null}
      </div>
    `;
  }

  onMount() { /* connected to DOM */ }
  onUnmount() { /* removed from DOM */ }
}

customElements.define('my-widget', MyWidget);
```

## Router Pattern

```ts
import { route, router, navigate, html } from 'tina4js';

// Simple route
route('/', () => html`<h1>Home</h1>`);

// Route with params
route('/user/{id}', ({ id }) => html`<h1>User ${id}</h1>`);

// Route with guard (returns false to block, or string to redirect)
route('/admin', {
  guard: () => isLoggedIn() || '/login',
  handler: () => html`<h1>Admin</h1>`
});

// Catch-all (must be last)
route('*', () => html`<h1>404</h1>`);

// Start router — call AFTER all routes are registered
router.start({ target: '#root', mode: 'hash' }); // or mode: 'history'

// Programmatic navigation
navigate('/user/42');
navigate('/login', { replace: true }); // replace history entry

// Listen for route changes
router.on('change', (event) => {
  // event: { path, params, pattern, durationMs }
});
```

## API Pattern (tina4-php/python compatible)

```ts
import { api } from 'tina4js';

// Configure — call before making requests
api.configure({
  baseUrl: '/api',
  auth: true,                        // enables Bearer token + formToken
  tokenKey: 'tina4_token',           // localStorage key (default)
  headers: { 'X-API-Key': 'abc' },  // default headers on every request
});

// GET with query params
const users = await api.get('/users', { params: { page: 1, limit: 20 } });
// => GET /api/users?page=1&limit=20

// GET with custom headers
const data = await api.get('/data', { headers: { 'Accept-Language': 'en' } });

// POST with body
await api.post('/users', { name: 'Andre' });

// POST with body + custom headers
await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// PUT, PATCH, DELETE
await api.put('/users/42', { name: 'Updated' });
await api.patch('/users/42', { active: false });
await api.delete('/users/42');

// DELETE with query params
await api.delete('/users/42', { params: { permanent: true } });

// Error handling — non-2xx throws an ApiResponse object
try {
  await api.get('/protected');
} catch (err) {
  // err: { status: 401, data: {...}, ok: false, headers: Headers }
}

// Interceptors — modify every request/response
api.intercept('request', (config) => {
  config.headers['X-Custom'] = 'val';
  return config;
});

api.intercept('response', (res) => {
  if (res.status === 401) navigate('/login');
  return res;
});
```

### RequestOptions

All API methods accept an optional `RequestOptions` object:

```ts
interface RequestOptions {
  headers?: Record<string, string>;           // per-request headers
  params?: Record<string, string | number | boolean>; // query string params
}

api.get(path, options?)
api.post(path, body?, options?)
api.put(path, body?, options?)
api.patch(path, body?, options?)
api.delete(path, options?)
```

## Conditional & List Rendering

```ts
// Conditional — use a function that returns html or null
html`${() => show.value ? html`<p>Visible</p>` : null}`;

// List — use a function that maps to html templates
html`<ul>${() => items.value.map(i => html`<li>${i}</li>`)}</ul>`;
```

## Backend Integration

### tina4-php
```bash
tina4 build --target php
# Outputs to src/public/js/, generates src/templates/index.twig
# Set TINA4_APP_DOCUMENT_ROOT=src/public in .env
```

### tina4-python
```bash
tina4 build --target python
# Outputs to src/public/js/, generates src/templates/index.twig
# Also generates src/routes/spa.py catch-all route
```

### Auth Flow (compatible with tina4-php/python)
- Bearer token from `localStorage` on every request when `auth: true`
- `formToken` injected into POST/PUT/PATCH/DELETE body
- Token auto-rotated via `FreshToken` response header

## WebSocket (Signal-Driven)

```ts
import { ws } from 'tina4js/ws';
import { signal } from 'tina4js';

// Connect with auto-reconnect
const socket = ws.connect('wss://api.example.com/live', {
  reconnect: true,           // auto-reconnect (default: true)
  reconnectDelay: 1000,      // initial delay ms (default: 1000)
  reconnectMaxDelay: 30000,  // max backoff ms (default: 30000)
  reconnectAttempts: Infinity, // max attempts (default: Infinity)
});

// Reactive state — all signals
socket.status.value;      // 'connecting' | 'open' | 'closed' | 'reconnecting'
socket.connected.value;   // boolean
socket.lastMessage.value; // last parsed message
socket.error.value;       // last error or null
socket.reconnectCount.value; // number of reconnect attempts

// Send — objects auto-stringify
socket.send({ type: 'chat', text: 'hello' });
socket.send('raw string');

// Listen for events
socket.on('message', (data) => { /* parsed JSON or string */ });
socket.on('open', () => { });
socket.on('close', (code, reason) => { });
socket.on('error', (err) => { });

// Pipe messages directly into a signal
const messages = signal<ChatMessage[]>([]);
socket.pipe(messages, (msg, current) => [...current, msg as ChatMessage]);

// Disconnect (stops reconnect)
socket.close();
```

### Real-time UI with Signals

```ts
// Chat example — messages auto-render in the template
const chatLog = signal<{user: string, text: string}[]>([]);
const socket = ws.connect('wss://chat.example.com');
socket.pipe(chatLog, (msg, log) => [...log, msg as any]);

route('/chat', () => html`
  <ul>${() => chatLog.value.map(m => html`<li><b>${m.user}</b>: ${m.text}</li>`)}</ul>
`);
```

## Debug Overlay

```ts
// Always-on
import 'tina4js/debug';

// Dev-only (recommended — stripped from production builds)
if (import.meta.env.DEV) import('tina4js/debug');
```

- Toggle with **Ctrl+Shift+D**
- Panels: live signal values + subscriber counts, mounted components, route navigation history with timing, API request/response log
- Zero cost in production when using the `import.meta.env.DEV` guard (tree-shaken by Vite/Rollup)
- Signals can have debug labels: `signal(0, 'count')` — shows in the signals panel

## Framework Size

| Module | Gzipped |
|--------|---------|
| Core (signals + html + component) | ~1.5 KB |
| Router | ~0.12 KB |
| API | ~0.97 KB |
| WebSocket | ~0.91 KB |
| PWA | ~1.16 KB |
| Debug overlay | ~5.1 KB |
| **Total (core modules)** | **~4.66 KB** |

## Architecture

```
src/
  core/       signal.ts, html.ts, component.ts  — reactive primitives
  router/     router.ts                          — client-side routing
  api/        fetch.ts                           — HTTP with auth + headers
  ws/         ws.ts                              — WebSocket with auto-reconnect
  pwa/        pwa.ts                             — service worker + manifest
  debug/      overlay, trackers, panels          — dev debug overlay
  index.ts    barrel re-export
```

### Exports Map

```ts
import { signal, html, computed, effect, batch, isSignal, Tina4Element } from 'tina4js';
import { route, router, navigate } from 'tina4js';
import { api } from 'tina4js';
import { pwa } from 'tina4js';

// Or import individual modules (tree-shakeable):
import { signal, html } from 'tina4js/core';
import { route, router } from 'tina4js/router';
import { api } from 'tina4js/api';
import { pwa } from 'tina4js/pwa';
import { ws } from 'tina4js/ws';
import 'tina4js/debug';
```

### TypeScript Types

```ts
import type { Signal, ReadonlySignal } from 'tina4js';
import type { RouteParams, RouteHandler, RouteGuard, RouteConfig } from 'tina4js';
import type { ApiConfig, ApiResponse, RequestOptions } from 'tina4js';
import type { SocketStatus, SocketOptions, ManagedSocket } from 'tina4js';
import type { PWAConfig } from 'tina4js';
import type { PropType } from 'tina4js';
```

## Common Mistakes to Avoid

1. **Reversed route arguments**: `route('/path', handler)` NOT `route(handler, '/path')`
2. **Forgetting `.value`**: `count.value++` NOT `count++`
3. **Calling `router.start()` before routes**: Register all routes first, then start
4. **Not returning from `render()`**: Always `return html\`...\``
5. **Missing `api.configure()`**: Must configure before making authenticated requests
6. **Using `api.get('/users/{id}', { id: 42 })`**: Changed to `api.get('/users/42')` — use params for query strings: `api.get('/users', { params: { id: 42 } })`
