import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { route, router, navigate, _resetRouter } from '../src/router/router';
import { html } from '../src/core/html';
import { signal } from '../src/core/signal';

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  _resetRouter();
  // Reset hash
  history.replaceState(null, '', '/');
  location.hash = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('router — hash mode', () => {
  it('renders a matched route', () => {
    route('/', () => html`<h1>Home</h1>`);
    router.start({ target: '#root', mode: 'hash' });

    // Set hash and trigger
    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(document.querySelector('#root h1')?.textContent).toBe('Home');
  });

  it('extracts single path parameter', () => {
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
      return html`<span>${params.userId}-${params.postId}</span>`;
    });
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/user/5/post/99';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(captured.userId).toBe('5');
    expect(captured.postId).toBe('99');
  });

  it('matches wildcard / 404 route last', () => {
    route('/', () => html`<p>Home</p>`);
    route('*', () => html`<p>Not Found</p>`);
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/nonexistent';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(document.querySelector('#root p')?.textContent).toBe('Not Found');
  });

  it('navigate() updates the hash', () => {
    route('/about', () => html`<p>About</p>`);
    router.start({ target: '#root', mode: 'hash' });
    navigate('/about');
    expect(location.hash).toBe('#/about');
  });

  it('renders string content', () => {
    route('/text', () => '<p>Plain text</p>');
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/text';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(document.querySelector('#root p')?.textContent).toBe('Plain text');
  });
});

describe('router — guards', () => {
  it('allows route when guard returns true', () => {
    route('/dashboard', {
      guard: () => true,
      handler: () => html`<p>Dashboard</p>`,
    });
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/dashboard';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(document.querySelector('#root p')?.textContent).toBe('Dashboard');
  });

  it('redirects when guard returns a path string', () => {
    route('/login', () => html`<p>Login</p>`);
    route('/admin', {
      guard: () => '/login',
      handler: () => html`<p>Admin</p>`,
    });
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/admin';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(location.hash).toBe('#/login');
    expect(document.querySelector('#root p')?.textContent).toBe('Login');
  });

  it('blocks route when guard returns false', () => {
    route('/secret', {
      guard: () => false,
      handler: () => html`<p>Secret</p>`,
    });
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/secret';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    // Should not render
    expect(document.querySelector('#root p')).toBeNull();
  });
});

describe('router — events', () => {
  it('fires change event on navigation', () => {
    const fn = vi.fn();
    route('/', () => html`<p>Home</p>`);
    route('/about', () => html`<p>About</p>`);
    router.on('change', fn);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/about');

    const lastCall = fn.mock.calls[fn.mock.calls.length - 1][0];
    expect(lastCall.path).toBe('/about');
  });

  it('returns unsubscribe function', () => {
    const fn = vi.fn();
    route('/', () => html`<p>Home</p>`);
    route('/a', () => html`<p>A</p>`);
    route('/b', () => html`<p>B</p>`);

    const unsub = router.on('change', fn);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/a');
    const callCount = fn.mock.calls.length;

    unsub();
    navigate('/b');
    expect(fn.mock.calls.length).toBe(callCount); // no additional calls
  });
});

describe('router — route matching priority', () => {
  it('matches exact routes before parameterized', () => {
    route('/users', () => html`<p>List</p>`);
    route('/users/{id}', () => html`<p>Detail</p>`);
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/users';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.querySelector('#root p')?.textContent).toBe('List');
  });

  it('matches parameterized routes', () => {
    route('/users', () => html`<p>List</p>`);
    route('/users/{id}', ({ id }) => html`<p>User ${id}</p>`);
    router.start({ target: '#root', mode: 'hash' });

    location.hash = '#/users/42';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.querySelector('#root p')?.textContent).toBe('User 42');
  });
});

describe('router — error handling', () => {
  it('throws when target element not found', () => {
    expect(() => {
      router.start({ target: '#nonexistent', mode: 'hash' });
    }).toThrow(/target '#nonexistent' not found/);
  });
});

describe('router — reactive effect cleanup', () => {
  it('does not duplicate content when navigating away and back with reactive templates', () => {
    const count = signal(0);
    route('/', () => html`<p>Count: ${count}</p>`);
    route('/other', () => html`<p>Other</p>`);
    router.start({ target: '#root', mode: 'hash' });

    // Initial render
    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(document.querySelectorAll('#root p').length).toBe(1);

    // Navigate away
    navigate('/other');
    expect(document.querySelector('#root p')?.textContent).toBe('Other');

    // Navigate back — should be exactly 1 copy, not 2
    navigate('/');
    const paragraphs = document.querySelectorAll('#root p');
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0].textContent).toBe('Count: 0');
  });

  it('disposes old route effects so stale subscriptions do not fire', () => {
    const count = signal(0);
    let renderCount = 0;

    route('/', () => {
      renderCount++;
      return html`<p>${() => `Val:${count.value}`}</p>`;
    });
    route('/other', () => html`<p>Other</p>`);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/');
    expect(renderCount).toBe(2); // 1 from start() + 1 from navigate()

    // Navigate away — old effects should be disposed
    navigate('/other');

    // Update signal — should NOT trigger the disposed effect from route '/'
    const before = document.querySelector('#root p')?.textContent;
    count.value = 99;
    const after = document.querySelector('#root p')?.textContent;

    // The "Other" page content should be unchanged (old effect is dead)
    expect(before).toBe('Other');
    expect(after).toBe('Other');
  });

  it('replaces content atomically via replaceChildren (no appendChild accumulation)', () => {
    route('/', () => html`<p>Home</p>`);
    route('/a', () => html`<p>Page A</p>`);
    route('/b', () => html`<p>Page B</p>`);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/');
    navigate('/a');
    navigate('/b');
    navigate('/');
    navigate('/a');

    // After multiple navigations, should always be exactly 1 child paragraph
    const paragraphs = document.querySelectorAll('#root p');
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0].textContent).toBe('Page A');
  });

  it('handles async route handlers without duplicating content', async () => {
    route('/', () => html`<p>Home</p>`);
    route('/async', () => Promise.resolve(html`<p>Async Page</p>`));
    router.start({ target: '#root', mode: 'hash' });

    navigate('/');
    navigate('/async');

    // Wait for promise to resolve
    await new Promise((r) => setTimeout(r, 10));

    const paragraphs = document.querySelectorAll('#root p');
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0].textContent).toBe('Async Page');
  });

  it('discards stale async route when navigated away before resolve', async () => {
    let resolveAsync: (v: unknown) => void;
    const pending = new Promise((r) => { resolveAsync = r; });

    route('/', () => html`<p>Home</p>`);
    route('/slow', () => pending);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/slow');  // starts async handler
    navigate('/');      // navigate away before it resolves

    expect(document.querySelector('#root p')?.textContent).toBe('Home');

    // Now the slow route resolves — should NOT overwrite Home
    resolveAsync!(html`<p>Slow Page</p>`);
    await new Promise((r) => setTimeout(r, 10));

    expect(document.querySelector('#root p')?.textContent).toBe('Home');
    expect(document.querySelectorAll('#root p').length).toBe(1);
  });

  it('signal updates from old route do not affect new route DOM', () => {
    const count = signal(0);
    route('/', () => html`<div>${() => html`<p>Count: ${count.value}</p>`}</div>`);
    route('/other', () => html`<p>Other page</p>`);
    router.start({ target: '#root', mode: 'hash' });

    navigate('/');
    expect(document.querySelector('#root p')?.textContent).toBe('Count: 0');

    // Navigate away — all effects from '/' should be fully disposed
    navigate('/other');
    expect(document.querySelector('#root p')?.textContent).toBe('Other page');

    // Update signal — should NOT resurrect old route's DOM or corrupt new route
    count.value = 100;
    expect(document.querySelector('#root p')?.textContent).toBe('Other page');
    expect(document.querySelectorAll('#root p').length).toBe(1);
  });

  it('navigating away and back multiple times does not accumulate effects', () => {
    const count = signal(0);
    let handlerCalls = 0;

    route('/', () => {
      handlerCalls++;
      return html`<div>${() => `Val:${count.value}`}</div>`;
    });
    route('/b', () => html`<p>B</p>`);
    router.start({ target: '#root', mode: 'hash' });

    // Bounce back and forth 5 times
    for (let i = 0; i < 5; i++) {
      navigate('/');
      navigate('/b');
    }
    navigate('/');

    // Now update signal — should only trigger ONE active effect, not accumulated ones
    const root = document.querySelector('#root')!;
    count.value = 42;
    expect(root.textContent).toBe('Val:42');

    // Only one text node with Val:42, not multiple
    const divs = root.querySelectorAll('div');
    expect(divs.length).toBe(1);
  });
});
