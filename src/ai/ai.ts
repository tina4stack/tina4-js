/**
 * Tina4 AI — typed streaming client on top of sse.connect() (fetch mode).
 *
 * Contract: ADR-0060 (typed AiEvent stream) + ADR-0061 (tools / tool_choice /
 * tool_result on the send side). The backend runs `Ai.chat(stream=True)` and
 * re-emits typed events over SSE — each `data:` line is one AiEvent JSON.
 *
 *   for await (const event of ai.stream('/api/chat', { messages, tools })) {
 *     if (event.type === 'text_delta') append(event.text);
 *     else if (event.type === 'tool_call') runTool(event.name, event.args);
 *   }
 *
 * The generator ends cleanly on the `done` event, propagates and ends on
 * `error`, and closes the underlying fetch reader (AbortController) when
 * the consumer breaks out of the loop early — no leaked reader, no dangling
 * request.
 */

import { sse } from '../sse/sse';

// ── Public types ────────────────────────────────────────────────────

export type AiEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; args: Record<string, unknown> }
  | {
      type: 'done';
      finishReason: string;
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }
  | { type: 'error'; message: string; code?: string };

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: string }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface AiTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type AiToolChoice = 'auto' | 'none' | 'required' | { name: string };

export interface AiChatOptions {
  messages: AiMessage[];
  tools?: AiTool[];
  toolChoice?: AiToolChoice;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** HTTP headers merged onto the POST — NOT included in the JSON body. */
  headers?: Record<string, string>;
}

// ── Implementation ──────────────────────────────────────────────────

function isAiEvent(x: unknown): x is AiEvent {
  return !!x && typeof x === 'object' && typeof (x as { type?: unknown }).type === 'string';
}

export const ai = {
  /**
   * Stream typed AiEvent from a Tina4 backend endpoint that runs Ai.chat and
   * re-emits the event stream over SSE. Works against tina4-python /
   * tina4-php / tina4-ruby / tina4-nodejs services that expose an Ai.chat
   * route wired to Api.stream_sse (ADR-0060).
   */
  async *stream(url: string, options: AiChatOptions): AsyncGenerator<AiEvent> {
    const { headers, ...body } = options;

    // Callback -> async-generator bridge. Producer pushes into `queue` and
    // wakes the consumer; consumer parks on a Promise when the queue is empty.
    const queue: AiEvent[] = [];
    let waker: (() => void) | null = null;
    let ended = false;
    const wake = (): void => {
      const w = waker;
      waker = null;
      w?.();
    };

    const stream = sse.connect(url, {
      mode: 'fetch',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body,
      json: true,
      reconnect: false,
    });

    stream.on('message', (data) => {
      if (isAiEvent(data)) {
        queue.push(data);
        wake();
      }
    });

    stream.on('close', () => {
      ended = true;
      wake();
    });

    stream.on('error', (err) => {
      // Transport-level failure (non-2xx, dropped socket): synthesize the typed
      // error event the ADR-0060 contract promises callers.
      queue.push({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
      ended = true;
      wake();
    });

    try {
      while (true) {
        while (queue.length > 0) {
          const ev = queue.shift()!;
          yield ev;
          if (ev.type === 'done' || ev.type === 'error') return;
        }
        if (ended) return;
        await new Promise<void>((resolve) => {
          waker = resolve;
        });
      }
    } finally {
      // Covers normal end, early break, and thrown-out-of loop paths — all
      // route through the generator's implicit .return() so we close the
      // fetch reader (AbortController.abort) exactly once.
      stream.close();
    }
  },
};
