import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pwa } from '../src/pwa/pwa';

describe('pwa', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('injects a manifest link tag', () => {
    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: vi.fn().mockResolvedValue({}) },
      configurable: true,
    });

    pwa.register({
      name: 'Test App',
      shortName: 'Test',
      themeColor: '#ff0000',
    });

    const link = document.head.querySelector('link[rel="manifest"]');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBeTruthy();
  });

  it('sets theme-color meta tag', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: vi.fn().mockResolvedValue({}) },
      configurable: true,
    });

    pwa.register({
      name: 'Test App',
      themeColor: '#1a1a2e',
    });

    const meta = document.head.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    expect(meta).toBeTruthy();
    expect(meta?.content).toBe('#1a1a2e');
  });

  it('reuses existing theme-color meta tag', () => {
    const existing = document.createElement('meta');
    existing.name = 'theme-color';
    existing.content = '#old';
    document.head.appendChild(existing);

    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: vi.fn().mockResolvedValue({}) },
      configurable: true,
    });

    pwa.register({ name: 'App', themeColor: '#new' });

    const metas = document.head.querySelectorAll('meta[name="theme-color"]');
    expect(metas.length).toBe(1);
    expect((metas[0] as HTMLMetaElement).content).toBe('#new');
  });

  it('generates manifest JSON with correct fields', () => {
    const manifest = pwa.generateManifest({
      name: 'My App',
      shortName: 'App',
      themeColor: '#123456',
      backgroundColor: '#ffffff',
      display: 'standalone',
      icon: '/icon.png',
    });

    expect(manifest).toEqual({
      name: 'My App',
      short_name: 'App',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#123456',
      icons: [
        { src: '/icon.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  });

  it('uses defaults for optional manifest fields', () => {
    const manifest = pwa.generateManifest({ name: 'Minimal' }) as Record<string, unknown>;

    expect(manifest.short_name).toBe('Minimal'); // defaults to name
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#ffffff');
    expect(manifest.theme_color).toBe('#000000');
    expect(manifest).not.toHaveProperty('icons'); // no icon = no icons array
  });

  it('generates service worker code for network-first strategy', () => {
    const sw = pwa.generateServiceWorker({
      name: 'App',
      cacheStrategy: 'network-first',
      precache: ['/'],
    });

    expect(sw).toContain('fetch(req)');
    expect(sw).toContain('caches.match(req)');
    expect(sw).toContain('["/"]'); // precache list
  });

  it('generates service worker code for cache-first strategy', () => {
    const sw = pwa.generateServiceWorker({
      name: 'App',
      cacheStrategy: 'cache-first',
    });

    expect(sw).toContain('caches.match(req)');
    expect(sw).toContain('fetch(req)');
  });

  it('generates service worker code for stale-while-revalidate strategy', () => {
    const sw = pwa.generateServiceWorker({
      name: 'App',
      cacheStrategy: 'stale-while-revalidate',
    });

    expect(sw).toContain('caches.match(req)');
    expect(sw).toContain('fetch(req)');
  });

  it('includes offline route in service worker', () => {
    const sw = pwa.generateServiceWorker({
      name: 'App',
      offlineRoute: '/offline',
    });

    expect(sw).toContain("'/offline'");
  });
});
