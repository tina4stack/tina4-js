/**
 * Tina4 Router — Client-side routing with history and hash modes.
 *
 * route(path, handler)   — register a route
 * navigate(path)         — programmatic navigation
 * router.start(config)   — start the router
 */

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

type ChangeListener = (event: { path: string; params: RouteParams }) => void;

// ── State ───────────────────────────────────────────────────────────

let routes: CompiledRoute[] = [];
let targetEl: Element | null = null;
let mode: 'history' | 'hash' = 'history';
let started = false;
const listeners: ChangeListener[] = [];

// ── Public API ──────────────────────────────────────────────────────

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

    // Execute handler
    const content = r.handler(params);

    // Render to target
    targetEl.innerHTML = '';

    if (content instanceof Promise) {
      content.then((resolved) => {
        renderContent(targetEl!, resolved);
      });
    } else {
      renderContent(targetEl!, content);
    }

    // Notify listeners
    for (const fn of listeners) fn({ path, params });

    return;
  }
}

function renderContent(target: Element, content: unknown): void {
  if (content instanceof DocumentFragment || content instanceof Node) {
    target.appendChild(content);
  } else if (typeof content === 'string') {
    target.innerHTML = content;
  } else if (content != null) {
    target.appendChild(document.createTextNode(String(content)));
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

// ── Test Helper ─────────────────────────────────────────────────────

/** @internal Reset router state (for tests only). */
export function _resetRouter(): void {
  routes = [];
  targetEl = null;
  mode = 'history';
  started = false;
  listeners.length = 0;
}
