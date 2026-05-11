/**
 * Vitest setup — polyfill localStorage for Node.js v22+ where the
 * built-in localStorage stub (from --localstorage-file) lacks methods
 * and can shadow happy-dom's proper implementation.
 */
if (typeof globalThis.localStorage === 'undefined' ||
    typeof globalThis.localStorage.clear !== 'function') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
  } as Storage;
}
