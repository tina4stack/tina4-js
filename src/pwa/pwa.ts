/**
 * Tina4 PWA — Service worker registration and manifest generation.
 *
 * Optional module — tree-shaken away if not imported.
 */

export interface PWAConfig {
  name: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  icon?: string;
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  precache?: string[];
  offlineRoute?: string;
}

// ── Service Worker Template ─────────────────────────────────────────

function generateSW(config: PWAConfig): string {
  const strategy = config.cacheStrategy ?? 'network-first';
  const precache = JSON.stringify(config.precache ?? []);
  const offline = config.offlineRoute ? `'${config.offlineRoute}'` : 'null';

  return `
const CACHE = 'tina4-v1';
const PRECACHE = ${precache};
const OFFLINE = ${offline};

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  ${strategy === 'cache-first' ? `
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(req, clone));
      return res;
    })).catch(() => OFFLINE ? caches.match(OFFLINE) : new Response('Offline', { status: 503 }))
  );` : strategy === 'stale-while-revalidate' ? `
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req).then((res) => {
        caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      });
      return cached || fetched;
    }).catch(() => OFFLINE ? caches.match(OFFLINE) : new Response('Offline', { status: 503 }))
  );` : `
  e.respondWith(
    fetch(req).then((res) => {
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(req, clone));
      return res;
    }).catch(() => caches.match(req).then((cached) =>
      cached || (OFFLINE ? caches.match(OFFLINE) : new Response('Offline', { status: 503 }))
    ))
  );`}
});
`.trim();
}

// ── Manifest Generation ─────────────────────────────────────────────

function generateManifest(config: PWAConfig): object {
  const manifest: Record<string, unknown> = {
    name: config.name,
    short_name: config.shortName ?? config.name,
    start_url: '/',
    display: config.display ?? 'standalone',
    background_color: config.backgroundColor ?? '#ffffff',
    theme_color: config.themeColor ?? '#000000',
  };

  if (config.icon) {
    manifest.icons = [
      { src: config.icon, sizes: '192x192', type: 'image/png' },
      { src: config.icon, sizes: '512x512', type: 'image/png' },
    ];
  }

  return manifest;
}

// ── Public API ──────────────────────────────────────────────────────

export const pwa = {
  register(config: PWAConfig): void {
    // 1. Inject manifest
    const manifest = generateManifest(config);
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = URL.createObjectURL(blob);
    document.head.appendChild(link);

    // 2. Set theme-color meta tag
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = config.themeColor ?? '#000000';

    // 3. Register service worker
    if ('serviceWorker' in navigator) {
      const swCode = generateSW(config);
      const swBlob = new Blob([swCode], { type: 'text/javascript' });
      const swUrl = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swUrl).catch((err) => {
        console.warn('[tina4] Service worker registration failed:', err);
      });
    }
  },

  /** Generate SW code as a string (for build tools that write sw.js to disk). */
  generateServiceWorker(config: PWAConfig): string {
    return generateSW(config);
  },

  /** Generate manifest object (for build tools that write manifest.json to disk). */
  generateManifest(config: PWAConfig): object {
    return generateManifest(config);
  },
};
