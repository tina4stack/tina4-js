# Module 7: CLI

## Purpose
Project scaffolding, dev server, and build tooling.
Replaces the current `bin/tina4.js` with a more complete CLI.

## Commands

```bash
# Create new project
npx tina4 create my-app
npx tina4 create my-app --template minimal    # just core
npx tina4 create my-app --template pwa         # with PWA support
npx tina4 create my-app --template php         # pre-configured for tina4-php
npx tina4 create my-app --template python      # pre-configured for tina4-python

# Development
npx tina4 dev                   # Dev server with HMR (Vite under the hood)
npx tina4 dev --port 3000       # Custom port

# Build
npx tina4 build                 # Production build -> dist/
npx tina4 build --target php    # Output to src/public/js/ for tina4-php
npx tina4 build --target python # Output to src/public/js/ for tina4-python
npx tina4 build --analyze       # Bundle size analysis

# Generators
npx tina4 add component MyCard  # Generate component file
npx tina4 add route /about      # Generate route file
npx tina4 add page /dashboard   # Generate page component + route
```

## Scaffolded Project Structure

```
my-app/
  src/
    components/          # Web components
      app-root.ts        # Root component
    routes/
      index.ts           # Route definitions
    pages/
      home.ts            # Home page component
    public/
      css/
        default.css      # Base styles
      icons/
        icon-512.png     # PWA icon
    templates/           # Twig templates (optional, for legacy compat)
  index.html             # Entry point
  tina4.config.ts        # Framework config
  package.json
  tsconfig.json
```

## tina4.config.ts

```ts
import { defineConfig } from 'tina4';

export default defineConfig({
  // Router
  router: {
    mode: 'history',     // or 'hash'
    target: '#root',
  },

  // API
  api: {
    baseUrl: '/api',
    auth: true,
  },

  // PWA (optional)
  pwa: {
    name: 'My App',
    themeColor: '#1a1a2e',
    cacheStrategy: 'network-first',
  },

  // Build
  build: {
    target: 'standalone', // or 'php', 'python'
    outDir: 'dist',
  },
});
```

## Scaffolded index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My App</title>
  <link rel="stylesheet" href="/css/default.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.ts"></script>
</body>
</html>
```

## Scaffolded src/main.ts

```ts
import { router, route, api, pwa } from 'tina4';
import config from '../tina4.config';
import './routes/index';

// Apply config
api.configure(config.api);
if (config.pwa) pwa.register(config.pwa);

// Start router
router.start(config.router);
```

## Build Targets

### Standalone (default)
- Output: `dist/index.html`, `dist/assets/tina4.[hash].js`
- Single JS bundle, tree-shaken
- Ready for static hosting

### PHP Target
- Output: `src/public/js/tina4.bundle.js`
- Entry HTML becomes a Twig template at `src/templates/index.twig`
- Adds `TINA4_APP_DOCUMENT_ROOT` to `.env` example

### Python Target
- Output: `src/public/js/tina4.bundle.js`
- Entry HTML becomes a Twig template at `src/templates/index.twig`
- Adds catch-all route example to `src/routes/`

## Dev Server

Uses Vite for:
- Instant HMR (hot module replacement)
- Native ESM (no bundling in dev)
- TypeScript support out of the box
- SCSS compilation
- Proxy config for backend API (tina4-php/python on port 7145)

```ts
// vite.config.ts (auto-generated)
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:7145', // forward API calls to tina4-php/python
    }
  }
};
```

## Size: CLI is NOT shipped to the browser
The CLI is a dev dependency only. The runtime framework is what gets bundled.
