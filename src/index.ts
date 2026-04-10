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
