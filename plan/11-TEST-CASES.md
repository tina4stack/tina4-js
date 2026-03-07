# Module 11: Test Cases

## Testing Strategy

- Use **Vitest** (Vite-native, fast, compatible with Jest API)
- Use **happy-dom** for DOM testing (lighter than jsdom)
- Every module gets unit tests
- Integration tests cover cross-module behavior
- Size test enforces the <3KB gzip budget

---

## 1. Signal Tests

```ts
// tests/signal.test.ts
import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect, batch } from '../src/core/signal';

describe('signal', () => {
  it('holds a value', () => {
    const s = signal(42);
    expect(s.value).toBe(42);
  });

  it('updates value', () => {
    const s = signal('hello');
    s.value = 'world';
    expect(s.value).toBe('world');
  });

  it('does not notify if value unchanged', () => {
    const s = signal(1);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });
    expect(fn).toHaveBeenCalledTimes(1); // initial run
    s.value = 1; // same value
    expect(fn).toHaveBeenCalledTimes(1); // no re-run
  });

  it('works with objects (reference equality)', () => {
    const obj = { a: 1 };
    const s = signal(obj);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });
    s.value = obj; // same reference
    expect(fn).toHaveBeenCalledTimes(1);
    s.value = { a: 1 }; // new reference, same shape
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('works with null and undefined', () => {
    const s = signal<string | null>(null);
    expect(s.value).toBeNull();
    s.value = 'hello';
    expect(s.value).toBe('hello');
    s.value = null;
    expect(s.value).toBeNull();
  });

  it('handles boolean signals', () => {
    const s = signal(false);
    expect(s.value).toBe(false);
    s.value = true;
    expect(s.value).toBe(true);
  });
});

describe('computed', () => {
  it('derives from a signal', () => {
    const a = signal(2);
    const b = computed(() => a.value * 3);
    expect(b.value).toBe(6);
  });

  it('updates when dependency changes', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a.value + b.value);
    expect(sum.value).toBe(3);
    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 20;
    expect(sum.value).toBe(30);
  });

  it('chains multiple computed values', () => {
    const base = signal(2);
    const doubled = computed(() => base.value * 2);
    const quadrupled = computed(() => doubled.value * 2);
    expect(quadrupled.value).toBe(8);
    base.value = 5;
    expect(quadrupled.value).toBe(20);
  });

  it('is read-only', () => {
    const c = computed(() => 42);
    expect(() => { (c as any).value = 99; }).toThrow();
  });

  it('handles conditional dependencies', () => {
    const toggle = signal(true);
    const a = signal('A');
    const b = signal('B');
    const result = computed(() => toggle.value ? a.value : b.value);
    expect(result.value).toBe('A');
    toggle.value = false;
    expect(result.value).toBe('B');
    a.value = 'A2'; // should NOT trigger recompute since toggle is false
    expect(result.value).toBe('B');
  });
});

describe('effect', () => {
  it('runs immediately', () => {
    const fn = vi.fn();
    effect(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-runs when signal changes', () => {
    const s = signal(0);
    const values: number[] = [];
    effect(() => { values.push(s.value); });
    expect(values).toEqual([0]);
    s.value = 1;
    expect(values).toEqual([0, 1]);
    s.value = 2;
    expect(values).toEqual([0, 1, 2]);
  });

  it('tracks multiple signals', () => {
    const a = signal('hello');
    const b = signal('world');
    const results: string[] = [];
    effect(() => { results.push(`${a.value} ${b.value}`); });
    expect(results).toEqual(['hello world']);
    a.value = 'hi';
    expect(results).toEqual(['hello world', 'hi world']);
    b.value = 'there';
    expect(results).toEqual(['hello world', 'hi world', 'hi there']);
  });

  it('disposes cleanly', () => {
    const s = signal(0);
    const fn = vi.fn();
    const dispose = effect(() => { s.value; fn(); });
    expect(fn).toHaveBeenCalledTimes(1);
    dispose();
    s.value = 1;
    expect(fn).toHaveBeenCalledTimes(1); // no more calls
  });

  it('handles nested effects independently', () => {
    const a = signal(0);
    const b = signal(0);
    const outer: number[] = [];
    const inner: number[] = [];

    effect(() => {
      outer.push(a.value);
      effect(() => { inner.push(b.value); });
    });

    a.value = 1;
    b.value = 1;
    // Outer tracks a, inner tracks b — they're independent
    expect(outer.length).toBeGreaterThanOrEqual(2);
    expect(inner.length).toBeGreaterThanOrEqual(2);
  });
});

describe('batch', () => {
  it('batches multiple updates into one notification', () => {
    const a = signal(0);
    const b = signal(0);
    const fn = vi.fn();
    effect(() => { a.value; b.value; fn(); });
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      a.value = 1;
      b.value = 2;
    });
    expect(fn).toHaveBeenCalledTimes(2); // once initial + once for batch
  });

  it('nested batches work correctly', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => { s.value; fn(); });

    batch(() => {
      batch(() => {
        s.value = 1;
        s.value = 2;
      });
      s.value = 3;
    });
    // Only one notification after outermost batch completes
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

---

## 2. HTML Renderer Tests

```ts
// tests/html.test.ts
import { describe, it, expect } from 'vitest';
import { html } from '../src/core/html';
import { signal, effect } from '../src/core/signal';

describe('html tagged template', () => {
  it('creates a DOM fragment from static HTML', () => {
    const frag = html`<div>Hello</div>`;
    expect(frag).toBeInstanceOf(DocumentFragment);
    expect(frag.firstElementChild?.tagName).toBe('DIV');
    expect(frag.firstElementChild?.textContent).toBe('Hello');
  });

  it('interpolates static strings', () => {
    const name = 'World';
    const frag = html`<p>Hello ${name}</p>`;
    expect(frag.firstElementChild?.textContent).toBe('Hello World');
  });

  it('interpolates numbers', () => {
    const frag = html`<span>${42}</span>`;
    expect(frag.firstElementChild?.textContent).toBe('42');
  });

  it('interpolates signals and updates DOM reactively', () => {
    const name = signal('World');
    const frag = html`<p>Hello ${name}!</p>`;
    const p = frag.firstElementChild!;
    document.body.appendChild(p);

    expect(p.textContent).toBe('Hello World!');
    name.value = 'Tina4';
    expect(p.textContent).toBe('Hello Tina4!');

    document.body.removeChild(p);
  });

  it('handles null and undefined gracefully', () => {
    const frag = html`<div>${null}${undefined}</div>`;
    expect(frag.firstElementChild?.textContent).toBe('');
  });

  it('renders nested templates', () => {
    const inner = html`<span>Inner</span>`;
    const outer = html`<div>${inner}</div>`;
    expect(outer.firstElementChild?.innerHTML).toContain('Inner');
  });

  it('renders arrays of templates', () => {
    const items = ['a', 'b', 'c'];
    const frag = html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`;
    const lis = frag.firstElementChild?.querySelectorAll('li');
    expect(lis?.length).toBe(3);
    expect(lis?.[0].textContent).toBe('a');
    expect(lis?.[2].textContent).toBe('c');
  });

  it('binds event handlers with @syntax', () => {
    let clicked = false;
    const frag = html`<button @click=${() => { clicked = true; }}>Go</button>`;
    const btn = frag.firstElementChild as HTMLButtonElement;
    document.body.appendChild(btn);
    btn.click();
    expect(clicked).toBe(true);
    document.body.removeChild(btn);
  });

  it('binds reactive attributes', () => {
    const cls = signal('active');
    const frag = html`<div class=${cls}>Test</div>`;
    const div = frag.firstElementChild as HTMLElement;
    document.body.appendChild(div);

    expect(div.className).toBe('active');
    cls.value = 'inactive';
    expect(div.className).toBe('inactive');

    document.body.removeChild(div);
  });

  it('handles boolean attributes with ? prefix', () => {
    const disabled = signal(false);
    const frag = html`<button ?disabled=${disabled}>Go</button>`;
    const btn = frag.firstElementChild as HTMLButtonElement;
    document.body.appendChild(btn);

    expect(btn.disabled).toBe(false);
    disabled.value = true;
    expect(btn.disabled).toBe(true);

    document.body.removeChild(btn);
  });

  it('renders dynamic content with functions', () => {
    const show = signal(true);
    const frag = html`<div>${() => show.value ? html`<p>Yes</p>` : html`<p>No</p>`}</div>`;
    const div = frag.firstElementChild!;
    document.body.appendChild(div);

    expect(div.textContent).toBe('Yes');
    show.value = false;
    expect(div.textContent).toBe('No');

    document.body.removeChild(div);
  });

  it('caches templates for same tagged literal', () => {
    // Same template used twice should reuse cached <template>
    function make(text: string) {
      return html`<div>${text}</div>`;
    }
    const a = make('one');
    const b = make('two');
    expect(a.firstElementChild?.textContent).toBe('one');
    expect(b.firstElementChild?.textContent).toBe('two');
  });

  it('escapes HTML in string interpolation (XSS prevention)', () => {
    const evil = '<script>alert("xss")</script>';
    const frag = html`<div>${evil}</div>`;
    expect(frag.firstElementChild?.textContent).toBe(evil);
    expect(frag.firstElementChild?.querySelector('script')).toBeNull();
  });

  it('handles multiple interpolations in one element', () => {
    const first = signal('John');
    const last = signal('Doe');
    const frag = html`<span>${first} ${last}</span>`;
    const span = frag.firstElementChild!;
    document.body.appendChild(span);

    expect(span.textContent).toBe('John Doe');
    first.value = 'Jane';
    expect(span.textContent).toBe('Jane Doe');

    document.body.removeChild(span);
  });
});
```

---

## 3. Component Tests

```ts
// tests/component.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tina4Element } from '../src/core/component';
import { html } from '../src/core/html';
import { signal } from '../src/core/signal';

// Helper: define a component and add to DOM
function defineOnce(name: string, cls: CustomElementConstructor) {
  if (!customElements.get(name)) {
    customElements.define(name, cls);
  }
}

describe('Tina4Element', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders content to the DOM', () => {
    class TestEl extends Tina4Element {
      render() { return html`<p>Hello</p>`; }
    }
    defineOnce('test-render', TestEl);

    const el = document.createElement('test-render');
    document.body.appendChild(el);

    expect(el.shadowRoot?.querySelector('p')?.textContent).toBe('Hello');
  });

  it('renders to light DOM when shadow is disabled', () => {
    class LightEl extends Tina4Element {
      static shadow = false;
      render() { return html`<p>Light</p>`; }
    }
    defineOnce('test-light', LightEl);

    const el = document.createElement('test-light');
    document.body.appendChild(el);

    expect(el.querySelector('p')?.textContent).toBe('Light');
  });

  it('bridges HTML attributes to reactive props', () => {
    class PropEl extends Tina4Element {
      static props = { name: String, count: Number };
      render() {
        return html`<span>${this.prop('name')} - ${this.prop('count')}</span>`;
      }
    }
    defineOnce('test-props', PropEl);

    const el = document.createElement('test-props');
    el.setAttribute('name', 'Andre');
    el.setAttribute('count', '5');
    document.body.appendChild(el);

    const span = el.shadowRoot?.querySelector('span');
    expect(span?.textContent).toContain('Andre');
    expect(span?.textContent).toContain('5');
  });

  it('updates when attributes change', () => {
    class ReactiveEl extends Tina4Element {
      static props = { label: String };
      render() { return html`<span>${this.prop('label')}</span>`; }
    }
    defineOnce('test-reactive', ReactiveEl);

    const el = document.createElement('test-reactive');
    el.setAttribute('label', 'before');
    document.body.appendChild(el);

    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('before');
    el.setAttribute('label', 'after');
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('after');
  });

  it('handles boolean props', () => {
    class BoolEl extends Tina4Element {
      static props = { active: Boolean };
      render() {
        return html`<span>${() => this.prop('active').value ? 'yes' : 'no'}</span>`;
      }
    }
    defineOnce('test-bool', BoolEl);

    const el = document.createElement('test-bool');
    document.body.appendChild(el);
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('no');

    el.setAttribute('active', '');
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('yes');
  });

  it('calls onMount and onUnmount lifecycle hooks', () => {
    const mountSpy = vi.fn();
    const unmountSpy = vi.fn();

    class LifecycleEl extends Tina4Element {
      render() { return html`<div>lifecycle</div>`; }
      onMount() { mountSpy(); }
      onUnmount() { unmountSpy(); }
    }
    defineOnce('test-lifecycle', LifecycleEl);

    const el = document.createElement('test-lifecycle');
    document.body.appendChild(el);
    expect(mountSpy).toHaveBeenCalledTimes(1);

    document.body.removeChild(el);
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('injects scoped styles', () => {
    class StyledEl extends Tina4Element {
      static styles = `:host { display: block; } p { color: red; }`;
      render() { return html`<p>Styled</p>`; }
    }
    defineOnce('test-styled', StyledEl);

    const el = document.createElement('test-styled');
    document.body.appendChild(el);

    const style = el.shadowRoot?.querySelector('style');
    expect(style?.textContent).toContain(':host');
    expect(style?.textContent).toContain('color: red');
  });

  it('emits custom events', () => {
    class EventEl extends Tina4Element {
      render() {
        return html`<button @click=${() => this.emit('activate', { detail: 42 })}>Go</button>`;
      }
    }
    defineOnce('test-event', EventEl);

    const el = document.createElement('test-event');
    const handler = vi.fn();
    el.addEventListener('activate', handler);
    document.body.appendChild(el);

    el.shadowRoot?.querySelector('button')?.click();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toBe(42);
  });

  it('uses internal signal state', () => {
    class StatefulEl extends Tina4Element {
      count = signal(0);
      render() {
        return html`
          <span>${this.count}</span>
          <button @click=${() => this.count.value++}>+</button>
        `;
      }
    }
    defineOnce('test-stateful', StatefulEl);

    const el = document.createElement('test-stateful');
    document.body.appendChild(el);

    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('0');
    el.shadowRoot?.querySelector('button')?.click();
    expect(el.shadowRoot?.querySelector('span')?.textContent).toBe('1');
  });
});
```

---

## 4. Router Tests

```ts
// tests/router.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { route, router, navigate, _resetRouter } from '../src/router/router';
import { html } from '../src/core/html';

describe('router', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    _resetRouter(); // test helper to clear routes
  });

  it('renders a matched route', () => {
    route('/', () => html`<h1>Home</h1>`);
    router.start({ target: '#root', mode: 'hash' });
    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(document.querySelector('#root h1')?.textContent).toBe('Home');
  });

  it('extracts path parameters', () => {
    let captured: Record<string, string> = {};
    route('/user/{id}', (params) => {
      captured = params;
      return html`<p>User ${params.id}</p>`;
    });
    router.start({ target: '#root', mode: 'hash' });
    location.hash = '#/user/42';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(captured.id).toBe('42');
  });

  it('extracts multiple path parameters', () => {
    let captured: Record<string, string> = {};
    route('/user/{userId}/post/{postId}', (params) => {
      captured = params;
      return html`<p>${params.userId}-${params.postId}</p>`;
    });
    router.start({ target: '#root', mode: 'hash' });
    location.hash = '#/user/5/post/99';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(captured.userId).toBe('5');
    expect(captured.postId).toBe('99');
  });

  it('matches wildcard / 404 route', () => {
    route('/', () => html`<p>Home</p>`);
    route('*', () => html`<p>Not Found</p>`);
    router.start({ target: '#root', mode: 'hash' });
    location.hash = '#/nonexistent';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(document.querySelector('#root p')?.textContent).toBe('Not Found');
  });

  it('navigate() changes the hash', () => {
    route('/about', () => html`<p>About</p>`);
    router.start({ target: '#root', mode: 'hash' });
    navigate('/about');
    expect(location.hash).toBe('#/about');
  });

  it('guard redirects when returning a path', () => {
    route('/login', () => html`<p>Login</p>`);
    route('/admin', {
      guard: () => '/login', // always redirect
      handler: () => html`<p>Admin</p>`,
    });
    router.start({ target: '#root', mode: 'hash' });
    navigate('/admin');

    // Should have redirected to login
    expect(location.hash).toBe('#/login');
  });

  it('guard allows when returning true', () => {
    route('/dashboard', {
      guard: () => true,
      handler: () => html`<p>Dashboard</p>`,
    });
    router.start({ target: '#root', mode: 'hash' });
    navigate('/dashboard');

    expect(document.querySelector('#root p')?.textContent).toBe('Dashboard');
  });

  it('fires change event on navigation', () => {
    const fn = vi.fn();
    route('/', () => html`<p>Home</p>`);
    route('/about', () => html`<p>About</p>`);
    router.on('change', fn);
    router.start({ target: '#root', mode: 'hash' });
    navigate('/about');

    expect(fn).toHaveBeenCalled();
    expect(fn.mock.calls[fn.mock.calls.length - 1][0].path).toBe('/about');
  });

  it('handles routes registered in any order', () => {
    route('/specific', () => html`<p>Specific</p>`);
    route('/user/{id}', () => html`<p>User</p>`);
    route('*', () => html`<p>404</p>`);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/specific');
    expect(document.querySelector('#root p')?.textContent).toBe('Specific');
  });
});
```

---

## 5. API / Fetch Tests

```ts
// tests/fetch.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../src/api/fetch';

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    localStorage.clear();
    api.configure({ baseUrl: '/api', auth: false, tokenKey: 'tina4_token' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('makes GET requests', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => [{ id: 1 }],
    });

    const data = await api.get('/users');
    expect(data).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/users', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('makes POST requests with body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ id: 2, name: 'Test' }),
    });

    const data = await api.post('/users', { name: 'Test' });
    expect(data).toEqual({ id: 2, name: 'Test' });

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Test' });
  });

  it('replaces path parameters', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ id: 42 }),
    });

    await api.get('/users/{id}', { id: 42 });
    expect(fetchMock).toHaveBeenCalledWith('/api/users/42', expect.any(Object));
  });

  it('sends Bearer token when auth is enabled', async () => {
    api.configure({ baseUrl: '/api', auth: true, tokenKey: 'tina4_token' });
    localStorage.setItem('tina4_token', 'my-jwt-token');

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({}),
    });

    await api.get('/protected');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer my-jwt-token');
  });

  it('rotates token from FreshToken header', async () => {
    api.configure({ baseUrl: '/api', auth: true, tokenKey: 'tina4_token' });
    localStorage.setItem('tina4_token', 'old-token');

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'Content-Type': 'application/json',
        'FreshToken': 'new-token',
      }),
      json: async () => ({}),
    });

    await api.get('/data');
    expect(localStorage.getItem('tina4_token')).toBe('new-token');
  });

  it('includes formToken in write requests when auth is on', async () => {
    api.configure({ baseUrl: '/api', auth: true, tokenKey: 'tina4_token' });
    localStorage.setItem('tina4_token', 'my-token');

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({}),
    });

    await api.post('/items', { name: 'thing' });
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.formToken).toBe('my-token');
    expect(body.name).toBe('thing');
  });

  it('throws on error responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ error: 'Not found' }),
    });

    await expect(api.get('/missing')).rejects.toEqual(expect.objectContaining({
      status: 404,
    }));
  });

  it('runs request interceptors', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({}),
    });

    api.intercept('request', (config) => {
      config.headers['X-Custom'] = 'test';
      return config;
    });

    await api.get('/data');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-Custom']).toBe('test');
  });

  it('runs response interceptors', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ raw: true }),
    });

    const intercepted = vi.fn();
    api.intercept('response', (res) => {
      intercepted(res.status);
      return res;
    });

    await api.get('/data');
    expect(intercepted).toHaveBeenCalledWith(200);
  });

  it('handles text responses', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'text/html' }),
      text: async () => '<h1>Hello</h1>',
    });

    const data = await api.get('/page');
    expect(data).toBe('<h1>Hello</h1>');
  });
});
```

---

## 6. Integration Tests

```ts
// tests/integration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect } from '../src/core/signal';
import { html } from '../src/core/html';
import { Tina4Element } from '../src/core/component';

describe('integration: signal + html', () => {
  it('todo list — add and remove items', () => {
    const items = signal<string[]>(['Buy milk']);

    function addItem(text: string) {
      items.value = [...items.value, text];
    }

    function removeItem(index: number) {
      items.value = items.value.filter((_, i) => i !== index);
    }

    const view = html`
      <ul>${() => items.value.map((item, i) =>
        html`<li>${item} <button @click=${() => removeItem(i)}>x</button></li>`
      )}</ul>
    `;

    const container = document.createElement('div');
    container.appendChild(view);
    document.body.appendChild(container);

    expect(container.querySelectorAll('li').length).toBe(1);

    addItem('Walk dog');
    expect(container.querySelectorAll('li').length).toBe(2);

    addItem('Code tina4');
    expect(container.querySelectorAll('li').length).toBe(3);

    // Remove first item
    container.querySelector('button')?.click();
    expect(container.querySelectorAll('li').length).toBe(2);

    document.body.removeChild(container);
  });

  it('form binding — two-way data flow', () => {
    const name = signal('');
    const greeting = computed(() => name.value ? `Hello, ${name.value}!` : 'Enter your name');

    const view = html`
      <div>
        <input type="text" @input=${(e: Event) => {
          name.value = (e.target as HTMLInputElement).value;
        }}>
        <p>${greeting}</p>
      </div>
    `;

    const container = document.createElement('div');
    container.appendChild(view);
    document.body.appendChild(container);

    const p = container.querySelector('p')!;
    expect(p.textContent).toBe('Enter your name');

    // Simulate typing
    const input = container.querySelector('input')!;
    input.value = 'Andre';
    input.dispatchEvent(new Event('input'));
    expect(p.textContent).toBe('Hello, Andre!');

    document.body.removeChild(container);
  });

  it('conditional rendering — show/hide based on state', () => {
    const loggedIn = signal(false);
    const username = signal('Guest');

    const view = html`
      <div>
        ${() => loggedIn.value
          ? html`<p>Welcome, ${username}!</p><button @click=${() => { loggedIn.value = false; }}>Logout</button>`
          : html`<button @click=${() => { loggedIn.value = true; username.value = 'Andre'; }}>Login</button>`
        }
      </div>
    `;

    const container = document.createElement('div');
    container.appendChild(view);
    document.body.appendChild(container);

    // Initially logged out
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('button')?.textContent).toBe('Login');

    // Click login
    container.querySelector('button')?.click();
    expect(container.querySelector('p')?.textContent).toBe('Welcome, Andre!');

    // Click logout
    container.querySelectorAll('button')[0]?.click();
    // Back to login state
    expect(container.querySelector('p')).toBeNull();

    document.body.removeChild(container);
  });

  it('counter component — full lifecycle', () => {
    const mountCount = vi.fn();
    const unmountCount = vi.fn();

    class Counter extends Tina4Element {
      count = signal(0);
      static shadow = false;

      render() {
        return html`
          <div>
            <span class="count">${this.count}</span>
            <button class="inc" @click=${() => this.count.value++}>+</button>
            <button class="dec" @click=${() => this.count.value--}>-</button>
          </div>
        `;
      }
      onMount() { mountCount(); }
      onUnmount() { unmountCount(); }
    }

    if (!customElements.get('test-counter')) {
      customElements.define('test-counter', Counter);
    }

    const el = document.createElement('test-counter') as Counter;
    document.body.appendChild(el);

    expect(mountCount).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.count')?.textContent).toBe('0');

    el.querySelector<HTMLButtonElement>('.inc')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('1');

    el.querySelector<HTMLButtonElement>('.inc')?.click();
    el.querySelector<HTMLButtonElement>('.inc')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('3');

    el.querySelector<HTMLButtonElement>('.dec')?.click();
    expect(el.querySelector('.count')?.textContent).toBe('2');

    document.body.removeChild(el);
    expect(unmountCount).toHaveBeenCalledTimes(1);
  });
});
```

---

## 7. Bundle Size Test

```ts
// tests/size.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';

describe('bundle size', () => {
  it('core bundle is under 3KB gzipped', () => {
    const bundle = readFileSync('./dist/tina4.esm.js');
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`Core bundle: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(3);
  });

  it('full bundle (with PWA) is under 4KB gzipped', () => {
    const bundle = readFileSync('./dist/tina4.full.esm.js');
    const gzipped = gzipSync(bundle);
    const sizeKB = gzipped.length / 1024;

    console.log(`Full bundle: ${bundle.length}B raw, ${gzipped.length}B gzip (${sizeKB.toFixed(2)}KB)`);
    expect(sizeKB).toBeLessThan(4);
  });
});
```
