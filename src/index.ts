/**
 * tina4js — Sub-3KB core, reactive framework.
 *
 * Signals + tagged template rendering + web components + routing + API + PWA.
 */

// Core: signals, html renderer, component base
export { signal, computed, effect, batch, isSignal } from './core/signal';
export type { Signal, ReadonlySignal } from './core/signal';
export { html } from './core/html';
export { Tina4Element } from './core/component';
export type { PropType } from './core/component';

// Router
export { route, navigate, router } from './router/router';
export type { RouteParams, RouteHandler, RouteGuard, RouteConfig } from './router/router';

// API
export { api } from './api/fetch';
export type { ApiConfig, ApiResponse, RequestOptions } from './api/fetch';

// PWA
export { pwa } from './pwa/pwa';
export type { PWAConfig } from './pwa/pwa';

// WebSocket
export { ws } from './ws/ws';
export type { SocketStatus, SocketOptions, ManagedSocket } from './ws/ws';

// SSE / NDJSON streaming
export { sse } from './sse/sse';
export type { StreamStatus, StreamOptions, ManagedStream } from './sse/sse';

// Persistent signal storage — see STORAGE.md for the must-never-store list
export { persist, clearPersistedKeys } from './storage/persist';
export type { PersistOptions, PersistSerializer, PersistedSignal } from './storage/persist';

// i18n — reactive translations + Intl formatting. The bare t()/setLocale()
// shortcuts and the default singleton live in the tina4js/i18n entry to keep
// the top-level namespace clean; createI18n + the default instance are here.
export { createI18n, i18n } from './i18n/i18n';
export type { I18n, I18nOptions, Messages, LocaleMessages } from './i18n/i18n';
