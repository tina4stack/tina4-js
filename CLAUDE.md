# tina4-js

Sub-3KB reactive JavaScript framework with signals, web components, routing, API, PWA, and debug overlay.

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
  debug/               # Dev overlay (signals, components, routes, API panels)
  index.ts             # Barrel re-export

tests/                 # Vitest tests (happy-dom environment)
examples/todo-app/     # Example application

bin/tina4.js           # CLI scaffolding tool
```

## Key Conventions

- `route(pattern, handler)` — pattern is ALWAYS first arg
- `api.get(path, options?)` — options has `{ params, headers }`, NOT path template params
- Signal labels: `signal(value, 'label')` — second arg is optional debug label
- TypeScript target: ES2021 (for WeakRef support)
- Tests use happy-dom, NOT jsdom

## Package Exports

The package has 6 entry points: `.`, `./core`, `./router`, `./api`, `./pwa`, `./debug`

## Publishing

```bash
npm version patch  # or minor/major
npm run build && npm run build:types
npm publish
```
