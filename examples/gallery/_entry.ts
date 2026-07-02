/**
 * Gallery bundle entry — re-exports core + storage + i18n so the example
 * pages can use signal, computed, effect, html, persist, clearPersistedKeys,
 * and createI18n through the global `tina4` object loaded by tina4.bundle.js.
 *
 * Keep this entry focused. Heavy modules (api, ws, sse, pwa, debug) belong
 * in their own bundles or per-page imports.
 */
export {
  signal,
  computed,
  effect,
  batch,
  isSignal,
  html,
  Tina4Element,
} from '../../src/core';
export { persist, clearPersistedKeys } from '../../src/storage/persist';
export type { PersistOptions, PersistedSignal } from '../../src/storage/persist';
export { createI18n, i18n, t, setLocale, getLocale } from '../../src/i18n/i18n';
export type { I18n, I18nOptions, LocaleMessages, Messages } from '../../src/i18n/i18n';
