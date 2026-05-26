/**
 * Integration smoke test for examples/gallery/10-persistent-prefs.html
 *
 * The gallery example wires six persisted signals into a UI. This test
 * exercises the same persist() calls — same keys, same options, same
 * value shapes — and confirms that:
 *
 *   1. Every signal writes its value to localStorage under its key.
 *   2. A fresh "reload" (a new persist() call against the same keys)
 *      reads the prior values back.
 *   3. The cross-tab cart accepts a synthetic storage event and
 *      updates without a refresh.
 *   4. clearPersistedKeys() wipes the demo keys.
 *
 * It also asserts the example HTML still references the six expected
 * keys, so a rename in the example would surface here as a test
 * failure rather than a silent drift.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { signal } from '../src/core/signal';
import {
  persist,
  clearPersistedKeys,
  _resetWarnedKeys,
} from '../src/storage/persist';

const DEMO_KEYS = [
  'demo.theme',
  'demo.fontSize',
  'demo.sidebarOpen',
  'demo.filter',
  'demo.draft',
  'demo.cart',
] as const;

describe('gallery: 10-persistent-prefs', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetWarnedKeys();
  });
  afterEach(() => {
    localStorage.clear();
  });

  // ── 1. The HTML still uses the documented keys ───────────────────

  it('the example HTML references every documented demo key', () => {
    const html = readFileSync(
      'examples/gallery/10-persistent-prefs.html',
      'utf-8',
    );
    for (const key of DEMO_KEYS) {
      expect(html, `${key} should appear in the example`).toContain(key);
    }
  });

  it('the example HTML wires the credential-warning demo and the wipe button', () => {
    const html = readFileSync(
      'examples/gallery/10-persistent-prefs.html',
      'utf-8',
    );
    // The bad-token persist() must be there, the warning copy must be there,
    // and clearPersistedKeys() with all seven demo keys must be there.
    expect(html).toContain("demo.authToken");
    expect(html).toContain('eyJhbGciOiJIUzI1NiJ9');   // JWT-shaped value
    expect(html).toContain('clearPersistedKeys');
    expect(html).toContain('localStorage is XSS-readable');
  });

  // ── 2. Six persisted signals behave like the demo expects ────────

  it('every demo signal writes its value to localStorage', () => {
    const theme       = persist(signal('dark'),    { key: 'demo.theme' });
    const fontSize    = persist(signal(16),        { key: 'demo.fontSize' });
    const sidebarOpen = persist(signal(true),      { key: 'demo.sidebarOpen' });
    const filter      = persist(signal('all'),     { key: 'demo.filter' });
    const draft       = persist(signal(''),        { key: 'demo.draft' });
    const cart        = persist(signal<{ id: number; name: string }[]>([]), {
      key: 'demo.cart',
      syncTabs: true,
    });

    theme.value = 'light';
    fontSize.value = 20;
    sidebarOpen.value = false;
    filter.value = 'starred';
    draft.value = 'half written message';
    cart.value = [{ id: 1, name: 'Item 1' }];

    for (const key of DEMO_KEYS) {
      const raw = localStorage.getItem(key);
      expect(raw, `${key} must be written to localStorage`).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveProperty('v', 1);
      expect(parsed).toHaveProperty('value');
    }
  });

  // ── 3. A "reload" reads everything back ──────────────────────────

  it('a fresh persist() against the same keys reads the prior values', () => {
    // Round 1: write values
    {
      const theme    = persist(signal('dark'),    { key: 'demo.theme' });
      const filter   = persist(signal('all'),     { key: 'demo.filter' });
      const draft    = persist(signal(''),        { key: 'demo.draft' });
      theme.value  = 'light';
      filter.value = 'archived';
      draft.value  = 'unfinished draft';
      theme.dispose();
      filter.dispose();
      draft.dispose();
    }

    // Round 2: simulate a page reload — new signals against the same keys
    {
      const theme  = persist(signal('dark'),  { key: 'demo.theme' });
      const filter = persist(signal('all'),   { key: 'demo.filter' });
      const draft  = persist(signal(''),      { key: 'demo.draft' });
      expect(theme.value).toBe('light');
      expect(filter.value).toBe('archived');
      expect(draft.value).toBe('unfinished draft');
    }
  });

  // ── 4. Cross-tab sync: synthetic storage event updates the signal ──

  it('the cart signal accepts a storage event from a "second tab"', () => {
    const cart = persist(signal<{ id: number; name: string }[]>([]), {
      key: 'demo.cart',
      syncTabs: true,
    });
    expect(cart.value).toEqual([]);

    // Simulate a write from a second tab
    const newCart = [{ id: 1, name: 'From other tab' }];
    const envelope = JSON.stringify({ v: 1, value: newCart });
    localStorage.setItem('demo.cart', envelope);

    // Fire the StorageEvent that a real browser would deliver
    const event = new StorageEvent('storage', {
      key: 'demo.cart',
      newValue: envelope,
      oldValue: JSON.stringify({ v: 1, value: [] }),
      storageArea: localStorage,
      url: 'http://localhost',
    });
    window.dispatchEvent(event);

    expect(cart.value).toEqual(newCart);
  });

  // ── 5. The credential-warning demo really fires a warning ─────────

  it('persisting a JWT-shaped value warns loudly', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef123456_FAKE_FAKE_FAKE_FAKE';
      persist(signal(jwt), { key: 'demo.authToken' });
      // The key name "authToken" alone is enough; the JWT shape doubles up.
      const credentialCalls = warn.mock.calls.filter(
        (c) =>
          typeof c[0] === 'string' &&
          (c[0].includes('looks like a credential') ||
            c[0].includes('looks like a JWT')),
      );
      expect(credentialCalls.length).toBeGreaterThanOrEqual(1);
    } finally {
      warn.mockRestore();
    }
  });

  // ── 6. The wipe button removes every demo key ────────────────────

  it('clearPersistedKeys() removes every demo key the example uses', () => {
    // Seed all seven keys (the six prefs + the bad token from the warning demo)
    const all = [...DEMO_KEYS, 'demo.authToken'];
    for (const key of all) {
      localStorage.setItem(key, JSON.stringify({ v: 1, value: 'x' }));
    }
    // Also a non-demo key that must survive
    localStorage.setItem('unrelated', JSON.stringify({ v: 1, value: 'keep' }));

    clearPersistedKeys([...all]);

    for (const key of all) {
      expect(localStorage.getItem(key), `${key} should be wiped`).toBeNull();
    }
    expect(localStorage.getItem('unrelated')).not.toBeNull();
  });

  // ── 7. The gallery bundle ships persist + clearPersistedKeys ─────

  it('the gallery bundle exposes persist and clearPersistedKeys', () => {
    const bundle = readFileSync('examples/gallery/tina4.bundle.js', 'utf-8');
    // The minified IIFE assigns to the global namespace; look for the
    // export names as identifiers in the source.
    expect(bundle).toMatch(/clearPersistedKeys/);
    expect(bundle).toMatch(/persist/);
  });
});
