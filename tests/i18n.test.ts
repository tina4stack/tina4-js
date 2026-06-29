import { describe, it, expect } from 'vitest';
import { effect } from '../src/core/signal';
import { createI18n, i18n, t, setLocale, getLocale } from '../src/i18n/i18n';

const MESSAGES = {
  'en-US': {
    greeting: 'Hello',
    welcome: 'Welcome, {name}!',
    nav: { home: 'Home', about: 'About' },
    cart: { count: '{n} items' },
  },
  'fr-FR': {
    greeting: 'Bonjour',
    welcome: 'Bienvenue, {name}!',
    nav: { home: 'Accueil' },
  },
};

describe('i18n — translations', () => {
  it('translates the active locale and switches', () => {
    const i = createI18n({ locale: 'en-US', messages: MESSAGES });
    expect(i.t('greeting')).toBe('Hello');
    i.setLocale('fr-FR');
    expect(i.t('greeting')).toBe('Bonjour');
    expect(i.getLocale()).toBe('fr-FR');
  });

  it('falls back to the fallback locale, then the key itself', () => {
    const i = createI18n({ locale: 'fr-FR', fallbackLocale: 'en-US', messages: MESSAGES });
    // "about" exists only in en-US -> fallback
    expect(i.t('nav.about')).toBe('About');
    // missing everywhere -> the key, never throws
    expect(i.t('does.not.exist')).toBe('does.not.exist');
  });

  it('interpolates {placeholder} params', () => {
    const i = createI18n({ locale: 'en-US', messages: MESSAGES });
    expect(i.t('welcome', { name: 'Alice' })).toBe('Welcome, Alice!');
    expect(i.t('cart.count', { n: 3 })).toBe('3 items');
    // unknown placeholders are left untouched
    expect(i.t('welcome', {})).toBe('Welcome, {name}!');
  });

  it('flattens nested messages to dot-path AND leaf alias', () => {
    const i = createI18n({ locale: 'en-US', messages: MESSAGES });
    expect(i.t('nav.home')).toBe('Home');
    expect(i.t('home')).toBe('Home'); // leaf shortcut
  });

  it('re-renders reactively when the locale changes', () => {
    const i = createI18n({ locale: 'en-US', messages: MESSAGES });
    const seen: string[] = [];
    const stop = effect(() => { seen.push(i.t('greeting')); });
    expect(seen).toEqual(['Hello']);
    i.setLocale('fr-FR');
    expect(seen).toEqual(['Hello', 'Bonjour']);
    stop();
  });

  it('addMessages merges, availableLocales is sorted, hasLocale works', () => {
    const i = createI18n({ locale: 'en-US', messages: { 'en-US': { a: '1' } } });
    i.addMessages('en-US', { b: '2' });
    i.addMessages('de-DE', { a: 'eins' });
    expect(i.t('a')).toBe('1');
    expect(i.t('b')).toBe('2');
    expect(i.hasLocale('de-DE')).toBe(true);
    expect(i.hasLocale('zz')).toBe(false);
    expect(i.availableLocales()).toEqual(['de-DE', 'en-US']);
  });

  it('loadMessages fetches a JSON bundle (real fetch, data: URL)', async () => {
    const i = createI18n({ locale: 'en-US' });
    await i.loadMessages('es-ES', 'data:application/json,{"greeting":"Hola"}');
    i.setLocale('es-ES');
    expect(i.t('greeting')).toBe('Hola');
  });
});

describe('i18n — Intl formatting', () => {
  it('formats numbers per locale', () => {
    const i = createI18n({ locale: 'en-US' });
    expect(i.number(1234.5)).toBe('1,234.5');
    i.setLocale('de-DE');
    expect(i.number(1234.5)).toBe('1.234,5');
  });

  it('formats currency per locale', () => {
    const i = createI18n({ locale: 'en-US' });
    expect(i.currency(1999.5, 'USD')).toBe('$1,999.50');
    i.setLocale('de-DE');
    // de-DE puts the symbol last; assert on the digits to avoid NBSP brittleness
    expect(i.currency(1999.5, 'EUR')).toContain('1.999,50');
  });

  it('formats dates per locale (UTC-pinned for determinism)', () => {
    const i = createI18n({ locale: 'en-US' });
    const d = new Date('2026-03-04T00:00:00Z');
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
    expect(i.date(d, opts)).toBe('03/04/2026');
    i.setLocale('de-DE');
    expect(i.date(d, opts)).toBe('04.03.2026');
  });

  it('accepts epoch ms and string dates', () => {
    const i = createI18n({ locale: 'en-US' });
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' };
    expect(i.date(Date.UTC(2026, 2, 4), opts)).toBe('03/04/2026');
    expect(i.date('2026-03-04T00:00:00Z', opts)).toBe('03/04/2026');
  });

  it('formats relative time', () => {
    const i = createI18n({ locale: 'en-US' });
    expect(i.relativeTime(-1, 'day')).toBe('yesterday');
    expect(i.relativeTime(1, 'day')).toBe('tomorrow');
  });

  it('re-formats reactively on locale change', () => {
    const i = createI18n({ locale: 'en-US' });
    const seen: string[] = [];
    const stop = effect(() => { seen.push(i.number(1234.5)); });
    i.setLocale('de-DE');
    expect(seen).toEqual(['1,234.5', '1.234,5']);
    stop();
  });
});

describe('i18n — direction (RTL)', () => {
  it('reports rtl for RTL locales and ltr otherwise', () => {
    const i = createI18n({ locale: 'en-US' });
    expect(i.dir()).toBe('ltr');
    expect(i.isRTL()).toBe(false);
    i.setLocale('ar-EG');
    expect(i.dir()).toBe('rtl');
    expect(i.isRTL()).toBe(true);
    i.setLocale('he');
    expect(i.isRTL()).toBe(true);
  });

  it('honours custom rtlLocales', () => {
    const i = createI18n({ locale: 'xx', rtlLocales: ['xx'] });
    expect(i.dir()).toBe('rtl');
  });

  it('dir() is reactive', () => {
    const i = createI18n({ locale: 'en-US' });
    const seen: string[] = [];
    const stop = effect(() => { seen.push(i.dir()); });
    i.setLocale('ar');
    expect(seen).toEqual(['ltr', 'rtl']);
    stop();
  });
});

describe('i18n — default singleton', () => {
  it('t()/setLocale()/getLocale() delegate to the default instance', () => {
    i18n.addMessages('en', { hi: 'Hi' });
    i18n.addMessages('fr', { hi: 'Salut' });
    setLocale('en');
    expect(t('hi')).toBe('Hi');
    expect(getLocale()).toBe('en');
    setLocale('fr');
    expect(t('hi')).toBe('Salut');
    setLocale('en'); // leave the singleton in a clean state for other tests
  });
});
