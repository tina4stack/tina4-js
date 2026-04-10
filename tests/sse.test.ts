import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '../src/core/signal';
import { sse } from '../src/sse/sse';

// ── MockEventSource ──────────────────────────────────────────────────

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static _instances: MockEventSource[] = [];
  static get latest() { return MockEventSource._instances[MockEventSource._instances.length - 1]; }
  static _reset() { MockEventSource._instances = []; }

  url: string;
  readyState = MockEventSource.CONNECTING;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  private _namedListeners: Map<string, Function[]> = new Map();

  constructor(url: string) {
    this.url = url;
    MockEventSource._instances.push(this);
  }

  addEventListener(event: string, handler: Function) {
    if (!this._namedListeners.has(event)) this._namedListeners.set(event, []);
    this._namedListeners.get(event)!.push(handler);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  // Test helpers
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: string, eventName?: string) {
    if (eventName) {
      const handlers = this._namedListeners.get(eventName) || [];
      const event = new MessageEvent(eventName, { data });
      for (const h of handlers) h(event);
    } else {
      this.onmessage?.(new MessageEvent('message', { data }));
    }
  }

  simulateError(close = false) {
    if (close) this.readyState = MockEventSource.CLOSED;
    this.onerror?.(new Event('error'));
  }
}

// ── Mock Fetch + ReadableStream ──────────────────────────────────────

function createMockFetch() {
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  let fetchCalls: { url: string; init: RequestInit }[] = [];

  const mockFetch = vi.fn(async (url: string, init: RequestInit) => {
    fetchCalls.push({ url, init });
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) { streamController = ctrl; },
    });
    return {
      ok: true,
      status: 200,
      body: stream,
      headers: new Headers(),
    } as unknown as Response;
  });

  return {
    fetch: mockFetch,
    pushChunk(text: string) { streamController?.enqueue(encoder.encode(text)); },
    endStream() { streamController?.close(); },
    errorStream(err: Error) { streamController?.error(err); },
    get calls() { return fetchCalls; },
    reset() { fetchCalls = []; streamController = null; },
  };
}

// ── Setup ────────────────────────────────────────────────────────────

let originalEventSource: typeof EventSource;
let originalFetch: typeof fetch;
let mockFetchCtrl: ReturnType<typeof createMockFetch>;

beforeEach(() => {
  originalEventSource = globalThis.EventSource;
  originalFetch = globalThis.fetch;
  (globalThis as any).EventSource = MockEventSource;
  mockFetchCtrl = createMockFetch();
  (globalThis as any).fetch = mockFetchCtrl.fetch;
  MockEventSource._reset();
  vi.useFakeTimers();
});

afterEach(() => {
  (globalThis as any).EventSource = originalEventSource;
  (globalThis as any).fetch = originalFetch;
  vi.useRealTimers();
});

// ── EventSource Mode Tests ───────────────────────────────────────────

describe('sse — EventSource connection', () => {
  it('creates an EventSource and starts connecting', () => {
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    expect(stream.status.value).toBe('connecting');
    expect(MockEventSource._instances).toHaveLength(1);
    expect(MockEventSource.latest.url).toBe('http://localhost/events');
    stream.close();
  });

  it('sets status to open on connection', () => {
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    MockEventSource.latest.simulateOpen();
    expect(stream.status.value).toBe('open');
    expect(stream.connected.value).toBe(true);
    stream.close();
  });

  it('sets status to closed on disconnect', () => {
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateError(true);
    expect(stream.status.value).toBe('closed');
    expect(stream.connected.value).toBe(false);
  });
});

describe('sse — EventSource messages', () => {
  it('updates lastMessage on receive', () => {
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('{"text":"hello"}');
    expect(stream.lastMessage.value).toEqual({ text: 'hello' });
    expect(stream.lastEvent.value).toBeNull();
    stream.close();
  });

  it('returns raw string when json is false', () => {
    const stream = sse.connect('http://localhost/events', { json: false, reconnect: false });
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('raw text');
    expect(stream.lastMessage.value).toBe('raw text');
    stream.close();
  });

  it('returns raw string for invalid JSON', () => {
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('not json');
    expect(stream.lastMessage.value).toBe('not json');
    stream.close();
  });
});

describe('sse — named events', () => {
  it('listens for named events', () => {
    const stream = sse.connect('http://localhost/events', {
      events: ['update', 'delete'],
      reconnect: false,
    });
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('{"id":1}', 'update');
    expect(stream.lastMessage.value).toEqual({ id: 1 });
    expect(stream.lastEvent.value).toBe('update');

    MockEventSource.latest.simulateMessage('{"id":2}', 'delete');
    expect(stream.lastMessage.value).toEqual({ id: 2 });
    expect(stream.lastEvent.value).toBe('delete');
    stream.close();
  });

  it('passes event name to message handlers', () => {
    const handler = vi.fn();
    const stream = sse.connect('http://localhost/events', {
      events: ['update'],
      reconnect: false,
    });
    stream.on('message', handler);
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('{"id":1}', 'update');
    expect(handler).toHaveBeenCalledWith({ id: 1 }, 'update');
    stream.close();
  });
});

describe('sse — event handlers', () => {
  it('fires open handler', () => {
    const handler = vi.fn();
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    stream.on('open', handler);
    MockEventSource.latest.simulateOpen();
    expect(handler).toHaveBeenCalledTimes(1);
    stream.close();
  });

  it('fires error handler', () => {
    const handler = vi.fn();
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    stream.on('error', handler);
    MockEventSource.latest.simulateError(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(stream.error.value).toBeInstanceOf(Event);
    stream.close();
  });

  it('fires close handler', () => {
    const handler = vi.fn();
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    stream.on('close', handler);
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateError(true);
    expect(handler).toHaveBeenCalledTimes(1);
    stream.close();
  });

  it('unsubscribes handler', () => {
    const handler = vi.fn();
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    const unsub = stream.on('message', handler);
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('"a"');
    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
    MockEventSource.latest.simulateMessage('"b"');
    expect(handler).toHaveBeenCalledTimes(1);
    stream.close();
  });
});

describe('sse — pipe to signal', () => {
  it('accumulates messages via reducer', () => {
    const msgs = signal<string[]>([]);
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    stream.pipe(msgs, (msg, current) => [...current, msg as string]);
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('"hello"');
    MockEventSource.latest.simulateMessage('"world"');
    expect(msgs.value).toEqual(['hello', 'world']);
    stream.close();
  });

  it('pipe returns unsubscribe', () => {
    const msgs = signal<string[]>([]);
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    const unsub = stream.pipe(msgs, (msg, current) => [...current, msg as string]);
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateMessage('"a"');
    unsub();
    MockEventSource.latest.simulateMessage('"b"');
    expect(msgs.value).toEqual(['a']);
    stream.close();
  });
});

describe('sse — auto-reconnect (EventSource)', () => {
  it('reconnects after closed error', () => {
    const stream = sse.connect('http://localhost/events', {
      reconnect: true,
      reconnectDelay: 1000,
    });
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateError(true);
    expect(stream.status.value).toBe('reconnecting');
    expect(stream.reconnectCount.value).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(MockEventSource._instances).toHaveLength(2);
    stream.close();
  });

  it('uses exponential backoff', () => {
    const stream = sse.connect('http://localhost/events', {
      reconnect: true,
      reconnectDelay: 100,
      reconnectMaxDelay: 1000,
    });

    // First disconnect
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateError(true);
    vi.advanceTimersByTime(100);
    expect(MockEventSource._instances).toHaveLength(2);

    // Second disconnect
    MockEventSource.latest.simulateOpen();
    MockEventSource.latest.simulateError(true);
    vi.advanceTimersByTime(200); // doubled
    expect(MockEventSource._instances).toHaveLength(3);

    stream.close();
  });

  it('respects reconnectAttempts limit', () => {
    const stream = sse.connect('http://localhost/events', {
      reconnect: true,
      reconnectDelay: 100,
      reconnectAttempts: 2,
    });

    // Attempt 1
    MockEventSource.latest.simulateError(true);
    vi.advanceTimersByTime(100);
    expect(MockEventSource._instances).toHaveLength(2);

    // Attempt 2
    MockEventSource.latest.simulateError(true);
    vi.advanceTimersByTime(200);
    expect(MockEventSource._instances).toHaveLength(3);

    // Attempt 3 — should NOT reconnect
    MockEventSource.latest.simulateError(true);
    vi.advanceTimersByTime(10000);
    expect(MockEventSource._instances).toHaveLength(3);

    stream.close();
  });

  it('does not reconnect on intentional close', () => {
    const stream = sse.connect('http://localhost/events');
    MockEventSource.latest.simulateOpen();
    stream.close();
    vi.advanceTimersByTime(10000);
    expect(MockEventSource._instances).toHaveLength(1);
  });
});

// ── Fetch Mode Tests ─────────────────────────────────────────────────

describe('sse — fetch mode', () => {
  it('creates a fetch-based stream', async () => {
    const stream = sse.connect('http://localhost/api/stream', {
      mode: 'fetch',
      reconnect: false,
    });
    expect(stream.status.value).toBe('connecting');

    // Let the fetch promise resolve
    await vi.advanceTimersByTimeAsync(0);
    expect(stream.status.value).toBe('open');
    expect(stream.connected.value).toBe(true);
    stream.close();
  });

  it('sends POST with body and headers', async () => {
    const stream = sse.connect('http://localhost/api/chat', {
      mode: 'fetch',
      method: 'POST',
      headers: { 'Authorization': 'Bearer tok' },
      body: { prompt: 'hello' },
      reconnect: false,
    });

    await vi.advanceTimersByTimeAsync(0);
    const call = mockFetchCtrl.calls[0];
    expect(call.init.method).toBe('POST');
    expect((call.init.headers as any)['Authorization']).toBe('Bearer tok');
    expect(call.init.body).toBe('{"prompt":"hello"}');
    stream.close();
  });

  it('parses NDJSON lines', async () => {
    const handler = vi.fn();
    const stream = sse.connect('http://localhost/api/stream', {
      mode: 'fetch',
      reconnect: false,
    });
    stream.on('message', handler);

    await vi.advanceTimersByTimeAsync(0);
    mockFetchCtrl.pushChunk('{"token":"Hello"}\n{"token":" world"}\n');
    await vi.advanceTimersByTimeAsync(0);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({ token: 'Hello' }, undefined);
    expect(handler).toHaveBeenCalledWith({ token: ' world' }, undefined);
    stream.close();
  });

  it('handles partial chunks', async () => {
    const handler = vi.fn();
    const stream = sse.connect('http://localhost/api/stream', {
      mode: 'fetch',
      reconnect: false,
    });
    stream.on('message', handler);

    await vi.advanceTimersByTimeAsync(0);

    // Partial line
    mockFetchCtrl.pushChunk('{"tok');
    await vi.advanceTimersByTimeAsync(0);
    expect(handler).not.toHaveBeenCalled();

    // Complete the line
    mockFetchCtrl.pushChunk('en":"hi"}\n');
    await vi.advanceTimersByTimeAsync(0);
    expect(handler).toHaveBeenCalledWith({ token: 'hi' }, undefined);

    stream.close();
  });

  it('sets closed on stream end', async () => {
    const closeHandler = vi.fn();
    const stream = sse.connect('http://localhost/api/stream', {
      mode: 'fetch',
      reconnect: false,
    });
    stream.on('close', closeHandler);

    await vi.advanceTimersByTimeAsync(0);
    mockFetchCtrl.endStream();
    await vi.advanceTimersByTimeAsync(0);

    expect(stream.status.value).toBe('closed');
    expect(stream.connected.value).toBe(false);
    expect(closeHandler).toHaveBeenCalledTimes(1);
  });
});

describe('sse — close', () => {
  it('closes EventSource connection', () => {
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    MockEventSource.latest.simulateOpen();
    stream.close();
    expect(stream.status.value).toBe('closed');
    expect(stream.connected.value).toBe(false);
    expect(MockEventSource.latest.readyState).toBe(MockEventSource.CLOSED);
  });

  it('multiple close calls do not error', () => {
    const stream = sse.connect('http://localhost/events', { reconnect: false });
    stream.close();
    stream.close();
    stream.close();
    expect(stream.status.value).toBe('closed');
  });
});
