# Tina4-JS System Overview

## Vision

A sub-3KB (gzipped) frontend framework that leverages native browser APIs instead of reimplementing them. Designed to work standalone OR embedded inside tina4-php / tina4-python backends.

## Why It Can Be Smaller Than Preact

Preact (3KB gzip) ships a virtual DOM diffing algorithm. We don't need one because:

1. **Signals** track exactly which DOM nodes depend on which data — no diffing needed
2. **Web Components** give us encapsulated components natively — no component model needed
3. **Tagged template literals** compile to direct DOM operations — no JSX transform or h() calls needed
4. **History API** is already a router — we just wrap it
5. **Fetch API** is already an HTTP client — we just add interceptors
6. **Service Worker API** is already a PWA runtime — we just generate the config

Every line of code we write is a thin wrapper, not a reimplementation.

## Size Budget

| Module              | Est. Raw | Est. Gzip | What It Does                          |
|---------------------|----------|-----------|---------------------------------------|
| signal.ts           | ~800B    | ~400B     | Reactive state (signal, computed, effect) |
| html.ts             | ~1.2KB   | ~600B     | Tagged template literal renderer      |
| component.ts        | ~600B    | ~300B     | Base Tina4Element web component class |
| router.ts           | ~900B    | ~450B     | History/hash routing + guards         |
| fetch.ts            | ~700B    | ~350B     | Fetch wrapper + interceptors + auth   |
| **TOTAL CORE**      | **~4.2KB** | **~2.1KB** | **Full framework**                 |
| pwa.ts (optional)   | ~800B    | ~400B     | SW registration + manifest gen        |
| **TOTAL WITH PWA**  | **~5KB** | **~2.5KB** | **Full framework + PWA**            |

Tree-shakeable: if you only use signals + html, you ship ~1KB gzip.

## Architecture

```
tina4-js/
  src/
    core/
      signal.ts       -- Reactive primitives: signal(), computed(), effect()
      html.ts         -- Tagged template literal: html`<div>${signal}</div>`
      component.ts    -- Tina4Element base class (extends HTMLElement)
    router/
      router.ts       -- Client-side routing (history + hash mode)
    api/
      fetch.ts        -- Fetch wrapper, auth token rotation, interceptors
    pwa/
      sw-template.ts  -- Service worker template (cache strategies)
      manifest.ts     -- Generate manifest.json from config
    index.ts          -- Main export barrel
  cli/
    tina4.ts          -- CLI: create, dev, build, deploy
  dist/               -- Built output
```

## How It Works

### 1. Signals (Reactivity)

No virtual DOM. Signals track subscribers at the DOM node level.

```js
import { signal, computed, effect } from 'tina4';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log(count.value); // re-runs when count changes
});

count.value = 5; // triggers effect, updates any bound DOM nodes
```

Implementation: ~30 lines. A signal holds a value and a Set of subscribers.
`effect()` sets a global "current effect", reads signals (which auto-subscribe),
then clears the global. When a signal's value changes, it runs all subscribers.

### 2. Tagged Template Renderer

```js
import { html } from 'tina4';

const name = signal('World');

// Returns real DOM nodes, not strings
const view = html`<h1>Hello ${name}!</h1>`;

document.body.append(view);
name.value = 'Tina4'; // DOM updates surgically, no diffing
```

How: `html` parses the template once into a `<template>` element (cached by
template strings identity). Clones it for each render. For each interpolated
value, if it's a signal, creates an effect that updates just that text node
or attribute. Static parts never re-render.

### 3. Web Components

```js
import { Tina4Element, html, signal } from 'tina4';

class MyCounter extends Tina4Element {
  count = signal(0);

  render() {
    return html`
      <button @click=${() => this.count.value++}>
        Clicked ${this.count} times
      </button>
    `;
  }
}

customElements.define('my-counter', MyCounter);
```

`Tina4Element` extends `HTMLElement`:
- Calls `render()` in `connectedCallback()`
- Attaches result to Shadow DOM (opt-in) or light DOM
- `attributeChangedCallback` bridges HTML attributes to signals
- Lifecycle: `onMount()`, `onUnmount()`, `onUpdate()`

### 4. Router

```js
import { router, route } from 'tina4';

route('/', () => html`<h1>Home</h1>`);
route('/user/{id}', ({ id }) => html`<h1>User ${id}</h1>`);
route('/admin/*', ({ guard }) => guard(isLoggedIn), () => html`<h1>Admin</h1>`);

router.start({ mode: 'history', target: '#root' });
```

Features:
- History API mode (clean URLs, needs server catch-all) or hash mode
- Path parameters: `/user/{id}` -> { id: "42" }
- Route guards (auth checks, redirects)
- Lazy routes via dynamic `import()`
- Nested layouts
- `navigate('/path')` programmatic navigation
- Back/forward browser button support

### 5. API / Fetch

```js
import { api } from 'tina4';

api.configure({
  baseUrl: '/api',
  // Auto-manages Bearer token + FreshToken rotation (tina4-php/python compatible)
  auth: true,
});

api.intercept('request', (req) => { /* add headers */ });
api.intercept('response', (res) => { /* handle errors */ });

const users = await api.get('/users');
const result = await api.post('/users', { name: 'Test' });
```

Compatible with tina4-php and tina4-python auth:
- Sends `Authorization: Bearer <token>`
- Reads `FreshToken` response header for token rotation
- Sends `formToken` for write operations (POST/PUT/PATCH/DELETE)
- Offline queue (pairs with service worker)

### 6. PWA (Optional Module)

```js
import { pwa } from 'tina4';

pwa.register({
  name: 'My App',
  shortName: 'App',
  themeColor: '#1a1a2e',
  cacheStrategy: 'network-first', // or 'cache-first', 'stale-while-revalidate'
  offlineRoute: '/offline',
});
```

- Auto-generates `manifest.json` and registers service worker
- Configurable cache strategies
- Offline fallback route
- `<tina4-install>` component for install prompt

## Tina4 Ecosystem Integration

### Directory Convention (Shared with PHP/Python)

```
my-app/
  src/
    routes/       -- Route handler files (auto-discovered)
    templates/    -- Twig/HTML templates
    public/       -- Static files (css/, js/, images/)
    scss/         -- SCSS source files
    components/   -- Web component definitions
  index.html      -- SPA entry point
  tina4.config.js -- Framework config
```

### Deployment Modes

#### Mode 1: Standalone SPA
- `tina4 build` outputs to `dist/`
- Deploy to any static host (Netlify, Vercel, Cloudflare Pages, S3, etc.)
- All routing is client-side
- API calls go to a separate backend

#### Mode 2: Embedded in tina4-php
- `tina4 build --target php` outputs JS bundle to `src/public/js/`
- Set `TINA4_APP_DOCUMENT_ROOT` in `.env` for SPA catch-all
- PHP serves API routes, tina4-js handles frontend routing
- Shared Twig templates work in both PHP and JS
- formToken + Bearer auth works seamlessly

#### Mode 3: Embedded in tina4-python
- `tina4 build --target python` outputs JS bundle to `src/public/js/`
- Framework auto-adds a catch-all route for SPA mode
- Python serves API routes, tina4-js handles frontend routing
- Shared Jinja2/Twig templates work in both Python and JS
- formToken + Bearer auth works seamlessly

#### Mode 4: Hybrid (Progressive Enhancement)
- Server renders initial HTML via Twig (PHP or Python)
- tina4-js hydrates interactive components on the page
- No SPA — just reactive islands within server-rendered pages
- Smallest JS payload, best for content-heavy sites

### Auth Flow (Cross-Framework)

```
Browser                    tina4-php / tina4-python
   |                              |
   |--- POST /api/login --------->|
   |<-- { token, formToken } -----|
   |                              |
   |--- GET /api/data ----------->|  (Authorization: Bearer <token>)
   |<-- { data }                  |  (FreshToken: <new-token>)
   |   (auto-rotates token)       |
   |                              |
   |--- POST /api/update -------->|  (Bearer + formToken in body)
   |<-- { result }                |
```

tina4-js `api` module handles this automatically — same protocol as tina4helper.js.

### Template Interoperability

Templates written for tina4-php (Twig) or tina4-python (Jinja2) work in tina4-js
for basic rendering. The JS twig package supports the core syntax:

```twig
{% extends "base.twig" %}
{% block content %}
  <h1>{{ title }}</h1>
  {% for item in items %}
    <p>{{ item.name }}</p>
  {% endfor %}
{% endblock %}
```

Note: Server-side Twig functions (PHP/Python callables) won't work client-side.
The recommendation is to use tagged template literals for new components and
Twig only for legacy/shared templates.

## CLI

```bash
npx tina4 create my-app          # Scaffold new project
npx tina4 dev                    # Dev server with HMR
npx tina4 build                  # Production build
npx tina4 build --target php     # Build for tina4-php embedding
npx tina4 build --target python  # Build for tina4-python embedding
npx tina4 add component MyCard   # Generate component
npx tina4 add route /about       # Generate route
```

## Build Tooling

- **Dev**: Vite (fast HMR, native ESM, small config)
- **Build**: Vite + Rollup (tree-shaking, code splitting)
- **Output**: ESM + IIFE (for legacy/embedded use)
- **Types**: Full TypeScript support with `.d.ts` output

## Comparison

| Feature               | React  | Preact | Vue    | tina4-js |
|-----------------------|--------|--------|--------|----------|
| Size (gzip)           | 42KB   | 3KB    | 33KB   | ~2.1KB   |
| Virtual DOM           | Yes    | Yes    | Yes    | No       |
| Components            | Custom | Custom | Custom | Native Web Components |
| Reactivity            | Hooks  | Hooks  | Proxy  | Signals  |
| Router included       | No     | No     | No     | Yes      |
| HTTP client included  | No     | No     | No     | Yes      |
| PWA support           | No     | No     | No     | Yes (opt-in) |
| Backend integration   | None   | None   | None   | tina4-php/python |
| Template engine       | JSX    | JSX    | SFC    | Tagged literals + Twig |
| Works without build   | No     | No     | No     | Yes (ESM import) |
