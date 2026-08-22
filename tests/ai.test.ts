import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ai, type AiEvent } from '../src/ai/ai';

// ── Mock Fetch + SSE-framed ReadableStream ───────────────────────────
//
// Mirrors the pattern in tests/sse.test.ts: a real ReadableStream backed by
// a controller the test drives, wrapped in a Response whose Content-Type is
// text/event-stream so sse.connect()'s WHATWG SSE framer parses it.

function createMockFetch(responseHeaders: Record<string, string> = { 'Content-Type': 'text/event-stream' }) {
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();
  let fetchCalls: { url: string; init: RequestInit }[] = [];

  const mockFetch = vi.fn(async (url: string, init: RequestInit) => {
    fetchCalls.push({ url, init });
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        streamController = ctrl;
      },
    });
    return {
      ok: true,
      status: 200,
      body: stream,
      headers: new Headers(responseHeaders),
    } as unknown as Response;
  });

  return {
    fetch: mockFetch,
    pushChunk(text: string) {
      streamController?.enqueue(encoder.encode(text));
    },
    endStream() {
      streamController?.close();
    },
    /** Pack an AiEvent as one `data:` SSE line. */
    pushEvent(event: AiEvent) {
      this.pushChunk(`data: ${JSON.stringify(event)}\n\n`);
    },
    get calls() {
      return fetchCalls;
    },
    reset() {
      fetchCalls = [];
      streamController = null;
    },
  };
}

function createMockErrorFetch(status = 500) {
  let fetchCalls: { url: string; init: RequestInit }[] = [];
  const mockFetch = vi.fn(async (url: string, init: RequestInit) => {
    fetchCalls.push({ url, init });
    return {
      ok: false,
      status,
      body: new ReadableStream<Uint8Array>({ start(ctrl) { ctrl.close(); } }),
      headers: new Headers({}),
    } as unknown as Response;
  });
  return { fetch: mockFetch, get calls() { return fetchCalls; } };
}

// ── Setup ────────────────────────────────────────────────────────────

let originalFetch: typeof fetch;
let mockCtrl: ReturnType<typeof createMockFetch>;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  mockCtrl = createMockFetch();
  (globalThis as any).fetch = mockCtrl.fetch;
});

afterEach(() => {
  (globalThis as any).fetch = originalFetch;
});

// ── Small helpers ────────────────────────────────────────────────────

/** Drive the generator one yield at a time, so we can interleave chunk pushes. */
async function nextEvent<T>(iter: AsyncIterator<T>): Promise<IteratorResult<T>> {
  return iter.next();
}

/** Micro-tick — lets the sse fetch reader loop pump one chunk through. */
async function pump() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

// ── Tests ────────────────────────────────────────────────────────────

describe('ai.stream — request wire shape', () => {
  it('POSTs the options as JSON body with Content-Type: application/json', async () => {
    const iter = ai
      .stream('http://localhost/api/chat', {
        messages: [{ role: 'user', content: 'hi' }],
        model: 'test-model',
        temperature: 0.5,
      })
      [Symbol.asyncIterator]();

    // Consumer parks waiting for the first event — one pump to fire the fetch.
    const next = nextEvent(iter);
    await pump();

    expect(mockCtrl.calls).toHaveLength(1);
    const call = mockCtrl.calls[0];
    expect(call.url).toBe('http://localhost/api/chat');
    expect(call.init.method).toBe('POST');
    expect((call.init.headers as Record<string, string>)['Content-Type']).toBe('application/json');

    // Body should serialize the AiChatOptions (minus headers).
    const parsed = JSON.parse(call.init.body as string);
    expect(parsed).toEqual({
      messages: [{ role: 'user', content: 'hi' }],
      model: 'test-model',
      temperature: 0.5,
    });

    // Close so the generator finishes and doesn't leak.
    mockCtrl.endStream();
    await pump();
    await iter.return?.(undefined);
    await next;
  });

  it('forwards ADR-0061 tools / toolChoice / tool_result messages in the body', async () => {
    const iter = ai
      .stream('http://localhost/api/chat', {
        messages: [
          { role: 'user', content: 'what is the weather in NYC?' },
          {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
              },
            ],
          },
          { role: 'tool', tool_call_id: 'call_1', content: 'sunny 72F' },
        ],
        tools: [
          {
            name: 'get_weather',
            description: 'Get the weather',
            parameters: {
              type: 'object',
              properties: { city: { type: 'string' } },
              required: ['city'],
            },
          },
        ],
        toolChoice: 'auto',
      })
      [Symbol.asyncIterator]();

    const next = nextEvent(iter);
    await pump();
    const body = JSON.parse(mockCtrl.calls[0].init.body as string);
    expect(body.tools[0].name).toBe('get_weather');
    expect(body.toolChoice).toBe('auto');
    expect(body.messages[2]).toEqual({
      role: 'tool',
      tool_call_id: 'call_1',
      content: 'sunny 72F',
    });

    mockCtrl.endStream();
    await pump();
    await iter.return?.(undefined);
    await next;
  });

  it('merges caller headers over the default Content-Type', async () => {
    const iter = ai
      .stream('http://localhost/api/chat', {
        messages: [{ role: 'user', content: 'hi' }],
        headers: { Authorization: 'Bearer tok', 'X-Trace-Id': 't1' },
      })
      [Symbol.asyncIterator]();

    const next = nextEvent(iter);
    await pump();
    const hdrs = mockCtrl.calls[0].init.headers as Record<string, string>;
    expect(hdrs['Content-Type']).toBe('application/json');
    expect(hdrs['Authorization']).toBe('Bearer tok');
    expect(hdrs['X-Trace-Id']).toBe('t1');
    // headers must NOT show up in the JSON body.
    expect(JSON.parse(mockCtrl.calls[0].init.body as string).headers).toBeUndefined();

    mockCtrl.endStream();
    await pump();
    await iter.return?.(undefined);
    await next;
  });
});

describe('ai.stream — typed event shapes', () => {
  it('yields text_delta with .text', async () => {
    const iter = ai
      .stream('http://localhost/api/chat', { messages: [{ role: 'user', content: 'hi' }] })
      [Symbol.asyncIterator]();

    const first = nextEvent(iter);
    await pump();
    mockCtrl.pushEvent({ type: 'text_delta', text: 'Hello' });
    await pump();
    const r = await first;
    expect(r.done).toBe(false);
    expect(r.value).toEqual({ type: 'text_delta', text: 'Hello' });

    // Cleanup.
    mockCtrl.endStream();
    await pump();
    await iter.return?.(undefined);
  });

  it('yields tool_call with .id / .name / .args', async () => {
    const iter = ai
      .stream('http://localhost/api/chat', { messages: [{ role: 'user', content: 'weather?' }] })
      [Symbol.asyncIterator]();

    const first = nextEvent(iter);
    await pump();
    mockCtrl.pushEvent({
      type: 'tool_call',
      id: 'call_1',
      name: 'get_weather',
      args: { city: 'NYC' },
    });
    await pump();
    const r = await first;
    expect(r.value).toEqual({
      type: 'tool_call',
      id: 'call_1',
      name: 'get_weather',
      args: { city: 'NYC' },
    });

    mockCtrl.endStream();
    await pump();
    await iter.return?.(undefined);
  });

  it('yields done with .finishReason and .usage', async () => {
    const iter = ai
      .stream('http://localhost/api/chat', { messages: [{ role: 'user', content: 'hi' }] })
      [Symbol.asyncIterator]();

    const first = nextEvent(iter);
    await pump();
    mockCtrl.pushEvent({
      type: 'done',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });
    await pump();
    const r = await first;
    if (r.done) throw new Error('expected an event');
    expect(r.value.type).toBe('done');
    if (r.value.type === 'done') {
      expect(r.value.finishReason).toBe('stop');
      expect(r.value.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    }

    // Iterator ends cleanly after done.
    const second = await iter.next();
    expect(second.done).toBe(true);
  });
});

describe('ai.stream — lifecycle', () => {
  it('ends cleanly on the done event (iterator returns before any close chunk)', async () => {
    const events: AiEvent[] = [];
    const iter = ai.stream('http://localhost/api/chat', {
      messages: [{ role: 'user', content: 'hi' }],
    });

    // Push a text_delta then a done, without ever calling endStream() —
    // the generator must return purely because it saw `done`.
    const runner = (async () => {
      for await (const ev of iter) events.push(ev);
    })();

    await pump();
    mockCtrl.pushEvent({ type: 'text_delta', text: 'ok' });
    mockCtrl.pushEvent({ type: 'done', finishReason: 'stop' });
    await pump();
    await runner;

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('text_delta');
    expect(events[1].type).toBe('done');
  });

  it('propagates a mid-stream error event and ends', async () => {
    const events: AiEvent[] = [];
    const iter = ai.stream('http://localhost/api/chat', {
      messages: [{ role: 'user', content: 'hi' }],
    });

    const runner = (async () => {
      for await (const ev of iter) events.push(ev);
    })();

    await pump();
    mockCtrl.pushEvent({ type: 'text_delta', text: 'partial' });
    mockCtrl.pushEvent({ type: 'error', message: 'provider timed out', code: 'timeout' });
    // No further events should reach the consumer even if we push them.
    mockCtrl.pushEvent({ type: 'text_delta', text: 'ignored' });
    mockCtrl.endStream();
    await pump();
    await runner;

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'text_delta', text: 'partial' });
    expect(events[1]).toEqual({ type: 'error', message: 'provider timed out', code: 'timeout' });
  });

  it('synthesises a typed error event on transport failure (non-2xx)', async () => {
    (globalThis as any).fetch = createMockErrorFetch(500).fetch;
    const events: AiEvent[] = [];
    for await (const ev of ai.stream('http://localhost/api/chat', {
      messages: [{ role: 'user', content: 'hi' }],
    })) {
      events.push(ev);
    }
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('error');
    if (events[0].type === 'error') {
      expect(events[0].message).toContain('500');
    }
  });
});

describe('ai.stream — early break closes the underlying reader', () => {
  it('aborts the fetch on early break (no leaked reader, no leaked fetch)', async () => {
    // Kick off the generator and drive it directly so we control ordering.
    const asyncIter = ai
      .stream('http://localhost/api/chat', {
        messages: [{ role: 'user', content: 'hi' }],
      })
      [Symbol.asyncIterator]();

    // Ask for the first event, THEN push it, then await — this lets the
    // fetch start and register handlers before the SSE chunk arrives.
    const firstPromise = asyncIter.next();
    await pump();
    mockCtrl.pushEvent({ type: 'text_delta', text: 'first' });
    await pump();
    const first = await firstPromise;
    expect(first.done).toBe(false);
    expect(first.value).toEqual({ type: 'text_delta', text: 'first' });

    // Consumer breaks out. Simulate `for await ... break` semantics by
    // calling .return() — the same call the JS runtime makes on `break`.
    await asyncIter.return?.(undefined);

    // The AbortController that sse.connect passed to fetch must be aborted.
    const call = mockCtrl.calls[0];
    const signal = call.init.signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });

  it('pushing more events after break does not resurrect the iterator', async () => {
    const iter = ai.stream('http://localhost/api/chat', {
      messages: [{ role: 'user', content: 'hi' }],
    });
    const asyncIter = iter[Symbol.asyncIterator]();
    // First event.
    const first = asyncIter.next();
    await pump();
    mockCtrl.pushEvent({ type: 'text_delta', text: 'first' });
    await pump();
    await first;

    // Break out.
    await asyncIter.return?.(undefined);

    // Any subsequent push MUST NOT reach the consumer — call .next() one
    // more time and confirm it resolves with done:true.
    mockCtrl.pushEvent({ type: 'text_delta', text: 'lost' });
    await pump();
    const nxt = await asyncIter.next();
    expect(nxt.done).toBe(true);

    // And the fetch was aborted.
    const signal = mockCtrl.calls[0].init.signal as AbortSignal;
    expect(signal.aborted).toBe(true);
  });
});
