# Tina4-JS Demo Video Script

**Duration:** ~12-15 minutes
**Tone:** Developer-to-developer, practical, no hype — just show the code working
**Format:** Screen recording with voiceover, IDE + browser side by side

---

## INTRO (0:00 - 1:00)

### Screen: Terminal, dark theme

**Voiceover:**

> Every few months there's a new JavaScript framework promising to change everything. Tina4-JS isn't that.
>
> It's a sub-5KB reactive framework built for developers who are tired of 200MB node_modules folders, fifteen config files, and build tools that take longer to set up than the app itself.
>
> Signals. Web components. Routing. API. WebSockets. PWA. Debug tools. All under 5 kilobytes gzipped. Zero dependencies.
>
> Let me show you how it works — from zero to a working real-time app in about 12 minutes.

### Screen: Show the size table

```
Module                              Gzipped
Core (signals + html + component)   ~1.5 KB
Router                              ~0.12 KB
API                                 ~0.97 KB
WebSocket                           ~0.91 KB
PWA                                 ~1.16 KB
Debug overlay                       ~5.1 KB (dev only)
```

> That's the entire framework. The debug overlay is dev-only — it tree-shakes out of your production build completely.

---

## SCENE 1: Project Scaffolding (1:00 - 2:30)

### Screen: Terminal

```bash
npx tina4 create my-app
cd my-app
npm install
npm run dev
```

**Voiceover:**

> One command. No prompts, no wizard, no "which CSS framework do you want" — just a clean project.
>
> You get a src folder with components, pages, routes, and public assets. A vite config. TypeScript out of the box. And a TINA4.md file — that's an AI context file so Claude, Cursor, or Copilot already knows how your framework works when you start coding.

### Screen: Show the generated file tree

```
my-app/
  src/
    components/app-header.ts
    pages/home.ts
    routes/index.ts
    public/css/default.css
    main.ts
  index.html
  package.json
  vite.config.ts
  TINA4.md
```

> Let's open the browser.

### Screen: Browser showing the running app — counter page with +/- buttons

> A reactive counter. Working routing. Scoped web component. All in about 30 lines of code. Let's break down what's happening.

---

## SCENE 2: Signals — The Reactive Core (2:30 - 4:30)

### Screen: Editor — `src/pages/home.ts`

```ts
import { signal, computed, html } from 'tina4js';

export function homePage() {
  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  return html`
    <div class="page">
      <h1>Counter</h1>
      <button @click=${() => count.value--}>-</button>
      <span>${count}</span>
      <button @click=${() => count.value++}>+</button>
      <p>Doubled: ${doubled}</p>
    </div>
  `;
}
```

**Voiceover:**

> This is the entire mental model. `signal(0)` creates reactive state. Read it with `.value`. Write to it with `.value =`. That's it.
>
> `computed` derives a value — it automatically tracks which signals it reads and updates when they change. No dependency arrays. No `useEffect`. No stale closure bugs.
>
> The `html` tagged template returns real DOM nodes — not a virtual DOM, not JSX, not strings. When you put a signal inside the template, tina4 creates a text node and subscribes to that signal. When the value changes, it updates that one text node. No diffing. No reconciliation. Surgical DOM updates.

### Screen: Browser — click the buttons, watch the count and doubled update

> Watch the count. Watch doubled. They update independently — only the exact text nodes that need to change are touched.

### Screen: Editor — show additional signal features

```ts
// Read without subscribing (no tracking)
count.peek();

// Batch multiple updates — one DOM update
batch(() => {
  a.value = 1;
  b.value = 2;
  c.value = 3;
});

// Side effects
effect(() => {
  console.log('Count changed:', count.value);
});

// Debug labels (visible in debug overlay)
const count = signal(0, 'counter');
```

**Voiceover:**

> `peek()` reads a signal without subscribing — useful in event handlers where you don't want to create a dependency.
>
> `batch()` groups multiple signal writes into a single notification. Three signals change, but subscribers only fire once.
>
> `effect()` runs a function whenever its tracked signals change. And it auto-cleans — when the effect is disposed, all subscriptions are removed. No memory leaks.
>
> One more thing: if an effect throws an error, it doesn't block sibling effects from running. Error isolation is built in.

---

## SCENE 3: HTML Templates — No Virtual DOM (4:30 - 6:00)

### Screen: Editor — template examples

```ts
// Event binding with @
html`<button @click=${() => count.value++}>Click</button>`;

// Boolean attributes with ?
html`<button ?disabled=${() => loading.value}>Submit</button>`;

// Property binding with .
html`<input .value=${name}>`;

// Conditional rendering — just a function
html`${() => loggedIn.value ? html`<p>Welcome</p>` : html`<a href="/login">Log in</a>`}`;

// List rendering — just map
html`<ul>${() => items.value.map(item =>
  html`<li>${item.name}</li>`
)}</ul>`;
```

**Voiceover:**

> Templates are tagged template literals. No build step needed — this is standard JavaScript.
>
> Events use the `@` prefix. `@click`, `@input`, `@submit` — any DOM event.
>
> Boolean attributes use `?`. Pass a signal or a function — the attribute toggles reactively.
>
> Conditionals? It's just a function that returns either HTML or null. Lists? Just `.map()`. No special syntax. No `v-for`. No `{#each}`. It's JavaScript — you already know how to do this.
>
> And because these are real DOM operations, not virtual DOM diffs, there's no reconciliation overhead. A list of 1000 items doesn't re-diff 1000 nodes when one item changes.

---

## SCENE 4: Web Components (6:00 - 7:30)

### Screen: Editor — `src/components/app-header.ts`

```ts
import { Tina4Element, html, signal } from 'tina4js';

class AppHeader extends Tina4Element {
  static props = { title: String, count: Number, active: Boolean };
  static styles = `
    :host { display: block; padding: 1rem; border-bottom: 1px solid #e5e7eb; }
    h1 { margin: 0; font-size: 1.5rem; }
    nav { display: flex; gap: 1rem; margin-top: 0.5rem; }
  `;

  expanded = signal(false);

  render() {
    return html`
      <h1>${this.prop('title')}</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
      <button @click=${() => this.expanded.value = !this.expanded.value}>
        ${() => this.expanded.value ? 'Collapse' : 'Expand'}
      </button>
      ${() => this.expanded.value ? html`<slot></slot>` : null}
    `;
  }

  onMount() { console.log('Header mounted'); }
  onUnmount() { console.log('Header removed'); }
}

customElements.define('app-header', AppHeader);
```

**Voiceover:**

> Components extend `Tina4Element`, which is just a thin layer over `HTMLElement`. These are real web components — they work in any HTML page, any framework, or no framework at all.
>
> `static props` declares typed attributes. String, Number, Boolean — they're automatically coerced from HTML attributes into reactive signals. Access them with `this.prop('name')`.
>
> `static styles` is scoped CSS inside Shadow DOM. It doesn't leak. It doesn't clash. No CSS modules, no styled-components, no utility classes needed.
>
> Internal state is just signals on the class. `this.expanded` is a signal — use it in the template, it's reactive.
>
> `onMount` and `onUnmount` are lifecycle hooks. And `this.emit('event-name')` dispatches custom events that cross the Shadow DOM boundary.

### Screen: Browser — use the component in HTML

```html
<app-header title="My App" count="5" active></app-header>
```

> Use it like any HTML element. Pass attributes. They become reactive props.
>
> Want light DOM instead of Shadow DOM? One line: `static shadow = false`.

---

## SCENE 5: Router (7:30 - 9:00)

### Screen: Editor — `src/routes/index.ts`

```ts
import { route, router, navigate, html, signal } from 'tina4js';

// Simple route
route('/', () => html`<h1>Home</h1>`);

// Route with parameters
route('/user/{id}', ({ id }) => html`
  <h1>User Profile</h1>
  <p>User ID: ${id}</p>
`);

// Route with a guard — protect pages
route('/admin', {
  guard: () => {
    if (!isLoggedIn()) return '/login';  // redirect
    return true;                          // allow
  },
  handler: () => html`<h1>Admin Panel</h1>`
});

// Catch-all 404
route('*', () => html`<h1>Page Not Found</h1>`);

// Start the router AFTER registering routes
router.start({ target: '#root', mode: 'hash' });
```

**Voiceover:**

> Routing is one function: `route(pattern, handler)`. The pattern uses `{param}` syntax — no colons, no regex. The handler receives the params and returns HTML.
>
> Guards block or redirect before the route renders. Return `true` to allow, `false` to block, or a string to redirect. Chain guards for role-based access.
>
> Hash mode or history mode — your choice. One config option.
>
> `navigate('/path')` for programmatic navigation. `navigate('/path', { replace: true })` to replace the history entry instead of pushing.
>
> Links just work. Click an `<a href="/about">` and the router intercepts it — no special `<Link>` component needed. External links, modified clicks (Ctrl+click), and `target="_blank"` are all handled correctly.

### Screen: Browser — click through routes, show URL changing

> Watch the URL. Click Home, About, a user profile. Back button works. Forward button works. It's just the History API — nothing magical.

### Screen: Editor — route change listener

```ts
router.on('change', (event) => {
  console.log(`Navigated to ${event.path} in ${event.durationMs}ms`);
  // event: { path, params, pattern, durationMs }
});
```

> You can listen for route changes — great for analytics or transition animations.

---

## SCENE 6: API Layer (9:00 - 10:30)

### Screen: Editor — API usage

```ts
import { api } from 'tina4js';

// Configure once at startup
api.configure({
  baseUrl: '/api',
  auth: true,
  tokenKey: 'tina4_token',
  headers: { 'X-App-Version': '1.0' }
});

// GET with query params
const users = await api.get('/users', {
  params: { page: 1, limit: 20 }
});
// => GET /api/users?page=1&limit=20

// POST with body
await api.post('/users', { name: 'Andre', role: 'admin' });

// Per-request custom headers
const report = await api.get('/reports/monthly', {
  headers: { 'Accept': 'text/csv' }
});

// Error handling
try {
  await api.get('/protected');
} catch (err) {
  // err.status === 401
  // err.data, err.ok, err.headers
  navigate('/login');
}
```

**Voiceover:**

> The API module is a fetch wrapper with opinions — the right opinions.
>
> `configure` sets the base URL, default headers, and auth mode. When `auth` is true, every request gets a Bearer token from localStorage. Write operations automatically include a `formToken` in the body — that's CSRF protection built in, compatible with tina4-php and tina4-python backends.
>
> Query params are built from an object. Custom headers per request. The response is parsed automatically — JSON or text based on Content-Type.
>
> When the server responds with a `FreshToken` header, the token is rotated automatically. No refresh token logic needed.

### Screen: Editor — interceptors

```ts
// Log every request
api.intercept('request', (config) => {
  console.log(`${config.method} ${config._url}`);
  return config;
});

// Global error handling — redirect on 401
api.intercept('response', (res) => {
  if (res.status === 401) {
    navigate('/login');
  }
  return res;
});
```

> Interceptors let you modify every request or response. Add logging, error handling, token refresh — whatever you need.

---

## SCENE 7: WebSockets — Real-Time with Signals (10:30 - 12:00)

### Screen: Editor — WebSocket chat example

```ts
import { ws } from 'tina4js/ws';
import { signal, html, route } from 'tina4js';

// Connect with auto-reconnect
const socket = ws.connect('wss://chat.example.com/live', {
  reconnect: true,
  reconnectDelay: 1000,
  reconnectMaxDelay: 30000,
});

// All state is reactive signals
// socket.status.value    => 'connecting' | 'open' | 'closed' | 'reconnecting'
// socket.connected.value => boolean
// socket.error.value     => Event | null

// Pipe messages directly into a signal
const messages = signal([]);
socket.pipe(messages, (msg, current) => [...current, msg]);

// Build UI that auto-updates when messages arrive
const input = signal('');

route('/chat', () => html`
  <div class="chat">
    <div class="status">
      ${() => socket.connected.value ? 'Connected' : 'Reconnecting...'}
    </div>

    <ul class="messages">
      ${() => messages.value.map(m => html`
        <li><b>${m.user}</b>: ${m.text}</li>
      `)}
    </ul>

    <form @submit=${(e) => {
      e.preventDefault();
      socket.send({ user: 'Andre', text: input.value });
      input.value = '';
    }}>
      <input .value=${input}
             @input=${(e) => input.value = e.target.value}
             placeholder="Type a message..." />
      <button ?disabled=${() => !socket.connected.value}>Send</button>
    </form>
  </div>
`);
```

**Voiceover:**

> WebSockets are first-class in tina4. `ws.connect` returns a managed socket where everything is a signal.
>
> `socket.status` is a reactive signal — `'connecting'`, `'open'`, `'closed'`, `'reconnecting'`. Bind it directly in your template. The UI updates automatically when the connection state changes.
>
> `socket.pipe` is the killer feature. It takes a signal and a reducer — every incoming message runs through the reducer and updates the signal. The template is subscribed to that signal. So when a WebSocket message arrives, the DOM updates. No event listeners. No `setState`. No manual DOM manipulation.
>
> Auto-reconnect is built in with exponential backoff. If the connection drops, it reconnects automatically — 1 second, 2 seconds, 4 seconds, capped at 30 seconds. The user sees "Reconnecting..." and then it's back. You can configure the delay, the cap, and the max number of attempts.
>
> `socket.send` auto-stringifies objects. Messages are auto-parsed from JSON. The send button disables itself reactively when the socket isn't connected.
>
> This entire real-time chat — connection management, reconnection, message rendering, input handling — is about 30 lines.

---

## SCENE 8: Debug Overlay (12:00 - 13:00)

### Screen: Editor — add one line to main.ts

```ts
// Dev-only — stripped from production builds
if (import.meta.env.DEV) {
  import('tina4js/debug');
}
```

### Screen: Browser — press Ctrl+Shift+D, overlay appears

**Voiceover:**

> One import. Press Ctrl+Shift+D.
>
> The debug overlay shows you everything happening inside your app in real time.

### Screen: Click through the four tabs

> **Signals tab** — every signal in your app, its current value, how many subscribers it has, and how many times it's been updated. Add a label with `signal(0, 'count')` and it shows up by name.
>
> **Components tab** — every mounted tina4 web component, its tag name, and its prop values.
>
> **Routes tab** — your registered routes, navigation history with timestamps, and how long each route took to render. Spot slow routes instantly.
>
> **API tab** — every request and response. Method, URL, status code, duration. Click to expand and see headers and body.
>
> This overlay uses tina4's own signals and html renderer internally. It's built with the framework it's debugging. And because it's behind an `import.meta.env.DEV` guard, Vite strips it completely from production builds. Zero bytes. Zero cost.

---

## SCENE 9: PWA & Backend Integration (13:00 - 14:00)

### Screen: Editor — PWA setup

```ts
import { pwa } from 'tina4js';

pwa.register({
  name: 'My App',
  shortName: 'MyApp',
  themeColor: '#1a1a2e',
  cacheStrategy: 'network-first',  // or 'cache-first', 'stale-while-revalidate'
  precache: ['/', '/css/app.css'],
  offlineRoute: '/offline',
});
```

**Voiceover:**

> PWA support in five lines. Service worker, manifest, theme color, caching strategy — all generated at runtime. No separate sw.js file to maintain. Choose network-first, cache-first, or stale-while-revalidate. Define what to precache. Set an offline fallback route. Done.

### Screen: Terminal — backend build

```bash
# Build for tina4-php
npx tina4 build --target php

# Build for tina4-python
npx tina4 build --target python
```

> Building for a backend? One flag. It outputs to `src/public/js/`, generates a Twig template, and for Python it even creates the catch-all route. Drop it into your tina4-php or tina4-python project and it works.

---

## SCENE 10: Closing (14:00 - 15:00)

### Screen: Split — IDE on left, browser on right, terminal at bottom

**Voiceover:**

> Let's recap what we built and what it cost:
>
> Reactive state with signals and computed values. Tagged template rendering with surgical DOM updates. Web components with scoped styles and reactive props. Client-side routing with guards and params. An API layer with auth, interceptors, and token rotation. Real-time WebSockets with auto-reconnect piped directly into signals. PWA support. A full debug overlay.
>
> Total bundle: under 5 kilobytes gzipped. Zero dependencies. Full TypeScript support. Tree-shakeable — only pay for what you import.
>
> 231 tests passing. Error isolation in effects. Exponential backoff in WebSockets. CSRF protection in API calls. Shadow DOM encapsulation in components.
>
> It's not trying to replace React or Vue for massive enterprise apps. It's for developers who want to build fast, ship small, and not fight their tools.

### Screen: Terminal

```bash
npm install tina4js
npx tina4 create my-app
```

> `npm install tina4js`. That's the whole framework.
>
> Documentation, source code, and examples are on GitHub.
>
> I'm Andre van Zuydam. This is tina4-js. Go build something.

---

## B-ROLL / OVERLAY SUGGESTIONS

Throughout the video, consider these visual callouts:

1. **Size comparison overlay** (Intro): Bar chart showing tina4js (~5KB) vs React+ReactDOM (~44KB) vs Vue (~33KB) vs Svelte (~18KB) — gzipped production sizes
2. **Signal flow diagram** (Scene 2): Animated arrow from `signal.value = X` -> subscriber notification -> DOM text node update
3. **No Virtual DOM badge** (Scene 3): Quick graphic showing "Real DOM" vs "Virtual DOM diffing"
4. **File tree highlight** (Scene 1): Highlight each generated file as you mention it
5. **Terminal output** (Scene 9): Show the actual build output with checkmarks
6. **Test count badge** (Scene 10): "231 tests passing" overlay
7. **Module size pills** (Throughout): Small floating badges showing each module's size as you introduce it

## RECORDING TIPS

- Use a dark IDE theme (the debug overlay is dark-themed and looks best against dark backgrounds)
- Browser zoom at 125-150% so code in the browser is readable
- Terminal font size 16pt+
- Pre-prepare all code files so you're not typing live — cut between "before" and "after" states
- Keep the browser DevTools Network tab visible briefly when showing API calls
- For the WebSocket demo, you could use a simple echo WebSocket server (`ws://echo.websocket.org` or a local one) to show real messages flowing

## SHORT VERSION (3-5 minutes)

If you need a shorter cut, keep Scenes 1, 2, 5, 7, and 10. That covers: scaffolding, signals, routing, WebSockets, and the closing — which hits the unique selling points without exhaustive API coverage.
