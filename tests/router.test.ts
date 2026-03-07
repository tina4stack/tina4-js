import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { route, router, navigate, _resetRouter } from '../src/router/router';
import { html } from '../src/core/html';

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
