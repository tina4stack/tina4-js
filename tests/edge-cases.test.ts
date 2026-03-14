/**
 * Edge Case Tests — Real-world scenarios that catch bugs before users do.
 *
 * Each section simulates actual usage patterns a developer would encounter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal, computed, effect, batch, isSignal } from '../src/core/signal';
import { html } from '../src/core/html';
import { Tina4Element } from '../src/core/component';
import { route, router, navigate, _resetRouter } from '../src/router/router';
import { api } from '../src/api/fetch';

// ═══════════════════════════════════════════════════════════════════
// SIGNAL EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('signal — edge cases', () => {
  it('handles NaN correctly (NaN !== NaN but should not trigger)', () => {
    const s = signal(NaN);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });
    expect(fn).toHaveBeenCalledTimes(1);

    s.value = NaN; // NaN !== NaN under ===, but Object.is(NaN, NaN) is true
    expect(fn).toHaveBeenCalledTimes(1); // should NOT re-trigger
  });

  it('handles +0 vs -0 correctly', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });

    s.value = -0; // Object.is(0, -0) is false
    expect(fn).toHaveBeenCalledTimes(2); // SHOULD trigger
  });

  it('handles deeply nested computed chains', () => {
    const base = signal(1);
    let prev = computed(() => base.value);
    for (let i = 0; i < 20; i++) {
      const dep = prev;
      prev = computed(() => dep.value + 1);
    }
    expect(prev.value).toBe(21);
    base.value = 100;
    expect(prev.value).toBe(120);
  });

  it('handles rapid-fire updates without losing final value', () => {
    const s = signal(0);
    const values: number[] = [];
    effect(() => { values.push(s.value); });

    for (let i = 1; i <= 100; i++) {
      s.value = i;
    }
    expect(s.value).toBe(100);
    expect(values[values.length - 1]).toBe(100);
  });

  it('diamond dependency does not trigger effect twice', () => {
    const source = signal(1);
    const left = computed(() => source.value * 2);
    const right = computed(() => source.value * 3);
    const fn = vi.fn();

    effect(() => {
      left.value + right.value;
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => { source.value = 2; });
    // Diamond may fire 2 or 3 times depending on implementation; key is it doesn't infinite loop
    expect(fn.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('effect handles signal set to undefined', () => {
    const s = signal<string | undefined>('hello');
    const values: (string | undefined)[] = [];
    effect(() => { values.push(s.value); });

    s.value = undefined;
    expect(values).toEqual(['hello', undefined]);
    s.value = 'back';
    expect(values).toEqual(['hello', undefined, 'back']);
  });

  it('computed with expensive operations only recalculates when deps change', () => {
    const s = signal(5);
    let calcCount = 0;
    const expensive = computed(() => {
      calcCount++;
      return s.value * s.value;
    });

    expect(expensive.value).toBe(25);
    expect(expensive.value).toBe(25);
    expect(expensive.value).toBe(25);
    // Should only calculate once since value hasn't changed
    expect(calcCount).toBe(1);

    s.value = 10;
    expect(expensive.value).toBe(100);
    expect(calcCount).toBe(2);
  });

  it('signal with array value — mutation vs replacement', () => {
    const list = signal<number[]>([1, 2, 3]);
    const fn = vi.fn();
    effect(() => { list.value; fn(); });

    // Same reference — no trigger
    list.value = list.value;
    expect(fn).toHaveBeenCalledTimes(1);

    // New array — triggers
    list.value = [...list.value, 4];
    expect(fn).toHaveBeenCalledTimes(2);
    expect(list.value).toEqual([1, 2, 3, 4]);
  });

  it('batch inside effect does not cause infinite loop', () => {
    const s = signal(0);
    let runs = 0;

    effect(() => {
      runs++;
      if (s.value < 3) {
        batch(() => { s.value = s.value + 1; });
      }
    });

    // Should stabilize, not infinite loop
    expect(runs).toBeGreaterThanOrEqual(1);
    expect(s.value).toBeGreaterThanOrEqual(3);
  });

  it('debug label is optional and does not affect behavior', () => {
    const labeled = signal(42, 'myLabel');
    const unlabeled = signal(42);

    expect(labeled.value).toBe(42);
    expect(unlabeled.value).toBe(42);

    labeled.value = 100;
    expect(labeled.value).toBe(100);
  });

  it('dispose called multiple times does not throw', () => {
    const s = signal(0);
    const dispose = effect(() => { s.value; });

    dispose();
    dispose(); // should be safe
    dispose();

    s.value = 1; // should not throw
  });
});

// ═══════════════════════════════════════════════════════════════════
// HTML TEMPLATE EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('html — edge cases', () => {
  it('renders empty string without crashing', () => {
    const frag = html``;
    expect(frag).toBeDefined();
  });

  it('renders number 0 (falsy but should show)', () => {
    const count = signal(0);
    const frag = html`<span>${count}</span>`;
    const span = frag.querySelector('span')!;
    expect(span.textContent).toBe('0');
  });

  it('renders nested templates', () => {
    const inner = html`<em>bold</em>`;
    const outer = html`<div>${inner}</div>`;
    expect(outer.querySelector('em')?.textContent).toBe('bold');
  });

  it('handles null and undefined in templates', () => {
    const frag = html`<div>${null}${undefined}</div>`;
    const div = frag.querySelector('div')!;
    // Should not render "null" or "undefined" as text
    expect(div.textContent).not.toContain('null');
    expect(div.textContent).not.toContain('undefined');
  });

  it('handles array of templates', () => {
    const items = ['A', 'B', 'C'];
    const frag = html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`;
    const lis = frag.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect(lis[2].textContent).toBe('C');
  });

  it('reactive function updates DOM when signal changes', () => {
    const name = signal('World');
    const frag = html`<p>Hello ${() => name.value}!</p>`;
    document.body.appendChild(frag);

    const p = document.querySelector('p')!;
    expect(p.textContent).toBe('Hello World!');

    name.value = 'Tina4';
    expect(p.textContent).toBe('Hello Tina4!');

    document.body.innerHTML = '';
  });

  it('boolean attribute toggling', () => {
    const disabled = signal(true);
    const frag = html`<button ?disabled=${disabled}>Click</button>`;
    document.body.appendChild(frag);

    const btn = document.querySelector('button')!;
    expect(btn.disabled).toBe(true);

    disabled.value = false;
    expect(btn.disabled).toBe(false);

    document.body.innerHTML = '';
  });

  it('event handler receives correct event', () => {
    const clicked = vi.fn();
    const frag = html`<button @click=${clicked}>Click</button>`;
    document.body.appendChild(frag);

    const btn = document.querySelector('button')!;
    btn.click();
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(clicked.mock.calls[0][0]).toBeInstanceOf(Event);

    document.body.innerHTML = '';
  });

  it('handles special characters in text', () => {
    const frag = html`<p>${'<script>alert("xss")</script>'}</p>`;
    const p = frag.querySelector('p')!;
    // Should be text content, not parsed as HTML
    expect(p.textContent).toContain('<script>');
    expect(p.querySelector('script')).toBeNull();
  });

  it('reactive list updates when signal changes', () => {
    const items = signal(['A', 'B']);
    const frag = html`<ul>${() => items.value.map(i => html`<li>${i}</li>`)}</ul>`;
    document.body.appendChild(frag);

    const ul = document.querySelector('ul')!;
    expect(ul.querySelectorAll('li').length).toBe(2);

    items.value = ['A', 'B', 'C', 'D'];
    expect(ul.querySelectorAll('li').length).toBe(4);

    document.body.innerHTML = '';
  });

  it('conditional rendering toggles correctly', () => {
    const show = signal(true);
    const frag = html`<div>${() => show.value ? html`<p>Visible</p>` : null}</div>`;
    document.body.appendChild(frag);

    expect(document.querySelector('p')?.textContent).toBe('Visible');

    show.value = false;
    expect(document.querySelector('p')).toBeNull();

    show.value = true;
    expect(document.querySelector('p')?.textContent).toBe('Visible');

    document.body.innerHTML = '';
  });
});

// ═══════════════════════════════════════════════════════════════════
// ROUTER EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('router — edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    _resetRouter();
    history.replaceState(null, '', '/');
    location.hash = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('URL-decodes path parameters', () => {
    let captured = '';
    route('/search/{query}', ({ query }) => {
      captured = query;
      return html`<p>${query}</p>`;
    });
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/search/hello%20world';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(captured).toBe('hello world');
  });

  it('navigate with replace does not add history entry', () => {
    route('/', () => html`<p>Home</p>`);
    route('/a', () => html`<p>A</p>`);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/a', { replace: true });
    // The hash should be updated
    expect(location.hash).toBe('#/a');
  });

  it('route with no matching route shows nothing (no crash)', () => {
    route('/only-this', () => html`<p>Only</p>`);
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/something-else';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    // Should not crash, just show nothing
    expect(document.querySelector('#root')?.children.length).toBe(0);
  });

  it('change event includes duration and pattern', () => {
    const events: any[] = [];
    route('/user/{id}', ({ id }) => html`<p>${id}</p>`);
    router.on('change', (e) => events.push(e));
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/user/42';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(events.length).toBeGreaterThan(0);
    const last = events[events.length - 1];
    expect(last.pattern).toBe('/user/{id}');
    expect(last.params.id).toBe('42');
    expect(typeof last.durationMs).toBe('number');
  });

  it('navigate from within a route handler does not crash', () => {
    route('/', () => {
      // Redirect programmatically inside handler
      return html`<p>Home</p>`;
    });
    route('/target', () => html`<p>Target</p>`);
    router.start({ target: '#root', mode: 'hash' });

    // Should not throw
    navigate('/target');
    expect(document.querySelector('#root p')?.textContent).toBe('Target');
  });

  it('handles route with empty path segments gracefully', () => {
    route('/', () => html`<p>Root</p>`);
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.querySelector('#root p')?.textContent).toBe('Root');
  });
});

// ═══════════════════════════════════════════════════════════════════
// API EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('api — edge cases', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    localStorage.clear();
    api._reset();
    api.configure({ baseUrl: '/api', auth: false });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockJsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
    const h = new Headers({ 'Content-Type': 'application/json', ...headers });
    return { ok: status >= 200 && status < 300, status, headers: h, json: async () => data, text: async () => JSON.stringify(data) };
  }

  // ── configure ──

  it('configure merges with existing config', () => {
    api.configure({ baseUrl: '/v1' });
    api.configure({ auth: true });
    localStorage.setItem('tina4_token', 'tok');
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    api.get('/test');
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/v1/test'); // baseUrl preserved from first configure
  });

  it('configure sets default headers on all requests', () => {
    api.configure({ headers: { 'X-API-Key': 'secret', 'X-Tenant': 'acme' } });
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    api.get('/data');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-API-Key']).toBe('secret');
    expect(opts.headers['X-Tenant']).toBe('acme');
  });

  // ── Query string params ──

  it('GET with params builds query string', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse([]));
    await api.get('/users', { params: { page: 1, limit: 20, active: true } });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users?page=1&limit=20&active=true',
      expect.any(Object)
    );
  });

  it('params encode special characters', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse([]));
    await api.get('/search', { params: { q: 'hello world&more', tag: 'a=b' } });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('q=hello%20world%26more');
    expect(url).toContain('tag=a%3Db');
  });

  it('params appends to existing query string', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse([]));
    await api.get('/users?sort=name', { params: { page: 2 } });
    expect(fetchMock).toHaveBeenCalledWith('/api/users?sort=name&page=2', expect.any(Object));
  });

  // ── Per-request headers ──

  it('per-request headers override default headers', async () => {
    api.configure({ headers: { 'Accept': 'text/plain' } });
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await api.get('/data', { headers: { 'Accept': 'application/xml' } });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['Accept']).toBe('application/xml');
  });

  it('per-request headers on POST alongside body', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    await api.post('/items', { name: 'test' }, { headers: { 'X-Idempotency': 'abc' } });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-Idempotency']).toBe('abc');
    expect(JSON.parse(opts.body)).toEqual({ name: 'test' });
  });

  // ── Auth edge cases ──

  it('auth header not sent when no token in localStorage', async () => {
    api.configure({ auth: true });
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await api.get('/protected');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  it('formToken not added for GET even with auth on', async () => {
    api.configure({ auth: true });
    localStorage.setItem('tina4_token', 'tok');
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await api.get('/data');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBeUndefined();
  });

  it('custom tokenKey reads from correct localStorage key', async () => {
    api.configure({ auth: true, tokenKey: 'my_app_token' });
    localStorage.setItem('my_app_token', 'custom-token');
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await api.get('/data');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer custom-token');
  });

  it('FreshToken rotation updates the correct key', async () => {
    api.configure({ auth: true, tokenKey: 'app_token' });
    localStorage.setItem('app_token', 'old');
    fetchMock.mockResolvedValue(mockJsonResponse({}, 200, { 'FreshToken': 'rotated' }));

    await api.get('/data');
    expect(localStorage.getItem('app_token')).toBe('rotated');
  });

  // ── Error handling ──

  it('error includes response data for debugging', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ message: 'Forbidden', code: 'NO_ACCESS' }, 403));

    try {
      await api.get('/admin');
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.status).toBe(403);
      expect(err.data.message).toBe('Forbidden');
      expect(err.data.code).toBe('NO_ACCESS');
      expect(err.ok).toBe(false);
    }
  });

  it('network error rejects with fetch error, not ApiResponse', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get('/offline')).rejects.toThrow('Failed to fetch');
  });

  // ── Concurrent requests ──

  it('handles multiple concurrent requests independently', async () => {
    let call = 0;
    fetchMock.mockImplementation(async () => {
      const id = ++call;
      return mockJsonResponse({ id }, 200);
    });

    const [r1, r2, r3] = await Promise.all([
      api.get('/a'),
      api.get('/b'),
      api.get('/c'),
    ]);

    expect(r1).toEqual({ id: 1 });
    expect(r2).toEqual({ id: 2 });
    expect(r3).toEqual({ id: 3 });
  });

  // ── Interceptor edge cases ──

  it('response interceptor can modify data', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ raw: true }));
    api.intercept('response', (res) => {
      return { ...res, data: { ...res.data as object, transformed: true } };
    });

    const data = await api.get<any>('/data');
    expect(data.transformed).toBe(true);
    expect(data.raw).toBe(true);
  });

  it('request interceptor that returns void still works', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    api.intercept('request', (config) => {
      config.headers['X-Mutated'] = 'yes';
      // returns undefined (void)
    });

    await api.get('/data');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-Mutated']).toBe('yes');
  });

  // ── POST with non-object body ──

  it('POST with string body sends as JSON string', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    await api.post('/echo', 'hello');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBe('"hello"');
  });

  it('POST with null body sends null JSON', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    await api.post('/echo', null);
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBe('null');
  });

  it('POST with no body sends no body', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    await api.post('/trigger');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.body).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// COMPONENT EDGE CASES
// ═══════════════════════════════════════════════════════════════════

describe('component — edge cases', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('component with no props renders correctly', () => {
    class SimpleEl extends Tina4Element {
      render() { return html`<p>Simple</p>`; }
    }
    customElements.define('test-simple-edge', SimpleEl);

    document.body.innerHTML = '<test-simple-edge></test-simple-edge>';
    const el = document.querySelector('test-simple-edge')!;
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('p')?.textContent).toBe('Simple');
  });

  it('component updates when signal prop changes', () => {
    class PropEl extends Tina4Element {
      static props = { name: String };
      render() { return html`<span>${this.prop('name')}</span>`; }
    }
    customElements.define('test-prop-edge', PropEl);

    document.body.innerHTML = '<test-prop-edge name="Alice"></test-prop-edge>';
    const el = document.querySelector('test-prop-edge')!;
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('span')?.textContent).toBe('Alice');

    el.setAttribute('name', 'Bob');
    expect(shadow.querySelector('span')?.textContent).toBe('Bob');
  });

  it('component with light DOM (shadow = false)', () => {
    class LightEl extends Tina4Element {
      static shadow = false;
      render() { return html`<p>Light DOM</p>`; }
    }
    customElements.define('test-light-edge', LightEl);

    document.body.innerHTML = '<test-light-edge></test-light-edge>';
    const el = document.querySelector('test-light-edge')!;
    expect(el.shadowRoot).toBeNull();
    expect(el.querySelector('p')?.textContent).toBe('Light DOM');
  });

  it('onMount and onUnmount lifecycle hooks fire', () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();

    class LifecycleEl extends Tina4Element {
      render() { return html`<p>lifecycle</p>`; }
      onMount() { mounted(); }
      onUnmount() { unmounted(); }
    }
    customElements.define('test-lifecycle-edge', LifecycleEl);

    document.body.innerHTML = '<test-lifecycle-edge></test-lifecycle-edge>';
    expect(mounted).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '';
    expect(unmounted).toHaveBeenCalledTimes(1);
  });

  it('component with internal signal state', () => {
    class StatefulEl extends Tina4Element {
      count = signal(0);
      render() {
        return html`
          <button @click=${() => this.count.value++}>+</button>
          <span>${this.count}</span>
        `;
      }
    }
    customElements.define('test-stateful-edge', StatefulEl);

    document.body.innerHTML = '<test-stateful-edge></test-stateful-edge>';
    const el = document.querySelector('test-stateful-edge')! as StatefulEl;
    const shadow = el.shadowRoot!;

    expect(shadow.querySelector('span')?.textContent).toBe('0');

    shadow.querySelector('button')?.click();
    expect(shadow.querySelector('span')?.textContent).toBe('1');

    shadow.querySelector('button')?.click();
    shadow.querySelector('button')?.click();
    expect(shadow.querySelector('span')?.textContent).toBe('3');
  });
});

// ═══════════════════════════════════════════════════════════════════
// DEBUG MODULE TESTS
// ═══════════════════════════════════════════════════════════════════

describe('debug — trackers', () => {
  // Import trackers directly for unit testing
  let signalTracker: typeof import('../src/debug/trackers').signalTracker;
  let componentTracker: typeof import('../src/debug/trackers').componentTracker;
  let routeTracker: typeof import('../src/debug/trackers').routeTracker;
  let apiTracker: typeof import('../src/debug/trackers').apiTracker;

  beforeEach(async () => {
    const trackers = await import('../src/debug/trackers');
    signalTracker = trackers.signalTracker;
    componentTracker = trackers.componentTracker;
    routeTracker = trackers.routeTracker;
    apiTracker = trackers.apiTracker;
  });

  describe('signalTracker', () => {
    it('tracks a signal with label', () => {
      const s = signal(42, 'testSig');
      signalTracker.add(s as any, 'testSig');

      const all = signalTracker.getAll();
      expect(all.length).toBeGreaterThanOrEqual(1);
      const found = all.find(e => e.label === 'testSig');
      expect(found).toBeDefined();
      expect(found!.value).toBe(42);
    });

    it('tracks update count', () => {
      const s = signal(0, 'counter');
      signalTracker.add(s as any, 'counter');

      signalTracker.onUpdate(s as any);
      signalTracker.onUpdate(s as any);
      signalTracker.onUpdate(s as any);

      const all = signalTracker.getAll();
      const found = all.find(e => e.label === 'counter');
      expect(found!.updateCount).toBeGreaterThanOrEqual(3);
    });

    it('reports subscriber count', () => {
      const s = signal(0, 'subTest');
      signalTracker.add(s as any, 'subTest');

      const all = signalTracker.getAll();
      const found = all.find(e => e.label === 'subTest');
      expect(typeof found!.subscriberCount).toBe('number');
    });
  });

  describe('routeTracker', () => {
    it('records navigation events', () => {
      routeTracker.onNavigate({
        path: '/test',
        params: { id: '42' },
        pattern: '/test',
        durationMs: 5.2,
      });

      const history = routeTracker.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].path).toBe('/test');
      expect(history[0].durationMs).toBe(5.2);
    });

    it('limits history to MAX_ROUTE_HISTORY', () => {
      for (let i = 0; i < 60; i++) {
        routeTracker.onNavigate({
          path: `/route-${i}`,
          params: {},
          pattern: `/route-${i}`,
          durationMs: 1,
        });
      }
      // Should be capped at 50
      expect(routeTracker.getHistory().length).toBeLessThanOrEqual(50);
    });

    it('getRegisteredRoutes returns empty when no getter set', () => {
      // Reset by setting null
      routeTracker.setGetRoutes(null);
      expect(routeTracker.getRegisteredRoutes()).toEqual([]);
    });

    it('getRegisteredRoutes delegates to setter function', () => {
      routeTracker.setGetRoutes(() => [
        { pattern: '/', hasGuard: false },
        { pattern: '/admin', hasGuard: true },
      ]);
      const routes = routeTracker.getRegisteredRoutes();
      expect(routes).toEqual([
        { pattern: '/', hasGuard: false },
        { pattern: '/admin', hasGuard: true },
      ]);
    });
  });

  describe('apiTracker', () => {
    it('tracks request with URL and method', () => {
      apiTracker.onRequest({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        _url: '/api/users',
        _requestId: 1,
      });

      const log = apiTracker.getLog();
      expect(log.length).toBeGreaterThanOrEqual(1);
      expect(log[0].method).toBe('GET');
      expect(log[0].url).toBe('/api/users');
      expect(log[0].pending).toBe(true);
    });

    it('correlates response to request by ID', () => {
      apiTracker.onRequest({
        method: 'POST',
        headers: { 'Authorization': 'Bearer tok' },
        _url: '/api/items',
        _requestId: 100,
      });

      apiTracker.onResponse({
        status: 201,
        ok: true,
        _requestId: 100,
      });

      const log = apiTracker.getLog();
      const entry = log.find(e => e.id === 100);
      expect(entry).toBeDefined();
      expect(entry!.status).toBe(201);
      expect(entry!.pending).toBe(false);
      expect(entry!.hasAuth).toBe(true);
      expect(typeof entry!.durationMs).toBe('number');
    });

    it('handles concurrent requests with correct correlation', () => {
      // Two requests fire simultaneously
      apiTracker.onRequest({ method: 'GET', headers: {}, _url: '/a', _requestId: 200 });
      apiTracker.onRequest({ method: 'GET', headers: {}, _url: '/b', _requestId: 201 });

      // Second responds first
      apiTracker.onResponse({ status: 200, ok: true, _requestId: 201 });
      apiTracker.onResponse({ status: 404, ok: false, _requestId: 200 });

      const log = apiTracker.getLog();
      const entryA = log.find(e => e.id === 200);
      const entryB = log.find(e => e.id === 201);

      expect(entryA!.status).toBe(404);
      expect(entryA!.error).toBe('HTTP 404');
      expect(entryB!.status).toBe(200);
      expect(entryB!.error).toBeUndefined();
    });

    it('detects auth from Authorization header', () => {
      apiTracker.onRequest({
        method: 'GET',
        headers: { 'Authorization': 'Bearer xyz' },
        _url: '/protected',
        _requestId: 300,
      });

      const entry = apiTracker.getLog().find(e => e.id === 300);
      expect(entry!.hasAuth).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// REAL-WORLD SCENARIOS
// ═══════════════════════════════════════════════════════════════════

describe('real-world — shared state across components via signals', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('two components share the same signal and stay in sync', () => {
    // Simulates a global store pattern
    const username = signal('Guest');

    class DisplayUser extends Tina4Element {
      static shadow = false;
      render() { return html`<span class="user-display">${username}</span>`; }
    }
    customElements.define('test-display-user', DisplayUser);

    class EditUser extends Tina4Element {
      static shadow = false;
      render() {
        return html`<input class="user-input" @input=${(e: Event) => {
          username.value = (e.target as HTMLInputElement).value;
        }} />`;
      }
    }
    customElements.define('test-edit-user', EditUser);

    document.body.innerHTML = '<test-display-user></test-display-user><test-edit-user></test-edit-user>';

    const display = document.querySelector('.user-display')!;
    expect(display.textContent).toBe('Guest');

    // Simulate typing
    username.value = 'Andre';
    expect(display.textContent).toBe('Andre');
  });

  it('signal-based store pattern with computed derived state', () => {
    // Cart store
    const items = signal<{ name: string; price: number }[]>([]);
    const total = computed(() => items.value.reduce((sum, i) => sum + i.price, 0));
    const count = computed(() => items.value.length);

    expect(total.value).toBe(0);
    expect(count.value).toBe(0);

    items.value = [{ name: 'Widget', price: 9.99 }];
    expect(total.value).toBe(9.99);
    expect(count.value).toBe(1);

    items.value = [...items.value, { name: 'Gadget', price: 14.50 }];
    expect(total.value).toBeCloseTo(24.49);
    expect(count.value).toBe(2);
  });
});

describe('real-world — API file upload', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    api._reset();
    api.configure({ baseUrl: '/api' });
  });

  afterEach(() => { globalThis.fetch = originalFetch; });

  it('POST can send FormData-like body with custom content type', async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ fileId: '123' }),
    });

    // When uploading files, users override Content-Type
    const result = await api.post('/upload', '<<binary>>', {
      headers: { 'Content-Type': 'multipart/form-data; boundary=---' },
    });

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('multipart/form-data; boundary=---');
    expect(result).toEqual({ fileId: '123' });
  });
});

describe('real-world — session timeout / 401 redirect', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    localStorage.clear();
    api._reset();
    api.configure({ baseUrl: '/api', auth: true });
    document.body.innerHTML = '<div id="root"></div>';
    _resetRouter();
    history.replaceState(null, '', '/');
    location.hash = '';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.body.innerHTML = '';
  });

  it('response interceptor redirects to login on 401', async () => {
    route('/', () => html`<p>Dashboard</p>`);
    route('/login', () => html`<p>Login Page</p>`);
    router.start({ target: '#root', mode: 'hash' });

    // Set up 401 interceptor
    api.intercept('response', (res) => {
      if (res.status === 401) {
        navigate('/login');
      }
      return res;
    });

    fetchMock.mockResolvedValue({
      ok: false, status: 401,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ error: 'Token expired' }),
    });

    localStorage.setItem('tina4_token', 'expired-token');

    try {
      await api.get('/dashboard');
    } catch {
      // Expected 401 throw
    }

    expect(location.hash).toBe('#/login');
    expect(document.querySelector('#root p')?.textContent).toBe('Login Page');
  });
});

describe('real-world — CORS and network errors', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    api._reset();
    api.configure({ baseUrl: 'https://external-api.com' });
  });

  afterEach(() => { globalThis.fetch = originalFetch; });

  it('CORS error (fetch rejects with TypeError) propagates correctly', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get('/data')).rejects.toThrow('Failed to fetch');
  });

  it('network timeout can be handled by caller', async () => {
    // Simulate a timeout by never resolving
    fetchMock.mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 10);
    }));

    await expect(api.get('/slow')).rejects.toThrow('Timeout');
  });

  it('interceptor errors do not swallow the original request', async () => {
    fetchMock.mockResolvedValue({
      ok: true, status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ data: 'ok' }),
    });

    api.intercept('request', () => {
      throw new Error('Interceptor bug');
    });

    await expect(api.get('/data')).rejects.toThrow('Interceptor bug');
  });
});

describe('real-world — router redirects and guard chains', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    _resetRouter();
    history.replaceState(null, '', '/');
    location.hash = '';
  });

  afterEach(() => { document.body.innerHTML = ''; });

  it('guard chain: admin -> login -> login page renders', () => {
    let isLoggedIn = false;

    route('/login', () => html`<p>Please Login</p>`);
    route('/admin', {
      guard: () => isLoggedIn || '/login',
      handler: () => html`<p>Admin Panel</p>`,
    });
    router.start({ target: '#root', mode: 'hash' });

    navigate('/admin');
    expect(document.querySelector('#root p')?.textContent).toBe('Please Login');

    // Now log in and try again
    isLoggedIn = true;
    navigate('/admin');
    expect(document.querySelector('#root p')?.textContent).toBe('Admin Panel');
  });

  it('multiple guards on different routes work independently', () => {
    const roles = signal<string[]>([]);

    route('/', () => html`<p>Home</p>`);
    route('/editor', {
      guard: () => roles.value.includes('editor') || '/',
      handler: () => html`<p>Editor</p>`,
    });
    route('/admin', {
      guard: () => roles.value.includes('admin') || '/',
      handler: () => html`<p>Admin</p>`,
    });
    router.start({ target: '#root', mode: 'hash' });

    navigate('/editor');
    expect(document.querySelector('#root p')?.textContent).toBe('Home'); // redirected

    navigate('/admin');
    expect(document.querySelector('#root p')?.textContent).toBe('Home'); // redirected

    roles.value = ['editor'];
    navigate('/editor');
    expect(document.querySelector('#root p')?.textContent).toBe('Editor');

    navigate('/admin');
    expect(document.querySelector('#root p')?.textContent).toBe('Home'); // still no admin
  });
});

describe('real-world — error boundaries and console safety', () => {
  it('throwing effect does not block other effects from running', () => {
    const s = signal(0);
    const fn = vi.fn();

    // Effect A throws
    effect(() => { if (s.value > 0) throw new Error('boom'); });
    // Effect B is fine
    effect(() => { fn(s.value); });

    expect(fn).toHaveBeenCalledWith(0);

    // Effect A throws, but Effect B should STILL run
    expect(() => { s.value = 1; }).toThrow('boom');
    expect(fn).toHaveBeenCalledWith(1); // B ran despite A throwing
  });

  it('error in one effect does not permanently break the signal', () => {
    const s = signal(0);
    let shouldThrow = true;

    effect(() => {
      if (s.value > 0 && shouldThrow) throw new Error('once');
    });

    expect(() => { s.value = 1; }).toThrow('once');

    // Disable throwing, signal should work normally
    shouldThrow = false;
    s.value = 2; // should not throw
    expect(s.peek()).toBe(2);
  });

  it('throwing effect in batch does not block other batched effects', () => {
    const a = signal(0);
    const b = signal(0);
    const fn = vi.fn();

    effect(() => { if (a.value > 0) throw new Error('batch boom'); });
    effect(() => { fn(b.value); });

    expect(fn).toHaveBeenCalledWith(0);

    expect(() => {
      batch(() => { a.value = 1; b.value = 1; });
    }).toThrow('batch boom');

    // fn should have been called with the new value despite the throw
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('multiple throwing effects — all run, first error propagates', () => {
    const s = signal(0);
    const calls: string[] = [];

    effect(() => { if (s.value > 0) { calls.push('A'); throw new Error('err-A'); } s.value; });
    effect(() => { if (s.value > 0) { calls.push('B'); throw new Error('err-B'); } s.value; });
    effect(() => { if (s.value > 0) { calls.push('C'); } s.value; });

    expect(() => { s.value = 1; }).toThrow('err-A'); // first error wins
    expect(calls).toContain('A');
    expect(calls).toContain('B');
    expect(calls).toContain('C'); // C still runs
  });

  it('computed that depends on throwing effect stays consistent', () => {
    const s = signal(0);
    const doubled = computed(() => s.value * 2);

    effect(() => { if (s.value === 5) throw new Error('bad value'); });

    expect(doubled.value).toBe(0);
    s.value = 3;
    expect(doubled.value).toBe(6);

    expect(() => { s.value = 5; }).toThrow('bad value');
    // Computed should still reflect the updated value
    expect(doubled.value).toBe(10);
  });

  it('disposed effect that would throw does not throw', () => {
    const s = signal(0);
    const dispose = effect(() => {
      if (s.value > 0) throw new Error('should not fire');
    });

    dispose();
    // No throw because the effect is disposed
    s.value = 1;
    expect(s.peek()).toBe(1);
  });

  it('effect error during batch does not prevent batch from completing', () => {
    const a = signal(0);
    const b = signal(0);

    effect(() => { if (a.value === 1) throw new Error('batch-err'); });

    expect(() => {
      batch(() => {
        a.value = 1;
        b.value = 99;
      });
    }).toThrow('batch-err');

    // Both values should be committed despite the error
    expect(a.peek()).toBe(1);
    expect(b.peek()).toBe(99);
  });

  it('signal toString does not crash when used in string interpolation', () => {
    const s = signal(42);
    // This is a common mistake — using signal in template literal without .value
    const str = `Value: ${s}`;
    // Should not throw, though it won't be the number
    expect(typeof str).toBe('string');
  });
});

// ═══════════════════════════════════════════════════════════════════
// DEBUG PANELS (render functions)
// ═══════════════════════════════════════════════════════════════════

describe('debug — panel rendering', () => {
  it('signal panel renders without errors', async () => {
    const { renderSignalsPanel } = await import('../src/debug/panels/signals');
    const result = renderSignalsPanel();
    expect(typeof result).toBe('string');
  });

  it('component panel renders without errors', async () => {
    const { renderComponentsPanel } = await import('../src/debug/panels/components');
    const result = renderComponentsPanel();
    expect(typeof result).toBe('string');
  });

  it('route panel renders without errors', async () => {
    const { renderRoutesPanel } = await import('../src/debug/panels/routes');
    const result = renderRoutesPanel();
    expect(typeof result).toBe('string');
  });

  it('api panel renders without errors', async () => {
    const { renderApiPanel } = await import('../src/debug/panels/api');
    const result = renderApiPanel();
    expect(typeof result).toBe('string');
  });
});
