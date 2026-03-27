# tina4-js

Version 1.0.12 — Sub-3KB reactive JavaScript framework. Signals, Web Components, routing, API client, WebSocket, PWA, and debug overlay. Zero dependencies.

## Build & Test

```bash
npm install                # Install dev dependencies
npm run build              # Vite build → dist/
npm run build:types        # TypeScript declarations → dist/**/*.d.ts
npm test                   # vitest run (238 tests)
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
  debug/
    overlay.ts           # Dev overlay panel
    panels/              # Signal, component, route, API debug panels
    trackers.ts          # Performance tracking
    styles.ts            # Overlay CSS

tests/                   # 238 vitest tests (happy-dom environment)
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
const doubled = computed(() => count() * 2);  // Derived value

effect(() => console.log(count()));   // Side effect on change

count(5);                             // Set value → triggers effect
console.log(doubled());              // 10

batch(() => {                         // Batch multiple updates
    count(1);
    count(2);
    count(3);                         // Only triggers once
});
```

### html`` — Tagged Template Rendering

```javascript
import { html, signal } from "tina4-js";

const name = signal("World");

const template = html`
    <h1>Hello ${name}!</h1>
    <input @input=${(e) => name(e.target.value)} .value=${name}>
    <p>${() => name().toUpperCase()}</p>
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
            <button @click=${() => this.count(this.count() + 1)}>
                ${this.label}: ${this.count}
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

const client = api({ baseUrl: "/api", bearer: "token123" });

const users = await client.get("/users");
const created = await client.post("/users", { name: "Alice" });
await client.put("/users/1", { name: "Bob" });
await client.delete("/users/1");
```

Features: auth headers, interceptors, error handling, abort signals.

### WebSocket — Reactive Connection

```javascript
import { ws } from "tina4-js";

const socket = ws("ws://localhost:7145/ws/chat/room1");

// Reactive status signal
effect(() => console.log("Status:", socket.status()));

// Send messages
socket.send("Hello!");
socket.sendJson({ type: "message", text: "Hello!" });

// Receive messages
socket.onMessage((data) => console.log("Received:", data));

// Auto-reconnects on disconnect
```

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

## Package Exports

7 entry points for tree-shaking:

| Import | What you get |
|--------|-------------|
| `tina4-js` | Everything |
| `tina4-js/core` | signal, computed, effect, batch, html, Tina4Element |
| `tina4-js/router` | route, navigate, router |
| `tina4-js/api` | api |
| `tina4-js/pwa` | pwa |
| `tina4-js/ws` | ws |
| `tina4-js/debug` | Debug overlay |

## IIFE Bundle

For non-module usage (script tag):

```html
<script src="/js/tina4js.min.js"></script>
<script>
    const { signal, html, route, api, ws } = Tina4;
</script>
```

Build: `npx esbuild src/index.ts --bundle --minify --format=iife --global-name=Tina4 --outfile=dist/tina4js.min.js`

## Key Conventions

- `route(pattern, handler)` — pattern is ALWAYS first arg
- `api.get(path, options?)` — options has `{ params, headers }`, NOT path template params
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
- Tests: 238 passing

## Tina4-js Frontend Skill
Always read and follow the instructions in .claude/skills/tina4-js/SKILL.md when working with tina4-js frontend code. Read its referenced files in .claude/skills/tina4-js/references/ as needed.
