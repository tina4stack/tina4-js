# Module 8: Deployment & Integration

## Deployment Modes

### Mode 1: Standalone SPA (Static Hosting)

```
tina4 build
└── dist/
    ├── index.html
    ├── assets/
    │   ├── tina4.abc123.js    (~2-3KB gzip)
    │   └── default.def456.css
    ├── manifest.json           (if PWA enabled)
    └── sw.js                   (if PWA enabled)
```

Deploy `dist/` to: Netlify, Vercel, Cloudflare Pages, GitHub Pages,
S3+CloudFront, any static file server.

For history mode routing, configure the host to serve `index.html` for all paths:
- Netlify: `_redirects` file with `/* /index.html 200`
- Vercel: `vercel.json` with `rewrites`
- Cloudflare Pages: automatic

### Mode 2: Embedded in tina4-php

```
tina4-php-project/
  src/
    routes/
      api.php              # Backend API routes
    templates/
      index.twig           # Generated from index.html
      base.twig            # Layout template
    public/
      js/
        tina4.bundle.js    # Built by: tina4 build --target php
      css/
        default.css
  .env                      # TINA4_APP_DOCUMENT_ROOT=src/public
                            # TINA4_APP_INDEX=../templates/index.twig
```

**How it works:**
1. PHP serves API routes (`/api/*`)
2. PHP serves static files (`/js/*`, `/css/*`, `/images/*`)
3. Unmatched URLs hit `TINA4_APP_DOCUMENT_ROOT` catch-all
4. `index.twig` loads `tina4.bundle.js`
5. tina4-js router handles client-side navigation

**index.twig:**
```twig
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title | default('My App') }}</title>
  <link rel="stylesheet" href="/css/default.css">
</head>
<body>
  <div id="root"></div>
  {# Server can inject initial state for hydration #}
  <script>window.__TINA4_STATE__ = {{ initialState | json_encode | raw }};</script>
  <script type="module" src="/js/tina4.bundle.js"></script>
</body>
</html>
```

### Mode 3: Embedded in tina4-python

```
tina4-python-project/
  src/
    routes/
      api.py               # Backend API routes
      spa.py               # SPA catch-all route
    templates/
      index.twig           # Generated from index.html
      base.twig            # Layout template
    public/
      js/
        tina4.bundle.js    # Built by: tina4 build --target python
      css/
        default.css
```

**spa.py (auto-generated catch-all):**
```python
from tina4_python import get

@get("/{path:path}")
async def spa_catchall(path, request, response):
    """Catch-all for SPA client-side routing"""
    return response(render("index.twig", {"request": request}))
```

### Mode 4: Islands / Progressive Enhancement

No SPA. Server renders full pages. tina4-js hydrates only interactive parts.

```twig
{# Server-rendered page (PHP or Python) #}
{% extends "base.twig" %}
{% block content %}
  <h1>{{ page.title }}</h1>
  <p>{{ page.content }}</p>

  {# Interactive island — only this component uses JS #}
  <comment-form post-id="{{ page.id }}" api-url="/api/comments">
  </comment-form>

  {# Another island #}
  <live-search endpoint="/api/search" placeholder="Search...">
  </live-search>
{% endblock %}

{% block scripts %}
  {# Only load the components you use #}
  <script type="module">
    import 'tina4/components/comment-form.js';
    import 'tina4/components/live-search.js';
  </script>
{% endblock %}
```

**Advantages:**
- Smallest JS payload (only components, no router/full framework)
- SEO-friendly (server renders all content)
- Progressive — add interactivity without rewriting the page
- Works with existing tina4-php/python apps without migration

## Shared Auth Configuration

All modes share the same auth protocol:

```ts
// tina4-js config (works with both PHP and Python backends)
api.configure({
  baseUrl: '/api',
  auth: true,          // auto Bearer + formToken management
  tokenKey: 'tina4_token',
});
```

The `api` module:
1. Stores JWT in localStorage
2. Sends `Authorization: Bearer <token>` on every request
3. Reads `FreshToken` response header and auto-rotates
4. Includes `formToken` in POST/PUT/PATCH/DELETE body
5. Handles 401 -> redirect to login

This matches tina4helper.js behavior exactly, so migration is seamless.

## CORS Configuration

When tina4-js dev server runs on a different port than the backend:

```
tina4-js dev:     http://localhost:5173
tina4-php/python: http://localhost:7145
```

**Option A: Vite proxy (recommended for dev)**
```ts
// vite.config.ts
server: { proxy: { '/api': 'http://localhost:7145' } }
```

**Option B: CORS headers on backend**
Both tina4-php and tina4-python handle CORS via OPTIONS routes automatically.

## CDN / No-Build Usage

For quick prototyping or embedding in existing pages without a build step:

```html
<script type="module">
  import { signal, html, route, router } from 'https://cdn.jsdelivr.net/npm/tina4js/dist/tina4.esm.js';

  const count = signal(0);
  route('/', () => html`
    <button @click=${() => count.value++}>
      Clicked ${count} times
    </button>
  `);
  router.start({ target: '#root', mode: 'hash' });
</script>
<div id="root"></div>
```

Full framework in a single `<script>` tag. No build tools. Under 3KB.
