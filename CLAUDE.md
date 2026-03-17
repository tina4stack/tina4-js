# tina4-js

Sub-3KB reactive JavaScript framework with signals, web components, routing, API, PWA, WebSocket, and debug overlay.

## Build & Test

```bash
npm run build          # Vite build → dist/
npm run build:types    # TypeScript declarations → dist/**/*.d.ts
npm run test           # vitest run (all tests)
npm run test:watch     # vitest watch mode
```

Both `build` AND `build:types` must pass before publishing.

## Project Structure

```
src/
  core/signal.ts       # Reactive signals, computed, effect, batch
  core/html.ts         # Tagged template literal → DOM renderer
  core/component.ts    # Tina4Element web component base class
  router/router.ts     # Client-side SPA router (history + hash)
  api/fetch.ts         # HTTP client with auth, headers, interceptors
  pwa/pwa.ts           # Service worker + manifest generator
  ws/ws.ts             # WebSocket with signals + auto-reconnect
  debug/               # Dev overlay (signals, components, routes, API panels)
  index.ts             # Barrel re-export

tests/                 # Vitest tests (happy-dom environment)
examples/todo-app/     # Example application
examples/gallery/      # 9 real-world demos (dashboard, CRUD, chat, auth, cart, etc.)

bin/tina4.js           # CLI scaffolding tool
```

## Key Conventions

- `route(pattern, handler)` — pattern is ALWAYS first arg
- `api.get(path, options?)` — options has `{ params, headers }`, NOT path template params
- Signal labels: `signal(value, 'label')` — second arg is optional debug label
- TypeScript target: ES2021 (for WeakRef support)
- Tests use happy-dom, NOT jsdom

## html`` Template Binding Syntax

| Syntax | What it does |
|---|---|
| `${value}` | Text node — **escaped**, XSS-safe |
| `${signal}` | Reactive text node, updates in place |
| `${() => expr}` | Reactive block — re-renders on dependency change |
| `${fragment}` | Inserts a DocumentFragment (nested `html\`\``) |
| `${array}` | Renders each item as nodes |
| `.innerHTML=${val}` | Sets DOM property — use for raw HTML / SVG injection |
| `.value=${signal}` | Binds any DOM property reactively |
| `?disabled=${signal}` | Boolean attribute — adds/removes the attribute |
| `@click=${fn}` | Event listener |

> **Important:** `${svgString}` renders as escaped text, NOT markup.
> To inject raw HTML or inline SVG, use the property binding: `<div .innerHTML=${svgString}></div>`

## Package Exports

The package has 7 entry points: `.`, `./core`, `./router`, `./api`, `./pwa`, `./ws`, `./debug`

## Publishing

```bash
npm version patch  # or minor/major
npm run build && npm run build:types
npm publish        # requires npm auth token with bypass-2FA scope
```

Token stored in `.npm-token` (gitignored). Set before publish:
```bash
npm config set //registry.npmjs.org/:_authToken=$(cat .npm-token)
```
