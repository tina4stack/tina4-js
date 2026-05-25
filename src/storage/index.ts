/**
 * tina4js/storage — Persistent signals.
 *
 * Read STORAGE.md before using this module. localStorage is XSS-readable;
 * never put credentials, tokens, personal data, or secrets here.
 */

export { persist, clearPersistedKeys } from './persist';
export type { PersistOptions, PersistSerializer, PersistedSignal } from './persist';
