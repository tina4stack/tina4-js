/**
 * Tina4 WebSocket — Signal-driven WebSocket client with auto-reconnect.
 *
 * ws.connect(url, options?)  — create a managed WebSocket connection
 * socket.status              — reactive signal: 'connecting' | 'open' | 'closed' | 'reconnecting'
 * socket.connected            — reactive signal: boolean
 * socket.lastMessage          — reactive signal: last parsed message
 * socket.send(data)           — send data (auto-stringify objects)
 * socket.on(event, handler)   — listen for messages/open/close/error
 * socket.pipe(signal, reducer) — pipe messages directly into a signal
 * socket.close()              — disconnect (stops reconnect)
 */

import { signal } from '../core/signal';
import type { Signal } from '../core/signal';

// ── Types ────────────────────────────────────────────────────────────

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

export interface SocketOptions {
  /** Enable auto-reconnect on disconnect (default: true). */
  reconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000). */
  reconnectDelay?: number;
  /** Max reconnect delay in ms, for exponential backoff (default: 30000). */
  reconnectMaxDelay?: number;
  /** Max reconnect attempts before giving up (default: Infinity). */
  reconnectAttempts?: number;
  /** WebSocket sub-protocols. */
  protocols?: string | string[];
}

export type MessageHandler = (data: unknown) => void;
export type OpenHandler = () => void;
export type CloseHandler = (code: number, reason: string) => void;
export type ErrorHandler = (error: Event) => void;

type EventMap = {
  message: MessageHandler;
  open: OpenHandler;
  close: CloseHandler;
  error: ErrorHandler;
};

export interface ManagedSocket {
  /** Reactive connection status. */
  readonly status: Signal<SocketStatus>;
  /** Reactive boolean — true when status is 'open'. */
  readonly connected: Signal<boolean>;
  /** Reactive — last received message (parsed JSON or raw string). */
  readonly lastMessage: Signal<unknown>;
  /** Reactive — last error event, or null. */
  readonly error: Signal<Event | null>;
  /** Number of reconnect attempts so far. */
  readonly reconnectCount: Signal<number>;

  /** Send data. Objects are JSON.stringify'd automatically. */
  send(data: unknown): void;

  /** Listen for events. Returns unsubscribe function. */
  on<K extends keyof EventMap>(event: K, handler: EventMap[K]): () => void;

  /** Pipe messages into a signal via a reducer. */
  pipe<T>(target: Signal<T>, reducer: (message: unknown, current: T) => T): () => void;

  /** Close the connection and stop reconnecting. */
  close(code?: number, reason?: string): void;
}

// ── Defaults ─────────────────────────────────────────────────────────

const DEFAULTS: Required<SocketOptions> = {
  reconnect: true,
  reconnectDelay: 1000,
  reconnectMaxDelay: 30000,
  reconnectAttempts: Infinity,
  protocols: [],
};

// ── Implementation ───────────────────────────────────────────────────

function createSocket(url: string, options: SocketOptions = {}): ManagedSocket {
  const opts = { ...DEFAULTS, ...options };

  // Reactive state
  const status = signal<SocketStatus>('connecting');
  const connected = signal(false);
  const lastMessage = signal<unknown>(null);
  const error = signal<Event | null>(null);
  const reconnectCount = signal(0);

  // Event listeners
  const listeners: { [K in keyof EventMap]: EventMap[K][] } = {
    message: [],
    open: [],
    close: [],
    error: [],
  };

  // Internal state
  let socket: WebSocket | null = null;
  let intentionalClose = false;
  let currentDelay = opts.reconnectDelay;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;

  function parseMessage(data: unknown): unknown {
    if (typeof data !== 'string') return data;
    try { return JSON.parse(data); } catch { return data; }
  }

  function connect(): void {
    status.value = attempts > 0 ? 'reconnecting' : 'connecting';

    try {
      socket = new WebSocket(url, opts.protocols);
    } catch (e) {
      status.value = 'closed';
      connected.value = false;
      return;
    }

    socket.onopen = () => {
      status.value = 'open';
      connected.value = true;
      error.value = null;
      attempts = 0;
      currentDelay = opts.reconnectDelay;
      reconnectCount.value = 0;
      for (const fn of listeners.open) fn();
    };

    socket.onmessage = (event: MessageEvent) => {
      const parsed = parseMessage(event.data);
      lastMessage.value = parsed;
      for (const fn of listeners.message) fn(parsed);
    };

    socket.onclose = (event: CloseEvent) => {
      status.value = 'closed';
      connected.value = false;
      for (const fn of listeners.close) fn(event.code, event.reason);

      if (!intentionalClose && opts.reconnect && attempts < opts.reconnectAttempts) {
        scheduleReconnect();
      }
    };

    socket.onerror = (event: Event) => {
      error.value = event;
      for (const fn of listeners.error) fn(event);
    };
  }

  function scheduleReconnect(): void {
    attempts++;
    reconnectCount.value = attempts;
    status.value = 'reconnecting';

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, currentDelay);

    // Exponential backoff with cap
    currentDelay = Math.min(currentDelay * 2, opts.reconnectMaxDelay);
  }

  // ── Public API ──────────────────────────────────────────────────

  const managed: ManagedSocket = {
    status,
    connected,
    lastMessage,
    error,
    reconnectCount,

    send(data: unknown): void {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('[tina4] WebSocket is not connected');
      }
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      socket.send(payload);
    },

    on<K extends keyof EventMap>(event: K, handler: EventMap[K]): () => void {
      (listeners[event] as EventMap[K][]).push(handler);
      return () => {
        const arr = listeners[event] as EventMap[K][];
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
      };
    },

    pipe<T>(target: Signal<T>, reducer: (message: unknown, current: T) => T): () => void {
      const handler: MessageHandler = (msg) => {
        target.value = reducer(msg, target.value);
      };
      return managed.on('message', handler);
    },

    close(code?: number, reason?: string): void {
      intentionalClose = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        socket.close(code ?? 1000, reason ?? '');
      }
      status.value = 'closed';
      connected.value = false;
    },
  };

  // Start connection
  connect();

  return managed;
}

// ── Exports ─────────────────────────────────────────────────────────

export const ws = {
  connect: createSocket,
};
