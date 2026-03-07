# Module 4: Router

## Purpose
Client-side routing that mirrors tina4-php/python route conventions.
Supports both history API and hash mode for flexible deployment.

## API

```ts
import { router, route, navigate } from 'tina4';

// Define routes (same pattern as tina4-php/python)
route('/', () => html`<h1>Home</h1>`);
route('/about', () => html`<h1>About</h1>`);
route('/user/{id}', ({ id }) => html`<h1>User ${id}</h1>`);
route('/user/{id}/post/{postId}', ({ id, postId }) => html`...`);

// Route with guard
route('/admin', {
  guard: () => isLoggedIn() || '/login',  // redirect if falsy
  handler: () => html`<h1>Admin</h1>`,
});

// Lazy-loaded route
route('/settings', () => import('./pages/settings.js'));

// Layout routes (nested)
route('/dashboard', {
  layout: () => html`<nav>...</nav><div id="outlet"></div>`,
  children: [
    route('/', () => html`<h1>Dashboard Home</h1>`),
    route('/stats', () => html`<h1>Stats</h1>`),
  ],
});

// 404 fallback
route('*', () => html`<h1>Not Found</h1>`);

// Start the router
router.start({
  target: '#root',          // DOM element to render into
  mode: 'history',          // 'history' or 'hash'
});

// Programmatic navigation
navigate('/user/42');
navigate('/login', { replace: true }); // no history entry

// Listen to route changes
router.on('change', ({ path, params }) => { ... });
```

## HTML Navigation

```html
<!-- Standard links work — router intercepts clicks on same-origin <a> -->
<a href="/about">About</a>

<!-- Explicit navigate -->
<button @click=${() => navigate('/home')}>Home</button>
```

The router intercepts clicks on `<a>` elements with same-origin `href` and
calls `navigate()` instead of full page reload. External links work normally.

## Implementation

```ts
type RouteHandler = (params: Record<string, string>) => any;
type RouteGuard = () => boolean | string; // string = redirect path

interface RouteConfig {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  guard?: RouteGuard;
}

const routes: RouteConfig[] = [];
let targetEl: Element;
let mode: 'history' | 'hash' = 'history';

export function route(pattern: string, handlerOrConfig: RouteHandler | object) {
  const paramNames: string[] = [];
  const regexStr = pattern.replace(/\{(\w+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  const regex = new RegExp(`^${regexStr}$`);

  const config = typeof handlerOrConfig === 'function'
    ? { handler: handlerOrConfig }
    : handlerOrConfig;

  routes.push({ pattern, regex, paramNames, ...config } as RouteConfig);
}

export function navigate(path: string, opts?: { replace?: boolean }) {
  if (mode === 'hash') {
    location.hash = '#' + path;
  } else {
    opts?.replace
      ? history.replaceState(null, '', path)
      : history.pushState(null, '', path);
    resolve();
  }
}

function resolve() {
  const path = mode === 'hash'
    ? location.hash.slice(1) || '/'
    : location.pathname;

  for (const route of routes) {
    const match = path.match(route.regex);
    if (!match) continue;

    // Extract params
    const params: Record<string, string> = {};
    route.paramNames.forEach((name, i) => { params[name] = match[i + 1]; });

    // Guard check
    if (route.guard) {
      const result = route.guard();
      if (result === false) return;
      if (typeof result === 'string') return navigate(result, { replace: true });
    }

    // Render
    const content = route.handler(params);
    targetEl.innerHTML = '';

    if (content instanceof Promise) {
      // Lazy loaded module
      content.then(mod => {
        const result = mod.default ? mod.default(params) : mod;
        targetEl.appendChild(result instanceof Node ? result : document.createTextNode(String(result)));
      });
    } else if (content instanceof Node) {
      targetEl.appendChild(content);
    } else {
      targetEl.innerHTML = String(content);
    }
    return;
  }
}

export const router = {
  start(config: { target: string; mode?: 'history' | 'hash' }) {
    targetEl = document.querySelector(config.target)!;
    mode = config.mode ?? 'history';

    // Listen for browser back/forward
    window.addEventListener('popstate', resolve);

    // Hash mode
    if (mode === 'hash') window.addEventListener('hashchange', resolve);

    // Intercept <a> clicks
    document.addEventListener('click', (e) => {
      const a = (e.target as Element).closest('a[href]') as HTMLAnchorElement;
      if (!a || a.origin !== location.origin) return;
      if (a.hasAttribute('target')) return;
      e.preventDefault();
      navigate(a.pathname);
    });

    // Initial resolve
    resolve();
  }
};
```

## Route Modes

### History Mode (default)
- Clean URLs: `/user/42`
- Requires server catch-all (tina4-php: `TINA4_APP_DOCUMENT_ROOT`, tina4-python: catch-all route)
- Best for production apps

### Hash Mode
- URLs: `/#/user/42`
- No server config needed
- Works with static file hosting
- Good for embedding in tina4-php/python pages without server changes

## Integration with tina4-php/python

The route patterns use the same `{param}` syntax as the backend frameworks:

| Framework    | Pattern             |
|-------------|---------------------|
| tina4-php   | `/user/{id}`        |
| tina4-python| `/user/{id}`        |
| tina4-js    | `/user/{id}`        |

This means the same URL structure works across all three — backend routes handle
API endpoints, frontend routes handle page rendering.

### Server-Side Route Priority

When embedded in tina4-php/python:
1. Backend API routes (e.g., `/api/users`) are handled by PHP/Python
2. Static files (e.g., `/css/default.css`) served from `src/public/`
3. Everything else falls through to the SPA catch-all -> tina4-js router takes over

## Size Estimate
- Raw: ~900B
- Minified: ~500B
- Gzipped: ~400-450B
