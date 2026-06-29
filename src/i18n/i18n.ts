/**
 * tina4js/i18n — Internationalization and localization. Reactive, zero deps.
 *
 * The active locale is a SIGNAL. t() and the Intl-backed formatters read it,
 * so when you switch locale every translated string and every formatted
 * number/date re-renders in place — as long as you use them in the reactive
 * function form inside a template:
 *
 *     html`<h1>${() => i18n.t('greeting')}</h1>`
 *     html`<p>${() => i18n.currency(19.99, 'USD')}</p>`
 *     i18n.setLocale('fr');   // both update, no reload
 *
 * Formatting is delegated to the browser's native Intl APIs, so there is no
 * locale data to ship. Translations are key-based JSON bundles, mirroring the
 * backend tina4 I18n API (t / setLocale / getLocale / addMessages /
 * availableLocales) so the frontend and backend speak the same shape.
 */
import { signal, type Signal } from '../core/signal';

/** A bundle of messages for one locale. Nested objects are allowed. */
export type Messages = Record<string, unknown>;
/** Message bundles keyed by locale code, e.g. { en: {...}, fr: {...} }. */
export type LocaleMessages = Record<string, Messages>;

export interface I18nOptions {
  /** Active locale. Default: the browser's navigator.language, else 'en'. */
  locale?: string;
  /** Locale used when a key is missing in the active locale. Default: the initial locale. */
  fallbackLocale?: string;
  /** Initial bundles keyed by locale. Nested objects are flattened (dot-path + leaf alias). */
  messages?: LocaleMessages;
  /** Extra base codes (e.g. 'ar') to treat as right-to-left, on top of the built-in set. */
  rtlLocales?: string[];
}

export interface I18n {
  /** The active locale as a reactive signal. Set `.value` or call setLocale(). */
  readonly locale: Signal<string>;
  /** Translate a key, with optional {placeholder} interpolation. Reactive when read in a function block. */
  t(key: string, params?: Record<string, unknown>): string;
  /** Switch the active locale (updates the signal, so dependents re-render). */
  setLocale(locale: string): void;
  /** The active locale code. */
  getLocale(): string;
  /** Merge a bundle into a locale (nested objects flattened). Existing keys are overwritten. */
  addMessages(locale: string, messages: Messages): void;
  /** True if any messages are loaded for the locale. */
  hasLocale(locale: string): boolean;
  /** Sorted list of locale codes that have messages loaded. */
  availableLocales(): string[];
  /** Fetch a JSON bundle from a URL and merge it into the locale. */
  loadMessages(locale: string, url: string): Promise<void>;
  /** Format a number for the active locale via Intl.NumberFormat. */
  number(value: number, options?: Intl.NumberFormatOptions): string;
  /** Format a currency amount for the active locale. */
  currency(value: number, currency: string, options?: Intl.NumberFormatOptions): string;
  /** Format a date for the active locale via Intl.DateTimeFormat. Accepts Date, epoch ms, or a parseable string. */
  date(value: Date | number | string, options?: Intl.DateTimeFormatOptions): string;
  /** Format a relative time (e.g. -1, 'day' -> "yesterday") via Intl.RelativeTimeFormat. */
  relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  /** True when the active locale is right-to-left. Reactive when read in a function block. */
  isRTL(): boolean;
  /** "rtl" or "ltr" for the active locale — bind to a container's `dir`. */
  dir(): 'rtl' | 'ltr';
}

// Unicode right-to-left scripts, by language subtag. Authors can add more.
const BUILT_IN_RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'dv', 'syr', 'ckb', 'yi'];

/** Detect the browser locale, SSR-safe. */
function detectLocale(): string {
  const nav = (globalThis as { navigator?: { language?: string } }).navigator;
  return nav?.language || 'en';
}

/**
 * Flatten a nested message bundle into a flat map, keeping BOTH the full
 * dot-path and the leaf key (first-wins on a leaf collision). Mirrors the
 * backend I18n._flatten so `t('nav.home')` and `t('home')` both resolve.
 */
function flatten(data: Messages, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  for (const [key, value] of Object.entries(data)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value as Messages, full, out);
    } else {
      const str = String(value);
      out[full] = str;
      if (!(key in out)) out[key] = str; // leaf shortcut, first-wins
    }
  }
  return out;
}

/** Replace {name} placeholders from params. Unknown placeholders are left untouched. */
function interpolate(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

/**
 * Create an isolated i18n instance. Most apps use the default `i18n` singleton,
 * but multiple instances are supported (e.g. per-widget or for testing).
 */
export function createI18n(options: I18nOptions = {}): I18n {
  const initial = options.locale || detectLocale();
  const fallback = options.fallbackLocale || initial;
  const rtl = new Set([...BUILT_IN_RTL, ...(options.rtlLocales || [])]);

  const locale = signal(initial, 'i18n.locale');
  const store = new Map<string, Record<string, string>>();

  // Per-instance Intl cache: building an Intl formatter is expensive, and t()
  // / formatters run on every render. Keyed by kind + locale + options.
  const fmtCache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

  function addMessages(loc: string, messages: Messages): void {
    const flat = flatten(messages);
    const existing = store.get(loc);
    store.set(loc, existing ? { ...existing, ...flat } : flat);
  }

  if (options.messages) {
    for (const [loc, bundle] of Object.entries(options.messages)) addMessages(loc, bundle);
  }

  function lookup(loc: string, key: string): string | undefined {
    return store.get(loc)?.[key];
  }

  function numberFormat(loc: string, opts?: Intl.NumberFormatOptions): Intl.NumberFormat {
    const k = `n|${loc}|${JSON.stringify(opts || {})}`;
    let f = fmtCache.get(k) as Intl.NumberFormat | undefined;
    if (!f) { f = new Intl.NumberFormat(loc, opts); fmtCache.set(k, f); }
    return f;
  }

  function dateFormat(loc: string, opts?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
    const k = `d|${loc}|${JSON.stringify(opts || {})}`;
    let f = fmtCache.get(k) as Intl.DateTimeFormat | undefined;
    if (!f) { f = new Intl.DateTimeFormat(loc, opts); fmtCache.set(k, f); }
    return f;
  }

  function relativeFormat(loc: string, opts?: Intl.RelativeTimeFormatOptions): Intl.RelativeTimeFormat {
    const k = `r|${loc}|${JSON.stringify(opts || {})}`;
    let f = fmtCache.get(k) as Intl.RelativeTimeFormat | undefined;
    if (!f) { f = new Intl.RelativeTimeFormat(loc, opts); fmtCache.set(k, f); }
    return f;
  }

  return {
    locale,

    t(key: string, params?: Record<string, unknown>): string {
      const loc = locale.value; // read inside any effect -> reactive
      let value = lookup(loc, key);
      if (value === undefined && fallback !== loc) value = lookup(fallback, key);
      if (value === undefined) value = key; // last resort: the key itself, never throws
      return params ? interpolate(value, params) : value;
    },

    setLocale(loc: string): void {
      locale.value = loc;
    },

    getLocale(): string {
      return locale.value;
    },

    addMessages,

    hasLocale(loc: string): boolean {
      return store.has(loc);
    },

    availableLocales(): string[] {
      return [...store.keys()].sort();
    },

    async loadMessages(loc: string, url: string): Promise<void> {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`[tina4 i18n] failed to load "${loc}" from ${url}: ${res.status}`);
      }
      addMessages(loc, (await res.json()) as Messages);
    },

    number(value: number, opts?: Intl.NumberFormatOptions): string {
      return numberFormat(locale.value, opts).format(value);
    },

    currency(value: number, currency: string, opts?: Intl.NumberFormatOptions): string {
      return numberFormat(locale.value, { style: 'currency', currency, ...opts }).format(value);
    },

    date(value: Date | number | string, opts?: Intl.DateTimeFormatOptions): string {
      const d = value instanceof Date ? value : new Date(value);
      return dateFormat(locale.value, opts).format(d);
    },

    relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, opts?: Intl.RelativeTimeFormatOptions): string {
      return relativeFormat(locale.value, opts || { numeric: 'auto' }).format(value, unit);
    },

    isRTL(): boolean {
      return rtl.has(locale.value.split('-')[0].toLowerCase());
    },

    dir(): 'rtl' | 'ltr' {
      return this.isRTL() ? 'rtl' : 'ltr';
    },
  };
}

// ── Default singleton (parity with the backend module-level t / set_default) ──
//
// Most apps configure one i18n. Import { i18n } and call i18n.addMessages(...),
// or use the bare t()/setLocale() shortcuts that delegate to it.

/** The default i18n instance. Configure with i18n.addMessages(...) / i18n.setLocale(...). */
export const i18n: I18n = createI18n();

/** Translate via the default instance. Reactive when read in a function block. */
export function t(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params);
}

/** Switch the default instance's locale. */
export function setLocale(locale: string): void {
  i18n.setLocale(locale);
}

/** The default instance's active locale. */
export function getLocale(): string {
  return i18n.getLocale();
}
