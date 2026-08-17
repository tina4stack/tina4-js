/**
 * tina4-js/storage — Persistent signals.
 *
 * Wrap a signal with persist() to read its initial value from localStorage
 * (or sessionStorage) and write every change back. The value survives a
 * page refresh. Opt-in per signal. Zero dependencies.
 *
 * SAFE FOR: theme, language, sidebar state, last-used filters, onboarding
 *           flags, draft text the user expects back, guest cart contents.
 *
 * NEVER STORE: auth tokens, JWTs, session IDs, API keys, passwords, personal
 *              data, payment details, permission flags, secrets, OTP seeds,
 *              or any server-of-record state. localStorage is XSS-readable.
 *              See STORAGE.md for the full dangers list.
 */
import { effect, type Signal } from '../core/signal';

export interface PersistSerializer<T> {
  /** Parse a stored string back into a value. */
  read(raw: string): T;
  /** Serialize a value into a string that storage can hold. */
  write(value: T): string;
}

export interface PersistOptions<T> {
  /** Storage key. Required. */
  key: string;
  /** 'local' (default) survives a refresh; 'session' lives until the tab closes. */
  storage?: 'local' | 'session';
  /** JSON by default. Provide for Date, Map, Set, or any non-JSON shape. */
  serializer?: PersistSerializer<T>;
  /** Stored-shape version. Defaults to 1. */
  version?: number;
  /** Convert an older stored value into the current shape. */
  migrate?: (oldValue: unknown, oldVersion: number | undefined) => T;
  /** Subscribe to the storage event so other tabs see writes. Opt-in. */
  syncTabs?: boolean;
  /**
   * Silence the credential-shape warning. Use only when you are certain
   * the key or value is a coincidence (e.g. tokenColor for a UI palette).
   */
  silenceCredentialWarning?: boolean;
}

export interface PersistedSignal<T> extends Signal<T> {
  /** Remove the key from storage. The signal keeps its current in-memory value. */
  clear(): void;
  /** Stop watching storage events and stop the write effect. */
  dispose(): void;
}

/** Stored envelope so the version and the payload travel together. */
interface Envelope {
  v?: number;
  value: unknown;
}

interface StoredValue {
  version: number | undefined;
  payload: unknown;
}

const DEFAULT_SERIALIZER: PersistSerializer<unknown> = {
  read: (raw) => JSON.parse(raw),
  write: (value) => JSON.stringify(value),
};

// ── Credential-shape detection ─────────────────────────────────────────
//
// These patterns catch the obvious cases. They are deliberately loud:
// false positives are a console warning. False negatives are a security
// incident. We prefer the former.

const CREDENTIAL_KEY = /(token|password|passwd|secret|api[_-]?key|apikey|auth(?!or)|credential|jwt|bearer|otp|seed|private[_-]?key|session[_-]?id)/i;
const JWT_SHAPE = /^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/;
const LONG_BASE64 = /^[A-Za-z0-9+/_=-]{40,}$/;

/** Keys we have already warned about, so the console does not flood. */
const WARNED = new Set<string>();

function looksLikeCredential(key: string, value: unknown): string | null {
  if (CREDENTIAL_KEY.test(key)) {
    return `key name "${key}" looks like a credential`;
  }
  if (typeof value === 'string') {
    if (JWT_SHAPE.test(value)) return `value looks like a JWT`;
    if (value.length >= 40 && LONG_BASE64.test(value)) {
      return `value looks like a long base64 / token`;
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of Object.keys(value as object)) {
      if (CREDENTIAL_KEY.test(k)) {
        return `object contains a credential-shape field "${k}"`;
      }
    }
  }
  return null;
}

function warnCredential(reason: string, key: string): void {
  if (WARNED.has(key)) return;
  WARNED.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[tina4 persist] ${reason} (key: ${JSON.stringify(key)}). ` +
    `localStorage is XSS-readable and never appropriate for credentials, ` +
    `tokens, passwords, personal data, or secrets. See STORAGE.md.`,
  );
}

/** @internal Reset the warning cache. Tests only. */
export function _resetWarnedKeys(): void {
  WARNED.clear();
}

// ── Storage access ─────────────────────────────────────────────────────

function getStorage(kind: 'local' | 'session'): Storage | null {
  // SSR safety — no globalThis access throws no errors
  if (typeof globalThis === 'undefined') return null;
  try {
    const s = kind === 'local'
      ? (globalThis as { localStorage?: Storage }).localStorage
      : (globalThis as { sessionStorage?: Storage }).sessionStorage;
    if (!s || typeof s.getItem !== 'function') return null;
    return s;
  } catch {
    // Some browsers throw on storage access in private mode
    return null;
  }
}

function parseStoredValue<T>(
  raw: string,
  serializer: PersistSerializer<T>,
  isDefault: boolean,
): StoredValue {
  try {
    const parsed = JSON.parse(raw) as Envelope;
    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      return { version: parsed.v, payload: parsed.value };
    }
    return { version: undefined, payload: parsed };
  } catch {
    return {
      version: undefined,
      payload: isDefault ? raw : serializer.read(raw),
    };
  }
}

function deserializePayload<T>(
  payload: unknown,
  serializer: PersistSerializer<T>,
  isDefault: boolean,
): T {
  if (isDefault) return payload as T;
  return serializer.read(typeof payload === 'string' ? payload : JSON.stringify(payload));
}

function readInitialValue<T>(
  source: Signal<T>,
  store: Storage,
  key: string,
  version: number,
  serializer: PersistSerializer<T>,
  isDefault: boolean,
  migrate: PersistOptions<T>['migrate'],
): void {
  try {
    const raw = store.getItem(key);
    if (raw === null) return;

    const stored = parseStoredValue(raw, serializer, isDefault);
    if (stored.version === version || stored.version === undefined) {
      source.value = deserializePayload(stored.payload, serializer, isDefault);
      return;
    }
    if (migrate) {
      try {
        source.value = migrate(stored.payload, stored.version);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[tina4 persist] migrate() threw for key "${key}":`, err);
      }
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[tina4 persist] stored version ${stored.version} does not match current ${version} ` +
      `for key "${key}", and no migrate() was provided. Discarding the stored value.`,
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[tina4 persist] failed to read key "${key}":`, err);
  }
}

function warnIfCredential(key: string, value: unknown, silenced: boolean): void {
  if (silenced) return;
  const reason = looksLikeCredential(key, value);
  if (reason) warnCredential(reason, key);
}

function createWriteEffect<T>(
  source: Signal<T>,
  store: Storage,
  key: string,
  version: number,
  serializer: PersistSerializer<T>,
  isDefault: boolean,
  silenceCredentialWarning: boolean,
): () => void {
  return effect(() => {
    const value = source.value;
    warnIfCredential(key, value, silenceCredentialWarning);
    try {
      const serialized = isDefault
        ? JSON.stringify({ v: version, value } satisfies Envelope)
        : JSON.stringify({ v: version, value: serializer.write(value) });
      store.setItem(key, serialized);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[tina4 persist] failed to write key "${key}":`, err);
    }
  });
}

function createStorageListener<T>(
  source: Signal<T>,
  store: Storage,
  key: string,
  version: number,
  serializer: PersistSerializer<T>,
  isDefault: boolean,
  migrate: PersistOptions<T>['migrate'],
  syncTabs: boolean,
): (() => void) | null {
  if (!syncTabs || typeof globalThis === 'undefined' || !('addEventListener' in globalThis)) {
    return null;
  }

  const listener = (event: Event): void => {
    const e = event as StorageEvent;
    if (e.storageArea !== store || e.key !== key || e.newValue === null) return;
    try {
      const stored = parseStoredValue(e.newValue, serializer, isDefault);
      if (stored.version !== undefined && stored.version !== version && migrate) {
        source.value = migrate(stored.payload, stored.version);
      } else if (stored.version === version || stored.version === undefined) {
        source.value = deserializePayload(stored.payload, serializer, isDefault);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[tina4 persist] failed to parse storage event for key "${key}":`, err);
    }
  };

  (globalThis as { addEventListener?: (t: string, l: EventListener) => void })
    .addEventListener?.('storage', listener as EventListener);
  return (): void => {
    (globalThis as { removeEventListener?: (t: string, l: EventListener) => void })
      .removeEventListener?.('storage', listener as EventListener);
  };
}

function clearStoredKey(store: Storage, key: string): void {
  try {
    store.removeItem(key);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[tina4 persist] failed to clear key "${key}":`, err);
  }
}

// ── persist() ──────────────────────────────────────────────────────────

/**
 * Wrap a signal so its value is read from storage on creation and written
 * back on every change. Survives a page refresh.
 *
 * @param source  - The signal to persist. Its initial value is overwritten
 *                  by whatever is in storage, if anything.
 * @param options - Persistence options. `key` is required.
 *
 * @example
 *   const theme = persist(signal('light'), { key: 'theme' });
 *   theme.value = 'dark';   // survives a refresh
 */
export function persist<T>(source: Signal<T>, options: PersistOptions<T>): PersistedSignal<T> {
  const {
    key,
    storage: kind = 'local',
    serializer = DEFAULT_SERIALIZER as PersistSerializer<T>,
    version = 1,
    migrate,
    syncTabs = false,
    silenceCredentialWarning = false,
  } = options;

  if (!key || typeof key !== 'string') {
    throw new Error('[tina4 persist] options.key is required and must be a string');
  }

  const isDefault = serializer === (DEFAULT_SERIALIZER as PersistSerializer<T>);

  const store = getStorage(kind);

  // No storage means SSR or private-mode lockdown. Hand back the signal
  // as a no-op persisted signal. It still works; it just does not survive.
  if (!store) {
    return attach(source, () => {}, () => {});
  }

  readInitialValue(source, store, key, version, serializer, isDefault, migrate);
  warnIfCredential(key, source.peek(), silenceCredentialWarning);
  const stopEffect = createWriteEffect(
    source,
    store,
    key,
    version,
    serializer,
    isDefault,
    silenceCredentialWarning,
  );
  const stopStorageListener = createStorageListener(
    source,
    store,
    key,
    version,
    serializer,
    isDefault,
    migrate,
    syncTabs,
  );

  return attach(
    source,
    () => clearStoredKey(store, key),
    () => {
      stopEffect();
      if (stopStorageListener) stopStorageListener();
    },
  );
}

function attach<T>(
  source: Signal<T>,
  clearFn: () => void,
  disposeFn: () => void,
): PersistedSignal<T> {
  return Object.assign(source, { clear: clearFn, dispose: disposeFn }) as PersistedSignal<T>;
}

// ── clearPersistedKeys() ───────────────────────────────────────────────

/**
 * Remove a list of persisted keys at once. Wire this to your logout handler
 * so persisted state does not leak to the next user on the device.
 *
 * @example
 *   function logout() {
 *     api.post('/auth/logout');
 *     clearPersistedKeys(['cart', 'lastFilter', 'draftReply']);
 *     window.location.reload();
 *   }
 */
export function clearPersistedKeys(keys: string[], kind: 'local' | 'session' = 'local'): void {
  const store = getStorage(kind);
  if (!store) return;
  for (const key of keys) {
    try {
      store.removeItem(key);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[tina4 persist] failed to clear key "${key}":`, err);
    }
  }
}
