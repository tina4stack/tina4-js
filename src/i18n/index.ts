/**
 * tina4js/i18n — Reactive internationalization and localization.
 *
 * Translations (key-based, fallback, {placeholder} interpolation) plus
 * Intl-backed number / currency / date / relative-time formatting and an
 * RTL direction helper. The active locale is a signal, so everything
 * re-renders in place on setLocale().
 */
export { createI18n, i18n, t, setLocale, getLocale } from './i18n';
export type { I18n, I18nOptions, Messages, LocaleMessages } from './i18n';
