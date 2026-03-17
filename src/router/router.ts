/**
 * Tina4 Router — Client-side routing with history and hash modes.
 *
 * route(path, handler)   — register a route
 * navigate(path)         — programmatic navigation
 * router.start(config)   — start the router
 */

import { _setEffectCollector } from '../core/signal';

export type RouteParams = Record<string, string>;
export type RouteHandler = (params: RouteParams) => unknown;
export type RouteGuard = () => boolean | string;

export interface RouteConfig {
  guard?: RouteGuard;
  handler: RouteHandler;
}

interface CompiledRoute {
  pattern: string;
  regex: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  guard?: RouteGuard;
}

interface RouterConfig {
  target: string;
  mode?: 'history' | 'hash';
}

export type ChangeEvent = { path: string; params: RouteParams; pattern: string; durationMs: number };
type ChangeListener = (event: ChangeEvent) => void;

// ── State ───────────────────────────────────────────────────────────

let routes: CompiledRoute[] = [];
let targetEl: Element | null = null;
let mode: 'history' | 'hash' = 'history';
let started = false;
const listeners: ChangeListener[] = [];

/** Disposers for effects created by the current route's template. */
let activeDisposers: (() => void)[] = [];
/** Monotonic counter to detect stale async route handlers. */
let routeVersion = 0;

// ── Public API ──────────────────────────────────────────────────────

/**
 * Register a route. Pattern is ALWAYS the first argument.
 *
 * Patterns support `{param}` segments — extracted and passed to the handler.
 * Use `'*'` to match any path (catch-all / 404 route).
 *
 * @param pattern        - URL pattern, e.g. `'/'`, `'/users/{id}'`, `'*'`
 * @param handlerOrConfig - Handler function or `{ handler, guard }` config.
 *
 * @example
 * route('/', () => html`<h1>Home</h1>`);
 * route('/users/{id}', ({ id }) => html`<p>User: ${id}</p>`);
 * route('*', () => html`<h1>404</h1>`);
 *
 * // With a guard:
 * route('/admin', {
 *   guard: () => isLoggedIn.value || '/login',
 *   handler: () => html`<admin-panel></admin-panel>`,
 * });
 */
export function route(pattern: string, handlerOrConfig: RouteHandler | RouteConfig): void {
  const paramNames: string[] = [];

  // Convert /user/{id} to regex
  let regexStr: string;
  if (pattern === '*') {
    regexStr = '.*';
  } else {
    regexStr = pattern.replace(/\{(\w+)\}/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
  }

  const regex = new RegExp(`^${regexStr}$`);

  if (typeof handlerOrConfig === 'function') {
    routes.push({ pattern, regex, paramNames, handler: handlerOrConfig });
  } else {
    routes.push({
      pattern,
      regex,
      paramNames,
      handler: handlerOrConfig.handler,
      guard: handlerOrConfig.guard,
    });
  }
}

/**
 * Programmatically navigate to a path.
 *
 * @param path - The path to navigate to.
 * @param opts - `{ replace: true }` uses `history.replaceState` instead of `pushState`.
 *
 * @example
 * navigate('/dashboard');
 * navigate('/login', { replace: true }); // no back-button entry
 */
export function navigate(path: string, opts?: { replace?: boolean }): void {
  if (mode === 'hash') {
    if (opts?.replace) {
      const url = new URL(location.href);
      url.hash = '#' + path;
      history.replaceState(null, '', url.toString());
      resolve();
    } else {
      location.hash = '#' + path;
    }
  } else {
    if (opts?.replace) {
      history.replaceState(null, '', path);
    } else {
      history.pushState(null, '', path);
    }
    resolve();
  }
}

function resolve(): void {
  if (!targetEl) return;
  const startTime = performance.now();
  const version = ++routeVersion;

  const path = mode === 'hash'
    ? (location.hash.slice(1) || '/')
    : location.pathname;

  for (const r of routes) {
    const match = path.match(r.regex);
    if (!match) continue;

    // Extract params
    const params: RouteParams = {};
    r.paramNames.forEach((name, i) => {
      params[name] = decodeURIComponent(match[i + 1]);
    });

    // Guard check
    if (r.guard) {
      const guardResult = r.guard();
      if (guardResult === false) return;
      if (typeof guardResult === 'string') {
        navigate(guardResult, { replace: true });
        return;
      }
    }

    // Dispose effects from previous route
    for (const dispose of activeDisposers) dispose();
    activeDisposers = [];

    // Render to target
    targetEl.innerHTML = '';

    // Collect effects created during handler + render
    const disposers: (() => void)[] = [];
    _setEffectCollector(disposers);

    // Execute handler
    const content = r.handler(params);

    if (content instanceof Promise) {
      // Keep collector active for async templates (effects created after await)
      content.then((resolved) => {
        _setEffectCollector(null);
        if (version !== routeVersion) {
          // Navigation happened while this async handler was pending — discard
          for (const d of disposers) d();
          return;
        }
        renderContent(targetEl!, resolved);
        activeDisposers = disposers;
        const durationMs = performance.now() - startTime;
        for (const fn of listeners) fn({ path, params, pattern: r.pattern, durationMs });
      });
    } else {
      _setEffectCollector(null);
      renderContent(targetEl!, content);
      activeDisposers = disposers;
      const durationMs = performance.now() - startTime;
      for (const fn of listeners) fn({ path, params, pattern: r.pattern, durationMs });
    }

    return;
  }
}

function renderContent(target: Element, content: unknown): void {
  if (content instanceof DocumentFragment || content instanceof Node) {
    target.replaceChildren(content);
  } else if (typeof content === 'string') {
    target.innerHTML = content;
  } else if (content != null) {
    target.replaceChildren(document.createTextNode(String(content)));
  }
}

export const router = {
  start(config: RouterConfig): void {
    targetEl = document.querySelector(config.target);
    if (!targetEl) {
      throw new Error(`[tina4] Router target '${config.target}' not found in DOM`);
    }

    mode = config.mode ?? 'history';
    started = true;

    // Listen for browser back/forward
    window.addEventListener('popstate', resolve);

    // Hash mode listener
    if (mode === 'hash') {
      window.addEventListener('hashchange', resolve);
    }

    // Intercept <a> clicks for SPA navigation
    document.addEventListener('click', (e: MouseEvent) => {
      // Ignore modified clicks (ctrl+click, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      if (a.origin !== location.origin) return; // external link
      if (a.hasAttribute('target')) return; // target="_blank" etc.
      if (a.hasAttribute('download')) return;
      if (a.getAttribute('rel')?.includes('external')) return;

      e.preventDefault();
      const path = mode === 'hash' ? a.getAttribute('href')! : a.pathname;
      navigate(path);
    });

    // Initial resolve
    resolve();
  },

  on(event: 'change', fn: ChangeListener): () => void {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
};

/** @internal Read-only access to registered routes (for debug overlay). */
export function _getRoutes(): ReadonlyArray<{ pattern: string; hasGuard: boolean }> {
  return routes.map(r => ({ pattern: r.pattern, hasGuard: !!r.guard }));
}

// ── Test Helper ─────────────────────────────────────────────────────

/** @internal Reset router state (for tests only). */
export function _resetRouter(): void {
  for (const dispose of activeDisposers) dispose();
  activeDisposers = [];
  routeVersion = 0;
  routes = [];
  targetEl = null;
  mode = 'history';
  started = false;
  listeners.length = 0;
}
