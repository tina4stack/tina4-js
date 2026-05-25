# tina4-js

Version 1.2.5 — 1.5KB core gzipped, reactive JavaScript framework. Signals, Web Components, routing, API client, WebSocket, SSE/NDJSON streaming, PWA, persistent signal storage, and debug overlay. Zero dependencies.

## Build & Test

```bash
npm install                # Install dev dependencies
npm run build              # Vite build → dist/
npm run build:types        # TypeScript declarations → dist/**/*.d.ts
npm test                   # vitest run (295 tests)
npm run test:watch         # vitest watch mode
npm run test:size          # Bundle size validation
```

Both `build` AND `build:types` must pass before publishing.

## Project Structure

```
src/
  index.ts               # Barrel re-export (all public API)
  core/
    signal.ts            # signal(), computed(), effect(), batch(), isSignal()
    html.ts              # html`` tagged template → DOM renderer
    component.ts         # Tina4Element web component base class
  router/
    router.ts            # Client-side SPA router (history + hash modes)
  api/
    fetch.ts             # HTTP client with auth, headers, interceptors
  pwa/
    pwa.ts               # Service worker registration + manifest generator
  ws/
    ws.ts                # WebSocket client with signals + auto-reconnect
  sse/
    sse.ts               # SSE/NDJSON streaming with signals + auto-reconnect
  storage/
    persist.ts           # persist() wrapper for signals, clearPersistedKeys()
  debug/
    overlay.ts           # Dev overlay panel
    panels/              # Signal, component, route, API debug panels
    trackers.ts          # Performance tracking
    styles.ts            # Overlay CSS

tests/                   # 295 vitest tests (happy-dom environment)
examples/
  todo-app/              # Example todo application
  gallery/               # 9 real-world demos (dashboard, CRUD, chat, auth, cart, etc.)
bin/
  tina4.js               # CLI scaffolding tool
```

## Core API

### Signals — Reactive State

```javascript
import { signal, computed, effect, batch } from "tina4-js";

const count = signal(0);              // Create reactive value
const doubled = computed(() => count.value * 2);  // Derived value

effect(() => console.log(count.value));   // Side effect on change

count.value = 5;                      // Set value → triggers effect
console.log(doubled.value);           // 10

batch(() => {                         // Batch multiple updates
    count.value = 1;
    count.value = 2;
    count.value = 3;                  // Only triggers once
});
```

### html`` — Tagged Template Rendering

```javascript
import { html, signal } from "tina4-js";

const name = signal("World");

const template = html`
    <h1>Hello ${name}!</h1>
    <input @input=${(e) => { name.value = e.target.value; }} .value=${name}>
    <p>${() => name.value.toUpperCase()}</p>
`;

document.body.appendChild(template);
```

#### Binding Syntax

| Syntax | What it does |
|--------|-------------|
| `${value}` | Text node — escaped, XSS-safe |
| `${signal}` | Reactive text node, updates in place |
| `${() => expr}` | Reactive block — re-renders on dependency change |
| `${fragment}` | Inserts a DocumentFragment (nested `html`) |
| `${array}` | Renders each item as nodes |
| `.innerHTML=${val}` | Sets DOM property — use for raw HTML / SVG |
| `.value=${signal}` | Binds any DOM property reactively |
| `?disabled=${signal}` | Boolean attribute — adds/removes |
| `@click=${fn}` | Event listener |

### Tina4Element — Web Components

```javascript
import { Tina4Element, signal, html } from "tina4-js";

class CounterButton extends Tina4Element {
    count = signal(0);

    static props = {
        label: { type: String, default: "Click me" }
    };

    render() {
        return html`
            <button @click=${() => this.count.value++}>
                ${this.prop('label')}: ${this.count}
            </button>
        `;
    }
}

customElements.define("counter-button", CounterButton);
```

Usage: `<counter-button label="Clicks"></counter-button>`

### Router — Client-Side SPA

```javascript
import { route, navigate } from "tina4-js";

route("/", () => html`<h1>Home</h1>`);
route("/users/{id}", ({ id }) => html`<h1>User ${id}</h1>`);
route("/about", () => html`<h1>About</h1>`);

// Navigate programmatically
navigate("/users/42");
```

Supports: history mode, hash mode, guards, wildcards, nested routes.

### API — HTTP Client

```javascript
import { api } from "tina4-js";

// Configure once at startup
api.configure({ baseUrl: "/api", auth: true });

const users = await api.get("/users");
const created = await api.post("/users", { name: "Alice" });
await api.put("/users/1", { name: "Bob" });
await api.delete("/users/1");

// Query params and per-request headers via options
await api.get("/users", { params: { page: 2, limit: 20 } });

// File upload — sends FormData (multipart/form-data), NOT JSON
const form = new FormData();
form.append("avatar", fileInput.files[0]);
await api.upload("/users/avatar", form);
```

Features: auth headers, token rotation, interceptors, formToken injection, error handling. `api.upload()` for multipart file uploads (uses Bearer token, not formToken).

#### GraphQL

```javascript
// Query
const { data, errors } = await api.graphql("/api/graphql",
    "{ products(limit: 10) { id name price } }"
);

// Query with variables
const { data } = await api.graphql("/api/graphql",
    "query ($term: String!) { search_products(term: $term) { id name } }",
    { term: "widget" }
);
```

### WebSocket — Reactive Connection

```javascript
import { ws } from "tina4-js";

const socket = ws.connect("ws://localhost:7145/ws/chat/room1");

// Reactive status signal
effect(() => console.log("Status:", socket.status.value));

// Send messages
socket.send("Hello!");
socket.send({ type: "message", text: "Hello!" }); // Objects auto-JSON.stringify'd

// Receive messages
socket.on("message", (data) => console.log("Received:", data));

// Pipe messages into a signal
const messages = signal([]);
socket.pipe(messages, (msg, current) => [...current, msg]);

// Auto-reconnects on disconnect
```

### SSE — Server-Sent Events / NDJSON Streaming

```javascript
import { sse, signal, effect } from "tina4-js";

// EventSource mode (default) — standard SSE
const stream = sse.connect("/api/events");

// Fetch mode — NDJSON streaming (POST, custom headers, AI tokens)
const stream = sse.connect("/api/chat", {
    mode: "fetch",
    method: "POST",
    headers: { "Authorization": "Bearer token" },
    body: { prompt: "Hello" },
});

// Reactive signals
effect(() => console.log("Status:", stream.status.value));
effect(() => console.log("Message:", stream.lastMessage.value));

// Pipe tokens into a signal
const tokens = signal([]);
stream.pipe(tokens, (msg, current) => [...current, msg]);

// Named events (EventSource mode)
const feed = sse.connect("/api/feed", { events: ["update", "delete"] });
feed.on("message", (data, event) => console.log(event, data));

// Close
stream.close();
```

Features: dual-mode (EventSource + fetch/NDJSON), named events, auto-reconnect with exponential backoff, JSON auto-parsing, pipe to signal. 1.30KB gzipped.

### PWA — Progressive Web App

```javascript
import { pwa } from "tina4-js";

pwa({
    name: "My App",
    shortName: "App",
    themeColor: "#7b1fa2",
    icons: ["/icon-192.png", "/icon-512.png"]
});
```

Auto-generates service worker and manifest.

### Persistent signal storage — `tina4-js/storage`

Wrap a signal so its value survives a page refresh. Backed by localStorage
or sessionStorage. Opt-in per signal. Read `STORAGE.md` for the full dangers
list before using.

```javascript
import { signal } from "tina4js";
import { persist, clearPersistedKeys } from "tina4js/storage";

const theme = persist(signal("light"), { key: "theme" });
theme.value = "dark";   // survives a refresh

// On logout, wipe persisted user state
clearPersistedKeys(["cart", "lastFilter"]);
```

Safety guarantees: SSR-safe (no-op without window/localStorage), logs and
continues on QuotaExceededError, loud console warning on credential-shaped
keys (`token`, `password`, `secret`, `apikey`, `auth`, `credential`, `jwt`,
`bearer`, `otp`, `private_key`) or JWT-shaped values. Cross-tab sync via the
`storage` event is opt-in (`syncTabs: true`). No encryption option — that
would imply safety the framework cannot deliver.

**Never store** auth tokens, passwords, personal data, payment details,
permission flags, or anything authoritative. localStorage is XSS-readable.

## Package Exports

9 entry points for tree-shaking:

| Import | What you get |
|--------|-------------|
| `tina4-js` | Everything |
| `tina4-js/core` | signal, computed, effect, batch, html, Tina4Element |
| `tina4-js/router` | route, navigate, router |
| `tina4-js/api` | api |
| `tina4-js/pwa` | pwa |
| `tina4-js/ws` | ws (WebSocket) |
| `tina4-js/sse` | sse (SSE/NDJSON streaming) |
| `tina4-js/storage` | persist, clearPersistedKeys |
| `tina4-js/debug` | Debug overlay |

## IIFE Bundle

For non-module usage (script tag):

```html
<script src="/js/tina4js.min.js"></script>
<script>
    const { signal, html, route, api, ws, sse } = Tina4;
</script>
```

Build: `npx esbuild src/index.ts --bundle --minify --format=iife --global-name=Tina4 --outfile=dist/tina4js.min.js`

## Key Conventions

- **Signal access: `.value` property** — `count.value` to read, `count.value = 5` to set. NEVER use function-call syntax `count()` or `count(5)` — that does NOT exist
- In `html` templates: pass the signal itself `${count}` for reactive binding, NOT `${count.value}` (which evaluates once and freezes)
- `route(pattern, handler)` — pattern is ALWAYS first arg
- `api.configure(config)` then `api.get(path, options?)` — api is a singleton, NOT a constructor
- `api.get(path, options?)` — options has `{ params, headers }`, NOT path template params
- `ws.connect(url, options?)` — NOT `ws(url)`. Returns a ManagedSocket with reactive signals
- `sse.connect(url, options?)` — NOT `sse(url)`. Returns a ManagedStream with reactive signals. mode: 'eventsource' (default) or 'fetch' for NDJSON
- Signal labels: `signal(value, 'label')` — second arg is optional debug label
- TypeScript target: ES2021 (for WeakRef support)
- Tests use happy-dom, NOT jsdom
- Raw HTML injection: use `.innerHTML=${val}` property binding (never `${htmlString}`)
- Event handlers: `@click=${fn}` not `onclick=${fn}`

## Publishing

```bash
npm version patch          # or minor/major
npm run build && npm run build:types
npm publish
```

## Integration with Tina4 Backends

tina4-js ships bundled with every Tina4 backend framework (Python, PHP, Ruby, Node.js) at `/js/tina4js.min.js`. Install or update via:

```bash
tina4 install tina4-js     # Downloads latest to src/public/js/
```

## Links

- npm: https://www.npmjs.com/package/tina4js
- GitHub: https://github.com/tina4stack/tina4-js
- Website: https://tina4.com/js
- Version: 1.2.5
- Tests: 295 passing

## Tina4-js Frontend Skill
Always read and follow the instructions in .claude/skills/tina4-js/SKILL.md when working with tina4-js frontend code. Read its referenced files in .claude/skills/tina4-js/references/ as needed.

## First Principle: Documentation Matches Code Reality

**This rule overrides everything else in this file.**

Every command, env var, method, class, or feature mentioned in any
documentation file (`*.md` in this repo, or any tina4-book chapter,
or `tina4-documentation/docs/`) MUST exist in code. No exceptions.
No "we'll build it later" entries. No Laravel/Rails-style commands
that look right but don't exist. No env vars that the framework
doesn't actually read.

When you add a doc reference, add the implementation in the same PR.
When you remove a feature, remove every doc reference in the same PR.
When you find drift, fix it both ways: build the real thing OR delete
the doc.

The `tina4-documentation/scripts/audit-truth.py` script is the source
of truth. It runs as a CI gate (`audit-truth.yml`) on every PR — the
build fails on CLI drift. Run it locally before pushing if you've
touched docs:

```bash
cd /path/to/tina4-documentation
python3 scripts/audit-truth.py --strict
```

If you're unsure whether something exists, run `tina4 <command> --help`
or grep the framework source. Don't guess.
