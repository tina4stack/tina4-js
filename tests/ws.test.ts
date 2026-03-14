import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signal } from '../src/core/signal';
import { ws } from '../src/ws/ws';

// ── Mock WebSocket ──────────────────────────────────────────────────

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  url: string;
  protocols: string | string[];
  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols ?? [];
    MockWebSocket._instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code ?? 1000, reason: reason ?? '' }));
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen(new Event('open'));
  }

  simulateMessage(data: string): void {
    if (this.onmessage) this.onmessage(new MessageEvent('message', { data }));
  }

  simulateError(): void {
    if (this.onerror) this.onerror(new Event('error'));
  }

  simulateClose(code = 1006, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      const event = new Event('close') as any;
      event.code = code;
      event.reason = reason;
      this.onclose(event as CloseEvent);
    }
  }

  static _instances: MockWebSocket[] = [];
  static _reset(): void { MockWebSocket._instances = []; }
  static get latest(): MockWebSocket { return MockWebSocket._instances[MockWebSocket._instances.length - 1]; }
}

// ── Setup ───────────────────────────────────────────────────────────

let originalWebSocket: typeof WebSocket;

beforeEach(() => {
  originalWebSocket = globalThis.WebSocket;
  (globalThis as any).WebSocket = MockWebSocket;
  MockWebSocket._reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.WebSocket = originalWebSocket;
});

// ── Tests ───────────────────────────────────────────────────────────

describe('ws — connection', () => {
  it('creates a WebSocket connection', () => {
    const socket = ws.connect('wss://example.com/ws');
    expect(MockWebSocket._instances.length).toBe(1);
    expect(MockWebSocket.latest.url).toBe('wss://example.com/ws');
    socket.close();
  });

  it('passes protocols to WebSocket', () => {
    const socket = ws.connect('wss://example.com/ws', { protocols: ['v1', 'v2'] });
    expect(MockWebSocket.latest.protocols).toEqual(['v1', 'v2']);
    socket.close();
  });

  it('status signal starts as connecting', () => {
    const socket = ws.connect('wss://example.com/ws');
    expect(socket.status.value).toBe('connecting');
    expect(socket.connected.value).toBe(false);
    socket.close();
  });

  it('status changes to open on connection', () => {
    const socket = ws.connect('wss://example.com/ws');
    MockWebSocket.latest.simulateOpen();
    expect(socket.status.value).toBe('open');
    expect(socket.connected.value).toBe(true);
    socket.close();
  });

  it('status changes to closed on disconnect', () => {
    const socket = ws.connect('wss://example.com/ws', { reconnect: false });
    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateClose();
    expect(socket.status.value).toBe('closed');
    expect(socket.connected.value).toBe(false);
  });
});

describe('ws — sending messages', () => {
  it('sends string messages', () => {
    const socket = ws.connect('wss://example.com/ws');
    MockWebSocket.latest.simulateOpen();

    socket.send('hello');
    expect(MockWebSocket.latest.sentMessages).toEqual(['hello']);
    socket.close();
  });

  it('auto-stringifies objects', () => {
    const socket = ws.connect('wss://example.com/ws');
    MockWebSocket.latest.simulateOpen();

    socket.send({ type: 'chat', text: 'hi' });
    expect(MockWebSocket.latest.sentMessages).toEqual(['{"type":"chat","text":"hi"}']);
    socket.close();
  });

  it('throws when sending on closed connection', () => {
    const socket = ws.connect('wss://example.com/ws', { reconnect: false });
    // Not yet open
    expect(() => socket.send('test')).toThrow('not connected');
    socket.close();
  });
});

describe('ws — receiving messages', () => {
  it('updates lastMessage signal on receive', () => {
    const socket = ws.connect('wss://example.com/ws');
    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('{"type":"ping"}');

    expect(socket.lastMessage.value).toEqual({ type: 'ping' });
    socket.close();
  });

  it('parses JSON messages automatically', () => {
    const socket = ws.connect('wss://example.com/ws');
    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('{"count":42}');

    expect(socket.lastMessage.value).toEqual({ count: 42 });
    socket.close();
  });

  it('passes raw string if not valid JSON', () => {
    const socket = ws.connect('wss://example.com/ws');
    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('hello world');

    expect(socket.lastMessage.value).toBe('hello world');
    socket.close();
  });

  it('fires message event handlers', () => {
    const socket = ws.connect('wss://example.com/ws');
    const handler = vi.fn();
    socket.on('message', handler);

    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('{"data":"test"}');

    expect(handler).toHaveBeenCalledWith({ data: 'test' });
    socket.close();
  });
});

describe('ws — event handlers', () => {
  it('fires open handler', () => {
    const socket = ws.connect('wss://example.com/ws');
    const handler = vi.fn();
    socket.on('open', handler);

    MockWebSocket.latest.simulateOpen();
    expect(handler).toHaveBeenCalledTimes(1);
    socket.close();
  });

  it('fires close handler with code and reason', () => {
    const socket = ws.connect('wss://example.com/ws', { reconnect: false });
    const handler = vi.fn();
    socket.on('close', handler);

    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateClose(1001, 'going away');

    expect(handler).toHaveBeenCalledWith(1001, 'going away');
  });

  it('fires error handler and updates error signal', () => {
    const socket = ws.connect('wss://example.com/ws');
    const handler = vi.fn();
    socket.on('error', handler);

    MockWebSocket.latest.simulateError();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(socket.error.value).toBeInstanceOf(Event);
    socket.close();
  });

  it('unsubscribe stops handler from firing', () => {
    const socket = ws.connect('wss://example.com/ws');
    const handler = vi.fn();
    const unsub = socket.on('message', handler);

    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('"first"');
    expect(handler).toHaveBeenCalledTimes(1);

    unsub();
    MockWebSocket.latest.simulateMessage('"second"');
    expect(handler).toHaveBeenCalledTimes(1); // not called again
    socket.close();
  });
});

describe('ws — pipe to signal', () => {
  it('pipes messages into a signal with reducer', () => {
    const socket = ws.connect('wss://example.com/ws');
    const messages = signal<string[]>([]);

    socket.pipe(messages, (msg, current) => [...current, msg as string]);

    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('"hello"');
    MockWebSocket.latest.simulateMessage('"world"');

    expect(messages.value).toEqual(['hello', 'world']);
    socket.close();
  });

  it('pipe returns unsubscribe function', () => {
    const socket = ws.connect('wss://example.com/ws');
    const count = signal(0);

    const unsub = socket.pipe(count, (_, current) => current + 1);

    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('"a"');
    expect(count.value).toBe(1);

    unsub();
    MockWebSocket.latest.simulateMessage('"b"');
    expect(count.value).toBe(1); // unchanged
    socket.close();
  });

  it('pipe works with parsed JSON objects', () => {
    const socket = ws.connect('wss://example.com/ws');
    interface ChatMsg { user: string; text: string }
    const chat = signal<ChatMsg[]>([]);

    socket.pipe(chat, (msg, current) => [...current, msg as ChatMsg]);

    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateMessage('{"user":"Andre","text":"hello"}');
    MockWebSocket.latest.simulateMessage('{"user":"Tina","text":"hi!"}');

    expect(chat.value).toEqual([
      { user: 'Andre', text: 'hello' },
      { user: 'Tina', text: 'hi!' },
    ]);
    socket.close();
  });
});

describe('ws — auto-reconnect', () => {
  it('reconnects after unexpected close', () => {
    const socket = ws.connect('wss://example.com/ws', {
      reconnect: true,
      reconnectDelay: 1000,
    });

    MockWebSocket.latest.simulateOpen();
    expect(MockWebSocket._instances.length).toBe(1);

    // Unexpected close
    MockWebSocket.latest.simulateClose(1006, '');
    expect(socket.status.value).toBe('reconnecting');
    expect(socket.reconnectCount.value).toBe(1);

    // Advance timer — should create new WebSocket
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket._instances.length).toBe(2);

    // New connection opens
    MockWebSocket.latest.simulateOpen();
    expect(socket.status.value).toBe('open');
    expect(socket.connected.value).toBe(true);
    expect(socket.reconnectCount.value).toBe(0); // reset on success
    socket.close();
  });

  it('uses exponential backoff', () => {
    const socket = ws.connect('wss://example.com/ws', {
      reconnect: true,
      reconnectDelay: 100,
      reconnectMaxDelay: 1000,
    });

    MockWebSocket.latest.simulateOpen();

    // First disconnect
    MockWebSocket.latest.simulateClose(1006);
    vi.advanceTimersByTime(100); // 100ms delay
    expect(MockWebSocket._instances.length).toBe(2);

    // Second disconnect
    MockWebSocket.latest.simulateClose(1006);
    vi.advanceTimersByTime(100); // 200ms delay — not enough
    expect(MockWebSocket._instances.length).toBe(2);
    vi.advanceTimersByTime(100); // 200ms total
    expect(MockWebSocket._instances.length).toBe(3);

    socket.close();
  });

  it('respects reconnectAttempts limit', () => {
    const socket = ws.connect('wss://example.com/ws', {
      reconnect: true,
      reconnectDelay: 100,
      reconnectAttempts: 2,
    });

    MockWebSocket.latest.simulateOpen();

    // First disconnect + reconnect
    MockWebSocket.latest.simulateClose(1006);
    vi.advanceTimersByTime(100);
    expect(MockWebSocket._instances.length).toBe(2);

    // Second disconnect + reconnect
    MockWebSocket.latest.simulateClose(1006);
    vi.advanceTimersByTime(200);
    expect(MockWebSocket._instances.length).toBe(3);

    // Third disconnect — should NOT reconnect (attempts exhausted)
    MockWebSocket.latest.simulateClose(1006);
    vi.advanceTimersByTime(10000);
    expect(MockWebSocket._instances.length).toBe(3); // no new instance
    expect(socket.status.value).toBe('closed');
  });

  it('does not reconnect on intentional close', () => {
    const socket = ws.connect('wss://example.com/ws', { reconnect: true });
    MockWebSocket.latest.simulateOpen();

    socket.close();
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket._instances.length).toBe(1); // no reconnect
    expect(socket.status.value).toBe('closed');
  });

  it('does not reconnect when reconnect: false', () => {
    const socket = ws.connect('wss://example.com/ws', { reconnect: false });
    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateClose(1006);

    vi.advanceTimersByTime(60000);
    expect(MockWebSocket._instances.length).toBe(1);
    expect(socket.status.value).toBe('closed');
  });

  it('clears error signal on successful reconnect', () => {
    const socket = ws.connect('wss://example.com/ws', {
      reconnect: true,
      reconnectDelay: 100,
    });

    MockWebSocket.latest.simulateOpen();
    MockWebSocket.latest.simulateError();
    expect(socket.error.value).not.toBeNull();

    MockWebSocket.latest.simulateClose(1006);
    vi.advanceTimersByTime(100);
    MockWebSocket.latest.simulateOpen();

    expect(socket.error.value).toBeNull();
    socket.close();
  });
});

describe('ws — close', () => {
  it('close with custom code and reason', () => {
    const socket = ws.connect('wss://example.com/ws', { reconnect: false });
    MockWebSocket.latest.simulateOpen();

    const closeFn = vi.fn();
    socket.on('close', closeFn);

    socket.close(4000, 'custom reason');
    expect(socket.status.value).toBe('closed');
    expect(socket.connected.value).toBe(false);
  });

  it('multiple close calls do not error', () => {
    const socket = ws.connect('wss://example.com/ws', { reconnect: false });
    MockWebSocket.latest.simulateOpen();

    socket.close();
    socket.close(); // should not throw
    expect(socket.status.value).toBe('closed');
  });
});
