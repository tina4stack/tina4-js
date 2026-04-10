/**
 * Tina4 SSE — Signal-driven Server-Sent Events / NDJSON streaming client.
 *
 * sse.connect(url, options?)   — create a managed event stream
 * stream.status                — reactive signal: 'connecting' | 'open' | 'closed' | 'reconnecting'
 * stream.connected             — reactive signal: boolean
 * stream.lastMessage           — reactive signal: last parsed message
 * stream.lastEvent             — reactive signal: last SSE event name (or null)
 * stream.on(event, handler)    — listen for messages/open/close/error
 * stream.pipe(signal, reducer) — pipe messages directly into a signal
 * stream.close()               — disconnect (stops reconnect)
 */

import { signal } from '../core/signal';
import type { Signal } from '../core/signal';

// ── Types ────────────────────────────────────────────────────────────

export type StreamStatus = 'connecting' | 'open' | 'closed' | 'reconnecting';

export interface StreamOptions {
  /** Transport: 'eventsource' (default) or 'fetch' for NDJSON/POST. */
  mode?: 'eventsource' | 'fetch';
  /** HTTP method for fetch mode (default: 'GET'). */
  method?: string;
  /** Custom headers for fetch mode. */
  headers?: Record<string, string>;
  /** Request body for fetch mode (objects are JSON.stringify'd). */
  body?: unknown;
  /** Enable auto-reconnect (default: true). */
  reconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000). */
  reconnectDelay?: number;
  /** Max reconnect delay in ms (default: 30000). */
  reconnectMaxDelay?: number;
  /** Max reconnect attempts (default: Infinity). */
  reconnectAttempts?: number;
  /** Named SSE events to listen for (eventsource mode only). */
  events?: string[];
  /** Parse each message as JSON (default: true). */
  json?: boolean;
}

export type MessageHandler = (data: unknown, event?: string) => void;
export type OpenHandler = () => void;
export type CloseHandler = () => void;
export type ErrorHandler = (error: Event | Error) => void;

type EventMap = {
  message: MessageHandler;
  open: OpenHandler;
  close: CloseHandler;
  error: ErrorHandler;
};

export interface ManagedStream {
  /** Reactive connection status. */
  readonly status: Signal<StreamStatus>;
  /** Reactive boolean — true when status is 'open'. */
  readonly connected: Signal<boolean>;
  /** Reactive — last received message (parsed JSON or raw string). */
  readonly lastMessage: Signal<unknown>;
  /** Reactive — last SSE event name, or null for unnamed/NDJSON. */
  readonly lastEvent: Signal<string | null>;
  /** Reactive — last error, or null. */
  readonly error: Signal<Event | Error | null>;
  /** Number of reconnect attempts so far. */
  readonly reconnectCount: Signal<number>;

  /** Listen for events. Returns unsubscribe function. */
  on<K extends keyof EventMap>(event: K, handler: EventMap[K]): () => void;

  /** Pipe messages into a signal via a reducer. */
  pipe<T>(target: Signal<T>, reducer: (message: unknown, current: T) => T): () => void;

  /** Close the connection and stop reconnecting. */
  close(): void;
}

// ── Defaults ─────────────────────────────────────────────────────────

const DEFAULTS: Required<StreamOptions> = {
  mode: 'eventsource',
  method: 'GET',
  headers: {},
  body: undefined as unknown,
  reconnect: true,
  reconnectDelay: 1000,
  reconnectMaxDelay: 30000,
  reconnectAttempts: Infinity,
  events: [],
  json: true,
};

// ── Implementation ───────────────────────────────────────────────────

function createStream(url: string, options: StreamOptions = {}): ManagedStream {
  const opts = { ...DEFAULTS, ...options };

  // Reactive state
  const status = signal<StreamStatus>('connecting');
  const connected = signal(false);
  const lastMessage = signal<unknown>(null);
  const lastEvent = signal<string | null>(null);
  const error = signal<Event | Error | null>(null);
  const reconnectCount = signal(0);

  // Event listeners
  const listeners: { [K in keyof EventMap]: EventMap[K][] } = {
    message: [],
    open: [],
    close: [],
    error: [],
  };

  // Internal state
  let source: EventSource | null = null;
  let controller: AbortController | null = null;
  let intentionalClose = false;
  let currentDelay = opts.reconnectDelay;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;

  function parseData(raw: unknown): unknown {
    if (!opts.json || typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  function dispatch(data: unknown, eventName: string | null): void {
    lastMessage.value = data;
    lastEvent.value = eventName;
    for (const fn of listeners.message) fn(data, eventName ?? undefined);
  }

  function onOpen(): void {
    status.value = 'open';
    connected.value = true;
    error.value = null;
    attempts = 0;
    currentDelay = opts.reconnectDelay;
    reconnectCount.value = 0;
    for (const fn of listeners.open) fn();
  }

  function onClose(): void {
    status.value = 'closed';
    connected.value = false;
    for (const fn of listeners.close) fn();
    if (!intentionalClose && opts.reconnect && attempts < opts.reconnectAttempts) {
      scheduleReconnect();
    }
  }

  function onError(err: Event | Error): void {
    error.value = err;
    for (const fn of listeners.error) fn(err);
  }

  // ── EventSource mode ────────────────────────────────────────────

  function connectEventSource(): void {
    status.value = attempts > 0 ? 'reconnecting' : 'connecting';

    try {
      source = new EventSource(url);
    } catch (e) {
      status.value = 'closed';
      connected.value = false;
      return;
    }

    source.onopen = () => onOpen();

    source.onmessage = (e: MessageEvent) => {
      dispatch(parseData(e.data), null);
    };

    // Named events
    for (const name of opts.events) {
      source.addEventListener(name, ((e: MessageEvent) => {
        dispatch(parseData(e.data), name);
      }) as EventListener);
    }

    source.onerror = (e: Event) => {
      onError(e);
      // EventSource.CLOSED = 2
      if (source && source.readyState === 2) {
        source = null;
        onClose();
      }
    };
  }

  // ── Fetch mode (NDJSON) ─────────────────────────────────────────

  function connectFetch(): void {
    status.value = attempts > 0 ? 'reconnecting' : 'connecting';
    controller = new AbortController();

    const init: RequestInit = {
      method: opts.method,
      headers: opts.headers,
      signal: controller.signal,
    };

    if (opts.body !== undefined) {
      init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }

    fetch(url, init)
      .then(async (res) => {
        if (!res.ok) {
          onError(new Error(`[tina4] SSE fetch ${res.status}`));
          onClose();
          return;
        }

        onOpen();

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop()!; // keep incomplete line

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) dispatch(parseData(trimmed), null);
          }
        }

        // Flush remaining buffer
        const remaining = buffer.trim();
        if (remaining) dispatch(parseData(remaining), null);

        controller = null;
        onClose();
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return; // intentional close
        controller = null;
        onError(err);
        onClose();
      });
  }

  // ── Reconnect ───────────────────────────────────────────────────

  function scheduleReconnect(): void {
    attempts++;
    reconnectCount.value = attempts;
    status.value = 'reconnecting';

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, currentDelay);

    currentDelay = Math.min(currentDelay * 2, opts.reconnectMaxDelay);
  }

  function connect(): void {
    if (opts.mode === 'fetch') {
      connectFetch();
    } else {
      connectEventSource();
    }
  }

  // ── Public API ──────────────────────────────────────────────────

  const managed: ManagedStream = {
    status,
    connected,
    lastMessage,
    lastEvent,
    error,
    reconnectCount,

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

    close(): void {
      intentionalClose = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (source) {
        source.close();
        source = null;
      }
      if (controller) {
        controller.abort();
        controller = null;
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

export const sse = {
  connect: createStream,
};
