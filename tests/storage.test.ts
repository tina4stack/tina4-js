/**
 * tina4-js/storage — persist() and clearPersistedKeys()
 *
 * Read STORAGE.md before changing these tests. The safety guarantees are
 * the point of this module; they are verified here.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '../src/core/signal';
import {
  persist,
  clearPersistedKeys,
  _resetWarnedKeys,
} from '../src/storage/persist';

describe('persist()', () => {
  beforeEach(() => {
    localStorage.clear();
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    _resetWarnedKeys();
  });

  // ── 1. Reading and writing ───────────────────────────────────────

  it('reads an existing stored value on creation', () => {
    localStorage.setItem('theme', JSON.stringify({ v: 1, value: 'dark' }));
    const theme = persist(signal('light'), { key: 'theme' });
    expect(theme.value).toBe('dark');
  });

  it('writes signal updates to storage', () => {
    const theme = persist(signal('light'), { key: 'theme' });
    theme.value = 'dark';
    const raw = localStorage.getItem('theme');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({ v: 1, value: 'dark' });
  });

  it('writes the initial value on creation when nothing is stored', () => {
    const count = persist(signal(7), { key: 'count' });
    expect(JSON.parse(localStorage.getItem('count')!)).toEqual({ v: 1, value: 7 });
    expect(count.value).toBe(7);
  });

  it('persists objects and arrays', () => {
    const cart = persist(signal<{ id: number; name: string }[]>([]), { key: 'cart' });
    cart.value = [{ id: 1, name: 'Widget' }, { id: 2, name: 'Gadget' }];
    const stored = JSON.parse(localStorage.getItem('cart')!);
    expect(stored.value).toEqual([{ id: 1, name: 'Widget' }, { id: 2, name: 'Gadget' }]);
  });

  // ── 2. Storage type ──────────────────────────────────────────────

  it('uses sessionStorage when storage:"session"', () => {
    const draft = persist(signal('hello'), { key: 'draft', storage: 'session' });
    draft.value = 'hello world';
    expect(sessionStorage.getItem('draft')).not.toBeNull();
    expect(localStorage.getItem('draft')).toBeNull();
  });

  // ── 3. SSR safety ────────────────────────────────────────────────

  it('is a no-op when localStorage is unavailable', () => {
    const realLocal = globalThis.localStorage;
    // Pretend localStorage does not exist
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });
    try {
      const theme = persist(signal('light'), { key: 'theme' });
      // No crash. The signal still works in memory.
      theme.value = 'dark';
      expect(theme.value).toBe('dark');
      // clear()/dispose() are still callable
      theme.clear();
      theme.dispose();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: realLocal, configurable: true });
    }
  });

  // ── 4. Quota fallback ────────────────────────────────────────────

  it('logs and continues when setItem throws (quota exceeded)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = localStorage.setItem.bind(localStorage);
    let calls = 0;
    localStorage.setItem = vi.fn((k: string, v: string) => {
      calls++;
      if (calls > 1) throw new DOMException('quota exceeded', 'QuotaExceededError');
      original(k, v);
    }) as typeof localStorage.setItem;
    try {
      const big = persist(signal('a'), { key: 'big' });
      // Initial write succeeds; second one throws and is logged.
      big.value = 'b';
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('failed to write key "big"'),
        expect.anything(),
      );
      expect(big.value).toBe('b');   // signal still updated in memory
    } finally {
      localStorage.setItem = original;
      warn.mockRestore();
    }
  });

  // ── 5. Custom serializer ─────────────────────────────────────────

  it('round-trips a Date through a custom serializer', () => {
    const iso = '2026-05-22T10:30:00.000Z';
    localStorage.setItem('lastVisit', JSON.stringify({ v: 1, value: iso }));
    const lastVisit = persist(signal(new Date(0)), {
      key: 'lastVisit',
      serializer: {
        write: (d: Date) => d.toISOString(),
        read: (s: string) => new Date(s),
      },
    });
    expect(lastVisit.value).toBeInstanceOf(Date);
    expect(lastVisit.value.toISOString()).toBe(iso);
  });

  // ── 6. Versioning and migration ──────────────────────────────────

  it('runs migrate() when stored version differs', () => {
    localStorage.setItem('user', JSON.stringify({ v: 1, value: { name: 'Alice' } }));
    const user = persist(signal({ firstName: '', lastName: '' }), {
      key: 'user',
      version: 2,
      migrate: (old) => ({
        firstName: (old as { name?: string }).name ?? '',
        lastName: '',
      }),
    });
    expect(user.value).toEqual({ firstName: 'Alice', lastName: '' });
  });

  it('discards the stored value when version differs and no migrate is given', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      localStorage.setItem('user', JSON.stringify({ v: 1, value: 'old' }));
      const user = persist(signal('default'), { key: 'user', version: 2 });
      expect(user.value).toBe('default');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('stored version 1 does not match current 2'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  // ── 7. Credential-shape warnings ─────────────────────────────────

  it('warns when the key name looks like a credential', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      persist(signal('xyz'), { key: 'authToken' });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('looks like a credential'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('warns when the value looks like a JWT', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef1234567890XYZUVW123456';
      persist(signal(jwt), { key: 'preference' });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('looks like a JWT'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('silenceCredentialWarning suppresses the warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      persist(signal('#7b1fa2'), {
        key: 'tokenColor',
        silenceCredentialWarning: true,
      });
      // No warning, even though "token" appears in the key
      const credentialWarn = warn.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('looks like a credential'),
      );
      expect(credentialWarn).toBeUndefined();
    } finally {
      warn.mockRestore();
    }
  });

  it('warns only once per key, however many writes happen', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const t = persist(signal('a'), { key: 'apiToken' });
      t.value = 'b';
      t.value = 'c';
      t.value = 'd';
      const credentialCalls = warn.mock.calls.filter(
        (c) => typeof c[0] === 'string' && c[0].includes('looks like a credential'),
      );
      expect(credentialCalls.length).toBe(1);
    } finally {
      warn.mockRestore();
    }
  });

  // ── 8. clear() and dispose() ─────────────────────────────────────

  it('clear() removes the key from storage but keeps the signal value', () => {
    const cart = persist(signal<string[]>([]), { key: 'cart' });
    cart.value = ['a', 'b'];
    expect(localStorage.getItem('cart')).not.toBeNull();
    cart.clear();
    expect(localStorage.getItem('cart')).toBeNull();
    expect(cart.value).toEqual(['a', 'b']);
  });

  it('dispose() stops further writes', () => {
    const cart = persist(signal('hello'), { key: 'cart' });
    cart.dispose();
    cart.value = 'goodbye';
    // Storage still has the value from BEFORE dispose, not after
    const stored = JSON.parse(localStorage.getItem('cart')!);
    expect(stored.value).toBe('hello');
  });

  // ── 9. Validation ────────────────────────────────────────────────

  it('throws when key is missing or not a string', () => {
    expect(() =>
      // @ts-expect-error intentional: missing key
      persist(signal(0), {}),
    ).toThrow(/key is required/);
    expect(() =>
      // @ts-expect-error intentional: wrong type
      persist(signal(0), { key: 123 }),
    ).toThrow(/key is required/);
  });

  // ── 10. clearPersistedKeys() ─────────────────────────────────────

  it('clearPersistedKeys() wipes a list of keys', () => {
    localStorage.setItem('cart', JSON.stringify({ v: 1, value: [] }));
    localStorage.setItem('lastFilter', JSON.stringify({ v: 1, value: 'all' }));
    localStorage.setItem('keepMe', JSON.stringify({ v: 1, value: 'yes' }));

    clearPersistedKeys(['cart', 'lastFilter']);

    expect(localStorage.getItem('cart')).toBeNull();
    expect(localStorage.getItem('lastFilter')).toBeNull();
    expect(localStorage.getItem('keepMe')).not.toBeNull();
  });

  it('clearPersistedKeys() is a no-op when storage is unavailable', () => {
    const realLocal = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true });
    try {
      expect(() => clearPersistedKeys(['anything'])).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: realLocal, configurable: true });
    }
  });

  // ── 11. Backward-compatibility with bare stored values ──────────

  it('reads a legacy bare-value stored entry (no envelope)', () => {
    // Old code wrote JSON.stringify(value) directly, no { v, value } wrapper.
    localStorage.setItem('theme', JSON.stringify('dark'));
    const theme = persist(signal('light'), { key: 'theme' });
    expect(theme.value).toBe('dark');
  });
});
