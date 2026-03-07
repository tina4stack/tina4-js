import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../src/api/fetch';

describe('api', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    localStorage.clear();
    api._reset();
    api.configure({ baseUrl: '/api', auth: false, tokenKey: 'tina4_token' });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function mockJsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}) {
    const h = new Headers({ 'Content-Type': 'application/json', ...headers });
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: h,
      json: async () => data,
      text: async () => JSON.stringify(data),
    };
  }

  function mockTextResponse(text: string, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ 'Content-Type': 'text/html' }),
      json: async () => { throw new Error('not json'); },
      text: async () => text,
    };
  }

  // ── GET ────────────────────────────────────────────────────────

  it('makes GET requests to baseUrl + path', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse([{ id: 1 }]));

    const data = await api.get('/users');
    expect(data).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/users', expect.objectContaining({ method: 'GET' }));
  });

  it('replaces path parameters in GET', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ id: 42 }));

    await api.get('/users/{id}', { id: 42 });
    expect(fetchMock).toHaveBeenCalledWith('/api/users/42', expect.any(Object));
  });

  it('handles text responses', async () => {
    fetchMock.mockResolvedValue(mockTextResponse('<h1>Hello</h1>'));

    const data = await api.get('/page');
    expect(data).toBe('<h1>Hello</h1>');
  });

  // ── POST ───────────────────────────────────────────────────────

  it('makes POST requests with JSON body', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ id: 2, name: 'Test' }, 201));

    const data = await api.post('/users', { name: 'Test' });
    expect(data).toEqual({ id: 2, name: 'Test' });

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Test' });
  });

  // ── PUT / PATCH / DELETE ───────────────────────────────────────

  it('makes PUT requests', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ ok: true }));
    await api.put('/users/1', { name: 'Updated' });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('PUT');
  });

  it('makes PATCH requests', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ ok: true }));
    await api.patch('/users/1', { name: 'Patched' });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('PATCH');
  });

  it('makes DELETE requests', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ ok: true }));
    await api.delete('/users/1');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });

  // ── Auth ───────────────────────────────────────────────────────

  it('sends Bearer token when auth is enabled', async () => {
    api.configure({ baseUrl: '/api', auth: true, tokenKey: 'tina4_token' });
    localStorage.setItem('tina4_token', 'my-jwt');
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await api.get('/protected');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer my-jwt');
  });

  it('rotates token from FreshToken header', async () => {
    api.configure({ baseUrl: '/api', auth: true, tokenKey: 'tina4_token' });
    localStorage.setItem('tina4_token', 'old-token');
    fetchMock.mockResolvedValue(mockJsonResponse({}, 200, { 'FreshToken': 'new-token' }));

    await api.get('/data');
    expect(localStorage.getItem('tina4_token')).toBe('new-token');
  });

  it('includes formToken in write request body when auth is on', async () => {
    api.configure({ baseUrl: '/api', auth: true, tokenKey: 'tina4_token' });
    localStorage.setItem('tina4_token', 'my-token');
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await api.post('/items', { name: 'thing' });
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.formToken).toBe('my-token');
    expect(body.name).toBe('thing');
  });

  it('does not send auth header when auth is disabled', async () => {
    api.configure({ baseUrl: '/api', auth: false });
    localStorage.setItem('tina4_token', 'should-not-appear');
    fetchMock.mockResolvedValue(mockJsonResponse({}));

    await api.get('/public');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  // ── Errors ─────────────────────────────────────────────────────

  it('throws on 4xx/5xx responses', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ error: 'Not found' }, 404));

    await expect(api.get('/missing')).rejects.toEqual(expect.objectContaining({
      status: 404,
    }));
  });

  it('throws on 500 responses', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ error: 'Server error' }, 500));

    await expect(api.post('/crash', {})).rejects.toEqual(expect.objectContaining({
      status: 500,
    }));
  });

  // ── Interceptors ───────────────────────────────────────────────

  it('runs request interceptors', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    api.intercept('request', (config) => {
      config.headers['X-Custom'] = 'test';
      return config;
    });

    await api.get('/data');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-Custom']).toBe('test');
  });

  it('runs response interceptors', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ raw: true }));
    const intercepted = vi.fn();
    api.intercept('response', (res) => {
      intercepted(res.status);
      return res;
    });

    await api.get('/data');
    expect(intercepted).toHaveBeenCalledWith(200);
  });

  it('chains multiple request interceptors', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({}));
    api.intercept('request', (config) => { config.headers['X-First'] = '1'; return config; });
    api.intercept('request', (config) => { config.headers['X-Second'] = '2'; return config; });

    await api.get('/data');
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-First']).toBe('1');
    expect(opts.headers['X-Second']).toBe('2');
  });
});
