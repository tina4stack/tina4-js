# Module 6: PWA (Optional)

## Purpose
Auto-generate service worker and manifest.json from a simple config.
Tree-shakeable — if you don't import `pwa`, it's not in your bundle.

## API

```ts
import { pwa } from 'tina4';

pwa.register({
  name: 'My App',
  shortName: 'App',
  themeColor: '#1a1a2e',
  backgroundColor: '#ffffff',
  display: 'standalone',
  icon: '/icons/icon-512.png',    // auto-generates sizes
  cacheStrategy: 'network-first', // 'cache-first' | 'network-first' | 'stale-while-revalidate'
  precache: ['/offline', '/css/default.css'],
  offlineRoute: '/offline',       // route to show when offline
});
```

## What It Does

### 1. Generates manifest.json at runtime
Injects a `<link rel="manifest">` pointing to a blob URL with the manifest data.
No build step needed.

### 2. Registers Service Worker
Generates a minimal SW script as a blob URL (or from a file if provided).
The SW implements the chosen cache strategy.

### 3. Cache Strategies

**Cache-First**: Serve from cache, fall back to network. Best for static assets.
**Network-First**: Try network, fall back to cache. Best for API-driven apps.
**Stale-While-Revalidate**: Serve from cache immediately, update cache in background.

### 4. Offline Fallback
When offline and no cache match, renders the `offlineRoute` component.

### 5. Install Prompt Component
```html
<tina4-install>
  <!-- Custom install button content -->
  <button>Install App</button>
</tina4-install>
```

Shows only when the `beforeinstallprompt` event fires. Handles the install flow.

## Implementation Sketch

```ts
export const pwa = {
  register(config: PWAConfig) {
    // 1. Manifest
    const manifest = {
      name: config.name,
      short_name: config.shortName,
      theme_color: config.themeColor,
      background_color: config.backgroundColor,
      display: config.display ?? 'standalone',
      start_url: '/',
      icons: generateIconSizes(config.icon),
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = URL.createObjectURL(blob);
    document.head.appendChild(link);

    // 2. Service Worker
    const swCode = generateSW(config);
    const swBlob = new Blob([swCode], { type: 'text/javascript' });
    navigator.serviceWorker?.register(URL.createObjectURL(swBlob));

    // 3. Theme color meta tag
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', config.themeColor);
  }
};

function generateSW(config: PWAConfig): string {
  return `
    const CACHE = 'tina4-v1';
    const PRECACHE = ${JSON.stringify(config.precache ?? [])};
    const STRATEGY = '${config.cacheStrategy ?? 'network-first'}';

    self.addEventListener('install', (e) => {
      e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
    });

    self.addEventListener('fetch', (e) => {
      if (STRATEGY === 'cache-first') {
        e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
      } else if (STRATEGY === 'stale-while-revalidate') {
        e.respondWith(caches.match(e.request).then(r => {
          const f = fetch(e.request).then(res => {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
            return res;
          });
          return r || f;
        }));
      } else {
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
      }
    });
  `;
}
```

## Size Estimate
- Raw: ~800B
- Minified: ~450B
- Gzipped: ~350-400B
- Tree-shaken away if not imported

## Deployment Considerations

### Standalone
Service worker is auto-generated. Works on any HTTPS host.

### Embedded in tina4-php/python
The SW file should be served from the root (`/sw.js`). Options:
1. Build step copies `sw.js` to `src/public/sw.js`
2. Backend serves it via a route (PHP/Python can register `/sw.js` route)
3. Use the blob URL approach (no server changes needed, but less cache control)

Manifest can also be a physical file at `src/public/manifest.json` for
better control over icons and splash screens.
